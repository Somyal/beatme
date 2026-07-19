import React from "react";
import { useUiStore, Page } from "../stores/useUiStore";
import { BookOpen, BarChart3, Settings, PenTool } from "lucide-react";

export const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, setSettingsOpen } = useUiStore();

  const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    {
      page: "home",
      label: "Reflect",
      icon: <PenTool className="w-5 h-5" />
    },
    {
      page: "history",
      label: "History",
      icon: <BookOpen className="w-5 h-5" />
    },
    {
      page: "statistics",
      label: "Stats",
      icon: <BarChart3 className="w-5 h-5" />
    }
  ];

  return (
    <aside 
      className="w-64 border-r border-neutral-900 flex flex-col justify-between bg-black text-neutral-400 select-none h-screen"
      aria-label="App Navigation"
    >
      <div className="flex flex-col gap-8 p-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent"></div>
          <span className="font-bold text-lg text-white tracking-wider font-sans">BeatMe</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => setCurrentPage(item.page)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium tracking-wide transition-colors duration-150 text-left ${
                  isActive
                    ? "bg-neutral-900 text-accent font-semibold"
                    : "hover:bg-neutral-950 hover:text-white"
                }`}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Navigate to ${item.label}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings at the bottom */}
      <div className="p-6">
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-colors duration-150 hover:bg-neutral-950 hover:text-white"
          aria-label="Open Settings"
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
