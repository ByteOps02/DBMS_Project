import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  badgeOnly?: boolean;
}

export const LogoBadge = React.memo(({ className = "w-6 h-6" }: { className?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="compShieldGrad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="compInnerGrad" x1="12" y1="10" x2="36" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
    </defs>

    <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#compShieldGrad)" />
    <rect x="3.5" y="3.5" width="41" height="41" rx="10.5" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1" />

    <path
      d="M24 9L12 14.5V23C12 30.5 17.1 37.4 24 39C30.9 37.4 36 30.5 36 23V14.5L24 9Z"
      fill="url(#compInnerGrad)"
      stroke="#ffffff"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />

    <path
      d="M19 23.5L22.5 27L29 19.5"
      stroke="#ffffff"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <path
      d="M17 31.5C19 33.2 21.4 34.2 24 34.5C26.6 34.2 29 33.2 31 31.5"
      stroke="#ffffff"
      strokeOpacity="0.6"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
));

LogoBadge.displayName = "LogoBadge";

export const Logo = React.memo(({
  size = "md",
  showText = true,
  className = "",
  badgeOnly = false,
}: LogoProps) => {
  const sizeMap = {
    sm: { badge: "w-7 h-7", icon: "w-4 h-4", text: "text-base" },
    md: { badge: "w-9 h-9", icon: "w-5 h-5", text: "text-lg" },
    lg: { badge: "w-11 h-11", icon: "w-6 h-6", text: "text-xl" },
    xl: { badge: "w-14 h-14", icon: "w-8 h-8", text: "text-2xl" },
  };

  const currentSize = sizeMap[size];

  if (badgeOnly) {
    return (
      <div className={`p-1.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-md shadow-sky-500/25 flex items-center justify-center shrink-0 ${currentSize.badge} ${className}`}>
        <LogoBadge className={currentSize.icon} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`p-1.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-md shadow-sky-500/25 flex items-center justify-center shrink-0 ${currentSize.badge}`}>
        <LogoBadge className={currentSize.icon} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tight bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent leading-none ${currentSize.text}`}>
            IIIT Nagpur VMS
          </span>
        </div>
      )}
    </div>
  );
});

Logo.displayName = "Logo";
