import { useEffect, useState, useCallback } from "react";
import { getSuperadminDashboardData, type SuperadminDashboardResponse } from "../../../axios/superadmin_dashboard_api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  Droplets, Building2, Users, IndianRupee, TrendingUp,
  RefreshCw, Activity, ChevronUp, ChevronDown, Minus,
  Calendar, Filter, X,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type MilkTypeFilter = "all" | "cow" | "buffalo" | "mix";
type RangePreset = 7 | 30 | 90 | "custom";

// ─── Helpers & Constants ──────────────────────────────────────────────────────

const COLORS = {
  cow: "#f59e0b",
  buffalo: "#3b82f6",
  mix: "#8b5cf6",
  primary: "#3b82f6",
  green: "#22c55e",
};

const PIE_PALETTE = [
  "#3b82f6", "#f59e0b", "#8b5cf6", "#22c55e",
  "#ef4444", "#f97316", "#06b6d4", "#8b5cf6",
];

const MILK_TYPE_META: Record<MilkTypeFilter, { label: string; color: string }> = {
  all: { label: "All Types", color: "#3b82f6" },
  cow: { label: "Cow", color: "#f59e0b" },
  buffalo: { label: "Buffalo", color: "#3b82f6" },
  mix: { label: "Mix", color: "#8b5cf6" },
};

function fmt(n: number | undefined | null, decimals = 0): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

function fmtDate(str: string): string {
  const d = new Date(str);
  return isNaN(d.getTime()) ? str : `${d.getDate()}/${d.getMonth() + 1}`;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getPresetRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: toDateStr(from), to: toDateStr(to) };
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function EmptyChart({ height = 180, message = "No data for this period" }: { height?: number; message?: string }) {
  return (
    <div style={{ height }} className="flex flex-col items-center justify-center gap-2.5">
      <div className="flex items-end gap-1.5 opacity-50">
        {[40, 65, 30, 80, 50, 70, 45].map((h, i) => (
          <div key={i} style={{ height: h }} className="w-3 rounded-sm border-[1.5px] border-dashed border-gray-300" />
        ))}
      </div>
      <span className="text-xs text-gray-500 font-sans">{message}</span>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, trend }: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; color: string; trend?: "up" | "down" | "flat";
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 flex flex-col gap-2.5 relative overflow-hidden shadow-sm">
      <div
        className="absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-10 blur-xl"
        style={{ background: color }}
      />
      <div className="flex items-center gap-2.5">
        <span
          className="rounded-lg p-1.5 flex"
          style={{ background: color + "15", color }}
        >
          {icon}
        </span>
        <span className="text-gray-500 text-[13px] font-sans font-medium">{label}</span>
        {trend === "up" && <ChevronUp size={14} className="ml-auto text-green-500" />}
        {trend === "down" && <ChevronDown size={14} className="ml-auto text-red-500" />}
        {trend === "flat" && <Minus size={14} className="ml-auto text-gray-500" />}
      </div>
      <div className="text-2xl font-bold text-gray-800 font-mono tracking-tight">{value}</div>
      {sub && <div className="text-xs text-gray-500 font-sans">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 shadow-md font-sans z-50">
      <div className="text-gray-500 mb-1 font-medium">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === "number" ? fmt(p.value, 1) : p.value}
        </div>
      ))}
    </div>
  );
};

// ─── Chart & Table Modular Components ─────────────────────────────────────────

