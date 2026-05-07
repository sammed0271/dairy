import { api } from "./axiosInstance";

// GET ALL CENTERS
export const getCenters = () => api.get("/centers");
export const createCenter = (params: any) => api.post("/centers", params);
export const toggleCenter = (id: string) => api.put(`/centers/${id}/toggle`);
export const getCenterById = (id: string, params: any) => api.get(`/centers/${id}`, { params });

export const getDailyMilkTrend = (id: string, params: any) => api.get(`/centers/${id}/daily-milk-trend`, { params });
export const getFatSnfStats = (id: string, params: any) => api.get(`/centers/${id}/fat-snf-stats`, { params });
export const getCenterPerformance = (id: string, params: any) => api.get(`/centers/${id}/performance`, { params });