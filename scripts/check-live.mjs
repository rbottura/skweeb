#!/usr/bin/env node
/**
 * scripts/check-live.mjs — M11 in Chrome: the windows of the suite open in
 * one browser, and the stack they share (core/live.js, core/stack.js).
 *
 *   node scripts/check-live.mjs
 *
 * Particles in one tab, filter in another. Each window's Stack drawer knows
 * the other — a button to put it on the stack, saying what it has on screen
 * — and a rate changed in particles reaches a window listening in filter's
 * tab within a second. In filter, particles put on the stack goes under the
 * filter's own layer, the page its size; particles' drawer shows the same
 * stack. An opacity and a blend set in filter are particles' too; a layer
 * moved down in particles is down in filter; something from the vault goes
 * on top in both, and off in both. The gamepad, which has no drawer, is a
 * window the others can stack; a tab closed takes its layer off every
 * stack. Served as plain files with no vault, an app's drawer says it is
 * alone (rule 7). And no page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const note = `(document.querySelector('.pp-stack-note')?.textContent || '')`;
const adds = `[...document.querySelectorAll('.pp-stack-adds .pp-stack-btn')].map(b => b.textContent)`;
const adder = label => `[...document.querySelectorAll('.pp-stack-adds .pp-stack-btn')].find(b => b.textContent === ${JSON.stringify(label)})`;
const order = `[...document.querySelectorAll('.pp-stack-row')].map(r => r.dataset.app + (r.classList.contains('pp-stack-row--chosen') ? '*' : ''))`;
const rowOf = app => `[...document.querySelectorAll('.pp-stack-row')].find(r => r.dataset.app === ${JSON.stringify(app)})`;
const layerRow = name => `[...document.querySelectorAll('.pp-stack-layer .pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const row = name => `[...document.querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;

// ── Windows that know each other ────────────────────────────────────────────

await c.go(c.base + '/apps/particles/');
await page.until(`!!document.querySelector('.pp-stack-adds .pp-stack-btn')`, { timeout: 20000 });
c.ok('particles alone: its drawer says so, nothing stacked yet', (await page.eval(note)) === 'Alone in this browser · nothing stacked yet'
  && JSON.stringify(await page.eval(adds)) === '["＋ this window","＋ from the vault…"]', `${await page.eval(note)} ${JSON.stringify(await page.eval(adds))}`);

const filter = await c.tab(c.base + '/apps/filter/');
await filter.until(`(${adds}).includes('＋ particles')`, { timeout: 20000 });
await page.until(`(${adds}).includes('＋ filter')`, { timeout: 10000 });
c.ok('a second window: each has a button to stack the other', (await filter.eval(note)).startsWith('2 windows open in this browser')
  && (await page.eval(adds)).includes('＋ filter'), `${await filter.eval(note)} · ${JSON.stringify(await page.eval(adds))}`);
c.ok('…saying what it has on screen: particles its still, filter why it has none', /^still · \d+ × \d+$/.test(await filter.eval(`${adder('＋ particles')}.title`))
  && (await page.eval(`${adder('＋ filter')}.title`)) === 'nothing on screen', `${await filter.eval(`${adder('＋ particles')}.title`)} · ${await page.eval(`${adder('＋ filter')}.title`)}`);

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

// ── The stack they share ────────────────────────────────────────────────────

await filter.click(adder('＋ particles'));
await page.until(`document.querySelectorAll('.pp-stack-row').length === 2`, { timeout: 5000 }).catch(() => {});
c.ok('in filter, particles on the stack: the filter\'s own layer over it, chosen', JSON.stringify(await filter.eval(order)) === '["filter*","particles"]',
  JSON.stringify(await filter.eval(order)));
c.ok('…and particles has the same stack, on a page its own size', JSON.stringify((await page.eval(order)).map(a => a.replace('*', ''))) === '["filter","particles"]'
  && /the stack's page \d+ × \d+$/.test(await page.eval(note)), `${JSON.stringify(await page.eval(order))} · ${await page.eval(note)}`);

await filter.typeInto(`${layerRow('opacity')}?.querySelector('.pp-num')`, '0.4');
await filter.eval(`(() => { const s = ${layerRow('blend')}?.querySelector('select'); s.value = 'multiply'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await page.click(rowOf('filter'));
await page.until(`${layerRow('blend')}?.querySelector('select')?.value === 'multiply'`, { timeout: 5000 }).catch(() => {});
const there = await page.eval(`[${layerRow('opacity')}?.querySelector('.pp-num')?.value, ${layerRow('blend')}?.querySelector('select')?.value]`);
c.ok('an opacity and a blend set in filter are the stack\'s in particles', Number(there[0]) === 0.4 && there[1] === 'multiply', JSON.stringify(there));

await page.click(`${rowOf('filter')}?.querySelector('[title="down the stack"]')`);
await filter.until(`(${order}).map(a => a.replace('*', '')).join() === 'particles,filter'`, { timeout: 5000 }).catch(() => {});
c.ok('a layer moved down in particles is down in filter', (await filter.eval(order)).map(a => a.replace('*', '')).join() === 'particles,filter',
  JSON.stringify(await filter.eval(order)));

await page.click(adder('＋ from the vault…'));
await page.until(`document.querySelectorAll('.vp--visible .vp-use').length > 0`, { timeout: 15000 });
await page.click(`document.querySelector('.vp--visible .vp-use')`);
await filter.until(`(${order}).length === 3`, { timeout: 5000 }).catch(() => {});
c.ok('something from the vault goes on top, in both', (await filter.eval(order))[0].startsWith('vault') && (await page.eval(order))[0].startsWith('vault'),
  `${JSON.stringify(await filter.eval(order))} · ${await filter.eval(`${rowOf('vault')}?.querySelector('.pp-stack-app')?.textContent`)}`);
await filter.click(`${rowOf('vault')}?.querySelector('[title="off the stack"]')`);
await page.until(`(${order}).length === 2`, { timeout: 5000 }).catch(() => {});
c.ok('…and off, in both', (await page.eval(order)).length === 2 && (await filter.eval(order)).length === 2, JSON.stringify(await page.eval(order)));

// ── The gamepad, and windows that go ────────────────────────────────────────

const gamepad = await c.tab(c.base + '/apps/gamepad/');
await gamepad.until(`!!document.querySelector('.bsel-card')`, { timeout: 20000 });
await gamepad.eval(`(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Clear All')?.click();
  [...document.querySelectorAll('.bsel-card')].find(c => c.textContent.trim().startsWith('brushes'))?.click();
  document.querySelector('#bsel-launch')?.click();
})()`);
await page.until(`${adder('＋ gamepad')}?.title === 'nothing drawn yet'`, { timeout: 20000 }).catch(() => {});
c.ok('the gamepad, with no drawer, is a window the others can stack', (await page.eval(`${adder('＋ gamepad')}?.title`)) === 'nothing drawn yet',
  JSON.stringify(await page.eval(adds)));

await gamepad.closeTab();
await filter.closeTab();
await page.until(`(${order}).length === 1`, { timeout: 10000 }).catch(() => {});
c.ok('the tabs closed: the filter\'s layer is off the stack, particles alone', (await page.eval(order)).join() === 'particles*'
  && (await page.eval(note)).startsWith('Alone in this browser'), `${JSON.stringify(await page.eval(order))} · ${await page.eval(note)}`);
await c.shot('01-alone-again');

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));

// Rule 7: no vault, no other window — past the console's check, as a page with no vault says so.
await c.go(c.plain + '/apps/map/');
await page.until(`!!document.querySelector('.pp-stack-adds .pp-stack-btn')`, { timeout: 20000 }).catch(() => {});
c.ok('with no vault, an app opens and its drawer says it is alone', (await page.eval(note)) === 'Alone in this browser · nothing stacked yet',
  await page.eval(note));
await c.finish();
