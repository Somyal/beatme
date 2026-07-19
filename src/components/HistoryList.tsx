import React, { useEffect, useRef } from "react";
import { Reflection } from "../types";
import { formatHumanDate } from "../utils/date";
import { useUiStore } from "../stores/useUiStore";
import { Search, Calendar, FileText } from "lucide-react";

interface HistoryListProps {
  reflections: Reflection[];
  searchResults: Reflection[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchExecute: (query: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  reflections,
  searchResults,
  searchQuery,
  onSearchChange,
  onSearchExecute,
}) => {
  const { setActiveViewReflection } = useUiStore();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Trigger search on input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSearchChange(val);
    onSearchExecute(val);
  };

  // Keyboard shortcut Ctrl+F to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const itemsToDisplay = searchQuery.trim() ? searchResults : reflections;

  // Helper to escape regex chars
  const escapeRegExp = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  // Helper to highlight search query in reflection text
  const renderHighlightedText = (text: string, search: string) => {
    const query = search.trim();
    if (!query) return text;
    
    try {
      const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
      const parts = text.split(regex);
      return (
        <>
          {parts.map((part, index) =>
            regex.test(part) ? (
              <mark key={index} className="bg-accent/40 text-accent-light px-0.5 rounded-sm">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </>
      );
    } catch (e) {
      return text;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto px-6 py-8 h-full bg-black select-none">
      {/* Search Input Container */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-600">
          <Search className="w-5 h-5" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={handleChange}
          placeholder="Search by date (YYYY-MM-DD) or text... (Ctrl+F)"
          className="w-full bg-neutral-950 border border-neutral-900 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder-neutral-600 transition-colors focus:border-accent focus:ring-1 focus:ring-accent outline-none"
          aria-label="Search Reflections"
        />
      </div>

      {/* Reflections list */}
      <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1" role="list">
        {itemsToDisplay.length > 0 ? (
          itemsToDisplay.map((r) => {
            const isSkipped = r.status === "skipped";
            return (
              <button
                key={r.date}
                onClick={() => setActiveViewReflection(r)}
                className={`w-full bg-neutral-950 border rounded-xl p-6 transition-colors text-left flex flex-col gap-3 group focus:outline-none focus:border-accent ${
                  isSkipped ? "border-red-950/40 hover:border-red-900/50" : "border-neutral-900 hover:border-neutral-800"
                }`}
                role="listitem"
                aria-label={`Open reflection for ${r.date}`}
              >
                <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                  <div className="flex items-center gap-1.5 text-neutral-400 group-hover:text-accent transition-colors">
                    <Calendar className="w-4 h-4" />
                    <span>{formatHumanDate(r.date)}</span>
                  </div>
                  {isSkipped ? (
                    <span className="text-red-400 font-semibold uppercase tracking-wider text-[10px]">Skipped</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{r.characterCount} characters</span>
                    </div>
                  )}
                </div>
                <p className={`text-sm leading-relaxed ${isSkipped ? "text-red-400/60 italic" : "text-neutral-300 line-clamp-3"}`}>
                  {isSkipped ? "This day's reflection was skipped." : renderHighlightedText(r.reflection, searchQuery)}
                </p>
              </button>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center select-none">
            <p className="text-neutral-600 text-sm">
              {searchQuery.trim() ? "No matching reflections found." : "No reflections written yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
