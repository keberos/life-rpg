# Life RPG

Replace the doomscroll with short, calibrated real-life quests that power a fantasy character.

## Phone web app (phase 1 prototype)

```bash
npm run dev      # then open the Network URL it prints on your iPhone (same Wi-Fi)
npm run build    # static files in dist/, deployable to any HTTPS host
```

Screens: camp (stats, class, boss, satchel; no onboarding, the first measured quest per stat
calibrates), a page per stat (tap its bar), the Guide (`#/help`, built from game data),
equipment, quests (reps, timer, box breathing, reading and Bible study quizzes, generated
number patterns, reflections), automated boss fights with live gear/item buttons, daily check-in,
Shortcuts "scroll catcher" setup (`#/intercept`), backup/restore, and a debug panel
(time travel, XP, items, reset).

| Path | What |
| --- | --- |
| `app/content/` | Quest pack (data) and the procedural pattern generator |
| `app/state/model.ts` | Save file = profile + append-only event log; all progress is derived from the log |
| `app/state/store.ts` | localStorage persistence, export/import |
| `app/state/logic.ts` | Quest picking, completion (XP + calibration), loot |
| `app/content/legacy.ts` | Legacy starting perks; seasons, the lifetime record and mastery are derived in `model.ts` |
| `app/content/seasons.ts` | Season themes (bonus XP on two stats, from Season 2) and season goals (a class or boss to aim for) |
| `app/state/drops.ts` | Quest drops: guided first five (full common kit + 2 items), then random with bad-luck protection; rarer gear unlocks by boss tier |
| `art-kit/src/exercises.ts` | Exercise guide poses; `npm run exercises` renders them to `public/exercises/` |
| `app/art/` | Hero look from class + equipped gear, rendered by the art kit in a worker and cached, so earned gear shows on the character |
| `app/ui/` | Preact screens; `sprites.tsx` holds placeholder pixel art |

## What's here (phase 0: engine + battle simulator)

| Path | What |
| --- | --- |
| `src/engine/` | Game rules as plain TypeScript, no UI: types, XP/levels, calibration, classes, combat |
| `src/content/core-pack.ts` | All game data (classes, gear, battle items, bosses). Engine never hard-codes content |
| `src/sim/scenarios.ts` | Builds, gear loadouts and win-rate helpers shared by the sim and tests |
| `sim/simulate.ts` | Balance report: thousands of fights per cell |
| `sim/tune.ts` | Finds boss HP/attack for a target win rate |
| `test/rules.test.ts` | The design rules as tests (no lockouts, every stat helps, honor-system XP, calibration) |

## Commands

```bash
npm install
npm run sim             # balance report (add -- --log for a sample fight)
npm run tune -- 0.42    # suggest boss numbers for a 42% no-buttons win rate
npm run explain -- 2    # derived combat numbers per build vs boss #2 (why a build wins/loses)
npm test
npm run typecheck
```

Needs Node 23.6+ (runs `.ts` directly, no build step).

## Combat in one paragraph

Fights are automated and turn-based. Every stat gives some offense and some defense: STR and
AGI deal physical damage (AGI also crits and dodges, specials at half chance), INT deals
armor-piercing spell damage and starts the fight with an arcane ward, STA is HP, WIS boosts all
damage and blunts boss specials, FTH heals, smites and may revive. Each boss is weak to two
stats (they count 1.3x). Boss specials can't be interrupted by stuns. A per-fight **Fortune** roll (shown as an omen) keeps outcomes uncertain,
so better stats tilt the odds instead of deciding them. The player steps in by pressing
class abilities (each class has two, plus a signature passive; Adventurers have none), gear
actives (epic+) or scarce battle items. Classes unlock at stat thresholds and must be chosen.
