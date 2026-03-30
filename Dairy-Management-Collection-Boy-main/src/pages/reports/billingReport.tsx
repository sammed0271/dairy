import React, { useEffect, useState } from "react";
import StatCard from "../../components/statCard";
import DataTable, { type DataTableColumn } from "../../components/dataTable";
import ReportSwitcher from "../../components/ReportSwitcher";
import { getBillingReportByRange } from "../../axios/report_api";
import type { MonthlyBillingReportResponse } from "../../axios/report_api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import InputField from "../../components/inputField";

const BillingReportPage: React.FC = () => {
  const today = new Date();
  const addDays = (dateString: string, days: number) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const [report, setReport] = useState<MonthlyBillingReportResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  // const today = new Date();
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(today.getDate() - 9);

  const format = (d: Date) => d.toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(format(tenDaysAgo));
  const [toDate, setToDate] = useState(format(today));
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const res = await getBillingReportByRange(fromDate, toDate);
        setReport(res.data);
      } catch (err) {
        console.error("Billing report failed", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fromDate, toDate]);

  const columns: DataTableColumn<
    MonthlyBillingReportResponse["rows"][number]
  >[] = [
    {
      id: "farmer",
      header: "Farmer",
      align: "center",
      cell: (r) => (typeof r.farmerId === "object" ? r.farmerId.name : "—"),
    },

    {
      id: "liters",
      header: "Liters",
      align: "center",
      cell: (r) => r.totalLiters.toFixed(2),
    },
    {
      id: "milk",
      header: "Milk Amount",
      align: "center",
      cell: (r) => `₹ ${r.totalMilkAmount.toFixed(2)}`,
    },
    {
      id: "deduction",
      header: "Deduction",
      align: "center",
      cell: (r) => `₹ ${r.totalDeduction.toFixed(2)}`,
    },
    {
      id: "bonus",
      header: "Bonus",
      align: "center",
      cell: (r) => `₹ ${r.totalBonus.toFixed(2)}`,
    },
    {
      id: "net",
      header: "Net Payable",
      align: "center",
      cell: (r) => `₹ ${r.netPayable.toFixed(2)}`,
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      cell: (r) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            r.status === "Paid"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {r.status}
        </span>
      ),
    },
  ];

  // Export
  const formatRows = () =>
    (report?.rows ?? []).map((r) => ({
      Farmer: typeof r.farmerId === "object" ? r.farmerId.name : "—",
      Liters: r.totalLiters.toFixed(2),
      MilkAmount: r.totalMilkAmount.toFixed(2),
      Deduction: r.totalDeduction.toFixed(2),
      Bonus: r.totalBonus.toFixed(2),
      NetPayable: r.netPayable.toFixed(2),
      Status: r.status,
    }));

  //Export Excel
  const exportExcel = () => {
    if (!report?.rows?.length) return toast.error("No billing records");

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formatRows());
    XLSX.utils.book_append_sheet(wb, ws, "Billing Report");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), `Billing-Report-${fromDate} to ${toDate}.xlsx`);
  };

  //Export PDF
  const exportPDF = () => {
    if (!report?.rows?.length) return toast.error("No billing records");

    const doc = new jsPDF();
    doc.text(`Billing Report - ${fromDate} to ${toDate}`, 14, 10);

    autoTable(doc, {
      head: [
        ["Farmer", "Liters", "Milk", "Deduction", "Bonus", "Net", "Status"],
      ],
      body: report.rows.map((r) => [
        typeof r.farmerId === "object" ? r.farmerId.name : "—",
        r.totalLiters.toFixed(2),
        `₹ ${r.totalMilkAmount.toFixed(2)}`,
        `₹ ${r.totalDeduction.toFixed(2)}`,
        `₹ ${r.totalBonus.toFixed(2)}`,
        `₹ ${r.netPayable.toFixed(2)}`,
        r.status,
      ]),
      startY: 20,
    });

    doc.save(`Billing-Report-${fromDate} to ${toDate}.pdf`);
  };

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">
              Billing Report
            </h1>
            <p className="text-sm text-[#5E503F]/70">
              Monthly farmer billing summary
            </p>
          </div>

          <div className="flex gap-2">
            <InputField
              type="date"
              label="From"
              value={fromDate}
              onChange={(e) => {
                const selectedFrom = e.target.value;
                setFromDate(selectedFrom);

                // auto set To = From + 9 days (10 day total range)
                const autoTo = addDays(selectedFrom, 9);
                setToDate(autoTo);
              }}
            />
            <InputField
              type="date"
              label="To"
              value={toDate}
              // onChange={(e) => setToDate(e.target.value)}
              onChange={(e) => {
                const selectedTo = e.target.value;
                setToDate(selectedTo);

                // auto set From = To - 9 days (10 day total range)
                const autoFrom = addDays(selectedTo, -9);
                setFromDate(autoFrom);
              }}
              // className="rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <ReportSwitcher />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Bills"
            value={report?.billCount ?? 0}
            subtitle="Total generated bills"
          />

          <StatCard
            title="Milk Amount"
            value={`₹ ${(report?.totalMilkAmount ?? 0).toFixed(2)}`}
            subtitle="Total milk earnings"
          />

          <StatCard
            title="Deduction"
            value={`₹ ${(report?.totalDeduction ?? 0).toFixed(2)}`}
            subtitle="Total deductions"
          />

          <StatCard
            title="Net Payable"
            value={`₹ ${(report?.netPayable ?? 0).toFixed(2)}`}
            subtitle="Final payable amount"
          />
        </div>
        {loading ? (
          <p className="text-sm text-[#5E503F]/60">Loading billing report…</p>
        ) : (
          <DataTable
            data={report?.rows ?? []}
            columns={columns}
            keyField="_id"
            striped
            dense
            emptyMessage="No bills for this month"
          />
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

export default BillingReportPage;
