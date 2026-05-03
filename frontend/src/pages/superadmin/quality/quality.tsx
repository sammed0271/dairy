// src/pages/superadmin/quality/qualityControl.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getCenters } from "../../../axios/center_api";
import {
  getQualityDashboard,
  type QualityDashboardResponse,
  type HighRiskFarmer,
  type CenterComparison,
} from "../../../axios/superadmin_quality_api";
import toast from "react-hot-toast";

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function fmt2(n: number | null | undefined) {
  return n != null ? n.toFixed(2) : "—";
}

function fmtDate(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : `${d.getDate()}/${d.getMonth() + 1}`;
}

type RangePreset = "7" | "30" | "custom";

const MILK_TYPES = [
  { value: "", label: "All Milk Types" },
  { value: "cow", label: "🐄 Cow" },
  { value: "buffalo", label: "🐃 Buffalo" },
  { value: "mix", label: "🥛 Mix" },
];

// ─── sub-components ───────────────────────────────────────────────────────────

const QualityStatCard = ({
  label,
  value,
  sub,
  borderColor,
  textColor,
}: {
  label: string;
  value: string | number;
  sub: string;
  borderColor: string;
  textColor: string;
}) => (
  <div
    className="bg-white rounded-2xl shadow-sm p-5"
    style={{ borderLeft: `4px solid ${borderColor}` }}
  >
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {label}
    </p>
    <p className="text-3xl font-bold mt-2" style={{ color: textColor }}>
      {value}
    </p>
    <p className="text-sm text-slate-500 mt-1">{sub}</p>
  </div>
);

