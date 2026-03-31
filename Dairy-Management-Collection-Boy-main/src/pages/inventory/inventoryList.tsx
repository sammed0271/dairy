// src/pages/inventory/inventoryList.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTable, { type DataTableColumn } from "../../components/dataTable";
import StatCard from "../../components/statCard";
import InputField from "../../components/inputField";
import SelectField from "../../components/selectField";
import ConfirmModal from "../../components/confirmModal";
import { useSyncContext } from "../../context/SyncContext";
import {
  dbBulkPut,
  dbDelete,
  dbPut,
  STORE_NAMES,
} from "../../storage/indexDb";
import type { InventoryCategory, InventoryItem } from "../../types/inventory";
import { sellInventoryToFarmer } from "../../axios/inventory_transaction_api";
import { getFarmers } from "../../axios/farmer_api";

import {
  getInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
} from "../../axios/inventory_api";
import toast from "react-hot-toast";

const isNetworkFailure = (error: unknown) =>
  typeof error === "object" && error !== null && !("response" in error);

const isOfflinePlaceholder = (item: InventoryItem) => item._id.startsWith("offline-");

const InventoryListPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    failedQueueItems,
    getCachedFarmers,
    getCachedInventory,
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingCount,
    queueInventoryDelete,
    queueInventorySale,
    queueInventoryUpdate,
    syncNow,
  } = useSyncContext();

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

  const inventorySyncFailures = useMemo(
    () => failedQueueItems.filter((item) => item.entityType === "inventoryItem"),
    [failedQueueItems],
  );

  const loadInventory = React.useCallback(async () => {
    try {
      const cachedItems = await getCachedInventory();
      const pendingItems = cachedItems.filter(
        (item) => item.syncStatus === "pending" || isOfflinePlaceholder(item),
      );

      if (isOnline) {
        const res = await getInventoryItems();
        const syncedItems = res.data.map((item) => ({
          ...item,
          syncStatus: "synced" as const,
        }));

        await dbBulkPut(STORE_NAMES.inventory, syncedItems);

        const merged = [...pendingItems, ...syncedItems].filter(
          (item, index, array) =>
            array.findIndex((candidate) => candidate._id === item._id) === index,
        );
        setItems(merged);
        return;
      }

      setItems(cachedItems);
    } catch (err) {
      console.error("Failed to load inventory:", err);
      const cachedItems = await getCachedInventory();
      setItems(cachedItems);
      toast.error("Loaded cached inventory data.");
    }
  }, [getCachedInventory, isOnline]);

  const loadFarmersData = React.useCallback(async () => {
    try {
      if (isOnline) {
        const res = await getFarmers();
        setFarmers(res.data);
        return;
      }

      const cachedFarmers = await getCachedFarmers();
      setFarmers(cachedFarmers);
    } catch (error) {
      console.error("Failed to load farmers:", error);
      const cachedFarmers = await getCachedFarmers();
      setFarmers(cachedFarmers);
    }
  }, [getCachedFarmers, isOnline]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    void loadFarmersData();
  }, [loadFarmersData]);

  const openSellModal = (item: InventoryItem) => {
    setSellItem(item);
    setSellFarmerId("");
    setSellQty("");
    setPaidAmount("");
    setPaymentMethod("Cash");
  };

  const handleSell = async () => {
    if (!sellItem) return;

    if (isOfflinePlaceholder(sellItem)) {
      toast.error("Sync the new item first before selling it.");
      return;
    }

    const qty = parseFloat(sellQty);
    if (!qty || qty <= 0) {
      toast.error("Enter valid quantity");
      return;
    }

    if ((sellItem.currentStock ?? 0) < qty) {
      toast.error("Insufficient stock");
      return;
    }

    const optimisticItem: InventoryItem = {
      ...sellItem,
      currentStock: sellItem.currentStock - qty,
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString().slice(0, 10),
      syncStatus: isOnline ? "synced" : "pending",
    };

    try {
      if (!isOnline) {
        await queueInventorySale({
          item: optimisticItem,
          payload: {
            farmerId: sellFarmerId,
            itemId: sellItem._id,
            quantity: qty,
            paymentMethod,
            paidAmount: paidAmount ? parseFloat(paidAmount) : 0,
          },
        });
        setItems((prev) =>
          prev.map((item) => (item._id === optimisticItem._id ? optimisticItem : item)),
        );
        setSellItem(null);
        toast.success("Inventory sale queued for sync.");
        return;
      }

      await sellInventoryToFarmer({
        farmerId: sellFarmerId,
        itemId: sellItem._id,
        quantity: qty,
        paymentMethod,
        paidAmount: paidAmount ? parseFloat(paidAmount) : 0,
      });

      toast.success("Item sold to farmer");

      // refresh inventory list
      await loadInventory();

      setSellItem(null);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      if (isNetworkFailure(err)) {
        await queueInventorySale({
          item: {
            ...optimisticItem,
            syncStatus: "pending",
          },
          payload: {
            farmerId: sellFarmerId,
            itemId: sellItem._id,
            quantity: qty,
            paymentMethod,
            paidAmount: paidAmount ? parseFloat(paidAmount) : 0,
          },
        });
        setItems((prev) =>
          prev.map((item) =>
            item._id === optimisticItem._id
              ? { ...optimisticItem, syncStatus: "pending" }
              : item,
          ),
        );
        setSellItem(null);
        toast.success("Network unavailable. Sale saved offline.");
      } else {
        toast.error("Failed to sell item");
      }
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

    if (isOfflinePlaceholder(stockModalItem)) {
      toast.error("Sync the new item first before changing stock.");
      return;
    }

    const qty = parseFloat(stockQty);
    if (!qty || qty <= 0) {
      toast.error("Enter quantity greater than 0.");
      return;
    }

    const newStock =
      stockMode === "in"
        ? stockModalItem.currentStock + qty
        : stockModalItem.currentStock - qty;

    const updatedItem: InventoryItem = {
      ...stockModalItem,
      currentStock: newStock,
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString().slice(0, 10),
      syncStatus: isOnline ? "synced" : "pending",
    };

    try {
      if (!isOnline) {
        await queueInventoryUpdate({
          item: updatedItem,
          payload: {
            id: stockModalItem._id,
            fields: {
              currentStock: newStock,
            },
          },
        });

        setItems((prev) =>
          prev.map((item) => (item._id === updatedItem._id ? updatedItem : item)),
        );
        setStockModalItem(null);
        toast.success("Stock change queued for sync.");
        return;
      }

      const res = await updateInventoryItem(stockModalItem._id, {
        currentStock: newStock,
      });

      await dbPut(STORE_NAMES.inventory, {
        ...res.data,
        syncStatus: "synced",
      });

      setItems((prev) =>
        prev.map((i) =>
          i._id === res.data._id ? { ...res.data, syncStatus: "synced" } : i,
        ),
      );

      setStockModalItem(null);
    } catch (err) {
      console.error("Stock update failed:", err);

      if (isNetworkFailure(err)) {
        await queueInventoryUpdate({
          item: {
            ...updatedItem,
            syncStatus: "pending",
          },
          payload: {
            id: stockModalItem._id,
            fields: {
              currentStock: newStock,
            },
          },
        });
        setItems((prev) =>
          prev.map((item) =>
            item._id === updatedItem._id
              ? { ...updatedItem, syncStatus: "pending" }
              : item,
          ),
        );
        setStockModalItem(null);
        toast.success("Network unavailable. Stock change saved offline.");
      } else {
        toast.error("Failed to update stock");
      }
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

    if (isOfflinePlaceholder(editItem)) {
      toast.error("Sync the new item first before editing it.");
      return;
    }

    const updatedFields = {
      name: editName.trim(),
      category: editCategory,
      unit: editUnit.trim(),
      minStock: parseFloat(editMinStock) || 0,
      purchaseRate: editPurchaseRate ? parseFloat(editPurchaseRate) : undefined,
      sellingRate: editSellingRate ? parseFloat(editSellingRate) : undefined,
    };

    const queuedItem: InventoryItem = {
      ...editItem,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString().slice(0, 10),
      syncStatus: isOnline ? "synced" : "pending",
    };

    try {
      if (!isOnline) {
        await queueInventoryUpdate({
          item: queuedItem,
          payload: {
            id: editItem._id,
            fields: updatedFields,
          },
        });

        setItems((prev) =>
          prev.map((item) => (item._id === queuedItem._id ? queuedItem : item)),
        );
        toast.success("Inventory edit queued for sync");
        setEditItem(null);
        return;
      }

      const res = await updateInventoryItem(editItem._id, updatedFields);

      await dbPut(STORE_NAMES.inventory, {
        ...res.data,
        syncStatus: "synced",
      });

      setItems((prev) =>
        prev.map((i) =>
          i._id === res.data._id ? { ...res.data, syncStatus: "synced" } : i,
        ),
      );
      toast.success("Inventory item updated successfully");

      setEditItem(null);
    } catch (err) {
      console.error("Edit failed:", err);

      if (isNetworkFailure(err)) {
        await queueInventoryUpdate({
          item: {
            ...queuedItem,
            syncStatus: "pending",
          },
          payload: {
            id: editItem._id,
            fields: updatedFields,
          },
        });
        setItems((prev) =>
          prev.map((item) =>
            item._id === queuedItem._id
              ? { ...queuedItem, syncStatus: "pending" }
              : item,
          ),
        );
        toast.success("Network unavailable. Inventory edit saved offline.");
        setEditItem(null);
      } else {
        toast.error("Failed to save changes");
      }
    }
  };

  // ---------- delete ----------

  const deleteItem = async () => {
    if (!deleteTarget) return;

    if (isOfflinePlaceholder(deleteTarget)) {
      toast.error("Sync the new item first before deleting it.");
      return;
    }

    try {
      if (!isOnline) {
        await queueInventoryDelete({
          itemId: deleteTarget._id,
          payload: {
            id: deleteTarget._id,
          },
        });
        setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
        toast.success("Inventory delete queued for sync");
        setDeleteTarget(null);
        return;
      }

      await deleteInventoryItem(deleteTarget._id);
      await dbDelete(STORE_NAMES.inventory, deleteTarget._id);
      setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
      toast.success("Inventory item deleted");

      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);

      if (isNetworkFailure(err)) {
        await queueInventoryDelete({
          itemId: deleteTarget._id,
          payload: {
            id: deleteTarget._id,
          },
        });
        setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
        toast.success("Network unavailable. Delete saved offline.");
        setDeleteTarget(null);
      } else {
        toast.error("Failed to delete item");
      }
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
      id: "sync",
      header: "Sync",
      align: "center",
      cell: (row) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
            row.syncStatus === "pending"
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {row.syncStatus === "pending" ? "Pending" : "Synced"}
        </span>
      ),
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
            disabled={isOfflinePlaceholder(row)}
            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-[#2A9D8F] hover:bg-[#F8F4E3]"
          >
            Stock In
          </button>
          <button
            type="button"
            onClick={() => openStockModal(row, "out")}
            disabled={isOfflinePlaceholder(row)}
            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-[#E76F51] hover:bg-[#F8F4E3]"
          >
            Stock Out
          </button>

          <button
            type="button"
            onClick={() => openEdit(row)}
            disabled={isOfflinePlaceholder(row)}
            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-[#5E503F] hover:bg-[#F8F4E3]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            disabled={isOfflinePlaceholder(row)}
            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-[#E76F51] hover:bg-[#E76F51]/10"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => openSellModal(row)}
            disabled={!isOnline || isOfflinePlaceholder(row)}
            className="rounded-md bg-[#2A9D8F] px-2 py-1 text-white disabled:opacity-60"
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

        <div className="rounded-xl border border-[#E9E2C8] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#5E503F]/70">
              <span
                className={`rounded-full px-2 py-1 ${
                  isOnline
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
              </span>
              <span>{pendingCount} pending sync</span>
              <span>{inventorySyncFailures.length} failed inventory actions</span>
              <span>
                Last sync:{" "}
                {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : "Not synced yet"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={!isOnline || isSyncing}
              className="rounded-md border border-[#E9E2C8] bg-white px-3 py-2 text-xs font-medium text-[#247B71] disabled:opacity-60"
            >
              {isSyncing ? "Syncing..." : "Sync now"}
            </button>
          </div>

          {inventorySyncFailures.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="font-semibold">Sync diagnostics</div>
              <div className="mt-1">
                {inventorySyncFailures
                  .slice(0, 3)
                  .map((item) => item.lastError || "Sync failed")
                  .join(" | ")}
              </div>
            </div>
          )}
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
