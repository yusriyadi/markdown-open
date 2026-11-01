# Peta kode Markdown Open

Panduan navigasi berdasarkan kode saat ini. Semua path di bawah relatif terhadap
root repository. Cari nama fungsi/simbol untuk lokasi terbaru; nomor baris sengaja
tidak disimpan agar peta tetap berguna setelah perubahan kecil.

## Struktur utama

| Path | Peran |
|---|---|
| `src/` | UI React dan logika frontend bersama untuk browser, desktop, Android |
| `src/components/` | Header, sidebar workspace, drop zone, preview |
| `src/lib/` | Bridge native, parser, Mermaid, PDF, pengurutan operasi async |
| `src-tauri/src/` | Entry point Rust, backend desktop, bridge Android |
| `src-tauri/android/src/main/java/com/markdownopen/app/` | Plugin Kotlin untuk picker, intent, tautan eksternal, print |
| `src-tauri/gen/android/` | Proyek Gradle yang dilacak Git, termasuk manifest dan Activity kustom |
| `src-tauri/capabilities/` | Izin command IPC per platform |
| `scripts/` | Packaging distribusi macOS |
| `assets/` | Sumber ikon macOS dan ikon gambar/SVG |
| `docs/` | Panduan build/tes, PRD, laporan ukuran, catatan migrasi/rilis |
| `sample.md` | Contoh Markdown dan Mermaid untuk tes manual |

## Entry point dan pemilihan platform

| Entry point | Tanggung jawab |
|---|---|
| `index.html` → `src/main.tsx` | Mount React dengan StrictMode; memuat `src/App.css` |
| `src/App.tsx` | State dokumen/workspace/error, pemilihan file, subscription file native, PDF |
| `src/lib/platform.ts` | `isNative`, `isAndroid`, `isDesktop`, `getNative()`, normalisasi error |
| `src/lib/types.ts` | Kontrak `DocumentData`, `OpenRequest`, `FileTreeNode`, `NativeBridge` |
| `src/lib/tauri.ts` | Implementasi bridge desktop melalui `invoke` dan event Tauri |
| `src/lib/android.ts` | Implementasi bridge Android melalui `invoke` dan Channel |
| `src-tauri/src/main.rs` | Entry binary desktop; memanggil `markdown_open_lib::run()` |
| `src-tauri/src/lib.rs` | Entry library/mobile; memilih modul dengan conditional compilation |
| `src-tauri/src/desktop.rs` | `run()`, registrasi command dan event desktop |
| `src-tauri/src/android.rs` | `run()`, registrasi `DocumentsPlugin`, command bridge Kotlin |

Browser memakai File API dan `window.print()` tanpa IPC. `getNative()` memuat
bridge sesuai platform. Android menerima isi dokumen dengan `path: null`;
desktop menerima path yang telah diberi akses.

## Peta fitur

### Membuka dan menampilkan Markdown

- **UI:** `Header.tsx` dan `FileDropZone.tsx` → `App.tsx` (`handleOpenFile`,
  `loadDocument`) → `PreviewPane.tsx`.
- **Desktop:** `src/lib/tauri.ts` → `desktop.rs::pick_document` → dialog `rfd` →
  `documents.rs::Documents::grant_file/read`.
- **Android:** `src/lib/android.ts` → `android.rs::pick_document` → Kotlin
  `DocumentsPlugin.pickDocument/documentSelected/readDocument`.
  Picker memakai `ACTION_OPEN_DOCUMENT`; pembacaan dibatasi UTF-8, ekstensi
  `.md`/`.markdown`, dan 16 MB.
- **Browser:** input file/drop → `App.tsx::handleBrowserFile` → `File.text()`.
- **Render bersama:** `PreviewPane.tsx` → `src/lib/markdown.ts::parseMarkdown`
  → `src/lib/highlight.ts::highlightCodeBlocks` → render Mermaid.
- **Urutan async:** `src/lib/latest-task.ts::LatestTask` memastikan hasil operasi
  lama tidak menggantikan permintaan terbaru; cancel tidak menghapus dokumen aktif.

