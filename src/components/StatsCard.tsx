import React from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon }) => {
  return (
    <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-6 flex items-center justify-between select-none">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-3xl font-extrabold text-white tracking-tight">{value}</span>
      </div>
      {icon && <div className="text-neutral-700">{icon}</div>}
    </div>
  );
};
