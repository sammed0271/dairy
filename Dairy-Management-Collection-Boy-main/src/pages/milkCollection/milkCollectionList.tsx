// src/pages/milkCollection/milkCollectionList.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTable, { type DataTableColumn } from "../../components/dataTable";
import StatCard from "../../components/statCard";
import SelectField from "../../components/selectField";
import InputField from "../../components/inputField";
import ConfirmModal from "../../components/confirmModal";
import type { MilkCollection, MilkShift } from "../../types/milkCollection";
import type { MilkType } from "../../types/farmer";
import { getMilkEntries, deleteMilkEntry } from "../../axios/milk_api";
import toast from "react-hot-toast";

type DateFilterMode = "today" | "all" | "range";

const MilkCollectionListPage: React.FC = () => {
  const navigate = useNavigate();

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [collections, setCollections] = useState<MilkCollection[]>([]);
  const [dateMode, setDateMode] = useState<DateFilterMode>("today");
  const [dateFrom, setDateFrom] = useState<string>(todayISO);
  const [dateTo, setDateTo] = useState<string>(todayISO);
  const [shiftFilter, setShiftFilter] = useState<"All" | MilkShift>("All");
  const [milkFilter, setMilkFilter] = useState<"All" | MilkType>("All");
  const [search, setSearch] = useState<string>("");

  const [deleteTarget, setDeleteTarget] = useState<MilkCollection | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getMilkEntries();
        setCollections(res.data);
      } catch (err) {
        console.error("Failed to load milk collections:", err);
        toast.error("Failed to load milk collection entries");
      }
    };

    load();
  }, []);

  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      // Date filter
      let matchesDate = true;
      if (dateMode === "today") {
        matchesDate = c.date === todayISO;
      } else if (dateMode === "range") {
        if (dateFrom && c.date < dateFrom) matchesDate = false;
        if (dateTo && c.date > dateTo) matchesDate = false;
      }

      if (!matchesDate) return false;

      // Shift
      const matchesShift =
        shiftFilter === "All" ? true : c.shift === shiftFilter;

      // Milk type
      const matchesMilk =
        milkFilter === "All" ? true : c.milkType === milkFilter;

      // Search (farmer name or code)
      const term = search.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        c.farmerName.toLowerCase().includes(term) ||
        c.farmerCode.toLowerCase().includes(term);

      return matchesShift && matchesMilk && matchesSearch;
    });
  }, [
    collections,
    dateMode,
    dateFrom,
    dateTo,
    shiftFilter,
    milkFilter,
    search,
    todayISO,
  ]);

  const totals = useMemo(() => {
    let totalLiters = 0;
    let totalAmount = 0;
    let cowLiters = 0;
    let buffaloLiters = 0;
    let mixLiters = 0;

    filteredCollections.forEach((c) => {
      totalLiters += c.liters;
      totalAmount += c.amount;
      if (c.milkType === "cow") cowLiters += c.liters;
      if (c.milkType === "buffalo") buffaloLiters += c.liters;
      if (c.milkType === "mix") mixLiters += c.liters;
    });

    return { totalLiters, totalAmount, cowLiters, buffaloLiters, mixLiters };
  }, [filteredCollections]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMilkEntry(deleteTarget._id);

      setCollections((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      toast.success("Milk entry deleted successfully");
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete milk entry");
    }
  };

  const columns: DataTableColumn<MilkCollection>[] = [
    {
      id: "date",
      header: "Date",
      accessor: "date",
      align: "center",
      className: "whitespace-nowrap",
    },
    {
      id: "shift",
      header: "Shift",
      align: "center",
      accessor: "shift",
    },
    {
      id: "code",
      header: "Farmer Code",
      align: "center",
      accessor: "farmerCode",
    },
    {
      id: "name",
      header: "Farmer Name",
      align: "center",
      accessor: "farmerName",
    },
    {
      id: "milkType",
      header: "Milk Type",
      align: "center",
      cell: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            row.milkType === "cow"
              ? "bg-[#E76F51]/10 text-[#E76F51]"
              : row.milkType === "buffalo"
                ? "bg-[#457B9D]/10 text-[#457B9D]"
                : "bg-purple-100 text-purple-700"
          }`}
        >
          {row.milkType === "cow" && "🐄 Cow"}
          {row.milkType === "buffalo" && "🐃 Buffalo"}
          {row.milkType === "mix" && "🥛 Mix"}
        </span>
      ),
    },

    {
      id: "liters",
      header: "Liters",
      cell: (row) => row.liters.toFixed(2),
      align: "center",
    },
    {
      id: "fat",
      header: "FAT %",
      cell: (row) => row.fat.toFixed(1),
      align: "center",
    },
    {
      id: "snf",
      header: "SNF %",
      cell: (row) => row.snf.toFixed(1),
      align: "center",
    },
    {
      id: "rate",
      header: "Rate",
      cell: (row) => `₹ ${row.rate.toFixed(2)}`,
      align: "center",
    },
    {
      id: "amount",
      header: "Amount",
      cell: (row) => `₹ ${row.amount.toFixed(2)}`,
      align: "center",
    },
    {
      id: "actions",
      header: "Actions",
      align: "center",
      cell: (row) => (
        <button
          type="button"
          onClick={() => setDeleteTarget(row)}
          className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs text-[#E76F51] hover:bg-[#E76F51]/10"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8F4E3] p-4 sm:p-5 lg:p-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 lg:gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">
              Milk Collection
            </h1>
            <p className="text-sm text-[#5E503F]/70">
              View, filter and manage all milk collection entries.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/milk-collection/entry")}
            className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#247B71]"
          >
            + New Milk Entry
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Total Liters"
            value={totals.totalLiters.toFixed(2)}
            subtitle="Filtered collection"
            variant="teal"
          />
          <StatCard
            title="Cow Milk (L)"
            value={totals.cowLiters.toFixed(2)}
            subtitle="Within current filter"
            variant="red"
          />
          <StatCard
            title="Buffalo Milk (L)"
            value={totals.buffaloLiters.toFixed(2)}
            subtitle="Within current filter"
            variant="blue"
          />
          <StatCard
            title="Mix Milk (L)"
            value={totals.mixLiters.toFixed(2)}
            subtitle="Within current filter"
            variant="purple"
          />

          <StatCard
            title="Total Amount (₹)"
            value={totals.totalAmount.toFixed(2)}
            subtitle="Estimated payout"
            variant="orange"
          />
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date mode */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[#5E503F]">
                Date Filter
              </span>
              <div className="flex gap-2">
                {(["today", "all", "range"] as DateFilterMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDateMode(mode)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                      dateMode === mode
                        ? "bg-[#2A9D8F] text-white"
                        : "bg-[#E9E2C8] text-[#5E503F]"
                    }`}
                  >
                    {mode === "today"
                      ? "Today"
                      : mode === "all"
                        ? "All"
                        : "Range"}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range (only when range) */}
            {dateMode === "range" && (
              <div className="flex items-center gap-2">
                <InputField
                  label="From"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  containerClassName="min-w-[160px]"
                />
                <InputField
                  label="To"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  containerClassName="min-w-[160px]"
                />
              </div>
            )}

            {/* Shift filter */}
            <SelectField
              label="Shift"
              value={shiftFilter}
              onChange={(e) =>
                setShiftFilter(e.target.value as "All" | MilkShift)
              }
              options={[
                { label: "All Shifts", value: "All" },
                { label: "Morning", value: "morning" },
                { label: "Evening", value: "evening" },
              ]}
              containerClassName="w-36"
            />

            {/* Milk type filter */}
            <SelectField
              label="Milk Type"
              value={milkFilter}
              onChange={(e) =>
                setMilkFilter(e.target.value as "All" | MilkType)
              }
              options={[
                { label: "All Types", value: "All" },
                { label: "Cow", value: "cow" },
                { label: "Buffalo", value: "buffalo" },
                { label: "Mix", value: "mix" },
              ]}
              containerClassName="w-36"
            />

            {/* Search */}
            <div className="ml-auto min-w-[200px] flex-1">
              <InputField
                label="Search"
                placeholder="Farmer name / code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <DataTable
          data={filteredCollections}
          columns={columns}
          keyField="_id"
          striped
          dense
          emptyMessage="No milk collection entries for selected filters."
        />
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Milk Entry"
        variant="danger"
        description={
          deleteTarget && (
            <div className="space-y-1 text-sm">
              <p>Are you sure you want to delete this milk collection entry?</p>
              <p className="text-xs text-[#5E503F]/70">
                {deleteTarget.date} – {deleteTarget.shift} –{" "}
                {deleteTarget.farmerCode} ({deleteTarget.farmerName}) –{" "}
                {deleteTarget.liters.toFixed(2)} L
              </p>
            </div>
          )
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default MilkCollectionListPage;