Path komponen di bagian ini berada di `src/components/`; file Rust di
`src-tauri/src/`. Plugin Kotlin berada di
`src-tauri/android/src/main/java/com/markdownopen/app/DocumentsPlugin.kt`.

### File dari Finder, drop, Open With, dan Share

| Platform | Jalur |
|---|---|
| Desktop | `desktop.rs` menangani Finder `RunEvent::Opened` (macOS) dan native drop → `queue_file` → `open_files.rs::OpenFiles` → event `documents-available` |
| Android | Manifest VIEW/SEND → `DocumentsPlugin.load/onNewIntent` → `consumeIntent` → antrean dokumen + Channel wakeup |
| Frontend | `tauri.ts` / `android.ts` → `file-inbox.ts::createFileInbox` → subscription `App.tsx` → `loadDocument` |

Event/Channel hanya memberi sinyal; data tetap di antrean sampai `drain_open_files`.
Inbox frontend mempertahankan permintaan saat React StrictMode melakukan remount.
Desktop mengirim `OpenRequest` jenis `document` berisi path; Android memakai
`documentData` berisi konten. Kegagalan dikirim sebagai jenis `error`.

### Workspace dan tautan dokumen

- **Folder desktop:** `Header.tsx` → `App.tsx::handleOpenFolder` → bridge
  `pickWorkspace/scanWorkspace` → `desktop.rs` → `documents.rs`.
- **Explorer:** `Sidebar.tsx` menampilkan tree; pemilihan file kembali ke
  `App.tsx::handleSelectFile` dan `read_document`.
- **Tautan relatif:** `PreviewPane.tsx::handleClick` → `App.tsx` callback
  `onNavigate` → `resolveDocumentLink/readDocument` →
  `Documents::resolve_link/read`.
- **Tautan web/email:** `PreviewPane.tsx` → native `openExternal`; desktop memakai
  `documents.rs::external_url` dan crate `open`, Android memakai Intent ACTION_VIEW.
  Browser membuka tab lewat atribut anchor.
- **Batas akses:** `documents.rs` menangani grant, canonical path, validasi dokumen,
  filtering tree, dan symlink. `src-tauri/src/error.rs` menyimpan `AppError` bersama.

Workspace dan navigasi file relatif tersedia di desktop. Android meminta pengguna
memilih dokumen lain melalui Open File; URI provider tidak menjadi path filesystem.

### Mermaid, zoom, scroll, dan tema

| File | Peran |
|---|---|
| `src/lib/markdown.ts` | Mengubah fence Mermaid menjadi source placeholder yang di-escape |
| `src/components/PreviewPane.tsx` | Memulai render dan mendeteksi perubahan tema sistem |
| `src/lib/mermaid.ts` | Lazy import Mermaid, antrean render, cancellation, tema, fallback source saat error, `waitForMermaid()` |
| `src/lib/mermaid-viewer.ts` | Viewer SVG, kontrol zoom/Fit, keyboard, state zoom/scroll |
| `src/App.css` | Layout viewer, overflow dua arah, tema, aturan cetak |

Mermaid memakai mode keamanan strict. Saat tema berubah, render mengembalikan state
zoom/scroll sebelumnya. Jangan mengubah ukuran cetak berdasarkan zoom layar.

### Export PDF

`Header.tsx` atau shortcut Ctrl/Cmd+P di `App.tsx` →
`src/lib/export-pdf.ts::exportToPdf` → menunggu Mermaid dan font → print platform:

- Desktop: bridge → `desktop.rs::print_document` → Tauri `window.print()`;
  macOS memakai WKWebView print.
- Android: bridge Rust → `DocumentsPlugin.printDocument` → WebView print adapter
  dan Android PrintManager.
- Browser: `window.print()`.

Aturan `@media print` di `src/App.css` menyembunyikan UI/kontrol diagram dan
menyesuaikan diagram ke lebar halaman. Dialog OS mengelola simpan/cetak/batal.

### Layout dan integrasi Android

- `src/App.css`: aturan khusus ponsel menggunakan `.app-android`.
- `src-tauri/gen/android/app/src/main/java/com/markdownopen/app/MainActivity.kt`:
  edge-to-edge dan padding system bars/display cutout.
