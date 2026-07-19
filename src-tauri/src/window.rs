use tauri::{AppHandle, Manager};

pub struct WindowManager;

impl WindowManager {
    pub fn show_and_focus_main_window(app_handle: &AppHandle) -> Result<(), String> {
        if let Some(window) = app_handle.get_webview_window("main") {
            window.show().map_err(|e| e.to_string())?;
            window.unminimize().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
            window.set_always_on_top(true).map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Main window not found".to_string())
        }
    }

    pub fn reset_window_always_on_top(app_handle: &AppHandle) -> Result<(), String> {
        if let Some(window) = app_handle.get_webview_window("main") {
            window.set_always_on_top(false).map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Main window not found".to_string())
        }
    }
}
