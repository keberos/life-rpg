# Life RPG plan

Updated 2026-11-15 (relics done). Order follows "prove the whole loop first": anything that shows whether the core loop works comes before new content or art.

## Phase 1: Prove the loop in the browser

1. ✅ **Season fast-forward:** Debug panel plus `npm run season`.
2. ✅ **Pacing report:** 30 simulated seasons per play style.
3. ✅ **Tuning from what it found:**
   - Second Wind catch-up XP, so casual players can still master a class.
   - You can now hold at most 2 of each battle item.
   - Faith left as is: it's already balanced without forcing anyone to train it.
4. ✅ **Known issues fixed:**
   - The Thunder Scroll is now as useful as a potion.
   - The simulated player now actually uses the Ward Scroll.
   - The font is readable: Jersey 10 for letters and digits.

## Phase 2: Make Season 2 and later worth playing

5. ✅ **Boss variety:** each boss has 3 seasonal forms, tuned and tested.
6. ✅ **Relics and Legacy perks:** 16 relics (one per boss form) in a Reliquary; 2 per family unlock a perk (shield, dodge, softer specials, 4th battle item); 8 unlock Collector (two perks a season). Missed relics come back later.
7. ⏸️ **Maybe a daily bounty board:** 2–3 small bonus quests a day. The fast-forward runs show days already have plenty to do, so skip it unless the playtest says days feel empty.

## Phase 3: Real-life playtest (when you're ready)

8. **Install on the iPhone** and test the Shortcuts interception for real: the "reach for the scroll, get a quest" moment.
9. **In-app playtest notes** stored on the phone, with an export.
10. **Play for 2–3 weeks.**

## Phase 4: Refine from the playtest

11. **Calibration check:** are the rep and time targets right after real weeks?
12. **More content only where it wore thin.** Calf raises still have no picture.
13. **Re-tune** from real pacing versus the simulation.

## Phase 5: Revisit later

- **Hero art:** largely done (see below). Left: the Warrior's shield placement in some poses, and chainmail reads as stripes.
- **Charisma:** a possible 7th stat, deferred.
- **Native app:** Expo/TestFlight, then the Screen Time API for real blocking instead of Shortcuts.
- **Opening it to others:** content packs, setup for new players without onboarding screens, and a privacy review.

## Done along the way: the sprite overhaul

- Researched how Final Fantasy Resonance draws its sprites (`design/sprite-style-research.md`).
- New "crisp" look: 4 heads tall, a 3/4 battle angle, no halo or speckle.
- Real attack motion taken from CC0 animation clips onto our own rig.
- A 4-frame breathing idle.
- Bigger sprites that snap to whole screen pixels.
- Designed eyes matched to the reference, with hair framing the face.
- Distinct weapons, one per gear drop.
- Detailed armor and shields.
- Quiz quality pass, plus a 17-quest variety batch.

**Next up:** step 7 is a maybe (skip unless days feel empty), so the real next step is the iPhone playtest (Phase 3).
