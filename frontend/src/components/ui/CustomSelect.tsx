import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
};

interface CustomSelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string; // Additional classes for the trigger
}

export function CustomSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  required = false,
  disabled = false,
  icon,
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Hidden native select for native form submission if needed */}
      <select
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="hidden"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full text-left bg-white dark:bg-slate-900 border ${
          isOpen
            ? "border-sky-500 ring-2 ring-sky-500/20"
            : "border-gray-200 dark:border-slate-700/80 hover:border-gray-300 dark:hover:border-slate-600"
        } rounded-2xl text-gray-900 dark:text-white transition-all duration-200 focus:outline-none px-4 py-3 text-sm font-medium ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        } ${className}`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center overflow-hidden flex-1 mr-2">
          {icon && <div className="mr-2.5 text-gray-400 shrink-0">{icon}</div>}
          <span className={`truncate ${!selectedOption ? "text-gray-400 dark:text-slate-500 font-normal" : "font-medium"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-sky-500" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[100] left-0 right-0 w-full min-w-[200px] mt-2 rounded-2xl overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border border-gray-200/90 dark:border-slate-700/80 p-1.5 ring-1 ring-black/5 dark:ring-white/5 transition-all">
          <ul className="max-h-56 overflow-y-auto scrollbar-hide space-y-1">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 text-sm font-medium select-none ${
                    isSelected
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold"
                      : "text-gray-700 dark:text-slate-200 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 ml-2 shrink-0 text-sky-500 dark:text-sky-400" />
                  )}
                </li>
              );
            })}
            {options.length === 0 && (
              <li className="px-3.5 py-2.5 text-xs text-gray-500 text-center">
                No options available
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
