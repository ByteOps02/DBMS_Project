import React from "react";

export interface PageHeaderProps {
  icon: React.ElementType;

  gradient: string;

  title: string;

  description?: string;

  right?: React.ReactNode;

  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  gradient,
  title,
  description,
  right,
  badge,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`p-2.5 bg-gradient-to-br ${gradient} rounded-2xl shrink-0`}
        >
          <Icon className="h-6 w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-sm font-medium text-gray-500 dark:text-slate-400 leading-relaxed tracking-normal">
              {description}
            </p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0 w-full sm:w-auto sm:ml-4">{right}</div>}
    </div>
  );
}
