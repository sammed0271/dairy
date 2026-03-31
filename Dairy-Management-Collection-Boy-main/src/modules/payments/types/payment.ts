export type PaymentStatus =
  | "initiated"
  | "processing"
  | "processed"
  | "failed"
  | "reversed";

export interface PaymentSummaryRecord {
  _id: string;
  amount: number;
  accountNumber?: string;
  ifsc?: string;
  accountHolderName?: string;
  transactionId?: string;
  razorpayPayoutId?: string;
  status: PaymentStatus;
  failureReason?: string;
  createdAt: string;
  farmerId: {
    _id: string;
    name: string;
    code: string;
  } | null;
  billId: {
    _id: string;
    periodFrom: string;
    periodTo: string;
    status: string;
  } | null;
  centreId: {
    _id: string;
    name: string;
    code: string;
  } | null;
}
