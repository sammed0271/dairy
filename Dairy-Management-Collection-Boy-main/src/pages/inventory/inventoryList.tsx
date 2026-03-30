// src/pages/inventory/inventoryList.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTable, { type DataTableColumn } from "../../components/dataTable";
import StatCard from "../../components/statCard";
import InputField from "../../components/inputField";
import SelectField from "../../components/selectField";
import ConfirmModal from "../../components/confirmModal";
import type { InventoryCategory, InventoryItem } from "../../types/inventory";
import { sellInventoryToFarmer } from "../../axios/inventory_transaction_api";
import { getFarmers } from "../../axios/farmer_api";

import {
  getInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
} from "../../axios/inventory_api";
import toast from "react-hot-toast";

const InventoryListPage: React.FC = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<
    "All" | InventoryCategory
  >("All");
  const [search, setSearch] = useState<string>("");

  // stock in/out modal
  const [stockModalItem, setStockModalItem] = useState<InventoryItem | null>(
    null,
  );
  const [stockMode, setStockMode] = useState<"in" | "out">("in");
  const [stockQty, setStockQty] = useState<string>("");
  const [stockNote, setStockNote] = useState<string>("");

  // edit modal
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<InventoryCategory>("Feed");
  const [editUnit, setEditUnit] = useState("");
  const [editMinStock, setEditMinStock] = useState<string>("0");
  const [editPurchaseRate, setEditPurchaseRate] = useState<string>("");
  const [editSellingRate, setEditSellingRate] = useState<string>("");
  const [sellItem, setSellItem] = useState<InventoryItem | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [farmers, setFarmers] = useState<any[]>([]);
  const [sellFarmerId, setSellFarmerId] = useState("");
  const [sellQty, setSellQty] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "Cash" | "Bill" | "Installment"
  >("Cash");
  const [paidAmount, setPaidAmount] = useState("");

  const [editErrors, setEditErrors] = useState<{
    name?: string;
    unit?: string;
  }>({});

  // delete target
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getInventoryItems();
        setItems(res.data);
      } catch (err) {
        console.error("Failed to load inventory:", err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadFarmers = async () => {
      const res = await getFarmers();
      setFarmers(res.data);
    };
    loadFarmers();
  }, []);

  const openSellModal = (item: InventoryItem) => {
    setSellItem(item);
    setSellFarmerId("");
    setSellQty("");
    setPaidAmount("");
    setPaymentMethod("Cash");
  };

  const handleSell = async () => {
    if (!sellItem) return;

    const qty = parseFloat(sellQty);
    if (!qty || qty <= 0) {
      toast.error("Enter valid quantity");
      return;
    }

    try {
      await sellInventoryToFarmer({
        farmerId: sellFarmerId,
        itemId: sellItem._id,
        quantity: qty,
        paymentMethod,
        paidAmount: paidAmount ? parseFloat(paidAmount) : 0,
      });

      toast.success("Item sold to farmer");

      // refresh inventory list
      const res = await getInventoryItems();
      setItems(res.data);

      setSellItem(null);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error("Failed to sell item");
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const matchCat =
        categoryFilter === "All" ? true : i.category === categoryFilter;
      const term = search.trim().toLowerCase();
      const matchSearch =
        term.length === 0 ||
        i.name.toLowerCase().includes(term) ||
        i.code.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term);
      return matchCat && matchSearch;
    });
  }, [items, categoryFilter, search]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    let lowStock = 0;
    let outStock = 0;
    let stockValue = 0;

    items.forEach((i) => {
      const stock = i.currentStock ?? 0;
      const min = i.minStock ?? 0;

      if (stock <= 0) outStock += 1;
      else if (stock < min) lowStock += 1;

      if (i.purchaseRate != null) {
        stockValue += stock * i.purchaseRate;
      }
    });

    return { totalItems, lowStock, outStock, stockValue };
  }, [items]);

  // ---------- stock in/out ----------

  const openStockModal = (item: InventoryItem, mode: "in" | "out") => {
    setStockModalItem(item);
    setStockMode(mode);
    setStockQty("");
    setStockNote("");
  };

  const applyStockChange = async () => {
    if (!stockModalItem) return;

    const qty = parseFloat(stockQty);
    if (!qty || qty <= 0) {
      toast.error("Enter quantity greater than 0.");
      return;
    }

    const newStock =
      stockMode === "in"
        ? stockModalItem.currentStock + qty
        : stockModalItem.currentStock - qty;

    try {
      const res = await updateInventoryItem(stockModalItem._id, {
        currentStock: newStock,
      });

      setItems((prev) =>
        prev.map((i) => (i._id === res.data._id ? res.data : i)),
      );

      setStockModalItem(null);
    } catch (err) {
      console.error("Stock update failed:", err);
      toast.error("Failed to update stock");
    }
  };

  // ---------- edit item ----------

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.unit);
    setEditMinStock(String(item.minStock));
    setEditPurchaseRate(
      item.purchaseRate != null ? String(item.purchaseRate) : "",
    );
    setEditSellingRate(
      item.sellingRate != null ? String(item.sellingRate) : "",
    );
    setEditErrors({});
  };

  const validateEdit = () => {
    const next: typeof editErrors = {};
    if (!editName.trim()) next.name = "Item name is required.";
    if (!editUnit.trim()) next.unit = "Unit is required.";
    setEditErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveEdit = async () => {
    if (!editItem) return;
    if (!validateEdit()) return;

    try {
      const res = await updateInventoryItem(editItem._id, {
        name: editName.trim(),
        category: editCategory,
        unit: editUnit.trim(),
        minStock: parseFloat(editMinStock) || 0,
        purchaseRate: editPurchaseRate
          ? parseFloat(editPurchaseRate)
          : undefined,
        sellingRate: editSellingRate ? parseFloat(editSellingRate) : undefined,
      });

      setItems((prev) =>
        prev.map((i) => (i._id === res.data._id ? res.data : i)),
      );
      toast.success("Inventory item updated successfully");

      setEditItem(null);
    } catch (err) {
      console.error("Edit failed:", err);
      toast.error("Failed to save changes");
    }
  };

  // ---------- delete ----------

  const deleteItem = async () => {
    if (!deleteTarget) return;

    try {
      await deleteInventoryItem(deleteTarget._id);
      setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
      toast.success("Inventory item deleted");

      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete item");
    }
  };

  // ---------- table columns ----------

  const columns: DataTableColumn<InventoryItem>[] = [
    {
      id: "code",
      header: "Code",
      align: "center",
      accessor: "code",
    },
    {
      id: "name",
      header: "Item Name",
      align: "center",
      accessor: "name",
    },
    {
      id: "category",
      header: "Category",
      align: "center",
      accessor: "category",
    },
    {
      id: "stock",
      header: "Stock",
      align: "center",
      cell: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            (row.currentStock ?? 0) <= 0
              ? "bg-red-100 text-red-700"
              : (row.currentStock ?? 0) < (row.minStock ?? 0)
                ? "bg-[#F4A261]/20 text-[#A45C20]"
                : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {(row.currentStock ?? 0).toFixed(2)} {row.unit}
        </span>
      ),
    },
    {
      id: "minStock",
      header: "Min Stock",
      align: "center",
      cell: (row) => (row.minStock ?? 0).toFixed(2),
    },
    {
      id: "purchaseRate",
      header: "Purchase Rate",
      align: "center",
      cell: (row) =>
        row.purchaseRate != null ? `₹ ${row.purchaseRate.toFixed(2)}` : "-",
    },
    {
      id: "value",
      header: "Stock Value",
      align: "center",
      cell: (row) =>
        row.purchaseRate != null
          ? `₹ ${((row.currentStock ?? 0) * row.purchaseRate).toFixed(2)}`
          : "-",
    },

    {
      id: "updated",
      header: "Last Updated",
      align: "center",
      cell: (row) =>
        row.updatedAt
          ? new Date(row.updatedAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "-",
    },
    {
      id: "actions",
      header: "Actions",
      align: "center",
      cell: (row) => (
        <div className="flex flex-wrap items-center justify-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => openStockModal(row, "in")}
            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-[#2A9D8F] hover:bg-[#F8F4E3]"
          >
            Stock In
          </button>
          <button
            type="button"
            onClick={() => openStockModal(row, "out")}
            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-[#E76F51] hover:bg-[#F8F4E3]"
          >
            Stock Out
          </button>

          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-[#5E503F] hover:bg-[#F8F4E3]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-[#E76F51] hover:bg-[#E76F51]/10"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => openSellModal(row)}
            className="rounded-md border border-[#E9E2C8 px-2 py-1 bg-[#2A9D8F] text-white hover:bg-[#F8F4E3]"
          >
            Sell
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">Inventory</h1>
            <p className="text-sm text-[#5E503F]/70">
              Track cattle feed, cans, reagents and other stock.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/inventory/add")}
            className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#247B71]"
          >
            + Add Item
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Items"
            value={stats.totalItems}
            variant="teal"
            subtitle={undefined}
          />
          <StatCard
            title="Low Stock"
            value={stats.lowStock}
            subtitle="Below minimum level"
            variant="orange"
          />
          <StatCard
            title="Out of Stock"
            value={stats.outStock}
            variant="red"
            subtitle={undefined}
          />
          <StatCard
            title="Stock Value (₹)"
            value={(stats.stockValue ?? 0).toFixed(2)}
            variant="blue"
            subtitle={undefined}
          />
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <SelectField
              label="Category"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value === "All"
                    ? "All"
                    : (e.target.value as InventoryCategory),
                )
              }
              options={[
                { label: "All Categories", value: "All" },
                { label: "Feed", value: "Feed" },
                { label: "Equipment", value: "Equipment" },
                { label: "Testing", value: "Testing" },
                { label: "Stationery", value: "Stationery" },
                { label: "Other", value: "Other" },
              ]}
              containerClassName="w-40"
            />
            <div className="ml-auto min-w-[200px] flex-1">
              <InputField
                label="Search"
                placeholder="Item name / code / category"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <DataTable
          data={filteredItems}
          columns={columns}
          keyField="_id"
          striped
          dense
          emptyMessage="No inventory items found. Add new items to start tracking stock."
        />
      </div>

      {/* Stock in/out modal */}
      {stockModalItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border border-[#E9E2C8] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E9E2C8] bg-[#2A9D8F] px-4 py-2">
              <span className="text-sm font-semibold text-white">
                {stockMode === "in" ? "Stock In" : "Stock Out"} –{" "}
                {stockModalItem.code}
              </span>
              <button
                type="button"
                onClick={() => setStockModalItem(null)}
                className="text-sm text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 px-4 py-4 text-sm text-[#5E503F]">
              <div>
                <div className="font-semibold">{stockModalItem.name}</div>
                <div className="text-xs text-[#5E503F]/70">
                  Current: {(stockModalItem.currentStock ?? 0).toFixed(2)}{" "}
                  {stockModalItem.unit}
                </div>
              </div>
              <InputField
                label="Quantity"
                requiredLabel
                type="number"
                step="0.01"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
              />
              <div>
                <label className="text-xs font-medium text-[#5E503F]">
                  Note (optional)
                </label>
                <textarea
                  value={stockNote}
                  onChange={(e) => setStockNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-[#E9E2C8] bg-white px-3 py-2 text-sm text-[#5E503F] outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                  placeholder={
                    stockMode === "in"
                      ? "e.g. Purchased from vendor"
                      : "e.g. Issued to farmer / damaged"
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E9E2C8] bg-[#F8F4E3] px-4 py-2">
              <button
                type="button"
                onClick={() => setStockModalItem(null)}
                className="rounded-md border border-[#E9E2C8] bg-white px-4 py-1.5 text-xs font-medium text-[#5E503F] hover:bg-[#F8F4E3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyStockChange}
                className="rounded-md bg-[#2A9D8F] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#247B71]"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit item modal */}
      {editItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border border-[#E9E2C8] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E9E2C8] bg-[#2A9D8F] px-4 py-2">
              <span className="text-sm font-semibold text-white">
                Edit Item – {editItem.code}
              </span>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="text-sm text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <InputField
                label="Item Name"
                requiredLabel
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                error={editErrors.name}
              />
              <SelectField
                label="Category"
                value={editCategory}
                onChange={(e) =>
                  setEditCategory(e.target.value as InventoryCategory)
                }
                options={[
                  { label: "Feed", value: "Feed" },
                  { label: "Equipment", value: "Equipment" },
                  { label: "Testing", value: "Testing" },
                  { label: "Stationery", value: "Stationery" },
                  { label: "Other", value: "Other" },
                ]}
              />
              <InputField
                label="Unit"
                requiredLabel
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                error={editErrors.unit}
              />
              <InputField
                label="Minimum Stock"
                type="number"
                step="0.01"
                min="0"
                value={editMinStock}
                onChange={(e) => setEditMinStock(e.target.value)}
              />
              <InputField
                label="Purchase Rate (per unit)"
                type="number"
                step="0.01"
                min="0"
                value={editPurchaseRate}
                onChange={(e) => setEditPurchaseRate(e.target.value)}
                leftIcon={<span className="text-xs">₹</span>}
              />
              <InputField
                label="Selling Rate (per unit)"
                type="number"
                step="0.01"
                min="0"
                value={editSellingRate}
                onChange={(e) => setEditSellingRate(e.target.value)}
                leftIcon={<span className="text-xs">₹</span>}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E9E2C8] bg-[#F8F4E3] px-4 py-2">
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="rounded-md border border-[#E9E2C8] bg-white px-4 py-1.5 text-xs font-medium text-[#5E503F] hover:bg-[#F8F4E3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="rounded-md bg-[#2A9D8F] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#247B71]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Inventory Item"
        variant="danger"
        description={
          deleteTarget && (
            <div className="space-y-1 text-sm">
              <p>Are you sure you want to delete this item?</p>
              <p className="text-xs text-[#5E503F]/70">
                {deleteTarget.code} – {deleteTarget.name}
              </p>
            </div>
          )
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />

      {sellItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border border-[#E9E2C8] bg-white shadow-xl">
            <div className="bg-[#2A9D8F] px-4 py-2 text-white font-semibold">
              Sell Item – {sellItem.name}
            </div>

            <div className="space-y-3 p-4">
              <SelectField
                label="Farmer"
                value={sellFarmerId}
                onChange={(e) => setSellFarmerId(e.target.value)}
                options={[
                  { label: "Select Farmer", value: "" },
                  ...farmers.map((f) => ({
                    label: `${f.code} - ${f.name}`,
                    value: f._id,
                  })),
                ]}
              />

              <InputField
                label="Quantity"
                type="number"
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
              />

              <SelectField
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as "Cash" | "Bill" | "Installment",
                  )
                }
                options={[
                  { label: "Cash", value: "Cash" },
                  { label: "Bill Deduction", value: "Bill" },
                  { label: "Installment", value: "Installment" },
                ]}
              />

              {paymentMethod !== "Bill" && (
                <InputField
                  label="Paid Amount"
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              )}
            </div>

            <div className="flex justify-end gap-2 p-4">
              <button onClick={() => setSellItem(null)}>Cancel</button>
              <button
                onClick={handleSell}
                className="bg-[#2A9D8F] text-white px-4 py-1 rounded"
              >
                Sell
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryListPage;
