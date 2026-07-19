import React, { useEffect } from "react";
import { Reflection } from "../types";
import { formatHumanDate } from "../utils/date";
import { X, Calendar, FileText, Clock } from "lucide-react";

interface ReflectionViewerProps {
  reflection: Reflection | null;
  onClose: () => void;
}

export const ReflectionViewer: React.FC<ReflectionViewerProps> = ({ reflection, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!reflection) return null;

  const formattedTime = reflection.createdAt 
    ? new Date(reflection.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "";

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewer-title"
    >
      <div className="w-full max-w-2xl bg-black border border-neutral-900 rounded-xl flex flex-col max-h-[85vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-900 p-6">
          <div>
            <h2 id="viewer-title" className="text-xl font-bold text-white tracking-wide">
              Reflection Details
            </h2>
            <div className="flex items-center gap-4 text-xs text-neutral-500 mt-1.5 font-medium">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                <span>{formatHumanDate(reflection.date)}</span>
              </div>
              {formattedTime && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formattedTime}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-950 transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="Close reflection viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable text) */}
        <div className="p-6 overflow-y-auto flex-1 text-neutral-300 text-base leading-relaxed whitespace-pre-wrap select-text">
          {reflection.status === "skipped" ? (
            <div className="text-center text-red-400 font-semibold py-8 italic select-none">
              This day was skipped.
            </div>
          ) : (
            reflection.reflection
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-900 px-6 py-4 flex justify-between items-center text-xs text-neutral-500 font-medium">
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>{reflection.characterCount} characters</span>
          </div>
          <span className="text-[10px] text-neutral-600 uppercase tracking-widest">Read Only</span>
        </div>
      </div>
    </div>
  );
};
