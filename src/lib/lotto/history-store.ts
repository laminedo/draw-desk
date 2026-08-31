import { LottoEngine } from "@/lib/lotto/engine";
import type { DrawRecord, GameId } from "@/lib/lotto/types";

const DB_NAME = "draw-desk-history";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const id of ["mega", "powerball", "hit5", "walotto"]) {
          if (!db.objectStoreNames.contains(id)) {
            db.createObjectStore(id, { keyPath: "drawDate" });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function toStored(record: DrawRecord) {
  return {
    drawDate: record.drawDate,
    numbers: record.numbers,
    megaBall: record.megaBall,
    key: record.key,
    combinationIndex: record.combinationIndex,
    masterCsvLine: record.masterCsvLine,
    legacy: record.legacy ?? false,
    doublePlay: record.doublePlay ?? false,
  };
}

export async function loadHistory(game: GameId): Promise<DrawRecord[]> {
  const db = await openDb();
  if (db) {
    const rows = await new Promise<DrawRecord[]>((resolve) => {
      try {
        const tx = db.transaction(game, "readonly");
        const req = tx.objectStore(game).getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as DrawRecord[];
          list.sort((a, b) => String(b.drawDate).localeCompare(String(a.drawDate)));
          resolve(list);
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
    if (rows.length) return rows;
  }
  const cfg = LottoEngine.GAME_CONFIGS[game];
  try {
    const res = await fetch(cfg.historyUrl, { headers: { accept: "application/json" } });
    if (!res.ok) return [];
    const raw = await res.json();
    const normalized = LottoEngine.normalizeHistory(raw, cfg) as DrawRecord[];
    await saveHistory(game, normalized);
    return normalized;
  } catch {
    return [];
  }
}

export async function saveHistory(game: GameId, records: DrawRecord[]): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(game, "readwrite");
    const store = tx.objectStore(game);
    for (const record of records) store.put(toStored(record));
  } catch {
    /* ignore quota */
  }
}

export async function mergeHistory(
  game: GameId,
  existing: DrawRecord[],
  incoming: DrawRecord[],
): Promise<{ records: DrawRecord[]; added: number }> {
  const merged = LottoEngine.mergeHistory(existing, incoming) as {
    records: DrawRecord[];
    added: number;
  };
  if (merged.added) await saveHistory(game, merged.records);
  return merged;
}

export async function clearHistory(game: GameId): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(game, "readwrite").objectStore(game).clear();
  } catch {
    /* ignore */
  }
}
