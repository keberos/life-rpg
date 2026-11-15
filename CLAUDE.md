# Life RPG — working rules

A phone PWA (TypeScript + Preact + Vite): when you'd doomscroll, do a short real-life
quest instead; quests build 6 stats (STR AGI STA INT WIS FTH) that power a fantasy
hero who fights seasonal bosses. README.md has the file map and commands.

## How we work

- The **owner steers and judges quality**; agents build. At any taste decision (art,
  feel, wording, balance targets), show 2–3 options side by side with a recommendation
  and let the owner pick. Don't silently choose and move on.
- Don't be precious about existing work: if a new approach or tool would be better,
  say so and test it.
- Prefer existing tools and libraries over building from scratch; check first.
- Specialist agents live in `.claude/agents/` (art-pipeline, content-writer, balance,
  ship-check). The lead (main session) plans, integrates, talks to the owner and does
  every commit and push.

## Game design rules (tests in test/rules.test.ts enforce most)

- Training never costs anything; skipping a stat never locks you out.
- Honor system: quests are self-reported, never verified or punished.
- Drop-in start: no onboarding wall; the first measured quest per stat calibrates.
- Every stat helps in combat (offense and defense). Content is data
  (`src/content/`, `app/content/`); the engine never hard-codes content.
- Battle items: at most 2 held per item.

## Code

- `npm run typecheck`, `npm test` (vitest), `npm run build` must pass before a commit.
- Node runs `.ts` directly (Node 23.6+): CLIs are `node path/to/file.ts`, no build step.
- Save = localStorage event log; all progress is derived by `derive()` in
  `app/state/model.ts`. Never mutate derived state; append events.
- The app makes **no third-party requests** (fonts are bundled, no CDNs, no analytics).
- Docs ship with the code: update README.md (file table, commands) and the in-app
  Guide (`app/ui/Help.tsx`) in the same commit as the feature.
- Line endings are mixed in some files: when scripting edits, detect `\r\n` first.
  Bash heredocs eat backslashes; write patch scripts with the Write tool.

## Testing in the browser

- Dev server: `npm run dev` (port 5173). Test on **http://127.0.0.1:5173**, never
  `localhost:5173` (that origin holds the owner's real save).
- Check at phone size (375×812) for layout changes.

## Art

- Look: 16-bit JRPG battle sprites, 3/4 view facing right, ~4 heads tall, crisp
  outlines, no blending. Reference: Final Fantasy Resonance / Brave Exvius. No chibi.
- Heroes are modular: AI-painted class body strip + weapon layer stacked in CSS
  (`art-kit/src/held-gear.ts`). Strips are 8 frames of 128 px: 0–3 idle, 4–7 attack.
- No drawn shields (the Bulwark is armor; combat shields are magic barriers).
- Pipeline: art kit (pose, gear, layout) → `npm run sprites` → local SDXL paint
  (`npm run paint -- bodies`, two-pass) → `npm run paint -- compare` to show options.
  See `.claude/skills/sprite-pipeline/SKILL.md`. AI art is fine; the owner judges it.
- Motion credit: Quaternius (CC0). Keep README Credits current.

## Public repo

The repo and site are public. Nothing personal or attributable to the owner goes in:
no names, e-mails, local paths, or usage data. `npm run ship-check` runs typecheck,
tests, build and a privacy scan; a PreToolUse hook runs the scan on every `git push`
and blocks it on a hit. Owner-specific settings live in CLAUDE.local.md (git-ignored).
