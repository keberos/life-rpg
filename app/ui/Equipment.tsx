import { useEffect, useState } from 'preact/hooks';
import { corePack } from '../../src/content/core-pack.ts';
import type { ClassDef, GearDef, GearSlot } from '../../src/engine/types.ts';
import { SLOT_LABEL, describeActive, describeItem, describePassive, describeStats } from '../content/describe.ts';
import { GEAR_SLOTS, masteryBosses } from '../state/model.ts';
import { store, useGame } from '../state/store.ts';
import { TopBar, Win, go } from './components.tsx';
import { Hero } from './sprites.tsx';

const pct = (x: number) => `${Math.round((x - 1) * 100)}%`;
function describeClass(c: ClassDef): string {
  const p = c.passive;
  const parts = [
    p.hpMult && `+${pct(p.hpMult)} HP`,
    p.physMult && `+${pct(p.physMult)} physical damage`,
    p.spellMult && `+${pct(p.spellMult)} spell damage`,
    p.healMult && `+${pct(p.healMult)} healing`,
    p.critBonus && `+${Math.round(p.critBonus * 100)}% crit`,
    p.dodgeBonus && `+${Math.round(p.dodgeBonus * 100)}% dodge`,
  ].filter(Boolean);
  return parts.join(', ');
}

function ClassKit({ c, anyUnlocked }: { c: ClassDef; anyUnlocked: boolean }) {
  if (!c.trait && !c.abilities?.length) {
    return <span class="small-text">Base attacks and battle items only.{anyUnlocked ? '' : ' Train two stats to level 6 to unlock your first class.'}</span>;
  }
  const bonus = describeClass(c);
  return (
    <div class="stack" style={{ gap: '3px' }}>
      {c.trait && <span class="small-text"><b>{c.trait.name}</b> <span class="faint">(passive)</span>. {describePassive(c.trait)}</span>}
      {c.abilities?.map((a) => <span key={a.id} class="small-text"><b>{a.name}.</b> {describeActive(a)}</span>)}
      {bonus && <span class="faint">Also: {bonus}</span>}
    </div>
  );
}
const needs = (c: ClassDef) => Object.entries(c.requires).map(([s, v]) => `${s} ${v}`).join(', ');

function GearDetails({ g }: { g: GearDef }) {
  return (
    <div class="stack" style={{ gap: '2px' }}>
      <span class="faint">{describeStats(g)}</span>
      {g.passive && <span class="small-text"><b>{g.passive.name}.</b> {describePassive(g.passive)}</span>}
      {g.active && <span class="small-text"><b>{g.active.name}.</b> {describeActive(g.active)}</span>}
    </div>
  );
}

export function Equipment() {
  const g = useGame();
  const [open, setOpen] = useState<GearSlot | null>(null);
  const equippedIds = g.equipped.map((x) => x.id);
  const unlockedIds = new Set(g.unlocked.map((c) => c.id));
  // Remember which classes were new when the screen opened, then mark them seen.
  const [fresh] = useState(() => new Set(g.newClasses.map((c) => c.id)));
  useEffect(() => {
    if (g.newClasses.length) store.log({ type: 'seenClasses', ids: g.newClasses.map((c) => c.id) });
  }, []);

  const pick = (slot: GearSlot, gearId: string | null) => {
    store.log({ type: 'equip', slot, gearId });
    setOpen(null);
  };

  return (
    <div class="stack">
      <TopBar title="Hero" />

      <Win title={g.activeClass.name}>
        <div class="stack center" style={{ alignItems: 'center', gap: '6px' }}>
          <div class="hero-stand"><Hero classId={g.activeClass.id} scale={9} gear={equippedIds} /></div>
          <span class="lv-badge">LV {g.totalLevel}</span>
        </div>
      </Win>

      <h3>Gear</h3>
      <div class="gear-grid">
        {GEAR_SLOTS.map((slot) => {
          const worn = g.equipped.find((x) => x.slot === slot);
          const count = g.ownedGear.filter((x) => x.slot === slot).length;
          return (
            <button key={slot} class={`gear-slot ${open === slot ? 'on' : ''} ${worn ? `rarity-${worn.rarity}` : ''}`} onClick={() => setOpen(open === slot ? null : slot)}>
              <span class="faint">{SLOT_LABEL[slot]}{count > 1 ? ` · ${count}` : ''}</span>
              {worn ? <b class={`r-${worn.rarity}`}>{worn.name}</b> : <span class="empty">Empty</span>}
            </button>
          );
        })}
      </div>
      {open && (() => {
        const slot = open;
        const worn = g.equipped.find((x) => x.slot === slot);
        const owned = g.ownedGear.filter((x) => x.slot === slot);
        return (
          <Win quiet title={SLOT_LABEL[slot]}>
            <div class="stack" style={{ gap: '6px', paddingTop: '4px' }}>
              {owned.length === 0 && <span class="muted">Nothing found yet. Quests and bosses drop gear.</span>}
              {owned.map((x) => (
                <button key={x.id} class={`btn ghost option-row ${worn?.id === x.id ? 'selected' : ''}`} onClick={() => pick(slot, x.id)}>
                  <b class={`r-${x.rarity}`}>{x.name}</b> <span class="faint">· {x.rarity}{worn?.id === x.id ? ' · worn' : ''}</span>
                  <GearDetails g={x} />
                </button>
              ))}
              {owned.length > 0 && <button class={`btn ghost small ${!worn ? 'selected' : ''}`} onClick={() => pick(slot, null)}>Wear nothing here</button>}
            </div>
          </Win>
        );
      })()}

      <h3>Class</h3>
      <div class="stack" style={{ gap: '6px' }}>
        {corePack.classes.map((c) => {
          const unlocked = unlockedIds.has(c.id);
          const active = c.id === g.activeClass.id;
          return (
            <button
              key={c.id}
              class={`btn ghost option-row ${active ? 'selected' : ''}`}
              disabled={!unlocked}
              onClick={() => store.log({ type: 'chooseClass', classId: c.id })}
            >
              <span>
                <b>{c.name}</b>
                {active && <span class="faint"> · current</span>}
                {fresh.has(c.id) && <span class="new-tag"> NEW</span>}
                {!unlocked && <span class="faint"> · needs {needs(c)}</span>}
                {c.id !== 'adventurer' && g.lifetime.masteredClasses.includes(c.id) && <span class="r-rare"> · mastered</span>}
              </span>
              {unlocked && c.id !== 'adventurer' && !g.lifetime.masteredClasses.includes(c.id) && (
                <span class="faint small-text">Mastery: beat the {masteryBosses().map((b) => b.name).join(' or ')} as {c.name} to start future seasons as it.</span>
              )}
              <ClassKit c={c} anyUnlocked={g.unlocked.length > 1} />
            </button>
          );
        })}
      </div>

      <h3>Satchel</h3>
      <Win quiet>
        <div class="stack" style={{ gap: '8px' }}>
          {corePack.battleItems.filter((i) => (g.items[i.id] ?? 0) > 0).map((i) => (
            <div key={i.id} class="stack" style={{ gap: '2px' }}>
              <b>{i.name} <span class="faint">×{g.items[i.id]}</span></b>
              <span class="small-text">{describeItem(i)}</span>
            </div>
          ))}
          {!corePack.battleItems.some((i) => (g.items[i.id] ?? 0) > 0) && <span class="muted">Empty. Quests drop battle items.</span>}
          <span class="faint">Up to 3 items come with you into each boss fight.</span>
        </div>
      </Win>
    </div>
  );
}
