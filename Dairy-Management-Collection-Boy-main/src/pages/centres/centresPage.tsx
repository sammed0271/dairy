import React from "react";
import { AxiosError } from "axios";
import {
  backfillCentreAssignments,
  createCentre,
  getCentres,
  updateCentre,
} from "../../axios/centre_api";
import DataTable from "../../components/dataTable";
import InputField from "../../components/inputField";
import SelectField from "../../components/selectField";
import type { CentreRecord } from "../../types/superadmin";

type CentreFormState = {
  name: string;
  code: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  address: string;
  latitude: string;
  longitude: string;
  paymentCycle: string;
  rateType: string;
  status: "active" | "disabled";
};

const initialForm: CentreFormState = {
  name: "",
  code: "",
  village: "",
  taluka: "",
  district: "",
  state: "",
  address: "",
  latitude: "",
  longitude: "",
  paymentCycle: "10-day",
  rateType: "standard",
  status: "active",
};

const CentresPage: React.FC = () => {
  const [centres, setCentres] = React.useState<CentreRecord[]>([]);
  const [form, setForm] = React.useState<CentreFormState>(initialForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [backfillingId, setBackfillingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadCentres = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCentres();
      setCentres(response.data);
    } catch (err) {
      const apiError = err as AxiosError<{ message?: string }>;
      setError(apiError.response?.data?.message ?? "Failed to load centres");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCentres();
  }, [loadCentres]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const setField = <K extends keyof CentreFormState>(
    key: K,
    value: CentreFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEdit = (centre: CentreRecord) => {
    setEditingId(centre._id);
    setForm({
      name: centre.name,
      code: centre.code,
      village: centre.village || "",
      taluka: centre.taluka || "",
      district: centre.district || "",
      state: centre.state || "",
      address: centre.address || "",
      latitude: centre.latitude == null ? "" : String(centre.latitude),
      longitude: centre.longitude == null ? "" : String(centre.longitude),
      paymentCycle: centre.paymentCycle || "10-day",
      rateType: centre.rateType || "standard",
      status: centre.status,
    });
  };

  const handleSubmit = async () => {
    setError(null);

    if (!form.name.trim() || !form.code.trim()) {
      setError("Centre name and code are required");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      };

      if (editingId) {
        await updateCentre(editingId, payload);
      } else {
        await createCentre(payload);
      }

      resetForm();
      await loadCentres();
    } catch (err) {
      const apiError = err as AxiosError<{ message?: string }>;
      setError(apiError.response?.data?.message ?? "Failed to save centre");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (centre: CentreRecord) => {
    try {
      setError(null);
      await updateCentre(centre._id, {
        status: centre.status === "active" ? "disabled" : "active",
      });
      await loadCentres();
    } catch (err) {
      const apiError = err as AxiosError<{ message?: string }>;
      setError(apiError.response?.data?.message ?? "Failed to update centre");
    }
  };

  const handleBackfill = async (centre: CentreRecord) => {
    try {
      setError(null);
      setBackfillingId(centre._id);
      await backfillCentreAssignments(centre._id);
      await loadCentres();
    } catch (err) {
      const apiError = err as AxiosError<{ message?: string }>;
      setError(apiError.response?.data?.message ?? "Failed to backfill centre data");
    } finally {
      setBackfillingId(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#5E503F]">
            {editingId ? "Edit Centre" : "Create Centre"}
          </h2>
          <p className="text-sm text-[#5E503F]/70">
            Manage collection centre master data and operating status.
          </p>
        </div>

        <div className="grid gap-3">
          <InputField
            label="Centre Name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
          <InputField
            label="Centre Code"
            value={form.code}
            onChange={(e) => setField("code", e.target.value.toUpperCase())}
          />
          <InputField
            label="Village"
            value={form.village}
            onChange={(e) => setField("village", e.target.value)}
          />
          <InputField
            label="Taluka"
            value={form.taluka}
            onChange={(e) => setField("taluka", e.target.value)}
          />
          <InputField
            label="District"
            value={form.district}
            onChange={(e) => setField("district", e.target.value)}
          />
          <InputField
            label="State"
            value={form.state}
            onChange={(e) => setField("state", e.target.value)}
          />
          <InputField
            label="Address"
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Latitude"
              value={form.latitude}
              onChange={(e) => setField("latitude", e.target.value)}
            />
            <InputField
              label="Longitude"
              value={form.longitude}
              onChange={(e) => setField("longitude", e.target.value)}
            />
          </div>
          <SelectField
            label="Payment Cycle"
            value={form.paymentCycle}
            onChange={(e) => setField("paymentCycle", e.target.value)}
            options={[
              { label: "10 Day", value: "10-day" },
              { label: "15 Day", value: "15-day" },
              { label: "Monthly", value: "monthly" },
            ]}
          />
          <SelectField
            label="Rate Type"
            value={form.rateType}
            onChange={(e) => setField("rateType", e.target.value)}
            options={[
              { label: "Standard", value: "standard" },
              { label: "Centre Specific", value: "centre-specific" },
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
                ? "Update Centre"
                : "Create Centre"}
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
            <h2 className="text-lg font-semibold text-[#5E503F]">Centres</h2>
            <p className="text-sm text-[#5E503F]/70">
              Active and disabled centres across the dairy organization.
            </p>
          </div>
          <div className="rounded-full bg-[#F8F4E3] px-3 py-1 text-xs font-medium text-[#5E503F]">
            {centres.length} total
          </div>
        </div>

        <DataTable
          data={centres}
          loading={loading}
          keyField="_id"
          emptyMessage="No centres found yet."
          columns={[
            {
              id: "centre",
              header: "Centre",
              cell: (row) => (
                <div>
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-[#5E503F]/70">{row.code}</div>
                </div>
              ),
            },
            {
              id: "location",
              header: "Location",
              cell: (row) =>
                [row.village, row.taluka, row.district]
                  .filter(Boolean)
                  .join(", ") || "-",
            },
            {
              id: "counts",
              header: "Usage",
              cell: (row) => (
                <div className="text-xs leading-5">
                  <div>Admins: {row.metrics?.adminCount ?? 0}</div>
                  <div>Farmers: {row.metrics?.farmerCount ?? 0}</div>
                  <div>Entries: {row.metrics?.milkEntryCount ?? 0}</div>
                </div>
              ),
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
                  <button
                    type="button"
                    onClick={() => void handleBackfill(row)}
                    disabled={backfillingId === row._id}
                    className="rounded-md bg-[#EAF7F5] px-3 py-1 text-xs font-medium text-[#247B71] disabled:opacity-70"
                  >
                    {backfillingId === row._id ? "Backfilling..." : "Backfill"}
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

export default CentresPage;
