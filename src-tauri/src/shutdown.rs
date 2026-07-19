#![allow(dependency_on_unit_never_type_fallback)]

use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use rusqlite::params;
use crate::db::{DatabaseService, ReflectionStatus};
use crate::inhibitor::{InhibitorManager, LogindManagerProxy};
use crate::window::WindowManager;

pub fn log_message(level: &str, msg: &str, app_handle: &AppHandle) {
    if let Ok(log_dir) = app_handle.path().app_data_dir() {
        let log_path = log_dir.join("beatme.log");
        let _ = std::fs::create_dir_all(&log_dir);

        // Log rotation: Keep last 10 log files (beatme.log.9 is deleted, 8 -> 9, ..., log -> log.1)
        if let Ok(metadata) = std::fs::metadata(&log_path) {
            if metadata.len() > 5 * 1024 * 1024 {
                let _ = std::fs::remove_file(log_dir.join("beatme.log.9"));
                for i in (1..9).rev() {
                    let from = log_dir.join(format!("beatme.log.{}", i));
                    let to = log_dir.join(format!("beatme.log.{}", i + 1));
                    if from.exists() {
                        let _ = std::fs::rename(from, to);
                    }
                }
                let _ = std::fs::rename(&log_path, log_dir.join("beatme.log.1"));
            }
        }

        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
        {
            let now = chrono::Local::now().to_rfc3339();
            let _ = writeln!(file, "[{}] [{}] {}", now, level, msg);
        }
    }
}

pub fn is_after_10_pm() -> bool {
    use chrono::Timelike;
    let now = chrono::Local::now();
    now.hour() >= 22
}

pub fn get_local_date_str() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

pub struct ShutdownManager {
    app_handle: AppHandle,
    pub db_service: DatabaseService,
    inhibitor_manager: Arc<Mutex<InhibitorManager>>,
    shutdown_intercepted: Arc<Mutex<bool>>,
}

impl ShutdownManager {
    pub fn new(app_handle: AppHandle, db_service: DatabaseService) -> Self {
        Self {
            app_handle,
            db_service,
            inhibitor_manager: Arc::new(Mutex::new(InhibitorManager::new())),
            shutdown_intercepted: Arc::new(Mutex::new(false)),
        }
    }

