import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSyncContext } from "../context/SyncContext";
import { clearSession, getStoredUser } from "../utils/auth";

interface NavbarProps {
  onMenuClick: () => void;
}

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

function getPageMeta(pathname: string): { title: string; subtitle: string } {
  if (pathname.startsWith("/dashboard")) {
    return {
      title: "Dashboard",
      subtitle: "Overview of collection, payments and inventory",
    };
  }

  if (pathname.startsWith("/centres")) {
    return {
      title: "Centres",
      subtitle: "Manage collection centres across the dairy network",
    };
  }

  if (pathname.startsWith("/admins")) {
    return {
      title: "Admins",
      subtitle: "Manage user access and centre assignments",
    };
  }

  if (pathname.startsWith("/farmers")) {
    if (pathname.includes("/add")) {
      return {
        title: "Add Farmer",
        subtitle: "Register a new farmer in the dairy system",
      };
    }
    return {
      title: "Farmer Management",
      subtitle: "View and manage all farmers",
    };
  }

  if (pathname.startsWith("/milk-collection")) {
    return {
      title: "Milk Collection",
      subtitle: "Daily milk entry and collection summary",
    };
  }

  if (pathname.startsWith("/deduction")) {
    return {
      title: "Advance / Food / Medical",
      subtitle: "Manage deductions from farmer bills",
    };
  }

  if (pathname.startsWith("/bills")) {
    return {
      title: "Generate Bills",
      subtitle: "Create and manage farmer payment bills",
    };
  }

  if (pathname.startsWith("/payments")) {
    return {
      title: "Payments",
      subtitle: "Track payout initiation and settlement status",
    };
  }

  if (pathname.startsWith("/bonus")) {
    return {
      title: "Bonus Management",
      subtitle: "Configure and distribute bonuses",
    };
  }

  if (pathname.startsWith("/rate-chart")) {
    return {
      title: "Rate Chart",
      subtitle: "Manage milk rate chart by FAT and SNF",
    };
  }

  if (pathname.startsWith("/inventory")) {
    return {
      title: "Inventory",
      subtitle: "Track cattle feed, cans and other stock",
    };
  }

  if (pathname.startsWith("/reports")) {
    return { title: "Reports", subtitle: "Daily and monthly reports" };
  }

  if (pathname.startsWith("/settings")) {
    return {
      title: "Settings",
      subtitle: "Account, sync health, and device preferences",
    };
  }

  return { title: "My Dairy", subtitle: "Dairy management system" };
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();
  const meta = getPageMeta(location.pathname);
  const userName = user?.name || "Admin";
  const {
    failedQueueItems,
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncNow,
  } = useSyncContext();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const notificationRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setShowNotifications(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const secondaryLabel =
    user?.role === "superadmin"
      ? "Superadmin"
      : user?.centreId && typeof user.centreId === "object"
        ? `${user.centreId.name} admin`
        : "Administrator";

  return (
    <header className="flex items-center justify-between border-b border-[#E9E2C8] bg-[#F8F4E3] px-4 py-3 shadow-sm sm:px-6">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 text-[#5E503F]/80 hover:bg-[#EDE4C5] lg:hidden"
        >
          <MenuIcon />
        </button>

        <div className="flex flex-col">
          <div className="hidden items-center gap-2 text-xs text-[#5E503F]/60 sm:flex">
            <button
              onClick={() => navigate("/dashboard")}
              className="hover:text-[#2A9D8F]"
            >
              My Dairy
            </button>
            <span>/</span>
            <span>{meta.title}</span>
          </div>

          <div className="text-base font-semibold text-[#5E503F] sm:text-lg">
            {meta.title}
          </div>
          <div className="hidden text-xs text-[#5E503F]/70 sm:block">
            {meta.subtitle}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden items-center gap-2 rounded-full border border-[#E9E2C8] bg-[#F8F4E3] px-3 py-1 text-xs text-[#5E503F]/80 sm:flex">
          <span
            className={`h-2 w-2 rounded-full ${
              isOnline ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <span>{isOnline ? "Online" : "Offline"}</span>
          {pendingCount > 0 && <span>{pendingCount} pending</span>}
          {failedQueueItems.length > 0 && <span>{failedQueueItems.length} failed</span>}
        </div>

        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={!isOnline || isSyncing}
          className="hidden rounded-full border border-[#E9E2C8] bg-[#F8F4E3] px-3 py-1 text-xs text-[#5E503F]/80 sm:inline-flex disabled:opacity-60"
        >
          {isSyncing ? "Syncing..." : lastSyncTime ? "Sync Now" : "Initial Sync"}
        </button>

        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setShowUserMenu(false);
            }}
            className="rounded-full p-2 text-[#5E503F]/70 hover:bg-[#EDE4C5]"
          >
            <BellIcon />
          </button>

          {showNotifications && (
            <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-[#E9E2C8] bg-[#F8F4E3] shadow-lg">
              <div className="border-b p-3 text-sm font-semibold">
                Notifications
              </div>
              <div className="space-y-2 p-3 text-sm text-[#5E503F]">
                <div>
                  Sync queue: {pendingCount} pending
                  {failedQueueItems.length > 0 && `, ${failedQueueItems.length} failed`}
                </div>
                <div>
                  Last sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : "Not synced yet"}
                </div>
                {failedQueueItems.length === 0 && <div>No new notifications</div>}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="rounded-full p-2 text-[#5E503F]/70 hover:bg-[#EDE4C5]"
        >
          <GearIcon />
        </button>

        <div className="relative" ref={userMenuRef}>
          <div
            onClick={() => {
              setShowUserMenu((prev) => !prev);
              setShowNotifications(false);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-[#E9E2C8] bg-[#F8F4E3] px-2 py-1 sm:px-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2A9D8F] text-sm font-semibold text-white">
              {userName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="hidden text-xs sm:block">
              <div className="font-semibold text-[#5E503F]">{userName}</div>
              <div className="text-[11px] text-[#5E503F]/70">{secondaryLabel}</div>
            </div>

            <div className="hidden text-[#5E503F]/60 sm:block">
              <UserIcon />
            </div>
          </div>

          {showUserMenu && (
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-[#E9E2C8] bg-[#F8F4E3] shadow-xl">
              <button
                onClick={() => navigate("/settings")}
                className="w-full px-4 py-2 text-left text-sm text-[#5E503F]"
              >
                Settings
              </button>
              <button
                onClick={() =>
                  navigate(user?.role === "superadmin" ? "/centres" : "/dashboard")
                }
                className="w-full px-4 py-2 text-left text-sm text-[#5E503F]"
              >
                {user?.role === "superadmin" ? "Manage Centres" : "Dashboard"}
              </button>
              <button
                onClick={() => {
                  clearSession();
                  navigate("/login");
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-500"
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
