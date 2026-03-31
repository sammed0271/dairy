import React from "react";

interface SidebarProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({
  title,
  description,
  children,
  footer,
}) => {
  return (
    <aside className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[#5E503F]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-[#5E503F]/70">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
      {footer && <div className="mt-5 border-t border-[#E9E2C8] pt-4">{footer}</div>}
    </aside>
  );
};

export default Sidebar;