    pub fn start_dbus_listener(self: Arc<Self>) {
        let manager = self.clone();
        std::thread::spawn(move || {
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .unwrap();

            rt.block_on(async {
                log_message("INFO", "Connecting to D-Bus to listen for system PrepareForShutdown signals...", &manager.app_handle);
                match zbus::Connection::system().await {
                    Ok(conn) => {
                        match LogindManagerProxy::new(&conn).await {
                            Ok(manager_proxy) => {
                                match manager_proxy.receive_prepare_for_shutdown().await {
                                    Ok(mut stream) => {
                                        use futures_util::StreamExt;
                                        log_message("INFO", "D-Bus match rule registered. Listening to PrepareForShutdown stream.", &manager.app_handle);
                                        while let Some(signal) = stream.next().await {
                                            if let Ok(args) = signal.args() {
                                                let active = args.active;
                                                if active {
                                                    log_message("WARN", "System preparing for shutdown/logout/reboot! Intercepting...", &manager.app_handle);
                                                    manager.handle_shutdown_triggered().await;
                                                } else {
                                                    log_message("INFO", "PrepareForShutdown signal active=false received (shutdown cancelled).", &manager.app_handle);
                                                    manager.handle_shutdown_cancelled().await;
                                                }
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        log_message("ERROR", &format!("Failed to receive PrepareForShutdown stream: {}", e), &manager.app_handle);
                                    }
                                }
                            }
                            Err(e) => {
                                log_message("ERROR", &format!("Failed to create LogindManagerProxy: {}", e), &manager.app_handle);
                            }
                        }
                    }
                    Err(e) => {
                        log_message("ERROR", &format!("Failed to connect to D-Bus system bus: {}", e), &manager.app_handle);
                    }
                }
            });
        });
    }

    pub async fn handle_shutdown_triggered(&self) {
        let today = get_local_date_str();
        let is_completed = self.db_service.check_today_completed_or_skipped(&today);
        let is_after_10 = is_after_10_pm();

        let mut intercepted = self.shutdown_intercepted.lock().await;
        if *intercepted {
            log_message("INFO", "Shutdown already intercepted. Ignoring duplicate request.", &self.app_handle);
            return;
        }

        if is_after_10 && !is_completed {
            log_message("WARN", "Shutdown intercepted: Today's reflection is pending. Acquiring block inhibitor.", &self.app_handle);
            *intercepted = true;

            let mut inhibitor = self.inhibitor_manager.lock().await;
            // Acquire block inhibitor to pause shutdown indefinitely
            if let Err(e) = inhibitor.inhibit_block("BeatMe", "Requires daily reflection before checkout").await {
                log_message("ERROR", &format!("Failed to acquire block inhibitor: {}", e), &self.app_handle);
            }

            // Restore, show, and focus window on screen
            let _ = WindowManager::show_and_focus_main_window(&self.app_handle);

            // Notify frontend via decoupled event-driven communication
            if let Some(window) = self.app_handle.get_webview_window("main") {
                let _ = window.emit("shutdown-intercepted", ());
            }
        } else {
            log_message("INFO", "Shutdown request allowed: Reflection already completed or time is before 10 PM. Proceeding.", &self.app_handle);
        }
    }

    pub async fn handle_shutdown_cancelled(&self) {
        let mut intercepted = self.shutdown_intercepted.lock().await;
        *intercepted = false;

        let mut inhibitor = self.inhibitor_manager.lock().await;
        inhibitor.release_block();
    }

    pub async fn is_shutdown_intercepted(&self) -> bool {
        *self.shutdown_intercepted.lock().await
    }

    pub async fn release_block_inhibitor(&self) {
        let mut inhibitor = self.inhibitor_manager.lock().await;
        inhibitor.release_block();
    }
}

// ==================================================
// TAURI COMMANDS
// ==================================================

#[derive(serde::Serialize)]
pub struct TodayStatus {
    pub completed: bool,
    pub skipped: bool,
    pub is_after_10: bool,
    pub draft: Option<String>,
    pub started_writing_at: Option<String>,
}

#[tauri::command]
pub async fn get_today_status(
    _app: AppHandle,
    manager: State<'_, Arc<ShutdownManager>>,
) -> Result<TodayStatus, String> {
    let today = get_local_date_str();
    let conn = manager.db_service.get_connection()?;
    
    // Check reflections
    let mut stmt = conn.prepare("SELECT reflection, status, startedWritingAt FROM reflections WHERE date = ?").map_err(|e| e.to_string())?;
    let mut rows = stmt.query([&today]).map_err(|e| e.to_string())?;
    
    let mut completed = false;
    let mut skipped = false;
    let mut draft = None;
    let mut started_writing_at = None;
    
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let reflection: String = row.get::<_, Option<String>>(0).map_err(|e| e.to_string())?.unwrap_or_default();
        let status_str: String = row.get(1).map_err(|e| e.to_string())?;
        let started_writing: Option<String> = row.get(2).map_err(|e| e.to_string())?;

        let status = ReflectionStatus::from_str(&status_str);
        match status {
            ReflectionStatus::Completed => {
                completed = true;
                started_writing_at = started_writing;
            }
            ReflectionStatus::Skipped => {
                completed = true;
                skipped = true;
            }
            ReflectionStatus::Draft => {
                draft = Some(reflection);
                started_writing_at = started_writing;
            }
            _ => {}
        }
    }

    Ok(TodayStatus {
        completed,
        skipped,
        is_after_10: is_after_10_pm(),
        draft,
        started_writing_at,
    })
}

#[tauri::command]
pub async fn save_today_reflection(
    text: String,
    started_writing_at: Option<String>,
    completed_at: Option<String>,
    app: AppHandle,
    manager: State<'_, Arc<ShutdownManager>>,
) -> Result<(), String> {
    let today = get_local_date_str();
    let conn = manager.db_service.get_connection()?;
    let now = chrono::Local::now().to_rfc3339();
    let char_count = text.len() as i32;

    log_message("INFO", &format!("Saving today's reflection: {} characters", char_count), &app);

    // Save reflection to unified reflections table
    conn.execute(
        "INSERT INTO reflections (date, reflection, status, characterCount, startedWritingAt, completedAt, createdAt, updatedAt)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?6)
         ON CONFLICT(date) DO UPDATE SET
             reflection = excluded.reflection,
             status = excluded.status,
             characterCount = excluded.characterCount,
             startedWritingAt = excluded.startedWritingAt,
             completedAt = excluded.completedAt,
             updatedAt = excluded.updatedAt;",
        params![
            today,
            text,
            ReflectionStatus::Completed.to_str(),
            char_count,
            started_writing_at.unwrap_or_else(|| now.clone()),
            completed_at.unwrap_or_else(|| now.clone())
        ],
    ).map_err(|e| e.to_string())?;

    // Release inhibitor lock immediately
    manager.release_block_inhibitor().await;

    // If shutdown was intercepted, wait 1 second for I/O and quit tauri gracefully
    if manager.is_shutdown_intercepted().await {
        log_message("INFO", "Reflection saved during checkout. Gracefully exiting in 1 second.", &app);
        let app_clone = app.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            app_clone.exit(0);
        });
    }

    Ok(())
}

