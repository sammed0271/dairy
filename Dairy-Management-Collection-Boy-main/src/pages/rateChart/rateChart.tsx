// src/pages/rateChart/rateChart.tsx
import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import InputField from "../../components/inputField";
import StatCard from "../../components/statCard";
import ConfirmModal from "../../components/confirmModal";

import type { MilkType } from "../../types/farmer";
import type { MilkRateChart } from "../../types/rateChart";
import { getRateCharts, updateRateChart } from "../../axios/rateChart_api";
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

// Default FAT and SNF steps used to build the matrix
// const DEFAULT_FATS = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0];
// const DEFAULT_SNFS = [7.0, 7.5, 8.0, 8.5, 9.0, 9.5];

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
  chart: Pick<
    MilkRateChart,
    "fats" | "snfs" | "baseRate" | "fatSlabs" | "snfSlabs"
  >,
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
  // let fatFactor: number;

  if (milkType === "cow") {
    baseRate = 20;
    // fatFactor = 1;
  } else if (milkType === "buffalo") {
    baseRate = 30;
    // fatFactor = 1;
  } else {
    baseRate = 25;
    // fatFactor = 1;
  }

  // const snfFactor = 1;

  // Default Ranges
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
    // ADD THESE
    fatMin,
    fatMax,
    fatStep,

    snfMin,
    snfMax,
    snfStep,

    fats,
    snfs,
    rates,

    baseRate,
    // fatFactor,
    // snfFactor,

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
  const [charts, setCharts] = useState<RateChartStorage | null>(null);
  const [activeMilkType, setActiveMilkType] = useState<MilkType>("cow");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [showAllFatSlabs, setShowAllFatSlabs] = useState(false);
  const [showAllSnfSlabs, setShowAllSnfSlabs] = useState(false);
  // Confirm reset
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Hidden file input for Excel import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getRateCharts();

        const cowChart = res.data.cow
          ? {
              ...res.data.cow,

              fatMin: res.data.cow.fatMin ?? 3.0,
              fatMax: res.data.cow.fatMax ?? 5.0,
              fatStep: res.data.cow.fatStep ?? 0.1,

              snfMin: res.data.cow.snfMin ?? 7.0,
              snfMax: res.data.cow.snfMax ?? 9.0,
              snfStep: res.data.cow.snfStep ?? 0.1,

              effectiveFrom:
                res.data.cow.effectiveFrom ??
                new Date().toISOString().slice(0, 10),
            }
          : defaultChart("cow");

        const buffaloChart = res.data.buffalo
          ? {
              ...res.data.buffalo,

              fatMin: res.data.buffalo.fatMin ?? 3.0,
              fatMax: res.data.buffalo.fatMax ?? 5.0,
              fatStep: res.data.buffalo.fatStep ?? 0.1,

              snfMin: res.data.buffalo.snfMin ?? 7.0,
              snfMax: res.data.buffalo.snfMax ?? 9.0,
              snfStep: res.data.buffalo.snfStep ?? 0.1,

              effectiveFrom:
                res.data.buffalo.effectiveFrom ??
                new Date().toISOString().slice(0, 10),
            }
          : defaultChart("buffalo");

        const mixChart = res.data.mix
          ? { ...res.data.mix }
          : defaultChart("mix");

        const ensureOneSlab = (chart: MilkRateChart): MilkRateChart => ({
          ...chart,

          fatSlabs:
            chart.fatSlabs && chart.fatSlabs.length > 0
              ? chart.fatSlabs
              : [{ from: chart.fatMin, to: chart.fatMin + 1, rate: 0.1 }],

          snfSlabs:
            chart.snfSlabs && chart.snfSlabs.length > 0
              ? chart.snfSlabs
              : [{ from: chart.snfMin, to: chart.snfMin + 1, rate: 0.1 }],
        });

        setCharts({
          cow: ensureOneSlab(cowChart),
          buffalo: ensureOneSlab(buffaloChart),
          mix: ensureOneSlab(mixChart),
        });
      } catch (err) {
        console.error("Failed to load rate charts:", err);
        toast.error("Failed to load rate charts");
      }
    };

    load();
  }, []);

  if (!charts) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F8F4E3]">
        <span className="text-sm text-[#5E503F]/70">Loading rate chart...</span>
      </div>
    );
  }

  const current: MilkRateChart | null = charts
    ? (charts[activeMilkType] ?? null)
    : null;

  if (!current || !current.rates || !current.fats || !current.snfs) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F8F4E3]">
        <span className="text-sm text-[#5E503F]/70">
          Preparing {activeMilkType} rate chart...
        </span>
      </div>
    );
  }

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
    const slabs = [...(current.fatSlabs || [])];
    slabs[index] = { ...slabs[index], [field]: value };
    setCurrent({ ...current, fatSlabs: slabs });
  };

  const addSlab = () => {
    const slabs = [...(current.fatSlabs || [])];

    const from =
      slabs.length === 0 ? current.fatMin : slabs[slabs.length - 1].to;

    slabs.push({
      from,
      to: Number((from + 1).toFixed(1)),
      rate: 0.1,
    });

    setCurrent({ ...current, fatSlabs: slabs });
  };

  const deleteSlab = (index: number) => {
    let slabs = current.fatSlabs.filter((_, i) => i !== index);

    // Always keep at least one slab
    if (slabs.length === 0) {
      slabs = [{ from: current.fatMin, to: current.fatMin + 1, rate: 0.1 }];
    }

    setCurrent({ ...current, fatSlabs: slabs });
  };

  // ---------- SNF SLAB FUNCTIONS ----------

  const updateSnfSlab = (index: number, field: keyof Slab, value: number) => {
    const slabs = [...(current.snfSlabs || [])];
    slabs[index] = { ...slabs[index], [field]: value };
    setCurrent({ ...current, snfSlabs: slabs });
  };

  const addSnfSlab = () => {
    const slabs = [...(current.snfSlabs || [])];

    const from =
      slabs.length === 0 ? current.snfMin : slabs[slabs.length - 1].to;

    slabs.push({
      from,
      to: Number((from + 1).toFixed(1)),
      rate: 0.1,
    });

    setCurrent({ ...current, snfSlabs: slabs });
  };

  const deleteSnfSlab = (index: number) => {
    let slabs = current.snfSlabs.filter((_, i) => i !== index);

    if (slabs.length === 0) {
      slabs = [{ from: current.snfMin, to: current.snfMin + 1, rate: 0.1 }];
    }

    setCurrent({ ...current, snfSlabs: slabs });
  };
  const handleFormulaChange = (
    field: "baseRate", //| "fatFactor" | "snfFactor",
    value: string,
  ) => {
    const num = parseFloat(value);
    const safe = Number.isNaN(num) ? 0 : num;
    setCurrent({
      ...current,
      [field]: safe,
    });
  };

  // ---------- DISABLE ADD BUTTON LOGIC ----------

  const isFatMaxReached: boolean =
    !!current.fatSlabs?.length &&
    current.fatSlabs[current.fatSlabs.length - 1].to >= current.fatMax;

  const isSnfMaxReached: boolean =
    !!current.snfSlabs?.length &&
    current.snfSlabs[current.snfSlabs.length - 1].to >= current.snfMax;
  const regenerateFromFormula = async () => {
    if (!validateSlabs(current.fatSlabs || [])) {
      toast.error("Fat slabs are overlapping!");
      return;
    }
    if (!validateSlabs(current.snfSlabs || [])) {
      toast.error("SNF slabs are overlapping!");
      return;
    }

    setGenerating(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    if (current.fatMin >= current.fatMax) {
      toast.error("FAT Min must be less than Max");
      return;
    }

    if (current.snfMin >= current.snfMax) {
      toast.error("SNF Min must be less than Max");
      return;
    }

    if (current.fatStep <= 0 || current.snfStep <= 0) {
      toast.error("Step must be greater than 0");
      return;
    }

    // find max fat from slabs
    const slabMax =
      current.fatSlabs && current.fatSlabs.length
        ? Math.max(...current.fatSlabs.map((s) => s.to))
        : current.fatMax;

    const effectiveFatMax = Math.max(current.fatMax, slabMax);

    const fats = generateRange(
      current.fatMin,
      effectiveFatMax,
      current.fatStep,
    );

    const snfs = generateRange(current.snfMin, current.snfMax, current.snfStep);

    const rates = generateMatrix({
      fats,
      snfs,
      baseRate: current.baseRate,
      // snfFactor: current.snfFactor,
      fatSlabs: current.fatSlabs || [],
      snfSlabs: current.snfSlabs || [],
    });

    setCurrent({
      ...current,
      fatMax: effectiveFatMax, // auto expand range
      fats,
      snfs,
      rates,
      updatedAt: new Date().toISOString(),
    });
    setGenerating(false);
  };

  const resetToDefault = () => {
    const def = defaultChart(activeMilkType);

    if (!def.fatSlabs || def.fatSlabs.length === 0) {
      def.fatSlabs = [{ from: def.fatMin, to: def.fatMin + 1, rate: 0.1 }];
    }

    if (!def.snfSlabs || def.snfSlabs.length === 0) {
      def.snfSlabs = [{ from: def.snfMin, to: def.snfMin + 1, rate: 0.1 }];
    }
    setCurrent(def);
    setShowResetConfirm(false);
    toast.success(`${activeMilkType} rate chart reset to default`);
  };

  const handleCellChange = (
    fatIndex: number,
    snfIndex: number,
    value: string,
  ) => {
    if (value === "") return;

    const num = Number(value);
    if (Number.isNaN(num)) return;

    const newRates = current.rates.map((row, rIdx) =>
      row.map((cell, cIdx) =>
        rIdx === fatIndex && cIdx === snfIndex ? num : cell,
      ),
    );

    setCurrent({
      ...current,
      rates: newRates,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSave = async () => {
    if (!current) return;

    try {
      setSaving(true);

      await updateRateChart(current.milkType, {
        ...current,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
      });

      toast.success(`${current.milkType} rate chart saved`);
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save rate chart");
    } finally {
      setSaving(false);
    }
  };

  // Compute stats (no hooks, just plain logic)
  const flatRates = Array.isArray(current?.rates) ? current.rates.flat() : [];
  const stats = flatRates.length
    ? {
        min: round2(Math.min(...flatRates)),
        max: round2(Math.max(...flatRates)),
        avg: round2(flatRates.reduce((s, v) => s + v, 0) / flatRates.length),
      }
    : { min: 0, max: 0, avg: 0 };

  const lastUpdatedLabel = current.updatedAt
    ? new Date(current.updatedAt).toLocaleString()
    : "Not saved yet";

  // ---------- Excel import ----------
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Export Excel
  const exportExcel = () => {
    if (!current.fats.length || !current.snfs.length) {
      toast.error("No rate chart data to export");
      return;
    }

    // ✅ Export in flat row format (FAT | SNF | Rate)
    const rows: { FAT: number; SNF: number; Rate: number }[] = [];

    current.fats.forEach((fat, fi) => {
      current.snfs.forEach((snf, si) => {
        rows.push({
          FAT: fat,
          SNF: snf,
          Rate: current.rates[fi][si],
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(wb, ws, "Rate Chart");

    const buffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([buffer]),
      `Rate-Chart-${activeMilkType}-${current.effectiveFrom}.xlsx`,
    );

    toast.success("Rate chart exported successfully");
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    const selectedMilkType = activeMilkType; // 🔒 LOCK

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const ws = workbook.Sheets[sheetName];

      // Expect columns: FAT, SNF, Rate
      const rows = XLSX.utils.sheet_to_json<RateChartExcelRow>(ws);

      if (!rows.length) {
        toast("Excel file is empty or has no data.");
        return;
      }

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

      if (!fats.length || !snfs.length) {
        toast("Could not find FAT/SNF columns in the Excel file.");
        return;
      }

      // Initialize matrix
      const rates: number[][] = fats.map(() => snfs.map(() => 0));

      rows.forEach((row) => {
        const fat = Number(row.FAT ?? row.fat ?? row.Fat);
        const snf = Number(row.SNF ?? row.snf ?? row.Snf);
        const rate = Number(row.Rate ?? row.rate ?? row.RATE);
        if (!Number.isNaN(fat) && !Number.isNaN(snf) && !Number.isNaN(rate)) {
          const fi = fats.indexOf(fat);
          const si = snfs.indexOf(snf);
          if (fi !== -1 && si !== -1) {
            rates[fi][si] = rate;
          }
        }
      });

      const updatedChart: MilkRateChart = {
        ...current,

        fatMin: Math.min(...fats),
        fatMax: Math.max(...fats),
        fatStep: fats.length > 1 ? fats[1] - fats[0] : 0.1,

        snfMin: Math.min(...snfs),
        snfMax: Math.max(...snfs),
        snfStep: snfs.length > 1 ? snfs[1] - snfs[0] : 0.1,
        milkType: selectedMilkType,

        fats,
        snfs,
        rates,
        effectiveFrom:
          current.effectiveFrom ?? new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
      };

      if (!updatedChart.snfSlabs || updatedChart.snfSlabs.length === 0) {
        updatedChart.snfSlabs = [
          { from: updatedChart.snfMin, to: updatedChart.snfMin + 1, rate: 0.1 },
        ];
      }

      setCharts((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [selectedMilkType]: updatedChart,
        };
      });

      toast.success(
        `Imported rate chart for ${activeMilkType} from ${sheetName}.`,
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to import Excel file. Please check format.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ---------- RENDER ----------

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">Rate Chart</h1>
            <p className="text-sm text-[#5E503F]/70">
              Manage milk rate chart using FAT and SNF method for Cow and
              Buffalo milk.
            </p>
          </div>
        </div>

        {/* Tabs + summary cards */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {(["cow", "buffalo", "mix"] as MilkType[]).map((mt) => (
              <button
                key={mt}
                type="button"
                onClick={() => setActiveMilkType(mt)}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  activeMilkType === mt
                    ? "bg-[#2A9D8F] text-white"
                    : "bg-[#E9E2C8] text-[#5E503F]"
                }`}
              >
                {mt === "cow" && "🐄 Cow Milk"}
                {mt === "buffalo" && "🐃 Buffalo Milk"}
                {mt === "mix" && "🥛 Mix Milk"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-[#5E503F]/70">
            <button
              type="button"
              onClick={handleImportClick}
              className="rounded-md border border-[#E9E2C8] bg-green-600 text-white px-3 py-1.5 text-xs font-medium "
            >
              <i className="fa-solid fa-file-excel"></i> Import Excel
            </button>
            <span>Last updated: {lastUpdatedLabel}</span>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Base Rate"
            value={`₹ ${current.baseRate.toFixed(2)}`}
            subtitle="Base value in formula"
            variant="teal"
          />
          {/* <StatCard
            title="FAT Factor"
            value={current.fatFactor.toFixed(2)}
            subtitle="Rate increase per FAT%"
            variant="orange"
          /> */}
          {/* <StatCard
            title="SNF Factor"
            value={current.snfFactor.toFixed(2)}
            subtitle="Rate increase per SNF%"
            variant="blue"
          /> */}
          <StatCard
            title="Min / Avg / Max Rate"
            value={`₹ ${stats.min} / ₹ ${stats.avg} / ₹ ${stats.max}`}
            variant="green"
            subtitle={undefined}
          />
        </div>

        {/* Range FAT */}

        {/* Formula + preview */}
        <div className="grid gap-4 lg:grid-cols-1">
          {/* Formula card */}
          <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold text-[#5E503F]">
              Formula Configuration
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <InputField
                label="Base Rate (₹)"
                type="number"
                step="0.01"
                value={String(current.baseRate)}
                onChange={(e) =>
                  handleFormulaChange("baseRate", e.target.value)
                }
              />
            </div>
            <h3 className="text-xs font-semibold text-[#5E503F] mt-4">
              FAT Range
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Min"
                type="number"
                step="0.1"
                value={String(current.fatMin)}
                onChange={(e) =>
                  setCurrent({ ...current, fatMin: Number(e.target.value) })
                }
              />
              <InputField
                label="Max"
                type="number"
                step="0.1"
                value={String(current.fatMax)}
                onChange={(e) =>
                  setCurrent({ ...current, fatMax: Number(e.target.value) })
                }
              />
              {/* <InputField
                label="FAT Factor"
                type="number"
                step="0.01"
                value={String(current.fatFactor)}
                onChange={(e) =>
                  handleFormulaChange("fatFactor", e.target.value)
                }
              /> */}
            </div>

            {/* FAT SLABS CONFIG */}

            <h3 className="text-xs font-semibold text-[#5E503F] mt-5 mb-1">
              FAT Difference
            </h3>

            <div className="space-y-2">
              {(showAllFatSlabs
                ? current.fatSlabs
                : current.fatSlabs?.slice(0, 1)
              )?.map((slab, i) => (
                <div
                  key={i}
                  className="flex items-end gap-2 rounded-lg border border-[#E9E2C8] bg-[#FAF7ED] p-2 transition hover:border-[#2A9D8F] hover:bg-[#F1F9F7]"
                >
                  <InputField
                    label="From"
                    type="number"
                    step="0.1"
                    value={String(slab.from)}
                    onChange={(e) =>
                      updateSlab(i, "from", Number(e.target.value))
                    }
                  />

                  <InputField
                    label="To"
                    type="number"
                    step="0.1"
                    value={String(slab.to)}
                    onChange={(e) =>
                      updateSlab(i, "to", Number(e.target.value))
                    }
                  />

                  <InputField
                    label="Rate /0.1 FAT"
                    type="number"
                    step="0.01"
                    value={String(slab.rate)}
                    onChange={(e) =>
                      updateSlab(i, "rate", Number(e.target.value))
                    }
                  />

                  <button
                    type="button"
                    onClick={() => deleteSlab(i)}
                    className="mt-5 rounded bg-red-500 px-2 py-1 text-white text-xs"
                  >
                    Delete
                  </button>
                </div>
              ))}

              {current.fatSlabs.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAllFatSlabs(!showAllFatSlabs)}
                    className="text-[11px] text-[#2A9D8F] font-medium hover:underline"
                  >
                    {showAllFatSlabs
                      ? "Hide Slabs"
                      : `View All Slabs (${current.fatSlabs.length})`}
                  </button>
                  <br />
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  addSlab();
                  setShowAllFatSlabs(true);
                }}
                disabled={isFatMaxReached}
                className={`mt-2 inline-flex items-center gap-1 rounded-md px-4 py-1.5 text-xs font-medium text-white shadow transition-all duration-200
    ${
      isFatMaxReached
        ? "bg-gray-400 cursor-not-allowed opacity-80"
        : "bg-[#2A9D8F] hover:bg-[#247B71] cursor-pointer"
    }`}
              >
                <span className="text-lg leading-none">＋</span>Add FAT Diff
              </button>
            </div>
            <br />
            <div className="border-t border-gray-300"></div>

            {/* Range SNF */}
            <h3 className="text-xs font-semibold text-[#5E503F] mt-4">
              SNF Range
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Min"
                type="number"
                step="0.1"
                value={String(current.snfMin)}
                onChange={(e) =>
                  setCurrent({ ...current, snfMin: Number(e.target.value) })
                }
              />
              <InputField
                label="Max"
                type="number"
                step="0.1"
                value={String(current.snfMax)}
                onChange={(e) =>
                  setCurrent({ ...current, snfMax: Number(e.target.value) })
                }
              />
              {/* <InputField
                label="SNF Factor"
                type="number"
                step="0.01"
                value={String(current.snfFactor)}
                onChange={(e) =>
                  handleFormulaChange("snfFactor", e.target.value)
                }
              /> */}
            </div>

            {/* SNF SLABS CONFIG */}

            <h3 className="text-xs font-semibold text-[#5E503F] mt-5">
              SNF Difference
            </h3>

            <div className="space-y-2">
              {(showAllSnfSlabs
                ? current.snfSlabs
                : current.snfSlabs?.slice(0, 1)
              )?.map((slab, i) => (
                <div
                  key={i}
                  className="flex items-end gap-2 rounded-lg border border-[#E9E2C8] bg-[#FAF7ED] p-2 transition hover:border-[#2A9D8F] hover:bg-[#F1F9F7]"
                >
                  <InputField
                    label="From"
                    type="number"
                    step="0.1"
                    value={String(slab.from)}
                    onChange={(e) =>
                      updateSnfSlab(i, "from", Number(e.target.value))
                    }
                  />

                  <InputField
                    label="To"
                    type="number"
                    step="0.1"
                    value={String(slab.to)}
                    onChange={(e) =>
                      updateSnfSlab(i, "to", Number(e.target.value))
                    }
                  />

                  <InputField
                    label="Rate /0.1 SNF"
                    type="number"
                    step="0.01"
                    value={String(slab.rate)}
                    onChange={(e) =>
                      updateSnfSlab(i, "rate", Number(e.target.value))
                    }
                  />

                  <button
                    type="button"
                    onClick={() => deleteSnfSlab(i)}
                    className="mt-5 rounded bg-red-500 px-2 py-1 text-white text-xs"
                  >
                    Delete
                  </button>
                </div>
              ))}

              {current.snfSlabs.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAllSnfSlabs(!showAllSnfSlabs)}
                    className="text-[11px] text-[#2A9D8F] font-medium hover:underline"
                  >
                    {showAllSnfSlabs
                      ? "Hide Slabs"
                      : `View All Slabs (${current.snfSlabs.length})`}
                  </button>
                  <br />
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  addSnfSlab();
                  setShowAllSnfSlabs(true);
                }}
                disabled={isSnfMaxReached}
                className={`mt-2 inline-flex items-center gap-1 rounded-md px-4 py-1.5 text-xs font-medium text-white shadow transition-all duration-200
    ${
      isSnfMaxReached
        ? "bg-gray-400 cursor-not-allowed opacity-80"
        : "bg-[#2A9D8F] hover:bg-[#247B71] cursor-pointer"
    }`}
              >
                <span className="text-lg leading-none">＋</span>
                Add SNF Diff
              </button>
            </div>

            <p className="mt-2 text-xs text-[#5E503F]/70">
              Formula:{" "}
              <strong>Rate = Base + FAT × Difference + SNF × Difference</strong>
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={regenerateFromFormula}
                disabled={generating}
                className="rounded-md bg-[#2A9D8F] px-4 py-2 text-xs font-medium text-white shadow hover:bg-[#247B71] disabled:opacity-70"
              >
                {generating
                  ? "Generating..."
                  : "Apply Formula (Generate Chart)"}
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="rounded-md border border-[#E9E2C8] bg-white px-4 py-2 text-xs font-medium text-[#E76F51] hover:bg-[#E76F51]/10"
              >
                Reset to Default ({activeMilkType})
              </button>
            </div>
          </div>
        </div>

        {/* Matrix editor */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#5E503F]">
              Rate Chart {/*Matrix (FAT × SNF) */}
            </h2>
            <div className="flex items-center gap-3 text-xs text-[#5E503F]/70"></div>
          </div>

          <div className="w-full rounded-lg border border-[#E9E2C8]">
            <div className="overflow-auto max-h-[calc(100vh-520px)]">
              <table className="min-w-max border-collapse text-xs">
                <thead className="sticky top-0 z-20 bg-[#F8F4E3]">
                  <tr>
                    <th className="sticky left-0 z-30 border border-[#E9E2C8] bg-[#F8F4E3] px-2 py-1 text-left text-[11px] text-[#5E503F]">
                      FAT \ SNF
                    </th>
                    {current.snfs.map((snf) => (
                      <th
                        key={snf}
                        className="border border-[#E9E2C8] bg-[#F8F4E3] px-2 py-1 text-center text-[11px] text-[#5E503F]"
                      >
                        {snf.toFixed(1)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {current.fats.map((fat, fi) => (
                    <tr key={fat}>
                      <th className="sticky left-0 z-30 border border-[#E9E2C8] bg-[#F8F4E3] px-2 py-1 text-left text-[11px] text-[#5E503F]">
                        {fat.toFixed(1)}
                      </th>
                      {current.snfs.map((snf, si) => (
                        <td
                          key={snf}
                          className="border border-[#E9E2C8] px-1 py-[2px] text-center"
                        >
                          <input
                            type="number"
                            step="0.01"
                            className="w-20 rounded border border-[#E9E2C8] bg-white px-2 py-1 text-right text-[11px] text-[#5E503F] outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                            value={(current.rates?.[fi]?.[si] ?? 0).toFixed(2)}
                            onChange={(e) =>
                              handleCellChange(fi, si, e.target.value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Button */}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-white text-xs"
            >
              <i className="fa-solid fa-file-excel"></i>
              Export Excel
            </button>

            {/* Save button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-[#2A9D8F] px-5 py-2 text-sm font-medium text-white shadow hover:bg-[#247B71] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save Rate Charts"}
            </button>
          </div>
        </div>
      </div>

      {/* Reset confirm modal */}
      <ConfirmModal
        open={showResetConfirm}
        title={`Reset ${activeMilkType} Rate Chart`}
        variant="danger"
        description={
          <div className="space-y-1 text-sm">
            <p>
              This will reset the entire{" "}
              <strong>
                {activeMilkType === "cow"
                  ? "Cow"
                  : activeMilkType === "buffalo"
                    ? "Buffalo"
                    : "Mix"}
              </strong>
              rate chart back to the default formula‑based values.
            </p>
            <p className="text-xs text-[#5E503F]/70">
              Any manual changes you made in the matrix will be lost.
            </p>
          </div>
        }
        confirmLabel="Reset"
        cancelLabel="Cancel"
        onConfirm={resetToDefault}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};

export default RateChartPage;
