import { api } from "./axiosInstance";
import type { MilkRateChart } from "../types/rateChart";
import type { MilkType } from "../types/farmer";

export type CenterChartSummaryItem = {
  center: { _id: string; name: string; location?: string; status: string };
  charts: {
    cow?: { baseRate: number; effectiveFrom: string; updatedAt: string };
    buffalo?: { baseRate: number; effectiveFrom: string; updatedAt: string };
    mix?: { baseRate: number; effectiveFrom: string; updatedAt: string };
  };
};

export type CenterRateChartsResponse = {
  center: { _id: string; name: string; location?: string };
  charts: { cow: MilkRateChart; buffalo: MilkRateChart; mix: MilkRateChart };
};

export type RateChartHistoryEntry = {
  _id: string;
  centerId: string;
  milkType: MilkType;
  effectiveFrom: string;
  fats: number[];
  snfs: number[];
  rates: number[][];
  baseRate: number;
  savedBy?: { name: string; email: string } | null;
  createdAt: string;
};

export const getSuperadminRateChartSummary = () =>
  api.get<{ summary: CenterChartSummaryItem[] }>("/superadmin/rate-charts");

export const getRateChartsForCenter = (centerId: string) =>
  api.get<CenterRateChartsResponse>(`/superadmin/rate-charts/${centerId}`);

export const updateRateChartForCenter = (
  centerId: string,
  milkType: MilkType,
  data: MilkRateChart,
) =>
  api.put<{ message: string; chart: MilkRateChart }>(
    `/superadmin/rate-charts/${centerId}/${milkType}`,
    data,
  );

export const getRateChartHistoryForCenter = (
  centerId: string,
  params?: { milkType?: MilkType; limit?: number; page?: number },
) =>
  api.get<{ history: RateChartHistoryEntry[] }>(
    `/superadmin/rate-charts/${centerId}/history`,
    { params },
  );