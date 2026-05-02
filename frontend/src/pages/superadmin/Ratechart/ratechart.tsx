// src/pages/superadmin/rateChart/RateChartPage.tsx
import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import InputField from "../../../components/inputField";
import StatCard from "../../../components/statCard";
import ConfirmModal from "../../../components/confirmModal";

import type { MilkType } from "../../../types/farmer";
import type { MilkRateChart } from "../../../types/rateChart";
import type { RateChartHistoryEntry, CenterChartSummaryItem } from "../../../axios/superadmin_ratechart_api";
import {
  getRateChartsForCenter,
  updateRateChartForCenter,
  getRateChartHistoryForCenter,
  getSuperadminRateChartSummary
} from "../../../axios/superadmin_ratechart_api";
import toast from "react-hot-toast";

type Slab = {
  from: number;
  to: number;
  rate: number;
};

type RateChartExcelRow = {
  FAT?: number;
  fat?: number;
  Fat?: number;
  SNF?: number;
  snf?: number;
  Snf?: number;
  Rate?: number;
  rate?: number;
  RATE?: number;
};

type RateChartStorage = {
  cow: MilkRateChart;
  buffalo: MilkRateChart;
  mix: MilkRateChart;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateFatAmount(fat: number, slabs: Slab[] = []) {
  let total = 0;
  slabs.forEach((slab) => {
    if (fat > slab.from) {
      const usableFat = Math.min(fat, slab.to) - slab.from;
      if (usableFat > 0) total += usableFat * 10 * slab.rate;
    }
  });
  return Math.round(total * 100) / 100;
}

const validateSlabs = (slabs: Slab[]) => {
  for (let i = 0; i < slabs.length - 1; i++) {
    if (slabs[i].to > slabs[i + 1].from) {
      return false;
    }
  }
  return true;
};

function formulaRate(
  baseRate: number,
  fat: number,
  snf: number,
  fatSlabs: Slab[],
  snfSlabs: Slab[],
): number {
  return round2(
    baseRate +
    calculateFatAmount(fat, fatSlabs) +
    calculateSnfAmount(snf, snfSlabs),
  );
}

function generateMatrix(
  chart: Pick<MilkRateChart, "fats" | "snfs" | "baseRate" | "fatSlabs" | "snfSlabs">,
): number[][] {
  return chart.fats.map((fat) =>
    chart.snfs.map((snf) =>
      formulaRate(chart.baseRate, fat, snf, chart.fatSlabs, chart.snfSlabs),
    ),
  );
}

function defaultChart(milkType: MilkType): MilkRateChart {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  let baseRate: number;
  if (milkType === "cow") baseRate = 20;
  else if (milkType === "buffalo") baseRate = 30;
  else baseRate = 25;

  const fatMin = 3.0;
  const fatMax = 5.0;
  const fatStep = 0.1;

  const snfMin = 7.0;
  const snfMax = 9.0;
  const snfStep = 0.1;

  const fats = generateRange(fatMin, fatMax, fatStep);
  const snfs = generateRange(snfMin, snfMax, snfStep);

  const rates = generateMatrix({
    fats,
    snfs,
    baseRate,
    fatSlabs: [{ from: fatMin, to: fatMin + 1, rate: 0.1 }],
    snfSlabs: [{ from: snfMin, to: snfMin + 1, rate: 0.1 }],
  });

  return {
    milkType,
    fatSlabs: [{ from: fatMin, to: fatMin + 1, rate: 0.1 }],
    snfSlabs: [{ from: snfMin, to: snfMin + 1, rate: 0.1 }],
    fatMin, fatMax, fatStep,
    snfMin, snfMax, snfStep,
    fats, snfs, rates, baseRate,
    effectiveFrom: today,
    updatedAt: now,
  };
}

function calculateSnfAmount(snf: number, slabs: Slab[] = []) {
  let total = 0;
  slabs.forEach((slab) => {
    if (snf > slab.from) {
      const usableSnf = Math.min(snf, slab.to) - slab.from;
      if (usableSnf > 0) total += usableSnf * 10 * slab.rate;
    }
  });
  return Math.round(total * 100) / 100;
}

function generateRange(min: number, max: number, step: number): number[] {
  const arr: number[] = [];
  let v = min;
  while (v <= max + 0.0001) {
    arr.push(Number(v.toFixed(2)));
    v = Number((v + step).toFixed(2));
  }
  return arr;
}

const RateChartPage: React.FC = () => {
  const [centers, setCenters] = useState<CenterChartSummaryItem[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);

  const [charts, setCharts] = useState<RateChartStorage | null>(null);
  const [activeMilkType, setActiveMilkType] = useState<MilkType>("cow");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [showAllFatSlabs, setShowAllFatSlabs] = useState(false);
  const [showAllSnfSlabs, setShowAllSnfSlabs] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // History panel
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<RateChartHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch centers on mount
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const res = await getSuperadminRateChartSummary();
        setCenters(res.data.summary);
        if (res.data.summary.length > 0) {
          setSelectedCenterId(res.data.summary[0].center._id);
        }
      } catch (err) {
        console.error("Failed to load centers:", err);
        toast.error("Failed to load centers list");
      }
    };
    fetchCenters();
  }, []);

  // Fetch rate charts when center changes
  useEffect(() => {
    if (!selectedCenterId) return;

    const loadCharts = async () => {
      setCharts(null); // Show loading state
      try {
        const res = await getRateChartsForCenter(selectedCenterId);

        const processChart = (type: MilkType, data: any) => {
          return data ? {
            ...data,
            fatMin: data.fatMin ?? 3.0,
            fatMax: data.fatMax ?? 5.0,
            fatStep: data.fatStep ?? 0.1,
            snfMin: data.snfMin ?? 7.0,
            snfMax: data.snfMax ?? 9.0,
            snfStep: data.snfStep ?? 0.1,
            effectiveFrom: data.effectiveFrom ?? new Date().toISOString().slice(0, 10),
          } : defaultChart(type);
        };

        const cowChart = processChart('cow', res.data.charts.cow);
        const buffaloChart = processChart('buffalo', res.data.charts.buffalo);
        const mixChart = processChart('mix', res.data.charts.mix);

        const ensureOneSlab = (chart: MilkRateChart): MilkRateChart => ({
          ...chart,
          fatSlabs: chart.fatSlabs && chart.fatSlabs.length > 0
            ? chart.fatSlabs
            : [{ from: chart.fatMin, to: chart.fatMin + 1, rate: 0.1 }],
          snfSlabs: chart.snfSlabs && chart.snfSlabs.length > 0
            ? chart.snfSlabs
            : [{ from: chart.snfMin, to: chart.snfMin + 1, rate: 0.1 }],
        });

        setCharts({
          cow: ensureOneSlab(cowChart),
          buffalo: ensureOneSlab(buffaloChart),
          mix: ensureOneSlab(mixChart),
        });

        // Reset history when center changes
        setShowHistory(false);
      } catch (err) {
        console.error("Failed to load rate charts for center:", err);
        toast.error("Failed to load rate charts");
      }
    };

    loadCharts();
  }, [selectedCenterId]);

  // Fetch history when toggled
  useEffect(() => {
    if (!showHistory || !selectedCenterId) return;

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await getRateChartHistoryForCenter(selectedCenterId, { milkType: activeMilkType, limit: 10 });
        setHistory(res.data.history);
      } catch (err) {
        toast.error("Failed to load history");
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [showHistory, selectedCenterId, activeMilkType]);


  if (!selectedCenterId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#f9fafb]">
        <span className="text-sm text-gray-500">Loading centers...</span>
      </div>
    );
  }

  const current: MilkRateChart | null = charts ? (charts[activeMilkType] ?? null) : null;

  const setCurrent = (updated: MilkRateChart) => {
    setCharts((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [updated.milkType]: JSON.parse(JSON.stringify(updated)),
      };
    });
  };

  // ---------- FAT SLAB FUNCTIONS ----------
  const updateSlab = (index: number, field: keyof Slab, value: number) => {
    const slabs = [...(current!.fatSlabs || [])];
    slabs[index] = { ...slabs[index], [field]: value };
    setCurrent({ ...current!, fatSlabs: slabs });
  };

  const addSlab = () => {
    const slabs = [...(current!.fatSlabs || [])];
    const from = slabs.length === 0 ? current!.fatMin : slabs[slabs.length - 1].to;
    slabs.push({ from, to: Number((from + 1).toFixed(1)), rate: 0.1 });
    setCurrent({ ...current!, fatSlabs: slabs });
  };

  const deleteSlab = (index: number) => {
    let slabs = current!.fatSlabs.filter((_, i) => i !== index);
    if (slabs.length === 0) slabs = [{ from: current!.fatMin, to: current!.fatMin + 1, rate: 0.1 }];
    setCurrent({ ...current!, fatSlabs: slabs });
  };

  // ---------- SNF SLAB FUNCTIONS ----------
  const updateSnfSlab = (index: number, field: keyof Slab, value: number) => {
    const slabs = [...(current!.snfSlabs || [])];
    slabs[index] = { ...slabs[index], [field]: value };
    setCurrent({ ...current!, snfSlabs: slabs });
  };

  const addSnfSlab = () => {
    const slabs = [...(current!.snfSlabs || [])];
    const from = slabs.length === 0 ? current!.snfMin : slabs[slabs.length - 1].to;
    slabs.push({ from, to: Number((from + 1).toFixed(1)), rate: 0.1 });
    setCurrent({ ...current!, snfSlabs: slabs });
  };

  const deleteSnfSlab = (index: number) => {
    let slabs = current!.snfSlabs.filter((_, i) => i !== index);
    if (slabs.length === 0) slabs = [{ from: current!.snfMin, to: current!.snfMin + 1, rate: 0.1 }];
    setCurrent({ ...current!, snfSlabs: slabs });
  };

  const handleFormulaChange = (field: "baseRate", value: string) => {
    const num = parseFloat(value);
    const safe = Number.isNaN(num) ? 0 : num;
    setCurrent({ ...current!, [field]: safe });
  };

  const isFatMaxReached: boolean = !!current?.fatSlabs?.length && current.fatSlabs[current.fatSlabs.length - 1].to >= current.fatMax;
  const isSnfMaxReached: boolean = !!current?.snfSlabs?.length && current.snfSlabs[current.snfSlabs.length - 1].to >= current.snfMax;

  const regenerateFromFormula = async () => {
    if (!current) return;
    if (!validateSlabs(current.fatSlabs || [])) return toast.error("Fat slabs are overlapping!");
    if (!validateSlabs(current.snfSlabs || [])) return toast.error("SNF slabs are overlapping!");
    if (current.fatMin >= current.fatMax) return toast.error("FAT Min must be less than Max");
    if (current.snfMin >= current.snfMax) return toast.error("SNF Min must be less than Max");
    if (current.fatStep <= 0 || current.snfStep <= 0) return toast.error("Step must be greater than 0");

    setGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const slabMax = current.fatSlabs && current.fatSlabs.length ? Math.max(...current.fatSlabs.map((s) => s.to)) : current.fatMax;
    const effectiveFatMax = Math.max(current.fatMax, slabMax);

    const fats = generateRange(current.fatMin, effectiveFatMax, current.fatStep);
    const snfs = generateRange(current.snfMin, current.snfMax, current.snfStep);
    const rates = generateMatrix({ fats, snfs, baseRate: current.baseRate, fatSlabs: current.fatSlabs || [], snfSlabs: current.snfSlabs || [] });

    setCurrent({
      ...current,
      fatMax: effectiveFatMax,
      fats, snfs, rates,
      updatedAt: new Date().toISOString(),
    });
    setGenerating(false);
  };

  const resetToDefault = () => {
    const def = defaultChart(activeMilkType);
    if (!def.fatSlabs || def.fatSlabs.length === 0) def.fatSlabs = [{ from: def.fatMin, to: def.fatMin + 1, rate: 0.1 }];
    if (!def.snfSlabs || def.snfSlabs.length === 0) def.snfSlabs = [{ from: def.snfMin, to: def.snfMin + 1, rate: 0.1 }];
    setCurrent(def);
    setShowResetConfirm(false);
    toast.success(`${activeMilkType} rate chart reset to default`);
  };

  const handleCellChange = (fatIndex: number, snfIndex: number, value: string) => {
    if (value === "" || !current) return;
    const num = Number(value);
    if (Number.isNaN(num)) return;

    const newRates = current.rates.map((row, rIdx) =>
      row.map((cell, cIdx) => (rIdx === fatIndex && cIdx === snfIndex ? num : cell))
    );
    setCurrent({ ...current, rates: newRates, updatedAt: new Date().toISOString() });
  };

  const handleSave = async () => {
    if (!current || !selectedCenterId) return;
    try {
      setSaving(true);
      await updateRateChartForCenter(selectedCenterId, current.milkType, {
        ...current,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
      });
      toast.success(`${current.milkType} rate chart saved`);
      // Refresh history if open
      if (showHistory) {
        const res = await getRateChartHistoryForCenter(selectedCenterId, { milkType: activeMilkType, limit: 10 });
        setHistory(res.data.history);
      }
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save rate chart");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Excel import/export ----------
  const handleImportClick = () => fileInputRef.current?.click();

  const exportExcel = () => {
    if (!current || !current.fats.length || !current.snfs.length) return toast.error("No rate chart data to export");
    const rows: { FAT: number; SNF: number; Rate: number }[] = [];
    current.fats.forEach((fat, fi) => {
      current.snfs.forEach((snf, si) => {
        rows.push({ FAT: fat, SNF: snf, Rate: current.rates[fi][si] });
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Rate Chart");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), `Rate-Chart-${activeMilkType}-${current.effectiveFrom}.xlsx`);
    toast.success("Rate chart exported successfully");
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const selectedMilkType = activeMilkType;
    const file = e.target.files?.[0];
    if (!file || !current) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const ws = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<RateChartExcelRow>(ws);

      if (!rows.length) return toast.error("Excel file is empty.");

      const fatsSet = new Set<number>();
      const snfsSet = new Set<number>();

      rows.forEach((row) => {
        const fat = Number(row.FAT ?? row.fat ?? row.Fat);
        const snf = Number(row.SNF ?? row.snf ?? row.Snf);
        if (!Number.isNaN(fat) && !Number.isNaN(snf)) {
          fatsSet.add(fat);
          snfsSet.add(snf);
        }
      });

      const fats = Array.from(fatsSet).sort((a, b) => a - b);
      const snfs = Array.from(snfsSet).sort((a, b) => a - b);
      if (!fats.length || !snfs.length) return toast.error("Could not find FAT/SNF columns.");

      const rates: number[][] = fats.map(() => snfs.map(() => 0));
      rows.forEach((row) => {
        const fat = Number(row.FAT ?? row.fat ?? row.Fat);
        const snf = Number(row.SNF ?? row.snf ?? row.Snf);
        const rate = Number(row.Rate ?? row.rate ?? row.RATE);
        if (!Number.isNaN(fat) && !Number.isNaN(snf) && !Number.isNaN(rate)) {
          const fi = fats.indexOf(fat);
          const si = snfs.indexOf(snf);
          if (fi !== -1 && si !== -1) rates[fi][si] = rate;
        }
      });

      const updatedChart: MilkRateChart = {
        ...current,
        fatMin: Math.min(...fats), fatMax: Math.max(...fats), fatStep: fats.length > 1 ? fats[1] - fats[0] : 0.1,
        snfMin: Math.min(...snfs), snfMax: Math.max(...snfs), snfStep: snfs.length > 1 ? snfs[1] - snfs[0] : 0.1,
        milkType: selectedMilkType,
        fats, snfs, rates,
        effectiveFrom: current.effectiveFrom ?? new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
      };
      if (!updatedChart.snfSlabs || updatedChart.snfSlabs.length === 0) updatedChart.snfSlabs = [{ from: updatedChart.snfMin, to: updatedChart.snfMin + 1, rate: 0.1 }];
      setCurrent(updatedChart);
      toast.success(`Imported rate chart for ${activeMilkType}.`);
    } catch (err) {
      toast.error("Failed to import Excel file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const flatRates = Array.isArray(current?.rates) ? current!.rates.flat() : [];
  const stats = flatRates.length ? {
    min: round2(Math.min(...flatRates)),
    max: round2(Math.max(...flatRates)),
    avg: round2(flatRates.reduce((s, v) => s + v, 0) / flatRates.length),
  } : { min: 0, max: 0, avg: 0 };

  const lastUpdatedLabel = current?.updatedAt ? new Date(current.updatedAt).toLocaleString() : "Not saved yet";


  return (
    <div className="h-full w-full overflow-auto bg-[#f9fafb] p-6 text-gray-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">

        {/* Header & Center Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Superadmin Rate Charts</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and deploy milk rate charts across all collection centers.
            </p>
          </div>

          <div className="flex flex-col gap-1 w-full md:w-64">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select Center</label>
            <select
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              value={selectedCenterId || ""}
              onChange={(e) => setSelectedCenterId(e.target.value)}
            >
              {centers.map(c => (
                <option key={c.center._id} value={c.center._id}>
                  {c.center.name} {c.center.location ? `(${c.center.location})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!charts || !current ? (
          <div className="flex h-40 w-full items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm">
            <span className="text-sm text-gray-500">Loading chart data for center...</span>
          </div>
        ) : (
          <>
            {/* Tabs + Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {(["cow", "buffalo", "mix"] as MilkType[]).map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setActiveMilkType(mt)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeMilkType === mt
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    {mt === "cow" && "🐄 Cow Milk"}
                    {mt === "buffalo" && "🐃 Buffalo Milk"}
                    {mt === "mix" && "🥛 Mix Milk"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${showHistory ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  <i className="fa-solid fa-clock-rotate-left"></i> History
                </button>
                <button
                  type="button"
                  onClick={handleImportClick}
                  className="rounded-md border border-green-600 bg-green-600 text-white px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-green-700 transition-colors"
                >
                  <i className="fa-solid fa-file-excel mr-1"></i> Import
                </button>
                <span className="hidden sm:inline">Last updated: {lastUpdatedLabel}</span>
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />

            {/* History Panel (Conditional) */}
            {showHistory && (
              <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <i className="fa-solid fa-clock-rotate-left text-purple-600"></i>
                    Version History ({activeMilkType})
                  </h3>
                  <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark"></i></button>
                </div>

                {loadingHistory ? (
                  <div className="text-xs text-gray-500 py-4 text-center">Loading history...</div>
                ) : history.length === 0 ? (
                  <div className="text-xs text-gray-500 py-4 text-center bg-gray-50 rounded-lg border border-gray-100">No previous versions found for this milk type.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 font-semibold">Saved Date</th>
                          <th className="px-4 py-2 font-semibold">Effective From</th>
                          <th className="px-4 py-2 font-semibold">Base Rate</th>
                          <th className="px-4 py-2 font-semibold">Saved By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {history.map(entry => (
                          <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-gray-600">{new Date(entry.createdAt).toLocaleString()}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-600">{entry.effectiveFrom}</td>
                            <td className="px-4 py-2.5 font-mono font-bold text-gray-800">₹{entry.baseRate}</td>
                            <td className="px-4 py-2.5 text-gray-600">{entry.savedBy?.name || 'System / Unknown'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Base Rate" value={`₹ ${current.baseRate.toFixed(2)}`} subtitle="Base value in formula" variant="teal" />
              <StatCard title="Min Rate" value={`₹ ${stats.min}`} variant="orange" subtitle="Lowest in matrix" />
              <StatCard title="Avg Rate" value={`₹ ${stats.avg}`} variant="blue" subtitle="Average of matrix" />
              <StatCard title="Max Rate" value={`₹ ${stats.max}`} variant="green" subtitle="Highest in matrix" />
            </div>

            <div className="grid gap-4 lg:grid-cols-1">
              {/* Formula card */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
                <h2 className="mb-3 text-sm font-bold text-gray-800">Formula Configuration</h2>

                <div className="grid gap-4 sm:grid-cols-3 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <InputField label="Base Rate (₹)" type="number" step="0.01" value={String(current.baseRate)} onChange={(e) => handleFormulaChange("baseRate", e.target.value)} />
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* FAT SECTION */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">FAT Configuration</h3>
                    <div className="grid gap-3 sm:grid-cols-2 mb-4">
                      <InputField label="FAT Min" type="number" step="0.1" value={String(current.fatMin)} onChange={(e) => setCurrent({ ...current, fatMin: Number(e.target.value) })} />
                      <InputField label="FAT Max" type="number" step="0.1" value={String(current.fatMax)} onChange={(e) => setCurrent({ ...current, fatMax: Number(e.target.value) })} />
                    </div>

                    <h4 className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Fat Slabs</h4>
                    <div className="space-y-2">
                      {(showAllFatSlabs ? current.fatSlabs : current.fatSlabs?.slice(0, 1))?.map((slab, i) => (
                        <div key={i} className="flex items-end gap-2 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm relative group">
                          <InputField label="From" type="number" step="0.1" value={String(slab.from)} onChange={(e) => updateSlab(i, "from", Number(e.target.value))} />
                          <InputField label="To" type="number" step="0.1" value={String(slab.to)} onChange={(e) => updateSlab(i, "to", Number(e.target.value))} />
                          <InputField label="Rate /0.1" type="number" step="0.01" value={String(slab.rate)} onChange={(e) => updateSlab(i, "rate", Number(e.target.value))} />
                          <button type="button" onClick={() => deleteSlab(i)} className="mb-1 rounded bg-red-50 text-red-600 px-2.5 py-1.5 text-[10px] font-bold hover:bg-red-100 transition-colors border border-red-100">X</button>
                        </div>
                      ))}

                      {current.fatSlabs.length > 1 && (
                        <button type="button" onClick={() => setShowAllFatSlabs(!showAllFatSlabs)} className="text-[11px] text-blue-600 font-medium hover:underline mt-1 block">
                          {showAllFatSlabs ? "Hide Slabs" : `View All ${current.fatSlabs.length} Slabs`}
                        </button>
                      )}

                      <button type="button" onClick={() => { addSlab(); setShowAllFatSlabs(true); }} disabled={isFatMaxReached}
                        className={`mt-2 w-full flex justify-center items-center gap-1 rounded-lg px-4 py-2 text-xs font-bold transition-all border border-dashed ${isFatMaxReached ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"}`}>
                        + Add FAT Slab
                      </button>
                    </div>
                  </div>

                  {/* SNF SECTION */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">SNF Configuration</h3>
                    <div className="grid gap-3 sm:grid-cols-2 mb-4">
                      <InputField label="SNF Min" type="number" step="0.1" value={String(current.snfMin)} onChange={(e) => setCurrent({ ...current, snfMin: Number(e.target.value) })} />
                      <InputField label="SNF Max" type="number" step="0.1" value={String(current.snfMax)} onChange={(e) => setCurrent({ ...current, snfMax: Number(e.target.value) })} />
                    </div>

                    <h4 className="text-[11px] font-semibold text-gray-500 uppercase mb-2">SNF Slabs</h4>
                    <div className="space-y-2">
                      {(showAllSnfSlabs ? current.snfSlabs : current.snfSlabs?.slice(0, 1))?.map((slab, i) => (
                        <div key={i} className="flex items-end gap-2 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
                          <InputField label="From" type="number" step="0.1" value={String(slab.from)} onChange={(e) => updateSnfSlab(i, "from", Number(e.target.value))} />
                          <InputField label="To" type="number" step="0.1" value={String(slab.to)} onChange={(e) => updateSnfSlab(i, "to", Number(e.target.value))} />
                          <InputField label="Rate /0.1" type="number" step="0.01" value={String(slab.rate)} onChange={(e) => updateSnfSlab(i, "rate", Number(e.target.value))} />
                          <button type="button" onClick={() => deleteSnfSlab(i)} className="mb-1 rounded bg-red-50 text-red-600 px-2.5 py-1.5 text-[10px] font-bold hover:bg-red-100 transition-colors border border-red-100">X</button>
                        </div>
                      ))}

                      {current.snfSlabs.length > 1 && (
                        <button type="button" onClick={() => setShowAllSnfSlabs(!showAllSnfSlabs)} className="text-[11px] text-blue-600 font-medium hover:underline mt-1 block">
                          {showAllSnfSlabs ? "Hide Slabs" : `View All ${current.snfSlabs.length} Slabs`}
                        </button>
                      )}

                      <button type="button" onClick={() => { addSnfSlab(); setShowAllSnfSlabs(true); }} disabled={isSnfMaxReached}
                        className={`mt-2 w-full flex justify-center items-center gap-1 rounded-lg px-4 py-2 text-xs font-bold transition-all border border-dashed ${isSnfMaxReached ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"}`}>
                        + Add SNF Slab
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-gray-500 font-mono bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                    Rate = Base + FAT × Diff + SNF × Diff
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowResetConfirm(true)} className="rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                      Reset
                    </button>
                    <button type="button" onClick={regenerateFromFormula} disabled={generating} className="rounded-lg bg-gray-800 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-gray-900 transition-colors disabled:opacity-70">
                      {generating ? "Generating..." : "Apply & Generate Matrix"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Matrix editor */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <h2 className="text-sm font-bold text-gray-800">Rate Chart Matrix <span className="text-gray-400 font-normal ml-2">(FAT × SNF)</span></h2>
                <button onClick={exportExcel} className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors">
                  <i className="fa-solid fa-download"></i> Export
                </button>
              </div>

              <div className="w-full rounded-lg border border-gray-200 overflow-auto flex-1">
                <table className="min-w-max border-collapse text-xs w-full">
                  <thead className="sticky top-0 z-20">
                    <tr>
                      <th className="sticky left-0 z-30 border-b border-r border-gray-200 bg-gray-100 px-3 py-2 text-left text-[11px] font-bold text-gray-600 shadow-[1px_1px_0_0_#e5e7eb]">
                        F \ S
                      </th>
                      {current.snfs.map((snf) => (
                        <th key={snf} className="border-b border-r border-gray-200 bg-gray-50 px-2 py-2 text-center text-[11px] font-bold text-gray-600">
                          {snf.toFixed(1)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {current.fats.map((fat, fi) => (
                      <tr key={fat} className="hover:bg-blue-50/30 group">
                        <th className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 group-hover:bg-blue-50/50 px-3 py-1.5 text-left text-[11px] font-bold text-gray-600 shadow-[1px_0_0_0_#e5e7eb]">
                          {fat.toFixed(1)}
                        </th>
                        {current.snfs.map((snf, si) => (
                          <td key={snf} className="border-b border-r border-gray-100 px-1 py-1 text-center">
                            <input
                              type="number" step="0.01"
                              className="w-[60px] rounded border border-transparent bg-transparent px-1 py-1 text-center font-mono text-[11px] text-gray-800 outline-none hover:border-gray-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
                              value={(current.rates?.[fi]?.[si] ?? 0).toFixed(2)}
                              onChange={(e) => handleCellChange(fi, si, e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex justify-end shrink-0">
                <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center gap-2">
                  {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                  {saving ? "Deploying..." : `Deploy to ${centers.find(c => c.center._id === selectedCenterId)?.center.name}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        open={showResetConfirm}
        title={`Reset ${activeMilkType} Rate Chart`}
        variant="danger"
        description={
          <div className="space-y-2 text-sm text-gray-600">
            <p>This will recalculate the entire <strong>{activeMilkType}</strong> matrix using the current base rate and slab configurations.</p>
            <p className="text-red-500 font-semibold text-xs">Warning: Any manual cell overrides in the matrix will be permanently lost.</p>
          </div>
        }
        confirmLabel="Reset & Recalculate"
        cancelLabel="Cancel"
        onConfirm={resetToDefault}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};

export default RateChartPage;