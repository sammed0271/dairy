// src/storage/indexDb.ts

/**
 * Simple IndexedDB helper for the dairy app.
 * Currently not used by pages, but ready for future use.
 *
 * Each object store uses `id` as primary key.
 */

export const DB_NAME = "dairy_management_db";
export const DB_VERSION = 1;

export const STORE_NAMES = {
  farmers: "farmers",
  milkCollections: "milkCollections",
  inventoryItems: "inventoryItems",
  deductions: "deductions",
  bills: "bills",
  bonusRules: "bonusRules",
  bonusPayments: "bonusPayments",
  rateCharts: "rateCharts",
} as const;

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

/**
 * Open (and create/upgrade) the IndexedDB database.
 */
export function openDairyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      // Create object stores if they don't exist already
      const ensureStore = (name: StoreName) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, {
            keyPath: "_id",
          });
        }
      };

      ensureStore(STORE_NAMES.farmers);
      ensureStore(STORE_NAMES.milkCollections);
      ensureStore(STORE_NAMES.inventoryItems);
      ensureStore(STORE_NAMES.deductions);
      ensureStore(STORE_NAMES.bills);
      ensureStore(STORE_NAMES.bonusRules);
      ensureStore(STORE_NAMES.bonusPayments);
      ensureStore(STORE_NAMES.rateCharts);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

/**
 * Get all records from a store.
 */
export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDairyDb();
  return new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as T[]);
  });
}

/**
 * Get a single record by id.
 */
export async function dbGetById<T>(
  storeName: StoreName,
  id: IDBValidKey,
): Promise<T | undefined> {
  const db = await openDairyDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () =>
      resolve((request.result as T | undefined) ?? undefined);
  });
}

/**
 * Insert or update a record in a store.
 * Record must contain a unique `id` field.
 */
export async function dbPut<T extends { _id: IDBValidKey }>(
  storeName: StoreName,
  value: T,
): Promise<IDBValidKey> {
  const db = await openDairyDb();
  return new Promise<IDBValidKey>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.put(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete a record by id.
 */
export async function dbDelete(
  storeName: StoreName,
  id: IDBValidKey,
): Promise<void> {
  const db = await openDairyDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
