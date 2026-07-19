import { create } from "zustand";
import { Reflection } from "../types";

export type Page = "home" | "history" | "statistics";

interface UiState {
  currentPage: Page;
  settingsOpen: boolean;
  activeViewReflection: Reflection | null;
  setCurrentPage: (page: Page) => void;
  setSettingsOpen: (open: boolean) => void;
  setActiveViewReflection: (reflection: Reflection | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  currentPage: "home",
  settingsOpen: false,
  activeViewReflection: null,
  setCurrentPage: (currentPage) => set({ currentPage }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setActiveViewReflection: (activeViewReflection) => set({ activeViewReflection }),
}));
