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
 * on top in both, and off in both — every row within its panel, its buttons
 * in reach, its title the whole of it (L12a). The gamepad, which has no drawer, is a
 * window the others can stack; a tab closed takes its layer off every
 * stack. Served as plain files with no vault, an app's drawer says it is
 * alone (rule 7). And no page said anything wrong.
 */

import path from 'node:path';
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

// Filter on one of its own objects, so that it has a loop on screen to stack — the newest that moves: a still
// filter saved since (the author's "thumb · glitch", 2026-11-06) has no loop to stack.
const index = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
const saved = index.filter(o => o.origin && o.origin.app === 'filter' && !(o.tags || []).some(t => t === 'trash' || t === 'leaf')
  && o.render && o.render.frames > 1).sort((a, b) => (b.created || '').localeCompare(a.created || ''))[0];
const gpu = await page.eval(`(async () => !!(navigator.gpu && await navigator.gpu.requestAdapter()))()`);
const shown = !!(saved && gpu);
const filter = await c.tab(c.base + '/apps/filter/' + (shown ? '?open=' + saved.id : ''));
await filter.until(`(${adds}).includes('＋ particles')`, { timeout: 20000 });
await page.until(`(${adds}).includes('＋ filter')`, { timeout: 10000 });
c.ok('a second window: each has a button to stack the other', (await filter.eval(note)).startsWith('2 windows open in this browser')
  && (await page.eval(adds)).includes('＋ filter'), `${await filter.eval(note)} · ${JSON.stringify(await page.eval(adds))}`);
// A playing app's layer is its loop (core/live.js `loopOf`): its frames and rate, never one frame of it.
const wantFilter = shown ? `sequence · ${saved.render.w} × ${saved.render.h} · ${saved.render.frames} frames` : 'nothing on screen';
await page.until(`${adder('＋ filter')}?.title === ${JSON.stringify(wantFilter)}`, { timeout: 20000 }).catch(() => {});
c.ok('…saying what it has on screen: particles its loop, filter its own', /^sequence · \d+ × \d+ · \d+ frames$/.test(await filter.eval(`${adder('＋ particles')}.title`))
  && (await page.eval(`${adder('＋ filter')}.title`)) === wantFilter, `${await filter.eval(`${adder('＋ particles')}.title`)} · ${await page.eval(`${adder('＋ filter')}.title`)}`);

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

// Particles with no ground: ink on nothing, as a layer over another is meant to be — an opaque
// ground hides what is under it, in a stack as on a page.
await page.click(`${row('ground')}?.querySelector('.pp-chip')`);

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
// Every row within its panel and its buttons in reach, however long what it says (L12a, 2026-11-12): a
// window's size and frames, or a title, once pushed ▲ ▼ × past the panel's edge. What is cut, its title says.
const fits = `(() => { const side = document.querySelector('.pp-stack').closest('.pp').getBoundingClientRect();
  return [...document.querySelectorAll('.pp-stack-row')].map(r => { const b = r.getBoundingClientRect();
    const out = [...r.querySelectorAll('button')].filter(x => { const q = x.getBoundingClientRect();
      return !(q.width > 0 && q.left >= b.left - 0.5 && q.right <= b.right + 0.5); }).length;
    return { app: r.dataset.app, w: Math.round(b.width), side: Math.round(side.width), past: Math.round(b.right - side.right), out }; }); })()`;
for (const [name, tab] of [['particles', page], ['filter', filter]]) {
  const rows = await tab.eval(fits);
  c.ok(`in ${name}, every row within the panel, its buttons in reach`, rows.length === 3 && rows.every(r => r.past <= 0 && !r.out), JSON.stringify(rows));
}
c.ok('…and a row says the whole of it in its title', /^particles — sequence · \d+ × \d+ · \d+ frames$/.test(await filter.eval(`${rowOf('particles')}?.title`)),
  await filter.eval(`${rowOf('particles')}?.title`));
await filter.click(`${rowOf('vault')}?.querySelector('[title="off the stack"]')`);
await page.until(`(${order}).length === 2`, { timeout: 5000 }).catch(() => {});
c.ok('…and off, in both', (await page.eval(order)).length === 2 && (await filter.eval(order)).length === 2, JSON.stringify(await page.eval(order)));

// ── Drawn round each window's own canvas ────────────────────────────────────

/** How much of a canvas is drawn on, and a sum of what is there: another when it moves. */
const inked = sel => `(() => { const c = ${sel}; if (!c || !c.width) return null;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0, sum = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i]) { n++; sum = (sum + d[i - 3] * 7 + d[i - 2] * 3 + d[i - 1] + i) % 1000003; }
  return { share: +(n / (d.length / 4)).toFixed(4), sum }; })()`;
const layerAt = z => `[...document.querySelectorAll('.viewer-stage canvas.stack-layer')].find(c => c.style.zIndex === '${z}' && !c.hidden)`;
const ownStyle = `(() => { const s = document.getElementById('stage').style; return [s.opacity, s.mixBlendMode, document.querySelectorAll('.stack-layer').length]; })()`;
if (shown) {
  // The stack now, bottom first: filter, at 0.4 and multiply; particles over it.
  await page.until(`(${inked(layerAt(0))})?.share > 0.01`, { timeout: 30000 }).catch(() => {});
  const a = await page.eval(inked(layerAt(0)));
  await wait(500);
  const b = await page.eval(inked(layerAt(0)));
  c.ok('particles shows the filter\'s loop behind it, moving by the wall clock', !!a && a.share > 0.01 && !!b && a.sum !== b.sum,
    JSON.stringify([a, b]));
  await filter.until(`(${inked(layerAt(2))})?.share > 0.002`, { timeout: 30000 }).catch(() => {});
  const own = await filter.eval(ownStyle), over = await filter.eval(inked(layerAt(2)));
  c.ok('filter\'s own canvas carries its opacity and blend, particles drawn over it', own[0] === '0.4' && own[1] === 'multiply'
    && !!over && over.share > 0.002, `${JSON.stringify(own)} ${JSON.stringify(over)}`);
  await c.shot('02-particles-over-filter');
  await filter.screenshot(path.join(c.dir, 'shots', '03-filter-under-particles.png'));
  await filter.click(`${rowOf('filter')}?.querySelector('[title="off the stack"]')`);
  await filter.until(`!document.querySelector('.stack-layer')`, { timeout: 5000 }).catch(() => {});
  const back = await filter.eval(ownStyle);
  c.ok('taken off the stack, filter has its page back as it was', back.join() === ',,0', JSON.stringify(back));
} else {
  console.log('     no filter object, or no WebGPU, here: the stack drawn round a canvas goes unchecked');
}

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
