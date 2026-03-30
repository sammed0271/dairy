// src/pages/farmers/farmerList.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MilkType, FarmerStatus, MilkTypeUI } from "../../types/farmer";
import type { Farmer } from "../../types/farmer";

import { useDebounce } from "../../hooks/useDebounce";

import InputField from "../../components/inputField";
import StatCard from "../../components/statCard";
import ConfirmModal from "../../components/confirmModal";
import { deleteFarmer } from "../../axios/farmer_api";
import toast from "react-hot-toast";
import { updateFarmer } from "../../axios/farmer_api";

import { ROUTES } from "../../constants/routes";
import { useFarmerContext } from "../../context/FarmerContext";

const FarmerListPage: React.FC = () => {
  const navigate = useNavigate();
  const { farmers: allFarmers, reloadFarmers } = useFarmerContext();

  const [milkFilter, setMilkFilter] = useState<"All" | MilkType>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | FarmerStatus>("All");
  const [search, setSearch] = useState("");

  //Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  //////
  const debounceSearch = useDebounce(search, 300);
  const [deleteTarget, setDeleteTarget] = useState<Farmer | null>(null);

  // edit modal
  const [editFarmer, setEditFarmer] = useState<Farmer | null>(null);
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editMilkType, setEditMilkType] = useState<MilkType[]>([]);
  const [editAddress, setEditAddress] = useState("");

  useEffect(() => {
    reloadFarmers();
  }, [reloadFarmers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [milkFilter, statusFilter, debounceSearch]);
  // ---- Stats ----
  const stats = useMemo(() => {
    const total = allFarmers.length;

    const cow = allFarmers.filter((f) => f.milkType.includes("cow")).length;
    const buffalo = allFarmers.filter((f) =>
      f.milkType.includes("buffalo"),
    ).length;
    const mix = allFarmers.filter((f) => f.milkType.includes("mix")).length;

    const active = allFarmers.filter((f) => f.status === "Active").length;
    const inactive = allFarmers.filter((f) => f.status === "Inactive").length;

    return { total, cow, buffalo, mix, active, inactive };
  }, [allFarmers]);

  // ---- Filtered list ----
  const filteredFarmers = useMemo(() => {
    const term = debounceSearch.trim().toLowerCase();
    return allFarmers.filter((f) => {
      const matchesMilk =
        milkFilter === "All" ? true : f.milkType.includes(milkFilter);

      const matchesStatus =
        statusFilter === "All" ? true : f.status === statusFilter;
      const matchesSearch =
        term.length === 0 ||
        f.name.toLowerCase().includes(term) ||
        f.code.toLowerCase().includes(term) ||
        f.mobile.includes(term);
      return matchesMilk && matchesStatus && matchesSearch;
    });
  }, [allFarmers, milkFilter, statusFilter, debounceSearch]);
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteFarmer(deleteTarget._id);

      toast.success("Farmer deleted successfully");
      setDeleteTarget(null);
      reloadFarmers(); // refresh list
    } catch (err) {
      console.error("Delete farmer failed:", err);
      toast.error("Failed to delete farmer");
    }
  };

  // Edit modal
  const openEdit = (farmer: Farmer) => {
    setEditFarmer(farmer);
    setEditName(farmer.name);
    setEditMobile(farmer.mobile);
    setEditMilkType(farmer.milkType);
    setEditAddress(farmer.address ?? "");
  };

  // Pagination
  const totalPages = Math.ceil(filteredFarmers.length / itemsPerPage);

  const paginatedFarmers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFarmers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFarmers, currentPage]);

  const toggleEditMilkType = (type: MilkTypeUI) => {
    setEditMilkType((prev) => {
      if (type === "both") {
        if (prev.includes("cow") && prev.includes("buffalo")) return [];
        return ["cow", "buffalo"];
      }

      if (type === "mix") {
        if (prev.includes("mix")) return prev.filter((t) => t !== "mix");
        return ["mix"];
      }

      let updated = prev.includes(type as MilkType)
        ? prev.filter((t) => t !== type)
        : [...prev, type as MilkType];

      updated = updated.filter((t) => t !== "mix");

      return updated;
    });
  };

  const saveEditFarmer = async () => {
    if (!editFarmer) return;

    if (!editName.trim()) return toast.error("Name required");
    if (!/^\d{10}$/.test(editMobile)) return toast.error("Invalid mobile");
    if (editMilkType.length === 0) return toast.error("Select milk type");

    try {
      await updateFarmer(editFarmer._id, {
        name: editName,
        mobile: editMobile,
        milkType: editMilkType,
        address: editAddress,
      });

      setEditFarmer(null);
      reloadFarmers();
      toast.success("Farmer updated successfully");
    } catch {
      toast.error("Failed to update farmer");
    }
  };

  // Active - Inactive
  const toggleStatus = async (farmer: Farmer) => {
    try {
      const newStatus = farmer.status === "Active" ? "Inactive" : "Active";

      await updateFarmer(farmer._id, { status: newStatus });

      toast.success(`Farmer marked ${newStatus}`);
      reloadFarmers();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">
              Farmer Management
            </h1>
            <p className="text-sm text-[#5E503F]/70">
              View, filter, edit and manage all farmers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(ROUTES.farmers.add.path)}
            className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#247B71]"
          >
            + Add Farmer
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard
            title="Total Farmers"
            value={stats.total}
            variant="teal"
            subtitle={undefined}
          />
          <StatCard
            title="Cow Milk"
            value={stats.cow}
            variant="red"
            subtitle={undefined}
          />
          <StatCard
            title="Buffalo Milk"
            value={stats.buffalo}
            variant="blue"
            subtitle={undefined}
          />
          <StatCard
            title="Mix Milk"
            value={stats.mix}
            variant="purple"
            subtitle={undefined}
          />
          <StatCard
            title="Active"
            value={stats.active}
            variant="green"
            subtitle={undefined}
          />
          <StatCard
            title="Inactive"
            value={stats.inactive}
            variant="orange"
            subtitle={undefined}
          />
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Milk type filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#5E503F]">
                Milk Type:
              </span>
              <button
                type="button"
                onClick={() => setMilkFilter("All")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  milkFilter === "All"
                    ? "bg-[#2A9D8F] text-white"
                    : "bg-[#E9E2C8] text-[#5E503F]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setMilkFilter("cow")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  milkFilter === "cow"
                    ? "bg-[#2A9D8F] text-white"
                    : "bg-[#E9E2C8] text-[#5E503F]"
                }`}
              >
                Cow
              </button>
              <button
                type="button"
                onClick={() => setMilkFilter("buffalo")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  milkFilter === "buffalo"
                    ? "bg-[#2A9D8F] text-white"
                    : "bg-[#E9E2C8] text-[#5E503F]"
                }`}
              >
                Buffalo
              </button>
              <button
                type="button"
                onClick={() => setMilkFilter("mix")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  milkFilter === "mix"
                    ? "bg-[#2A9D8F] text-white"
                    : "bg-[#E9E2C8] text-[#5E503F]"
                }`}
              >
                Mix
              </button>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#5E503F]">
                Status:
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter("All")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  statusFilter === "All"
                    ? "bg-[#2A9D8F] text-white"
                    : "bg-[#E9E2C8] text-[#5E503F]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Active")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  statusFilter === "Active"
                    ? "bg-[#2A9D8F] text-white"
                    : "bg-[#E9E2C8] text-[#5E503F]"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Inactive")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  statusFilter === "Inactive"
                    ? "bg-[#2A9D8F] text-white"
                    : "bg-[#E9E2C8] text-[#5E503F]"
                }`}
              >
                Inactive
              </button>
            </div>

            {/* Search */}
            <div className="ml-auto min-w-[220px] flex-1">
              <InputField
                label="Search"
                placeholder="Name / code / mobile"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table – simple and perfectly aligned */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white shadow-sm">
          <div className="w-full overflow-x-auto scroll-smooth">
            <table className="w-full border-collapse text-sm">
              {/* min-w-[900px] */}
              <thead className="bg-[#F8F4E3]">
                <tr>
                  <th className="border-b border-[#E9E2C8] px-4 py-2 text-left text-xs font-semibold text-[#5E503F]">
                    Code
                  </th>
                  <th className="border-b border-[#E9E2C8] px-4 py-2 text-left text-xs font-semibold text-[#5E503F]">
                    Name
                  </th>
                  <th className="border-b border-[#E9E2C8] px-4 py-2 text-left text-xs font-semibold text-[#5E503F]">
                    Mobile
                  </th>
                  <th className="border-b border-[#E9E2C8] px-4 py-2 text-left text-xs font-semibold text-[#5E503F]">
                    Milk Type
                  </th>
                  <th className="border-b border-[#E9E2C8] px-4 py-2 text-left text-xs font-semibold text-[#5E503F]">
                    Status
                  </th>
                  <th className="border-b border-[#E9E2C8] px-4 py-2 text-left text-xs font-semibold text-[#5E503F]">
                    Join Date
                  </th>
                  <th className="border-b border-[#E9E2C8] px-4 py-2 text-left text-xs font-semibold text-[#5E503F]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredFarmers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-xs text-[#5E503F]/60"
                    >
                      No farmers found. Click &quot;Add Farmer&quot; to create
                      one.
                    </td>
                  </tr>
                ) : (
                  paginatedFarmers.map((f, index) => (
                    <tr
                      key={f._id}
                      className={index % 2 === 0 ? "bg-white" : "bg-[#FDFCF8]"}
                    >
                      <td className="border-t border-[#E9E2C8] px-4 py-2">
                        <span className="inline-flex items-center rounded-full bg-[#2A9D8F]/10 px-3 py-1 text-xs font-semibold text-[#2A9D8F]">
                          {f.code}
                        </span>
                      </td>
                      <td className="border-t border-[#E9E2C8] px-4 py-2 text-[#5E503F]">
                        {f.name}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-4 py-2 text-[#5E503F]">
                        {f.mobile}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          {f.milkType.map((type) => (
                            <span
                              key={type}
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                                type === "cow"
                                  ? "bg-[#E76F51]/10 text-[#E76F51]"
                                  : type === "buffalo"
                                    ? "bg-[#457B9D]/10 text-[#457B9D]"
                                    : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {type === "cow" && "Cow"}
                              {type === "buffalo" && "Buffalo"}
                              {type === "mix" && "Mix"}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="border-t border-[#E9E2C8] px-4 py-2">
                        <button
                          onClick={() => toggleStatus(f)}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition ${
                            f.status === "Active"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {f.status}
                        </button>
                      </td>
                      <td className="border-t border-[#E9E2C8] px-4 py-2 text-[#5E503F]">
                        {f.joinDate}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(f)}
                            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(f)}
                            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs text-[#E76F51] hover:bg-[#E76F51]/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 py-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              Prev
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 text-sm border rounded ${
                  currentPage === i + 1 ? "bg-[#2A9D8F] text-white" : "bg-white"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm – hooked up later when you implement delete */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Farmer"
        variant="danger"
        description={
          deleteTarget && (
            <div className="space-y-1 text-sm">
              <p>Are you sure you want to delete this farmer?</p>
              <p className="text-xs text-[#5E503F]/70">
                {deleteTarget.code} – {deleteTarget.name}
              </p>
            </div>
          )
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Edit modal */}
      {editFarmer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border border-[#E9E2C8] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E9E2C8] bg-[#2A9D8F] px-4 py-2">
              <span className="text-sm font-semibold text-white">
                Edit Farmer – {editFarmer.code}
              </span>
              <button
                type="button"
                onClick={() => setEditFarmer(null)}
                className="text-sm text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <InputField
                label="Farmer Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <InputField
                label="Mobile"
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
              />

              {/* Milk Type */}
              <div>
                <label className="text-xs font-medium text-[#5E503F]">
                  Milk Type
                </label>
                <div className="mt-2 flex gap-2">
                  {(["cow", "buffalo", "both", "mix"] as MilkTypeUI[]).map(
                    (t) => {
                      const active =
                        t === "both"
                          ? editMilkType.includes("cow") &&
                            editMilkType.includes("buffalo")
                          : editMilkType.includes(t as MilkType);

                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleEditMilkType(t)}
                          className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                            active
                              ? "border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#2A9D8F]"
                              : "border-[#E9E2C8]"
                          }`}
                        >
                          {t === "cow" && "🐄 Cow"}
                          {t === "buffalo" && "🐃 Buffalo"}
                          {t === "both" && "🐄 Both 🐃"}
                          {t === "mix" && "🥛 Mix"}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <textarea
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-[#E9E2C8] px-3 py-2 text-sm"
                placeholder="Address"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E9E2C8] bg-[#F8F4E3] px-4 py-2">
              <button
                type="button"
                onClick={() => setEditFarmer(null)}
                className="rounded-md border border-[#E9E2C8] bg-white px-4 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditFarmer}
                className="rounded-md bg-[#2A9D8F] px-4 py-1.5 text-xs text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerListPage;
