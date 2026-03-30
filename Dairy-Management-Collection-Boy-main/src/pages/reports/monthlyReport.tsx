// src/pages/reports/monthlyReport.tsx
import React, { useEffect, useMemo, useState } from "react";
import StatCard from "../../components/statCard";
import DataTable, { type DataTableColumn } from "../../components/dataTable";

import ReportSwitcher from "../../components/ReportSwitcher";
import { getMilkReportByRange } from "../../axios/report_api";
import type { MonthlyMilkReportResponse } from "../../axios/report_api";

import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import InputField from "../../components/inputField";

interface DaySummary {
  date: string;
  liters: number;
  amount: number;
}

interface FarmerSummary {
  farmerId: string;
  farmerCode: string;
  farmerName: string;
  liters: number;
  amount: number;
}

const MonthlyReportPage: React.FC = () => {
  const today = useMemo(() => new Date(), []);

  const [report, setReport] = useState<MonthlyMilkReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(today.getDate() - 9);

  const format = (d: Date) => d.toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(format(tenDaysAgo));
  const [toDate, setToDate] = useState(format(today));

  const addDays = (dateString: string, days: number) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getMilkReportByRange(fromDate, toDate);
        setReport(res.data);
      } catch (err) {
        console.error("Monthly report failed", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [fromDate, toDate]);

  const dayColumns: DataTableColumn<DaySummary>[] = [
    {
      id: "date",
      header: "Date",
      align: "center",
      accessor: "date",
    },
    {
      id: "liters",
      header: "Total Liters",
      align: "center",
      cell: (row) => row.liters.toFixed(2),
    },
    {
      id: "amount",
      header: "Total Amount",
      align: "center",
      cell: (row) => `₹ ${row.amount.toFixed(2)}`,
    },
  ];

  const farmerColumns: DataTableColumn<FarmerSummary>[] = [
    {
      id: "code",
      header: "Farmer Code",
      align: "center",
      accessor: "farmerCode",
    },
    {
      id: "name",
      header: "Farmer Name",
      align: "center",
      accessor: "farmerName",
    },
    {
      id: "liters",
      header: "Total Liters",
      align: "center",
      cell: (row) => row.liters.toFixed(2),
    },
    {
      id: "amount",
      header: "Total Amount",
      align: "center",
      cell: (row) => `₹ ${row.amount.toFixed(2)}`,
    },
  ];

  /* ---------------- Daily Summary Export ---------------- */

  const exportDayExcel = () => {
    if (!report?.dayRows?.length) return toast.error("No daily summary data");

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      report.dayRows.map((r) => ({
        Date: r.date,
        Liters: r.liters.toFixed(2),
        Amount: r.amount.toFixed(2),
      })),
    );

    XLSX.utils.book_append_sheet(wb, ws, "Daily Summary");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    saveAs(
      new Blob([buffer]),
      `Monthly-Daily-Summary-${fromDate} → ${toDate}.xlsx`,
    );
  };

  const exportDayPDF = () => {
    if (!report?.dayRows?.length) return toast.error("No daily summary data");

    const doc = new jsPDF();
    doc.text(`Daily Summary - ${fromDate} → ${toDate}`, 14, 10);

    autoTable(doc, {
      head: [["Date", "Liters", "Amount"]],
      body: report.dayRows.map((r) => [
        r.date,
        r.liters.toFixed(2),
        `₹ ${r.amount.toFixed(2)}`,
      ]),
      startY: 20,
    });

    doc.save(`Monthly-Daily-Summary-${fromDate} → ${toDate}.pdf`);
  };

  /* ---------------- Farmer Summary Export ---------------- */

  const exportFarmerExcel = () => {
    if (!report?.farmerRows?.length)
      return toast.error("No farmer summary data");

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      report.farmerRows.map((r) => ({
        FarmerCode: r.farmerCode,
        FarmerName: r.farmerName,
        Liters: r.liters.toFixed(2),
        Amount: r.amount.toFixed(2),
      })),
    );

    XLSX.utils.book_append_sheet(wb, ws, "Farmer Summary");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    saveAs(
      new Blob([buffer]),
      `Monthly-Farmer-Summary-${fromDate} → ${toDate}.xlsx`,
    );
  };

  const exportFarmerPDF = () => {
    if (!report?.farmerRows?.length)
      return toast.error("No farmer summary data");

    const doc = new jsPDF();
    doc.text(`Farmer Summary - ${fromDate} → ${toDate}`, 14, 10);

    autoTable(doc, {
      head: [["Code", "Farmer", "Liters", "Amount"]],
      body: report.farmerRows.map((r) => [
        r.farmerCode,
        r.farmerName,
        r.liters.toFixed(2),
        `₹ ${r.amount.toFixed(2)}`,
      ]),
      startY: 20,
    });

    doc.save(`Monthly-Farmer-Summary-${fromDate} → ${toDate}.pdf`);
  };

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">
              Monthly Report
            </h1>
            <p className="text-sm text-[#5E503F]/70">
              Summary of milk collection for selected month.
            </p>
          </div>
          <div className="flex gap-2">
            <InputField
              type="date"
              label="From"
              value={fromDate}
              onChange={(e) => {
                const newFrom = e.target.value;
                setFromDate(newFrom);
                setToDate(addDays(newFrom, 9));
              }}
              // className="rounded-md border px-3 py-2 text-sm"
            />

            <InputField
              type="date"
              value={toDate}
              label="To"
              onChange={(e) => setToDate(e.target.value)}
              // className="rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <ReportSwitcher />

        <div className="flex gap-2">
          <button
            onClick={() => navigate("/reports/daily")}
            className="px-4 py-1.5 text-sm rounded-md bg-[#E9E2C8] text-[#5E503F]"
          >
            Daily
          </button>

          <button
            onClick={() => navigate("/reports/monthly")}
            className="px-4 py-1.5 text-sm rounded-md bg-[#2A9D8F] text-white"
          >
            10 Days
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Liters"
            value={report?.totalLiters.toFixed(2) ?? "0.00"}
            subtitle={`${fromDate} → ${toDate}`}
            variant="teal"
          />
          <StatCard
            title="Total Amount (₹)"
            value={report?.totalAmount.toFixed(2) ?? "0.00"}
            subtitle={`${fromDate} → ${toDate}`}
            variant="blue"
          />
          <StatCard
            title="Cow / Buffalo (L)"
            value={`${report?.cowLiters ?? 0} / ${report?.buffaloLiters ?? 0}`}
            subtitle="Cow / Buffalo"
            variant="orange"
          />

          <StatCard
            title="Days / Farmers / Entries"
            value={`${report?.dayCount ?? 0} / ${report?.farmerCount ?? 0} / ${report?.entryCount ?? 0}`}
            subtitle="Days / Farmers / Collections"
            variant="green"
          />
        </div>

        {loading ? (
          <p className="text-sm text-[#5E503F]/60">Loading...</p>
        ) : (
          <>
            {/* Per-day summary */}
            <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#5E503F]">
                  Daily Summary ({fromDate} → {toDate})
                </h2>
                <span className="text-xs text-[#5E503F]/60">
                  Total liters & amount by day.
                </span>
              </div>
              <DataTable
                data={report?.dayRows ?? []}
                columns={dayColumns}
                keyField="date"
                dense
                striped
                emptyMessage="No milk collection entries in this month."
              />
              <div className="mt-4 mb-4 flex justify-end gap-2">
                <button
                  onClick={exportDayExcel}
                  className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-white text-xs"
                >
                  <i className="fa-solid fa-file-excel"></i>
                  Excel
                </button>

                <button
                  onClick={exportDayPDF}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-white text-xs"
                >
                  <i className="fa-solid fa-file-pdf"></i>
                  PDF
                </button>
              </div>

              {/* Per-farmer summary */}
              <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#5E503F]">
                    Farmer Summary ({fromDate} → {toDate})
                  </h2>
                  <span className="text-xs text-[#5E503F]/60">
                    Total liters & amount by farmer.
                  </span>
                </div>
                <DataTable
                  data={report?.farmerRows ?? []}
                  columns={farmerColumns}
                  keyField="farmerId"
                  dense
                  striped
                  emptyMessage="No farmer collection entries in this month."
                />
                <div className=" mt-4 flex justify-end gap-2">
                  <button
                    onClick={exportFarmerExcel}
                    className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-white text-xs"
                  >
                    <i className="fa-solid fa-file-excel"></i>
                    Excel
                  </button>

                  <button
                    onClick={exportFarmerPDF}
                    className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-white text-xs"
                  >
                    <i className="fa-solid fa-file-pdf"></i>
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlyReportPage;
