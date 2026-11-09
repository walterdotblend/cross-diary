// Cross-Diary Rust Core Library for Tauri v2
use tauri::{AppHandle, Manager};

#[tauri::command]
fn get_desktop_info() -> Result<String, String> {
    Ok("Cross-Diary Desktop Core Active".into())
}

#[tauri::command]
fn set_ignore_mouse_events(app: AppHandle, ignore: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_ignore_cursor_events(ignore);
    }
    Ok(())
}

#[tauri::command]
fn dock_to_edge(app: AppHandle, edge: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        // Window edge docking logic for desktop
        println!("Docking window to edge: {}", edge);
        let _ = window.set_always_on_top(true);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .invoke_handler(tauri::generate_handler![
            get_desktop_info,
            set_ignore_mouse_events,
            dock_to_edge
        ])
        .run(tauri::generate_context!())
        .expect("error while running Cross-Diary application");
}
