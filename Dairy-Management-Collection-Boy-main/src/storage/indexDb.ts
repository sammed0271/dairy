export const DB_NAME = "dairy_management_db";
export const DB_VERSION = 2;

export const STORE_NAMES = {
  farmers: "farmers",
  milkEntries: "milkEntries",
  inventory: "inventory",
  syncQueue: "syncQueue",
  syncMeta: "syncMeta",
} as const;

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

const STORE_CONFIG: Record<StoreName, { keyPath: string }> = {
  [STORE_NAMES.farmers]: { keyPath: "_id" },
  [STORE_NAMES.milkEntries]: { keyPath: "_id" },
  [STORE_NAMES.inventory]: { keyPath: "_id" },
  [STORE_NAMES.syncQueue]: { keyPath: "id" },
  [STORE_NAMES.syncMeta]: { keyPath: "id" },
};

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

      Object.entries(STORE_CONFIG).forEach(([name, config]) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, {
            keyPath: config.keyPath,
          });
        }
      });
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

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

export async function dbPut<T extends object>(
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

export async function dbBulkPut<T extends object>(
  storeName: StoreName,
  values: T[],
): Promise<void> {
  const db = await openDairyDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    values.forEach((value) => {
      store.put(value);
    });

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
  });
}

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

export async function dbClear(storeName: StoreName): Promise<void> {
  const db = await openDairyDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
