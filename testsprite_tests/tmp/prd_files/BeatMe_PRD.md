# BeatMe --- Product Requirements Document (PRD)

## 1. Overview

**BeatMe** is a privacy-first, offline desktop application built with
**Tauri v2**, **React**, **TypeScript**, and **SQLite**.

Its purpose is to help users end each day with intentional
self-reflection. After **10:00 PM**, if the user attempts to shut down,
restart, or log out without completing today's reflection, BeatMe
temporarily delays the shutdown using Linux's **systemd logind
inhibitor** until the user either completes or explicitly skips the
reflection.

The application is designed for personal use, runs entirely offline, and
never transmits user data.

------------------------------------------------------------------------

# 2. Goals

-   Build a daily reflection habit.
-   Encourage consistency through streaks and visual progress.
-   Protect user privacy by storing everything locally.
-   Minimize distractions and background resource usage.
-   Integrate naturally with the operating system.

------------------------------------------------------------------------

# 3. Core Features

## Daily Reflection

-   One reflection per calendar day.
-   Reflection stored locally in SQLite.
-   Autosave draft after 5 seconds of inactivity.
-   Restore unfinished drafts automatically.

## Daily Checkout

After 10 PM:

If the user attempts to: - Shutdown - Restart - Logout

BeatMe should: 1. Check today's reflection status. 2. If completed or
skipped, allow shutdown. 3. If missing, acquire a shutdown inhibitor. 4.
Show the reflection window. 5. Release the inhibitor after Save or Skip.

## History

-   Browse previous reflections.
-   Search reflections.
-   Sort chronologically.

## Heatmap

GitHub-style yearly contribution heatmap showing completed reflection
days.

## Statistics

Display: - Current streak - Longest streak - Total reflections - Total
words - Average reflection length

## Skip Today

-   Confirmation required.
-   Breaks streak.
-   Stored as status = skipped.

------------------------------------------------------------------------

# 4. Non-Functional Requirements

-   Offline only.
-   No telemetry.
-   No analytics.
-   No cloud sync.
-   No external APIs.
-   SQLite database with WAL mode.
-   Startup under 1 second.
-   Idle CPU approximately 0%.
-   Low memory usage.
-   Single running instance.

------------------------------------------------------------------------

# 5. User Stories

-   As a user, I want to write one reflection each day.
-   As a user, I want unfinished drafts restored.
-   As a user, I want my history searchable.
-   As a user, I want visual progress through a heatmap.
-   As a user, I want shutdown delayed after 10 PM if today's reflection
    is missing.
-   As a user, I want to skip a day intentionally when necessary.

------------------------------------------------------------------------

# 6. Acceptance Criteria

Reflection: - Save successfully. - Restore drafts. - One completed
reflection per day.

Shutdown: - Before 10 PM: never interfere. - After 10 PM with completed
reflection: shutdown proceeds. - After 10 PM with pending reflection:
shutdown delayed until Save or Skip.

Heatmap: - Updates immediately after completion.

Statistics: - Update automatically.

------------------------------------------------------------------------

# 7. Security & Privacy

-   All data remains local.
-   No internet connectivity required.
-   No tracking.
-   User owns all reflection data.

------------------------------------------------------------------------

# 8. Technology Stack

-   Tauri v2
-   Rust
-   React
-   TypeScript
-   SQLite
-   Zustand
-   Tailwind CSS
-   systemd logind D-Bus inhibitors (Linux)

------------------------------------------------------------------------

# 9. Future Enhancements

-   Tags
-   Mood tracking
-   Export/Import
-   Calendar view
-   Reflection insights
-   Cross-platform shutdown integration

------------------------------------------------------------------------

# 10. Success Criteria

The application should reliably: - Encourage daily reflection. - Operate
unobtrusively. - Remain lightweight. - Preserve user privacy. -
Integrate naturally with desktop shutdown behavior.
