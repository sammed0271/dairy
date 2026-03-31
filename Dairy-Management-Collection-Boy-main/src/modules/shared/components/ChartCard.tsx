import React from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = "",
}) => {
  return (
    <section
      className={`rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm ${className}`.trim()}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#5E503F]">{title}</h2>
          {subtitle && <p className="text-sm text-[#5E503F]/70">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
};

export default ChartCard;
