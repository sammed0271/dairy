import { api } from "./axiosInstance";

// ─── Shared ───────────────────────────────────────────────────────────────────

export type CenterOption = { _id: string; name: string };

// ─── Daily Report ─────────────────────────────────────────────────────────────

export type DailyEntryRow = {
  _id: string;
  date: string;
  shift: string;
  milkType: string;
  quantity: number;
  fat: number | null;
  snf: number | null;
  rate: number;
  totalAmount: number;
  farmerId: { _id: string; name: string; mobile: string } | null;
  centerId: { _id: string; name: string } | null;
};

export type SuperadminDailyReportResponse = {
  date: string;
  totalLiters: number;
  totalAmount: number;
  cowLiters: number;
  buffaloLiters: number;
  morningLiters: number;
  eveningLiters: number;
  farmerCount: number;
  centerCount: number;
  entries: DailyEntryRow[];
};

export const getSuperadminDailyReport = (date: string, centerId?: string) =>
  api.get<SuperadminDailyReportResponse>("/superadmin/reports/daily", {
    params: { date, ...(centerId ? { centerId } : {}) },
  });

// ─── Monthly / Range Report ───────────────────────────────────────────────────

export type DaySummaryRow = { date: string; liters: number; amount: number };
export type FarmerSummaryRow = { farmerId: string; farmerCode: string; farmerName: string; centerName: string; liters: number; amount: number };
export type CenterSummaryRow = { centerId: string; centerName: string; liters: number; amount: number };

export type SuperadminRangeReportResponse = {
  from: string;
  to: string;
  totalLiters: number;
  totalAmount: number;
  cowLiters: number;
  buffaloLiters: number;
  mixLiters: number;
  dayCount: number;
  farmerCount: number;
  entryCount: number;
  centerCount: number;
  dayRows: DaySummaryRow[];
  farmerRows: FarmerSummaryRow[];
  centerRows: CenterSummaryRow[];
};

export const getSuperadminRangeReport = (from: string, to: string, centerId?: string) =>
  api.get<SuperadminRangeReportResponse>("/superadmin/reports/range", {
    params: { from, to, ...(centerId ? { centerId } : {}) },
  });

// ─── Milk Yield / Type Report ─────────────────────────────────────────────────

export type MilkYieldResponse = {
  cow: { liters: number; amount: number };
  buffalo: { liters: number; amount: number };
  mix: { liters: number; amount: number };
};

export type SuperadminMilkEntryRow = {
  _id: string;
  date: string;
  shift: string;
  milkType: string;
  quantity: number;
  totalAmount: number;
  farmerId: { _id: string; name: string } | null;
  centerId: { _id: string; name: string } | null;
};

export type SuperadminMilkEntriesResponse = { entries: SuperadminMilkEntryRow[] };

export const getSuperadminMilkYield = (params: { from: string; to: string }, centerId?: string) =>
  api.get<MilkYieldResponse>("/superadmin/reports/milk-yield", {
    params: { ...params, ...(centerId ? { centerId } : {}) },
  });

export const getSuperadminMilkEntries = (from: string, to: string, centerId?: string) =>
  api.get<SuperadminMilkEntriesResponse>("/superadmin/reports/milk-entries", {
    params: { from, to, ...(centerId ? { centerId } : {}) },
  });

// ─── Billing Report ───────────────────────────────────────────────────────────

export type BillingRow = {
  _id: string;
  farmerId: { _id: string; name: string; mobile: string } | null;
  centerId: { _id: string; name: string } | null;
  totalLiters: number;
  totalMilkAmount: number;
  totalDeduction: number;
  totalBonus: number;
  netPayable: number;
  status: "Paid" | "Pending";
  periodFrom: string;
  periodTo: string;
};

export type SuperadminBillingReportResponse = {
  from: string;
  to: string;
  billCount: number;
  totalLiters: number;
  totalMilkAmount: number;
  totalDeduction: number;
  totalBonus: number;
  netPayable: number;
  rows: BillingRow[];
};

export const getSuperadminBillingReport = (from: string, to: string, centerId?: string) =>
  api.get<SuperadminBillingReportResponse>("/superadmin/reports/billing", {
    params: { from, to, ...(centerId ? { centerId } : {}) },
  });

// ─── Centers list (for filter dropdown) ──────────────────────────────────────

export const getSuperadminCenterList = () =>
  api.get<CenterOption[]>("/superadmin/centers/list");