import type { AdminRecord } from "../types/superadmin";
import { api } from "./axiosInstance";

export type AdminPayload = {
  name: string;
  email: string;
  password?: string;
  role: "admin" | "superadmin";
  centreId: string | null;
  status: "active" | "disabled";
};

export const getAdmins = () => api.get<AdminRecord[]>("/admins");

export const createAdmin = (
  data: Required<Pick<AdminPayload, "name" | "email" | "role" | "status">> & {
    password: string;
    centreId: string | null;
  },
) => api.post<AdminRecord>("/admins", data);

export const updateAdmin = (id: string, data: Partial<AdminPayload>) =>
  api.put<AdminRecord>(`/admins/${id}`, data);
