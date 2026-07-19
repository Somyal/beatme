import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

export const AutostartService = {
  async enableAutoStart(): Promise<void> {
    try {
      const active = await isEnabled();
      if (!active) {
        await enable();
      }
    } catch (e) {
      console.error("Failed to enable auto-start:", e);
    }
  },

  async disableAutoStart(): Promise<void> {
    try {
      const active = await isEnabled();
      if (active) {
        await disable();
      }
    } catch (e) {
      console.error("Failed to disable auto-start:", e);
    }
  },

  async isAutoStartEnabled(): Promise<boolean> {
    try {
      return await isEnabled();
    } catch (e) {
      console.error("Failed to check auto-start status:", e);
      return false;
    }
  }
};
