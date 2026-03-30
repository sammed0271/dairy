import { api } from "./axiosInstance";
import type { Deduction } from "../types/deduction";

export type AddDeductionRequest = {
  date: string;
  farmerId: string;
  category: string;
  amount: number;
  description?: string;
};

export const addDeduction = (data: AddDeductionRequest) =>
  api.post<Deduction>("/deductions", data);

export const getDeductions = () => api.get<Deduction[]>("/deductions");

export const deleteDeduction = (id: string) =>
  api.delete<{ message: string }>(`/deductions/${id}`);
