import { create } from "zustand";
import { AutostartService } from "../services/AutostartService";

interface SettingsState {
  hasSeenWelcome: boolean;
  autoLaunchEnabled: boolean;
  setHasSeenWelcome: (hasSeenWelcome: boolean) => void;
  toggleAutoLaunch: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hasSeenWelcome: false,
  autoLaunchEnabled: false,
  setHasSeenWelcome: (hasSeenWelcome) => {
    localStorage.setItem("beatme_has_seen_welcome", JSON.stringify(hasSeenWelcome));
    set({ hasSeenWelcome });
  },
  toggleAutoLaunch: async () => {
    const current = get().autoLaunchEnabled;
    if (current) {
      await AutostartService.disableAutoStart();
    } else {
      await AutostartService.enableAutoStart();
    }
    const verified = await AutostartService.isAutoStartEnabled();
    set({ autoLaunchEnabled: verified });
  },
  loadSettings: async () => {
    const hasSeenWelcomeRaw = localStorage.getItem("beatme_has_seen_welcome");
    const hasSeenWelcome = hasSeenWelcomeRaw ? JSON.parse(hasSeenWelcomeRaw) : false;
    
    const autoLaunchEnabled = await AutostartService.isAutoStartEnabled();
    
    set({ hasSeenWelcome, autoLaunchEnabled });
  }
}));
