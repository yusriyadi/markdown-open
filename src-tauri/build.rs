fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "pick_document",
            "read_document",
            "pick_workspace",
            "scan_workspace",
            "resolve_document_link",
            "drain_open_files",
            "watch_open_files",
            "open_external",
            "print_document",
        ]),
    ))
    .expect("failed to build application");
}
