// src/layout/Sidebar.tsx
import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

// type Props = {
//   isOpen: boolean;
//   onClose: () => void;
// };
interface SidebarProps {
  open: boolean;
  setOpen: (v: boolean) => void;
}

type MenuItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};


const DashboardIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="8" rx="1" />
    <rect x="3" y="13" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
  </svg>
);

const CentersIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
    <path d="M3 21h18" />
    <path d="M9 7h1" />
    <path d="M9 11h1" />
    <path d="M14 7h1" />
    <path d="M14 11h1" />
    <path d="M9 21v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5" />
  </svg>
);

const RateChartIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <path d="M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
    <path d="M9 7h6" />
    <path d="M12 17v-3" />
    <path d="M9 14h.01" />
    <path d="M12 14h.01" />
    <path d="M15 11h.01" />
    <path d="M12 11h.01" />
    <path d="M9 11h.01" />
  </svg>
);

const AuditIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" />
    <path d="M12 12h3" />
    <path d="M12 16h3" />
    <path d="M9 12h.01" />
    <path d="M9 16h.01" />
  </svg>
);

const QualityIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <path d="M9 12l2 2 4-4" />
    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
  </svg>
);

const ReportsIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M9 19V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10" />
    <path d="M15 19a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const SuperAdminSidebar: React.FC<SidebarProps> = ({ open, setOpen }) => {
  const [dateTime, setDateTime] = useState(new Date());
  const location = useLocation();
  const { user } = useAppContext();

  useEffect(() => {
    const id = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /* CLOSE SIDEBAR AFTER NAVIGATION (mobile) */
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setOpen(false);
    }
  }, [location.pathname, setOpen]);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });


  const menu: MenuItem[] = [
    { label: "Dashboard", path: "/sa/dashboard", icon: <DashboardIcon /> },
    { label: "Collection Centers", path: "/sa/centers", icon: <CentersIcon />, },
    { label: "Rate Chart", path: "/sa/rate-chart", icon: <RateChartIcon />, },
    { label: "Audit Log", path: "/sa/audit", icon: <AuditIcon /> },
    { label: "Quality Control", path: "/sa/quality", icon: <QualityIcon />, },
    { label: "Reports & Analytics", path: "/sa/reports", icon: <ReportsIcon />, },
  ];

  return (

    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static z-50 top-0 left-0 h-full w-64
          bg-white border-r border-slate-200
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">
                DairyPro Enterprise
              </h1>
              <p className="text-xs text-slate-500">Management System</p>
            </div>
          </div>

          {/* Close button mobile */}
          <button className="lg:hidden text-xl" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Main Menu
          </div>
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                [
                  "sidebar-item flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700",
                  isActive ? "active" : "",
                ].join(" ")
              }
            >
              <span className="text-slate-500">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
          <div className="px-3 pt-6 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            System
          </div>
          <NavLink
            to="/sa/settings"
            className={({ isActive }) =>
              [
                "sidebar-item flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700",
                isActive ? "active" : "",
              ].join(" ")
            }
          >
            <span className="text-slate-500">
              <SettingsIcon />
            </span>
            <span>Settings</span>
          </NavLink>
        </nav>

        {/* User Profile */}
        <div className="border-t border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white">
              RS
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user?.name}
              </p>
              <p className="text-xs text-slate-500">Super Admin</p>
            </div>
            <button className="rounded-lg p-2 transition hover:bg-slate-100">
              <svg
                className="h-4 w-4 text-slate-400"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              >
                <path d="M17 16l4-4m0 0l-4-4m4 4H7" />
                <path d="M13 20v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
              </svg>
            </button>
          </div>
          {/* Date time */}
          <div className=" p-4 py-5 text-xs text-slate-800">
            <div>📅 {formatDate(dateTime)}</div>
            <div className="mt-1">🕒 {formatTime(dateTime)}</div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;