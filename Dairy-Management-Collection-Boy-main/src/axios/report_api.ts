import { api } from "./axiosInstance";

export type DailyReportParams = {
  date: string; // "YYYY-MM-DD"
};

export type MonthlyReportParams = {
  month: string; // "YYYY-MM"
};

export type MilkEntry = {
  _id: string;
  farmerId: {
    _id: string;
    name: string;
    mobile: string;
  };
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
  totalLiters: number;
  totalAmount: number;
  cowLiters: number;
  buffaloLiters: number;
  entries: MilkEntry[];
};

export type MonthlyReportResponse = {
  month: string;
  totalLiters: number;
  totalAmount: number;
  entries: MilkEntry[];
};
export type MilkYieldReportResponse = {
  cow: {
    liters: number;
    amount: number;
  };
  buffalo: {
    liters: number;
    amount: number;
  };
};
export type MilkYieldParams = {
  from: string;
  to: string;
};

export type MilkYieldItem = {
  _id: "cow" | "buffalo";
  liters: number;
  amount: number;
};
export type MilkYieldResponse = {
  cow: {
    liters: number;
    amount: number;
  };
  buffalo: {
    liters: number;
    amount: number;
  };
  mix: {
    liters: number;
    amount: number;
  };
};

export const getMilkYieldReport = (params: { from: string; to: string }) =>
  api.get<MilkYieldResponse>("/reports/milk-type", { params });

export const getDailyReport = (date: string) =>
  api.get<DailyReportResponse>("/reports/daily-milk", {
    params: { date },
  });

export const getBillingReportByRange = (from: string, to: string) => {
  return api.get<MonthlyBillingReportResponse>("/reports/billing", {
    params: { from, to },
  });
};

export type MonthlyMilkReportResponse = {
  // month: string;
  fromDate: string;
  toDate: string;
  totalLiters: number;
  totalAmount: number;
  cowLiters: number;
  buffaloLiters: number;

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
    liters: number;
    amount: number;
  }[];
};

export const getMilkEntriesByRange = (from: string, to: string) =>
  api.get("/reports/milk-range", { params: { from, to } });

export type MonthlyBillingReportResponse = {
  month: string;
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

export const getMilkReportByRange = (from: string, to: string) =>
  api.get<MonthlyMilkReportResponse>("/reports/milk-range", {
    params: { from, to },
  });
