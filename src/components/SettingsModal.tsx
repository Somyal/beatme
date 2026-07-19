import React, { useState, useEffect } from "react";
import { useSettingsStore } from "../stores/useSettingsStore";
import { useReflectionsStore } from "../stores/useReflectionsStore";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { X, Database, Upload, Download, Trash2 } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { autoLaunchEnabled, toggleAutoLaunch } = useSettingsStore();
  const { 
    exportSqlite, 
    importSqlite, 
    exportJson, 
    importJson, 
    resetAllData 
  } = useReflectionsStore();

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmImportSqliteOpen, setConfirmImportSqliteOpen] = useState(false);
  const [confirmImportJsonOpen, setConfirmImportJsonOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExportSqlite = async () => {
    try {
      const path = await exportSqlite();
      if (path) {
        onShowToast(`SQLite exported to: ${path}`);
      }
    } catch (e: any) {
      onShowToast(e.message || "Failed to export SQLite database.");
    }
  };

  const handleExportJson = async () => {
    try {
      await exportJson();
      onShowToast("JSON backup downloaded.");
    } catch (e: any) {
      onShowToast(e.message || "Failed to export JSON.");
    }
  };

  const handleImportSqlite = async () => {
    setConfirmImportSqliteOpen(false);
    try {
      const success = await importSqlite();
      if (success) {
        onShowToast("SQLite database imported successfully.");
        onClose();
      }
    } catch (e: any) {
      onShowToast(e.message || "Failed to import SQLite database.");
    }
  };

  const handleImportJson = async () => {
    setConfirmImportJsonOpen(false);
    try {
      const success = await importJson();
      if (success) {
        onShowToast("JSON reflections imported successfully.");
        onClose();
      }
    } catch (e: any) {
      onShowToast(e.message || "Failed to import JSON reflections.");
    }
  };

  const handleReset = async () => {
    setConfirmResetOpen(false);
    try {
      await resetAllData();
      onShowToast("All reflection data has been reset.");
      onClose();
    } catch (e: any) {
      onShowToast("Failed to reset database.");
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="w-full max-w-md bg-black border border-neutral-900 rounded-xl flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-900 p-6">
            <h2 id="settings-title" className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <Database className="w-5 h-5 text-accent" />
              Settings
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-950 transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex flex-col gap-6 overflow-y-auto">
            {/* Startup launch */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-white tracking-wide">Launch on startup</span>
                <span className="text-xs text-neutral-500">Start BeatMe when system starts</span>
              </div>
              <button
                onClick={toggleAutoLaunch}
                className={`w-11 h-6 rounded-full transition-colors relative duration-200 focus:outline-none focus:ring-1 focus:ring-accent ${
                  autoLaunchEnabled ? "bg-accent" : "bg-neutral-800"
                }`}
                aria-label="Toggle Launch on Startup"
                role="switch"
                aria-checked={autoLaunchEnabled}
              >
                <span 
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-black transition-transform duration-200 ${
                    autoLaunchEnabled ? "translate-x-5" : "translate-x-0"
                  }`} 
                />
              </button>
            </div>

            <hr className="border-neutral-900" />

            {/* Export options */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Export Database</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExportSqlite}
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-neutral-950 border border-neutral-900 hover:border-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <Download className="w-4 h-4 text-neutral-400" />
                  SQLite File
                </button>
                <button
                  onClick={handleExportJson}
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-neutral-950 border border-neutral-900 hover:border-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <Download className="w-4 h-4 text-neutral-400" />
                  JSON Backup
                </button>
              </div>
            </div>

            {/* Import options */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Import Database</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmImportSqliteOpen(true)}
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-neutral-950 border border-neutral-900 hover:border-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <Upload className="w-4 h-4 text-neutral-400" />
                  SQLite File
                </button>
                <button
                  onClick={() => setConfirmImportJsonOpen(true)}
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-neutral-950 border border-neutral-900 hover:border-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <Upload className="w-4 h-4 text-neutral-400" />
                  JSON Backup
                </button>
              </div>
            </div>

            <hr className="border-neutral-900" />

            {/* Destructive reset */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Danger Zone</span>
              <button
                onClick={() => setConfirmResetOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-red-950 bg-red-950/20 hover:bg-red-950 hover:border-red-900 text-red-400 hover:text-white rounded-lg text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <Trash2 className="w-4 h-4" />
                Reset All Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationDialog
        isOpen={confirmResetOpen}
        title="Reset All Data?"
        message="Are you absolutely sure you want to delete all reflection history? This action is permanent and cannot be undone."
        confirmLabel="Yes, delete everything"
        onConfirm={handleReset}
        onCancel={() => setConfirmResetOpen(false)}
      />

      <ConfirmationDialog
        isOpen={confirmImportSqliteOpen}
        title="Overwrite with SQLite?"
        message="Importing an SQLite database will completely overwrite your current reflection history. Make sure you have exported your current data first."
        confirmLabel="Yes, overwrite database"
        onConfirm={handleImportSqlite}
        onCancel={() => setConfirmImportSqliteOpen(false)}
      />

      <ConfirmationDialog
        isOpen={confirmImportJsonOpen}
        title="Merge reflections from JSON?"
        message="Importing from a JSON file will merge reflections. If a reflection already exists on a date, it will be updated."
        confirmLabel="Yes, merge reflections"
        onConfirm={handleImportJson}
        onCancel={() => setConfirmImportJsonOpen(false)}
      />
    </>
  );
};
