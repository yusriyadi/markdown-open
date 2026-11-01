mod error;

#[cfg(target_os = "android")]
mod android;
#[cfg(desktop)]
mod desktop;
#[cfg(desktop)]
mod documents;
#[cfg(desktop)]
mod open_files;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(desktop)]
    desktop::run();
    #[cfg(target_os = "android")]
    android::run();
}
