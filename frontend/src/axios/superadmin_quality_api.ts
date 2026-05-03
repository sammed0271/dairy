import { api } from "./axiosInstance";

export type QualitySummary = {
  totalFarmers: number;
  excellent: number;
  good: number;
  average: number;
  risk: number;
  avgFat: number;
  avgSnf: number;
  totalLiters: number;
  qualityAlerts: number;
};

export type CenterComparison = {
  centerId: string;
  centerName: string;
  location: string;
  farmerAvgFat: number;
  tankAvgFat: number;
  tankAvgSnf: number;
  deviation: number;
  deviationPct: number;
  totalLiters: number;
  status: "normal" | "warning" | "critical";
};

export type FatSnfTrendPoint = {
  date: string;
  avgFat: number;
  avgSnf: number;
};

export type HighRiskFarmer = {
  farmerId: string;
  farmerCode: string;
  farmerName: string;
  centerId: string;
  avgFat: number;
  avgSnf: number;
  expectedFat: number;
  expectedSnf: number;
  deviationPct: number;
  issue: "Water Suspected" | "Low Quality";
  riskLevel: "High Risk" | "Critical";
  totalLiters: number;
};

export type QualityDashboardResponse = {
  meta: {
    from: string;
    to: string;
    milkType: string;
    thresholds: {
      excellent: { fat: number; snf: number };
      good: { fat: number; snf: number };
      average: { fat: number; snf: number };
      riskDeviationPct: number;
      minFat: number;
      minSnf: number;
    };
  };
  summary: QualitySummary;
  centerComparison: CenterComparison[];
  fatSnfTrend: FatSnfTrendPoint[];
  highRiskFarmers: HighRiskFarmer[];
};

export const getQualityDashboard = (params?: {
  from?: string;
  to?: string;
  centerId?: string;
  milkType?: string;
}) => api.get<QualityDashboardResponse>("/superadmin/quality", { params });