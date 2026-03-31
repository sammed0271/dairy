import React from "react";
import { ChartCard } from "../../shared/components";

interface ThemeToggleCardProps {
  isDark: boolean;
  onToggle: () => void;
}

const ThemeToggleCard: React.FC<ThemeToggleCardProps> = ({
  isDark,
  onToggle,
}) => {
  return (
    <ChartCard
      title="Appearance"
      subtitle="Keep tablet and desktop screens consistent for operators."
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-[#5E503F]">
            {isDark ? "Dark theme enabled" : "Light theme enabled"}
          </div>
          <p className="mt-1 text-xs text-[#5E503F]/70">
            Theme preference is stored in this browser.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative flex h-7 w-14 items-center rounded-full p-1 transition-colors ${
            isDark ? "bg-[#2A9D8F]" : "bg-gray-300"
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
              isDark ? "translate-x-7" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </ChartCard>
  );
};

export default ThemeToggleCard;
