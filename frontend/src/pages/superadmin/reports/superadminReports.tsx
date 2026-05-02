// src/pages/superadmin/reports/SuperadminReportsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import StatCard from "../../../components/statCard";
import DataTable, { type DataTableColumn } from "../../../components/dataTable";
import InputField from "../../../components/inputField";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import {
  getSuperadminDailyReport,
  getSuperadminRangeReport,
  getSuperadminMilkYield,
  getSuperadminMilkEntries,
  getSuperadminBillingReport,
  getSuperadminCenterList,
  type DailyEntryRow,
  type SuperadminDailyReportResponse,
  type SuperadminRangeReportResponse,
  type DaySummaryRow,
  type FarmerSummaryRow,
  type CenterSummaryRow,
  type MilkYieldResponse,
  type SuperadminMilkEntryRow,
  type SuperadminBillingReportResponse,
  type BillingRow,
  type CenterOption,
} from "../../../axios/superadmin_report_api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = new Date(s); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const nDaysAgo = (n: number) => addDays(todayISO(), -n);

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "daily" | "monthly" | "yield" | "billing";
type ShiftFilter = "All" | "morning" | "evening";
type YieldMode = "daily" | "range";

const TABS: { key: Tab; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "monthly", label: "Monthly" },
  { key: "yield", label: "Milk Yield" },
  { key: "billing", label: "Billing" },
];

// ─── Shared sub-components ────────────────────────────────────────────────────

const ExportRow = ({ onExcel, onPdf }: { onExcel: () => void; onPdf: () => void }) => (
  <div className="flex justify-end gap-2 mt-1">
    <button onClick={onExcel} className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-white text-xs hover:bg-green-700">
      <i className="fa-solid fa-file-excel" /> Excel
    </button>
    <button onClick={onPdf} className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-white text-xs hover:bg-blue-700">
      <i className="fa-solid fa-file-pdf" /> PDF
    </button>
  </div>
);

