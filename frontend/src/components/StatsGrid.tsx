import React from "react";
import { StatItem, StatItemProps } from "./StatItem";

type StatsGridProps = {
  stats: Omit<StatItemProps, "onClick" | "onMouseEnter">[];
  handleStatCardClick: (status: string) => void;
  handlePrefetch: (status: string) => void;
};

export const StatsGrid: React.FC<StatsGridProps> = ({
  stats,
  handleStatCardClick,
  handlePrefetch,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
      {stats.map((stat, index) => (
        <StatItem
          key={stat.name}
          {...stat}
          onClick={handleStatCardClick}
          onMouseEnter={handlePrefetch}
          style={{ animationDelay: `${index * 0.05}s` }}
        />
      ))}
    </div>
  );
};

