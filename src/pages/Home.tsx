import React from "react";
import { formatHumanDate, getLocalDateString } from "../utils/date";
import { ReflectionEditor } from "../components/ReflectionEditor";
import { Heatmap } from "../components/Heatmap";
import { useReflectionsStore } from "../stores/useReflectionsStore";

interface HomeProps {
  onShowToast: (message: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onShowToast }) => {
  const { reflections } = useReflectionsStore();
  const currentDateStr = formatHumanDate(getLocalDateString(new Date()));

  return (
    <div className="flex flex-col flex-1 h-screen overflow-y-auto bg-black text-white select-none">
      {/* Top Section: Date */}
      <header className="w-full flex justify-between items-center px-10 py-6 border-b border-neutral-950 bg-black">
        <span className="text-neutral-500 text-xs font-bold uppercase tracking-widest">
          Today
        </span>
        <span className="text-neutral-400 text-xs font-semibold tracking-wide">
          {currentDateStr}
        </span>
      </header>

      {/* Main content: Reflection Editor */}
      <main className="flex-1 flex flex-col justify-center py-8">
        <ReflectionEditor onShowToast={onShowToast} />
      </main>

      {/* Bottom Section: Heatmap */}
      <footer className="w-full mt-auto border-t border-neutral-950 p-4">
        <div className="max-w-4xl mx-auto">
          <Heatmap reflections={reflections} />
        </div>
      </footer>
    </div>
  );
};
