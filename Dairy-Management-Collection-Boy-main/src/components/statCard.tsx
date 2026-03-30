// src/components/statCard.tsx
import React from "react";
import clsx from "clsx";

export type StatVariant =
  | "teal"
  | "blue"
  | "orange"
  | "red"
  | "green"
  | "neutral"
  | "purple";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: React.ReactNode;
  icon?: React.ReactNode;
  variant?: StatVariant;
}

/**
 * Small statistic card for dashboard numbers.
 */
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = "teal",
}) => {
  const variantClass = (() => {
    switch (variant) {
      case "blue":
        return "from-[#457B9D] to-[#365777]";
      case "orange":
        return "from-[#F4A261] to-[#E2924A]";
      case "red":
        return "from-[#E76F51] to-[#D45A3F]";
      case "green":
        return "from-[#52B788] to-[#40916C]";
      case "neutral":
        return "from-[#5E503F] to-[#3F3529]";
      case "teal":
      default:
        return "from-[#2A9D8F] to-[#247B71]";
    }
  })();

  return (
    <div
      className={clsx(
        "flex items-center justify-between rounded-xl bg-gradient-to-r p-4 text-white shadow",
        variantClass,
      )}
    >
      <div>
        <p className="text-xs uppercase tracking-wide opacity-80">{title}</p>
        <p className="mt-1 text-2xl font-bold">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {subtitle && <div className="mt-1 text-[11px] opacity-90">{subtitle}</div>}
      </div>
      {icon && (
        <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
          {icon}
        </div>
      )}
    </div>
  );
};

export default StatCard;
