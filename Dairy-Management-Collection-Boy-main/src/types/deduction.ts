// src/types/deduction.ts

export type DeductionCategory = "Advance" | "Food" | "Medical";

export type DeductionStatus = "Pending" | "Partial" | "Cleared";

export interface Deduction {
  _id: string;

  /** ISO date (YYYY-MM-DD) when deduction is created */
  date: string;

  /** Farmer linkage */
  farmerId: string;
  farmerCode: string;
  farmerName: string;

  /** Advance / Food / Medical */
  category: DeductionCategory;

  /** Original total deduction amount */
  amount: number;

  /** Remaining amount to be deducted from future bills */
  remainingAmount: number;

  /** Optional explanation / notes */
  description?: string;

  /** Pending, Partial, or Cleared */
  status: DeductionStatus;

  /** ISO datetime string */
  createdAt: string;
  updatedAt: string;
}