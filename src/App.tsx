import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Home } from "./pages/Home";
import { History } from "./pages/History";
import { Statistics } from "./pages/Statistics";
import { Welcome } from "./pages/Welcome";
import { SettingsModal } from "./components/SettingsModal";
import { ReflectionViewer } from "./components/ReflectionViewer";
import { useUiStore } from "./stores/useUiStore";
import { useSettingsStore } from "./stores/useSettingsStore";
import { useReflectionsStore } from "./stores/useReflectionsStore";
import { NotificationService } from "./services/NotificationService";

function App() {
  const { currentPage, settingsOpen, setSettingsOpen, activeViewReflection, setActiveViewReflection } = useUiStore();
  const { hasSeenWelcome, loadSettings } = useSettingsStore();
  const { loadReflections } = useReflectionsStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize Settings, Reflections and schedule reminders
  useEffect(() => {
    const initialize = async () => {
      await loadSettings();
      await loadReflections();
      NotificationService.scheduleDailyReminder();
    };
    initialize();
  }, []);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Keyboard shortcut Escape to close active modal dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeViewReflection) {
          setActiveViewReflection(null);
        } else if (settingsOpen) {
          setSettingsOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeViewReflection, settingsOpen]);

  if (!hasSeenWelcome) {
    return <Welcome />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "history":
        return <History />;
      case "statistics":
        return <Statistics />;
      case "home":
      default:
        return <Home onShowToast={triggerToast} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white font-sans antialiased">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main page content area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-black relative">
        {renderPage()}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onShowToast={triggerToast}
      />

      {/* Read Only Reflection Viewer Modal */}
      <ReflectionViewer
        reflection={activeViewReflection}
        onClose={() => setActiveViewReflection(null)}
      />

      {/* Toast Notification HUD */}
      {toastMessage && (
        <div 
          className="fixed bottom-6 right-6 z-[1000] bg-neutral-900 border border-neutral-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-2xl transition-all duration-150 animate-fade-in flex items-center justify-center font-sans tracking-wide"
          role="alert"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
