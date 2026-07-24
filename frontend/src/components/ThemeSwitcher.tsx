import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";


export const ThemeSwitcher = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2 rounded-[14px] border backdrop-blur-md overflow-hidden transition-all duration-500 group focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isDarkMode
          ? "bg-slate-800/60 border-slate-700/50 hover:bg-slate-700/80 hover:shadow-[0_0_15px_rgba(129,140,248,0.2)] focus:ring-indigo-500 focus:ring-offset-slate-900"
          : "bg-white/80 border-gray-200/80 hover:bg-white hover:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.1)] focus:ring-amber-500 focus:ring-offset-white"
      }`}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {/* Subtle background glow effect on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${
        isDarkMode ? 'bg-indigo-500' : 'bg-amber-300'
      } blur-xl`} />

      <div className="relative z-10 h-4 w-4 flex items-center justify-center">
        {/* Sun Icon */}
        <div className={`absolute transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isDarkMode 
            ? 'opacity-0 -rotate-90 scale-50' 
            : 'opacity-100 rotate-0 scale-100 text-amber-500'
        }`}>
          <Sun className="h-4 w-4 drop-shadow-sm" strokeWidth={2.5} />
        </div>
        
        {/* Moon Icon */}
        <div className={`absolute transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isDarkMode 
            ? 'opacity-100 rotate-0 scale-100 text-indigo-400' 
            : 'opacity-0 rotate-90 scale-50 text-indigo-400'
        }`}>
          <Moon className="h-4 w-4 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" strokeWidth={2.5} fill="currentColor" />
        </div>
      </div>
    </button>
  );
};
