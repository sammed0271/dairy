// src/types/bonus.ts

// export type BonusType = "Percentage" | "Fixed";
export type BonusType = "Percentage" | "Fixed" | "PerAmount" | "PerLiter";

export interface BonusRule {
  _id: string;
  /** Name shown to user e.g. "2% Monthly Bonus" */
  name: string;
  /** Percentage of milk amount or fixed amount per farmer */
  type: BonusType;
  /** If type === "Percentage" => % (e.g. 2 for 2%)  */
  /** If type === "Fixed"      => flat amount per farmer in period */
  value: number;
  /** Optional description / notes */
  description?: string;
  /** Is this rule available for distribution */
  active: boolean;
  createdAt: string;
  updatedAt: string;
  perAmount?: number; 
}

export interface BonusPayment {
  id: string;
  ruleId: string;
  ruleName: string;

  farmerId: string;
  farmerCode: string;
  farmerName: string;

  periodFrom: string; // YYYY-MM-DD
  periodTo: string; // YYYY-MM-DD

  totalLiters: number;
  totalAmount: number;
  bonusAmount: number;

  createdAt: string;
}

export type Bonus = {
  _id: string;
  farmerId: {
    _id: string;
    name: string;
    mobile: string;
  };
  date: string; // "YYYY-MM-DD"
  amount: number;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AddBonusRequest = {
  farmerId: string;
  date: string;
  amount: number;
  reason?: string;
};

export type GetBonusParams = {
  farmerId?: string;
};

export interface CalculatedBonusRow {
  farmerId: string;
  farmerCode: string;
  farmerName: string;
  liters: number;
  amount: number;
  bonus: number;
}
