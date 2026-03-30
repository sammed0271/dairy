import { api } from "./axiosInstance";

export const sellInventoryToFarmer = (data: {
  farmerId: string;
  itemId: string;
  quantity: number;
  paymentMethod: "Cash" | "Bill" | "Installment";
  paidAmount?: number;
  note?: string;
}) => api.post("/inventory-transactions/sell", data);

export const getInventoryTransactions = () =>
  api.get("/inventory-transactions");
