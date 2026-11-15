// Phone-size screenshots of the app's main screens, with a realistic save.
//   npm run shots [-- <days> [route,route,...]]
// Starts its own Vite dev server on 127.0.0.1:5174, opens the installed Chrome
// headless with a throwaway profile (never the real save), fast-forwards a
// season through the game's own simulator (app/state/fastforward.ts), then
// screenshots each route at 375x812 (2x) into out/shots/. Prints any page errors.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const days = Number(process.argv[2] ?? 30);
const routes = (process.argv[3] ?? '/,gear,boss,season,relics,menu,help').split(',');
const PORT = 5174;

const server = await createServer({ server: { host: '127.0.0.1', port: PORT, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors: string[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  const base = `http://127.0.0.1:${PORT}/`;
  await page.goto(base);
  // Same module URL as the app, so this drives the app's own store.
  const summary = await page.evaluate(async (d) => {
    const ff = await import('/app/state/fastforward.ts');
    const r = ff.fastForward({ style: 'daily', days: d, autoFight: true, seed: 7 });
    return `${r.daysPlayed} days, ${r.quests} quests, classes: ${r.classesPicked.join(', ') || 'none'}`;
  }, days);
  console.log(`save: ${summary}`);
  mkdirSync('out/shots', { recursive: true });
  for (const r of routes) {
    await page.goto(`${base}#/${r === '/' ? '' : r}`);
    await page.reload(); // re-read the save from storage
    await page.waitForTimeout(700); // sprites load, idle animation settles
    const file = `out/shots/${r === '/' ? 'home' : r}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
  }
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
