import { api } from "./axiosInstance";

interface PayBillPayload {
  billId: string;
  accountNumber: string;
  ifsc: string;
  accountHolderName: string;
}

export const payBillToBank = (data: PayBillPayload) => {
  return api.post("/payments/pay-bill", data);
};

export const getPayments = () => {
  return api.get("/payments");
};

export const getFarmerPayments = (farmerId: string) => {
  return api.get(`/payments/farmer/${farmerId}`);
};

export const payAllBills = () => {
  return api.post("/payments/pay-all");
};