import React from 'react';
import { TrendingUp } from 'lucide-react';

export type StatItemProps = {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  status?: string;
  onClick: (status: string) => void;
};

export const StatItem = React.memo(({ name, value, icon: Icon, color, bgColor, status, onClick }: StatItemProps) => {
  return (
    <div
      key={name}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300 ${
        status ? 'cursor-pointer' : ''
      }`}
      onClick={() => status && onClick(status)}
      aria-label={status ? `View ${name.toLowerCase()}` : undefined}
      tabIndex={status ? 0 : undefined}
    >
      <div className="p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} aria-hidden="true" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">{name}</h3>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{value}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-2 bg-gray-50 dark:bg-gray-700 rounded-b-xl border-t border-gray-100 dark:border-gray-600">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <TrendingUp className="h-3 w-3 mr-1" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
});
