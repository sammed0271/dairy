import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { getStoredUser } from "../utils/auth";

type MenuItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

interface SidebarProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

const DashboardIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="5" rx="1" />
    <rect x="3" y="13" width="5" height="8" rx="1" />
    <rect x="10" y="13" width="11" height="8" rx="1" />
  </svg>
);

const UserIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BottleIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <path d="M8 2h8l2 4v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6z" />
    <path d="M8 6h8" />
  </svg>
);

const DeductionIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M7 10h10" />
    <path d="M9 14h2" />
  </svg>
);

const BillsIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16l2-1 2 1 2-1 2 1 2-1 2 1V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h6" />
    <path d="M9 17h3" />
  </svg>
);

const PaymentsIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 15h2" />
    <path d="M10 15h4" />
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
    <path d="M3 3v18h18" />
    <path d="M7 15l4-4 3 3 4-6" />
    <circle cx="7" cy="15" r="1" />
    <circle cx="11" cy="11" r="1" />
    <circle cx="14" cy="14" r="1" />
    <circle cx="18" cy="8" r="1" />
  </svg>
);

const InventoryIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <rect x="3" y="4" width="18" height="6" rx="1" />
    <rect x="3" y="14" width="18" height="6" rx="1" />
    <path d="M7 8h2" />
    <path d="M7 18h2" />
  </svg>
);

const BonusIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <circle cx="12" cy="8" r="3" />
    <path d="M7 22v-3a5 5 0 0 1 10 0v3" />
    <path d="M5 9h2" />
    <path d="M17 9h2" />
    <path d="M6 5l1.5 1.5" />
    <path d="M18 5l-1.5 1.5" />
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
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 9h6" />
    <path d="M9 13h4" />
    <path d="M9 17h2" />
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
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1h.1a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ open, setOpen }) => {
  const [dateTime, setDateTime] = useState(new Date());
  const location = useLocation();
  const user = getStoredUser();

  useEffect(() => {
    const intervalId = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setOpen(false);
    }
  }, [location.pathname, setOpen]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  const superadminMenu: MenuItem[] = [
    { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
    { label: "Centres", path: "/centres", icon: <BottleIcon /> },
    { label: "Admins", path: "/admins", icon: <UserIcon /> },
    { label: "Farmers", path: "/farmers", icon: <UserIcon /> },
    { label: "Payments", path: "/payments", icon: <PaymentsIcon /> },
    { label: "Rate Chart", path: "/rate-chart", icon: <RateChartIcon /> },
    { label: "Reports", path: "/reports", icon: <ReportsIcon /> },
    { label: "Settings", path: "/settings", icon: <SettingsIcon /> },
  ];

  const adminMenu: MenuItem[] = [
    { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
    { label: "Farmer Management", path: "/farmers", icon: <UserIcon /> },
    { label: "Milk Collection", path: "/milk-collection", icon: <BottleIcon /> },
    { label: "Advance / Food", path: "/deduction", icon: <DeductionIcon /> },
    { label: "Generate Bills", path: "/bills", icon: <BillsIcon /> },
    { label: "Payments", path: "/payments", icon: <PaymentsIcon /> },
    { label: "Bonus Management", path: "/bonus", icon: <BonusIcon /> },
    { label: "Rate Chart", path: "/rate-chart", icon: <RateChartIcon /> },
    { label: "Inventory", path: "/inventory", icon: <InventoryIcon /> },
    { label: "Reports", path: "/reports", icon: <ReportsIcon /> },
    { label: "Settings", path: "/settings", icon: <SettingsIcon /> },
  ];

  const menu = user?.role === "superadmin" ? superadminMenu : adminMenu;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-50 h-full w-64
          transform bg-[#247B71] text-white shadow-lg transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0
        `}
      >
        <div className="flex items-center justify-between border-b border-white/20 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl font-bold text-[#247B71]">
              D
            </div>
            <div>
              <div className="text-base font-bold leading-tight">My Dairy</div>
              <div className="text-xs text-white/80">
                {user?.role === "superadmin"
                  ? "Organization Control"
                  : "Centre Operations"}
              </div>
            </div>
          </div>

          <button className="text-xl lg:hidden" onClick={() => setOpen(false)}>
            x
          </button>
        </div>

        <nav className="flex-1 py-3">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 border-l-4 px-4 py-2.5 text-sm transition-colors",
                  isActive
                    ? "border-white bg-white font-semibold text-[#247B71]"
                    : "border-transparent text-white/90 hover:bg-white/10",
                ].join(" ")
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/20 px-4 py-3 text-xs text-white/90">
          <div>Date: {formatDate(dateTime)}</div>
          <div className="mt-1">Time: {formatTime(dateTime)}</div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
