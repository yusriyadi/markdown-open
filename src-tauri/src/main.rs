#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod documents;
mod open_files;

use documents::{AppError, Document, Documents, WorkspaceTree};
use open_files::{OpenFiles, OpenRequest};
use std::{
    path::{Path, PathBuf},
    sync::Arc,
};
use tauri::{Emitter, Manager, State};

#[derive(Default)]
struct AppState {
    documents: Arc<Documents>,
    opened: OpenFiles,
}

fn task_error(error: impl std::fmt::Display) -> AppError {
    AppError::new("internal", error.to_string())
}

#[tauri::command]
async fn pick_document(state: State<'_, AppState>) -> Result<Option<Document>, AppError> {
    let file = rfd::AsyncFileDialog::new()
        .add_filter("Markdown", &["md", "markdown"])
        .pick_file()
        .await;
    let Some(file) = file else { return Ok(None) };
    let documents = state.documents.clone();
    let path = file.path().to_path_buf();
    tauri::async_runtime::spawn_blocking(move || {
        let path = documents.grant_file(&path)?;
        documents.read(&path).map(Some)
    })
    .await
    .map_err(task_error)?
}

#[tauri::command]
async fn read_document(state: State<'_, AppState>, path: PathBuf) -> Result<Document, AppError> {
    let documents = state.documents.clone();
    tauri::async_runtime::spawn_blocking(move || documents.read(&path))
        .await
        .map_err(task_error)?
}

#[tauri::command]
async fn pick_workspace(state: State<'_, AppState>) -> Result<Option<PathBuf>, AppError> {
    let folder = rfd::AsyncFileDialog::new().pick_folder().await;
    let Some(folder) = folder else {
        return Ok(None);
    };
    state.documents.grant_workspace(folder.path()).map(Some)
}

#[tauri::command]
async fn scan_workspace(
    state: State<'_, AppState>,
    path: PathBuf,
) -> Result<WorkspaceTree, AppError> {
    let documents = state.documents.clone();
    tauri::async_runtime::spawn_blocking(move || documents.scan(&path))
        .await
        .map_err(task_error)?
}

#[tauri::command]
async fn resolve_document_link(
    state: State<'_, AppState>,
    current: PathBuf,
    href: String,
) -> Result<PathBuf, AppError> {
    let documents = state.documents.clone();
    tauri::async_runtime::spawn_blocking(move || documents.resolve_link(&current, &href))
        .await
        .map_err(task_error)?
}

#[tauri::command]
fn drain_open_files(state: State<'_, AppState>) -> Vec<OpenRequest> {
    state.opened.drain()
}

#[tauri::command]
fn open_external(url: String) -> Result<(), AppError> {
    let url = documents::external_url(&url)?;
    open::that_detached(url.as_str()).map_err(task_error)
}

#[tauri::command]
fn print_document(window: tauri::WebviewWindow) -> Result<(), AppError> {
    // Tauri dispatches macOS printing to the native WKWebView print operation.
    // macOS owns the print/save/cancel interaction after the dialog is opened.
    window.print().map_err(task_error)
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn queue_file(app: &tauri::AppHandle, path: &Path) {
    let state = app.state::<AppState>();
    state.opened.enqueue(&state.documents, path);
    show_main(app);
    // This is only a wakeup hint. Requests stay queued until the frontend drains.
    let _ = app.emit_to("main", "documents-available", ());
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            pick_document,
            read_document,
            pick_workspace,
            scan_workspace,
            resolve_document_link,
            drain_open_files,
            open_external,
            print_document,
        ])
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // Keep the main frontend alive so Dock/Finder can reopen it.
                    api.prevent_close();
                    let _ = window.hide();
                }
                tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) => {
                    if let Some(path) = paths.first() {
                        queue_file(window.app_handle(), path);
                    }
                }
                _ => {}
            }
        })
        .build(tauri::generate_context!())
        .expect("failed to build Markdown Open")
        .run(|app, event| match event {
            #[cfg(target_os = "macos")]
            tauri::RunEvent::Opened { urls } => {
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        queue_file(app, &path);
                    }
                }
            }
            #[cfg(target_os = "macos")]
            tauri::RunEvent::Reopen { .. } => show_main(app),
            _ => {}
        });
}
