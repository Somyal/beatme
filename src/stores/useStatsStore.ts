import { create } from "zustand";
import { Reflection, Statistics } from "../types";
import { getLocalDateString } from "../utils/date";

interface StatsState extends Statistics {
  calculateStats: (reflections: Reflection[]) => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  currentStreak: 0,
  longestStreak: 0,
  totalReflections: 0,
  averageReflectionLength: 0,
  daysMissed: 0,

  calculateStats: (reflections: Reflection[]) => {
    const activeReflections = reflections.filter((r) => r.status === "completed");

    if (activeReflections.length === 0) {
      let daysMissed = 0;
      if (reflections.length > 0) {
        const sortedAll = [...reflections].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const oldestStr = sortedAll[0].date;
        const [oYear, oMonth, oDay] = oldestStr.split("-").map(Number);
        const oldestDate = new Date(oYear, oMonth - 1, oDay);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        oldestDate.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(todayDate.getTime() - oldestDate.getTime());
        daysMissed = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }

      set({
        currentStreak: 0,
        longestStreak: 0,
        totalReflections: 0,
        averageReflectionLength: 0,
        daysMissed,
      });
      return;
    }

    const totalReflections = activeReflections.length;

    // Calculate average length
    const totalChars = activeReflections.reduce((sum, r) => sum + r.characterCount, 0);
    const averageReflectionLength = Math.round(totalChars / totalReflections);

    // Sort descending for current streak calculation
    const sortedDesc = [...activeReflections].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const todayStr = getLocalDateString(new Date());
    
    // Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    let currentStreak = 0;
    const hasToday = sortedDesc.some((r) => r.date === todayStr);
    const hasYesterday = sortedDesc.some((r) => r.date === yesterdayStr);

    if (hasToday || hasYesterday) {
      let checkDate = new Date();
      // Start checking from today if today exists, otherwise from yesterday
      if (!hasToday && hasYesterday) {
        checkDate = yesterday;
      }
      
      let consecutive = true;
      while (consecutive) {
        const checkStr = getLocalDateString(checkDate);
        const found = sortedDesc.find((r) => r.date === checkStr);
        if (found) {
          currentStreak++;
          // Move to previous day
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          consecutive = false;
        }
      }
    }

    // Sort ascending for longest streak calculation
    const sortedAsc = [...activeReflections].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (const r of sortedAsc) {
      // Parse dates using local date components to avoid timezone offsets
      const [year, month, day] = r.date.split("-").map(Number);
      const currentDate = new Date(year, month - 1, day);

      if (!lastDate) {
        tempStreak = 1;
      } else {
        const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      lastDate = currentDate;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }

    // Calculate days missed
    // Find the oldest reflection date (including skipped to represent first usage)
    const sortedAllAsc = [...reflections].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const oldestStr = sortedAllAsc[0].date;
    const [oYear, oMonth, oDay] = oldestStr.split("-").map(Number);
    const oldestDate = new Date(oYear, oMonth - 1, oDay);
    
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    oldestDate.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(todayDate.getTime() - oldestDate.getTime());
    const totalDaysSpan = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive of start and end
    
    // Days missed = total days span - total reflections
    const daysMissed = Math.max(0, totalDaysSpan - totalReflections);

    set({
      currentStreak,
      longestStreak,
      totalReflections,
      averageReflectionLength,
      daysMissed,
    });
  },
}));
