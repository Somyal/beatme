import Database from "@tauri-apps/plugin-sql";
import { appDataDir } from "@tauri-apps/api/path";

let dbInstance: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (!dbInstance) {
    // Must use appDataDir() to match the Rust backend's app_data_dir().
    // On Linux: ~/.local/share/com.beatme.app/beatme.db
    // Using bare "sqlite:beatme.db" resolves to AppConfig (~/.config) — a different directory.
    const dataDir = await appDataDir();
    dbInstance = await Database.load(`sqlite:${dataDir}/beatme.db`);
  }
  return dbInstance;
}


export interface Reflection {
  date: string; // YYYY-MM-DD local format
  reflection: string;
  status: "completed" | "skipped" | "draft";
  characterCount: number;
  startedWritingAt?: string;
  completedAt?: string;
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}

export const DatabaseService = {
  async getAllReflections(): Promise<Reflection[]> {
    const db = await getDatabase();
    const results = await db.select<Reflection[]>(
      "SELECT * FROM reflections WHERE status IN ('completed', 'skipped') ORDER BY date DESC"
    );
    return results;
  },

  async getReflectionByDate(date: string): Promise<Reflection | null> {
    const db = await getDatabase();
    const results = await db.select<Reflection[]>(
      "SELECT * FROM reflections WHERE date = $1 LIMIT 1",
      [date]
    );
    return results.length > 0 ? results[0] : null;
  },

  async saveReflection(reflection: Omit<Reflection, "createdAt" | "status">): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    // Check if reflection for the day already exists to avoid unique constraint error
    const existing = await this.getReflectionByDate(reflection.date);
    
    if (existing) {
      await db.execute(
        "UPDATE reflections SET reflection = $1, status = 'completed', characterCount = $2, updatedAt = $3 WHERE date = $4",
        [reflection.reflection, reflection.characterCount, now, reflection.date]
      );
    } else {
      await db.execute(
        "INSERT INTO reflections (date, reflection, status, characterCount, createdAt, updatedAt) VALUES ($1, $2, 'completed', $3, $4, $4)",
        [reflection.date, reflection.reflection, reflection.characterCount, now]
      );
    }
  },

  async searchReflections(query: string): Promise<Reflection[]> {
    const db = await getDatabase();
    const searchPattern = `%${query}%`;
    return await db.select<Reflection[]>(
      "SELECT * FROM reflections WHERE (reflection LIKE $1 OR date LIKE $2) AND status IN ('completed', 'skipped') ORDER BY date DESC",
      [searchPattern, searchPattern]
    );
  },

  async resetDatabase(): Promise<void> {
    const db = await getDatabase();
    await db.execute("DELETE FROM reflections");
  },

  async rawImport(reflections: any[]): Promise<void> {
    const db = await getDatabase();
    
    for (const r of reflections) {
      const now = new Date().toISOString();
      const status = r.status || (r.reflection === "[SKIPPED]" ? "skipped" : "completed");
      const reflectionText = r.reflection === "[SKIPPED]" ? "" : r.reflection;
      const count = reflectionText.length;

      await db.execute(
        "INSERT OR REPLACE INTO reflections (date, reflection, status, characterCount, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $5)",
        [r.date, reflectionText, status, count, r.createdAt || now]
      );
    }
  }
};
