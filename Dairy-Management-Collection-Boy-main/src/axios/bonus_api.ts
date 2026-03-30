import { api } from "./axiosInstance";
import type { Bonus, AddBonusRequest, GetBonusParams } from "../types/bonus";

// Add bonus entry
export const addBonus = (data: AddBonusRequest) =>
  api.post<Bonus>("/bonus", data);

// Get all bonus entries (optionally filtered)
export const getBonus = (params?: GetBonusParams) =>
  api.get<Bonus[]>("/bonus", { params });

// Delete bonus entry
export const deleteBonus = (id: string) =>
  api.delete<{ message: string }>(`/bonus/${id}`);

export const previewBonus = (data: {
  periodFrom: string;
  periodTo: string;
  rule: { type: string; value: number; perAmount?: number };
}) => api.post("/bonus/preview", data);
