import React from "react";
import { AxiosError } from "axios";
import { createAdmin, getAdmins, updateAdmin } from "../../axios/admin_api";
import { getCentres } from "../../axios/centre_api";
import DataTable from "../../components/dataTable";
import InputField from "../../components/inputField";
import SelectField from "../../components/selectField";
import type { AdminRecord, CentreRecord } from "../../types/superadmin";

type AdminFormState = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "superadmin";
  centreId: string;
  status: "active" | "disabled";
};

const initialForm: AdminFormState = {
  name: "",
  email: "",
  password: "",
  role: "admin",
  centreId: "",
  status: "active",
};

const AdminsPage: React.FC = () => {
  const [admins, setAdmins] = React.useState<AdminRecord[]>([]);
  const [centres, setCentres] = React.useState<CentreRecord[]>([]);
  const [form, setForm] = React.useState<AdminFormState>(initialForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadPage = React.useCallback(async () => {
    try {
      setLoading(true);
      const [adminResponse, centreResponse] = await Promise.all([
        getAdmins(),
        getCentres(),
      ]);
      setAdmins(adminResponse.data);
      setCentres(centreResponse.data);
    } catch (err) {
      const apiError = err as AxiosError<{ message?: string }>;
      setError(apiError.response?.data?.message ?? "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const activeCentres = centres.filter((centre) => centre.status === "active");

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const setField = <K extends keyof AdminFormState>(
    key: K,
    value: AdminFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEdit = (admin: AdminRecord) => {
    setEditingId(admin._id);
    setForm({
      name: admin.name,
      email: admin.email,
      password: "",
      role: admin.role,
      centreId: admin.centreId?._id || "",
      status: admin.status,
    });
  };

  const handleSubmit = async () => {
    setError(null);

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required");
      return;
    }

    if (!editingId && !form.password.trim()) {
      setError("Password is required for new admin accounts");
      return;
    }

    if (form.role === "admin" && !form.centreId) {
      setError("Please assign a centre for admin users");
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        await updateAdmin(editingId, {
          name: form.name,
          email: form.email,
          role: form.role,
          status: form.status,
          centreId: form.role === "superadmin" ? null : form.centreId,
          ...(form.password.trim() ? { password: form.password } : {}),
        });
      } else {
        await createAdmin({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          status: form.status,
          centreId: form.role === "superadmin" ? null : form.centreId,
        });
      }

      resetForm();
      await loadPage();
    } catch (err) {
      const apiError = err as AxiosError<{ message?: string }>;
      setError(apiError.response?.data?.message ?? "Failed to save admin");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: AdminRecord) => {
    try {
      setError(null);
      await updateAdmin(admin._id, {
        status: admin.status === "active" ? "disabled" : "active",
      });
      await loadPage();
    } catch (err) {
      const apiError = err as AxiosError<{ message?: string }>;
      setError(apiError.response?.data?.message ?? "Failed to update admin");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#5E503F]">
            {editingId ? "Edit Admin" : "Create Admin"}
          </h2>
          <p className="text-sm text-[#5E503F]/70">
            Provision operational users and assign them to collection centres.
          </p>
        </div>

        <div className="grid gap-3">
          <InputField
            label="Name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
          <InputField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
          />
          <InputField
            label={editingId ? "Reset Password" : "Password"}
            type="password"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            helperText={
              editingId ? "Leave blank to keep the current password." : undefined
            }
          />
          <SelectField
            label="Role"
            value={form.role}
            onChange={(e) =>
              setField("role", e.target.value as "admin" | "superadmin")
            }
            options={[
              { label: "Admin", value: "admin" },
              { label: "Superadmin", value: "superadmin" },
            ]}
          />
          <SelectField
            label="Assigned Centre"
            value={form.role === "superadmin" ? "" : form.centreId}
            disabled={form.role === "superadmin"}
            onChange={(e) => setField("centreId", e.target.value)}
            options={[
              {
                label:
                  form.role === "superadmin"
                    ? "Not required for superadmin"
                    : "Select a centre",
                value: "",
              },
              ...activeCentres.map((centre) => ({
                label: `${centre.name} (${centre.code})`,
                value: centre._id,
              })),
            ]}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(e) =>
              setField("status", e.target.value as "active" | "disabled")
            }
            options={[
              { label: "Active", value: "active" },
              { label: "Disabled", value: "disabled" },
            ]}
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#247B71] disabled:opacity-70"
          >
            {submitting
              ? "Saving..."
              : editingId
                ? "Update Admin"
                : "Create Admin"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-[#E9E2C8] px-4 py-2 text-sm font-medium text-[#5E503F]"
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#5E503F]">Admins</h2>
            <p className="text-sm text-[#5E503F]/70">
              Operational and superadmin users registered in the ERP.
            </p>
          </div>
          <div className="rounded-full bg-[#F8F4E3] px-3 py-1 text-xs font-medium text-[#5E503F]">
            {admins.length} users
          </div>
        </div>

        <DataTable
          data={admins}
          loading={loading}
          keyField="_id"
          emptyMessage="No admin accounts found."
          columns={[
            {
              id: "user",
              header: "User",
              cell: (row) => (
                <div>
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-[#5E503F]/70">{row.email}</div>
                </div>
              ),
            },
            {
              id: "role",
              header: "Role",
              cell: (row) => (
                <span className="rounded-full bg-[#F8F4E3] px-2 py-1 text-xs font-medium text-[#5E503F]">
                  {row.role}
                </span>
              ),
            },
            {
              id: "centre",
              header: "Centre",
              cell: (row) =>
                row.centreId
                  ? `${row.centreId.name} (${row.centreId.code})`
                  : "Global",
            },
            {
              id: "status",
              header: "Status",
              cell: (row) => (
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    row.status === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {row.status}
                </span>
              ),
            },
            {
              id: "actions",
              header: "Actions",
              cell: (row) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(row)}
                    className="rounded-md border border-[#E9E2C8] px-3 py-1 text-xs font-medium text-[#5E503F]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleStatus(row)}
                    className="rounded-md bg-[#F8F4E3] px-3 py-1 text-xs font-medium text-[#5E503F]"
                  >
                    {row.status === "active" ? "Disable" : "Enable"}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
};

export default AdminsPage;
