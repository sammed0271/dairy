import React from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#5E503F]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#5E503F]/70">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
};

export default Header;