- `src-tauri/gen/android/app/src/main/AndroidManifest.xml`: launcher, singleTask,
  filter VIEW/SEND, MIME type, permission, provider.
- `src-tauri/gen/android/app/src/main/res/`: tema, string, dan ikon launcher.
- `src-tauri/gen/android/app/build.gradle.kts`: SDK/version, build type,
  dependency Android, serta source set plugin Kotlin di luar scaffold.

## Konfigurasi, build, dan distribusi

| File | Peran |
|---|---|
| `package.json` | Script dev/test/build; versi JS |
| `vite.config.ts` | Build frontend, port dev, variabel platform Tauri |
| `src-tauri/Cargo.toml` | Library/binary Rust, dependency platform, versi Rust, optimasi release |
| `rust-toolchain.toml` | Rust stable |
| `src-tauri/tauri.conf.json` | Konfigurasi dasar/desktop, versi aplikasi, window, CSP, bundle macOS |
| `src-tauri/tauri.android.conf.json` | Override Android: application ID, window, capability, min SDK |
| `src-tauri/build.rs` | Build Tauri dan daftar command untuk permission yang digenerasikan |
| `src-tauri/capabilities/main.json` | Izin window desktop lokal |
| `src-tauri/capabilities/android.json` | Izin command Android |
| `src-tauri/gen/android/build.gradle.kts` | Versi plugin Gradle Android/Kotlin |
| `src-tauri/gen/android/gradle/wrapper/gradle-wrapper.properties` | Versi Gradle wrapper |
| `src-tauri/gen/android/buildSrc/` | Integrasi task Gradle dengan build Rust/Tauri |
| `scripts/package-macos.mjs` | Menyalin app/DMG, membuat ZIP, laporan perbandingan ukuran Electron |

Saat menaikkan versi, sinkronkan `package.json`, `src-tauri/Cargo.toml`, dan
`src-tauri/tauri.conf.json`. Android memperoleh versionName/versionCode melalui
file `tauri.properties` yang digenerasikan Tauri.

| Perintah | Output utama |
|---|---|
| `npm run build` | `dist/` (frontend saja) |
| `npm run desktop:build` | `release/tauri-arm64/` dan `docs/tauri-size-report.json` |
| `npm run android:apk` | `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk` |
| `npm run android:apk:release` | `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk` tanpa konfigurasi signing |

Script APK memilih arm64 walaupun nama output mengandung `universal`. Salinan
APK di `release/android/` dibuat manual, bukan output tambahan otomatis script.
File signing dan hasil build lokal tidak masuk Git. `src-tauri/gen/schemas/`,
permission autogenerated, source Android `generated/`, serta JNI `.so` juga
digenerasikan; bedakan dari manifest/Activity/Gradle kustom yang dilacak Git.

Branch utama repository adalah `master`. Cara build lengkap ada di
[README](../README.md); batas signing dan checklist perangkat ada di
[panduan Android](android-manual-testing.md). Windows masih tahap persiapan:
jangan menyimpulkan feature parity atau tersedianya installer dari dukungan Tauri.

## Lokasi pemeriksaan

| Lokasi | Cakupan |
|---|---|
| `src/App.test.tsx` | Browser file loading, dokumen kosong, error preservation |
| `src/lib/latest-task.test.ts` | Hasil async lama dan cancellation |
| `src/lib/file-inbox.test.ts` | Subscription, buffering, lifecycle inbox |
| `src/lib/markdown.test.ts` | Parser dan escaping source |
| `src/lib/mermaid-viewer.test.ts` | Perilaku viewer diagram |
| Modul `tests` di `src-tauri/src/documents.rs` | Grant/read, Unicode, path relatif, workspace, symlink, URL eksternal |
| Modul `tests` di `src-tauri/src/open_files.rs` | Antrean file sebelum frontend siap |
| `docs/android-manual-testing.md` | Picker, Open With/Share, Mermaid, layout, print di perangkat |
| `docs/migration-validation.md` | Catatan validasi migrasi desktop |

Tes otomatis tidak menggantikan pemeriksaan dialog native, Finder, provider file
Android, PDF aktual, dan installer pada platform tujuan. Perbarui peta ini saat
entry point atau kepemilikan fitur berubah.
