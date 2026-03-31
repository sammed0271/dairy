import { api } from "./axiosInstance";
import type {
  AddFarmerRequest,
  Farmer,
  FarmerTransferRecord,
  UpdateFarmerRequest,
} from "../types/farmer";

export const addFarmer = (data: AddFarmerRequest) =>
  api.post<Farmer>("/farmers", data);

export const getFarmers = (params?: { centreId?: string }) =>
  api.get<Farmer[]>("/farmers", { params });

export const deleteFarmer = (id: string) =>
  api.delete<{ message: string }>(`/farmers/${id}`);

export const updateFarmer = (id: string, data: UpdateFarmerRequest) =>
  api.put<Farmer>(`/farmers/${id}`, data);

export const transferFarmer = (
  id: string,
  data: { toCentreId: string; note?: string },
) => api.post<{ message: string; farmer: Farmer }>(`/farmers/${id}/transfer`, data);

export const getFarmerTransferHistory = (id: string) =>
  api.get<FarmerTransferRecord[]>(`/farmers/${id}/transfers`);
