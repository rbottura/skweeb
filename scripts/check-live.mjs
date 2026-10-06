#!/usr/bin/env node
/**
 * scripts/check-live.mjs — M11's first brick in Chrome: the windows of the
 * suite open in one browser know each other (core/live.js).
 *
 *   node scripts/check-live.mjs
 *
 * Particles in one tab, filter in another: each one's Stack drawer lists
 * both, itself first, and what the other has on screen — particles its
 * still, filter why it has nothing yet. A rate changed in particles reaches
 * a window listening in filter's tab within a second; the gamepad, which has
 * no drawer, is listed by the others; a tab closed leaves every list. Served
 * as plain files with no vault, an app's drawer says it is alone (rule 7).
 * And no page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const rows = `[...document.querySelectorAll('.pp-stack-row')].map(r => [r.dataset.app, r.querySelector('.pp-stack-what').textContent, !!r.querySelector('.pp-stack-tag')])`;
const note = `(document.querySelector('.pp-stack-note')?.textContent || '')`;
const row = name => `[...document.querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;

await c.go(c.base + '/apps/particles/');
await page.until(`document.querySelectorAll('.pp-stack-row').length === 1`, { timeout: 20000 });
c.ok('particles alone: its drawer says so, and lists itself', (await page.eval(note)).startsWith('Alone in this browser')
  && (await page.eval(rows))[0][0] === 'particles', JSON.stringify(await page.eval(rows)));

const filter = await c.tab(c.base + '/apps/filter/');
await filter.until(`document.querySelectorAll('.pp-stack-row').length === 2`, { timeout: 20000 });
await page.until(`document.querySelectorAll('.pp-stack-row').length === 2`, { timeout: 10000 });
const inFilter = await filter.eval(rows), inParticles = await page.eval(rows);
c.ok('a second window: filter lists itself first, then particles and its still', inFilter[0][0] === 'filter' && inFilter[0][2]
  && inFilter[1][0] === 'particles' && /^still · \d+ × \d+$/.test(inFilter[1][1]), JSON.stringify(inFilter));
c.ok('…and particles hears filter, and why it has nothing on screen', inParticles[1][0] === 'filter' && !inParticles[1][2]
  && inParticles[1][1] === 'nothing on screen', JSON.stringify(inParticles));
c.ok('both say how many windows are open', (await filter.eval(note)) === '2 windows of the suite open in this browser', await filter.eval(note));

// What particles has on screen, heard in filter's tab as a change is made: a window listening there.
await filter.eval(`(async () => {
  const { joinLive } = await import('/core/live.js');
  window.heard = [];
  joinLive({ app: 'listening', layer: () => null }).on(e => { if (e.window.app === 'particles' && e.window.layer) window.heard.push(e.window.layer.recipe.emit.rate); });
})()`);
await wait(800);
const before = await page.eval(`${row('a second')}?.querySelector('.pp-num')?.value`);
await page.typeInto(`${row('a second')}?.querySelector('.pp-num')`, '137');
await filter.until(`window.heard.includes(137)`, { timeout: 5000 }).catch(() => {});
c.ok('a rate changed in particles reaches another tab within a second', (await filter.eval(`window.heard`)).includes(137),
  `${before} → ${JSON.stringify(await filter.eval(`window.heard`))}`);

// The gamepad: no drawer of its own, listed in the others'.
const gamepad = await c.tab(c.base + '/apps/gamepad/');
await gamepad.until(`!!document.querySelector('.bsel-card')`, { timeout: 20000 });
await gamepad.eval(`(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Clear All')?.click();
  [...document.querySelectorAll('.bsel-card')].find(c => c.textContent.trim().startsWith('brushes'))?.click();
  document.querySelector('#bsel-launch')?.click();
})()`);
await page.until(`[...document.querySelectorAll('.pp-stack-row')].some(r => r.dataset.app === 'gamepad' && r.textContent.includes('nothing drawn yet'))`, { timeout: 20000 }).catch(() => {});
const withPad = await page.eval(rows);
c.ok('the gamepad is listed by the others, with nothing drawn yet', withPad.some(([app, what]) => app === 'gamepad' && what === 'nothing drawn yet'),
  JSON.stringify(withPad));

// A tab closed leaves every list.
await gamepad.closeTab();
await filter.closeTab();
await page.until(`document.querySelectorAll('.pp-stack-row').length === 1`, { timeout: 10000 }).catch(() => {});
c.ok('the tabs closed: particles is alone again', (await page.eval(rows)).length === 1 && (await page.eval(note)).startsWith('Alone'),
  JSON.stringify(await page.eval(rows)));
await c.shot('01-alone-again');

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));

// Rule 7: no vault, no other window — the drawer, alone; past the console's check, as a page with no vault says so.
await c.go(c.plain + '/apps/map/');
await page.until(`document.querySelectorAll('.pp-stack-row').length === 1`, { timeout: 20000 }).catch(() => {});
c.ok('with no vault, an app opens and its drawer says it is alone', (await page.eval(rows))[0]?.[0] === 'map'
  && (await page.eval(note)).startsWith('Alone') && !(await page.eval(rows))[0][1].startsWith('it could not'), JSON.stringify(await page.eval(rows)));
await c.finish();
