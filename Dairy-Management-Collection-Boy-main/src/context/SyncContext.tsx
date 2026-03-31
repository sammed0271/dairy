import React from "react";
import {
  type InventorySellSyncQueueItemPayload,
  pullSyncData,
  pushSyncData,
  type InventoryCreateSyncQueueItemPayload,
  type InventoryDeleteSyncQueueItemPayload,
  type InventoryUpdateSyncQueueItemPayload,
  type SyncQueueItemPayload,
} from "../axios/sync_api";
import type { Farmer } from "../types/farmer";
import type { InventoryItem } from "../types/inventory";
import type { MilkCollection } from "../types/milkCollection";
import { AUTH_CHANGED_EVENT, getToken } from "../utils/auth";
import {
  dbBulkPut,
  dbDelete,
  dbGetAll,
  dbGetById,
  dbPut,
  STORE_NAMES,
} from "../storage/indexDb";

type SyncMetaRecord = {
  id: "meta";
  lastSyncTime: string | null;
};

type OfflineMilkEntryPayload = {
  clientGeneratedId: string;
  date: string;
  shift: "morning" | "evening";
  farmerId: string;
  quantity: number;
  fat: number;
  snf: number;
  milkType: "cow" | "buffalo" | "mix";
};

type SyncQueueRecord = SyncQueueItemPayload & {
  createdAt: string;
  retryCount: number;
  lastError: string | null;
};

type SyncContextValue = {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  failedQueueItems: SyncQueueRecord[];
  syncNow: () => Promise<void>;
  queueMilkEntry: (args: {
    entry: MilkCollection;
    payload: OfflineMilkEntryPayload;
  }) => Promise<void>;
  queueInventoryCreate: (args: {
    item: InventoryItem;
    payload: InventoryCreateSyncQueueItemPayload["payload"];
  }) => Promise<void>;
  queueInventoryUpdate: (args: {
    item: InventoryItem;
    payload: InventoryUpdateSyncQueueItemPayload["payload"];
  }) => Promise<void>;
  queueInventoryDelete: (args: {
    itemId: string;
    payload: InventoryDeleteSyncQueueItemPayload["payload"];
  }) => Promise<void>;
  queueInventorySale: (args: {
    item: InventoryItem;
    payload: InventorySellSyncQueueItemPayload["payload"];
  }) => Promise<void>;
  getCachedFarmers: () => Promise<Farmer[]>;
  getCachedMilkEntries: () => Promise<MilkCollection[]>;
  getCachedInventory: () => Promise<InventoryItem[]>;
  refreshCaches: () => Promise<void>;
};

const SyncContext = React.createContext<SyncContextValue | undefined>(undefined);

const META_ID = "meta";

