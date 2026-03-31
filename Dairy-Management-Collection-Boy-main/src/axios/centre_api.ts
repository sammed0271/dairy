import type { CentreRecord } from "../types/superadmin";
import { api } from "./axiosInstance";

export type CentrePayload = {
  name: string;
  code: string;
  village?: string;
  taluka?: string;
  district?: string;
  state?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  paymentCycle?: string;
  rateType?: string;
  status?: "active" | "disabled";
};

export const getCentres = () => api.get<CentreRecord[]>("/centres");

export const createCentre = (data: CentrePayload) =>
  api.post<CentreRecord>("/centres", data);

export const updateCentre = (id: string, data: Partial<CentrePayload>) =>
  api.put<CentreRecord>(`/centres/${id}`, data);

export const backfillCentreAssignments = (centreId?: string) =>
  api.post<{
    message: string;
    centre: CentreRecord;
    updated: Record<string, number>;
  }>("/centres/backfill", centreId ? { centreId } : {});
