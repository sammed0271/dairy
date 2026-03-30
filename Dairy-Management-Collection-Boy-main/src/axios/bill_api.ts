import { api } from "./axiosInstance";
import type { Bill, GenerateBillRequest } from "../types/bills";

export const generateBill = (data: GenerateBillRequest) =>
  api.post<Bill>("/bills/generate", data);

export const getBills = () =>
  api.get<Bill[]>("/bills");
