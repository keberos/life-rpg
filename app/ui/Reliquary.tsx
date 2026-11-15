// Reliquary: the relics you've won. Each boss form leaves one the first time you
// beat it; two from a family unlock that family's starting perk, eight unlock Collector.
import { BOSS_FORMS } from '../../src/content/boss-forms.ts';
import { corePack } from '../../src/content/core-pack.ts';
import { COLLECTOR_RELICS, PERKS, RELICS, RELICS_PER_FAMILY_PERK, type RelicDef } from '../content/legacy.ts';
import { useGame } from '../state/store.ts';
import { TopBar, Win, go } from './components.tsx';
import { Icon } from './icons.tsx';

const FAMILY: Record<RelicDef['family'], { perk: string; color: string }> = {
  troll: { perk: 'troll-tusk', color: 'var(--stat-sta)' },
  harpy: { perk: 'harpy-plume', color: 'var(--stat-agi)' },
  warden: { perk: 'warden-lamp', color: 'var(--stat-wis)' },
  wyrm: { perk: 'wyrm-scale', color: 'var(--stat-str)' },
};

/** Where a relic comes from, in words. */
function source(r: RelicDef): string {
  const base = corePack.bosses.find((b) => b.id === r.bossId)!;
  if (r.form === 'base') return `Beat the ${base.name}`;
  const i = BOSS_FORMS[r.bossId].findIndex((f) => f.id === r.form);
  const f = BOSS_FORMS[r.bossId][i];
  return `Beat the ${f.name} (Season ${2 + i}, then every 3rd)`;
}

export function Reliquary() {
  const g = useGame();
  const held = new Set(g.lifetime.relics);
  const families = Object.keys(FAMILY) as RelicDef['family'][];
  return (
    <div class="stack">
      <TopBar onBack={() => go('#/menu')} title="Reliquary" />
      <p class="muted prose">Every boss form leaves a relic the first time you beat it. Hold {RELICS_PER_FAMILY_PERK} from the same family to unlock its starting perk, and {COLLECTOR_RELICS} in all to pick two perks each season.</p>
      <div class="goal-strip">
        <Icon name="gem" /> <b>{held.size} / {RELICS.length} relics</b>
        <span class="faint"> · Collector {Math.min(held.size, COLLECTOR_RELICS)}/{COLLECTOR_RELICS}{held.size >= COLLECTOR_RELICS ? ' unlocked' : ''}</span>
      </div>
      {families.map((fam) => {
        const list = RELICS.filter((r) => r.family === fam);
        const count = list.filter((r) => held.has(r.id)).length;
        const perk = PERKS.find((p) => p.id === FAMILY[fam].perk)!;
        const open = count >= RELICS_PER_FAMILY_PERK;
        return (
          <Win key={fam} quiet title={corePack.bosses.find((b) => b.id === list[0].bossId)!.name.split(' ').pop() + ' relics'}>
            <div class="stack" style={{ gap: '6px' }}>
              <div class="relic-grid">
                {list.map((r) => (
                  <div key={r.id} class={`relic ${held.has(r.id) ? 'got' : ''}`} style={{ '--c': FAMILY[fam].color }}>
                    <span class="relic-gem"><Icon name="gem" size={22} /></span>
                    <b>{held.has(r.id) ? r.name : '???'}</b>
                    <span class="small-text">{held.has(r.id) ? r.blurb : source(r)}</span>
                  </div>
                ))}
              </div>
              <span class={open ? 'r-rare' : 'faint'}>
                {open ? 'Unlocked: ' : `${count}/${RELICS_PER_FAMILY_PERK} for `}<b>{perk.name}</b> · {perk.effect}
              </span>
            </div>
          </Win>
        );
      })}
    </div>
  );
}