const SectionCard = ({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-[#5E503F]">{title}</h2>
      {badge && <span className="text-xs text-[#5E503F]/60">{badge}</span>}
    </div>
    {children}
  </div>
);

const Loader = () => (
  <p className="py-10 text-center text-sm text-[#5E503F]/60">Loading…</p>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const SuperadminReportsPage: React.FC = () => {

  // ── Shared state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("daily");
  const [centerId, setCenterId] = useState("");
  const [centers, setCenters] = useState<CenterOption[]>([]);

  // Daily
  const [dailyDate, setDailyDate] = useState(todayISO());
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>("All");
  const [dailyReport, setDailyReport] = useState<SuperadminDailyReportResponse | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Monthly
  const [mFrom, setMFrom] = useState(nDaysAgo(9));
  const [mTo, setMTo] = useState(todayISO());
  const [monthlyReport, setMonthlyReport] = useState<SuperadminRangeReportResponse | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);

  // Yield
  const [yMode, setYMode] = useState<YieldMode>("daily");
  const [yDate, setYDate] = useState(todayISO());
  const [yFrom, setYFrom] = useState(nDaysAgo(9));
  const [yTo, setYTo] = useState(todayISO());
  const [yieldData, setYieldData] = useState<MilkYieldResponse | null>(null);
  const [yEntries, setYEntries] = useState<SuperadminMilkEntryRow[]>([]);
  const [yLoading, setYLoading] = useState(false);

  // Billing
  const [bFrom, setBFrom] = useState(nDaysAgo(9));
  const [bTo, setBTo] = useState(todayISO());
  const [billingReport, setBillingReport] = useState<SuperadminBillingReportResponse | null>(null);
  const [billLoading, setBillLoading] = useState(false);

  // ── Load centers once ────────────────────────────────────────────────────────
  useEffect(() => {
    getSuperadminCenterList().then((r) => setCenters(r.data)).catch(console.error);
  }, []);

  // ── Fetch per-tab ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "daily") return;
    setDailyLoading(true);
    getSuperadminDailyReport(dailyDate, centerId || undefined)
      .then((r) => setDailyReport(r.data))
      .catch(() => toast.error("Failed to load daily report"))
      .finally(() => setDailyLoading(false));
  }, [activeTab, dailyDate, centerId]);

  useEffect(() => {
    if (activeTab !== "monthly") return;
    setMonthLoading(true);
    getSuperadminRangeReport(mFrom, mTo, centerId || undefined)
      .then((r) => setMonthlyReport(r.data))
      .catch(() => toast.error("Failed to load monthly report"))
      .finally(() => setMonthLoading(false));
  }, [activeTab, mFrom, mTo, centerId]);

  useEffect(() => {
    if (activeTab !== "yield") return;
    const from = yMode === "daily" ? yDate : yFrom;
    const to = yMode === "daily" ? yDate : yTo;
    setYLoading(true);
    Promise.all([
      getSuperadminMilkYield({ from, to }, centerId || undefined),
      getSuperadminMilkEntries(from, to, centerId || undefined),
    ])
      .then(([y, e]) => { setYieldData(y.data); setYEntries(e.data.entries); })
      .catch(() => toast.error("Failed to load yield report"))
      .finally(() => setYLoading(false));
  }, [activeTab, yMode, yDate, yFrom, yTo, centerId]);

  useEffect(() => {
    if (activeTab !== "billing") return;
    setBillLoading(true);
    getSuperadminBillingReport(bFrom, bTo, centerId || undefined)
      .then((r) => setBillingReport(r.data))
      .catch(() => toast.error("Failed to load billing report"))
      .finally(() => setBillLoading(false));
  }, [activeTab, bFrom, bTo, centerId]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const dailyTableData = useMemo(() => {
    if (!dailyReport) return [];
    if (shiftFilter === "All") return dailyReport.entries;
    return dailyReport.entries.filter((e) => e.shift?.toLowerCase() === shiftFilter);
  }, [dailyReport, shiftFilter]);

  const cowEntries = useMemo(() => yEntries.filter((e) => e.milkType === "cow"), [yEntries]);
  const buffaloEntries = useMemo(() => yEntries.filter((e) => e.milkType === "buffalo"), [yEntries]);
  const mixEntries = useMemo(() => yEntries.filter((e) => e.milkType === "mix"), [yEntries]);

  // ── Column definitions ────────────────────────────────────────────────────

  const dailyCols: DataTableColumn<DailyEntryRow>[] = [
    { id: "center", header: "Center", align: "center", cell: (r) => r.centerId?.name ?? "—" },
    { id: "shift", header: "Shift", align: "center", accessor: "shift" },
    { id: "farmer", header: "Farmer", align: "center", cell: (r) => r.farmerId?.name ?? "Deleted Farmer" },
    { id: "mobile", header: "Mobile", align: "center", cell: (r) => r.farmerId?.mobile ?? "—" },
    { id: "type", header: "Type", align: "center", accessor: "milkType" },
    { id: "liters", header: "Liters", align: "center", cell: (r) => r.quantity.toFixed(2) },
    { id: "fat", header: "FAT %", align: "center", cell: (r) => (r.fat ?? 0).toFixed(1) },
    { id: "snf", header: "SNF %", align: "center", cell: (r) => (r.snf ?? 0).toFixed(1) },
    { id: "rate", header: "Rate", align: "center", cell: (r) => `₹ ${r.rate.toFixed(2)}` },
    { id: "amount", header: "Amount", align: "center", cell: (r) => `₹ ${r.totalAmount.toFixed(2)}` },
  ];

  const dayCols: DataTableColumn<DaySummaryRow>[] = [
    { id: "date", header: "Date", align: "center", accessor: "date" },
    { id: "liters", header: "Total Liters", align: "center", cell: (r) => r.liters.toFixed(2) },
    { id: "amount", header: "Total Amount", align: "center", cell: (r) => `₹ ${r.amount.toFixed(2)}` },
  ];

  const farmerCols: DataTableColumn<FarmerSummaryRow>[] = [
    { id: "code", header: "Code", align: "center", accessor: "farmerCode" },
    { id: "name", header: "Farmer", align: "center", accessor: "farmerName" },
    { id: "center", header: "Center", align: "center", accessor: "centerName" },
    { id: "liters", header: "Total Liters", align: "center", cell: (r) => r.liters.toFixed(2) },
    { id: "amount", header: "Total Amount", align: "center", cell: (r) => `₹ ${r.amount.toFixed(2)}` },
  ];

  const centerCols: DataTableColumn<CenterSummaryRow>[] = [
    { id: "name", header: "Center", align: "center", accessor: "centerName" },
    { id: "liters", header: "Total Liters", align: "center", cell: (r) => r.liters.toFixed(2) },
    { id: "amount", header: "Total Amount", align: "center", cell: (r) => `₹ ${r.amount.toFixed(2)}` },
  ];

  const yieldCols: DataTableColumn<SuperadminMilkEntryRow>[] = [
    { id: "center", header: "Center", align: "center", cell: (r) => r.centerId?.name ?? "—" },
    { id: "date", header: "Date", align: "center", accessor: "date" },
    { id: "shift", header: "Shift", align: "center", accessor: "shift" },
    { id: "farmer", header: "Farmer", align: "center", cell: (r) => r.farmerId?.name ?? "Deleted Farmer" },
    { id: "liters", header: "Liters", align: "center", cell: (r) => r.quantity.toFixed(2) },
    { id: "amount", header: "Amount", align: "center", cell: (r) => `₹ ${r.totalAmount.toFixed(2)}` },
  ];

  const billingCols: DataTableColumn<BillingRow>[] = [
    { id: "center", header: "Center", align: "center", cell: (r) => r.centerId?.name ?? "—" },
    { id: "farmer", header: "Farmer", align: "center", cell: (r) => (typeof r.farmerId === "object" ? r.farmerId?.name : "—") ?? "—" },
    { id: "period", header: "Period", align: "center", cell: (r) => `${r.periodFrom} → ${r.periodTo}` },
    { id: "liters", header: "Liters", align: "center", cell: (r) => r.totalLiters.toFixed(2) },
    { id: "milk", header: "Milk Amt", align: "center", cell: (r) => `₹ ${r.totalMilkAmount.toFixed(2)}` },
    { id: "deduction", header: "Deduction", align: "center", cell: (r) => `₹ ${r.totalDeduction.toFixed(2)}` },
    { id: "bonus", header: "Bonus", align: "center", cell: (r) => `₹ ${r.totalBonus.toFixed(2)}` },
    { id: "net", header: "Net Payable", align: "center", cell: (r) => `₹ ${r.netPayable.toFixed(2)}` },
    {
      id: "status", header: "Status", align: "center",
      cell: (r) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === "Paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"}`}>
          {r.status}
        </span>
      ),
    },
  ];

  // ── Export helpers ────────────────────────────────────────────────────────

  const xlsxSave = (rows: object[], sheet: string, filename: string) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheet);
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]), filename);
  };

  // Daily exports
  const exportDailyExcel = () => {
    if (!dailyTableData.length) return toast.error("No records");
    xlsxSave(dailyTableData.map((e) => ({ Center: e.centerId?.name ?? "—", Shift: e.shift, Farmer: e.farmerId?.name ?? "—", Mobile: e.farmerId?.mobile ?? "—", Type: e.milkType, Liters: e.quantity.toFixed(2), FAT: (e.fat ?? 0).toFixed(1), SNF: (e.snf ?? 0).toFixed(1), Rate: e.rate.toFixed(2), Amount: e.totalAmount.toFixed(2) })), "Daily", `SA-Daily-${dailyDate}.xlsx`);
  };
  const exportDailyPDF = () => {
    if (!dailyTableData.length) return toast.error("No records");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text(`Daily Report — ${dailyDate}`, 14, 10);
    autoTable(doc, { head: [["Center", "Shift", "Farmer", "Mobile", "Type", "Liters", "FAT", "SNF", "Rate", "Amount"]], body: dailyTableData.map((e) => [e.centerId?.name ?? '—', e.shift, e.farmerId?.name ?? '—', e.farmerId?.mobile ?? '—', e.milkType, e.quantity.toFixed(2), (e.fat ?? 0).toFixed(1), (e.snf ?? 0).toFixed(1), `₹${e.rate.toFixed(2)}`, `₹${e.totalAmount.toFixed(2)}`]), startY: 18 });
    doc.save(`SA-Daily-${dailyDate}.pdf`);
  };

  // Monthly exports
  const exportDayRowsExcel = () => {
    if (!monthlyReport?.dayRows?.length) return toast.error("No daily data");
    xlsxSave(monthlyReport.dayRows.map((r) => ({ Date: r.date, Liters: r.liters.toFixed(2), Amount: r.amount.toFixed(2) })), "Daily Summary", `SA-DaySummary-${mFrom}-${mTo}.xlsx`);
  };
  const exportDayRowsPDF = () => {
    if (!monthlyReport?.dayRows?.length) return toast.error("No daily data");
    const doc = new jsPDF(); doc.text(`Daily Summary — ${mFrom} → ${mTo}`, 14, 10);
    autoTable(doc, { head: [["Date", "Liters", "Amount"]], body: monthlyReport.dayRows.map((r) => [r.date, r.liters.toFixed(2), `₹${r.amount.toFixed(2)}`]), startY: 18 });
    doc.save(`SA-DaySummary-${mFrom}-${mTo}.pdf`);
  };
  const exportFarmerExcel = () => {
    if (!monthlyReport?.farmerRows?.length) return toast.error("No farmer data");
    xlsxSave(monthlyReport.farmerRows.map((r) => ({ Code: r.farmerCode, Farmer: r.farmerName, Center: r.centerName, Liters: r.liters.toFixed(2), Amount: r.amount.toFixed(2) })), "Farmers", `SA-FarmerSummary-${mFrom}-${mTo}.xlsx`);
  };
  const exportFarmerPDF = () => {
    if (!monthlyReport?.farmerRows?.length) return toast.error("No farmer data");
    const doc = new jsPDF(); doc.text(`Farmer Summary — ${mFrom} → ${mTo}`, 14, 10);
    autoTable(doc, { head: [["Code", "Farmer", "Center", "Liters", "Amount"]], body: monthlyReport.farmerRows.map((r) => [r.farmerCode, r.farmerName, r.centerName, r.liters.toFixed(2), `₹${r.amount.toFixed(2)}`]), startY: 18 });
    doc.save(`SA-FarmerSummary-${mFrom}-${mTo}.pdf`);
  };
  const exportCenterExcel = () => {
    if (!monthlyReport?.centerRows?.length) return toast.error("No center data");
    xlsxSave(monthlyReport.centerRows.map((r) => ({ Center: r.centerName, Liters: r.liters.toFixed(2), Amount: r.amount.toFixed(2) })), "Centers", `SA-CenterSummary-${mFrom}-${mTo}.xlsx`);
  };
  const exportCenterPDF = () => {
    if (!monthlyReport?.centerRows?.length) return toast.error("No center data");
    const doc = new jsPDF(); doc.text(`Center Summary — ${mFrom} → ${mTo}`, 14, 10);
    autoTable(doc, { head: [["Center", "Liters", "Amount"]], body: monthlyReport.centerRows.map((r) => [r.centerName, r.liters.toFixed(2), `₹${r.amount.toFixed(2)}`]), startY: 18 });
    doc.save(`SA-CenterSummary-${mFrom}-${mTo}.pdf`);
  };

  // Yield exports
  const yFrom_ = yMode === "daily" ? yDate : yFrom;
  const yTo_ = yMode === "daily" ? yDate : yTo;
  const makeYExcel = (list: SuperadminMilkEntryRow[], label: string) => {
    if (!list.length) return toast.error(`No ${label} records`);
    xlsxSave(list.map((e) => ({ Center: e.centerId?.name ?? '—', Date: e.date, Shift: e.shift, Farmer: e.farmerId?.name ?? '—', Liters: e.quantity.toFixed(2), Amount: e.totalAmount.toFixed(2) })), label, `SA-${label}-${yFrom_}-${yTo_}.xlsx`);
  };
  const makeYPDF = (list: SuperadminMilkEntryRow[], label: string) => {
    if (!list.length) return toast.error(`No ${label} records`);
    const doc = new jsPDF(); doc.text(`${label} Milk — ${yFrom_} → ${yTo_}`, 14, 10);
    autoTable(doc, { head: [["Center", "Date", "Shift", "Farmer", "Liters", "Amount"]], body: list.map((e) => [e.centerId?.name ?? '—', e.date, e.shift, e.farmerId?.name ?? '—', e.quantity.toFixed(2), `₹${e.totalAmount.toFixed(2)}`]), startY: 18 });
    doc.save(`SA-${label}-${yFrom_}-${yTo_}.pdf`);
  };

  // Billing exports
  const exportBillExcel = () => {
    if (!billingReport?.rows?.length) return toast.error("No billing records");
    xlsxSave((billingReport.rows).map((r) => ({ Center: r.centerId?.name ?? '—', Farmer: typeof r.farmerId === 'object' ? r.farmerId?.name ?? '—' : '—', PeriodFrom: r.periodFrom, PeriodTo: r.periodTo, Liters: r.totalLiters.toFixed(2), MilkAmount: r.totalMilkAmount.toFixed(2), Deduction: r.totalDeduction.toFixed(2), Bonus: r.totalBonus.toFixed(2), NetPayable: r.netPayable.toFixed(2), Status: r.status })), "Billing", `SA-Billing-${bFrom}-${bTo}.xlsx`);
  };
  const exportBillPDF = () => {
    if (!billingReport?.rows?.length) return toast.error("No billing records");
    const doc = new jsPDF({ orientation: "landscape" }); doc.text(`Billing Report — ${bFrom} → ${bTo}`, 14, 10);
    autoTable(doc, { head: [["Center", "Farmer", "Period", "Liters", "Milk Amt", "Deduction", "Bonus", "Net", "Status"]], body: (billingReport.rows).map((r) => [r.centerId?.name ?? '—', typeof r.farmerId === 'object' ? r.farmerId?.name ?? '—' : '—', `${r.periodFrom}→${r.periodTo}`, r.totalLiters.toFixed(2), `₹${r.totalMilkAmount.toFixed(2)}`, `₹${r.totalDeduction.toFixed(2)}`, `₹${r.totalBonus.toFixed(2)}`, `₹${r.netPayable.toFixed(2)}`, r.status]), startY: 18 });
    doc.save(`SA-Billing-${bFrom}-${bTo}.pdf`);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full w-full overflow-auto bg-[#f9fafb] p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-2xl font-bold text-[#5E503F]">Reports</h1>
          <p className="text-sm text-[#5E503F]/70">Cross-center milk & billing analytics</p>
        </div>

        {/* ── Shared top bar: tabs + center filter ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E2C8] pb-4">
          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === t.key
                  ? "bg-[#2A9D8F] text-white shadow-sm"
                  : "bg-[#E9E2C8] text-[#5E503F] hover:bg-[#D4C5A9]"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Center filter — always visible */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#5E503F]/70 whitespace-nowrap">Center:</label>
            <select
              value={centerId}
              onChange={(e) => setCenterId(e.target.value)}
              className="rounded-md border border-[#D4C5A9] bg-white px-3 py-1.5 text-sm text-[#5E503F] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30"
            >
              <option value="">All Centers</option>
              {centers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB: DAILY
        ══════════════════════════════════════════════════════ */}
        {activeTab === "daily" && (
          <>
            {/* Controls */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-[#5E503F]">Shift:</span>
                {(["All", "morning", "evening"] as ShiftFilter[]).map((s) => (
                  <button key={s} onClick={() => setShiftFilter(s)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${shiftFilter === s ? "bg-[#2A9D8F] text-white" : "bg-[#E9E2C8] text-[#5E503F]"}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="w-44">
                <InputField label="Date" type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Total Liters" value={(dailyReport?.totalLiters ?? 0).toFixed(2)} subtitle={`${dailyReport?.centerCount ?? 0} centers · ${dailyReport?.farmerCount ?? 0} farmers`} variant="teal" />
              <StatCard title="Total Amount (₹)" value={(dailyReport?.totalAmount ?? 0).toFixed(2)} subtitle={`${dailyReport?.entries?.length ?? 0} collections`} variant="blue" />
              <StatCard title="Cow / Buffalo (L)" value={`${(dailyReport?.cowLiters ?? 0).toFixed(1)} / ${(dailyReport?.buffaloLiters ?? 0).toFixed(1)}`} subtitle="Cow / Buffalo" variant="orange" />
              <StatCard title="Morning / Evening" value={`${(dailyReport?.morningLiters ?? 0).toFixed(1)} / ${(dailyReport?.eveningLiters ?? 0).toFixed(1)}`} subtitle="by shift" variant="red" />
            </div>

            {dailyLoading ? <Loader /> : (
              <>
                <DataTable data={dailyTableData} columns={dailyCols} keyField="_id" striped dense emptyMessage="No entries for this date." />
                <ExportRow onExcel={exportDailyExcel} onPdf={exportDailyPDF} />
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: MONTHLY
        ══════════════════════════════════════════════════════ */}
        {activeTab === "monthly" && (
          <>
            {/* Controls */}
            <div className="flex flex-wrap items-end justify-end gap-3">
              <InputField type="date" label="From" value={mFrom} onChange={(e) => { setMFrom(e.target.value); setMTo(addDays(e.target.value, 9)); }} />
              <InputField type="date" label="To" value={mTo} onChange={(e) => setMTo(e.target.value)} />
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Total Liters" value={(monthlyReport?.totalLiters ?? 0).toFixed(2)} subtitle={`${mFrom} → ${mTo}`} variant="teal" />
              <StatCard title="Total Amount (₹)" value={(monthlyReport?.totalAmount ?? 0).toFixed(2)} subtitle={`${monthlyReport?.entryCount ?? 0} entries`} variant="blue" />
              <StatCard title="Cow / Buffalo / Mix (L)" value={`${monthlyReport?.cowLiters ?? 0} / ${monthlyReport?.buffaloLiters ?? 0} / ${monthlyReport?.mixLiters ?? 0}`} subtitle="by type" variant="orange" />
              <StatCard title="Centers / Farmers / Days" value={`${monthlyReport?.centerCount ?? 0} / ${monthlyReport?.farmerCount ?? 0} / ${monthlyReport?.dayCount ?? 0}`} subtitle="active in range" variant="green" />
            </div>

            {monthLoading ? <Loader /> : (
              <div className="space-y-4">
                {!centerId && (
                  <SectionCard title="Center Summary" badge="ranked by litres">
                    <DataTable data={monthlyReport?.centerRows ?? []} columns={centerCols} keyField="centerId" dense striped emptyMessage="No data." />
                    <ExportRow onExcel={exportCenterExcel} onPdf={exportCenterPDF} />
                  </SectionCard>
                )}
                <SectionCard title="Daily Summary" badge={`${mFrom} → ${mTo}`}>
                  <DataTable data={monthlyReport?.dayRows ?? []} columns={dayCols} keyField="date" dense striped emptyMessage="No daily data." />
                  <ExportRow onExcel={exportDayRowsExcel} onPdf={exportDayRowsPDF} />
                </SectionCard>
                <SectionCard title="Farmer Summary" badge={`${mFrom} → ${mTo}`}>
                  <DataTable data={monthlyReport?.farmerRows ?? []} columns={farmerCols} keyField="farmerId" dense striped emptyMessage="No farmer data." />
                  <ExportRow onExcel={exportFarmerExcel} onPdf={exportFarmerPDF} />
                </SectionCard>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: MILK YIELD
        ══════════════════════════════════════════════════════ */}
        {activeTab === "yield" && (
          <>
            {/* Controls */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex gap-2">
                {(["daily", "range"] as YieldMode[]).map((m) => (
                  <button key={m} onClick={() => setYMode(m)}
                    className={`rounded-md px-4 py-1.5 text-sm ${yMode === m ? "bg-[#2A9D8F] text-white" : "bg-[#E9E2C8] text-[#5E503F]"}`}>
                    {m === "daily" ? "Daily" : "Date Range"}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                {yMode === "daily" ? (
                  <div className="w-44"><InputField label="Date" type="date" value={yDate} onChange={(e) => setYDate(e.target.value)} /></div>
                ) : (
                  <>
                    <InputField type="date" label="From" value={yFrom} onChange={(e) => { setYFrom(e.target.value); setYTo(addDays(e.target.value, 9)); }} />
                    <InputField type="date" label="To" value={yTo} onChange={(e) => setYTo(e.target.value)} />
                  </>
                )}
              </div>
            </div>

            {/* Yield stat cards */}
            {yLoading || !yieldData ? <Loader /> : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard title="Cow Milk (L)" value={yieldData.cow.liters.toFixed(2)} subtitle={`₹ ${yieldData.cow.amount.toFixed(2)}`} variant="orange" />
                  <StatCard title="Buffalo Milk (L)" value={yieldData.buffalo.liters.toFixed(2)} subtitle={`₹ ${yieldData.buffalo.amount.toFixed(2)}`} variant="blue" />
                  <StatCard title="Mix Milk (L)" value={yieldData.mix.liters.toFixed(2)} subtitle={`₹ ${yieldData.mix.amount.toFixed(2)}`} variant="purple" />
                </div>
                <div className="space-y-4">
                  {[
                    { list: cowEntries, label: "Cow" },
                    { list: buffaloEntries, label: "Buffalo" },
                    { list: mixEntries, label: "Mix" },
                  ].map(({ list, label }) => (
                    <SectionCard key={label} title={`${label} Milk Collection`} badge={`${list.length} entries`}>
                      <DataTable data={list} columns={yieldCols} keyField="_id" striped dense emptyMessage={`No ${label.toLowerCase()} milk records.`} />
                      <ExportRow onExcel={() => makeYExcel(list, label)} onPdf={() => makeYPDF(list, label)} />
                    </SectionCard>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: BILLING
        ══════════════════════════════════════════════════════ */}
        {activeTab === "billing" && (
          <>
            {/* Controls */}
            <div className="flex flex-wrap items-end justify-end gap-3">
              <InputField type="date" label="From" value={bFrom} onChange={(e) => { setBFrom(e.target.value); setBTo(addDays(e.target.value, 9)); }} />
              <InputField type="date" label="To" value={bTo} onChange={(e) => setBTo(e.target.value)} />
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Bills" value={billingReport?.billCount ?? 0} subtitle="Total bills" />
              <StatCard title="Milk Amount" value={`₹ ${(billingReport?.totalMilkAmount ?? 0).toFixed(2)}`} subtitle="Total milk earnings" variant="teal" />
              <StatCard title="Deduction" value={`₹ ${(billingReport?.totalDeduction ?? 0).toFixed(2)}`} subtitle="Total deductions" variant="orange" />
              <StatCard title="Net Payable" value={`₹ ${(billingReport?.netPayable ?? 0).toFixed(2)}`} subtitle="Final payable amount" variant="blue" />
            </div>

            {billLoading ? <Loader /> : (
              <>
                <DataTable data={billingReport?.rows ?? []} columns={billingCols} keyField="_id" striped dense emptyMessage="No bills found for this period." />
                <ExportRow onExcel={exportBillExcel} onPdf={exportBillPDF} />
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default SuperadminReportsPage;