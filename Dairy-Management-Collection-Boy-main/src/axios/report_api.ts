import { api } from "./axiosInstance";

export type ReportFilters = {
  from?: string;
  to?: string;
  date?: string;
  centreId?: string;
  shift?: "morning" | "evening" | "all";
  milkType?: "cow" | "buffalo" | "mix" | "all";
};

export type MilkEntry = {
  _id: string;
  farmerId?: {
    _id: string;
    code?: string;
    name: string;
    mobile?: string;
  } | null;
  date: string;
  shift: "morning" | "evening";
  quantity: number;
  fat?: number;
  snf?: number;
  rate: number;
  totalAmount: number;
  milkType: "cow" | "buffalo" | "mix";
};

export type DailyReportResponse = {
  date: string;
  shift?: string;
  milkType?: string;
  totalLiters: number;
  totalAmount: number;
  cowLiters: number;
  buffaloLiters: number;
  mixLiters?: number;
  entryCount?: number;
  entries: MilkEntry[];
};

export type MonthlyMilkReportResponse = {
  from: string;
  to: string;
  shift?: string;
  milkType?: string;
  totalLiters: number;
  totalAmount: number;
  cowLiters: number;
  buffaloLiters: number;
  mixLiters: number;
  dayCount: number;
  farmerCount: number;
  entryCount: number;
  entries: MilkEntry[];
  dayRows: {
    date: string;
    liters: number;
    amount: number;
  }[];
  farmerRows: {
    farmerId: string;
    farmerCode: string;
    farmerName: string;
    mobile?: string;
    liters: number;
    amount: number;
  }[];
};

export type MilkYieldResponse = {
  cow: {
    liters: number;
    amount: number;
    averageFat?: number;
    averageSnf?: number;
  };
  buffalo: {
    liters: number;
    amount: number;
    averageFat?: number;
    averageSnf?: number;
  };
  mix: {
    liters: number;
    amount: number;
    averageFat?: number;
    averageSnf?: number;
  };
};

export type MonthlyBillingReportResponse = {
  from: string;
  to: string;
  billCount: number;
  totalMilkAmount: number;
  totalDeduction: number;
  totalBonus: number;
  netPayable: number;
  totalLiters: number;
  rows: {
    _id: string;
    farmerId: {
      name: string;
      mobile: string;
    };
    periodFrom: string;
    periodTo: string;
    totalLiters: number;
    totalMilkAmount: number;
    totalDeduction: number;
    totalBonus: number;
    netPayable: number;
    status: "Pending" | "Paid";
  }[];
};

export type FarmerPaymentReportResponse = {
  from: string;
  to: string;
  summary: {
    billCount: number;
    totalLiters: number;
    totalMilkAmount: number;
    totalDeduction: number;
    totalBonus: number;
    netPayable: number;
    totalPaidAmount: number;
    pendingAmount: number;
  };
  rows: Array<{
    billId: string;
    farmerId: string | null;
    farmerCode: string;
    farmerName: string;
    mobile: string;
    periodFrom: string;
    periodTo: string;
    totalLiters: number;
    totalMilkAmount: number;
    totalDeduction: number;
    totalBonus: number;
    netPayable: number;
    billStatus: string;
    totalPaidAmount: number;
    pendingAmount: number;
    paymentCount: number;
    latestPaymentDate: string | null;
  }>;
};

export type MilkQualityAnalysisResponse = {
  from: string;
  to: string;
  summary: {
    entryCount: number;
    totalLiters: number;
    totalAmount: number;
    averageFat: number;
    averageSnf: number;
    averageRate: number;
  };
  milkTypeBreakdown: Array<{
    _id: "cow" | "buffalo" | "mix";
    averageFat: number;
    averageSnf: number;
    averageRate: number;
    liters: number;
    amount: number;
    entries: number;
  }>;
  dayRows: Array<{
    date: string;
    averageFat: number;
    averageSnf: number;
    averageRate: number;
    liters: number;
    amount: number;
    entries: number;
  }>;
  farmerRows: Array<{
    farmerId: string;
    farmerCode: string;
    farmerName: string;
    averageFat: number;
    averageSnf: number;
    averageRate: number;
    liters: number;
    amount: number;
    entries: number;
  }>;
  entries: MilkEntry[];
};

export type AuditTrailReportResponse = {
  from: string | null;
  to: string | null;
  summary: {
    totalActions: number;
    uniqueUsers: number;
    uniqueEntities: number;
    latestActionAt: string | null;
  };
  actionBreakdown: Array<{
    action: string;
    count: number;
  }>;
  entityBreakdown: Array<{
    entityType: string;
    count: number;
  }>;
  rows: Array<{
    _id: string;
    action: string;
    entityType: string;
    entityId: string;
    details: Record<string, unknown>;
    timestamp: string;
    userId:
      | {
          _id: string;
          name: string;
          email: string;
        }
      | null;
    centreId:
      | {
          _id: string;
          name: string;
          code: string;
        }
      | null;
  }>;
};

export const getDailyReport = (
  date: string,
  params?: Omit<ReportFilters, "date" | "from" | "to">,
) =>
  api.get<DailyReportResponse>("/reports/daily-milk", {
    params: { date, ...params },
  });

export const getMilkYieldReport = (params: { from: string; to: string; centreId?: string }) =>
  api.get<MilkYieldResponse>("/reports/milk-type", { params });

export const getBillingReportByRange = (
  from: string,
  to: string,
  params?: Pick<ReportFilters, "centreId">,
) =>
  api.get<MonthlyBillingReportResponse>("/reports/billing", {
    params: { from, to, ...params },
  });

export const getMilkEntriesByRange = (
  from: string,
  to: string,
  params?: Omit<ReportFilters, "from" | "to" | "date">,
) =>
  api.get<MonthlyMilkReportResponse>("/reports/milk-range", {
    params: { from, to, ...params },
  });

export const getMilkReportByRange = (
  from: string,
  to: string,
  params?: Omit<ReportFilters, "from" | "to" | "date">,
) =>
  api.get<MonthlyMilkReportResponse>("/reports/monthly-milk", {
    params: { from, to, ...params },
  });

export const getFarmerPaymentReport = (
  from: string,
  to: string,
  params?: Pick<ReportFilters, "centreId">,
) =>
  api.get<FarmerPaymentReportResponse>("/reports/farmer-payments", {
    params: { from, to, ...params },
  });

export const getMilkQualityAnalysisReport = (
  params: Required<Pick<ReportFilters, "from" | "to">> &
    Pick<ReportFilters, "centreId" | "shift" | "milkType">,
) => api.get<MilkQualityAnalysisResponse>("/reports/milk-quality", { params });

export const getAuditTrailReport = (
  params: Pick<ReportFilters, "from" | "to" | "centreId"> & {
    action?: string;
    entityType?: string;
    limit?: number;
  },
) => api.get<AuditTrailReportResponse>("/reports/audit-trail", { params });
