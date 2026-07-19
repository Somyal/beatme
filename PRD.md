# Product Requirements Document (PRD)
## Project Name: BeatMe
**Version:** 1.0.0  
**Date:** July 20, 2026  
**Status:** Approved  
**Author:** AI Product Engineering Team  

---

## 1. Purpose

**BeatMe** is a minimalist, local-first desktop application designed to foster daily mindfulness, discipline, and personal consistency. Unlike mainstream journaling apps that focus on general thoughts, BeatMe revolves around a single, uncompromising daily question: 

> **"Did you beat yourself today?"**

By asking if the user overcame procrastination, stayed disciplined, and improved upon their previous day's self, BeatMe acts as a non-judgmental accountability partner. 

---

## 2. Vision

Our vision is to build a high-friction, locally-secure daily check-in utility. In an era of cloud-connected, distraction-heavy apps, BeatMe stands out by being:
*   **Completely Offline:** Zero cloud synchronization or tracking, ensuring absolute user privacy.
*   **Accountability-Driven:** It prevents the user from ending their day without self-reflection by intercepting system shutdowns, reboots, and logouts late at night (after 10:00 PM), prompting them to complete or skip today's reflection.
*   **Minimalist & Aesthetic:** A sleek dark-mode user interface designed to maximize focus and minimize writing friction.

---

## 3. Functional Requirements

### 3.1. Onboarding & First Launch
*   **FR-1.1 (First-Time Experience):** Upon initial launch, if the user has not completed onboarding, the application must display a welcome screen explaining the app's core philosophy and signature prompt.
*   **FR-1.2 (Onboarding State Persistence):** Once the user clicks "START", this choice must be saved to local storage so subsequent launches bypass the welcome screen.

### 3.2. Daily Reflection Editor
*   **FR-2.1 (Input Field):** The home screen must display a prominent text area for the daily entry. The area should show placeholder text providing writing prompts (e.g., *"What went well? What didn't? What can tomorrow's you do better?"*).
*   **FR-2.2 (Save Reflection):** Users can save their reflection using a "Save Reflection" button or via the keyboard shortcut `Ctrl + S` / `Cmd + S`.
*   **FR-2.3 (Autosave Drafts):** The application must auto-save the user's progress to a draft state in the database if there is no keyboard input for 5 consecutive seconds (5s debounce).
*   **FR-2.4 (Skip Option):** A "Skip Today" button must be available after 10:00 PM or during a shutdown interception. Clicking this prompts a confirmation dialog warning the user that skipping will break their streak.
*   **FR-2.5 (Post-Save Actions):** After successfully saving or skipping a reflection, the app hides itself to the system tray (unless a system shutdown is in progress).
*   **FR-2.6 (Crash Recovery):** On startup, if a draft exists from a *previous* date (i.e., not today), a banner must appear informing the user of the unsaved historical draft, allowing them to "Restore" it to today's editor or "Discard" it.

### 3.3. Streak & Statistics Dashboard
*   **FR-3.1 (Current Streak):** Calculates the consecutive days reflections were completed. If today is not completed yet, the streak remains intact based on yesterday's completion. If yesterday is also missed, the streak resets to 0.
*   **FR-3.2 (Longest Streak):** Computes the historical record for consecutive completed days.
*   **FR-3.3 (Total Reflections):** Counts all reflections saved with a `completed` status.
*   **FR-3.4 (Average Length):** Calculates the average character count of all completed reflections.
*   **FR-3.5 (Days Missed):** Computes the total calendar days missed since the user first started using the app (excluding skipped days, which are stored explicitly).

