import React from "react";
import { useSettingsStore } from "../stores/useSettingsStore";

export const Welcome: React.FC = () => {
  const { setHasSeenWelcome } = useSettingsStore();

  const handleStart = () => {
    setHasSeenWelcome(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 select-none max-w-lg mx-auto text-center">
      <div className="flex flex-col gap-8 animate-fade-in">
        {/* Brand visual */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-4.5 h-4.5 rounded-full bg-accent animate-pulse" />
          <span className="font-extrabold text-2xl tracking-widest text-white font-sans">BEATME</span>
        </div>

        {/* Text content */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome.</h1>
          <p className="text-neutral-500 text-sm leading-relaxed max-w-xs mx-auto">
            This app is not here to judge you.
          </p>
          <p className="text-neutral-400 text-sm leading-relaxed">
            It only asks one question every day.
          </p>
          <p className="text-accent text-lg font-bold tracking-wide mt-2">
            Did you beat yourself today?
          </p>
        </div>

        {/* Button */}
        <div className="mt-4">
          <button
            onClick={handleStart}
            className="px-10 py-3 rounded-lg bg-accent hover:bg-accent-dark text-black font-bold text-sm tracking-widest transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="Start using BeatMe application"
          >
            START
          </button>
        </div>
      </div>
    </div>
  );
};
