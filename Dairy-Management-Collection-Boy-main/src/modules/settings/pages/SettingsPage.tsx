import React from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  changeCurrentUserPassword,
  updateCurrentUser,
} from "../../../axios/auth_api";
import { useSyncContext } from "../../../context/SyncContext";
import {
  clearSession,
  getStoredUser,
  updateStoredUser,
} from "../../../utils/auth";
import { ChartCard, FormInput, Header, Sidebar } from "../../shared/components";
import ThemeToggleCard from "../components/ThemeToggleCard";
import type { SettingsQuickLink } from "../types/settings";

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Not synced yet";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const {
    failedQueueItems,
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncNow,
  } = useSyncContext();
  const [isDark, setIsDark] = React.useState(
    document.documentElement.classList.contains("dark"),
  );
  const [profileForm, setProfileForm] = React.useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
  });
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    setIsDark(nextDark);
  };

  const saveProfile = async () => {
    const name = profileForm.name.trim();
    const email = profileForm.email.trim();

    if (!name || !email) {
      toast.error("Name and email are required.");
      return;
    }

    try {
      setSavingProfile(true);
      const response = await updateCurrentUser({ name, email });
      updateStoredUser(response.data);
      setProfileForm({
        name: response.data.name,
        email: response.data.email,
      });
      toast.success("Profile updated.");
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("Current and new password are required.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Password confirmation does not match.");
      return;
    }

    try {
      setSavingPassword(true);
      await changeCurrentUserPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Password updated.");
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const quickLinks: SettingsQuickLink[] =
    user?.role === "superadmin"
      ? [
          {
            label: "Centres",
            description: "Maintain centre configuration and assignments.",
            path: "/centres",
          },
          {
            label: "Admins",
            description: "Manage operational access for each centre.",
            path: "/admins",
          },
          {
            label: "Reports",
            description: "Review global milk and payment performance.",
            path: "/reports/daily",
          },
        ]
      : [
          {
            label: "Milk Collection",
            description: "Continue tablet-friendly collection work.",
            path: "/milk-collection",
          },
          {
            label: "Bills",
            description: "Generate bills and trigger payouts.",
            path: "/bills",
          },
          {
            label: "Inventory",
            description: "Manage centre stock and farmer sales.",
            path: "/inventory",
          },
        ];

  return (
    <div className="space-y-6">
      <Header
        title="Settings"
        subtitle="Review account access, appearance preferences, and sync health for this device."
        actions={
          <button
            type="button"
            onClick={() => {
              clearSession();
              navigate("/login");
            }}
            className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Sidebar
          title="Account"
          description="Current signed-in user and centre assignment."
          footer={
            <div className="text-xs text-[#5E503F]/60">
              Superadmins work across centres. Admins remain scoped to their assigned
              collection centre.
            </div>
          }
        >
          <div className="space-y-3 text-sm text-[#5E503F]">
            <div>
              <div className="text-xs uppercase tracking-wide text-[#5E503F]/60">
                Name
              </div>
              <div className="font-medium">{user?.name ?? "Unknown user"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[#5E503F]/60">
                Email
              </div>
              <div>{user?.email ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[#5E503F]/60">
                Role
              </div>
              <div className="capitalize">{user?.role ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[#5E503F]/60">
                Centre
              </div>
              <div>
                {typeof user?.centreId === "object" && user.centreId
                  ? `${user.centreId.name} (${user.centreId.code})`
                  : user?.role === "superadmin"
                    ? "All centres"
                    : "Not assigned"}
              </div>
            </div>
          </div>
        </Sidebar>

        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ThemeToggleCard isDark={isDark} onToggle={toggleTheme} />

            <ChartCard
              title="Offline Sync"
              subtitle="This device can queue centre operations when connectivity drops."
              action={
                <button
                  type="button"
                  onClick={() => void syncNow()}
                  disabled={!isOnline || isSyncing}
                  className="rounded-md border border-[#E9E2C8] px-4 py-2 text-sm font-medium text-[#5E503F] hover:bg-[#F8F4E3] disabled:opacity-70"
                >
                  {isSyncing ? "Syncing..." : "Sync now"}
                </button>
              }
            >
              <div className="space-y-3 text-sm text-[#5E503F]">
                <div className="flex items-center justify-between">
                  <span>Connection</span>
                  <span className={isOnline ? "text-emerald-700" : "text-amber-700"}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pending queue</span>
                  <span>{pendingCount} records</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Failed syncs</span>
                  <span>{failedQueueItems.length} records</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last sync</span>
                  <span>{formatDateTime(lastSyncTime)}</span>
                </div>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Profile"
              subtitle="Keep your signed-in account details up to date."
              action={
                <button
                  type="button"
                  onClick={() => void saveProfile()}
                  disabled={savingProfile}
                  className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#247B71] disabled:opacity-70"
                >
                  {savingProfile ? "Saving..." : "Save profile"}
                </button>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput
                  label="Full Name"
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
                <FormInput
                  label="Email"
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Password"
              subtitle="Rotate credentials on this account without leaving the ERP."
              action={
                <button
                  type="button"
                  onClick={() => void savePassword()}
                  disabled={savingPassword}
                  className="rounded-md border border-[#E9E2C8] bg-white px-4 py-2 text-sm font-medium text-[#5E503F] hover:bg-[#F8F4E3] disabled:opacity-70"
                >
                  {savingPassword ? "Updating..." : "Change password"}
                </button>
              }
            >
              <div className="grid gap-4">
                <FormInput
                  label="Current Password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormInput
                    label="New Password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                  />
                  <FormInput
                    label="Confirm Password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </ChartCard>
          </div>

          <ChartCard
            title="Quick Links"
            subtitle="Jump into the most important operational areas for your role."
          >
            <div className="grid gap-3 md:grid-cols-3">
              {quickLinks.map((link) => (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className="rounded-xl border border-[#E9E2C8] bg-[#FDFCF8] p-4 text-left hover:border-[#2A9D8F] hover:bg-[#F8F4E3]"
                >
                  <div className="text-sm font-semibold text-[#5E503F]">
                    {link.label}
                  </div>
                  <p className="mt-1 text-xs text-[#5E503F]/70">
                    {link.description}
                  </p>
                </button>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
