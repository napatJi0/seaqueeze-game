/**
 * Game repository: persists the session snapshot and an append-only result history.
 * Each save is a single IndexedDB transaction, so an interrupted write never
 * leaves a half-updated session behind.
 */
import type { GameSession, RoundResult } from "@/types/game";
import { openDatabase, requestToPromise, STORES, transactionDone } from "./database";

export interface StoredResult {
  /** `${sessionId}:${roundNumber}` — makes duplicate result writes idempotent. */
  key: string;
  sessionId: string;
  roundNumber: number;
  result: RoundResult;
}

export interface GameRepository {
  /** Raw (unvalidated) active session, or null. Callers must validate. */
  loadActiveSession(): Promise<unknown>;
  saveSession(session: GameSession): Promise<void>;
  loadResults(sessionId: string): Promise<StoredResult[]>;
  deleteSession(sessionId: string): Promise<void>;
}

const ACTIVE_KEY = "activeSessionId";

export function resultKey(sessionId: string, roundNumber: number): string {
  return `${sessionId}:${String(roundNumber).padStart(2, "0")}`;
}

export class IndexedDbGameRepository implements GameRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private readonly factory: IDBFactory;

  constructor(factory: IDBFactory = globalThis.indexedDB) {
    this.factory = factory;
  }

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDatabase(this.factory).catch((e: unknown) => {
        this.dbPromise = null;
        throw e;
      });
    }
    return this.dbPromise;
  }

  async loadActiveSession(): Promise<unknown> {
    const db = await this.db();
    const tx = db.transaction([STORES.meta, STORES.sessions], "readonly");
    const meta = (await requestToPromise(tx.objectStore(STORES.meta).get(ACTIVE_KEY))) as
      | { key: string; value: unknown }
      | undefined;
    if (!meta || typeof meta.value !== "string") return null;
    const session = await requestToPromise(tx.objectStore(STORES.sessions).get(meta.value));
    return session ?? null;
  }

  async saveSession(session: GameSession): Promise<void> {
    const db = await this.db();
    const tx = db.transaction([STORES.sessions, STORES.results, STORES.meta], "readwrite");
    const done = transactionDone(tx);
    tx.objectStore(STORES.sessions).put(session);
    const results = tx.objectStore(STORES.results);
    for (const r of session.results) {
      const record: StoredResult = {
        key: resultKey(session.id, r.roundNumber),
        sessionId: session.id,
        roundNumber: r.roundNumber,
        result: r,
      };
      results.put(record);
    }
    tx.objectStore(STORES.meta).put({ key: ACTIVE_KEY, value: session.id });
    await done;
  }

  async loadResults(sessionId: string): Promise<StoredResult[]> {
    const db = await this.db();
    const tx = db.transaction(STORES.results, "readonly");
    const all = (await requestToPromise(
      tx.objectStore(STORES.results).index("sessionId").getAll(sessionId),
    )) as StoredResult[];
    return all.sort((a, b) => a.roundNumber - b.roundNumber);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction([STORES.sessions, STORES.results], "readwrite");
    const done = transactionDone(tx);
    tx.objectStore(STORES.sessions).delete(sessionId);
    const index = tx.objectStore(STORES.results).index("sessionId");
    const keys = await requestToPromise(index.getAllKeys(sessionId));
    for (const k of keys) tx.objectStore(STORES.results).delete(k);
    await done;
  }
}

/** In-memory fallback when IndexedDB is unavailable (e.g. some private modes). */
export class MemoryGameRepository implements GameRepository {
  private session: GameSession | null = null;
  private results = new Map<string, StoredResult>();

  async loadActiveSession(): Promise<unknown> {
    return this.session ? structuredClone(this.session) : null;
  }
  async saveSession(session: GameSession): Promise<void> {
    this.session = structuredClone(session);
    for (const r of session.results) {
      const key = resultKey(session.id, r.roundNumber);
      this.results.set(key, { key, sessionId: session.id, roundNumber: r.roundNumber, result: r });
    }
  }
  async loadResults(sessionId: string): Promise<StoredResult[]> {
    return [...this.results.values()].filter((r) => r.sessionId === sessionId).sort((a, b) => a.roundNumber - b.roundNumber);
  }
  async deleteSession(sessionId: string): Promise<void> {
    if (this.session?.id === sessionId) this.session = null;
    for (const [k, v] of this.results) if (v.sessionId === sessionId) this.results.delete(k);
  }
}
