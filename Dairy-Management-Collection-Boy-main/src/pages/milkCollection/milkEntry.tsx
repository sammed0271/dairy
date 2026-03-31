import React, { useEffect, useMemo, useState } from "react";
import { debounce } from "lodash";
import toast from "react-hot-toast";
import { getFarmers } from "../../axios/farmer_api";
import {
  addMilkEntry,
  deleteMilkEntry,
  getMilkEntries,
  getRateForMilk,
} from "../../axios/milk_api";
import ConfirmModal from "../../components/confirmModal";
import InputField from "../../components/inputField";
import Loader from "../../components/loader";
import { useSyncContext } from "../../context/SyncContext";
import type { Farmer, MilkType } from "../../types/farmer";
import type { MilkCollection, MilkShift } from "../../types/milkCollection";
import MilkContainer from "./MilkContainer";

type DateFilterMode = "day" | "range" | "all";

const getDefaultShift = (): MilkShift => {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : "evening";
};

const addDays = (dateString: string, days: number) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const buildClientGeneratedId = () =>
  `milk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const isNetworkFailure = (error: unknown) =>
  typeof error === "object" && error !== null && !("response" in error);

const MilkEntryPage: React.FC = () => {
  const {
    getCachedFarmers,
    getCachedMilkEntries,
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingCount,
    queueMilkEntry,
    syncNow,
  } = useSyncContext();

  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const tenDaysAgo = useMemo(() => {
    const value = new Date(today);
    value.setDate(value.getDate() - 9);
    return value.toISOString().slice(0, 10);
  }, [today]);

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [collections, setCollections] = useState<MilkCollection[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [date, setDate] = useState(todayISO);
  const [shift, setShift] = useState<MilkShift>(getDefaultShift());
  const [farmerId, setFarmerId] = useState("");
  const [liters, setLiters] = useState("");
  const [fat, setFat] = useState("");
  const [snf, setSnf] = useState("");
  const [rate, setRate] = useState("0.00");
  const [milkType, setMilkType] = useState<MilkType | null>(null);
  const [remarks, setRemarks] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [farmerSearch, setFarmerSearch] = useState("");
  const [loadingRate, setLoadingRate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MilkCollection | null>(null);

  const [filterMode, setFilterMode] = useState<DateFilterMode>("day");
  const [filterDate, setFilterDate] = useState(todayISO);
  const [fromDate, setFromDate] = useState(tenDaysAgo);
  const [toDate, setToDate] = useState(todayISO);

  const [errors, setErrors] = useState<{
    date?: string;
    farmerId?: string;
    liters?: string;
    fat?: string;
    snf?: string;
  }>({});

  const selectedFarmer = useMemo(
    () => farmers.find((farmer) => farmer._id === farmerId),
    [farmers, farmerId],
  );

  const activeFarmers = useMemo(
    () => farmers.filter((farmer) => farmer.status === "Active"),
    [farmers],
  );

  const filteredFarmers = useMemo(() => {
    if (!farmerSearch.trim()) {
      return [];
    }

    const query = farmerSearch.toLowerCase();
    return activeFarmers.filter(
      (farmer) =>
        farmer.name.toLowerCase().includes(query) ||
        farmer.code.toLowerCase().includes(query),
    );
  }, [activeFarmers, farmerSearch]);

  const loadData = React.useCallback(async () => {
    setLoadingData(true);
    try {
      if (isOnline) {
        const [farmersResponse, milkResponse] = await Promise.all([
          getFarmers(),
          getMilkEntries(),
        ]);

        setFarmers(farmersResponse.data);
        setCollections(
          milkResponse.data.map((entry) => ({
            ...entry,
            syncStatus: "synced",
          })),
        );
      } else {
        const [cachedFarmers, cachedCollections] = await Promise.all([
          getCachedFarmers(),
          getCachedMilkEntries(),
        ]);
        setFarmers(cachedFarmers);
        setCollections(cachedCollections);
      }
    } catch (error) {
      console.error("Failed to load collection data:", error);
      try {
        const [cachedFarmers, cachedCollections] = await Promise.all([
          getCachedFarmers(),
          getCachedMilkEntries(),
        ]);
        setFarmers(cachedFarmers);
        setCollections(cachedCollections);
        toast.error("Loaded cached data. Working offline.");
      } catch (cacheError) {
        console.error("Failed to load cached collection data:", cacheError);
        toast.error("Failed to load collection data");
      }
    } finally {
      setLoadingData(false);
    }
  }, [getCachedFarmers, getCachedMilkEntries, isOnline]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedFarmer) {
      return;
    }

    if (selectedFarmer.milkType.length === 1) {
      setMilkType(selectedFarmer.milkType[0]);
    }
  }, [selectedFarmer]);

  useEffect(() => {
    if (date === todayISO) {
      setShift(getDefaultShift());
    }
  }, [date, todayISO]);

  useEffect(() => {
    const fetchRate = async () => {
      if (!selectedFarmer || !milkType || !fat || !snf || !date) {
        return;
      }

      try {
        setLoadingRate(true);
        const response = await getRateForMilk({
          milkType,
          fat: Number(fat),
          snf: Number(snf),
          date,
        });
        setRate(Number(response.data.rate || 0).toFixed(2));
      } catch (error) {
        console.error("Rate fetch failed:", error);
        setRate("0.00");
      } finally {
        setLoadingRate(false);
      }
    };

    void fetchRate();
  }, [date, fat, milkType, selectedFarmer, snf]);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setFarmerSearch(value);
      }, 300),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const amount = (parseFloat(liters) || 0) * (parseFloat(rate) || 0);

  const resetForm = () => {
    setDate(todayISO);
    setShift(getDefaultShift());
    setFarmerId("");
    setInputValue("");
    setFarmerSearch("");
    setLiters("");
    setFat("");
    setSnf("");
    setRate("0.00");
    setMilkType(null);
    setRemarks("");
    setErrors({});
  };

  const validate = () => {
    const next: typeof errors = {};
    const litersValue = parseFloat(liters);
    const fatValue = parseFloat(fat);
    const snfValue = parseFloat(snf);

    if (!date) next.date = "Date is required.";
    if (!farmerId) next.farmerId = "Farmer is required.";
    if (!liters || Number.isNaN(litersValue) || litersValue <= 0) {
      next.liters = "Liters must be greater than 0.";
    }
    if (!fat || Number.isNaN(fatValue)) {
      next.fat = "Enter FAT %";
    }
    if (!snf || Number.isNaN(snfValue)) {
      next.snf = "Enter SNF %";
    }
    if (Number(rate) <= 0) {
      toast.error("Rate not available for this FAT/SNF");
    }

    setErrors(next);
    return Object.keys(next).length === 0 && Number(rate) > 0;
  };

  const handleSave = async () => {
    if (!selectedFarmer || !milkType || !validate()) {
      return;
    }

    const clientGeneratedId = buildClientGeneratedId();
    const payload = {
      date,
      shift,
      farmerId: selectedFarmer._id,
      milkType,
      quantity: Number(liters),
      fat: Number(fat),
      snf: Number(snf),
      rate: Number(rate),
      clientGeneratedId,
    };

    const offlineEntry: MilkCollection = {
      _id: `offline-${clientGeneratedId}`,
      date,
      shift,
      farmerId: selectedFarmer._id,
      farmerCode: selectedFarmer.code,
      farmerName: selectedFarmer.name,
      milkType,
      liters: Number(liters),
      fat: Number(fat),
      snf: Number(snf),
      rate: Number(rate),
      amount,
      remarks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clientGeneratedId,
      syncStatus: "pending",
    };

    try {
      setSaving(true);

      if (!isOnline) {
        await queueMilkEntry({ entry: offlineEntry, payload });
        setCollections((prev) => [offlineEntry, ...prev]);
        toast.success("Saved offline. It will sync automatically.");
        resetForm();
        return;
      }

      await addMilkEntry(payload);
      const refreshed = await getMilkEntries();
      setCollections(
        refreshed.data.map((entry) => ({
          ...entry,
          syncStatus: "synced",
        })),
      );
      toast.success("Milk collection saved successfully");
      resetForm();
    } catch (error) {
      console.error("Failed to save milk entry:", error);

      if (isNetworkFailure(error)) {
        await queueMilkEntry({ entry: offlineEntry, payload });
        setCollections((prev) => [offlineEntry, ...prev]);
        toast.success("Network unavailable. Entry saved offline.");
        resetForm();
      } else {
        toast.error("Milk entry already exists for this farmer, date and shift.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteMilkEntry(deleteTarget._id);
      setCollections((prev) => prev.filter((entry) => entry._id !== deleteTarget._id));
      toast.success("Milk entry deleted successfully");
      setDeleteTarget(null);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete milk entry");
    }
  };

  const filteredCollections = useMemo(
    () =>
      collections.filter((entry) => {
        if (filterMode === "day") {
          return entry.date === filterDate;
        }

        if (filterMode === "range") {
          return entry.date >= fromDate && entry.date <= toDate;
        }

        return true;
      }),
    [collections, filterDate, filterMode, fromDate, toDate],
  );

  const totals = useMemo(() => {
    const result = {
      cow: { morning: 0, evening: 0 },
      buffalo: { morning: 0, evening: 0 },
      mix: { morning: 0, evening: 0 },
    };

    filteredCollections.forEach((entry) => {
      result[entry.milkType][entry.shift] += entry.liters;
    });

    return result;
  }, [filteredCollections]);

  const renderContainers = (
    label: string,
    litersValue: number,
    color: string,
  ) => {
    const fullCount = Math.floor(litersValue / 40);
    const runningLiters = +(litersValue % 40).toFixed(1);

    return (
      <div className="flex flex-col items-center">
        <div className="mb-3 text-xs font-semibold text-[#5E503F]">{label}</div>
        <div className="flex h-[150px] items-end justify-center gap-4">
          {fullCount > 0 && (
            <MilkContainer
              filledLiters={40}
              color={color}
              label={`${fullCount} cans`}
            />
          )}
          {runningLiters > 0 && (
            <MilkContainer
              filledLiters={runningLiters}
              color={color}
              label={`${runningLiters} L`}
            />
          )}
          {fullCount === 0 && runningLiters === 0 && (
            <MilkContainer filledLiters={0} color={color} label="0 L" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8F4E3] p-4 sm:p-5 lg:p-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 lg:gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#5E503F]">Milk Collection</h1>
          <p className="text-sm text-[#5E503F]/70">
            Record daily milk collection data.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#5E503F]/70">
            <span
              className={`rounded-full px-2 py-1 ${
                isOnline ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
            <span>{pendingCount} pending sync</span>
            <span>
              Last sync:{" "}
              {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : "Not synced yet"}
            </span>
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={!isOnline || isSyncing}
              className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs text-[#247B71] disabled:opacity-60"
            >
              {isSyncing ? "Syncing..." : "Sync now"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
          {loadingData ? (
            <div className="flex items-center justify-center py-10">
              <Loader size="md" message="Loading collection data..." />
            </div>
          ) : farmers.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#5E503F]/70">
              No farmers found. Please sync or add farmers first.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <InputField
                  label="Date"
                  requiredLabel
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  error={errors.date}
                />

                <div>
                  <label className="text-xs font-medium text-[#5E503F]">
                    Shift <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as MilkShift)}
                    className="mt-1 w-full rounded-md border border-[#E9E2C8] bg-white px-3 py-3 text-base text-[#5E503F] outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                  >
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="text-xs font-medium text-[#5E503F]">
                    Farmer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter farmer name or code..."
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      debouncedSearch(e.target.value);
                      setFarmerId("");
                    }}
                    className="mt-1 w-full rounded-md border border-[#E9E2C8] px-3 py-3 text-base outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                  />

                  {farmerSearch.trim() && filteredFarmers.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-[#E9E2C8] bg-white shadow-lg">
                      {filteredFarmers.map((farmer) => (
                        <button
                          key={farmer._id}
                          type="button"
                          onClick={() => {
                            setFarmerId(farmer._id);
                            setFarmerSearch(`${farmer.code} - ${farmer.name}`);
                            setInputValue(`${farmer.code} - ${farmer.name}`);
                          }}
                          className="block w-full px-3 py-3 text-left text-sm hover:bg-[#F8F4E3]"
                        >
                          {farmer.code} - {farmer.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {errors.farmerId && (
                    <p className="mt-1 text-xs text-red-600">{errors.farmerId}</p>
                  )}
                </div>
              </div>

              {selectedFarmer && selectedFarmer.milkType.length > 1 && (
                <div className="mt-4">
                  <span className="text-xs font-medium text-[#5E503F]">
                    Milk Type <span className="text-red-500">*</span>
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:flex">
                    {selectedFarmer.milkType.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMilkType(value)}
                        className={`flex-1 rounded-md border px-3 py-3 text-base font-medium ${
                          milkType === value
                            ? "border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#2A9D8F]"
                            : "border-[#E9E2C8] text-[#5E503F]"
                        }`}
                      >
                        {value === "cow" && "Cow Milk"}
                        {value === "buffalo" && "Buffalo Milk"}
                        {value === "mix" && "Mix Milk"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InputField
                  label="Farmer Code"
                  value={selectedFarmer?.code ?? ""}
                  readOnly
                />
                <InputField
                  label="Liters"
                  requiredLabel
                  type="number"
                  step="0.01"
                  min="0"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  error={errors.liters}
                  inputClassName="text-lg font-semibold"
                />
                <InputField
                  label="Fat %"
                  requiredLabel
                  type="number"
                  step="0.1"
                  min="0"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  error={errors.fat}
                  inputClassName="text-lg font-semibold"
                />
                <InputField
                  label="SNF %"
                  requiredLabel
                  type="number"
                  step="0.1"
                  min="0"
                  value={snf}
                  onChange={(e) => setSnf(e.target.value)}
                  error={errors.snf}
                  inputClassName="text-lg font-semibold"
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InputField
                  label="Rate"
                  value={loadingRate ? "Fetching..." : rate}
                  readOnly
                />
                <InputField
                  label="Total Amount"
                  value={amount.toFixed(2)}
                  readOnly
                />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="w-full rounded-md bg-[#2A9D8F] px-4 py-4 text-base font-medium text-white shadow hover:bg-[#247B71] disabled:opacity-70"
                  >
                    {saving ? "Saving..." : isOnline ? "Save Collection" : "Save Offline"}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-[#5E503F]">
                  Remarks (optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-[#E9E2C8] bg-white px-3 py-2 text-sm text-[#5E503F] outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                  placeholder="Any notes about this collection..."
                />
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold text-[#5E503F]">
            Milk Can Platform (40L each)
          </h2>

          <div className="grid min-w-[900px] grid-cols-6 gap-6 overflow-x-auto">
            {renderContainers("Cow Morning", totals.cow.morning, "#E76F51")}
            {renderContainers("Cow Evening", totals.cow.evening, "#F4A261")}
            {renderContainers("Buffalo Morning", totals.buffalo.morning, "#457B9D")}
            {renderContainers("Buffalo Evening", totals.buffalo.evening, "#1D3557")}
            {renderContainers("Mix Morning", totals.mix.morning, "#6D597A")}
            {renderContainers("Mix Evening", totals.mix.evening, "#8E44AD")}
          </div>
        </div>

        <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <h2 className="text-sm font-semibold text-[#5E503F]">Collections</h2>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#5E503F]">Filter:</span>
              {(["day", "range", "all"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    filterMode === mode
                      ? "bg-[#2A9D8F] text-white"
                      : "bg-[#E9E2C8] text-[#5E503F]"
                  }`}
                >
                  {mode === "day" ? "Day" : mode === "range" ? "10 Days" : "All"}
                </button>
              ))}
            </div>

            {filterMode === "day" && (
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="rounded-md border border-[#E9E2C8] bg-white px-3 py-1.5 text-xs text-[#5E503F] outline-none focus:ring-2 focus:ring-[#2A9D8F]"
              />
            )}

            {filterMode === "range" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    const selectedFrom = e.target.value;
                    setFromDate(selectedFrom);
                    setToDate(addDays(selectedFrom, 9));
                  }}
                  className="rounded-md border border-[#E9E2C8] bg-white px-3 py-1.5 text-xs text-[#5E503F] outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    const selectedTo = e.target.value;
                    setToDate(selectedTo);
                    setFromDate(addDays(selectedTo, -9));
                  }}
                  className="rounded-md border border-[#E9E2C8] bg-white px-3 py-1.5 text-xs text-[#5E503F] outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                />
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#E9E2C8]">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-[#F8F4E3]">
                <tr>
                  {[
                    "Date",
                    "Shift",
                    "Farmer Code",
                    "Farmer Name",
                    "Milk Type",
                    "Liters",
                    "Fat %",
                    "SNF %",
                    "Rate",
                    "Total",
                    "Sync",
                    "Actions",
                  ].map((label) => (
                    <th
                      key={label}
                      className="border-b border-[#E9E2C8] px-3 py-2 text-left font-semibold text-[#5E503F]"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCollections.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-6 text-center text-xs text-[#5E503F]/60"
                    >
                      No collections recorded for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredCollections.map((entry, index) => (
                    <tr
                      key={entry._id}
                      className={index % 2 === 0 ? "bg-white" : "bg-[#FDFCF8]"}
                    >
                      <td className="border-t border-[#E9E2C8] px-3 py-2">{entry.date}</td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">{entry.shift}</td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">{entry.farmerCode}</td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">{entry.farmerName}</td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">
                        {entry.milkType}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">{entry.liters.toFixed(2)}</td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">{entry.fat.toFixed(1)}</td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">{entry.snf.toFixed(1)}</td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">{entry.rate.toFixed(2)}</td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">{entry.amount.toFixed(2)}</td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                            entry.syncStatus === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {entry.syncStatus === "pending" ? "Pending" : "Synced"}
                        </span>
                      </td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">
                        {entry.syncStatus === "pending" ? (
                          <span className="text-[11px] text-[#5E503F]/60">Queued</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(entry)}
                            className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs text-[#E76F51] hover:bg-[#E76F51]/10"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Milk Entry"
        variant="danger"
        description={
          deleteTarget && (
            <div className="space-y-1 text-sm">
              <p>Are you sure you want to delete this milk collection entry?</p>
              <p className="text-xs text-[#5E503F]/70">
                {deleteTarget.date} - {deleteTarget.shift} - {deleteTarget.farmerCode} (
                {deleteTarget.farmerName}) - {deleteTarget.liters.toFixed(2)} L
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

export default MilkEntryPage;
