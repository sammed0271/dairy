// src/pages/milkCollection/milkEntry.tsx
import React, { useEffect, useMemo, useState } from "react";
import { debounce } from "lodash";
import InputField from "../../../components/inputField";
import Loader from "../../../components/loader";
import { isReallyOnline } from "../../../utils/networkService";
import { getFarmers } from "../../../axios/farmer_api";
import {
  addMilkEntry,
  deleteMilkEntry,
  getMachineData,
  getMilkEntries,
  getRateConfig,
  getRateForMilk,
  updateMilkEntry,
  type RateConfig,
} from "../../../axios/milk_api";
import MilkContainer from "./MilkContainer";

import type { MilkCollection, MilkShift } from "../../../types/milkCollection";
import type { Farmer, MilkType } from "../../../types/farmer";
import toast from "react-hot-toast";
import ConfirmModal from "../../../components/confirmModal";
import { saveOfflineMilk } from "../../../utils/offlineMilk";
import { syncMilkData } from "../../../utils/syncMilk";
import {
  saveFarmers,
  getFarmersLocal,
  saveMilkList,
  getMilkListLocal,
} from "../../../utils/offlineData";

type DateFilterMode = "day" | "range" | "all";

const getDefaultShift = (): MilkShift => {
  const now = new Date();
  const hour = now.getHours(); // 0–23

  return hour < 12 ? "morning" : "evening";
};

