#!/usr/bin/env node
/**
 * scripts/check-graph.mjs — S7a in Chrome: an object's states as a graph over
 * the page (core/shell/graph.js, core/shell/layout.js).
 *
 *   node scripts/check-graph.mjs
 *
 * In particles: nothing saved, H opens nothing. Saved twice, H opens the
 * graph, two states, the second above the first, a wire between. Hovered,
 * the first is what the page draws, and left, the page is itself again.
 * Clicked, the page goes back to it and holds it: changed and saved, the new
 * state is a branch from it, in a column of its own. Escape closes the graph.
 * No page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = key => `document.querySelector('.pp-row[data-key="${key}"]')`;
const rate = () => page.eval(`+${row('rate')}.querySelector('.pp-num').value`);
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const tapH = () => page.eval(`(() => { for (const t of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(t, { code: 'KeyH', key: 'h', bubbles: true })); })()`);
const save = async () => {
  await page.eval(`document.querySelector('.bar-say').textContent = ''`);
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))`);
  await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
  await wait(300);
};
const nodes = () => page.eval(`[...document.querySelectorAll('skw-graph .gr-node')].map(n => ({ v: n.querySelector('.gr-v').textContent,
  x: parseFloat(n.style.left), y: parseFloat(n.style.top) }))`);
const node = v => `[...document.querySelectorAll('skw-graph .gr-node')].find(n => n.querySelector('.gr-v').textContent.startsWith('v${v}'))`;

await c.go(c.base + '/apps/particles/');
await page.until(`!!${row('rate')}`);

await tapH();
await wait(300);
c.ok('nothing saved: H opens nothing', !(await page.eval(`!!document.querySelector('skw-graph')`)));

await save();
await page.typeInto(`${row('rate')}.querySelector('.pp-num')`, '150');
await save();
await tapH();
await page.until(`document.querySelectorAll('skw-graph .gr-node').length === 2`, { timeout: 15000 }).catch(() => {});
const two = await nodes();
const wires = await page.eval(`document.querySelectorAll('skw-graph .gr-wire').length`);
c.ok('saved twice, H opens the graph: two states, the second above the first, wired', two.length === 2
  && two[1].y < two[0].y && two[0].x === two[1].x && wires === 1, JSON.stringify({ two, wires }));

// Hovered, the first state is what the page draws; left, the page is itself again.
await page.eval(`${node(1)}.dispatchEvent(new PointerEvent('pointerenter'))`);
await page.until(`+${row('rate')}.querySelector('.pp-num').value === 90`, { timeout: 10000 }).catch(() => {});
const hovered = await rate();
await page.eval(`${node(1)}.dispatchEvent(new PointerEvent('pointerleave'))`);
await wait(300);
c.ok('hovered, a state is what the page draws; left, the page is itself again', hovered === 90 && (await rate()) === 150, `${hovered}, then ${await rate()}`);

// Clicked: back to it, held; changed and saved, a branch from it.
await page.click(node(1));
await wait(400);
const held = await page.eval(`import('/core/vault.js').then(m => m.Vault.bound)`);
c.ok('clicked, the page goes back to it and holds it', (await rate()) === 90 && held.version === 1
  && !(await page.eval(`!!document.querySelector('skw-graph')`)), JSON.stringify({ rate: await rate(), held }));
await page.typeInto(`${row('rate')}.querySelector('.pp-num')`, '120');
await save();
await tapH();
await page.until(`document.querySelectorAll('skw-graph .gr-node').length === 3`, { timeout: 15000 }).catch(() => {});
const three = await nodes();
const at = v => three.find(n => n.v.startsWith('v' + v));
c.ok('saved, the new state is a branch from it, in a column of its own', three.length === 3 && at(3).x !== at(2).x
  && at(3).y === at(2).y && at(3).y < at(1).y, JSON.stringify(three));

await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
await wait(200);
c.ok('Escape closes it', !(await page.eval(`!!document.querySelector('skw-graph')`)));

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