### 3.4. Activity Heatmap
*   **FR-4.1 (Visual Heatmap Grid):** Displays a contributions-style calendar grid (similar to GitHub's commit grid) on the Home page and Statistics page.
*   **FR-4.2 (Status Color Coding):** Cells must visually distinguish between:
    *   *No data (empty)*: Dark grey / neutral cells.
    *   *Completed*: Accent green/white cells (intensity scales with character count).
    *   *Skipped*: Red cells.
*   **FR-4.3 (Tooltips):** Hovering over a cell must show the date and reflection status.

### 3.5. History & Text Search
*   **FR-5.1 (Reflection List):** Displays a scrollable timeline list of all past completed and skipped reflections in descending date order.
*   **FR-5.2 (Text Search):** A search input must allow real-time filtering of past reflections based on keywords contained in the reflection text or the date string (`YYYY-MM-DD`).
*   **FR-5.3 (Reflection Viewer):** Clicking on any item in the history list opens a read-only modal dialog displaying the full entry, character count, and time metadata.

### 3.6. Application Settings & Data Portability
*   **FR-6.1 (Startup Configuration):** A toggle to enable/disable "Launch on Startup" via the OS autostart service.
*   **FR-6.2 (SQLite Database Backup):** Ability to export the entire SQLite database file (`beatme.db`) to a user-selected path, and import an existing database file to overwrite the current state.
*   **FR-6.3 (JSON Export/Import):** Users can export reflections as a JSON file, and merge reflections from a JSON file (updating duplicates and inserting new ones).
*   **FR-6.4 (Database Reset):** A destructive "Reset All Data" option that deletes all reflections after confirmation.

### 3.7. Shutdown Interception & System Tray Integration
*   **FR-7.1 (System Shutdown Blocking):** On Unix-based operating systems, the application must connect to systemd-logind via D-Bus and listen for `PrepareForShutdown(true)` signals.
*   **FR-7.2 (Block Conditions):** If a shutdown is initiated after 10:00 PM and today's reflection is not completed or skipped, the app must acquire a D-Bus "block" inhibitor to delay the shutdown.
*   **FR-7.3 (Interception UI Overlay):** Upon interception, the app must restore its window, focus it, make it always-on-top, and display a full-screen transition overlay asking the user *"Did you beat yourself today?"* before showing the editor.
*   **FR-7.4 (Graceful Exit):** Once the user saves or skips the reflection, the D-Bus inhibitor block is released, and the app gracefully exits after 1 second, allowing the OS to complete shutdown.
*   **FR-7.5 (Single Instance Lock):** Utilizes local sockets to ensure only one instance of the application runs. Opening a secondary instance focuses and reveals the primary window.
*   **FR-7.6 (Tray Menu):** System tray menu provides "Open BeatMe" and "Quit" options. Quitting after 10:00 PM with a pending reflection is blocked in the same manner as a window close event.

---

## 4. Non-Functional Requirements

### 4.1. Security & Privacy
*   **NFR-1.1 (Local Storage):** All user reflection texts must be stored strictly on the local machine using an SQLite database.
*   **NFR-1.2 (No Network Outbounds):** The application must not make any external network requests, transmit metrics, or communicate with cloud servers.

### 4.2. Reliability & Data Integrity
*   **NFR-2.1 (Concurrent Write Safety):** The SQLite database must operate in WAL (Write-Ahead Logging) mode and use NORMAL synchronous writes to prevent database corruption during sudden OS shutdowns.
*   **NFR-2.2 (Auto-Recovery):** Unsaved drafts must be preserved so that in the event of an unexpected crash, they are restorable upon the next app startup.

### 4.3. Portability & Compatibility
*   **NFR-3.1 (Desktop Packaging):** Built using Tauri v2, the app must compile to native packages for Linux (DEB, RPM), Windows (MSI), and macOS (DMG).
*   **NFR-3.2 (OS Integration):** Autostart and shutdown interception logic must dynamically degrade when running on operating systems where D-Bus (Linux-specific) is unavailable.

### 4.4. Usability & Interface Design
*   **NFR-4.1 (Aesthetics):** Interface must use high-contrast dark styling (pure black backgrounds `#000000`, neutral shades, and neon green or amber accents) to align with a late-night focus theme.
*   **NFR-4.2 (Keyboard Navigability):** All primary controls must be navigable via standard keyboard inputs (`Tab`, `Enter`, `Escape` to close modals, `Ctrl + S` to save).

---

## 5. User Stories

### 5.1. Daily Journaling & Reflection
*   *As a* disciplined user,  
    *I want to* type my daily reflection in a distraction-free editor,  
    *So that* I can critically evaluate my daily progress and focus on self-improvement.

### 5.2. Auto-Saving Drafts
*   *As an* easily distracted writer,  
    *I want* my reflection text to automatically save in the background while I pause to think,  
    *So that* I do not lose my thoughts if I accidentally close the app or the computer shuts down.

### 5.3. Tracking Consistency Streaks
*   *As a* habit-builder,  
    *I want to* view a statistics dashboard showing my current and longest active streaks,  
    *So that* I can stay motivated to reflection write every single day without interruption.

### 5.4. Late Night Accountability Hook
*   *As a* user who frequently shuts down their computer late at night,  
    *I want* the app to block my system shutdown after 10:00 PM if I haven't written my reflection,  
    *So that* I am forced to review my day before checking out.

### 5.5. System Tray & Auto Launch
*   *As a* set-and-forget user,  
    *I want* the application to launch automatically in the background when my PC boots,  
    *So that* it sits quietly in the system tray until the reminder time without requiring manual start.

---

## 6. Edge Cases

| Edge Case | Description | App Behavior / Resolution |
| :--- | :--- | :--- |
| **System Shutdown Interception during Empty State** | User triggers shutdown at 11:00 PM without writing any reflection, and no draft exists. | The application blocks the shutdown, displays the fullscreen overlay, focuses the editor, and requires the user to write and save, or explicitly click "Skip Today" to let the PC shut down. |
| **Sudden App Crash during Typing** | The application crashes or is killed by the system while the user is actively writing a long reflection. | The 5-second debounce autosave ensures that most of the text is saved as a draft. On next launch, the application detects the historical draft, displays a banner, and allows the user to restore the text. |
| **Simultaneous DB Access** | The frontend uses `tauri-plugin-sql` while the Rust backend concurrently updates reflections during shutdown. | The SQLite database is opened in Write-Ahead Logging (WAL) mode with `PRAGMA journal_mode=WAL;` and `PRAGMA synchronous=NORMAL;` on both layers to allow concurrent read/write operations without locking issues. |
| **Timezone / Date Shift** | The user travels across timezones or stays up past midnight writing their reflection for "today". | Reflection dates are locked to the local date string (`YYYY-MM-DD`) at the moment the writing starts, preventing timezone offsets from shifting entries to incorrect calendar days. |
| **Invalid Backup Import** | The user attempts to import an invalid JSON file or an empty SQLite database. | Import parser performs JSON structure verification and validates fields. If validation fails, a Toast notification error is triggered and the operation aborts without modifying the database. |
| **Launch in Background** | The application starts automatically at boot with the `--hidden` flag. | The window remains hidden from the taskbar, showing only in the system tray, and runs the background scheduler to prepare the 10:00 PM reminder. |

---

## 7. Acceptance Criteria

*   **AC-1:** On initial launch, the user *must* see the Welcome onboarding flow, which cannot be skipped without clicking "START".
*   **AC-2:** Entering reflection text and waiting 5 seconds *must* trigger a database insert with `status = 'draft'`.
*   **AC-3:** If it is after 10:00 PM and the reflection status is `pending` or `draft`, triggering a system shutdown *must* block the shutdown, open the BeatMe window as always-on-top, and show the transition overlay.
*   **AC-4:** If a user clicks "Skip Today" and confirms, the day's record *must* be saved with `status = 'skipped'`, the inhibitor lock released, and the window hidden/exited.
*   **AC-5:** The history list *must* update in real-time when a query is entered in the search bar.
*   **AC-6:** Resetting all data via settings *must* wipe the database tables and reset the stats dashboard to 0.

---

## 8. Constraints

*   **C-1 (Local Platform Integration):** D-Bus inhibitor locks are only supported on Linux distributions utilizing `systemd-logind`. On non-Linux platforms (Windows/macOS), the app relies on standard window close/quit interceptions and local notification reminders.
*   **C-2 (Tauri Architecture):** All filesystem operations, IPC, and autostart registration must utilize secure Tauri plugins (`tauri_plugin_sql`, `tauri_plugin_autostart`, `tauri_plugin_notification`).
*   **C-3 (Zero Server Sync):** No cloud database (e.g., Supabase, Firebase) or external APIs can be introduced to ensure compliance with the local-only data privacy rule.

---

## 9. Performance Goals

*   **PG-1 (Startup Time):** The application window must open and be ready for input within **1.0 second** of launching.
*   **PG-2 (Search Latency):** Text search across 1,000+ entries must return filtered results in less than **50 milliseconds**.
*   **PG-3 (Disk Space/Log Size):** The application log file (`beatme.log`) must be rotated when it exceeds **5 MB** in size, retaining a maximum of **10 historical log files** (`beatme.log.1` through `beatme.log.9`) to prevent infinite storage growth.
*   **PG-4 (CPU/Memory Footprint):** When running idle in the system tray, the background process must consume less than **1% CPU** and under **50 MB of RAM**.
