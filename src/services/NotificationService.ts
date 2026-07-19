import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

let reminderTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const NotificationService = {
  async requestNotificationPermission(): Promise<boolean> {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }
      return permissionGranted;
    } catch (e) {
      console.error("Error checking notification permission:", e);
      return false;
    }
  },

  async sendReminderNotification(): Promise<void> {
    const hasPermission = await this.requestNotificationPermission();
    if (hasPermission) {
      sendNotification({
        title: "BeatMe",
        body: "Did you beat yourself today?",
      });
    }
  },

  scheduleDailyReminder(): void {
    if (reminderTimeoutId) {
      clearTimeout(reminderTimeoutId);
    }

    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(22, 0, 0, 0); // 10:00 PM local time

    if (now.getTime() >= reminderTime.getTime()) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const timeUntilReminder = reminderTime.getTime() - now.getTime();

    reminderTimeoutId = setTimeout(async () => {
      await this.sendReminderNotification();
      this.scheduleDailyReminder();
    }, timeUntilReminder);

    console.log(`Scheduled daily reminder in ${Math.round(timeUntilReminder / 1000 / 60)} minutes.`);
  },

  cancelReminder(): void {
    if (reminderTimeoutId) {
      clearTimeout(reminderTimeoutId);
      reminderTimeoutId = null;
    }
  }
};
