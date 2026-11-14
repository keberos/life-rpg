// Local-first persistence. localStorage for the prototype (small, synchronous);
// the save is one JSON blob so export/import is just that blob as a file.
import { useEffect, useState } from 'preact/hooks';
import { STAT_IDS } from '../../src/engine/types.ts';
import { derive, type GameState, type LogEvent, type NewEvent, type SaveFile } from './model.ts';

const KEY = 'life-rpg:save:v1';

function newId(): string {
  // crypto.randomUUID needs a secure context; the phone may load over plain LAN http.
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function' && globalThis.isSecureContext) return crypto.randomUUID();
  } catch { /* fall through */ }
  return 'p-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function freshSave(now = Date.now()): SaveFile {
  return {
    version: 1,
    profile: { id: newId(), createdAt: now, seasonStart: now, enabledStats: [...STAT_IDS], onboarded: false },
    events: [],
  };
}

function load(): SaveFile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SaveFile;
      if (parsed?.version === 1 && parsed.profile && Array.isArray(parsed.events)) return parsed;
    }
  } catch { /* corrupted or blocked storage: start fresh */ }
  return freshSave();
}

let save: SaveFile = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch { /* storage full or blocked; keep playing in memory */ }
  for (const l of listeners) l();
}

export const store = {
  get: () => save,
  state: (): GameState => derive(save),
  /** Append events. `at` defaults to the (possibly time-warped) current time. */
  log(...events: NewEvent[]) {
    const now = derive(save).now;
    save = { ...save, events: [...save.events, ...events.map((e) => ({ ...e, at: e.at ?? now }) as LogEvent)] };
    persist();
  },
  updateProfile(patch: Partial<SaveFile['profile']>) {
    save = { ...save, profile: { ...save.profile, ...patch } };
    persist();
  },
  replace(next: SaveFile) {
    save = next;
    persist();
  },
  reset() {
    save = freshSave();
    persist();
  },
  exportJson: () => JSON.stringify(save, null, 2),
  importJson(text: string) {
    const parsed = JSON.parse(text) as SaveFile;
    if (parsed?.version !== 1 || !parsed.profile || !Array.isArray(parsed.events)) throw new Error('Not a Life RPG save file');
    store.replace(parsed);
  },
};

/** Re-render on any save change; returns the derived game state. */
export function useGame(): GameState {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return store.state();
}
