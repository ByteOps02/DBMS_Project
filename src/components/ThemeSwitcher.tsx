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
      className={`relative p-2.5 rounded-2xl border shadow-sm ${isDarkMode
          ? "bg-slate-900 border-slate-800 text-yellow-400"
          : "bg-white border-gray-100 text-slate-700"
        }`}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <div className="relative z-10 h-5 w-5 flex items-center justify-center">
        {isDarkMode ? (
          <Moon className="h-5 w-5" strokeWidth={2.5} fill="currentColor" />
        ) : (
          <Sun className="h-5 w-5" strokeWidth={2.5} />
        )}
      </div>
    </button>
  );
};
