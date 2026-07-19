import React from "react";
import { HistoryList } from "../components/HistoryList";
import { useReflectionsStore } from "../stores/useReflectionsStore";

export const History: React.FC = () => {
  const { 
    reflections, 
    searchResults, 
    searchQuery, 
    setSearchQuery, 
    search 
  } = useReflectionsStore();

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden bg-black text-white select-none">
      {/* Top Header */}
      <header className="w-full flex justify-between items-center px-10 py-6 border-b border-neutral-950 bg-black">
        <span className="text-neutral-500 text-xs font-bold uppercase tracking-widest">
          History
        </span>
        <span className="text-neutral-500 text-xs font-medium">
          {reflections.length} {reflections.length === 1 ? "reflection" : "reflections"}
        </span>
      </header>

      {/* Main List */}
      <main className="flex-1 overflow-hidden">
        <HistoryList
          reflections={reflections}
          searchResults={searchResults}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchExecute={search}
        />
      </main>
    </div>
  );
};
