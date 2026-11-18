// Plays the core loop by tapping the real UI from an empty save, like a new player:
// camp -> one quest per stat (calibration runs, quizzes, timers, reflections) ->
// reward -> back to camp -> boss fight -> camp after a reload.
//   npm run loop [-- <rounds>]      (rounds of 6 quests, default 1)
// Own Vite server on 127.0.0.1:5175, installed Chrome headless, throwaway profile,
// fake clock (timers and fights fast-forward). Screenshots every step at 375x812
// into out/loop/ and fails on page errors or a screen with nothing to tap.
import { mkdirSync, rmSync } from 'node:fs';
import { chromium, type Page } from 'playwright-core';
import { createServer } from 'vite';

const rounds = Number(process.argv[2] ?? 1);
const PORT = 5175;
const OUT = 'out/loop';
const KEY = 'life-rpg:save:v1';

const server = await createServer({ server: { host: '127.0.0.1', port: PORT, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors: string[] = [];
const log: string[] = [];
let shot = 0;

async function snap(page: Page, label: string) {
  const file = `${OUT}/${String(++shot).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' }); // finish CSS transitions (the fake clock holds them)
}

async function tap(page: Page, name: string | RegExp, label = String(name)) {
  const b = page.getByRole('button', { name, exact: typeof name === 'string' }).first();
  if (!(await b.isVisible().catch(() => false)) || !(await b.isEnabled().catch(() => false))) return false;
  await b.click();
  await page.clock.runFor(400);
  log.push(`  tap ${label}`);
  return true;
}

// One quest, start to reward. Taps whatever the current step offers, in this order.
async function playQuest(page: Page, stat: string) {
  const title = (await page.locator('h2').first().textContent().catch(() => '')) ?? '';
  log.push(`quest ${stat}: ${title.trim()}`);
  await snap(page, `${stat}-brief`);
  let bumped = false;
  for (let step = 0; step < 80; step++) {
    if (await page.getByRole('button', { name: 'Back to camp', exact: true }).isVisible().catch(() => false)) {
      const xp = (await page.locator('.big-number').first().textContent().catch(() => '')) ?? '';
      log.push(`  reward ${xp.trim()}`);
      await snap(page, `${stat}-reward`);
      return tap(page, 'Back to camp');
    }
    if (!bumped && (await tap(page, '+10'))) { bumped = true; continue; }
    const option = page.locator('.btn.option').first();
    if ((await option.isVisible().catch(() => false)) && !(await page.locator('.btn.option.right').count())) {
      await option.click();
      await page.clock.runFor(400);
      log.push('  tap quiz option');
      continue;
    }
    let acted = false;
    for (const n of ['Begin', 'Start', "I'm ready", 'Done', 'Done reflecting', 'Next', 'Finish']) {
      if (await tap(page, n)) { acted = true; break; }
    }
    if (acted) continue;
    // Rating step (the brief also has a "Just right" difficulty chip, but Begin wins there).
    if (await tap(page, 'Just right')) continue;
    // Timers, holds and breathing run on the clock: skip ahead, then Stop if offered.
    await page.clock.runFor(15_000);
    if (await tap(page, 'Stop')) continue;
  }
  await snap(page, `${stat}-stuck`);
  errors.push(`stuck in ${stat} quest "${title.trim()}" (see ${OUT})`);
  return false;
}

try {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  await page.clock.install();
  const base = `http://127.0.0.1:${PORT}/`;
  await page.goto(base);
  await page.clock.runFor(1000);
  await snap(page, 'camp-first-open');

  for (let r = 0; r < rounds; r++) {
    const tiles = await page.locator('.stat-tile').count();
    if (!tiles) errors.push('camp shows no stat tiles');
    for (let i = 0; i < tiles; i++) {
      const tile = page.locator('.stat-tile').nth(i);
      const stat = ((await tile.getAttribute('aria-label')) ?? `stat${i}`).split(' ')[0];
      await tile.click();
      await page.clock.runFor(400);
      if (!(await playQuest(page, stat))) break;
    }
  }
  await snap(page, 'camp-after-quests');

  if (await tap(page, /Fight$/, 'Fight (camp)')) {
    await snap(page, 'boss-intro');
    if (await tap(page, /Fight!/, 'Fight!')) {
      await tap(page, 'Speed up');
      let over = false;
      for (let t = 0; t < 400 && !over; t++) {
        await page.clock.runFor(1000);
        over = await page.getByRole('button', { name: 'Back to camp', exact: true }).isVisible().catch(() => false);
      }
      await snap(page, 'boss-result');
      if (!over) errors.push('boss fight never ended (400 s of game clock)');
      else {
        const result = (await page.locator('h1').last().textContent().catch(() => '')) ?? '';
        log.push(`boss: ${result.trim()}`);
        await tap(page, 'Back to camp');
      }
    } else errors.push('boss screen has no Fight! button');
  } else log.push('no Fight button at camp (boss not available yet)');

  // Look picker: change hair, hair color and skin on the Hero screen; the hero must redraw
  // from a recolored layered strip (a blob: URL) and the look must survive the reload.
  const heroBg = () => page.locator('.hero-stand [style*="background-image"]').first().evaluate((e) => (e as HTMLElement).style.backgroundImage).catch(() => '');
  await page.goto(`${base}#gear`);
  await page.clock.runFor(1000);
  if (await tap(page, 'Change look')) {
    const picks = ['Long', 'Red', 'Deep'];
    for (const p of picks) if (!(await tap(page, p))) errors.push(`look picker has no "${p}" button`);
    await page.clock.runFor(1000);
    await snap(page, 'hero-look-changed');
    if (!(await heroBg()).includes('blob:')) errors.push('hero did not redraw from a layered strip after a look change');
    log.push(`look: ${picks.join(', ')}`);
  } else errors.push('Hero screen has no Change look button');

  const events = await page.evaluate((k) => (JSON.parse(localStorage.getItem(k) ?? '{}').events ?? []).length, KEY);
  await page.reload();
  await page.clock.runFor(1000);
  if (await tap(page, 'Change look')) {
    for (const p of ['Long', 'Red', 'Deep']) {
      const on = await page.getByRole('button', { name: p, exact: true }).first().getAttribute('aria-pressed').catch(() => null);
      if (on !== 'true') errors.push(`look "${p}" not kept after reload`);
    }
    await snap(page, 'hero-after-reload');
  }
  await page.goto(base);
  await page.clock.runFor(1000);
  await snap(page, 'camp-after-reload');
  log.push(`save: ${events} events, survives reload`);
  if (!events) errors.push('nothing was saved');
} finally {
  await browser.close();
  await server.close();
}
console.log(log.join('\n'));
console.log(`screens: ${OUT}/ (${shot})`);
if (errors.length) {
  console.error(`\nFAIL\n${errors.join('\n')}`);
  process.exit(1);
}
console.log('\nPASS: loop played end to end');
