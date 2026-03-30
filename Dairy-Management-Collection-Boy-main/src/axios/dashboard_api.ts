import { api } from "./axiosInstance";

export const getTodayDashboardStats = () =>
  api.get("/dashboard/today");

export const getMonthlyDashboardStats = () =>
  api.get("/dashboard/month");

export const getTopFarmers = () =>
  api.get("/dashboard/top-farmers");
