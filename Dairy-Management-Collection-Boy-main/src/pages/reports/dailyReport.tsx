// src/pages/reports/dailyReport.tsx
import React, { useEffect, useMemo, useState } from "react";
import StatCard from "../../components/statCard";
import DataTable, { type DataTableColumn } from "../../components/dataTable";
import InputField from "../../components/inputField";
import ReportSwitcher from "../../components/ReportSwitcher";

import type { MilkShift } from "../../types/milkCollection";
import { getDailyReport } from "../../axios/report_api";
import type { DailyReportResponse } from "../../axios/report_api";
type DailyReportEntry = DailyReportResponse["entries"][number];

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";

const DailyReportPage: React.FC = () => {
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [report, setReport] = useState<DailyReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [shiftFilter, setShiftFilter] = useState<MilkShift | "All">("All");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getDailyReport(selectedDate);
        setReport(res.data);
      } catch (err) {
        console.error("Failed to load daily report", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedDate]);

  const stats = useMemo(() => {
    if (!report) {
      return {
        totalLiters: 0,
        totalAmount: 0,
        cowLiters: 0,
        buffaloLiters: 0,
        morningLiters: 0,
        eveningLiters: 0,
        farmerCount: 0,
        collectionCount: 0,
      };
    }

    let morningLiters = 0;
    let eveningLiters = 0;
    const farmers = new Set<string>();

    report.entries.forEach((e) => {
      // farmers.add(e.farmerId._id);
      if (e.farmerId?._id) farmers.add(e.farmerId._id);

      if (e.shift?.toLowerCase() === "morning") morningLiters += e.quantity;
      if (e.shift?.toLowerCase() === "evening") eveningLiters += e.quantity;
    });

    return {
      totalLiters: report.totalLiters,
      totalAmount: report.totalAmount,
      cowLiters: report.cowLiters,
      buffaloLiters: report.buffaloLiters,
      morningLiters,
      eveningLiters,
      farmerCount: farmers.size,
      collectionCount: report.entries.length,
    };
  }, [report]);

  const columns: DataTableColumn<DailyReportEntry>[] = [
    {
      id: "shift",
      header: "Shift",
      align: "center",
      accessor: "shift",
    },
    {
      id: "farmerName",
      header: "Farmer Name",
      align: "center",
      // cell: (row) => row.farmerId.name,
      cell: (row) => row.farmerId?.name ?? "Deleted Farmer",
    },
    {
      id: "mobile",
      header: "Mobile",
      align: "center",
      // cell: (row) => row.farmerId.mobile,
      cell: (row) => row.farmerId?.mobile ?? "-",
    },
    {
      id: "quantity",
      header: "Liters",
      align: "center",
      cell: (row) => row.quantity.toFixed(2),
    },
    {
      id: "fat",
      header: "FAT %",
      align: "center",
      cell: (row) => (row.fat ?? 0).toFixed(1),
    },
    {
      id: "snf",
      header: "SNF %",
      align: "center",
      cell: (row) => (row.snf ?? 0).toFixed(1),
    },
    {
      id: "rate",
      header: "Rate",
      align: "center",
      cell: (row) => `₹ ${row.rate.toFixed(2)}`,
    },
    {
      id: "totalAmount",
      header: "Amount",
      align: "center",
      cell: (row) => `₹ ${row.totalAmount.toFixed(2)}`,
    },
  ];

  const tableData = useMemo(() => {
    if (!report) return [];

    if (shiftFilter === "All") return report.entries;

    return report.entries.filter(
      (e) => e.shift?.toLowerCase() === shiftFilter.toLowerCase(),
    );
  }, [report, shiftFilter]);

  //Export
  const formatRows = () =>
    tableData.map((e) => ({
      Shift: e.shift,
      Farmer: e.farmerId?.name ?? "Deleted Farmer",
      Mobile: e.farmerId?.mobile ?? "-",
      Liters: e.quantity.toFixed(2),
      FAT: (e.fat ?? 0).toFixed(1),
      SNF: (e.snf ?? 0).toFixed(1),
      Rate: e.rate.toFixed(2),
      Amount: e.totalAmount.toFixed(2),
    }));

  // Export Excel
  const exportExcel = () => {
    if (!tableData.length) return toast.error("No records to export");

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formatRows());
    XLSX.utils.book_append_sheet(wb, ws, "Daily Report");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer]),
      `Daily-Report-${selectedDate}-${shiftFilter}.xlsx`,
    );
  };

  //Export PDF
  const exportPDF = () => {
    if (!tableData.length) return toast.error("No records to export");

    const doc = new jsPDF();
    doc.text(`Daily Report - ${selectedDate} (${shiftFilter})`, 14, 10);

    autoTable(doc, {
      head: [
        ["Shift", "Farmer", "Mobile", "Liters", "FAT", "SNF", "Rate", "Amount"],
      ],
      body: tableData.map((e) => [
        e.shift,
        e.farmerId?.name ?? "Deleted Farmer",
        e.farmerId?.mobile ?? "-",
        e.quantity.toFixed(2),
        (e.fat ?? 0).toFixed(1),
        (e.snf ?? 0).toFixed(1),
        `₹ ${e.rate.toFixed(2)}`,
        `₹ ${e.totalAmount.toFixed(2)}`,
      ]),
      startY: 20,
    });

    doc.save(`Daily-Report-${selectedDate}-${shiftFilter}.pdf`);
  };

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">Daily Report</h1>
            <p className="text-sm text-[#5E503F]/70">
              Summary of milk collection for a selected date.
            </p>
          </div>
          <div className="w-48">
            <InputField
              label="Select Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <ReportSwitcher />

        <div className="flex gap-2">
          <button className="px-4 py-1.5 text-sm rounded-md bg-[#2A9D8F] text-white">
            Daily
          </button>

          <button
            onClick={() => (window.location.href = "/reports/monthly")}
            className="px-4 py-1.5 text-sm rounded-md bg-[#E9E2C8] text-[#5E503F]"
          >
            10 Days
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Liters"
            value={stats.totalLiters.toFixed(2)}
            subtitle={`Collections: ${stats.collectionCount}`}
            variant="teal"
          />
          <StatCard
            title="Total Amount (₹)"
            value={stats.totalAmount.toFixed(2)}
            subtitle={`Farmers: ${stats.farmerCount}`}
            variant="blue"
          />
          <StatCard
            title="Cow / Buffalo (L)"
            value={`${stats.cowLiters.toFixed(
              1,
            )} / ${stats.buffaloLiters.toFixed(1)}`}
            variant="orange"
            subtitle={undefined}
          />
          <StatCard
            title="Morning / Evening (L)"
            value={`${stats.morningLiters.toFixed(
              1,
            )} / ${stats.eveningLiters.toFixed(1)}`}
            variant="red"
            subtitle={undefined}
          />
        </div>

        {/* Quick shift buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#5E503F]">
            Quick Shift Focus:
          </span>

          <button
            type="button"
            onClick={() => setShiftFilter("All")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              shiftFilter === "All"
                ? "bg-[#2A9D8F] text-white"
                : "bg-[#E9E2C8] text-[#5E503F]"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setShiftFilter("morning")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              shiftFilter === "morning"
                ? "bg-[#2A9D8F] text-white"
                : "bg-[#E9E2C8] text-[#5E503F]"
            }`}
          >
            Morning
          </button>

          <button
            type="button"
            onClick={() => setShiftFilter("evening")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              shiftFilter === "evening"
                ? "bg-[#2A9D8F] text-white"
                : "bg-[#E9E2C8] text-[#5E503F]"
            }`}
          >
            Evening
          </button>

          <span className="text-xs text-[#5E503F]/60">
            (Scrolls to first entry of that shift)
          </span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-[#5E503F]/60">
            Loading report...
          </div>
        ) : (
          <>
            {/* Table */}
            <DataTable
              // data={report?.entries ?? []}
              data={tableData}
              columns={columns}
              keyField="_id"
              striped
              dense
              emptyMessage="No milk collection entries for the selected date."
            />
          </>
        )}
        <div className="mt-0 flex justify-end gap-2">
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-white text-xs"
          >
            <i className="fa-solid fa-file-excel"></i>
            Excel
          </button>

          <button
            onClick={exportPDF}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-white text-xs"
          >
            <i className="fa-solid fa-file-pdf"></i>
            PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyReportPage;