#[tauri::command]
pub async fn skip_today_reflection(
    completed_at: Option<String>,
    app: AppHandle,
    manager: State<'_, Arc<ShutdownManager>>,
) -> Result<(), String> {
    let today = get_local_date_str();
    let conn = manager.db_service.get_connection()?;
    let now = chrono::Local::now().to_rfc3339();

    log_message("WARN", "User chose to Skip Today's reflection", &app);

    // Save skipped record to unified reflections table
    conn.execute(
        "INSERT INTO reflections (date, reflection, status, characterCount, startedWritingAt, completedAt, createdAt, updatedAt)
         VALUES (?1, '', ?2, 0, ?3, ?4, ?4, ?4)
         ON CONFLICT(date) DO UPDATE SET
             reflection = excluded.reflection,
             status = excluded.status,
             characterCount = excluded.characterCount,
             completedAt = excluded.completedAt,
             updatedAt = excluded.updatedAt;",
        params![
            today,
            ReflectionStatus::Skipped.to_str(),
            now,
            completed_at.unwrap_or_else(|| now.clone())
        ],
    ).map_err(|e| e.to_string())?;

    // Release inhibitor lock immediately
    manager.release_block_inhibitor().await;

    // If shutdown was intercepted, wait 1 second and exit gracefully
    if manager.is_shutdown_intercepted().await {
        log_message("INFO", "Checkout skipped. Gracefully exiting in 1 second.", &app);
        let app_clone = app.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            app_clone.exit(0);
        });
    }

    Ok(())
}

#[tauri::command]
pub async fn save_today_draft(
    text: String,
    started_writing_at: String,
    manager: State<'_, Arc<ShutdownManager>>,
) -> Result<(), String> {
    let today = get_local_date_str();
    let conn = manager.db_service.get_connection()?;
    let now = chrono::Local::now().to_rfc3339();

    conn.execute(
        "INSERT INTO reflections (date, reflection, status, characterCount, startedWritingAt, completedAt, createdAt, updatedAt)
         VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?6)
         ON CONFLICT(date) DO UPDATE SET
             reflection = excluded.reflection,
             status = excluded.status,
             characterCount = excluded.characterCount,
             updatedAt = excluded.updatedAt;",
        params![today, text, ReflectionStatus::Draft.to_str(), text.len() as i32, started_writing_at, now],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn check_shutdown_intercepted(
    manager: State<'_, Arc<ShutdownManager>>,
) -> Result<bool, String> {
    Ok(manager.is_shutdown_intercepted().await)
}

#[derive(serde::Serialize)]
pub struct HistoricalDraft {
    pub date: String,
    pub reflection: String,
}

#[tauri::command]
pub async fn get_historical_draft(
    manager: State<'_, Arc<ShutdownManager>>,
) -> Result<Option<HistoricalDraft>, String> {
    let today = get_local_date_str();
    let conn = manager.db_service.get_connection()?;
    let mut stmt = conn.prepare("SELECT date, reflection FROM reflections WHERE status = 'draft' AND date < ?1 LIMIT 1").map_err(|e| e.to_string())?;
    let mut rows = stmt.query([&today]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(HistoricalDraft {
            date: row.get(0).map_err(|e| e.to_string())?,
            reflection: row.get::<_, Option<String>>(1).map_err(|e| e.to_string())?.unwrap_or_default(),
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn discard_historical_draft(
    date: String,
    manager: State<'_, Arc<ShutdownManager>>,
) -> Result<(), String> {
    let conn = manager.db_service.get_connection()?;
    conn.execute("DELETE FROM reflections WHERE date = ?1 AND status = 'draft';", [&date]).map_err(|e| e.to_string())?;
    Ok(())
}
