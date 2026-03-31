import { api } from "./axiosInstance";
import type { Farmer } from "../types/farmer";
import type { InventoryItem } from "../types/inventory";
import type { MilkCollection } from "../types/milkCollection";

export type MilkEntrySyncQueueItemPayload = {
  id: string;
  entityType: "milkEntry";
  action: "create";
  payload: {
    clientGeneratedId: string;
    date: string;
    shift: "morning" | "evening";
    farmerId: string;
    quantity: number;
    fat: number;
    snf: number;
    milkType: "cow" | "buffalo" | "mix";
  };
};

export type InventoryCreateSyncQueueItemPayload = {
  id: string;
  entityType: "inventoryItem";
  action: "create";
  payload: {
    clientGeneratedId: string;
    localId: string;
    name: string;
    category: string;
    unit: string;
    openingStock: number;
    minStock: number;
    purchaseRate?: number;
    sellingRate?: number;
  };
};

export type InventoryUpdateSyncQueueItemPayload = {
  id: string;
  entityType: "inventoryItem";
  action: "update";
  payload: {
    id: string;
    fields: Partial<
      Pick<
        InventoryItem,
        "name" | "category" | "unit" | "currentStock" | "minStock" | "purchaseRate" | "sellingRate"
      >
    >;
  };
};

export type InventoryDeleteSyncQueueItemPayload = {
  id: string;
  entityType: "inventoryItem";
  action: "delete";
  payload: {
    id: string;
  };
};

export type InventorySellSyncQueueItemPayload = {
  id: string;
  entityType: "inventoryTransaction";
  action: "sell";
  payload: {
    farmerId: string;
    itemId: string;
    quantity: number;
    paymentMethod: "Cash" | "Bill" | "Installment";
    paidAmount?: number;
    note?: string;
  };
};

export type SyncQueueItemPayload =
  | MilkEntrySyncQueueItemPayload
  | InventoryCreateSyncQueueItemPayload
  | InventoryUpdateSyncQueueItemPayload
  | InventoryDeleteSyncQueueItemPayload
  | InventorySellSyncQueueItemPayload;

export type SyncPullResponse = {
  serverTime: string;
  updatedAfter: string | null;
  data: {
    farmers: Farmer[];
    inventory: InventoryItem[];
    milkEntries: MilkCollection[];
  };
};

export const getSyncStatus = () => api.get("/sync/status");

export const pullSyncData = (updatedAfter?: string) =>
  api.get<SyncPullResponse>("/sync/pull", {
    params: updatedAfter ? { updatedAfter } : undefined,
  });

export const pushSyncData = (items: SyncQueueItemPayload[]) =>
  api.post<{
    serverTime: string;
    results: Array<{
      id: string;
      entityType: SyncQueueItemPayload["entityType"];
      action: SyncQueueItemPayload["action"];
      status: "synced" | "failed" | "skipped";
      message?: string;
      serverId?: string;
      created?: boolean;
    }>;
  }>("/sync/push", { items });
