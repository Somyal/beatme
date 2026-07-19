import React, { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="w-full max-w-md bg-black border border-neutral-900 rounded-xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-neutral-900 p-6">
          <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-900 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h2 id="confirm-title" className="text-lg font-bold text-white tracking-wide">
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 text-neutral-400 text-sm leading-relaxed">
          {message}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 bg-neutral-950 border-t border-neutral-900 p-4 rounded-b-xl">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white font-medium text-xs tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
