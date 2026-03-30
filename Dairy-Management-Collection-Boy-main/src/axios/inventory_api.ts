import { api } from "./axiosInstance";
import type { InventoryItem } from "../types/inventory";

export type AddInventoryRequest = {
  name: string;
  category: string;
  unit: string;
  openingStock: number;
  minStock: number;
  purchaseRate?: number;
  sellingRate?: number;
};

export const addInventoryItem = (data: AddInventoryRequest) =>
  api.post<InventoryItem>("/inventory", data);

export const getInventoryItems = () => api.get<InventoryItem[]>("/inventory");

export const updateInventoryItem = (id: string, data: Partial<InventoryItem>) =>
  api.put<InventoryItem>(`/inventory/${id}`, data);

export const deleteInventoryItem = (id: string) =>
  api.delete<{ message: string }>(`/inventory/${id}`);

export const getInventoryReport = () => api.get("/inventory/report");
