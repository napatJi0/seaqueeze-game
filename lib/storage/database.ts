/**
 * Minimal promise wrapper around IndexedDB (no extra dependency).
 */
export const DB_NAME = "squid-plinko";
export const DB_VERSION = 1;

export const STORES = {
  sessions: "sessions",
  results: "results",
  meta: "meta",
} as const;

export function isIndexedDbAvailable(factory: IDBFactory | undefined = globalThis.indexedDB): boolean {
  return typeof factory !== "undefined" && factory !== null;
}

export function openDatabase(factory: IDBFactory = globalThis.indexedDB, name: string = DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(name, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.sessions)) db.createObjectStore(STORES.sessions, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORES.results)) {
        const results = db.createObjectStore(STORES.results, { keyPath: "key" });
        results.createIndex("sessionId", "sessionId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onblocked = () => reject(new Error("IndexedDB open blocked"));
  });
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}
