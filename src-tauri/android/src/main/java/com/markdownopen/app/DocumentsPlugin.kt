package com.markdownopen.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.OpenableColumns
import android.webkit.WebView
import androidx.activity.result.ActivityResult
import androidx.appcompat.app.AppCompatActivity
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Channel
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.nio.charset.CodingErrorAction
import java.util.concurrent.Executors

@InvokeArg
class WatchFilesArgs {
    lateinit var onOpen: Channel
}

@InvokeArg
class ExternalUrlArgs {
    lateinit var url: String
}

@TauriPlugin
class DocumentsPlugin(private val activity: Activity) : Plugin(activity) {
    private val worker = Executors.newSingleThreadExecutor()
    private val pending = mutableListOf<JSObject>()
    private var notifications: Channel? = null
    private var webView: WebView? = null
    private var picking = false

    override fun load(webView: WebView) {
        this.webView = webView
        consumeIntent(activity.intent)
    }

    override fun onNewIntent(intent: Intent) {
        consumeIntent(intent)
    }

    override fun onDestroy(activity: AppCompatActivity) {
        notifications = null
        webView = null
        worker.shutdown()
    }

    @Command
    fun pickDocument(invoke: Invoke) {
        activity.runOnUiThread {
            if (picking) {
                invoke.reject("A document is already being opened.")
                return@runOnUiThread
            }
            picking = true
            // Markdown is often reported as text/plain or application/octet-stream.
            // Let the user browse all providers, then validate the display name.
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*"
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            try {
                startActivityForResult(invoke, intent, "documentSelected")
            } catch (error: Exception) {
                picking = false
                invoke.reject(error.message ?: "No document picker is available.")
            }
        }
    }

    @ActivityCallback
    private fun documentSelected(invoke: Invoke, result: ActivityResult) {
        val uri = result.data?.data
        if (result.resultCode != Activity.RESULT_OK || uri == null) {
            picking = false
            invoke.resolve(JSObject().put("document", JSONObject.NULL))
            return
        }
        worker.execute {
            try {
                val document = readDocument(uri)
                activity.runOnUiThread {
                    picking = false
                    invoke.resolve(JSObject().put("document", document))
                }
            } catch (error: Exception) {
                activity.runOnUiThread {
                    picking = false
                    invoke.reject(error.message ?: "Unable to read this document.")
                }
            }
        }
    }

    @Command
    fun watchOpenFiles(invoke: Invoke) {
        val args = invoke.parseArgs(WatchFilesArgs::class.java)
        activity.runOnUiThread {
            notifications = args.onOpen
            invoke.resolve()
        }
    }

    @Command
    fun drainOpenFiles(invoke: Invoke) {
        activity.runOnUiThread {
            val requests = JSONArray()
            pending.forEach { requests.put(it) }
            pending.clear()
            invoke.resolve(JSObject().put("requests", requests))
        }
    }

    @Command
    fun openExternal(invoke: Invoke) {
        val args = invoke.parseArgs(ExternalUrlArgs::class.java)
        val uri = Uri.parse(args.url)
        if (uri.scheme?.lowercase() !in setOf("http", "https", "mailto")) {
            invoke.reject("This link type is not supported.")
            return
        }
        activity.runOnUiThread {
            try {
                activity.startActivity(Intent(Intent.ACTION_VIEW, uri))
                invoke.resolve()
            } catch (error: Exception) {
                invoke.reject("No app is available to open this link.")
            }
        }
    }

    @Command
    fun printDocument(invoke: Invoke) {
        activity.runOnUiThread {
            try {
                val view = webView ?: throw IllegalStateException("The document preview is not ready.")
                val manager = activity.getSystemService(Context.PRINT_SERVICE) as? PrintManager
                    ?: throw IllegalStateException("Printing is not available on this device.")
                val name = view.title?.takeIf { it.isNotBlank() } ?: "Markdown Open"
                manager.print(name, view.createPrintDocumentAdapter(name), PrintAttributes.Builder().build())
                invoke.resolve()
            } catch (error: Exception) {
                invoke.reject(error.message ?: "Unable to open the print dialog.")
            }
        }
    }

    private fun consumeIntent(intent: Intent?) {
        if (intent == null || intent.action !in setOf(Intent.ACTION_VIEW, Intent.ACTION_SEND)) return
        val uri = (if (intent.action == Intent.ACTION_VIEW) intent.data else {
            if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
            else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
            }
        }) ?: intent.clipData?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.uri
        // Do not replay the initial intent after an Activity/WebView recreation.
        intent.action = null
        intent.data = null
        intent.removeExtra(Intent.EXTRA_STREAM)
        if (uri == null) return
        worker.execute {
            val request = try {
                JSObject().put("type", "documentData").put("document", readDocument(uri))
            } catch (error: Exception) {
                JSObject().put("type", "error").put("message", error.message ?: "Unable to open this document.")
            }
            activity.runOnUiThread {
                pending.add(request)
                // A wakeup hint only: keep the request until the frontend drains it.
                notifications?.send(JSObject())
            }
        }
    }

    private fun readDocument(uri: Uri): JSObject {
        require(uri.scheme == "content") { "Choose a document using the Android file picker." }
        val resolver = activity.contentResolver
        val displayName = resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst() && !cursor.isNull(0)) cursor.getString(0) else null
        }
        val name = displayName?.takeIf { it.isNotBlank() } ?: "Document.md"
        require(name.endsWith(".md", true) || name.endsWith(".markdown", true)) {
            "Choose a Markdown file (.md or .markdown)."
        }
        val bytes = resolver.openInputStream(uri)?.use { input ->
            val output = ByteArrayOutputStream()
            val buffer = ByteArray(8192)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                require(output.size().toLong() + count <= 16L * 1024 * 1024) {
                    "This document is too large. Choose a file smaller than 16 MB."
                }
                output.write(buffer, 0, count)
            }
            output.toByteArray()
        } ?: throw IllegalStateException("Unable to read this document.")
        val content = Charsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
            .decode(java.nio.ByteBuffer.wrap(bytes)).toString().removePrefix("\uFEFF")
        return JSObject().put("path", JSONObject.NULL).put("fileName", name).put("content", content)
    }
}
