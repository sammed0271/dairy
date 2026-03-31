import { api } from "../../../axios/axiosInstance";
import type { PaymentSummaryRecord } from "../types/payment";

export const fetchPayments = () => {
  return api.get<PaymentSummaryRecord[]>("/payments");
};
