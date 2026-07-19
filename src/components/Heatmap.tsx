import React, { useMemo } from "react";
import { Reflection } from "../types";
import { getLast365Days, formatHumanDate } from "../utils/date";
import { useUiStore } from "../stores/useUiStore";

interface HeatmapProps {
  reflections: Reflection[];
}

export const Heatmap: React.FC<HeatmapProps> = ({ reflections }) => {
  const { setActiveViewReflection } = useUiStore();

  // Map reflections for quick lookup
  const reflectionsMap = useMemo(() => {
    const map = new Map<string, Reflection>();
    reflections.forEach((r) => {
      map.set(r.date, r);
    });
    return map;
  }, [reflections]);

  // Generate the last 365 days
  const allDays = useMemo(() => getLast365Days(), []);

  // Format into columns (weeks) for display
  // GitHub heatmap lists days vertically (Sunday to Saturday) and weeks horizontally
  const grid = useMemo(() => {
    const columns: string[][] = [];
    let currentWeek: string[] = [];

    // To align the weeks correctly:
    // First, find the day of the week of the very first day in our list
    const firstDateStr = allDays[0];
    const [year, month, day] = firstDateStr.split("-").map(Number);
    const firstDate = new Date(year, month - 1, day);
    const startDayOfWeek = firstDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Pad the first week with empty entries so it aligns with Sunday
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push("");
    }

    // Distribute all days into weeks
    allDays.forEach((dateStr) => {
      currentWeek.push(dateStr);
      if (currentWeek.length === 7) {
        columns.push(currentWeek);
        currentWeek = [];
      }
    });

    // Pad the last week if it is incomplete
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push("");
      }
      columns.push(currentWeek);
    }

    return columns;
  }, [allDays]);

  const getDayInfo = (dateStr: string) => {
    if (!dateStr) return { level: 0, reflection: null };
    const reflection = reflectionsMap.get(dateStr);
    if (!reflection) return { level: 0, reflection: null };
    if (reflection.status === "skipped") return { level: -1, reflection };
    if (reflection.status !== "completed") return { level: 0, reflection: null };
    
    // Level 1: Standard written. Level 2: Long reflection (> 500 chars)
    const level = reflection.characterCount > 500 ? 2 : 1;
    return { level, reflection };
  };

  const getCellColor = (level: number) => {
    switch (level) {
      case 2:
        return "bg-accent"; // Bright green (#22c55e)
      case 1:
        return "bg-emerald-800 hover:bg-emerald-700"; // Medium green
      case -1:
        return "bg-red-950/60 hover:bg-red-900 border-red-900/30"; // Red for skipped
      case 0:
      default:
        return "bg-neutral-900 hover:bg-neutral-800"; // Dark gray
    }
  };

  const dayLabels = ["Sun", "", "Tue", "", "Thu", "", "Sat"];

  return (
    <div className="w-full flex flex-col gap-3 p-6 bg-black border border-neutral-950 rounded-xl select-none">
      <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
        <span className="font-semibold uppercase tracking-wider text-[10px]">365-Day Consistency Heatmap</span>
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-neutral-900 border border-neutral-950" title="No entry"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-800" title="Short Reflection"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-accent" title="Long Reflection (>500 chars)"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-red-950/60 border border-red-900/30" title="Skipped"></div>
          <span className="text-[10px] text-neutral-600 font-semibold mr-1">(Red = Skipped)</span>
          <span>More</span>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-2 scrollbar-thin">
        {/* Day labels column */}
        <div className="grid grid-rows-7 gap-1 pr-3 text-[10px] text-neutral-600 font-semibold select-none sticky left-0 bg-black z-10">
          {dayLabels.map((label, idx) => (
            <div key={idx} className="h-2.5 flex items-center justify-end leading-none">
              {label}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex gap-1.5 min-w-[720px]">
          {grid.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-rows-7 gap-1">
              {week.map((dateStr, dIdx) => {
                if (!dateStr) {
                  return <div key={dIdx} className="w-2.5 h-2.5 bg-transparent" />;
                }

                const { level, reflection } = getDayInfo(dateStr);
                const colorClass = getCellColor(level);
                
                return (
                  <button
                    key={dIdx}
                    onClick={() => reflection && setActiveViewReflection(reflection)}
                    disabled={!reflection}
                    className={`w-2.5 h-2.5 rounded-sm border border-black/30 transition-all duration-100 relative group cursor-default focus:outline-none ${colorClass} ${
                      reflection ? "cursor-pointer active:scale-95" : ""
                    }`}
                    aria-label={`Reflection for ${dateStr}: ${
                      level === 2 ? "Long reflection" : level === 1 ? "Written" : level === -1 ? "Skipped" : "No entry"
                    }`}
                  >
                    {/* Tooltip */}
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 font-sans tracking-wide">
                      {formatHumanDate(dateStr)}
                      {reflection && reflection.status === "skipped" && " • Skipped"}
                      {reflection && reflection.status === "completed" && ` • ${reflection.characterCount} chars`}
                      {!reflection && " • No entry"}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
