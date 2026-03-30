// src/types/inventory.ts

// export type InventoryCategory =
//   | "Feed"
//   | "Equipment"
//   | "Testing"
//   | "Stationery"
//   | "Other";

export type InventoryCategory = string;

export type InventoryMovementType = "In" | "Out";

export interface InventoryItem {
  updatedAt: string;
  _id: string;
  /** Item code like I001 */
  code: string;
  /** Item name e.g. "Cattle Feed" */
  name: string;
  category: InventoryCategory;
  /** Stock keeping unit, e.g. Kg, Ltr, Pieces */
  unit: string;
  /** Current stock in unit */
  currentStock: number;
  /** Minimum recommended stock; used for low stock alert */
  minStock: number;
  /** Default purchase rate per unit (optional) */
  purchaseRate?: number;
  /** Default selling rate per unit (optional) */
  sellingRate?: number;
  /** ISO date string (YYYY-MM-DD) when last stock change happened */
  lastUpdated: string;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  type: InventoryMovementType;
  quantity: number;
  /** Optional, if you later link to farmers or vendors */
  relatedFarmerId?: string;
  note?: string;
  /** ISO date (YYYY-MM-DD) for movement */
  date: string;
  createdAt: string;
}