function DailyTrendChart({ data }: { data: any[] }) {
  const [metric, setMetric] = useState<"liters" | "amount">("liters");

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={15} className="text-blue-500" />
        <span className="text-sm font-semibold text-gray-800">Daily Milk Collection Trend</span>
        <span className="ml-auto text-xs text-gray-500">litres / ₹</span>
        {/* Toggle Switch */}
        <div className="ml-auto flex items-center bg-gray-100/80 rounded-lg p-1 border border-gray-200">
          <button
            onClick={() => setMetric("liters")}
            className={`cursor-pointer px-3 py-1 text-xs font-semibold rounded-md transition-all ${metric === "liters"
              ? "bg-white text-blue-600 shadow-sm border border-gray-200/50"
              : "text-gray-500 hover:text-gray-700 bg-transparent border border-transparent"
              }`}
          >
            Litres
          </button>
          <button
            onClick={() => setMetric("amount")}
            className={`cursor-pointer px-3 py-1 text-xs font-semibold rounded-md transition-all ${metric === "amount"
              ? "bg-white text-amber-600 shadow-sm border border-gray-200/50"
              : "text-gray-500 hover:text-gray-700 bg-transparent border border-transparent"
              }`}
          >
            Amount ₹
          </button>
        </div>
      </div>
      {data.length === 0 ? <EmptyChart height={200} message="No collection records in this period" /> : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ left: -10, right: 4 }}>
            <defs>
              <linearGradient id="litGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="amtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }} iconType="circle" iconSize={8} />
            {metric === "liters"
              ? <Area type="monotone" dataKey="liters" name="Litres" stroke="#3b82f6" fill="url(#litGrad)" strokeWidth={2} dot={false} />
              : <Area type="monotone" dataKey="amount" name="Amount ₹" stroke="#f59e0b" fill="url(#amtGrad)" strokeWidth={2} dot={false} />
            }
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function CenterSharePieChart({ data, milkType, mc }: { data: any[]; milkType: MilkTypeFilter; mc: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2.5">
        <TrendingUp size={15} className="text-blue-500" />
        <span className="text-sm font-semibold text-gray-800">Center-wise Share</span>
        {milkType !== "all" && (
          <span
            className="ml-auto text-[11px] rounded-full px-2 py-0.5 font-semibold"
            style={{ color: mc, backgroundColor: mc + "10" }}
          >
            {MILK_TYPE_META[milkType].label}
          </span>
        )}
      </div>
      {data.length === 0 ? <EmptyChart height={190} message="No collection data yet" /> : (
        <>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {data.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
              </Pie>
              <Tooltip content={({ active, payload }) => active && payload?.length ? (
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 shadow-md">
                  <div className="font-medium">{payload[0].name}</div>
                  <div className="text-blue-500 font-bold">{fmt(payload[0].value as number, 1)} L</div>
                </div>
              ) : null} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 mt-1">
            {data.slice(0, 5).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                <span className="text-gray-500 flex-1 truncate">{d.name}</span>
                <span className="text-gray-600 font-mono text-[11px] font-semibold">{fmt(d.value, 0)} L</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MilkTypeBarChart({ data, milkType, mc }: { data: any[]; milkType: MilkTypeFilter; mc: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Droplets size={15} className="text-amber-500" />
        <span className="text-sm font-semibold text-gray-800">Milk Type Breakdown</span>
        {milkType !== "all" && <span className="ml-auto text-[11px] font-medium" style={{ color: mc }}>filtered: {MILK_TYPE_META[milkType].label}</span>}
      </div>
      {data.length === 0 ? <EmptyChart height={160} message="No milk entries recorded yet" /> : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280", fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="liters" name="Litres" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="flex gap-2.5 mt-3">
        {data.map((d) => (
          <div
            key={d.name}
            className="flex-1 rounded-lg px-2.5 py-1.5 text-center border"
            style={{ backgroundColor: d.fill + "10", borderColor: d.fill + "20" }}
          >
            <div className="text-[11px] font-semibold" style={{ color: d.fill }}>{d.name}</div>
            <div className="text-[13px] font-bold text-gray-800 font-mono">{fmt(d.liters, 0)} L</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FatSnfTrendChart({ data, summary }: { data: any[]; summary: any }) {
  const [localMilkType, setLocalMilkType] = useState<"all" | "cow" | "buffalo" | "mix">("all");

  // Dynamically determine which data keys to read from the API based on the selection
  const fatKey = localMilkType === "all" ? "avgFat" : `${localMilkType}Fat`;
  const snfKey = localMilkType === "all" ? "avgSnf" : `${localMilkType}Snf`;

  // Dynamically determine the summary stats keys
  const summaryFatKey = localMilkType === "all" ? "avgFat" : `${localMilkType}AvgFat`;
  const summarySnfKey = localMilkType === "all" ? "avgSnf" : `${localMilkType}AvgSnf`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={15} className="text-purple-500" />
        <span className="text-sm font-semibold text-gray-800">Avg Fat & SNF Trend</span>

        {/* Local Milk Type Filter Toggle */}
        <div className="ml-auto flex items-center bg-gray-100/80 rounded-lg p-1 border border-gray-200">
          {(["all", "cow", "buffalo", "mix"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setLocalMilkType(type)}
              className={`cursor-pointer px-2.5 py-1 text-xs font-semibold rounded-md transition-all capitalize ${localMilkType === type
                  ? "bg-white text-purple-600 shadow-sm border border-gray-200/50"
                  : "text-gray-500 hover:text-gray-700 bg-transparent border border-transparent"
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? <EmptyChart height={160} message="Fat & SNF will appear once milk is recorded" /> : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ left: -10, right: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }} iconType="circle" iconSize={8} />

            {/* Lines update dynamically based on localMilkType */}
            <Line type="monotone" dataKey={fatKey} name={`${localMilkType !== "all" ? localMilkType.charAt(0).toUpperCase() + localMilkType.slice(1) + " " : ""}Avg FAT`} stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey={snfKey} name={`${localMilkType !== "all" ? localMilkType.charAt(0).toUpperCase() + localMilkType.slice(1) + " " : ""}Avg SNF`} stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex gap-2.5 mt-3">
        <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-center transition-colors">
          <div className="text-[11px] text-amber-600 font-semibold capitalize">
            {localMilkType === "all" ? "Avg FAT" : `${localMilkType} Avg FAT`}
          </div>
          <div className="text-[13px] font-bold text-gray-800 font-mono">
            {summary?.[summaryFatKey] != null ? fmt(summary[summaryFatKey], 2) : "—"}
          </div>
        </div>
        <div className="flex-1 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5 text-center transition-colors">
          <div className="text-[11px] text-purple-700 font-semibold capitalize">
            {localMilkType === "all" ? "Avg SNF" : `${localMilkType} Avg SNF`}
          </div>
          <div className="text-[13px] font-bold text-gray-800 font-mono">
            {summary?.[summarySnfKey] != null ? fmt(summary[summarySnfKey], 2) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function CentersTable({ centers, milkType, mc, centerLiters }: { centers: any[]; milkType: MilkTypeFilter; mc: string; centerLiters: (c: any) => number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={15} className="text-green-500" />
        <span className="text-sm font-semibold text-gray-800">Center Performance</span>
        {milkType !== "all" && (
          <span
            className="text-xs rounded-full px-2.5 py-0.5 font-medium border"
            style={{ color: mc, backgroundColor: mc + "10", borderColor: mc + "20" }}
          >
            {MILK_TYPE_META[milkType].label} litres
          </span>
        )}
        <span className="ml-auto text-[11px] text-gray-400">ranked by litres</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["#", "Center", "Status", "Farmers",
                milkType === "all" ? "Total Litres" : `${MILK_TYPE_META[milkType].label} Litres`,
                "Revenue", "Avg FAT", "Avg SNF"
              ].map((h) => (
                <th
                  key={h}
                  className={`px-3 py-2 text-gray-500 font-semibold text-[11px] uppercase tracking-wider border-b border-gray-200 ${h === "#" || h === "Status" ? "text-center" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {centers.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-500 text-[13px]">No centers registered yet</td></tr>
            ) : centers.map((c, i) => {
              const litVal = centerLiters(c);
              const litColor = milkType === "all" ? "#3b82f6" : mc;
              return (
                <tr key={c._id} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors group">
                  <td className="px-3 py-3 text-center text-gray-500 font-mono">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-gray-800">{c.name}</div>
                    {c.location && <div className="text-[11px] text-gray-500">{c.location}</div>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${c.status === "Active"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-red-100 text-red-800 border-red-200"
                      }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 font-mono text-xs">{fmt(c.farmerCount)}</td>
                  <td className="px-3 py-3 font-mono font-bold" style={{ color: litColor }}>{fmt(litVal, 1)} L</td>
                  <td className="px-3 py-3 text-green-600 font-mono font-medium">{c.totalRevenue > 0 ? `₹${fmt(c.totalRevenue)}` : "—"}</td>
                  <td className="px-3 py-3 text-amber-600 font-mono text-xs font-medium">{c.avgFat != null ? fmt(c.avgFat, 2) : "—"}</td>
                  <td className="px-3 py-3 text-purple-700 font-mono text-xs font-medium">{c.avgSnf != null ? fmt(c.avgSnf, 2) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<SuperadminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [preset, setPreset] = useState<RangePreset>(30);
  const [customFrom, setCustomFrom] = useState(() => getPresetRange(30).from);
  const [customTo, setCustomTo] = useState(() => getPresetRange(30).to);
  const [milkType, setMilkType] = useState<MilkTypeFilter>("all");

  const resolvedFrom = preset === "custom" ? customFrom : getPresetRange(preset as number).from;
  const resolvedTo = preset === "custom" ? customTo : getPresetRange(preset as number).to;

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true);
      const res = await getSuperadminDashboardData({ from: resolvedFrom, to: resolvedTo });
      setData(res.data);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolvedFrom, resolvedTo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived / filtered data ───────────────────────────────────────────────

  const summary = data?.summary;
  const centers = data?.centers ?? [];
  const dailyTrend = data?.dailyTrend ?? [];
  const fatSnfTrend = data?.fatSnfTrend ?? [];
  const milkTypeBreakdown = data?.milkTypeBreakdown ?? {};

  // Filtered liters for stat card
  const filteredTotalLiters =
    milkType === "cow" ? (summary?.cowLiters ?? 0)
      : milkType === "buffalo" ? (summary?.buffaloLiters ?? 0)
        : milkType === "mix" ? (summary?.mixLiters ?? 0)
          : (summary?.totalLiters ?? 0);

  // Which liters field to use per center
  const centerLiters = useCallback((c: typeof centers[0]) =>
    milkType === "cow" ? c.cowLiters
      : milkType === "buffalo" ? c.buffaloLiters
        : milkType === "mix" ? c.mixLiters
          : c.totalLiters, [milkType]);

  // Daily trend
  const aggregatedTrend = dailyTrend.map((pt) => ({
    date: fmtDate(pt.date), liters: pt.totalLiters, amount: pt.totalAmount, abc: 1000,
  }));

  // Pie — center share by selected milk type
  const pieData = centers
    .filter((c) => centerLiters(c) > 0)
    .map((c) => ({ name: c.name, value: centerLiters(c) }));

  // Milk type bar chart
  const allMilkTypeData = [
    { name: "Cow", liters: milkTypeBreakdown.cow?.liters ?? 0, fill: COLORS.cow },
    { name: "Buffalo", liters: milkTypeBreakdown.buffalo?.liters ?? 0, fill: COLORS.buffalo },
    { name: "Mix", liters: milkTypeBreakdown.mix?.liters ?? 0, fill: COLORS.mix },
  ];
  const milkTypeData = allMilkTypeData
    .filter((d) => milkType === "all" ? d.liters > 0 : d.name.toLowerCase() === milkType);

  // Fat/SNF trend
  const fatSnfData = fatSnfTrend.map((pt) => ({
    label: fmtDate(pt.date), ...pt,
  }));
  console.log("fatSnfTrend ::::::::::::::", fatSnfTrend);
  console.log("fatSnfData ::::::::::::::", fatSnfData);

  // Centers table sorted by selected milk type liters
  const topCenters = [...centers].sort((a, b) => centerLiters(b) - centerLiters(a));

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-[3px] border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-gray-500 font-sans text-sm">Loading dashboard…</p>
      </div>
    );
  }

  const mc = MILK_TYPE_META[milkType].color;

  return (
    <div
      className="min-h-screen bg-gray-50 px-8 py-7 font-sans text-gray-800"
      style={{ backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.06), transparent)" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap');
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[26px] font-bold text-gray-800 m-0 font-mono tracking-tight">
            Super Admin<span className="text-blue-500"> Dashboard</span>
          </h1>
          <p className="m-0 mt-1 text-gray-500 text-[13px]">
            {summary?.totalCenters ?? 0} centers · {summary?.activeCenters ?? 0} active
            <span className="ml-2 text-gray-400">· {resolvedFrom} → {resolvedTo}</span>
          </p>
        </div>
        <button
          onClick={() => fetchAll(true)}
          disabled={refreshing}
          className="bg-blue-50/50 border border-blue-500/30 text-blue-500 rounded-lg px-3.5 py-1.5 cursor-pointer flex items-center gap-1.5 text-[13px] font-semibold transition-colors hover:bg-blue-100 disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 mb-5 flex items-center gap-3 flex-wrap shadow-sm">
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-gray-500 mr-1" />
          <span className="text-xs text-gray-500 font-medium mr-1">Period:</span>
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              className={`cursor-pointer border rounded-md px-3 py-1 text-xs font-medium transition-all ${preset === d ? "border-blue-500 text-blue-500 bg-blue-50/50" : "border-gray-200 bg-white text-gray-500 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50/30"
                }`}
              onClick={() => setPreset(d)}
            >
              {d}d
            </button>
          ))}
          <button
            className={`cursor-pointer border rounded-md px-3 py-1 text-xs font-medium transition-all ${preset === "custom" ? "border-blue-500 text-blue-500 bg-blue-50/50" : "border-gray-200 bg-white text-gray-500 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50/30"
              }`}
            onClick={() => setPreset("custom")}
          >
            Custom
          </button>
        </div>

        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="bg-white border border-gray-200 rounded-md text-gray-800 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            <span className="text-gray-400 text-xs">→</span>
            <input type="date" value={customTo} min={customFrom} max={toDateStr(new Date())} onChange={(e) => setCustomTo(e.target.value)} className="bg-white border border-gray-200 rounded-md text-gray-800 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            <button onClick={() => fetchAll()} className="bg-blue-50/50 border border-blue-500/30 text-blue-500 rounded-md px-3 py-1.5 cursor-pointer text-xs font-semibold hover:bg-blue-100 transition-colors">Apply</button>
          </div>
        )}

        <div className="w-[1px] h-5 bg-gray-200 mx-1" />

        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-gray-500 mr-1" />
          <span className="text-xs text-gray-500 font-medium mr-1">Milk Type:</span>
          {(["all", "cow", "buffalo", "mix"] as MilkTypeFilter[]).map((t) => {
            const meta = MILK_TYPE_META[t];
            const isActive = milkType === t;
            return (
              <button
                key={t}
                onClick={() => setMilkType(t)}
                className="cursor-pointer border rounded-full px-3 py-1 text-xs font-medium transition-all flex items-center gap-1.5"
                style={{ borderColor: isActive ? meta.color : "#e5e7eb", color: isActive ? meta.color : "#6b7280", background: isActive ? meta.color + "10" : "#ffffff" }}
              >
                {t !== "all" && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: meta.color }} />}
                {meta.label}
              </button>
            );
          })}
          {milkType !== "all" && (
            <button onClick={() => setMilkType("all")} title="Clear" className="bg-transparent border-none text-gray-400 cursor-pointer flex p-0.5 hover:text-gray-600 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>

        {milkType !== "all" && (
          <div className="ml-auto rounded-full px-3 py-0.5 text-[11px] font-semibold border" style={{ backgroundColor: mc + "15", borderColor: mc + "30", color: mc }}>
            Showing: {MILK_TYPE_META[milkType].label} only
          </div>
        )}
      </div>

      {data && summary?.totalLiters === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4.5 py-2.5 mb-5 flex items-center gap-2.5 text-[13px]">
          <Droplets size={15} className="text-amber-600" />
          <span className="text-amber-700">
            No milk records between <strong>{resolvedFrom}</strong> and <strong>{resolvedTo}</strong>. Charts will populate once milk entries are added.
          </span>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mb-6">
        <StatCard icon={<Building2 size={16} />} label="Active Centers" value={String(summary?.activeCenters ?? 0)} sub={`${summary?.totalCenters ?? 0} total registered`} color="#3b82f6" trend="flat" />
        <StatCard icon={<Users size={16} />} label="Total Farmers" value={fmt(summary?.totalFarmers)} sub="across all centers" color="#8b5cf6" trend="up" />
        <StatCard icon={<Droplets size={16} />} label={milkType === "all" ? "Milk Collected" : `${MILK_TYPE_META[milkType].label} Milk`} value={`${fmt(filteredTotalLiters, 0)} L`} sub={milkType !== "all" ? `of ${fmt(summary?.totalLiters, 0)} L total` : "combined collection"} color={mc} trend="up" />
        <StatCard icon={<IndianRupee size={16} />} label="Total Revenue" value={`₹${fmt(summary?.totalRevenue)}`} sub="net payable" color="#22c55e" trend="up" />
      </div>

      {/* ── Extracted Components ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 mb-4">
        <DailyTrendChart data={aggregatedTrend} />
        <CenterSharePieChart data={pieData} milkType={milkType} mc={mc} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <MilkTypeBarChart data={milkTypeData} milkType={milkType} mc={mc} />
        <FatSnfTrendChart data={fatSnfData} summary={summary} />
      </div>

      <CentersTable centers={topCenters} milkType={milkType} mc={mc} centerLiters={centerLiters} />
    </div>
  );
}