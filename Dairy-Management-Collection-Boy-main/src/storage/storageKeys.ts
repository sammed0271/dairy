// src/storage/storageKeys.ts

/**
 * All localStorage keys used in the dairy application.
 * Keep them in one place to avoid typos.
 */
export const StorageKey = {
  AuthToken: "dairy_auth_token",

  Farmers: "dairy_farmers",
  MilkCollections: "dairy_milkCollections",
  RateCharts: "dairy_rateCharts",
  InventoryItems: "dairy_inventoryItems",
  Deductions: "dairy_deductions",
  BonusRules: "dairy_bonusRules",
  BonusPayments: "dairy_bonusPayments",
  Bills: "dairy_bills",
  Settings: "dairy_settings",
} as const;

export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];

/** Convenience array of keys, if needed for clearing/iterating. */
export const ALL_STORAGE_KEYS = Object.values(StorageKey);