const addDays = (dateString: string, days: number) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const MilkEntryPage: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const [inputValue, setInputValue] = useState("");
  const [rateConfig, setRateConfig] = useState<RateConfig | null>(null);
  // Farmers
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loadingFarmers, setLoadingFarmers] = useState(true);

  // Collections
  const [collections, setCollections] = useState<MilkCollection[]>([]);

  // Farmer Code
  const [codeInput, setCodeInput] = useState("");
  const [codeSearch, setCodeSearch] = useState("");

  //Mode
  const [mode, setMode] = useState<"MANUAL" | "AUTO">("MANUAL");
  const [machineStatus, setMachineStatus] = useState("DISCONNECTED");

  // Form state
  const [date, setDate] = useState<string>(todayISO);
  const [shift, setShift] = useState<MilkShift>(() => getDefaultShift());
  const [farmerId, setFarmerId] = useState<string>("");
  const [liters, setLiters] = useState<string>("");
  const [fat, setFat] = useState<string>("");
  const [snf, setSnf] = useState<string>("");
  const [rate, setRate] = useState<string>("0.00");
  const [loadingRate, setLoadingRate] = useState(false);
  const [milkType, setMilkType] = useState<MilkType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MilkCollection | null>(null);
  const [farmerSearch, setFarmerSearch] = useState("");
  const [remarks, setRemarks] = useState<string>("");

  //online
  const [isOnline, setIsOnline] = useState(true);
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(today.getDate() - 9);

  const format = (d: Date) => d.toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(format(tenDaysAgo));
  const [toDate, setToDate] = useState(format(today));

  const [errors, setErrors] = useState<{
    date?: string;
    farmerId?: string;
    liters?: string;
    fat?: string;
    snf?: string;
    rate?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  // Filter state for list
  const [filterMode, setFilterMode] = useState<DateFilterMode>("day");
  const [filterDate, setFilterDate] = useState<string>(todayISO);
  // const [filterMonth, setFilterMonth] = useState<string>(todayMonth);
  // const [filterFrom, setFilterFrom] = useState<string>(todayISO);
  // const [filterTo, setFilterTo] = useState<string>(todayISO);

  const selectedFarmer = useMemo(
    () => farmers.find((f) => f._id === farmerId),
    [farmers, farmerId],
  );

  const activeFarmers = useMemo(
    () => farmers.filter((f) => f.status === "Active"),
    [farmers],
  );

  const filteredFarmers = useMemo(() => {
    if (!farmerSearch.trim()) return [];

    const q = farmerSearch.toLowerCase();

    return activeFarmers
      .filter(
        (f) =>
          f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        // prioritize exact code match
        if (a.code.toLowerCase() === q) return -1;
        if (b.code.toLowerCase() === q) return 1;
        return 0;
      });
  }, [activeFarmers, farmerSearch]);

  const load = async () => {
    let farmersData: Farmer[] = [];
    let milkData: MilkCollection[] = [];

    try {
      if (await isReallyOnline()) {
        const [farmerRes, milkRes] = await Promise.all([
          getFarmers(),
          getMilkEntries(),
        ]);

        farmersData = farmerRes.data;
        milkData = milkRes.data;

        // ✅ save for offline
        saveFarmers(farmersData);
        saveMilkList(milkData);
      } else {
        throw new Error("Offline");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // console.log("Using offline fallback", err);

      farmersData = getFarmersLocal();
      milkData = getMilkListLocal();

      if (!farmersData.length) {
        toast.error("No offline data available ❌");
      } else {
        toast("Offline mode 📦");
      }
    } finally {
      // ✅ ALWAYS RUN
      setFarmers(farmersData);
      setCollections(milkData);
      setLoadingFarmers(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  //reload when return online
  useEffect(() => {
    const handleOnline = async () => {
      const real = await isReallyOnline();

      if (real) {
        toast.success("Back online. Syncing data... 🔄");
        syncMilkData();
        load();
      } else {
        console.log("Fake online (no internet)");
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!selectedFarmer) return;

    if (selectedFarmer.milkType.length === 1) {
      setMilkType(selectedFarmer.milkType[0]);
    } else {
      // keep previous selection OR set default only once
      setMilkType((prev) => prev ?? selectedFarmer.milkType[0]);
    }
  }, [selectedFarmer]);

  useEffect(() => {
    if (selectedFarmer && selectedFarmer.status !== "Active") {
      toast.error("Selected farmer is inactive");
      setFarmerId("");
      setMilkType(null);
    }
  }, [selectedFarmer]);

  useEffect(() => {
    if (date === todayISO) {
      setShift(getDefaultShift());
    }
  }, [date, todayISO]);

  useEffect(() => {
    if (!selectedFarmer || !milkType || !fat || !snf || !date) return;

    const roundToStep = (value: number, step: number) =>
      +(Math.round(value / step) * step).toFixed(1);

    const fatRounded = roundToStep(Number(fat), 0.1);
    const snfRounded = roundToStep(Number(snf), 0.1);

    const calculateRateOffline = () => {
      if (!rateConfig) return "0.00";

      const fatIndex = rateConfig.fats.findIndex(
        (f) => f.toFixed(1) === fatRounded.toFixed(1),
      );

      const snfIndex = rateConfig.snfs.findIndex(
        (s) => s.toFixed(1) === snfRounded.toFixed(1),
      );

      if (fatIndex === -1 || snfIndex === -1) return "0.00";

      if (!rateConfig || !rateConfig.rateChart) {
        return "0.00";
      }

      const rate = rateConfig.rateChart[fatIndex]?.[snfIndex] ?? 0;
      return rate.toFixed(2);
    };

    const fetchRate = async () => {
      if (await isReallyOnline()) {
        try {
          setLoadingRate(true);

          const res = await getRateForMilk({
            milkType,
            fat: fatRounded,
            snf: snfRounded,
            date,
          });

          setRate(res.data.rate.toFixed(2));
        } catch {
          setRate("0.00");
        } finally {
          setLoadingRate(false);
        }
      } else {
        // 🔥 OFFLINE CALCULATION
        const offlineRate = calculateRateOffline();
        setRate(offlineRate);
      }
    };

    fetchRate();
  }, [selectedFarmer, fat, snf, date, milkType, rateConfig, isOnline]);

  const handleSave = async () => {
    if (!(await validate()) || !selectedFarmer) return;

    if (selectedFarmer.status !== "Active") {
      toast.error("Cannot add milk collection for inactive farmer");
      return;
    }

    if (!milkType) {
      toast.error("Please select milk type");
      return;
    }

    try {
      setSaving(true);

      const roundToStep = (value: number, step: number) =>
        +(Math.round(value / step) * step).toFixed(1);

      const fatRounded = roundToStep(Number(fat), 0.1);
      const snfRounded = roundToStep(Number(snf), 0.1);

      const payload = {
        date,
        shift,
        farmerId: selectedFarmer._id,
        milkType,
        quantity: Number(liters),
        fat: fatRounded,
        snf: snfRounded,
        rate: Number(rate),
        mode,
      };
      if (mode === "AUTO" && machineStatus !== "CONNECTED") {
        toast.error("Machine not connected");
        return;
      }
      // MAIN CHANGE HERE
      if (editTarget) {
        const online = await isReallyOnline();

        if (online) {
          try {
            await updateMilkEntry(editTarget._id, payload);
            toast.success("Updated successfully");
          } catch {
            saveOfflineMilk({ ...payload, _offlineId: editTarget._id });
            toast("Updated offline ⚡");
          }
        } else {
          saveOfflineMilk({ ...payload, _offlineId: editTarget._id });
          toast("Updated offline 📦");
        }

        setEditTarget(null);
      } else {
        // await addMilkEntry(payload);
        if (await isReallyOnline()) {
          try {
            await addMilkEntry(payload);
            toast.success("Saved successfully");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
          } catch (err: any) {
            // fallback to offline
            saveOfflineMilk(payload);
            toast("Saved offline. Will sync later ⚡");
          }
        } else {
          saveOfflineMilk(payload);

          const offlineEntry: MilkCollection = {
            _id: "offline-" + Date.now(),
            date,
            shift,
            farmerId: selectedFarmer._id,
            farmerName: selectedFarmer.name,
            farmerCode: selectedFarmer.code,
            milkType,
            liters: payload.quantity,
            fat: payload.fat,
            snf: payload.snf,
            rate: payload.rate,
            amount: payload.quantity * payload.rate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            original: undefined,
          };

          setCollections((prev) => [...prev, offlineEntry]);

          toast("No internet. Saved offline 📦");
        }
      }

      if (await isReallyOnline()) {
        const refreshed = await getMilkEntries();
        setCollections(refreshed.data);
        saveMilkList(refreshed.data); // save for offline
      } else {
        const localMilk = getMilkListLocal();
        setCollections(localMilk);
      }

      resetForm();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Failed to save milk entry:", err);

      // 🔥 show real backend error
      toast.error(
        err.response?.data?.message ||
        "Milk entry already exists for this farmer, date and shift.",
      );
    } finally {
      setSaving(false);
    }
  };

  // const prevOnlineRef = useRef<boolean>(false);

  // useEffect(() => {
  //   if (isOnline && !prevOnlineRef.current) {
  //     syncMilkData();
  //   }

  //   prevOnlineRef.current = isOnline;
  // }, [isOnline]);

  const litersNum = parseFloat(liters) || 0;
  const rateNum = parseFloat(rate) || 0;
  const amount = litersNum * rateNum;

  // ---------- VALIDATION ----------
  const validate = async () => {
    const next: typeof errors = {};
    const litersVal = parseFloat(liters);
    const fatVal = parseFloat(fat);
    const snfVal = parseFloat(snf);
    if (Number(rate) <= 0 && (await isReallyOnline())) {
      toast.error("Rate not available for this FAT/SNF");
      return false;
    }

    if (!date) next.date = "Date is required.";
    if (!farmerId) next.farmerId = "Farmer is required.";
    if (!liters || litersVal <= 0 || Number.isNaN(litersVal)) {
      next.liters = "Liters must be greater than 0.";
    }
    if (mode !== "AUTO") {
      if (!fat || Number.isNaN(fatVal)) next.fat = "Enter FAT%";
      if (!snf || Number.isNaN(snfVal)) next.snf = "Enter SNF%";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const resetForm = () => {
    setDate(todayISO);
    setShift("morning");
    setFarmerId("");
    setInputValue(""); // ✅ add
    setFarmerSearch(""); // ✅ add
    setLiters("");
    setFat("");
    setSnf("");
    setRate("0.00");
    setRemarks("");
    setErrors({});
  };

  // ---------- FILTERED COLLECTIONS ----------

  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      if (filterMode === "day") {
        return c.date === filterDate;
      }

      if (filterMode === "range") {
        if (fromDate && c.date < fromDate) return false;
        if (toDate && c.date > toDate) return false;
        return true;
      }

      return true; // all
    });
  }, [collections, filterMode, filterDate, fromDate, toDate]);

  //Milk Container
  const totals = useMemo(() => {
    const result = {
      cow: { morning: 0, evening: 0 },
      buffalo: { morning: 0, evening: 0 },
      mix: { morning: 0, evening: 0 },
    };

    filteredCollections.forEach((c) => {
      result[c.milkType][c.shift] += c.liters;
    });

    return result;
  }, [filteredCollections]);

  const CONTAINER_CAPACITY = 40;

  const generateContainers = (liters: number) => {
    const full = Math.floor(liters / CONTAINER_CAPACITY);
    const remaining = +(liters % CONTAINER_CAPACITY).toFixed(1);

    return {
      fullCount: full,
      runningLiters: remaining,
      isEmpty: liters === 0,
    };
  };

  const cowMorning = generateContainers(totals.cow.morning);
  const cowEvening = generateContainers(totals.cow.evening);
  const buffaloMorning = generateContainers(totals.buffalo.morning);
  const buffaloEvening = generateContainers(totals.buffalo.evening);
  const mixMorning = generateContainers(totals.mix.morning);
  const mixEvening = generateContainers(totals.mix.evening);

  // ---------- UI derived ----------
  // const farmerCode = selectedFarmer?.code ?? "";

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const online = await isReallyOnline();

    try {
      if (online) {
        await deleteMilkEntry(deleteTarget._id);
      }

      // ✅ ALWAYS update local UI
      const updated = collections.filter((c) => c._id !== deleteTarget._id);

      setCollections(updated);
      saveMilkList(updated);

      toast.success("Deleted");
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Delete failed");
    }
  };

  //farmer name Debouncing
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setFarmerSearch(value);
      }, 500),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  //farmer code Debouncing
  const debouncedCodeSearch = useMemo(() => {
    return debounce((value: string) => {
      setCodeSearch(value);
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      debouncedCodeSearch.cancel();
    };
  }, [debouncedCodeSearch]);

  const filteredByCode = useMemo(() => {
    if (!codeSearch.trim()) return [];

    const q = codeSearch.toLowerCase();

    return activeFarmers.filter((f) => f.code.toLowerCase().includes(q));
  }, [activeFarmers, codeSearch]);

  useEffect(() => {
    if (selectedFarmer) {
      setCodeInput(selectedFarmer.code);
    }
  }, [selectedFarmer]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MilkSection = ({ title, data, color }: any) => (
    <div className="flex flex-col items-center w-full">
      <div className="text-xs font-semibold text-[#5E503F]">{title}</div>

      <div className="flex items-end justify-center gap-4 h-[150px]">
        {data.fullCount > 0 && (
          <MilkContainer
            filledLiters={40}
            color={color}
            label={`${data.fullCount} cans`}
          />
        )}

        {data.runningLiters > 0 && (
          <MilkContainer
            filledLiters={data.runningLiters}
            color={color}
            label={`${data.runningLiters} L`}
          />
        )}

        {data.fullCount === 0 && data.runningLiters === 0 && (
          <MilkContainer filledLiters={0} color={color} label="0 L" />
        )}
      </div>

      <div className="mt-3 w-full h-[3px] bg-[#DCCFC0] rounded-full" />
    </div>
  );

  useEffect(() => {
    const fetchConfig = async () => {
      if (!milkType || !date) return;

      if (await isReallyOnline()) {
        try {
          const res = await getRateConfig({ milkType, date });

          // console.log("API RATE CONFIG 👉", res.data); // ✅ CORRECT

          setRateConfig(res.data);

          // ✅ SAVE OFFLINE
          localStorage.setItem(
            `rate_config_${milkType}`,
            JSON.stringify(res.data),
          );
        } catch (err) {
          console.error("Config fetch failed", err);
        }
      } else {
        const local = localStorage.getItem(`rate_config_${milkType}`);
        if (local) {
          const parsed = JSON.parse(local);

          // console.log("OFFLINE RATE CONFIG 👉", parsed); // ✅ ADD THIS

          setRateConfig(parsed);
        }
      }
    };

    fetchConfig();
  }, [milkType, date, isOnline]);

  // update milkCollection
  const [editTarget, setEditTarget] = useState<MilkCollection | null>(null);

  useEffect(() => {
    if (!editTarget) return;

    setDate(editTarget.date);
    setShift(editTarget.shift);
    setFarmerId(editTarget.farmerId);

    // ✅ ADD THESE TWO LINES (MAIN FIX)
    setInputValue(`${editTarget.farmerCode} - ${editTarget.farmerName}`);
    setFarmerSearch(`${editTarget.farmerCode} - ${editTarget.farmerName}`);

    setLiters(editTarget.liters.toString());
    setFat(editTarget.fat.toString());
    setSnf(editTarget.snf.toString());
    setRate(editTarget.rate.toString());
    setMilkType(editTarget.milkType);
  }, [editTarget]);

  //mode
  const fetchMachineData = async () => {
    try {
      const res = await getMachineData();

      setMachineStatus(res.data.status);

      if (res.data.status === "CONNECTED") {
        setFat(res.data.fat.toString());
        setSnf(res.data.snf.toString());
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      console.error("Machine error");
      setMachineStatus("DISCONNECTED");
    }
  };

  useEffect(() => {
    if (mode !== "AUTO") return;

    fetchMachineData();

    // const interval = setInterval(fetchMachineData, 2000);

    // return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    const check = async () => {
      const status = await isReallyOnline();
      setIsOnline(status);
    };

    const handleOffline = () => setIsOnline(false);

    check();

    window.addEventListener("online", check);
    window.addEventListener("offline", handleOffline);

    // const interval = setInterval(check, 8000);

    return () => {
      window.removeEventListener("online", check);
      window.removeEventListener("offline", handleOffline);
      // clearInterval(interval);
    };
  }, []);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8F4E3] p-4 sm:p-5 lg:p-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 lg:gap-6">
        {/* Header with Entry Mode */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left side */}
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">
              Milk Collection
            </h1>
            <p className="text-sm text-[#5E503F]/70">
              Record daily milk collection data.
            </p>
          </div>

          {/* Right side (🔥 moved here) */}
          <div className="bg-white shadow rounded-xl p-4 w-[260px] border border-[#E9E2C8]">
            <div className="flex items-center justify-between text-xs">
              {/* Left: Title */}
              <h3 className="font-semibold text-[#5E503F]">Entry Mode</h3>

              {/* Right: Machine Status */}
              <div className="flex items-center gap-1">
                <span className="text-gray-600">Machine:</span>

                <span
                  className={`font-medium ${machineStatus === "CONNECTED"
                      ? "text-green-600"
                      : "text-red-600"
                    }`}
                >
                  {machineStatus.replace("ED", "")}{" "}
                </span>

                {/* </div> */}

                {machineStatus === "CONNECTED" && (
                  <span className=" animate-pulse text-green-500">●</span>
                )}

                {machineStatus === "DISCONNECTED" && (
                  <span className=" animate-pulse text-red-500">●</span>
                )}
              </div>
            </div>

            {/* Toggle Buttons */}
            <div className="flex bg-gray-100 rounded-lg p-1 mt-3">
              <button
                onClick={() => setMode("MANUAL")}
                className={`flex-1 text-xs py-2 rounded-md transition ${mode === "MANUAL"
                    ? "bg-blue-600 text-white shadow"
                    : "text-gray-600"
                  }`}
              >
                Manual
              </button>

              <button
                onClick={() => setMode("AUTO")}
                className={`flex-1 text-xs py-2 rounded-md transition ${mode === "AUTO"
                    ? "bg-green-600 text-white shadow"
                    : "text-gray-600"
                  }`}
              >
                Auto
              </button>
            </div>
          </div>
        </div>

        {/* Entry Card */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
          {loadingFarmers ? (
            <div className="flex items-center justify-center py-10">
              <Loader size="md" message="Loading farmers..." />
            </div>
          ) : farmers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-sm text-[#5E503F]/70">
              <p>No farmers found. Please add farmers first.</p>
            </div>
          ) : (
            <>
              {/* First row: Date, Shift, Farmer Name */}
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
                    className="mt-1 w-full rounded-md border border-[#E9E2C8] bg-white px-3 py-2 text-sm text-[#5E503F] outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                  >
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="text-xs font-medium text-[#5E503F]">
                    Farmer <span className="text-red-500">*</span>
                  </label>

                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Enter farmer name or code..."
                    value={inputValue}
                    onChange={(e) => {
                      // setFarmerSearch(e.target.value);
                      setInputValue(e.target.value); // instant UI

                      debouncedSearch(e.target.value);
                      setFarmerId("");
                    }}
                    className="mt-1 w-full rounded-md border border-[#E9E2C8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                  />

                  {/* Floating Dropdown */}
                  {farmerSearch.trim() && filteredFarmers.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-[#E9E2C8] bg-white shadow-lg">
                      {filteredFarmers.map((f) => (
                        <div
                          key={f._id}
                          onClick={() => {
                            setFarmerId(f._id);
                            setFarmerSearch(`${f.code} - ${f.name}`);
                            setInputValue(`${f.code} - ${f.name}`); // ✅ ADD THIS
                          }}
                          className="cursor-pointer px-3 py-2 text-sm hover:bg-[#F8F4E3]"
                        >
                          {f.code} - {f.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.farmerId && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.farmerId}
                    </p>
                  )}
                </div>
              </div>
              {/* Milk type if they have both Cow & Buffalo */}
              {selectedFarmer && selectedFarmer.milkType.length > 1 && (
                <div className="mt-4">
                  <span className="text-xs font-medium text-[#5E503F]">
                    Milk Type <span className="text-red-500">*</span>
                  </span>

                  <div className="mt-2 grid grid-cols-2 sm:flex gap-3">
                    {selectedFarmer.milkType.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMilkType(t)}
                        className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
  ${milkType === t
                            ? t === "cow"
                              ? "bg-orange-500 text-white border-orange-500 shadow-md"
                              : t === "buffalo"
                                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                : "bg-purple-600 text-white border-purple-600 shadow-md"
                            : t === "cow"
                              ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                              : t === "buffalo"
                                ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                          }
`}
                      >
                        {t === "cow" && "🐄 Cow Milk"}
                        {t === "buffalo" && "🐃 Buffalo Milk"}
                        {t === "mix" && "🥛 Mix Milk"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Second row: Farmer Code, Liters, Fat, SNF */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                  <InputField
                    label="Farmer Code"
                    value={codeInput}
                    placeholder="Enter farmer code..."
                    onChange={(e) => {
                      const value = e.target.value;

                      setCodeInput(value); // instant UI
                      debouncedCodeSearch(value); // debounce
                      setFarmerId(""); // reset selection
                    }}
                  />

                  {/* Dropdown */}
                  {codeSearch.trim() && filteredByCode.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-[#E9E2C8] bg-white shadow-lg">
                      {filteredByCode.map((f) => (
                        <div
                          key={f._id}
                          onClick={() => {
                            setFarmerId(f._id);
                            setCodeInput(f.code);
                            setCodeSearch("");
                            // sync with name field also
                            setFarmerSearch(`${f.code} - ${f.name}`);
                            setInputValue(`${f.code} - ${f.name}`);
                          }}
                          className="cursor-pointer px-3 py-2 text-sm hover:bg-[#F8F4E3]"
                        >
                          {f.code} - {f.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <InputField
                  label="Liters"
                  requiredLabel
                  type="number"
                  step="0.01"
                  min="0"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  error={errors.liters}
                />

                <InputField
                  label="Fat %"
                  disabled={mode === "AUTO"}
                  requiredLabel
                  type="number"
                  step="0.1"
                  min={rateConfig?.fatMin}
                  max={rateConfig?.fatMax}
                  helperText={
                    rateConfig
                      ? ` FAT must be ${rateConfig.fatMin} – ${rateConfig.fatMax}`
                      : ""
                  }
                  helperTextClassName="text-red-500 text-[9px]"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  error={errors.fat}
                />
                <InputField
                  label="SNF %"
                  disabled={mode === "AUTO"}
                  requiredLabel
                  type="number"
                  step="0.1"
                  min={rateConfig?.snfMin}
                  max={rateConfig?.snfMax}
                  helperText={
                    rateConfig
                      ? ` SNF must be ${rateConfig.snfMin} – ${rateConfig.snfMax}`
                      : ""
                  }
                  helperTextClassName="text-red-500 text-[9px]"
                  value={snf}
                  onChange={(e) => setSnf(e.target.value)}
                  error={errors.snf}
                />
              </div>

              {/* Third row: Rate, Total Amount, Save */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InputField
                  label="Rate (₹)"
                  value={loadingRate ? "Fetching..." : rate}
                  readOnly
                  helperText="Auto-calculated from rate chart"
                />

                <InputField
                  label="Total Amount (₹)"
                  value={amount.toFixed(2)}
                  readOnly
                />
                <div className="flex items-end lg:col-span-1">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full rounded-md bg-[#2A9D8F] px-4 py-3 text-sm font-medium text-white shadow hover:bg-[#247B71] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving
                      ? "Saving..."
                      : editTarget
                        ? "Update Collection"
                        : "Save Collection"}{" "}
                  </button>
                  {editTarget && (
                    <button
                      onClick={() => {
                        setEditTarget(null);
                        resetForm();
                      }}
                      className="ml-2 w-full rounded-md bg-yellow-300 px-4 py-3 text-sm font-medium text-black shadow hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Remarks */}
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

        {/* Milk Containers Visualization */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold text-[#5E503F]">
            Milk Can Platform (40L each)
          </h2>

          <div className="overflow-x-auto pb-2">
            <div className="grid grid-cols-3 gap-6 w-full text-center">
              {shift === "morning" ? (
                <>
                  {/* Cow Morning */}
                  <MilkSection
                    title="🐄 Cow Morning"
                    data={cowMorning}
                    color="#E76F51"
                  />

                  {/* Buffalo Morning */}
                  <MilkSection
                    title="🐃 Buffalo Morning"
                    data={buffaloMorning}
                    color="#457B9D"
                  />

                  {/* Mix Morning */}
                  <MilkSection
                    title="🥛 Mix Morning"
                    data={mixMorning}
                    color="#1D3557"
                  />
                </>
              ) : (
                <>
                  {/* Cow Evening */}
                  <MilkSection
                    title="🐄 Cow Evening"
                    data={cowEvening}
                    color="#F4A261"
                  />

                  {/* Buffalo Evening */}
                  <MilkSection
                    title="🐃 Buffalo Evening"
                    data={buffaloEvening}
                    color="#1D3557"
                  />

                  {/* Mix Evening */}
                  <MilkSection
                    title="🥛 Mix Evening"
                    data={mixEvening}
                    color="#1D3557"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* List + Filters */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {" "}
            <h2 className="text-sm font-semibold text-[#5E503F]">
              Collections
            </h2>
            {/* Filter mode */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#5E503F]">
                Filter:
              </span>
              <button
                type="button"
                onClick={() => setFilterMode("day")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${filterMode === "day"
                    ? "bg-[#2A9D8F] text-white"
                    : "bg-[#E9E2C8] text-[#5E503F]"
                  }`}
              >
                Day
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("range")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${filterMode === "range"
                    ? "bg-[#2A9D8F] text-white"
                    : "bg-[#E9E2C8] text-[#5E503F]"
                  }`}
              >
                10 Days
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${filterMode === "all"
                    ? "bg-[#2A9D8F] text-white"
                    : "bg-[#E9E2C8] text-[#5E503F]"
                  }`}
              >
                All
              </button>
            </div>
            {filterMode === "day" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#5E503F]">Day</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="rounded-md border border-[#E9E2C8] bg-white px-3 py-1.5 text-xs text-[#5E503F] outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                />
              </div>
            )}
            {filterMode === "range" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#5E503F]">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    const selectedFrom = e.target.value;
                    setFromDate(selectedFrom);
                    setToDate(addDays(selectedFrom, 9));
                  }}
                  className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs w-32 outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                />

                <span className="text-xs font-medium text-[#5E503F]">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    const selectedTo = e.target.value;
                    setToDate(selectedTo);
                    setFromDate(addDays(selectedTo, -9));
                  }}
                  className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs w-32 outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                />
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-[#E9E2C8]">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-[#F8F4E3]">
                <tr>
                  <th className="border-b border-[#E9E2C8] px-3 py-2 text-left font-semibold text-[#5E503F]">
                    Date
                  </th>
                  <th className="border-b border-[#E9E2C8] px-3 py-2 text-left font-semibold text-[#5E503F]">
                    Shift
                  </th>
                  <th className="border-b border-[#E9E2C8] px-3 py-2 text-left font-semibold text-[#5E503F]">
                    Farmer Code
                  </th>
                  <th className="border-b border-[#E9E2C8] px-3 py-2 text-left font-semibold text-[#5E503F]">
                    Farmer Name
                  </th>
                  <th className="border-b border-[#E9E2C8] px-3 py-2 text-center font-semibold text-[#5E503F]">
                    Milk Type
                  </th>
                  <th className="border-b border-[#E9E2C8] px-3 py-2 text-center font-semibold text-[#5E503F]">
                    Liters
                  </th>
                  <th
                    className={`border-b border-[#E9E2C8] px-3 py-2 text-center font-semibold text-[#5E503F] ${mode === "AUTO" ? "bg-gray-100 text-gray-400" : ""
                      }`}
                  >
                    Fat %
                  </th>
                  <th
                    className={`border-b border-[#E9E2C8] px-3 py-2 text-center font-semibold text-[#5E503F] ${mode === "AUTO" ? "bg-gray-100 text-gray-400" : ""
                      }`}
                  >
                    SNF %
                  </th>
                  <th className="border-b border-[#E9E2C8] px-3 py-2 text-center font-semibold text-[#5E503F]">
                    Rate (₹)
                  </th>
                  <th className="border-b border-[#E9E2C8] px-3 py-2 text-center font-semibold text-[#5E503F]">
                    Total (₹)
                  </th>
                  <th className="border-b border-[#E9E2C8] px-3 py-2 text-center font-semibold text-[#5E503F]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-xs text-[#5E503F]/60"
                    >
                      No collections recorded for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredCollections.map((c, index) => (
                    <tr
                      key={c._id}
                      className={index % 2 === 0 ? "bg-white" : "bg-[#FDFCF8]"}
                    >
                      <td className="border-t border-[#E9E2C8] px-3 py-2">
                        {c.date}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">
                        {c.shift}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">
                        {c.farmerCode}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2">
                        {c.farmerName}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${c.milkType === "cow"
                              ? "bg-[#E76F51]/10 text-[#E76F51]"
                              : c.milkType === "buffalo"
                                ? "bg-[#457B9D]/10 text-[#457B9D]"
                                : "bg-[#8E44AD]/10 text-[#8E44AD]"
                            }`}
                        >
                          {/* {c.milkType === "cow" && "🐄 Cow"} */}
                          {c.milkType === "cow" && "Cow"}
                          {c.milkType === "buffalo" && "Buffalo"}
                          {c.milkType === "mix" && "Mix"}
                        </span>
                      </td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2 text-center">
                        {c.liters.toFixed(2)}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2 text-center">
                        {c.fat.toFixed(1)}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2 text-center">
                        {c.snf.toFixed(1)}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2 text-center">
                        {c.rate.toFixed(2)}
                      </td>
                      <td className="border-t border-[#E9E2C8] px-3 py-2 text-center">
                        {c.amount.toFixed(2)}
                      </td>
                      <td className="text-center">
                        {new Date().toLocaleDateString("en-CA") > c.date && (
                          <button
                            onClick={() => setEditTarget(c)}
                            className="rounded-md border px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 mr-2"
                          >
                            Edit
                          </button>
                        )}

                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="rounded-md border border-[#E9E2C8] bg-white px-2 py-1 text-xs text-[#E76F51] hover:bg-[#E76F51]/10"
                        >
                          Delete
                        </button>
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

export default MilkEntryPage;
