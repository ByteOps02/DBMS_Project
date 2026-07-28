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
            ? "border-sky-500 ring-2 ring-sky-500/50"
            : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
        } rounded-2xl text-gray-900 dark:text-white transition-all duration-300 focus:outline-none px-3 py-2 ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        } ${className}`}
      >
        <div className="flex items-center overflow-hidden flex-1">
          {icon && <div className="mr-3 text-gray-400 flex-shrink-0">{icon}</div>}
          <span className={`truncate ${!selectedOption ? "text-gray-400" : ""}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 flex-shrink-0 ml-2 ${
            isOpen ? "rotate-180 text-sky-500" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-lg border border-gray-200 dark:border-slate-700 animate-fadeIn">
          <ul className="max-h-60 overflow-y-auto scrollbar-hide py-1">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-1.5 mx-1 my-0.5 rounded-md cursor-pointer transition-colors duration-150 text-sm ${
                    isSelected
                      ? "bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-medium"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 ml-2 flex-shrink-0 text-sky-500" />}
                </li>
              );
            })}
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500 text-center">No options available</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
