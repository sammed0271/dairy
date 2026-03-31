// src/types/milkCollection.ts
import type { MilkType } from "./farmer";

export type MilkShift = "morning" | "evening";

export interface MilkCollection {
  /** Unique internal id */
_id: string;

  /** ISO date string (YYYY-MM-DD) of collection */
  date: string;

  /** Morning / Evening */
  shift: MilkShift;

  /** Link back to farmer (id/code/name stored for convenience) */
  farmerId: string;
  farmerCode: string;
  farmerName: string;

  /** Cow / Buffalo */
  milkType: MilkType;

  /** Quantity in liters */
  liters: number;

  /** FAT percentage */
  fat: number;

  /** SNF percentage */
  snf: number;

  /** Rate per liter in currency */
  rate: number;

  /** Computed = liters * rate */
  amount: number;

  /** Optional free text remarks */
  remarks?: string;

  /** ISO datetime string when entry was created */
  createdAt: string;
  updatedAt?: string;
  clientGeneratedId?: string | null;
  syncStatus?: "synced" | "pending";
}
