#![allow(dependency_on_unit_never_type_fallback)]

use std::fs;
use std::io::Write;
use std::sync::Arc;
use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, MouseButton, TrayIconEvent};

pub mod db;
pub mod inhibitor;
pub mod window;
pub mod shutdown;

use crate::db::DatabaseService;
use crate::shutdown::{
    ShutdownManager,
    get_today_status,
    save_today_reflection,
    skip_today_reflection,
    save_today_draft,
    check_shutdown_intercepted,
    get_historical_draft,
    discard_historical_draft
};

#[tauri::command]
async fn export_db_file(app: tauri::AppHandle, target_path: String) -> Result<(), String> {
    let db_path = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("beatme.db");
    
    if !db_path.exists() {
        return Err("Database file does not exist yet. Create a reflection first.".to_string());
    }

    fs::copy(&db_path, &target_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn import_db_file(app: tauri::AppHandle, source_path: String) -> Result<(), String> {
    let db_path = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("beatme.db");
        
    // Create the directory if it doesn't exist yet
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::copy(&source_path, &db_path).map_err(|e| e.to_string())?;
    Ok(())
}

fn handle_single_instance(app_handle: &tauri::AppHandle) -> bool {
    if let Ok(app_dir) = app_handle.path().app_data_dir() {
        let sock_path = app_dir.join("beatme.sock");
        let _ = std::fs::create_dir_all(&app_dir);

        // Try to connect to an existing instance
        if let Ok(mut stream) = std::os::unix::net::UnixStream::connect(&sock_path) {
            let _ = stream.write_all(b"show");
            return false; // Existing instance found, current one should exit
        }

        // Remove any stale socket file
        let _ = std::fs::remove_file(&sock_path);

        // Bind to socket
        if let Ok(listener) = std::os::unix::net::UnixListener::bind(&sock_path) {
            let app_clone = app_handle.clone();
            std::thread::spawn(move || {
                for stream in listener.incoming() {
                    if let Ok(mut _s) = stream {
                        if let Some(window) = app_clone.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                }
            });
            true
        } else {
            false
        }
    } else {
        false
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--hidden"])))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Setup DB service
            let db_path = app.path().app_data_dir()
                .map_err(|e| e.to_string())?
                .join("beatme.db");
            if let Some(parent) = db_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            
            let db_service = DatabaseService::new(db_path);
            db_service.init()?;

            let app_handle = app.handle().clone();

            // Check single instance socket
            if !handle_single_instance(&app_handle) {
                // Secondary instance, exit immediately
                app.handle().exit(0);
                return Ok(());
            }

            // Create and manage ShutdownManager state
            let shutdown_manager = Arc::new(ShutdownManager::new(app_handle.clone(), db_service));
            app.manage(shutdown_manager.clone());

            // Initialize structured logger and log startup
            crate::shutdown::log_message("INFO", "BeatMe application starting up...", &app_handle);

            // Hide/Show main window based on arguments
            if let Some(window) = app.get_webview_window("main") {
                let args: Vec<String> = std::env::args().collect();
                if args.contains(&"--hidden".to_string()) {
                    window.hide()?;
                    crate::shutdown::log_message("INFO", "Application launched in background (hidden)", &app_handle);
                } else {
                    window.show()?;
                    window.set_focus()?;
                    crate::shutdown::log_message("INFO", "Application launched in foreground (visible)", &app_handle);
                }
            }

            // Setup System Tray
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Open BeatMe", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            let is_after_10 = crate::shutdown::is_after_10_pm();
                            let today = crate::shutdown::get_local_date_str();
                            let is_completed = {
                                let manager = app.state::<Arc<ShutdownManager>>();
                                manager.db_service.check_today_completed_or_skipped(&today)
                            };

                            if is_after_10 && !is_completed {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                    let _ = window.set_always_on_top(true);
                                }
                            } else {
                                crate::shutdown::log_message("INFO", "Application exiting via quit tray menu item", app);
                                app.exit(0);
                            }
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button, .. } = event {
                        if button == MouseButton::Left {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    }
                })
                .build(app)?;

            // Start D-Bus event-driven shutdown listener
            shutdown_manager.start_dbus_listener();

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let app = window.app_handle();
                let is_after_10 = crate::shutdown::is_after_10_pm();
                let today = crate::shutdown::get_local_date_str();
                
                let is_completed = {
                    let manager = app.state::<Arc<ShutdownManager>>();
                    manager.db_service.check_today_completed_or_skipped(&today)
                };

                if is_after_10 && !is_completed {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.set_always_on_top(true);
                } else {
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            export_db_file, 
            import_db_file,
            get_today_status,
            save_today_reflection,
            skip_today_reflection,
            save_today_draft,
            check_shutdown_intercepted,
            get_historical_draft,
            discard_historical_draft
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
