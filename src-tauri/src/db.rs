use std::path::PathBuf;
use rusqlite::Connection;

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum ReflectionStatus {
    Pending,
    Draft,
    Completed,
    Skipped,
}

impl ReflectionStatus {
    pub fn to_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Draft => "draft",
            Self::Completed => "completed",
            Self::Skipped => "skipped",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "draft" => Self::Draft,
            "completed" => Self::Completed,
            "skipped" => Self::Skipped,
            _ => Self::Pending,
        }
    }
}

#[derive(Clone)]
pub struct DatabaseService {
    db_path: PathBuf,
}

impl DatabaseService {
    pub fn new(db_path: PathBuf) -> Self {
        Self { db_path }
    }

    pub fn get_connection(&self) -> Result<Connection, String> {
        let conn = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        // Enable WAL mode and NORMAL synchronous writes for optimal performance and safety
        let _ = conn.execute("PRAGMA journal_mode=WAL;", []);
        let _ = conn.execute("PRAGMA synchronous=NORMAL;", []);
        Ok(conn)
    }

    pub fn init(&self) -> Result<(), String> {
        let mut conn = self.get_connection()?;
        
        // 1. Check if the table "reflections" exists and whether it has the "status" column
        let has_status_column = {
            let mut stmt = conn.prepare("PRAGMA table_info(reflections)").map_err(|e| e.to_string())?;
            let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
            let mut found = false;
            while let Some(row) = rows.next().map_err(|e| e.to_string())? {
                let name: String = row.get(1).map_err(|e| e.to_string())?;
                if name == "status" {
                    found = true;
                    break;
                }
            }
            found
        };

        let reflections_exist = {
            let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reflections'").map_err(|e| e.to_string())?;
            stmt.exists([]).map_err(|e| e.to_string())?
        };

        if reflections_exist && !has_status_column {
            // Perform Database Migration under a transaction
            let tx = conn.transaction().map_err(|e| e.to_string())?;
            let now = chrono::Local::now().to_rfc3339();
            
            // Rename old reflections table
            tx.execute("ALTER TABLE reflections RENAME TO reflections_old;", []).map_err(|e| e.to_string())?;

            // Create new schema reflections table
            tx.execute(
                "CREATE TABLE reflections (
                    date TEXT PRIMARY KEY,
                    reflection TEXT,
                    status TEXT NOT NULL,
                    characterCount INTEGER DEFAULT 0,
                    startedWritingAt TEXT,
                    completedAt TEXT,
                    createdAt TEXT,
                    updatedAt TEXT
                );",
                [],
            ).map_err(|e| e.to_string())?;

            // Copy reflections from old table
            {
                let mut stmt = tx.prepare("SELECT date, reflection, characterCount, createdAt, startedWritingAt, completedAt FROM reflections_old").map_err(|e| e.to_string())?;
                let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
                while let Some(row) = rows.next().map_err(|e| e.to_string())? {
                    let date: String = row.get(0).map_err(|e| e.to_string())?;
                    let reflection: String = row.get::<_, Option<String>>(1).map_err(|e| e.to_string())?.unwrap_or_default();
                    let char_count: i32 = row.get::<_, Option<i32>>(2).map_err(|e| e.to_string())?.unwrap_or(0);
                    let created_at: String = row.get::<_, Option<String>>(3).map_err(|e| e.to_string())?.unwrap_or_else(|| now.clone());
                    let started_writing: Option<String> = row.get(4).map_err(|e| e.to_string())?;
                    let completed_at: Option<String> = row.get(5).map_err(|e| e.to_string())?;

                    let status = if reflection == "[SKIPPED]" {
                        ReflectionStatus::Skipped
                    } else {
                        ReflectionStatus::Completed
                    };

                    let final_text = if status == ReflectionStatus::Skipped {
                        "".to_string()
                    } else {
                        reflection
                    };

                    let count = if status == ReflectionStatus::Skipped {
                        0
                    } else {
                        char_count
                    };

                    tx.execute(
                        "INSERT INTO reflections (date, reflection, status, characterCount, startedWritingAt, completedAt, createdAt, updatedAt)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8);",
                        rusqlite::params![
                            date,
                            final_text,
                            status.to_str(),
                            count,
                            started_writing,
                            completed_at,
                            created_at.clone(),
                            created_at
                        ],
                    ).map_err(|e| e.to_string())?;
                }
            }

            // Drop old table
            tx.execute("DROP TABLE reflections_old;", []).map_err(|e| e.to_string())?;

            // Copy and migrate drafts table if it exists
            let drafts_exist = {
                let mut stmt = tx.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drafts'").map_err(|e| e.to_string())?;
                stmt.exists([]).map_err(|e| e.to_string())?
            };

            if drafts_exist {
                let mut stmt = tx.prepare("SELECT date, reflection, startedWritingAt FROM drafts").map_err(|e| e.to_string())?;
                let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
                while let Some(row) = rows.next().map_err(|e| e.to_string())? {
                    let date: String = row.get(0).map_err(|e| e.to_string())?;
                    let reflection: String = row.get::<_, Option<String>>(1).map_err(|e| e.to_string())?.unwrap_or_default();
                    let started_writing: String = row.get::<_, Option<String>>(2).map_err(|e| e.to_string())?.unwrap_or_else(|| date.clone());

                    // Only insert draft if no completed or skipped entry exists for that date
                    let exists = tx.prepare("SELECT 1 FROM reflections WHERE date = ?1 AND status IN ('completed', 'skipped')")
                        .map_err(|e| e.to_string())?
                        .exists([&date])
                        .map_err(|e| e.to_string())?;

                    if !exists {
                        tx.execute(
                            "INSERT OR REPLACE INTO reflections (date, reflection, status, characterCount, startedWritingAt, completedAt, createdAt, updatedAt)
                             VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?6);",
                            rusqlite::params![
                                date,
                                reflection.clone(),
                                ReflectionStatus::Draft.to_str(),
                                reflection.len() as i32,
                                started_writing.clone(),
                                started_writing
                            ],
                        ).map_err(|e| e.to_string())?;
                    }
                }
                tx.execute("DROP TABLE drafts;", []).map_err(|e| e.to_string())?;
            }

            tx.commit().map_err(|e| e.to_string())?;
        } else if !reflections_exist {
            // Create table from scratch
            conn.execute(
                "CREATE TABLE IF NOT EXISTS reflections (
                    date TEXT PRIMARY KEY,
                    reflection TEXT,
                    status TEXT NOT NULL,
                    characterCount INTEGER DEFAULT 0,
                    startedWritingAt TEXT,
                    completedAt TEXT,
                    createdAt TEXT,
                    updatedAt TEXT
                );",
                [],
            ).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    pub fn check_today_completed_or_skipped(&self, today_date: &str) -> bool {
        if let Ok(conn) = self.get_connection() {
            let mut stmt = match conn.prepare("SELECT COUNT(*) FROM reflections WHERE date = ?1 AND status IN ('completed', 'skipped')") {
                Ok(s) => s,
                Err(_) => return false,
            };
            let count: i64 = stmt.query_row([today_date], |row| row.get(0)).unwrap_or(0);
            count > 0
        } else {
            false
        }
    }
}
