import { create } from "zustand";
import { Reflection } from "../types";
import { DatabaseService } from "../db/database";
import { useStatsStore } from "./useStatsStore";
import { getLocalDateString } from "../utils/date";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

interface ReflectionsState {
  reflections: Reflection[];
  todayReflection: Reflection | null;
  todayDraft: string | null;
  startedWritingAt: string | null;
  isAfter10: boolean;
  historicalDraft: { date: string; reflection: string } | null;
  searchQuery: string;
  searchResults: Reflection[];
  loading: boolean;
  
  loadReflections: () => Promise<void>;
  saveReflection: (text: string) => Promise<void>;
  saveDraft: (text: string) => Promise<void>;
  skipToday: () => Promise<void>;
  restoreHistoricalDraft: () => Promise<void>;
  discardHistoricalDraft: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  resetAllData: () => Promise<void>;
  
  exportSqlite: () => Promise<string | null>;
  importSqlite: () => Promise<boolean>;
  exportJson: () => Promise<void>;
  importJson: () => Promise<boolean>;
}

export const useReflectionsStore = create<ReflectionsState>((set, get) => ({
  reflections: [],
  todayReflection: null,
  todayDraft: null,
  startedWritingAt: null,
  isAfter10: false,
  historicalDraft: null,
  searchQuery: "",
  searchResults: [],
  loading: false,

  loadReflections: async () => {
    set({ loading: true });
    try {
      const list = await DatabaseService.getAllReflections();
      
      const status = await invoke<{
        completed: boolean;
        skipped: boolean;
        is_after_10: boolean;
        draft: string | null;
        started_writing_at: string | null;
      }>("get_today_status");

      // Check for any unsaved draft from a previous day (crash recovery)
      const histDraft = await invoke<{ date: string; reflection: string } | null>("get_historical_draft");

      const todayStr = getLocalDateString(new Date());
      const todayRef = list.find((r) => r.date === todayStr) || null;
      
      set({ 
        reflections: list, 
        todayReflection: todayRef, 
        todayDraft: status.draft,
        startedWritingAt: status.started_writing_at,
        isAfter10: status.is_after_10,
        historicalDraft: histDraft,
        loading: false 
      });
      
      // Update statistics
      useStatsStore.getState().calculateStats(list);
    } catch (e) {
      console.error("Failed to load reflections:", e);
      set({ loading: false });
    }
  },

  saveReflection: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error("Reflection cannot be empty.");
    }

    const { startedWritingAt } = get();
    const now = new Date().toISOString();

    await invoke("save_today_reflection", {
      text: trimmed,
      startedWritingAt: startedWritingAt || now,
      completedAt: now
    });

    await get().loadReflections();
  },

  saveDraft: async (text: string) => {
    let { startedWritingAt } = get();
    if (!startedWritingAt && text.trim().length > 0) {
      startedWritingAt = new Date().toISOString();
      set({ startedWritingAt });
    }

    if (startedWritingAt) {
      await invoke("save_today_draft", {
        text,
        startedWritingAt
      });
      set({ todayDraft: text });
    }
  },

  skipToday: async () => {
    const now = new Date().toISOString();
    await invoke("skip_today_reflection", {
      completedAt: now
    });
    await get().loadReflections();
  },

  restoreHistoricalDraft: async () => {
    const { historicalDraft } = get();
    if (historicalDraft) {
      // 1. Save the draft text to today's draft
      await get().saveDraft(historicalDraft.reflection);
      // 2. Discard/delete the old historical draft record
      await invoke("discard_historical_draft", { date: historicalDraft.date });
      set({ historicalDraft: null });
      await get().loadReflections();
    }
  },

  discardHistoricalDraft: async () => {
    const { historicalDraft } = get();
    if (historicalDraft) {
      await invoke("discard_historical_draft", { date: historicalDraft.date });
      set({ historicalDraft: null });
      await get().loadReflections();
    }
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
    if (!searchQuery.trim()) {
      set({ searchResults: [] });
    }
  },

  search: async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      set({ searchResults: [], searchQuery: query });
      return;
    }

    try {
      const results = await DatabaseService.searchReflections(trimmed);
      set({ searchResults: results, searchQuery: query });
    } catch (e) {
      console.error("Search failed:", e);
    }
  },

  resetAllData: async () => {
    await DatabaseService.resetDatabase();
    await get().loadReflections();
  },

  exportSqlite: async () => {
    try {
      const path = await save({
        title: "Export SQLite Database",
        defaultPath: "beatme.db",
        filters: [{ name: "SQLite Database", extensions: ["db", "sqlite"] }]
      });

      if (path) {
        await invoke("export_db_file", { targetPath: path });
        return typeof path === "string" ? path : (path as any).path || null;
      }
      return null;
    } catch (e) {
      console.error("Failed to export SQLite database:", e);
      throw e;
    }
  },

  importSqlite: async () => {
    try {
      const path = await open({
        title: "Import SQLite Database",
        multiple: false,
        filters: [{ name: "SQLite Database", extensions: ["db", "sqlite"] }]
      }) as any;

      // In Tauri v2, path can be a string, array of strings, or null
      let selectedPath: string | null = null;
      if (typeof path === "string") {
        selectedPath = path;
      } else if (Array.isArray(path) && path.length > 0) {
        selectedPath = path[0];
      } else if (path && typeof path === "object" && "path" in path) {
        selectedPath = (path as any).path;
      }

      if (selectedPath) {
        await invoke("import_db_file", { sourcePath: selectedPath });
        await get().loadReflections();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to import SQLite database:", e);
      throw e;
    }
  },

  exportJson: async () => {
    try {
      const list = await DatabaseService.getAllReflections();
      const jsonStr = JSON.stringify(list, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `beatme_reflections_${getLocalDateString(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export JSON:", e);
      throw e;
    }
  },

  importJson: async () => {
    return new Promise<boolean>((resolve, reject) => {
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (!files || files.length === 0) {
            resolve(false);
            return;
          }

          const file = files[0];
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const text = event.target?.result as string;
              const imported = JSON.parse(text) as Reflection[];
              
              if (!Array.isArray(imported)) {
                reject(new Error("Invalid JSON format. Expected an array of reflections."));
                return;
              }

              // Basic validation
              for (const item of imported) {
                if (typeof item.date !== "string" || typeof item.reflection !== "string") {
                  reject(new Error("Invalid JSON structure. Ensure fields 'date' and 'reflection' exist."));
                  return;
                }
              }

              await DatabaseService.rawImport(imported);
              await get().loadReflections();
              resolve(true);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error("File reading failed."));
          reader.readAsText(file);
        };
        input.click();
      } catch (e) {
        reject(e);
      }
    });
  }
}));
