import React from "react";
import { StatsCard } from "../components/StatsCard";
import { useStatsStore } from "../stores/useStatsStore";
import { Flame, Trophy, Award, BarChart, CalendarRange } from "lucide-react";

export const Statistics: React.FC = () => {
  const {
    currentStreak,
    longestStreak,
    totalReflections,
    averageReflectionLength,
    daysMissed,
  } = useStatsStore();

  return (
    <div className="flex flex-col flex-1 h-screen overflow-y-auto bg-black text-white select-none">
      {/* Header */}
      <header className="w-full flex justify-between items-center px-10 py-6 border-b border-neutral-950 bg-black">
        <span className="text-neutral-500 text-xs font-bold uppercase tracking-widest">
          Statistics
        </span>
      </header>

      {/* Stats Grid */}
      <main className="max-w-4xl w-full mx-auto px-10 py-12 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatsCard
            label="Current Streak"
            value={`${currentStreak} ${currentStreak === 1 ? "day" : "days"}`}
            icon={<Flame className="w-8 h-8 text-orange-500 fill-orange-500/20" />}
          />
          <StatsCard
            label="Longest Streak"
            value={`${longestStreak} ${longestStreak === 1 ? "day" : "days"}`}
            icon={<Trophy className="w-8 h-8 text-yellow-500" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            label="Total Reflections"
            value={totalReflections}
            icon={<Award className="w-6 h-6 text-emerald-500" />}
          />
          <StatsCard
            label="Avg Length"
            value={`${averageReflectionLength} chars`}
            icon={<BarChart className="w-6 h-6 text-blue-500" />}
          />
          <StatsCard
            label="Days Missed"
            value={daysMissed}
            icon={<CalendarRange className="w-6 h-6 text-red-500" />}
          />
        </div>
      </main>
    </div>
  );
};
