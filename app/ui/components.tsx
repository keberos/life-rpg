import type { ComponentChildren } from 'preact';
import type { StatId } from '../../src/engine/types.ts';
import { STAT_INFO } from '../content/quests.ts';

export function Win({ children, quiet, class: cls }: { children: ComponentChildren; quiet?: boolean; class?: string }) {
  return <div class={`win ${quiet ? 'quiet' : ''} ${cls ?? ''}`}>{children}</div>;
}

export function StatBar({ stat, level, progress }: { stat: StatId; level: number; progress: number }) {
  const info = STAT_INFO[stat];
  return (
    <div class="stat" title={info.name}>
      <span class="label" style={{ color: info.color }}>{info.short}</span>
      <div class="bar"><i style={{ width: `${Math.round(progress * 100)}%`, background: info.color }} /></div>
      <span class="lv">{level}</span>
    </div>
  );
}

export function StatChip({ stat }: { stat: StatId }) {
  const info = STAT_INFO[stat];
  return (
    <span class="chip"><span class="dot" style={{ background: info.color }} />{info.name}</span>
  );
}

export function HpBar({ value, max, color, shield = 0 }: { value: number; max: number; color: string; shield?: number }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const sh = Math.max(0, Math.min(1 - pct, shield / max));
  return (
    <div class="hpbar" role="meter" aria-valuenow={Math.round(value)} aria-valuemax={max}>
      <i style={{ width: `${pct * 100}%`, background: color }} />
      {sh > 0 && <i class="shield" style={{ left: `${pct * 100}%`, width: `${sh * 100}%` }} />}
    </div>
  );
}

export function TopBar({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ComponentChildren }) {
  return (
    <div class="topbar">
      {onBack ? <button class="iconbtn" onClick={onBack} aria-label="Back">←</button> : <span />}
      {title && <h3>{title}</h3>}
      {right ?? <span style={{ width: '44px' }} />}
    </div>
  );
}

export const go = (route: string) => {
  location.hash = route;
};
