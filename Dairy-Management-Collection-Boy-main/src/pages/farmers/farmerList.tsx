import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { getCentres } from "../../axios/centre_api";
import { deleteFarmer, transferFarmer, updateFarmer } from "../../axios/farmer_api";
import ConfirmModal from "../../components/confirmModal";
import InputField from "../../components/inputField";
import SelectField from "../../components/selectField";
import StatCard from "../../components/statCard";
import { ROUTES } from "../../constants/routes";
import { useFarmerContext } from "../../context/FarmerContext";
import { useDebounce } from "../../hooks/useDebounce";
import type { Farmer, FarmerStatus, MilkType, MilkTypeUI } from "../../types/farmer";
import { getStoredUser } from "../../utils/auth";

const FarmerListPage: React.FC = () => {
  const navigate = useNavigate();
  const { farmers: allFarmers, reloadFarmers } = useFarmerContext();
  const user = getStoredUser();
  const isSuperadmin = user?.role === "superadmin";

  const [milkFilter, setMilkFilter] = useState<"All" | MilkType>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | FarmerStatus>("All");
  const [search, setSearch] = useState("");
  const [centreFilter, setCentreFilter] = useState("");
  const [centres, setCentres] = useState<
    Array<{ _id: string; name: string; code: string; status: string }>
  >([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  const debounceSearch = useDebounce(search, 300);
  const [deleteTarget, setDeleteTarget] = useState<Farmer | null>(null);
  const [transferTarget, setTransferTarget] = useState<Farmer | null>(null);
  const [transferCentreId, setTransferCentreId] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);

  const [editFarmer, setEditFarmer] = useState<Farmer | null>(null);
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editMilkType, setEditMilkType] = useState<MilkType[]>([]);
  const [editAddress, setEditAddress] = useState("");

  useEffect(() => {
    void reloadFarmers(isSuperadmin && centreFilter ? centreFilter : undefined);
  }, [reloadFarmers, isSuperadmin, centreFilter]);

  useEffect(() => {
    if (!isSuperadmin) {
      return;
    }

    getCentres()
      .then((response) => {
        setCentres(response.data.filter((centre) => centre.status === "active"));
      })
      .catch((error) => {
        console.error("Failed to load centres:", error);
      });
  }, [isSuperadmin]);

  useEffect(() => {
    setCurrentPage(1);
  }, [milkFilter, statusFilter, debounceSearch, centreFilter]);

  const stats = useMemo(() => {
    const total = allFarmers.length;
    const cow = allFarmers.filter((farmer) => farmer.milkType.includes("cow")).length;
    const buffalo = allFarmers.filter((farmer) =>
      farmer.milkType.includes("buffalo"),
    ).length;
    const mix = allFarmers.filter((farmer) => farmer.milkType.includes("mix")).length;
    const active = allFarmers.filter((farmer) => farmer.status === "Active").length;
    const inactive = allFarmers.filter((farmer) => farmer.status === "Inactive").length;

    return { total, cow, buffalo, mix, active, inactive };
  }, [allFarmers]);

  const filteredFarmers = useMemo(() => {
    const term = debounceSearch.trim().toLowerCase();

    return allFarmers.filter((farmer) => {
      const matchesMilk =
        milkFilter === "All" ? true : farmer.milkType.includes(milkFilter);
      const matchesStatus =
        statusFilter === "All" ? true : farmer.status === statusFilter;
      const matchesSearch =
        term.length === 0 ||
        farmer.name.toLowerCase().includes(term) ||
        farmer.code.toLowerCase().includes(term) ||
        farmer.mobile.includes(term);

      return matchesMilk && matchesStatus && matchesSearch;
    });
  }, [allFarmers, debounceSearch, milkFilter, statusFilter]);

  const totalPages = Math.ceil(filteredFarmers.length / itemsPerPage);

  const paginatedFarmers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFarmers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFarmers, currentPage]);

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteFarmer(deleteTarget._id);
      toast.success("Farmer deleted successfully");
      setDeleteTarget(null);
      await reloadFarmers(isSuperadmin && centreFilter ? centreFilter : undefined);
    } catch (error) {
      console.error("Delete farmer failed:", error);
      toast.error("Failed to delete farmer");
    }
  };

  const openEdit = (farmer: Farmer) => {
    setEditFarmer(farmer);
    setEditName(farmer.name);
    setEditMobile(farmer.mobile);
    setEditMilkType(farmer.milkType);
    setEditAddress(farmer.address ?? "");
  };

  const toggleEditMilkType = (type: MilkTypeUI) => {
    setEditMilkType((prev) => {
      if (type === "both") {
        if (prev.includes("cow") && prev.includes("buffalo")) {
          return [];
        }
        return ["cow", "buffalo"];
      }

      if (type === "mix") {
        if (prev.includes("mix")) {
          return prev.filter((value) => value !== "mix");
        }
        return ["mix"];
      }

      let updated = prev.includes(type as MilkType)
        ? prev.filter((value) => value !== type)
        : [...prev, type as MilkType];

      updated = updated.filter((value) => value !== "mix");
      return updated;
    });
  };

  const saveEditFarmer = async () => {
    if (!editFarmer) {
      return;
    }

    if (!editName.trim()) {
      return toast.error("Name required");
    }

    if (!/^\d{10}$/.test(editMobile)) {
      return toast.error("Invalid mobile");
    }

    if (editMilkType.length === 0) {
      return toast.error("Select milk type");
    }

    try {
      await updateFarmer(editFarmer._id, {
        name: editName,
        mobile: editMobile,
        milkType: editMilkType,
        address: editAddress,
      });

      setEditFarmer(null);
      await reloadFarmers(isSuperadmin && centreFilter ? centreFilter : undefined);
      toast.success("Farmer updated successfully");
    } catch {
      toast.error("Failed to update farmer");
    }
  };

  const toggleStatus = async (farmer: Farmer) => {
    try {
      const newStatus = farmer.status === "Active" ? "Inactive" : "Active";
      await updateFarmer(farmer._id, { status: newStatus });
      toast.success(`Farmer marked ${newStatus}`);
      await reloadFarmers(isSuperadmin && centreFilter ? centreFilter : undefined);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const openTransfer = (farmer: Farmer) => {
    setTransferTarget(farmer);
    setTransferCentreId("");
    setTransferNote("");
  };

  const handleTransfer = async () => {
    if (!transferTarget || !transferCentreId) {
      toast.error("Select a target centre");
      return;
    }

    try {
      setTransferSaving(true);
      await transferFarmer(transferTarget._id, {
        toCentreId: transferCentreId,
        note: transferNote,
      });
      toast.success("Farmer transferred successfully");
      setTransferTarget(null);
      setTransferCentreId("");
      setTransferNote("");
      await reloadFarmers(isSuperadmin && centreFilter ? centreFilter : undefined);
    } catch (error) {
      console.error("Transfer farmer failed:", error);
      toast.error("Failed to transfer farmer");
    } finally {
      setTransferSaving(false);
    }
  };

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
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
            Add Farmer
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard title="Total Farmers" value={stats.total} variant="teal" subtitle={undefined} />
          <StatCard title="Cow Milk" value={stats.cow} variant="red" subtitle={undefined} />
          <StatCard
            title="Buffalo Milk"
            value={stats.buffalo}
            variant="blue"
            subtitle={undefined}
          />
          <StatCard title="Mix Milk" value={stats.mix} variant="purple" subtitle={undefined} />
          <StatCard title="Active" value={stats.active} variant="green" subtitle={undefined} />
          <StatCard
            title="Inactive"
            value={stats.inactive}
            variant="orange"
            subtitle={undefined}
          />
        </div>

        <div className="rounded-xl border border-[#E9E2C8] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#5E503F]">Milk Type:</span>
              {(["All", "cow", "buffalo", "mix"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMilkFilter(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    milkFilter === value
                      ? "bg-[#2A9D8F] text-white"
                      : "bg-[#E9E2C8] text-[#5E503F]"
                  }`}
                >
                  {value === "All" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#5E503F]">Status:</span>
              {(["All", "Active", "Inactive"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    statusFilter === value
                      ? "bg-[#2A9D8F] text-white"
                      : "bg-[#E9E2C8] text-[#5E503F]"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            {isSuperadmin && (
              <div className="min-w-[220px]">
                <SelectField
                  label="Centre"
                  value={centreFilter}
                  onChange={(e) => setCentreFilter(e.target.value)}
                  options={[
                    { label: "All centres", value: "" },
                    ...centres.map((centre) => ({
                      label: `${centre.name} (${centre.code})`,
                      value: centre._id,
                    })),
                  ]}
                />
              </div>
            )}

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

        <div className="rounded-xl border border-[#E9E2C8] bg-white shadow-sm">
          <div className="w-full overflow-x-auto scroll-smooth">
            <table className="w-full border-collapse text-sm">
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
                  {isSuperadmin && (
                    <th className="border-b border-[#E9E2C8] px-4 py-2 text-left text-xs font-semibold text-[#5E503F]">
                      Centre
                    </th>
                  )}
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
                      colSpan={isSuperadmin ? 8 : 7}
                      className="px-4 py-6 text-center text-xs text-[#5E503F]/60"
                    >
                      No farmers found.
                    </td>
                  </tr>
                ) : (
                  paginatedFarmers.map((farmer, index) => (
                    <tr
                      key={farmer._id}
                      className={index % 2 === 0 ? "bg-white" : "bg-[#FDFCF8]"}
                    >
                      <td className="border-t border-[#E9E2C8] px-4 py-2">
                        <span className="inline-flex items-center rounded-full bg-[#2A9D8F]/10 px-3 py-1 text-xs font-semibold text-[#2A9D8F]">
                          {farmer.code}
                        </span>
                      </td>
                      <td className="border-t border-[#E9E2C8] px-4 py-2 text-[#5E503F]">
                        {farmer.name}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-4 py-2 text-[#5E503F]">
                        {farmer.mobile}
                      </td>
                      {isSuperadmin && (
                        <td className="border-t border-[#E9E2C8] px-4 py-2 text-[#5E503F]">
                          {farmer.centreId && typeof farmer.centreId === "object"
                            ? `${farmer.centreId.name} (${farmer.centreId.code})`
                            : "Unassigned"}
                        </td>
                      )}
                      <td className="border-t border-[#E9E2C8] px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          {farmer.milkType.map((type) => (
                            <span
                              key={type}
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
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
                          onClick={() => void toggleStatus(farmer)}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition ${
                            farmer.status === "Active"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {farmer.status}
                        </button>
                      </td>
                      <td className="border-t border-[#E9E2C8] px-4 py-2 text-[#5E503F]">
                        {farmer.joinDate}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(farmer)}
                            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </button>

                          {isSuperadmin && (
                            <button
                              type="button"
                              onClick={() => openTransfer(farmer)}
                              className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs text-[#2A9D8F] hover:bg-[#2A9D8F]/10"
                            >
                              Transfer
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(farmer)}
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
          <div className="flex items-center justify-center gap-2 py-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              Prev
            </button>

            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`rounded border px-3 py-1 text-sm ${
                  currentPage === index + 1 ? "bg-[#2A9D8F] text-white" : "bg-white"
                }`}
              >
                {index + 1}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Farmer"
        variant="danger"
        description={
          deleteTarget && (
            <div className="space-y-1 text-sm">
              <p>Are you sure you want to delete this farmer?</p>
              <p className="text-xs text-[#5E503F]/70">
                {deleteTarget.code} - {deleteTarget.name}
              </p>
            </div>
          )
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {editFarmer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border border-[#E9E2C8] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E9E2C8] bg-[#2A9D8F] px-4 py-2">
              <span className="text-sm font-semibold text-white">
                Edit Farmer - {editFarmer.code}
              </span>
              <button
                type="button"
                onClick={() => setEditFarmer(null)}
                className="text-sm text-white/80 hover:text-white"
              >
                x
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

              <div>
                <label className="text-xs font-medium text-[#5E503F]">
                  Milk Type
                </label>
                <div className="mt-2 flex gap-2">
                  {(["cow", "buffalo", "both", "mix"] as MilkTypeUI[]).map(
                    (value) => {
                      const active =
                        value === "both"
                          ? editMilkType.includes("cow") &&
                            editMilkType.includes("buffalo")
                          : editMilkType.includes(value as MilkType);

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleEditMilkType(value)}
                          className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                            active
                              ? "border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#2A9D8F]"
                              : "border-[#E9E2C8]"
                          }`}
                        >
                          {value === "cow" && "Cow"}
                          {value === "buffalo" && "Buffalo"}
                          {value === "both" && "Both"}
                          {value === "mix" && "Mix"}
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
                onClick={() => void saveEditFarmer()}
                className="rounded-md bg-[#2A9D8F] px-4 py-1.5 text-xs text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {transferTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border border-[#E9E2C8] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E9E2C8] bg-[#247B71] px-4 py-2">
              <span className="text-sm font-semibold text-white">
                Transfer Farmer - {transferTarget.code}
              </span>
              <button
                type="button"
                onClick={() => setTransferTarget(null)}
                className="text-sm text-white/80 hover:text-white"
              >
                x
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <p className="text-sm text-[#5E503F]/80">
                Transfer <span className="font-semibold">{transferTarget.name}</span> to a
                different collection centre. Historical milk and billing records will remain
                under their original centre entries.
              </p>

              <SelectField
                label="Target Centre"
                value={transferCentreId}
                onChange={(e) => setTransferCentreId(e.target.value)}
                options={[
                  { label: "Select centre", value: "" },
                  ...centres
                    .filter(
                      (centre) =>
                        !transferTarget.centreId ||
                        typeof transferTarget.centreId !== "object" ||
                        centre._id !== transferTarget.centreId._id,
                    )
                    .map((centre) => ({
                      label: `${centre.name} (${centre.code})`,
                      value: centre._id,
                    })),
                ]}
              />

              <div>
                <label className="text-xs font-medium text-[#5E503F]">Transfer Note</label>
                <textarea
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-[#E9E2C8] px-3 py-2 text-sm text-[#5E503F]"
                  placeholder="Reason for transfer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E9E2C8] bg-[#F8F4E3] px-4 py-2">
              <button
                type="button"
                onClick={() => setTransferTarget(null)}
                className="rounded-md border border-[#E9E2C8] bg-white px-4 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleTransfer()}
                disabled={transferSaving}
                className="rounded-md bg-[#247B71] px-4 py-1.5 text-xs text-white disabled:opacity-70"
              >
                {transferSaving ? "Transferring..." : "Transfer Farmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerListPage;
