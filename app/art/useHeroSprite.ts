// Gets the sprite strip for a class + gear combination: from memory, then
// browser storage, else renders it in a worker. While rendering, the class's
// pre-rendered strip stands in.
import { useEffect, useState } from 'preact/hooks';
import { heroKey, heroLook } from './hero-look.ts';

// Bump the version when the sprite style changes, so cached strips re-render.
const STORE_PREFIX = 'life-rpg:sprite:v5:';
const MAX_STORED = 12;
const memory = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
let worker: Worker | null = null;

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(STORE_PREFIX + key);
  } catch {
    return null;
  }
}
function writeStored(key: string, url: string) {
  try {
    const idxKey = STORE_PREFIX + 'index';
    const idx: string[] = JSON.parse(localStorage.getItem(idxKey) ?? '[]').filter((k: string) => k !== key);
    idx.push(key);
    while (idx.length > MAX_STORED) localStorage.removeItem(STORE_PREFIX + idx.shift());
    localStorage.setItem(STORE_PREFIX + key, url);
    localStorage.setItem(idxKey, JSON.stringify(idx));
  } catch { /* storage full or blocked: memory cache still works */ }
}

function render(key: string, classId: string, gear: string[]): Promise<string | null> {
  const existing = pending.get(key);
  if (existing) return existing;
  worker ??= new Worker(new URL('./sprite-worker.ts', import.meta.url), { type: 'module' });
  const w = worker;
  const p = new Promise<string | null>((resolve) => {
    const onMsg = (e: MessageEvent<{ key: string; url?: string; error?: string }>) => {
      if (e.data.key !== key) return;
      w.removeEventListener('message', onMsg);
      pending.delete(key);
      if (e.data.url) {
        memory.set(key, e.data.url);
        writeStored(key, e.data.url);
        resolve(e.data.url);
      } else resolve(null);
    };
    w.addEventListener('message', onMsg);
    w.postMessage({ key, look: heroLook(classId, gear) });
  });
  pending.set(key, p);
  return p;
}

/** Sprite URL for a hero wearing `gear`. Falls back to the class strip until ready. */
export function useHeroSprite(classId: string, gear: string[] | undefined): { url: string; ready: boolean } {
  const key = gear ? heroKey(classId, gear) : '';
  const cached = () => (key ? memory.get(key) ?? readStored(key) : null);
  const [url, setUrl] = useState<string | null>(cached);
  useEffect(() => {
    if (!gear) return;
    const hit = cached();
    if (hit) {
      memory.set(key, hit);
      setUrl(hit);
      return;
    }
    setUrl(null);
    let alive = true;
    render(key, classId, gear).then((u) => alive && u && setUrl(u));
    return () => void (alive = false);
  }, [key]);
  return { url: url ?? `./sprites/${classId}.png`, ready: !!url };
}
