// src/types/rateChart.ts
import type { MilkType } from "./farmer";

export interface Slab {
  from: number;
  to: number;
  rate: number;
}

export interface MilkRateChart {
  milkType: MilkType;
  fatSlabs: Slab[];
  snfSlabs: Slab[];

  fatMin: number;
  fatMax: number;
  fatStep: number;

  snfMin: number;
  snfMax: number;
  snfStep: number;

  fats: number[];
  snfs: number[];
  rates: number[][];

  baseRate: number;
  // fatFactor: number;
  // snfFactor: number;

  updatedAt: string;
  effectiveFrom: string;
}
