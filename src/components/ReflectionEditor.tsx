import React, { useState, useEffect, useRef } from "react";
import { useReflectionsStore } from "../stores/useReflectionsStore";
import { ask } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

interface ReflectionEditorProps {
  onShowToast: (message: string) => void;
}

export const ReflectionEditor: React.FC<ReflectionEditorProps> = ({ onShowToast }) => {
  const { 
    todayReflection, 
    todayDraft, 
    isAfter10, 
    historicalDraft,
    saveReflection, 
    saveDraft, 
    skipToday,
    restoreHistoricalDraft,
    discardHistoricalDraft
  } = useReflectionsStore();

  const [reflectionText, setReflectionText] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shutdownIntercepted, setShutdownIntercepted] = useState(false);
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on load / when not saved
  useEffect(() => {
    if (textareaRef.current && !isSaved && !showTransitionOverlay) {
      textareaRef.current.focus();
    }
  }, [todayReflection, isSaved, showTransitionOverlay]);

  // Listen to shutdown-intercepted event from backend
  useEffect(() => {
    let unlisten: () => void;
    const setupListener = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        const unsubscribe = await listen("shutdown-intercepted", () => {
          setShutdownIntercepted(true);
          setShowTransitionOverlay(true);
          // Wait 2.5 seconds before hiding the transition overlay and revealing the editor
          setTimeout(() => {
            setShowTransitionOverlay(false);
          }, 2500);
        });
        unlisten = unsubscribe;
      } catch (err) {
        console.error("Failed to setup event listener:", err);
      }
    };
    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Initialize text if today's reflection exists, otherwise load draft
  useEffect(() => {
    if (todayReflection) {
      if (todayReflection.status === "skipped") {
        setReflectionText("");
      } else {
        setReflectionText(todayReflection.reflection);
      }
      setIsSaved(true);
    } else {
      setReflectionText(todayDraft || "");
      setIsSaved(false);
    }
  }, [todayReflection, todayDraft]);

  // Auto expand textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(250, textareaRef.current.scrollHeight)}px`;
    }
  }, [reflectionText]);

  // Autosave draft only if no keyboard input for 5 seconds (5s debounce)
  useEffect(() => {
    if (isSaved || isSaving) return;
    const trimmed = reflectionText.trim();
    if (!trimmed || trimmed === todayDraft) return;

    // Never autosave while user is actively typing (the timer resets on input)
    const timer = setTimeout(() => {
      saveDraft(reflectionText);
    }, 5000);

    return () => clearTimeout(timer);
  }, [reflectionText, isSaved, isSaving, todayDraft]);

  const handleSave = async () => {
    const trimmed = reflectionText.trim();
    if (!trimmed) {
      onShowToast("Reflection cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      await saveReflection(trimmed);
      setIsSaved(true);
      
      // Hide window to tray if NOT in a shutdown flow (if in shutdown flow, the app exits from backend after 1s)
      try {
        const intercepted = await invoke<boolean>("check_shutdown_intercepted");
        if (!intercepted) {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          await getCurrentWindow().hide();
        }
      } catch (err) {
        console.error("Failed to hide window:", err);
      }
    } catch (e: any) {
      onShowToast(e.message || "Failed to save reflection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    try {
      const confirm = await ask(
        "Are you sure you want to skip today? This will break your consistency streak.",
        { title: "Confirm Skip", kind: "warning" }
      );
      if (confirm) {
        setIsSaving(true);
        await skipToday();
        setIsSaved(true);

        // Hide window to tray if NOT in a shutdown flow
        try {
          const intercepted = await invoke<boolean>("check_shutdown_intercepted");
          if (!intercepted) {
            const { getCurrentWindow } = await import("@tauri-apps/api/window");
            await getCurrentWindow().hide();
          }
        } catch (err) {
          console.error("Failed to hide window:", err);
        }
      }
    } catch (e: any) {
      onShowToast(e.message || "Failed to skip reflection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDraft = async () => {
    try {
      await restoreHistoricalDraft();
      onShowToast("Draft restored.");
    } catch (e: any) {
      onShowToast(e.message || "Failed to restore draft.");
    }
  };

  const handleDiscardDraft = async () => {
    try {
      const confirm = await ask(
        "Are you sure you want to discard this previous draft? This action cannot be undone.",
        { title: "Confirm Discard", kind: "warning" }
      );
      if (confirm) {
        await discardHistoricalDraft();
        onShowToast("Draft discarded.");
      }
    } catch (e: any) {
      onShowToast(e.message || "Failed to discard draft.");
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!isSaved && !isSaving) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reflectionText, isSaved, isSaving]);

  // Determine if skip is required
  const showSkipButton = isAfter10 || shutdownIntercepted;
  const isSkipped = todayReflection?.status === "skipped";

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4 py-8 select-none">
      {/* Elegant Fade-In Transition Overlay on Intercepted Shutdown */}
      {showTransitionOverlay && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-all duration-1000">
          <div className="text-center flex flex-col items-center gap-6 animate-pulse">
            <span className="text-6xl" role="img" aria-label="moon">🌙</span>
            <h2 className="text-2xl font-bold text-neutral-400 tracking-wider">Before you end today...</h2>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-wide">Did you beat yourself today?</h1>
          </div>
        </div>
      )}

      {/* Crash Recovery Dialog */}
      {historicalDraft && !isSaved && (
        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-white text-lg">Unsaved draft detected</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              BeatMe didn't close properly on <span className="text-accent font-semibold">{historicalDraft.date}</span>. Would you like to restore your draft?
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto justify-end">
            <button
              onClick={handleRestoreDraft}
              className="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-dark text-black font-semibold text-sm transition-colors cursor-pointer"
            >
              Restore
            </button>
            <button
              onClick={handleDiscardDraft}
              className="px-5 py-2.5 rounded-lg border border-neutral-800 hover:bg-neutral-950 text-neutral-400 font-semibold text-sm transition-colors cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-8 text-center">
        Did you beat yourself today?
      </h1>

      <div className="w-full flex flex-col gap-4">
        <textarea
          ref={textareaRef}
          value={isSkipped ? "" : reflectionText}
          onChange={(e) => setReflectionText(e.target.value)}
          disabled={isSaved || isSaving}
          placeholder={
            isSaved 
              ? "" 
              : "Write honestly.\n\nWhat went well?\n\nWhat didn't?\n\nWhat can tomorrow's you do better?"
          }
          className={`w-full min-h-[250px] bg-black border border-neutral-800 rounded-xl p-6 text-white text-base leading-relaxed resize-none focus:border-accent focus:ring-1 focus:ring-accent outline-none placeholder-neutral-600 transition-colors duration-150 ${
            isSaved ? "opacity-60 cursor-not-allowed select-none" : ""
          }`}
          aria-label="Reflection Text Area"
        />

        <div className="flex flex-col items-center mt-2 w-full">
          {isSaved ? (
            <div className="text-center py-4 flex flex-col gap-1">
              <p className="text-accent font-semibold text-lg animate-pulse tracking-wide">
                {isSkipped ? "Skipped." : "Saved."}
              </p>
              <p className="text-neutral-500 text-sm">See you tomorrow.</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-3 w-full justify-center">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full md:w-auto px-8 py-3 rounded-lg bg-accent hover:bg-accent-dark text-black font-semibold text-sm tracking-wide transition-colors duration-150 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label="Save reflection button"
              >
                {isSaving ? "Saving..." : "Save Reflection"}
              </button>

              {showSkipButton && (
                <button
                  onClick={handleSkip}
                  disabled={isSaving}
                  className="w-full md:w-auto px-8 py-3 rounded-lg border border-red-500/30 hover:border-red-500/60 bg-red-950/20 hover:bg-red-950/40 text-red-400 font-semibold text-sm tracking-wide transition-colors duration-150 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                  aria-label="Skip reflection button"
                >
                  Skip Today
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
