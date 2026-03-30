// src/layout/navbar.tsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface NavbarProps {
  onMenuClick: () => void;
}

/* ================= ICONS ================= */

const BellIcon: React.FC = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
  </svg>
);

const GearIcon: React.FC = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3 12.91V13a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 7.6a1.65 1.65 0 0 0 1-1.51V6a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 16 7.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21 11v.09a1.65 1.65 0 0 0-.6 1.41z" />
  </svg>
);

const UserIcon: React.FC = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MenuIcon: React.FC = () => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
  >
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

/* ================= PAGE META ================= */

function getPageMeta(pathname: string): { title: string; subtitle: string } {
  if (pathname.startsWith("/dashboard"))
    return {
      title: "Dashboard",
      subtitle: "Overview of collection, payments and inventory",
    };

  if (pathname.startsWith("/farmers")) {
    if (pathname.includes("/add"))
      return {
        title: "Add Farmer",
        subtitle: "Register a new farmer in the dairy system",
      };
    return {
      title: "Farmer Management",
      subtitle: "View and manage all farmers",
    };
  }

  if (pathname.startsWith("/milk-collection"))
    return {
      title: "Milk Collection",
      subtitle: "Daily milk entry and collection summary",
    };

  if (pathname.startsWith("/deduction"))
    return {
      title: "Advance / Food / Medical",
      subtitle: "Manage deductions from farmer bills",
    };

  if (pathname.startsWith("/bills"))
    return {
      title: "Generate Bills",
      subtitle: "Create and manage farmer payment bills",
    };

  if (pathname.startsWith("/bonus"))
    return {
      title: "Bonus Management",
      subtitle: "Configure and distribute bonuses",
    };

  if (pathname.startsWith("/rate-chart"))
    return {
      title: "Rate Chart",
      subtitle: "Manage milk rate chart by FAT & SNF",
    };

  if (pathname.startsWith("/inventory"))
    return {
      title: "Inventory",
      subtitle: "Track cattle feed, cans and other stock",
    };

  if (pathname.startsWith("/reports"))
    return { title: "Reports", subtitle: "Daily and monthly reports" };

  return { title: "My Dairy", subtitle: "Dairy management system" };
}

/* ================= COMPONENT ================= */

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const userName = "Admin";
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const settingsRef = React.useRef<HTMLDivElement>(null);
  const meta = getPageMeta(location.pathname);

  const notificationRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = React.useState(
    document.documentElement.classList.contains("dark"),
  );

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setIsDark(!isDark);
  };

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setShowSettings(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setShowNotifications(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
<header className="flex items-center justify-between border-b border-[#E9E2C8] bg-[#F8F4E3] px-4 sm:px-6 py-3 shadow-sm">      {" "}
      {/* LEFT SECTION */}
      <div className="flex items-start gap-3">
        {/* Hamburger (mobile only) */}
        <button
          type="button"
          onClick={() => {
            console.log("Menu clicked"); // temporary debug
            onMenuClick();
          }}
          className="lg:hidden rounded-md p-2 text-[#5E503F]/80 hover:bg-[#EDE4C5]"
        >
          <MenuIcon />
        </button>

        <div className="flex flex-col">
          {/* Breadcrumb hidden on small */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#5E503F]/60">
            <button
              onClick={() => navigate("/dashboard")}
              className="hover:text-[#2A9D8F]"
            >
              My Dairy
            </button>
            <span>/</span>
            <span>{meta.title}</span>
          </div>

          <div className="text-base sm:text-lg font-semibold text-[#5E503F]">
            {meta.title}
          </div>

          <div className="hidden sm:block text-xs text-[#5E503F]/70">
            {meta.subtitle}
          </div>
        </div>
      </div>
      {/* RIGHT SECTION */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden border border-[#E9E2C8] sm:flex items-center gap-2 rounded-full bg-[#F8F4E3] px-3 py-1 text-xs text-[#5E503F]/80">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Online</span>
        </div>

        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setShowUserMenu(false);
              setShowSettings(false);
            }}
            className="rounded-full p-2 text-[#5E503F]/70 hover:bg-[#EDE4C5]"
          >
            <BellIcon />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg border border-[#E9E2C8] dark:border-gray-700 bg-[#F8F4E3] shadow-lg z-50 transition-colors duration-200">
              {" "}
              <div className="p-3 text-sm font-semibold border-b">
                Notifications
              </div>
              <div className="p-3 text-sm text-[#5E503F]">
                No new notifications
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => {
              setShowSettings((prev) => !prev);
              setShowNotifications(false);
              setShowUserMenu(false);
            }}
            className="rounded-full p-2 text-[#5E503F]/70 hover:bg-[#EDE4C5]"
          >
            <GearIcon />
          </button>

          {showSettings && (
            <div className="absolute right-0 mt-2 w-64 sm:w-56 rounded-lg border bg-[#F8F4E3] dark:border-gray-700 shadow-lg z-50">
              <div className="px-4 py-3 text-sm font-semibold border-b border-[#E9E2C8] dark:border-gray-700 text-[#5E503F] dark:text-[#5E503F]">
                {" "}
                Settings
              </div>

              <div className="flex items-center justify-between px-4 py-3  transition">
                <span className="text-sm text-[#5E503F] dark:text-[#5E503F]">
                  Theme
                </span>

                <button
                  onClick={toggleTheme}
                  className={`relative w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                    isDark ? "bg-[#2A9D8F]" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center text-xs ${
                      isDark ? "translate-x-6" : "translate-x-0"
                    }`}
                  >
                    {isDark ? "🌙" : "🌞"}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <div
            onClick={() => {
              setShowUserMenu((prev) => !prev);
              setShowNotifications(false);
              setShowSettings(false);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-[#E9E2C8] bg-[#F8F4E3] px-2 sm:px-3 py-1"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2A9D8F] text-sm font-semibold text-white">
              {userName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="hidden sm:block text-xs">
              <div className="font-semibold text-[#5E503F]">{userName}</div>
              <div className="text-[11px] text-[#5E503F]/70">Administrator</div>
            </div>

            <div className="hidden sm:block text-[#5E503F]/60">
              <UserIcon />
            </div>
          </div>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 sm:w-64 rounded-xl border border-[#E9E2C8] dark:border-gray-700 bg-[#F8F4E3] shadow-xl z-50 transition-all duration-200">
              {" "}
              <button
                onClick={() => navigate("/profile")}
                className="w-full px-4 py-2 text-left text-sm border-[#E9E2C8]"
              >
                Profile
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  navigate("/login");
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-500 "
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
