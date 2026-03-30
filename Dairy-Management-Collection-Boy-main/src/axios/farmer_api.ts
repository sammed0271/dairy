import { api } from "./axiosInstance";
import type { Farmer, AddFarmerRequest, UpdateFarmerRequest } from "../types/farmer";

export const addFarmer = (data: AddFarmerRequest) =>
  api.post<Farmer>("/farmers", data);

export const getFarmers = () =>
  api.get<Farmer[]>("/farmers");

export const deleteFarmer = (id: string) =>
  api.delete<{ message: string }>(`/farmers/${id}`);

export const updateFarmer = (id: string, data: UpdateFarmerRequest) =>
  api.put<Farmer>(`/farmers/${id}`, data);
