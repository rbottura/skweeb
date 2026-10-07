#!/usr/bin/env node
/**
 * scripts/check-page.mjs — M11's last brick in Chrome, its *Done when* as a
 * command: the live stack saved as a page of smart objects that follows its
 * windows (core/stackSave.js; compose's opacity and blend).
 *
 *   node scripts/check-page.mjs
 *
 * Particles sent to filter with no tab or address; in filter's drawer a
 * drawing from the vault goes under it, and filter's layer is given 0.7 and
 * screen. *Save the stack as a page*: filter saves itself as a smart object
 * — particles first, as one too — and the page is a composition placing the
 * drawing and, over it, filter's smart object at 0.7 and screen. Opened in
 * compose, the filter's placement has its opacity and blend in its rows.
 * Particles changed and saved: its smart object's version 2, and the page
 * in compose is drawn again. And no page said anything wrong. Needs WebGPU.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const layerRow = name => `[...document.querySelectorAll('.pp-stack-layer .pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const stackButton = label => `[...document.querySelectorAll('.pp-stack-btn')].find(b => b.textContent === ${JSON.stringify(label)})`;
const barSay = `(document.querySelector('.bar-say')?.textContent || '')`;
const said = `(document.querySelector('.pp-stack-said')?.textContent || '')`;
const envelope = async id => (await fetch(c.base + '/api/vault/' + id)).json();
const index = async () => ((await (await fetch(c.base + '/api/vault')).json()).objects || []);

await c.go(c.base + '/apps/particles/');
await page.until(`!!${stackButton('Send to ▸ filter')}`, { timeout: 20000 });
if (!(await page.eval(`(async () => !!(navigator.gpu && await navigator.gpu.requestAdapter()))()`))) {
  console.log('     no WebGPU here: filter draws nothing, and the page goes unchecked');
  await c.finish();
}

// Particles to filter, no tab, no address.
const at = await page.eval(`(() => { const b = ${stackButton('Send to ▸ filter')}; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
await page.pointer(at);
const filter = await c.found(url => url.includes('/apps/filter/?live='), { timeout: 15000 });
await filter.until(`${barSay}.includes('the particles window, live')`, { timeout: 30000 });

// A drawing from the vault under filter; filter's layer at 0.7 and screen.
const drawing = (await index()).find(o => o.type === 'still' && o.origin && o.origin.app === 'gamepad' && !(o.tags || []).includes('leaf'));
await filter.click(stackButton('＋ from the vault…'));
await filter.until(`document.querySelectorAll('.vp--visible .vp-use').length > 0`, { timeout: 15000 });
await filter.eval(`(() => { const want = ${JSON.stringify(drawing ? drawing.render.w + '×' + drawing.render.h : '')};
  const cell = [...document.querySelectorAll('.vp--visible .vp-cell')].find(c => want && (c.querySelector('.vp-sub')?.textContent || '').includes(want));
  (cell || document.querySelector('.vp--visible .vp-cell')).querySelector('.vp-use').click(); })()`);
await filter.until(`document.querySelectorAll('.pp-stack-row').length === 2`, { timeout: 10000 });
await filter.typeInto(`${layerRow('opacity')}?.querySelector('.pp-num')`, '0.7');
await filter.eval(`(() => { const s = ${layerRow('blend')}?.querySelector('select'); s.value = 'screen'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await wait(500);

// Saved as a page: every window a smart object.
const before = new Set((await index()).map(o => o.id));
await filter.click(stackButton('Save the stack as a page'));
await filter.until(`/^saved |not saved/.test(${said})`, { timeout: 120000 }).catch(() => {});
const fresh = (await index()).filter(o => !before.has(o.id));
const made = fresh.find(o => o.type === 'composition');
const recipe = made ? (await envelope(made.id)).recipe : null;
const top = recipe && recipe.place[1];
const topSkw = top ? await envelope(top.ref) : null;
c.ok('the stack saved as a page: the drawing, and over it filter as a smart object', !!recipe && recipe.place.length === 2
  && recipe.place[0].ref === (drawing && drawing.id) && !!topSkw && topSkw.type === 'skw' && topSkw.recipe.app === 'filter',
  `${await filter.eval(said)} · ${recipe ? JSON.stringify(recipe.place.map(b => b.ref)) : ''}`);
c.ok('…at 0.7 and screen, as the stack had it', !!top && top.opacity === 0.7 && top.blend === 'screen', JSON.stringify(top));
const particlesSkw = topSkw && topSkw.recipe.recipe.source;
c.ok('…filter\'s source a smart object too, saved first in particles\' window', typeof particlesSkw === 'string' && particlesSkw.startsWith('skw_')
  && (await envelope(particlesSkw)).recipe.app === 'particles', String(particlesSkw));

// Opened in compose: the filter's placement keeps its opacity and blend.
const compose = await c.tab(c.base + '/apps/compose/?open=' + made.id);
await compose.until(`document.querySelectorAll('#place-side .pl-row').length === 2`, { timeout: 60000 }).catch(() => {});
let rows = null;
for (const i of [0, 1]) {
  await compose.click(`[...document.querySelectorAll('#place-side .pl-row')][${i}]`);
  await wait(500);
  rows = await compose.eval(`[${row('opacity')}?.querySelector('.pp-num')?.value, ${row('blend')}?.querySelector('select')?.value]`);
  if (rows[1] === 'screen') break;
}
c.ok('opened in compose, the filter\'s placement has its opacity and blend in its rows', Number(rows[0]) === 0.7 && rows[1] === 'screen', JSON.stringify(rows));

// Particles changed and saved: the page follows.
await page.typeInto(`${row('a second')}?.querySelector('.pp-num')`, '199');
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))`);
await page.until(`/^saved |failed/.test(${barSay})`, { timeout: 60000 }).catch(() => {});
await compose.until(`${barSay}.includes('drawn again, version 2')`, { timeout: 30000 }).catch(() => {});
c.ok('particles changed and saved: version 2, and the page in compose drawn again', (await envelope(particlesSkw)).version === 2
  && (await compose.eval(barSay)).includes('drawn again, version 2'), `${await compose.eval(barSay)} · v${(await envelope(particlesSkw)).version}`);
await compose.screenshot(c.dir + '/shots/page-in-compose.png');

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