// Donut chart using SVG (matches mockup exactly)
const DonutChart = ({
  excellent,
  good,
  average,
  risk,
  total,
}: {
  excellent: number;
  good: number;
  average: number;
  risk: number;
  total: number;
}) => {
  if (total === 0) return <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>;

  const r = 40;
  const circ = 2 * Math.PI * r;
  const slices = [
    { value: excellent, color: "#22c55e" },
    { value: good, color: "#3b82f6" },
    { value: average, color: "#f59e0b" },
    { value: risk, color: "#ef4444" },
  ];

  let offset = 0;
  const segments = slices.map((s) => {
    const dash = (s.value / total) * circ;
    const seg = { ...s, dash, offset: circ - offset };
    offset += dash;
    return seg;
  });

  return (
    <div className="flex items-center justify-center h-48">
      <div className="relative w-48 h-48">
        <svg
          className="w-full h-full"
          style={{ transform: "rotate(-90deg)" }}
          viewBox="0 0 100 100"
        >
          <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="12"
              strokeDasharray={`${s.dash} ${circ - s.dash}`}
              strokeDashoffset={s.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-bold text-slate-800">{total}</p>
            <p className="text-sm text-slate-500">Total Farmers</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── main page ────────────────────────────────────────────────────────────────

const QualityControlPage: React.FC = () => {
  const [centers, setCenters] = useState<{ _id: string; name: string }[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [selectedMilkType, setSelectedMilkType] = useState<string>("");

  // Date range
  const [rangePreset, setRangePreset] = useState<RangePreset>("30");
  const [customFrom, setCustomFrom] = useState<string>(daysAgoStr(30));
  const [customTo, setCustomTo] = useState<string>(todayStr());

  const [data, setData] = useState<QualityDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewTarget, setReviewTarget] = useState<HighRiskFarmer | null>(null);

  // ── load centers ─────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const res = await getCenters();
        const list = res.data?.centers ?? res.data ?? [];
        setCenters(list);
      } catch {
        // silent
      }
    })();
  }, []);

  // ── load quality data ─────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const from = rangePreset === "custom" ? customFrom : daysAgoStr(Number(rangePreset));
      const to = rangePreset === "custom" ? customTo : todayStr();

      const params: Record<string, string> = { from, to };
      if (selectedCenterId) params.centerId = selectedCenterId;
      if (selectedMilkType) params.milkType = selectedMilkType;

      const res = await getQualityDashboard(params);
      console.log("data :::::", res.data)
      setData(res.data);
    } catch {
      toast.error("Failed to load quality data");
    } finally {
      setLoading(false);
    }
  }, [selectedCenterId, selectedMilkType, rangePreset, customFrom, customTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── derived ───────────────────────────────────────────────────────────────

  const s = data?.summary;
  const total = s?.totalFarmers ?? 0;
  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : "0");

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full w-full overflow-auto bg-slate-50 p-6">
      <style>{`
        .table-row:hover { background: #f0fdf4; }
        .qc-bar { transition: width 0.6s ease; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Quality Control &amp; Comparison
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Monitor milk quality and detect potential adulteration
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition"
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap items-end gap-4">

        {/* Date preset */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Period
          </label>
          <div className="flex bg-slate-100 rounded-xl overflow-hidden text-sm">
            {(["7", "30", "custom"] as RangePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setRangePreset(p)}
                className={`px-4 py-2 transition ${rangePreset === p
                  ? "bg-green-600 text-white font-semibold"
                  : "text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {p === "custom" ? "Custom" : `${p}d`}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date pickers — only shown when custom is selected */}
        {rangePreset === "custom" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                From
              </label>
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                To
              </label>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={todayStr()}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </>
        )}

        {/* Divider */}
        <div className="h-10 w-px bg-slate-200 hidden sm:block" />

        {/* Milk type filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Milk Type
          </label>
          <div className="flex bg-slate-100 rounded-xl overflow-hidden text-sm">
            {MILK_TYPES.map((mt) => (
              <button
                key={mt.value}
                onClick={() => setSelectedMilkType(mt.value)}
                className={`px-4 py-2 transition whitespace-nowrap ${selectedMilkType === mt.value
                  ? "bg-green-600 text-white font-semibold"
                  : "text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {mt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-10 w-px bg-slate-200 hidden sm:block" />

        {/* Center filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Center
          </label>
          <select
            value={selectedCenterId}
            onChange={(e) => setSelectedCenterId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Centers</option>
            {centers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Active filter chips */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {data && (
            <span className="text-xs text-slate-400">
              {data.meta.from} → {data.meta.to}
              {data.meta.milkType !== "all" && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium capitalize">
                  {data.meta.milkType}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          Loading quality data…
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          No data available.
        </div>
      ) : (
        <>
          {/* ── Stat cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-5 mb-6">
            <QualityStatCard
              label="Excellent Quality"
              value={s?.excellent ?? 0}
              sub={`Farmers (${pct(s?.excellent ?? 0)}%)`}
              borderColor="#22c55e"
              textColor="#16a34a"
            />
            <QualityStatCard
              label="Good Quality"
              value={s?.good ?? 0}
              sub={`Farmers (${pct(s?.good ?? 0)}%)`}
              borderColor="#3b82f6"
              textColor="#2563eb"
            />
            <QualityStatCard
              label="Average Quality "
              value={s?.average ?? 0}
              sub={`Farmers (${pct(s?.average ?? 0)}%)`}
              borderColor="#f59e0b"
              textColor="#d97706"
            />
            <QualityStatCard
              label="Risk Detected"
              value={s?.risk ?? 0}
              sub={`Farmers (${pct(s?.risk ?? 0)}%)`}
              borderColor="#ef4444"
              textColor="#dc2626"
            />
          </div>

          {/* ── Overall quality metrics ───────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-5 mb-6">
            {[
              { label: "Avg FAT", value: `${fmt2(s?.avgFat)}%`, color: "text-green-600", bg: "bg-green-50" },
              { label: "Avg SNF", value: `${fmt2(s?.avgSnf)}%`, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Quality Alerts", value: String(s?.qualityAlerts ?? 0), color: "text-red-600", bg: "bg-red-50" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-2xl ${bg} border border-white shadow-sm p-4 flex items-center gap-4`}>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">All Centers · Last {rangePreset} days</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Comparison Chart + Risk Donut ──────────────────────────────── */}
          <div className="grid grid-cols-2 gap-5 mb-6">

            {/* Farmer avg vs Tank FAT */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-5">
                Farmer Avg vs Tank FAT Comparison
              </h3>
              {data.centerComparison.length === 0 ? (
                <p className="text-sm text-slate-400">No comparison data available.</p>
              ) : (
                <div className="space-y-4">
                  {data.centerComparison.map((c: CenterComparison) => {
                    const maxFat = Math.max(c.farmerAvgFat, c.tankAvgFat, 6);
                    const farmerW = Math.min((c.farmerAvgFat / maxFat) * 100, 100);
                    const tankW = Math.min((c.tankAvgFat / maxFat) * 100, 100);
                    const isRed = c.status === "critical";
                    const isAmber = c.status === "warning";
                    const barColor = isRed ? "bg-red-500" : isAmber ? "bg-amber-500" : "bg-green-500";
                    const barColorLight = isRed ? "bg-red-300" : isAmber ? "bg-amber-300" : "bg-green-300";
                    const devText = isRed
                      ? `text-red-600`
                      : isAmber
                        ? `text-amber-600`
                        : `text-green-600`;
                    const devNote = isRed
                      ? `⚠ ${c.deviationPct}% deviation — INVESTIGATE`
                      : isAmber
                        ? `⚠ ${c.deviationPct}% deviation`
                        : `✓ ${c.deviationPct}% deviation (Normal)`;

                    return (
                      <div key={c.centerId.toString()}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-slate-600">{c.centerName}</span>
                          <span className="text-sm font-medium text-slate-800">
                            Farmer: {fmt2(c.farmerAvgFat)}% | Tank: {fmt2(c.tankAvgFat)}%
                          </span>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                          <div className={`h-full ${barColor} qc-bar`} style={{ width: `${farmerW}%` }} />
                          <div className={`h-full ${barColorLight} qc-bar`} style={{ width: `${Math.max(tankW - farmerW, 0)}%` }} />
                        </div>
                        <p className={`text-xs mt-1 ${devText}`}>{devNote}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Risk donut + legend */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 mb-5">Risk Analysis</h3>
              <DonutChart
                excellent={s?.excellent ?? 0}
                good={s?.good ?? 0}
                average={s?.average ?? 0}
                risk={s?.risk ?? 0}
                total={total}
              />
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { color: "bg-green-500", label: `Excellent (${pct(s?.excellent ?? 0)}%)` },
                  { color: "bg-blue-500", label: `Good (${pct(s?.good ?? 0)}%)` },
                  { color: "bg-amber-500", label: `Average (${pct(s?.average ?? 0)}%)` },
                  { color: "bg-red-500", label: `Risk (${pct(s?.risk ?? 0)}%)` },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${color}`} />
                    <span className="text-sm text-slate-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── FAT/SNF Trend ─────────────────────────────────────────────── */}
          {data.fatSnfTrend.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
              <h3 className="font-semibold text-slate-800 mb-5">
                FAT &amp; SNF Trends ({rangePreset} Days)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={data.fatSnfTrend.map((p) => ({
                    ...p,
                    date: fmtDate(p.date),
                  }))}
                  margin={{ left: -10, right: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgFat"
                    name="FAT %"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgSnf"
                    name="SNF %"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── High Risk Farmers Table ───────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-800">
                High Risk Farmers — Water Mixing Suspected
              </h3>
              {data.highRiskFarmers.length > 0 && (
                <span className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                  {data.highRiskFarmers.length} Alert{data.highRiskFarmers.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {data.highRiskFarmers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-sm">No high-risk farmers detected in this period.</p>
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {[
                        "Farmer",
                        "Center",
                        "Avg FAT",
                        "Avg SNF",
                        "Expected",
                        "Deviation",
                        "Risk Level",
                        "Issue",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.highRiskFarmers.map((f: HighRiskFarmer) => {
                      const isCritical = f.riskLevel === "Critical";
                      return (
                        <tr
                          key={`${f.farmerId}-${f.centerId}`}
                          className={`table-row border-b border-slate-50 transition ${isCritical ? "bg-red-50" : "bg-amber-50"
                            }`}
                        >
                          {/* Farmer */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs">
                                {f.farmerName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {f.farmerName}
                                </p>
                                <p className="text-xs text-slate-500">{f.farmerCode}</p>
                              </div>
                            </div>
                          </td>

                          {/* Center name — look up from comparison */}
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {data.centerComparison.find(
                              (c) => c.centerId.toString() === f.centerId?.toString(),
                            )?.centerName ?? "—"}
                          </td>

                          <td className="py-3 px-4 text-sm text-red-600 font-semibold">
                            {fmt2(f.avgFat)}%
                          </td>
                          <td className="py-3 px-4 text-sm text-red-600 font-semibold">
                            {fmt2(f.avgSnf)}%
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            FAT: {fmt2(f.expectedFat)}% | SNF: {fmt2(f.expectedSnf)}%
                          </td>
                          <td className="py-3 px-4 text-sm text-red-600 font-semibold">
                            {f.deviationPct > 0 ? "+" : ""}
                            {f.deviationPct}%
                          </td>

                          {/* Risk level badge */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${isCritical
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                                }`}
                            >
                              {f.riskLevel}
                            </span>
                          </td>

                          {/* Issue badge */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${f.issue === "Water Suspected"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                                }`}
                            >
                              {f.issue}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setReviewTarget(f)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
                            >
                              Investigate
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Thresholds info strip ─────────────────────────────────────── */}
          {data.meta.thresholds && (
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                Excellent: FAT ≥ {data.meta.thresholds.excellent.fat}% &amp; SNF ≥{" "}
                {data.meta.thresholds.excellent.snf}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Good: FAT ≥ {data.meta.thresholds.good.fat}% &amp; SNF ≥{" "}
                {data.meta.thresholds.good.snf}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Average: FAT ≥ {data.meta.thresholds.average.fat}% &amp; SNF ≥{" "}
                {data.meta.thresholds.average.snf}%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Risk: deviation &gt; {data.meta.thresholds.riskDeviationPct}% from center avg
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Investigate modal ─────────────────────────────────────────────── */}
      {reviewTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setReviewTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 text-lg">
                Investigation Report
              </h3>
              <button
                onClick={() => setReviewTarget(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm">
                {reviewTarget.farmerName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-800">
                  {reviewTarget.farmerName}
                </p>
                <p className="text-sm text-slate-500">{reviewTarget.farmerCode}</p>
              </div>
              <span
                className={`ml-auto px-3 py-1 text-xs font-semibold rounded-full ${reviewTarget.riskLevel === "Critical"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
                  }`}
              >
                {reviewTarget.riskLevel}
              </span>
            </div>

            <div className="space-y-3 mb-5">
              {[
                { label: "Issue Detected", value: reviewTarget.issue, highlight: true },
                { label: "Avg FAT", value: `${fmt2(reviewTarget.avgFat)}%` },
                { label: "Avg SNF", value: `${fmt2(reviewTarget.avgSnf)}%` },
                {
                  label: "Expected FAT",
                  value: `${fmt2(reviewTarget.expectedFat)}%`,
                },
                {
                  label: "FAT Deviation",
                  value: `${reviewTarget.deviationPct > 0 ? "+" : ""}${reviewTarget.deviationPct}%`,
                  highlight: true,
                },
                {
                  label: "Volume (period)",
                  value: `${reviewTarget.totalLiters} L`,
                },
              ].map(({ label, value, highlight }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2 border-b border-slate-100"
                >
                  <span className="text-sm text-slate-500">{label}</span>
                  <span
                    className={`text-sm font-semibold ${highlight ? "text-red-600" : "text-slate-800"
                      }`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 rounded-xl p-4 mb-5 text-sm text-amber-800">
              <p className="font-semibold mb-1">⚠ Recommended Action</p>
              <p>
                Conduct a physical inspection and request a lab test sample from
                this farmer at the next collection. Consider temporary hold on
                milk acceptance until resolved.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  toast.success(`Alert flagged for ${reviewTarget.farmerName}`);
                  setReviewTarget(null);
                }}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition"
              >
                Flag &amp; Notify Manager
              </button>
              <button
                onClick={() => setReviewTarget(null)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityControlPage;