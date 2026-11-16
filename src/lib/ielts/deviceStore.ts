import type { CustomVisualInput } from "@ielts/contract.ts";

/**
 * Keeps a student's own chart image (or description) on this device only, keyed by
 * session id. The server never stores it. IndexedDB first, sessionStorage as fallback.
 */

const DB_NAME = "adaptiveprep-ielts";
const STORE = "custom-visuals";
const SS_PREFIX = "adaptiveprep:ielts-visual:";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbRun<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveCustomVisual(sessionId: string, visual: CustomVisualInput): Promise<void> {
  try {
    await idbRun("readwrite", (s) => s.put(visual, sessionId));
    return;
  } catch {
    // fall through
  }
  try {
    sessionStorage.setItem(SS_PREFIX + sessionId, JSON.stringify(visual));
  } catch {
    // storage full or unavailable: the submit step will ask the student to add it again
  }
}

export async function loadCustomVisual(sessionId: string): Promise<CustomVisualInput | null> {
  try {
    const v = await idbRun<CustomVisualInput | undefined>("readonly", (s) => s.get(sessionId));
    if (v) return v;
  } catch {
    // fall through
  }
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + sessionId);
    return raw ? (JSON.parse(raw) as CustomVisualInput) : null;
  } catch {
    return null;
  }
}

export async function deleteCustomVisual(sessionId: string): Promise<void> {
  try {
    await idbRun("readwrite", (s) => s.delete(sessionId));
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(SS_PREFIX + sessionId);
  } catch {
    // ignore
  }
}
