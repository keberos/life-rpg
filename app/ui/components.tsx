import type { ComponentChildren } from 'preact';
import type { StatId } from '../../src/engine/types.ts';
import { STAT_INFO } from '../content/quests.ts';
import { Icon } from './icons.tsx';

export function Win({ children, quiet, tone, title, class: cls }: { children: ComponentChildren; quiet?: boolean; tone?: 'danger' | 'gold'; title?: string; class?: string }) {
  return (
    <div class={`win ${quiet ? 'quiet' : ''} ${tone ?? ''} ${cls ?? ''}`} style={title ? { marginTop: '8px' } : undefined}>
      {title && <span class="win-title">{title}</span>}
      {children}
    </div>
  );
}

export function StatBar({ stat, level, progress, onClick }: { stat: StatId; level: number; progress: number; onClick?: () => void }) {
  const info = STAT_INFO[stat];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag class={`stat ${onClick ? 'tappable' : ''}`} title={info.name} onClick={onClick} aria-label={onClick ? `${info.name}, level ${level}. Tap for details` : undefined}>
      <span class="label" style={{ color: info.color }}>{info.short}</span>
      <div class="bar"><i style={{ width: `${Math.round(progress * 100)}%`, background: info.color }} /></div>
      <span class="lv">{level}</span>
    </Tag>
  );
}

export function StatChip({ stat }: { stat: StatId }) {
  const info = STAT_INFO[stat];
  return (
    <span class="chip" style={{ '--c': info.color }}><span class="dot" />{info.name}</span>
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
      {onBack ? <button class="iconbtn boxed" onClick={onBack} aria-label="Back"><Icon name="back" /></button> : <span style={{ width: '44px' }} />}
      {title && <h3>{title}</h3>}
      {right ?? <span style={{ width: '44px' }} />}
    </div>
  );
}

export const go = (route: string) => {
  location.hash = route;
};

const NAV: { route: string; label: string; icon: 'camp' | 'hero' | 'boss' | 'guide' | 'menu' }[] = [
  { route: '', label: 'Camp', icon: 'camp' },
  { route: 'gear', label: 'Hero', icon: 'hero' },
  { route: 'boss', label: 'Boss', icon: 'boss' },
  { route: 'help', label: 'Guide', icon: 'guide' },
  { route: 'menu', label: 'Menu', icon: 'menu' },
];

/** The game's bottom action bar, shown on hub screens (not mid-quest or mid-fight). */
export function BottomNav({ route }: { route: string }) {
  return (
    <nav class="nav" aria-label="Main">
      <div class="nav-inner">
        {NAV.map((n) => (
          <button key={n.route} class={route === n.route ? 'on' : ''} onClick={() => go(`#/${n.route}`)} aria-current={route === n.route ? 'page' : undefined}>
            <Icon name={n.icon} size={22} />
            {n.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