const buildQueueRecord = (
  item: SyncQueueItemPayload,
  customId?: string,
): SyncQueueRecord => ({
  ...item,
  id: customId ?? item.id,
  createdAt: new Date().toISOString(),
  retryCount: 0,
  lastError: null,
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [lastSyncTime, setLastSyncTime] = React.useState<string | null>(null);
  const [queueRecords, setQueueRecords] = React.useState<SyncQueueRecord[]>([]);
  const [authVersion, setAuthVersion] = React.useState(0);

  const refreshQueueState = React.useCallback(async () => {
    const queue = await dbGetAll<SyncQueueRecord>(STORE_NAMES.syncQueue);
    const sortedQueue = [...queue].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    setQueueRecords(sortedQueue);
    setPendingCount(sortedQueue.length);
  }, []);

  const loadMeta = React.useCallback(async () => {
    const meta = await dbGetById<SyncMetaRecord>(STORE_NAMES.syncMeta, META_ID);
    setLastSyncTime(meta?.lastSyncTime ?? null);
  }, []);

  const refreshCaches = React.useCallback(async () => {
    if (!getToken() || !navigator.onLine) {
      return;
    }

    const meta = await dbGetById<SyncMetaRecord>(STORE_NAMES.syncMeta, META_ID);
    const response = await pullSyncData(meta?.lastSyncTime ?? undefined);

    await Promise.all([
      dbBulkPut(STORE_NAMES.farmers, response.data.data.farmers),
      dbBulkPut(STORE_NAMES.inventory, response.data.data.inventory),
      dbBulkPut(STORE_NAMES.milkEntries, response.data.data.milkEntries),
      dbPut(STORE_NAMES.syncMeta, {
        id: META_ID,
        lastSyncTime: response.data.serverTime,
      } satisfies SyncMetaRecord),
    ]);

    setLastSyncTime(response.data.serverTime);
  }, []);

  const syncNow = React.useCallback(async () => {
    if (!getToken() || !navigator.onLine || isSyncing) {
      return;
    }

    setIsSyncing(true);
    try {
      const queue = (
        await dbGetAll<SyncQueueRecord>(STORE_NAMES.syncQueue)
      ).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      if (queue.length > 0) {
        const response = await pushSyncData(queue);

        for (const result of response.data.results) {
          const existing = queue.find((item) => item.id === result.id);

          if (result.status === "synced") {
            await dbDelete(STORE_NAMES.syncQueue, result.id);

            if (existing?.entityType === "milkEntry") {
              await dbDelete(STORE_NAMES.milkEntries, `offline-${result.id}`);
            }

            if (
              existing?.entityType === "inventoryItem" &&
              existing.action === "create"
            ) {
              await dbDelete(STORE_NAMES.inventory, existing.payload.localId);
            }
          } else if (result.status === "failed" && existing) {
            await dbPut(STORE_NAMES.syncQueue, {
              ...existing,
              retryCount: existing.retryCount + 1,
              lastError: result.message ?? "Sync failed",
            });
          }
        }
      }

      await refreshCaches();
    } finally {
      await refreshQueueState();
      await loadMeta();
      setIsSyncing(false);
    }
  }, [isSyncing, loadMeta, refreshCaches, refreshQueueState]);

  const queueMilkEntry = React.useCallback(
    async ({
      entry,
      payload,
    }: {
      entry: MilkCollection;
      payload: OfflineMilkEntryPayload;
    }) => {
      const queueRecord = buildQueueRecord({
        id: payload.clientGeneratedId,
        entityType: "milkEntry",
        action: "create",
        payload,
      });

      await Promise.all([
        dbPut(STORE_NAMES.milkEntries, entry),
        dbPut(STORE_NAMES.syncQueue, queueRecord),
      ]);

      await refreshQueueState();
    },
    [refreshQueueState],
  );

  const queueInventoryCreate = React.useCallback(
    async ({
      item,
      payload,
    }: {
      item: InventoryItem;
      payload: InventoryCreateSyncQueueItemPayload["payload"];
    }) => {
      const queueRecord = buildQueueRecord({
        id: payload.clientGeneratedId,
        entityType: "inventoryItem",
        action: "create",
        payload,
      });

      await Promise.all([
        dbPut(STORE_NAMES.inventory, item),
        dbPut(STORE_NAMES.syncQueue, queueRecord),
      ]);

      await refreshQueueState();
    },
    [refreshQueueState],
  );

  const queueInventoryUpdate = React.useCallback(
    async ({
      item,
      payload,
    }: {
      item: InventoryItem;
      payload: InventoryUpdateSyncQueueItemPayload["payload"];
    }) => {
      const queueRecord = buildQueueRecord(
        {
          id: payload.id,
          entityType: "inventoryItem",
          action: "update",
          payload,
        },
        `inventory-update-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      );

      await Promise.all([
        dbPut(STORE_NAMES.inventory, item),
        dbPut(STORE_NAMES.syncQueue, queueRecord),
      ]);

      await refreshQueueState();
    },
    [refreshQueueState],
  );

  const queueInventoryDelete = React.useCallback(
    async ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: InventoryDeleteSyncQueueItemPayload["payload"];
    }) => {
      const queueRecord = buildQueueRecord(
        {
          id: payload.id,
          entityType: "inventoryItem",
          action: "delete",
          payload,
        },
        `inventory-delete-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      );

      await Promise.all([
        dbDelete(STORE_NAMES.inventory, itemId),
        dbPut(STORE_NAMES.syncQueue, queueRecord),
      ]);

      await refreshQueueState();
    },
    [refreshQueueState],
  );

  const queueInventorySale = React.useCallback(
    async ({
      item,
      payload,
    }: {
      item: InventoryItem;
      payload: InventorySellSyncQueueItemPayload["payload"];
    }) => {
      const queueRecord = buildQueueRecord(
        {
          id: payload.itemId,
          entityType: "inventoryTransaction",
          action: "sell",
          payload,
        },
        `inventory-sell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      );

      await Promise.all([
        dbPut(STORE_NAMES.inventory, item),
        dbPut(STORE_NAMES.syncQueue, queueRecord),
      ]);

      await refreshQueueState();
    },
    [refreshQueueState],
  );

  const getCachedFarmers = React.useCallback(
    () => dbGetAll<Farmer>(STORE_NAMES.farmers),
    [],
  );

  const getCachedMilkEntries = React.useCallback(
    () => dbGetAll<MilkCollection>(STORE_NAMES.milkEntries),
    [],
  );

  const getCachedInventory = React.useCallback(
    () => dbGetAll<InventoryItem>(STORE_NAMES.inventory),
    [],
  );

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncNow]);

  React.useEffect(() => {
    const handleAuthChanged = () => {
      setAuthVersion((value) => value + 1);
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    };
  }, []);

  React.useEffect(() => {
    void refreshQueueState();
    void loadMeta();
    if (navigator.onLine && getToken()) {
      void syncNow();
    }
  }, [authVersion, loadMeta, refreshQueueState, syncNow]);

  const value: SyncContextValue = {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    failedQueueItems: queueRecords.filter((record) => Boolean(record.lastError)),
    syncNow,
    queueMilkEntry,
    queueInventoryCreate,
    queueInventoryUpdate,
    queueInventoryDelete,
    queueInventorySale,
    getCachedFarmers,
    getCachedMilkEntries,
    getCachedInventory,
    refreshCaches,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSyncContext = () => {
  const context = React.useContext(SyncContext);

  if (!context) {
    throw new Error("useSyncContext must be used inside <SyncProvider>");
  }

  return context;
};
