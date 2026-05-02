import { api } from "./axiosInstance";

export type CenterSummary = {
  _id: string;
  name: string;
  location?: string;
  status: "Active" | "Inactive";
  farmerCount: number;
  totalLiters: number;
  totalRevenue: number;
  cowLiters: number;
  buffaloLiters: number;
  mixLiters: number;
  avgFat: number | null;
  avgSnf: number | null;
};

export type DailyTrendPoint = {
  date: string;
  totalLiters: number;
  totalAmount: number;
};

export type FatSnfPoint = {
  date: string;
  avgFat: number;
  avgSnf: number;
  cowFat: number;
  cowSnf: number;
  buffaloFat: number;
  buffaloSnf: number;
  mixFat: number;
  mixSnf: number;
};

export type MilkTypeBreakdown = {
  cow?: { liters: number; amount: number };
  buffalo?: { liters: number; amount: number };
  mix?: { liters: number; amount: number };
};

export type SuperadminDashboardResponse = {
  summary: {
    totalCenters: number;
    activeCenters: number;
    totalFarmers: number;
    totalLiters: number;
    totalRevenue: number;
    cowLiters: number;
    buffaloLiters: number;
    mixLiters: number;
    avgFat: number | null;
    avgSnf: number | null;
  };
  centers: CenterSummary[];
  dailyTrend: DailyTrendPoint[];
  fatSnfTrend: FatSnfPoint[];
  milkTypeBreakdown: MilkTypeBreakdown;
  meta: { from: string; to: string };
};

export const getSuperadminDashboardData = (params?: {
  from?: string;
  to?: string;
}) =>
  api.get<SuperadminDashboardResponse>("/superadmin/dashboard", { params });