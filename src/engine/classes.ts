import { STAT_IDS, type ClassDef, type StatBlock } from './types.ts';

/** A class is unlocked when every required stat meets its threshold. */
export function meetsClass(stats: StatBlock, cls: ClassDef): boolean {
  return STAT_IDS.every((s) => stats[s] >= (cls.requires[s] ?? 0));
}

export function unlockedClasses(stats: StatBlock, classes: ClassDef[]): ClassDef[] {
  return classes.filter((c) => meetsClass(stats, c));
}
