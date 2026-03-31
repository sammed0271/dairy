// src/pages/bills/billManagement.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import InputField from "../../components/inputField";
import SelectField from "../../components/selectField";
import DataTable, { type DataTableColumn } from "../../components/dataTable";
import StatCard from "../../components/statCard";
import ConfirmModal from "../../components/confirmModal";
import Loader from "../../components/loader";
import PayBillModal from "../payments/payBillModal";
import type { Farmer } from "../../types/farmer";
import type { Bill, BillStatus } from "../../types/bills";

import { getFarmers } from "../../axios/farmer_api";
import { generateBill, getBills } from "../../axios/bill_api";
import { api } from "../../axios/axiosInstance";
import toast from "react-hot-toast";
import { payAllBills } from "../../axios/payment_api";
// import myMarathiFont from './fonts/Hind-Regular.ttf'; // Example path
type BillScope = "All" | "Single";

// Update this interface to include optional details
interface CalculatedBillRow {
  farmerId: string;
  farmerCode: string;
  farmerName: string;
  liters: number;
  milkAmount: number;
  bonusAmount: number;
  deductionAmount: number;
  netAmount: number;
  // Enhanced detail structure
  details?: {
    shifts: { day: string; m?: MilkEntry; e?: MilkEntry }[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deductions: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bonuses: any[];
  };
}

interface MilkEntry {
  date: string;
  liters: number;
  fat: number;
  snf: number;
  rate: number;
  amount: number;
}

const BillManagementPage: React.FC = () => {
  const today = new Date();

  const firstOfMonthISO = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-01`;

  // Backend data
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [existingBills, setExistingBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [loadingFarmers, setLoadingFarmers] = useState(false);

  // Generate section state
  const [scope, setScope] = useState<BillScope>("All");
  const [selectedFarmerId, setSelectedFarmerId] = useState("");

  const [periodFrom, setPeriodFrom] = useState<string>(firstOfMonthISO);
  const [periodTo, setPeriodTo] = useState<string>(() => {
    const d = new Date(firstOfMonthISO);
    d.setDate(d.getDate() + 9);
    return d.toISOString().split("T")[0];
  });

  const [calculating, setCalculating] = useState(false);
  const [calculatedRows, setCalculatedRows] = useState<CalculatedBillRow[]>([]);
  const [calculatedTotalNet, setCalculatedTotalNet] = useState<number>(0);
  const [savingBills, setSavingBills] = useState(false);

  // Payment
  const [payBillTarget, setPayBillTarget] = useState<Bill | null>(null);

  // Filters
  const [billStatusFilter, setBillStatusFilter] = useState<"All" | BillStatus>(
    "All",
  );
  const [billSearch, setBillSearch] = useState("");

  // Delete confirm (backend delete not implemented in your routes)
  const [deleteBillTarget, setDeleteBillTarget] = useState<Bill | null>(null);

  const selectedFarmer = useMemo(
    () => farmers.find((f) => f._id === selectedFarmerId),
    [farmers, selectedFarmerId],
  );

  // ---------- LOAD FROM BACKEND ----------
  const loadFarmers = async () => {
    try {
      setLoadingFarmers(true);
      const res = await getFarmers();
      setFarmers(res.data);
    } catch (err) {
      console.error("Error loading farmers:", err);
    } finally {
      setLoadingFarmers(false);
    }
  };

  const loadBills = async () => {
    try {
      setLoadingBills(true);
      const res = await getBills();
      // newest first
      const sorted = [...res.data].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setExistingBills(sorted);
    } catch (err) {
      console.error("Error loading bills:", err);
    } finally {
      setLoadingBills(false);
    }
  };

  useEffect(() => {
    loadFarmers();
    loadBills();
  }, []);

  useEffect(() => {
    if (!periodFrom) return;

    const fromDate = new Date(periodFrom);
    const toDate = new Date(fromDate);
    toDate.setDate(fromDate.getDate() + 9); // 10 days total

    setPeriodTo(toDate.toISOString().split("T")[0]);
  }, [periodFrom]);

  // ---------- STATS ----------
  const billStats = useMemo(() => {
    const totalBills = existingBills.length;
    const pending = existingBills.filter((b) => b.status === "Pending").length;
    const paid = existingBills.filter((b) => b.status === "Paid").length;
    const totalAmount = existingBills.reduce((sum, b) => sum + b.netAmount, 0);

    return { totalBills, pending, paid, totalAmount };
  }, [existingBills]);

  // ---------- FILTER ----------
  const filteredBills = useMemo(() => {
    return existingBills.filter((b) => {
      const matchesStatus =
        billStatusFilter === "All" ? true : b.status === billStatusFilter;

      const term = billSearch.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        b.billNo.toLowerCase().includes(term) ||
        b.farmerName.toLowerCase().includes(term) ||
        b.farmerCode.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [existingBills, billStatusFilter, billSearch]);

  // ---------- GENERATE BILL(S) USING BACKEND ----------
  const calculateBills = async () => {
    if (!periodFrom || !periodTo) {
      toast.error("Please select bill period (From and To).");
      return;
    }

    if (periodFrom > periodTo) {
      toast.error("Period From cannot be after Period To.");
      return;
    }

    if (scope === "Single" && !selectedFarmerId) {
      toast.error("Please select a farmer for single farmer bill.");
      return;
    }

    try {
      setCalculating(true);
      const rows: CalculatedBillRow[] = [];
      const farmersToProcess =
        scope === "Single" && selectedFarmer ? [selectedFarmer] : farmers;

      for (const f of farmersToProcess) {
        const res = await api.post("/bills/preview", {
          farmerId: f._id,
          periodFrom,
          periodTo,
        });

        if (res.data.netAmount === 0) continue;

        let detailedObject = undefined;

        if (scope === "Single") {
          const detailsRes = await api.post("/bills/details", {
            farmerId: f._id,
            periodFrom,
            periodTo,
          });

          // We assume the backend /bills/details also returns deductions and bonuses
          // If not, you may need a separate call or ensure backend sends them
          const dateMap = new Map<
            string,
            { day: string; m?: MilkEntry; e?: MilkEntry }
          >();
          detailsRes.data.morning.forEach((item: MilkEntry) => {
            const d = item.date.split("T")[0].split("-")[2];
            dateMap.set(d, { day: d, m: item });
          });
          detailsRes.data.evening.forEach((item: MilkEntry) => {
            const d = item.date.split("T")[0].split("-")[2];
            const existing = dateMap.get(d) || { day: d };
            dateMap.set(d, { ...existing, e: item });
          });

          detailedObject = {
            shifts: Array.from(dateMap.values()).sort(
              (a, b) => parseInt(a.day) - parseInt(b.day),
            ),
            deductions: detailsRes.data.deductions || [], // NEW: Actual categories from backend
            bonuses: detailsRes.data.bonuses || [],
          };
        }

        rows.push({
          farmerId: f._id,
          farmerCode: f.code,
          farmerName: f.name,
          liters: res.data.totalLiters,
          milkAmount: res.data.milkAmount,
          bonusAmount: res.data.bonusAmount,
          deductionAmount: res.data.deductionAmount,
          netAmount: res.data.netAmount,
          details: detailedObject,
        });
      }

      setCalculatedRows(rows);
      setCalculatedTotalNet(rows.reduce((sum, r) => sum + r.netAmount, 0));
    } catch (err) {
      console.error(err);
      toast.error("Failed to calculate bills.");
    } finally {
      setCalculating(false);
    }
  };

  // ---------- DELETE ----------

  const generateBills = async () => {
    if (!periodFrom || !periodTo) {
      toast.error("Please select bill period.");
      return;
    }

    try {
      setSavingBills(true);

      const farmersToProcess = calculatedRows
        .map((r) => farmers.find((f) => f._id === r.farmerId))
        .filter((f): f is Farmer => Boolean(f));

      let success = 0;
      let skipped = 0;

      for (const f of farmersToProcess) {
        try {
          await generateBill({
            farmerId: f._id,
            periodFrom,
            periodTo,
          });
          success++;
        } catch (err: unknown) {
          if (axios.isAxiosError(err)) {
            const status = err.response?.status;

            // Skip already existing / overlapping bills
            if (status === 400 || status === 409) {
              skipped++;
              continue;
            }
          }

          // Real error
          throw err;
        }
      }

      toast.success(`Bills generated: ${success}\nAlready existed: ${skipped}`);

      await loadBills();
      setCalculatedRows([]);
    } catch (err) {
      console.error("Generate bills error:", err);
      toast.error("Something went wrong while generating bills.");
    } finally {
      setSavingBills(false);
    }
  };

  const deleteBill = async () => {
    if (!deleteBillTarget) return;

    try {
      await api.delete(`/bills/${deleteBillTarget._id}`);
      toast.success("Bill deleted successfully");
      setDeleteBillTarget(null);
      await loadBills(); // 🔄 refresh table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to delete bill");
      }
    }
  };

  const markAsPaid = async (bill: Bill) => {
    try {
      await api.put(`/bills/${bill._id}/pay`);
      toast.success("Bill marked as Paid");

      await loadBills(); //  refresh table + stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to mark bill as Paid");
    }
  };

  // farmatDate
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };

  // ---------- TABLES ----------
  const previewColumns: DataTableColumn<CalculatedBillRow>[] = [
    {
      id: "farmerCode",
      header: "Code",
      accessor: "farmerCode",
      align: "center",
    },
    {
      id: "farmerName",
      header: "Farmer Name",
      accessor: "farmerName",
      align: "center",
    },
    {
      id: "liters",
      header: "Liters",
      align: "center",
      cell: (row) => (row.liters ?? 0).toFixed(2),
    },
    {
      id: "milkAmount",
      header: "Milk Amount",
      align: "center",
      cell: (row) => `₹ ${(row.milkAmount ?? 0).toFixed(2)}`,
    },
    {
      id: "bonusAmount",
      header: "Bonus",
      align: "center",
      cell: (row) => `₹ ${(row.bonusAmount ?? 0).toFixed(2)}`,
    },
    {
      id: "deductionAmount",
      header: "Deductions",
      align: "center",
      cell: (row) => `₹ ${(row.deductionAmount ?? 0).toFixed(2)}`,
    },
    {
      id: "",
      header: "Net Payable",
      align: "center",
      cell: (row) => `₹ ${(row.netAmount ?? 0).toFixed(2)}`,
    },
  ];

  const billColumns: DataTableColumn<Bill>[] = [
    { id: "billNo", header: "Bill No", accessor: "billNo", align: "center" },
    {
      id: "farmer",
      header: "Farmer",
      align: "center",
      cell: (row) => (
        <div className="min-w-[140px]">
          <div className="text-[#5E503F] text-sm">{row.farmerName}</div>
          <div className="text-[11px] text-[#5E503F]/60">{row.farmerCode}</div>
        </div>
      ),
    },
    {
      id: "period",
      header: "Period",
      align: "center",
      cell: (row) => (
        <span className="text-xs text-[#5E503F] whitespace-nowrap">
          {formatDate(row.periodFrom)} → {formatDate(row.periodTo)}
        </span>
      ),
    },
    {
      id: "liters",
      header: "Liters",
      align: "center",
      cell: (row) => row.totalLiters.toFixed(2),
    },
    {
      id: "amount",
      header: "Milk Amount",
      align: "center",
      cell: (row) => `₹ ${row.milkAmount.toFixed(2)}`,
    },
    {
      id: "bonus",
      header: "Bonus",
      align: "center",
      cell: (row) => `₹ ${row.bonusAmount.toFixed(2)}`,
    },
    {
      id: "deduction",
      header: "Deduction",
      align: "center",
      cell: (row) => `₹ ${row.deductionAmount.toFixed(2)}`,
    },
    {
      id: "net",
      header: "Net Payable",
      align: "center",
      cell: (row) => `₹ ${row.netAmount.toFixed(2)}`,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            row.status === "Paid"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "center",
      cell: (row) => (
        <div className="flex items-center justify-center gap-2">
          {/* MARK AS PAID */}
          <button
            type="button"
            disabled={row.status === "Paid"}
            onClick={() => markAsPaid(row)}
            className={`rounded-md px-2 py-1 text-xs ${
              row.status === "Paid"
                ? "cursor-not-allowed bg-green-100 text-green-600"
                : "border border-[#2A9D8F] text-[#2A9D8F] hover:bg-[#2A9D8F]/10"
            }`}
          >
            Paid
          </button>

          {/* Payment */}
          <button
            type="button"
            disabled={row.status === "Paid"}
            onClick={() => setPayBillTarget(row)}
            className="border border-blue-500 text-blue-600 rounded-md px-2 py-1 text-xs hover:bg-blue-50"
          >
            Pay Bank
          </button>

          {/* DELETE */}
          <button
            type="button"
            disabled={row.status === "Paid"}
            onClick={() => setDeleteBillTarget(row)}
            className={`rounded-md px-2 py-1 text-xs ${
              row.status === "Paid"
                ? "cursor-not-allowed bg-gray-200 text-gray-400"
                : "border border-[#E9E2C8] bg-white text-[#E76F51] hover:bg-[#E76F51]/10"
            }`}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const farmerOptions = farmers.map((f) => ({
    label: `${f.code} - ${f.name}`,
    value: f._id,
  }));

  // Export PDF
  type JsPDFWithAutoTable = InstanceType<typeof import("jspdf").default> & {
    lastAutoTable: {
      finalY: number;
    };
  };

  // 1. Define specific interfaces for Deductions and Bonuses
  interface DeductionEntry {
    reason?: string;
    itemName?: string;
    amount: number;
  }

  interface BonusEntry {
    type?: string;
    amount: number;
  }

  const exportSingleBillPDF = async () => {
    if (scope !== "Single" || calculatedRows.length !== 1) {
      toast.error("PDF available only for single farmer bill.");
      return;
    }

    const row: CalculatedBillRow = calculatedRows[0];

    try {
      const [{ default: jsPDF }, { default: autoTable }, fontModule] =
        await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
          import("../../utils/marathiFont"),
        ]);
      const { marathiFontBase64, marathiFontBoldBase64 } = fontModule;

      if (!marathiFontBase64 || marathiFontBase64.length < 10000) {
        throw new Error("Invalid Marathi font data.");
      }

      // Fetch the full details from the backend
      const res = await api.post("/bills/details", {
        farmerId: row.farmerId,
        periodFrom,
        periodTo,
      });

      const morning: MilkEntry[] = res.data.morning;
      const evening: MilkEntry[] = res.data.evening;
      // Deductions now contain { reason, amount } from your updated backend
      const deductions: DeductionEntry[] = res.data.deductions || [];
      const bonuses: BonusEntry[] = res.data.bonuses || [];

      const doc = new jsPDF("p", "mm", "a4") as JsPDFWithAutoTable;

      // REGISTER FONTS
      doc.addFileToVFS("MarathiFont.ttf", marathiFontBase64);
      doc.addFont("MarathiFont.ttf", "MarathiFont", "normal");
      doc.addFileToVFS("MarathiFontBold.ttf", marathiFontBoldBase64);
      doc.addFont("MarathiFontBold.ttf", "MarathiFont", "bold");
      doc.setFont("MarathiFont", "normal");

      // HEADER SECTION (Plain Black Text)
      doc.setFontSize(18);
      doc.text("शिवशंभू दूध डेअरी", 105, 15, { align: "center" });

      doc.setFontSize(10);
      doc.text(`बिल दिनांक: ${formatDate(new Date().toISOString())}`, 195, 22, {
        align: "right",
      });
      doc.text(
        `कालावधी: ${formatDate(periodFrom)} - ${formatDate(periodTo)}`,
        105,
        22,
        { align: "center" },
      );
      doc.text(`बिल नं: ${row.farmerCode}/12`, 15, 22);

      // FARMER INFO
      doc.setDrawColor(0);
      doc.line(10, 25, 200, 25);
      doc.text(
        `उत्पादकाचे नांव: ${row.farmerCode} - ${row.farmerName}`,
        15,
        30,
      );
      doc.text(`शाखा: मुख्य शाखा`, 195, 30, { align: "right" });
      doc.line(10, 33, 200, 33);

      // DATA MAPPING
      const dateMap = new Map<string, { m?: MilkEntry; e?: MilkEntry }>();
      morning.forEach((item) => {
        const d = formatDate(item.date).split("-")[0];
        dateMap.set(d, { ...dateMap.get(d), m: item });
      });
      evening.forEach((item) => {
        const d = formatDate(item.date).split("-")[0];
        dateMap.set(d, { ...dateMap.get(d), e: item });
      });

      const sortedDays = Array.from(dateMap.keys()).sort(
        (a, b) => parseInt(a) - parseInt(b),
      );

      // MAIN TABLE - 11 Columns with categorical deductions
      const tableBody: string[][] = sortedDays.map((day, index) => {
        const entry = dateMap.get(day);
        const deduct = deductions[index] || {};
        return [
          day,
          entry?.m?.liters?.toFixed(2) ?? "",
          entry?.m?.fat?.toFixed(1) ?? "",
          entry?.m?.rate?.toFixed(2) ?? "",
          entry?.m?.amount?.toFixed(2) ?? "",
          entry?.e?.liters?.toFixed(2) ?? "",
          entry?.e?.fat?.toFixed(1) ?? "",
          entry?.e?.rate?.toFixed(2) ?? "",
          entry?.e?.amount?.toFixed(2) ?? "",
          deduct.reason ?? "", // CATEGORY (e.g. पशुखाद्य)
          deduct.amount ? deduct.amount.toFixed(2) : "",
        ];
      });

      autoTable(doc, {
        startY: 38,
        styles: {
          font: "MarathiFont",
          fontSize: 7,
          halign: "center",
          textColor: 0,
          lineWidth: 0.1,
          lineColor: 0,
        },
        headStyles: {
          font: "MarathiFont",
          fontStyle: "bold",
          fillColor: false, // NO Background Color
          textColor: 0,
          lineWidth: 0.1,
          lineColor: 0,
        },
        head: [
          [
            { content: "दिनांक", rowSpan: 2, styles: { valign: "middle" } },
            { content: "सकाळ (Morning)", colSpan: 4 },
            { content: "सायंकाळ (Evening)", colSpan: 4 },
            { content: "कपाती (Deductions)", colSpan: 2 },
          ],
          [
            "लिटर",
            "फॅट",
            "दर",
            "रक्कम",
            "लिटर",
            "फॅट",
            "दर",
            "रक्कम",
            "तपशील",
            "रक्कम",
          ],
        ],
        body: tableBody,
        theme: "grid",
      });

      // SUMMARY FOOTER
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 5,
        styles: {
          font: "MarathiFont",
          fontSize: 9,
          textColor: 0,
          lineWidth: 0.1,
          lineColor: 0,
        },
        body: [
          [
            `एकूण लिटर: ${row.liters.toFixed(2)}`,
            `दूध रक्कम: ₹ ${row.milkAmount.toFixed(2)}`,
            `कपात: ₹ ${row.deductionAmount.toFixed(2)}`,
          ],
          [
            `सरासरी फॅट: ${row.liters > 0 ? (row.milkAmount / row.liters / 6).toFixed(1) : "0.0"}`,
            `बोनस: ₹ ${row.bonusAmount.toFixed(2)}`,
            {
              content: `निव्वळ देय: ₹ ${row.netAmount.toFixed(2)}`,
              styles: { fontStyle: "bold", fontSize: 10 },
            },
          ],
        ],
        theme: "plain",
      });

      // FIX: Use 'bonuses' variable to resolve ESLint warning
      if (bonuses.length > 0) {
        doc.setFontSize(8);
        let bonusY: number = doc.lastAutoTable.finalY + 2;
        bonuses.forEach((b: BonusEntry) => {
          doc.text(
            `* ${b.type || "बोनस"}: ₹${b.amount.toFixed(2)}`,
            15,
            bonusY,
          );
          bonusY += 4;
        });
      }

      doc.setFontSize(10);
      doc.text(
        "चुकभुल देणेघेणे - धन्यवाद",
        105,
        doc.lastAutoTable.finalY + 12,
        { align: "center" },
      );

      doc.save(`Dairy-Bill-${row.farmerCode}.pdf`);
      toast.success("Marathi PDF Generated!");
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("PDF generation failed:", err.message);
        toast.error(err.message);
      } else {
        toast.error("Something went wrong.");
      }
    }
  };
  // WhatsApp
  const sendBillViaWhatsApp = () => {
    if (scope !== "Single" || calculatedRows.length !== 1) {
      toast.error("WhatsApp available only for single farmer bill.");
      return;
    }

    if (!selectedFarmer?.mobile) {
      toast.error("Farmer mobile number not found.");
      return;
    }

    const row = calculatedRows[0];

    const message = `
🧾 *Milk Bill*

👤 Farmer: ${row.farmerName}
🆔 Code: ${row.farmerCode}
📅 Period: ${periodFrom} to ${periodTo}

🥛 Total Liters: ${row.liters.toFixed(2)}
💰 Milk Amount: ₹ ${row.milkAmount.toFixed(2)}
🎁 Bonus: ₹ ${row.bonusAmount.toFixed(2)}
➖ Deduction: ₹ ${row.deductionAmount.toFixed(2)}

✅ *Net Payable: ₹ ${row.netAmount.toFixed(2)}*

Thank you.
`;

    const phone = selectedFarmer.mobile.replace(/\D/g, "");
    const whatsappURL = `https://wa.me/91${phone}?text=${encodeURIComponent(
      message,
    )}`;

    window.open(whatsappURL, "_blank");
  };

  const handlePayAll = async () => {
    try {
      const confirm = window.confirm("Pay all pending bills?");
      if (!confirm) return;

      const res = await payAllBills();

      toast.success(res.data.message);

      await loadBills();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Payment failed");
    }
  };

  return (
    <div className="w-full min-w-0 bg-[#F8F4E3] p-3 sm:p-4 md:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#5E503F]">
              Bill Management
            </h1>
            <p className="text-sm text-[#5E503F]/70">
              Generate and manage farmer payment bills.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Bills"
            value={billStats.totalBills}
            variant="teal"
            subtitle={undefined}
          />
          <StatCard
            title="Pending Bills"
            value={billStats.pending}
            variant="orange"
            subtitle={undefined}
          />

          <StatCard
            title="Paid Bills"
            value={billStats.paid}
            variant="green"
            subtitle={undefined}
          />
          <StatCard
            title="Total Billed (₹)"
            value={billStats.totalAmount.toFixed(2)}
            variant="blue"
            subtitle={undefined}
          />
        </div>

        {/* Generate Bills */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#5E503F]">
              Generate Bills
            </h2>
            <span className="text-xs text-[#5E503F]/60">
              Select bill scope, period and calculate payable amounts.
            </span>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs font-medium text-[#5E503F]">
                Bill Scope
              </div>
              <div className="mt-1 flex gap-2">
                {(["All", "Single"] as BillScope[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${
                      scope === s
                        ? "bg-[#2A9D8F] text-white"
                        : "bg-[#E9E2C8] text-[#5E503F]"
                    }`}
                  >
                    {s === "All" ? "All Farmers" : "Single Farmer"}
                  </button>
                ))}
              </div>
            </div>

            <InputField
              label="Period From"
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              requiredLabel
            />

            <InputField
              label="Period To"
              type="date"
              value={periodTo}
              disabled
            />

            {scope === "Single" && (
              <SelectField
                label="Select Farmer"
                requiredLabel
                value={selectedFarmerId}
                onChange={(e) => setSelectedFarmerId(e.target.value)}
                options={[
                  { label: "Select farmer", value: "" },
                  ...farmerOptions,
                ]}
              />
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-[#5E503F]/60">
              Preview is basic. Actual bill calculation is done by backend.
            </div>

            <button
              type="button"
              onClick={calculateBills}
              disabled={calculating || loadingFarmers}
              className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#247B71] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {calculating ? "Calculating..." : "Calculate Bills"}
            </button>
          </div>

          <div className="mt-6">
            {calculating ? (
              <div className="flex items-center justify-center py-8">
                <Loader size="md" message="Calculating bills..." />
              </div>
            ) : calculatedRows.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#5E503F]/60">
                No bill data calculated yet.
              </div>
            ) : (
              <>
                {scope === "Single" && calculatedRows[0]?.details ? (
                  <div className="space-y-6">
                    {/* --- MAIN COLLECTION TABLE --- */}
                    <div className="w-full overflow-x-auto border border-[#E9E2C8] rounded-lg shadow-sm">
                      <table className="w-full text-[11px] text-center border-collapse bg-white">
                        <thead className="bg-[#F8F4E3] text-[#5E503F] font-bold">
                          <tr>
                            <th
                              rowSpan={2}
                              className="border border-[#E9E2C8] p-2"
                            >
                              दिनांक
                            </th>
                            <th
                              colSpan={4}
                              className="border border-[#E9E2C8] p-1 bg-[#2A9D8F]/10"
                            >
                              सकाळ (Morning)
                            </th>
                            <th
                              colSpan={4}
                              className="border border-[#E9E2C8] p-1 bg-[#E76F51]/10"
                            >
                              सायंकाळ (Evening)
                            </th>
                          </tr>
                          <tr>
                            <th className="border border-[#E9E2C8] p-1">
                              लिटर
                            </th>
                            <th className="border border-[#E9E2C8] p-1">फॅट</th>
                            <th className="border border-[#E9E2C8] p-1">दर</th>
                            <th className="border border-[#E9E2C8] p-1">
                              रक्कम
                            </th>
                            <th className="border border-[#E9E2C8] p-1">
                              लिटर
                            </th>
                            <th className="border border-[#E9E2C8] p-1">फॅट</th>
                            <th className="border border-[#E9E2C8] p-1">दर</th>
                            <th className="border border-[#E9E2C8] p-1">
                              रक्कम
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculatedRows[0].details.shifts.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="border border-[#E9E2C8] p-1 font-bold">
                                {row.day}
                              </td>
                              <td className="border border-[#E9E2C8] p-1">
                                {row.m?.liters.toFixed(2) || "-"}
                              </td>
                              <td className="border border-[#E9E2C8] p-1">
                                {row.m?.fat || "-"}
                              </td>
                              <td className="border border-[#E9E2C8] p-1">
                                {row.m?.rate.toFixed(2) || "-"}
                              </td>
                              <td className="border border-[#E9E2C8] p-1 text-[#2A9D8F] font-medium">
                                {row.m?.amount.toFixed(2) || "-"}
                              </td>
                              <td className="border border-[#E9E2C8] p-1">
                                {row.e?.liters.toFixed(2) || "-"}
                              </td>
                              <td className="border border-[#E9E2C8] p-1">
                                {row.e?.fat || "-"}
                              </td>
                              <td className="border border-[#E9E2C8] p-1">
                                {row.e?.rate.toFixed(2) || "-"}
                              </td>
                              <td className="border border-[#E9E2C8] p-1 text-[#E76F51] font-medium">
                                {row.e?.amount.toFixed(2) || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* --- DEDUCTIONS AND BONUSES SIDE-BY-SIDE --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Deductions Card */}
                      <div className="border border-[#E9E2C8] rounded-lg bg-white overflow-hidden">
                        <div className="bg-red-50 p-2 border-b border-[#E9E2C8] text-red-700 font-bold text-xs">
                          कपाती (Deductions)
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 text-gray-600">
                              <th className="p-2 text-left border-b">
                                तपशील (Item)
                              </th>
                              <th className="p-2 text-right border-b">
                                रक्कम (Amount)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* If details.deductions is empty, show summary total */}
                            {calculatedRows[0].details.deductions.length > 0 ? (
                              calculatedRows[0].details.deductions.map(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (d: any, i: number) => (
                                  <tr
                                    key={i}
                                    className="border-b last:border-0"
                                  >
                                    <td className="p-2">
                                      {d.reason || d.itemName || "Deduction"}
                                    </td>
                                    <td className="p-2 text-right">
                                      ₹ {d.amount.toFixed(2)}
                                    </td>
                                  </tr>
                                ),
                              )
                            ) : (
                              <tr>
                                <td className="p-2 italic text-gray-400">
                                  No specific deductions
                                </td>
                                <td className="p-2 text-right font-bold">
                                  ₹{" "}
                                  {calculatedRows[0].deductionAmount.toFixed(2)}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Bonus Card */}
                      <div className="border border-[#E9E2C8] rounded-lg bg-white overflow-hidden">
                        <div className="bg-green-50 p-2 border-b border-[#E9E2C8] text-green-700 font-bold text-xs">
                          बोनस (Bonuses / Extras)
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 text-gray-600">
                              <th className="p-2 text-left border-b">
                                तपशील (Item)
                              </th>
                              <th className="p-2 text-right border-b">
                                रक्कम (Amount)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b">
                              <td className="p-2 font-medium text-gray-700">
                                Total Milk Bonus
                              </td>
                              <td className="p-2 text-right text-green-600 font-bold">
                                ₹ {calculatedRows[0].bonusAmount.toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  // --- STANDARD SUMMARY TABLE ---
                  <div className="w-full overflow-x-auto">
                    <DataTable
                      data={calculatedRows}
                      columns={previewColumns}
                      keyField="farmerId"
                      striped
                      dense
                    />
                  </div>
                )}

                {/* ////////////////////////////////////////// */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs text-[#5E503F]/60">
                    Bills to generate: {calculatedRows.length}
                  </div>

                  <div className="text-sm font-semibold text-[#5E503F]">
                    Total Net Payable:{" "}
                    <span className="text-[#2A9D8F]">
                      ₹ {calculatedTotalNet.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3 flex-wrap">
                  {/* WHATSAPP BUTTON */}
                  {scope === "Single" && calculatedRows.length === 1 && (
                    <button
                      type="button"
                      onClick={sendBillViaWhatsApp}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-md bg-green-600 px-3 py-2 text-white text-xs"
                    >
                      <i className="fa-brands fa-whatsapp"></i> WhatsApp
                    </button>
                  )}
                  {/* PDF BUTTON — ONLY FOR SINGLE FARMER */}
                  {scope === "Single" && calculatedRows.length === 1 && (
                    <button
                      type="button"
                      onClick={exportSingleBillPDF}
                      className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-white text-xs"
                    >
                      <i className="fa-solid fa-file-pdf"></i> PDF
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCalculatedRows([])}
                    className="rounded-md border border-[#E9E2C8] bg-white px-4 py-2 text-sm text-[#5E503F] hover:bg-[#F8F4E3]"
                  >
                    Clear Preview
                  </button>

                  <button
                    type="button"
                    onClick={generateBills}
                    disabled={savingBills}
                    className="rounded-md bg-[#2A9D8F] px-5 py-2 text-sm font-medium text-white shadow hover:bg-[#247B71] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingBills ? "Generating..." : "Generate Bills"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Existing Bills */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
          {/* <div className="mb-3 flex flex-wrap items-center justify-between gap-3"> */}
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-[#5E503F]">
              Existing Bills
            </h2>

            <button
              disabled
              onClick={handlePayAll}
              // className="border bg-blue-600  border-blue-500 text-white rounded-md px-2 py-1 text-xs hover:bg-blue-50 hover:text-blue-600"
               className="border bg-gray-400  rounded-md px-2 py-1 text-xs"
            >
              Pay All Bills
            </button>
            {/* </div> */}
          </div>

          <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            {/* Status */}
            <div className="w-full sm:w-40">
              <SelectField
                label="Status"
                value={billStatusFilter}
                onChange={(e) =>
                  setBillStatusFilter(
                    e.target.value === "All"
                      ? "All"
                      : (e.target.value as BillStatus),
                  )
                }
                options={[
                  { label: "All", value: "All" },
                  { label: "Pending", value: "Pending" },
                  { label: "Paid", value: "Paid" },
                ]}
              />
            </div>

            {/* Search */}
            <div className="flex-1">
              <InputField
                label="Search"
                placeholder="Bill no / farmer / code"
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
              />
            </div>

            {/* Refresh Button */}
            <div>
              <button
                type="button"
                onClick={loadBills}
                className="h-[42px] rounded-md border border-[#E9E2C8] bg-white px-4 text-sm text-[#5E503F] hover:bg-[#F8F4E3]"
              >
                Refresh
              </button>
            </div>
          </div>

          {loadingBills ? (
            <div className="flex items-center justify-center py-8">
              <Loader size="md" message="Loading bills..." />
            </div>
          ) : (
            <div className="w-full overflow-x-auto scroll-smooth">
              <DataTable
                data={filteredBills}
                columns={billColumns}
                keyField="_id"
                striped
                dense
                emptyMessage="No bills found."
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteBillTarget}
        title="Delete Bill"
        variant="danger"
        description={
          deleteBillTarget && (
            <div className="space-y-1 text-sm">
              <p>Are you sure you want to delete this bill?</p>
              <p className="text-xs text-[#5E503F]/70">
                {deleteBillTarget.billNo} – {deleteBillTarget.farmerCode} (
                {deleteBillTarget.farmerName}) – Period:{" "}
                {deleteBillTarget.periodFrom} → {deleteBillTarget.periodTo}
              </p>
            </div>
          )
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={deleteBill}
        onCancel={() => setDeleteBillTarget(null)}
      />

      {payBillTarget && (
        <PayBillModal
          billId={payBillTarget._id}
          farmerName={payBillTarget.farmerName}
          amount={payBillTarget.netAmount}
          onClose={() => setPayBillTarget(null)}
          onSuccess={loadBills}
        />
      )}
    </div>
  );
};

export default BillManagementPage;
