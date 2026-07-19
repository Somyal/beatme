export interface Reflection {
  date: string; // YYYY-MM-DD local format
  reflection: string;
  status: "completed" | "skipped" | "draft";
  characterCount: number;
  startedWritingAt?: string;
  completedAt?: string;
  createdAt: string; // ISO timestamp
  updatedAt?: string;
}

export interface Statistics {
  currentStreak: number;
  longestStreak: number;
  totalReflections: number;
  averageReflectionLength: number;
  daysMissed: number;
}
