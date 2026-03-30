// src/pages/deduction/deductionList.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTable, { type DataTableColumn } from "../../components/dataTable";
import StatCard from "../../components/statCard";
import InputField from "../../components/inputField";
import SelectField from "../../components/selectField";
import ConfirmModal from "../../components/confirmModal";
import type {
  Deduction,
  DeductionCategory,
  DeductionStatus,
} from "../../types/deduction";

import {
  getDeductions,
  deleteDeduction as deleteDeductionAPI,
} from "../../axios/deduction_api";
import { api } from "../../axios/axiosInstance";
import toast from "react-hot-toast";

// const DEDUCTION_KEY = "dairy_deductions";

type DateFilterMode = "all" | "thisMonth" | "range";

const DeductionListPage: React.FC = () => {
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const firstOfMonthISO = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return d.toISOString().slice(0, 10);
  }, [today]);

  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [dateMode, setDateMode] = useState<DateFilterMode>("thisMonth");
  const [dateFrom, setDateFrom] = useState<string>(firstOfMonthISO);
  const [dateTo, setDateTo] = useState<string>(todayISO);
  const [categoryFilter, setCategoryFilter] = useState<
    "All" | DeductionCategory
  >("All");
  const [statusFilter, setStatusFilter] = useState<"All" | DeductionStatus>(
    "All",
  );
  const [search, setSearch] = useState<string>("");

  // adjust (partial/clear) modal
  const [adjustDeduction, setAdjustDeduction] = useState<Deduction | null>(
    null,
  );
  const [adjustAmount, setAdjustAmount] = useState<string>("");

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Deduction | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getDeductions();
        setDeductions(res.data);
      } catch (err) {
        console.error("Failed to load deductions:", err);
        toast.error("Failed to load deductions");
      }
    };

    load();
  }, []);

  const filteredDeductions = useMemo(() => {
    return deductions.filter((d) => {
      // date
      let matchDate = true;
      if (dateMode === "thisMonth") {
        const y = today.getFullYear();
        const m = today.getMonth();
        const dd = new Date(d.date);
        matchDate = dd.getFullYear() === y && dd.getMonth() === m;
      } else if (dateMode === "range") {
        if (dateFrom && d.date < dateFrom) matchDate = false;
        if (dateTo && d.date > dateTo) matchDate = false;
      }

      if (!matchDate) return false;

      // category
      const matchCat =
        categoryFilter === "All" ? true : d.category === categoryFilter;

      // status
      const matchStatus =
        statusFilter === "All" ? true : d.status === statusFilter;

      // search
      const term = search.trim().toLowerCase();
      const matchSearch =
        term.length === 0 ||
        d.farmerName.toLowerCase().includes(term) ||
        d.farmerCode.toLowerCase().includes(term) ||
        (d.description || "").toLowerCase().includes(term);

      return matchCat && matchStatus && matchSearch;
    });
  }, [
    deductions,
    dateMode,
    dateFrom,
    dateTo,
    categoryFilter,
    statusFilter,
    search,
    today,
  ]);

  const stats = useMemo(() => {
    let total = 0;
    let remaining = 0;
    let pending = 0;
    let cleared = 0;
    let partial = 0;

    deductions.forEach((d) => {
      total += d.amount;
      remaining += d.remainingAmount;
      if (d.status === "Pending") pending += 1;
      if (d.status === "Partial") partial += 1;
      if (d.status === "Cleared") cleared += 1;
    });

    return { total, remaining, pending, partial, cleared };
  }, [deductions]);

  const openAdjustModal = (d: Deduction) => {
    // console.log("Adjust clicked", d.remainingAmount);

    if (d.remainingAmount <= 0) {
      toast("This deduction is already cleared");
      return;
    }
    setAdjustDeduction(d);
    setAdjustAmount(d.remainingAmount.toFixed(2));
  };

  const applyAdjustment = async () => {
    if (!adjustDeduction) return;

    const amt = parseFloat(adjustAmount);
    if (!amt || amt <= 0) {
      toast.error("Adjustment amount must be greater than 0.");
      return;
    }
    if (amt > adjustDeduction.remainingAmount) {
      toast.error("Adjustment amount cannot exceed remaining amount.");
      return;
    }

    const newRemaining = adjustDeduction.remainingAmount - amt;
    const newStatus: DeductionStatus =
      newRemaining <= 0 ? "Cleared" : "Partial";

    //  SAVE TO BACKEND (THIS WAS MISSING)
    await api.patch(`/deductions/${adjustDeduction._id}`, {
      remainingAmount: newRemaining,
      status: newStatus,
    });
    toast.success("Deduction adjusted successfully");

    //  RELOAD FROM BACKEND
    const res = await getDeductions();
    setDeductions(res.data);

    setAdjustDeduction(null);
  };

  const markCleared = async (d: Deduction) => {
    await api.patch(`/deductions/clear/${d._id}`, {
      remainingAmount: 0,
      status: "Cleared",
    });
    toast.success("Deduction marked as cleared");

    // RELOAD FROM BACKEND
    const res = await getDeductions();
    setDeductions(res.data);
  };

  const deleteDeduction = async () => {
    if (!deleteTarget) return;
    await deleteDeductionAPI(deleteTarget._id);
    toast.success("Deduction deleted successfully");

    const res = await getDeductions();
    setDeductions(res.data);
    setDeleteTarget(null);
  };

  const columns: DataTableColumn<Deduction>[] = [
    {
      id: "date",
      header: "Date",
      align: "center",
      accessor: "date",
      className: "whitespace-nowrap",
    },
    {
      id: "farmerCode",
      header: "Farmer Code",
      align: "center",
      accessor: "farmerCode",
    },
    {
      id: "farmerName",
      header: "Farmer Name",
      align: "center",
      accessor: "farmerName",
    },
    {
      id: "category",
      header: "Category",
      align: "center",
      cell: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            row.category === "Advance"
              ? "bg-[#2A9D8F]/10 text-[#2A9D8F]"
              : row.category === "Food"
                ? "bg-[#F4A261]/10 text-[#A45C20]"
                : "bg-[#E76F51]/10 text-[#E76F51]"
          }`}
        >
          {row.category}
        </span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "center",
      cell: (row) => `₹ ${row.amount.toFixed(2)}`,
    },
    {
      id: "remaining",
      header: "Remaining",
      align: "center",
      cell: (row) =>
        row.remainingAmount > 0
          ? `₹ ${row.remainingAmount.toFixed(2)}`
          : "₹ 0.00",
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            row.status === "Pending"
              ? "bg-yellow-100 text-yellow-800"
              : row.status === "Partial"
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
          }`}
        >
          {row.status}
        </span>
      ),
    },

    {
      id: "actions",
      header: "Actions",
      align: "center",
      cell: (row) => (
        <div
          className="relative z-10 flex flex-nowrap items-center justify-center gap-1 whitespace-nowrap"
          style={{ pointerEvents: "auto" }}
        >
          {row.remainingAmount > 0 && (
            <button
              type="button"
              onClickCapture={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation(); // 🔥 KEY
                openAdjustModal(row);
              }}
              className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs text-[#2A9D8F]"
            >
              Adjust
            </button>
          )}

          {row.status !== "Cleared" && (
            <button
              type="button"
              onClickCapture={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                markCleared(row);
              }}
              className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs text-emerald-700"
            >
              Mark Cleared
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs text-[#E76F51] hover:bg-[#E76F51]/10"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const handleDateModeChange = (mode: DateFilterMode) => {
    setDateMode(mode);
    if (mode === "thisMonth") {
      setDateFrom(firstOfMonthISO);
      setDateTo(todayISO);
    }
  };

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">
              Deduction Management
            </h1>
            <p className="text-sm text-[#5E503F]/70">
              Manage advances, food and medical deductions for farmers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/deduction/add")}
            className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#247B71]"
          >
            + Add Deduction
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Deductions"
            value={deductions.length}
            variant="teal"
            subtitle={undefined}
          />
          <StatCard
            title="Total Amount (₹)"
            value={stats.total.toFixed(2)}
            variant="blue"
            subtitle={undefined}
          />
          <StatCard
            title="Outstanding (₹)"
            value={stats.remaining.toFixed(2)}
            variant="orange"
            subtitle={undefined}
          />
          <StatCard
            title="Pending / Partial / Cleared"
            value={`${stats.pending} / ${stats.partial} / ${stats.cleared}`}
            variant="red"
            subtitle={undefined}
          />
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date mode */}
            <div>
              <div className="text-xs font-medium text-[#5E503F]">
                Date Filter
              </div>
              <div className="mt-1 flex gap-2">
                {(["thisMonth", "all", "range"] as DateFilterMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleDateModeChange(mode)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                        dateMode === mode
                          ? "bg-[#2A9D8F] text-white"
                          : "bg-[#E9E2C8] text-[#5E503F]"
                      }`}
                    >
                      {mode === "thisMonth"
                        ? "This Month"
                        : mode === "all"
                          ? "All"
                          : "Range"}
                    </button>
                  ),
                )}
              </div>
            </div>

            {dateMode === "range" && (
              <div className="flex items-end gap-2">
                <InputField
                  label="From"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  containerClassName="min-w-[150px]"
                />
                <InputField
                  label="To"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  containerClassName="min-w-[150px]"
                />
              </div>
            )}

            <SelectField
              label="Category"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value === "All"
                    ? "All"
                    : (e.target.value as DeductionCategory),
                )
              }
              options={[
                { label: "All Categories", value: "All" },
                { label: "Advance", value: "Advance" },
                { label: "Food", value: "Food" },
                { label: "Medical", value: "Medical" },
              ]}
              containerClassName="w-40"
            />

            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value === "All"
                    ? "All"
                    : (e.target.value as DeductionStatus),
                )
              }
              options={[
                { label: "All", value: "All" },
                { label: "Pending", value: "Pending" },
                { label: "Partial", value: "Partial" },
                { label: "Cleared", value: "Cleared" },
              ]}
              containerClassName="w-40"
            />

            <div className="ml-auto min-w-[220px] flex-1">
              <InputField
                label="Search"
                placeholder="Farmer / code / description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <DataTable
          data={filteredDeductions}
          columns={columns}
          keyField="_id"
          striped
          dense
          emptyMessage="No deductions found for selected filters."
        />
      </div>

      {/* Adjust modal */}
      {adjustDeduction && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border border-[#E9E2C8] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E9E2C8] bg-[#2A9D8F] px-4 py-2">
              <span className="text-sm font-semibold text-white">
                Adjust Deduction – {adjustDeduction.farmerCode}
              </span>
              <button
                type="button"
                onClick={() => setAdjustDeduction(null)}
                className="text-sm text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 px-4 py-4 text-sm text-[#5E503F]">
              <div>
                <div className="font-semibold">
                  {adjustDeduction.farmerName}
                </div>
                <div className="text-xs text-[#5E503F]/70">
                  Category: {adjustDeduction.category}
                </div>
                <div className="text-xs text-[#5E503F]/70">
                  Remaining: ₹ {adjustDeduction.remainingAmount.toFixed(2)}
                </div>
              </div>
              <InputField
                label="Adjustment Amount"
                requiredLabel
                type="number"
                step="0.01"
                min="0"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                leftIcon={<span className="text-xs">₹</span>}
                helperText="Amount to deduct/adjust now (e.g. from current bill)."
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E9E2C8] bg-[#F8F4E3] px-4 py-2">
              <button
                type="button"
                onClick={() => setAdjustDeduction(null)}
                className="rounded-md border border-[#E9E2C8] bg-white px-4 py-1.5 text-xs font-medium text-[#5E503F] hover:bg-[#F8F4E3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyAdjustment}
                className="rounded-md bg-[#2A9D8F] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#247B71]"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Deduction"
        variant="danger"
        description={
          deleteTarget && (
            <div className="space-y-1 text-sm">
              <p>Are you sure you want to delete this deduction?</p>
              <p className="text-xs text-[#5E503F]/70">
                {deleteTarget.date} – {deleteTarget.farmerCode} (
                {deleteTarget.farmerName}) – ₹ {deleteTarget.amount.toFixed(2)}
              </p>
            </div>
          )
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={deleteDeduction}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default DeductionListPage;
