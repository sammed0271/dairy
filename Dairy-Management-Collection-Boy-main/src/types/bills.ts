// src/types/bills.ts

export type BillStatus = "Pending" | "Paid";

export interface Bill {
  _id: string;

  /** Human-readable bill number e.g. BILL-0001 */
  billNo: string;

  farmerId: string;
  farmerCode: string;
  farmerName: string;

  /** Bill period (inclusive) */
  periodFrom: string; // YYYY-MM-DD
  periodTo: string; // YYYY-MM-DD

  /** Total liters of milk in this period */
  totalLiters: number;

  /** Total milk amount (sum of collections) */
  milkAmount: number;

  /** Total bonus amount applied for this period */
  bonusAmount: number;

  /** Total deductions applied (from farmer's outstanding) */
  deductionAmount: number;

  /** Final payable amount (milk + bonus - deductions) */
  netAmount: number;

  status: BillStatus;

  /** ISO datetime when bill was generated */
  createdAt: string;
}

export type GenerateBillRequest = {
  farmerId: string;
  periodFrom: string;
  periodTo: string;
};
