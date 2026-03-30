import { api } from "./axiosInstance";
import type { MilkCollection } from "../types/milkCollection";
import type { MilkType } from "../types/farmer";

export type AddMilkRequest = {
  date: string;
  shift: "morning" | "evening";
  farmerId: string;
  quantity: number;
    milkType: MilkType;
  fat: number;
  snf: number;
  rate: number;
};

export const getRateForMilk = (params: {
  milkType: string;
  fat: number;
  snf: number;
  date: string;
}) => api.get("/rate-chart/rate", { params });

export const addMilkEntry = (data: AddMilkRequest) =>
  api.post<MilkCollection>("/milk", data);

export const getMilkEntries = () => api.get<MilkCollection[]>("/milk");

export const deleteMilkEntry = (id: string) =>
  api.delete<{ message: string }>(`/milk/${id}`);
