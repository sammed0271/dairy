// src/constants/enums.ts

/** Milk type used across the app. Note: we also have `MilkType` union in types/farmer.ts */
export type MilkTypeEnum = "Cow" | "Buffalo";
export const MilkTypeEnum = {
  Cow: "Cow" as const,
  Buffalo: "Buffalo" as const,
};

/** Morning / Evening shifts */
export type MilkShiftEnum = "Morning" | "Evening";
export const MilkShiftEnum = {
  Morning: "Morning" as const,
  Evening: "Evening" as const,
};

/** Deduction categories */
export type DeductionCategoryEnum = "Advance" | "Food" | "Medical";
export const DeductionCategoryEnum = {
  Advance: "Advance" as const,
  Food: "Food" as const,
  Medical: "Medical" as const,
};

/** Inventory categories */
export type InventoryCategoryEnum =
  | "Feed"
  | "Equipment"
  | "Testing"
  | "Stationery"
  | "Other";
export const InventoryCategoryEnum = {
  Feed: "Feed" as const,
  Equipment: "Equipment" as const,
  Testing: "Testing" as const,
  Stationery: "Stationery" as const,
  Other: "Other" as const,
};

/** Bill status */
export type BillStatusEnum = "Pending" | "Paid";
export const BillStatusEnum = {
  Pending: "Pending" as const,
  Paid: "Paid" as const,
};

/** Simple helper arrays for select controls (optional) */

export const MILK_TYPE_OPTIONS = [
  { label: "Cow Milk", value: MilkTypeEnum.Cow },
  { label: "Buffalo Milk", value: MilkTypeEnum.Buffalo },
];

export const SHIFT_OPTIONS = [
  { label: "Morning", value: MilkShiftEnum.Morning },
  { label: "Evening", value: MilkShiftEnum.Evening },
];

export const DEDUCTION_CATEGORY_OPTIONS = [
  { label: "Advance", value: DeductionCategoryEnum.Advance },
  { label: "Food", value: DeductionCategoryEnum.Food },
  { label: "Medical", value: DeductionCategoryEnum.Medical },
];

export const INVENTORY_CATEGORY_OPTIONS = [
  { label: "Feed", value: InventoryCategoryEnum.Feed },
  { label: "Equipment", value: InventoryCategoryEnum.Equipment },
  { label: "Testing", value: InventoryCategoryEnum.Testing },
  { label: "Stationery", value: InventoryCategoryEnum.Stationery },
  { label: "Other", value: InventoryCategoryEnum.Other },
];

export const BILL_STATUS_OPTIONS = [
  { label: "Pending", value: BillStatusEnum.Pending },
  { label: "Paid", value: BillStatusEnum.Paid },
];
