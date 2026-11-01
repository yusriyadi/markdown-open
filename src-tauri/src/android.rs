use crate::error::AppError;
use serde::{Deserialize, Serialize};
use tauri::{
    ipc::Channel,
    plugin::{Builder, PluginHandle},
    Manager, State, Wry,
};

struct AndroidDocuments(PluginHandle<Wry>);

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct MobileDocument {
    // Android document-provider URIs are intentionally not treated as filesystem paths.
    path: Option<String>,
    file_name: String,
    content: String,
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum OpenRequest {
    DocumentData { document: MobileDocument },
    Error { message: String },
}

#[derive(Deserialize)]
struct PickResult {
    document: Option<MobileDocument>,
}
#[derive(Deserialize)]
struct OpenFiles {
    requests: Vec<OpenRequest>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WatchArgs {
    on_open: Channel<()>,
}
#[derive(Serialize)]
struct UrlArgs {
    url: String,
}

fn native_error(error: impl std::fmt::Display) -> AppError {
    AppError::new("android", error.to_string())
}

#[tauri::command]
async fn pick_document(
    state: State<'_, AndroidDocuments>,
) -> Result<Option<MobileDocument>, AppError> {
    let result: PickResult = state
        .0
        .run_mobile_plugin_async("pickDocument", ())
        .await
        .map_err(native_error)?;
    Ok(result.document)
}

#[tauri::command]
async fn drain_open_files(
    state: State<'_, AndroidDocuments>,
) -> Result<Vec<OpenRequest>, AppError> {
    let result: OpenFiles = state
        .0
        .run_mobile_plugin_async("drainOpenFiles", ())
        .await
        .map_err(native_error)?;
    Ok(result.requests)
}

#[tauri::command]
async fn watch_open_files(
    state: State<'_, AndroidDocuments>,
    on_open: Channel<()>,
) -> Result<(), AppError> {
    state
        .0
        .run_mobile_plugin_async("watchOpenFiles", WatchArgs { on_open })
        .await
        .map_err(native_error)
}

#[tauri::command]
async fn open_external(state: State<'_, AndroidDocuments>, url: String) -> Result<(), AppError> {
    let parsed = url::Url::parse(&url).map_err(native_error)?;
    if !matches!(parsed.scheme(), "https" | "http" | "mailto") {
        return Err(AppError::new(
            "unsupportedScheme",
            "This link type is not supported.",
        ));
    }
    state
        .0
        .run_mobile_plugin_async("openExternal", UrlArgs { url: parsed.into() })
        .await
        .map_err(native_error)
}

#[tauri::command]
async fn print_document(state: State<'_, AndroidDocuments>) -> Result<(), AppError> {
    state
        .0
        .run_mobile_plugin_async("printDocument", ())
        .await
        .map_err(native_error)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(
            Builder::<Wry>::new("documents")
                .setup(|app, api| {
                    let handle =
                        api.register_android_plugin("com.markdownopen.app", "DocumentsPlugin")?;
                    app.manage(AndroidDocuments(handle));
                    Ok(())
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            pick_document,
            drain_open_files,
            watch_open_files,
            open_external,
            print_document
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Markdown Open on Android");
}
