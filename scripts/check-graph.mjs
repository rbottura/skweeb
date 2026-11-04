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
 * Two Shift clicked are compared, the held one receiving (S7b): a conflict
 * and a value only the held one changed; merged with the conflict taken the
 * arriving way, saved, a state with both parents. A over a state: the apps it
 * reaches, each link on that state (S7c).
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

// S7b: v3 (speed 300 on v1) and v2 (rate 150) Shift clicked — compared; merged, the page has both; saved, a state with two parents.
await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
await wait(200);
c.ok('Escape closes it', !(await page.eval(`!!document.querySelector('skw-graph')`)));
await page.typeInto(`${row('speed')}.querySelector('.pp-num')`, '300');
await save();                                          // v3 is now rate 120, speed 300 — v4, from v3
await tapH();
await page.until(`document.querySelectorAll('skw-graph .gr-node').length === 4`, { timeout: 15000 }).catch(() => {});
const shift = v => page.eval(`${node(v)}.dispatchEvent(new MouseEvent('click', { shiftKey: true, bubbles: true }))`);
await shift(4);
await shift(2);
await page.until(`document.querySelectorAll('skw-graph .gr-cmp-row').length >= 2`, { timeout: 15000 }).catch(() => {});
const cmp = await page.eval(`({ head: document.querySelector('skw-graph .gr-cmp-head').textContent,
  rows: [...document.querySelectorAll('skw-graph .gr-cmp-row')].map(r => r.querySelector('.gr-cmp-name').textContent + ':' + r.className.split('--')[1]) })`);
cmp.head = cmp.head.split(/\s+/).join(' ').trim();
// From their base, v1: both changed the rate — a conflict, v4's until v2's is picked; only v4 changed the speed — kept.
c.ok('Shift click two: compared, the held one receiving, a row for each value apart', cmp.head.startsWith('v4 receives · v2 arrives')
  && cmp.rows.includes('a second:both') && cmp.rows.includes('speed:receiving'), JSON.stringify(cmp));
await page.click(`[...document.querySelectorAll('skw-graph .gr-cmp-row')].find(r => r.querySelector('.gr-cmp-name').textContent === 'a second').querySelectorAll('button')[1]`);
await page.click(`[...document.querySelectorAll('skw-graph .gr-cmp-acts .nb-btn')].find(b => b.textContent.startsWith('Merge'))`);
await wait(300);
const both = [await rate(), +(await page.eval(`${row('speed')}.querySelector('.pp-num').value`))];
await save();
const tree = (await (await fetch(c.base + '/api/vault/' + held.id + '/states')).json()).states;
const last = tree[tree.length - 1];
c.ok('merged: the conflict picked the arriving way, the rest kept; saved, a state with both parents',
  both[0] === 150 && both[1] === 300 && last.version === 5 && last.parent === 4 && last.parent2 === 2, JSON.stringify({ both, last }));
await tapH();
await page.until(`document.querySelectorAll('skw-graph .gr-node').length === 5`, { timeout: 15000 }).catch(() => {});
c.ok('…drawn with its second wire, dashed', await page.eval(`document.querySelectorAll('skw-graph .gr-wire--merge').length`) === 1);

// S7c: A over a state — where it goes, each link on that state.
await page.eval(`${node(1)}.dispatchEvent(new PointerEvent('pointerenter'))`);
// Sent where a key goes — the page's body, up through the window — not on the window itself: there,
// the graph's catch in capture comes after core's keys, which hold A for the app's pie (core/keys.js).
await page.eval(`document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', key: 'a', bubbles: true }))`);
await page.until(`document.querySelectorAll('skw-graph .gr-gates .tb-menu-item').length >= 2`, { timeout: 15000 }).catch(() => {});
const gates = await page.eval(`[...document.querySelectorAll('skw-graph .gr-gates .tb-menu-item')].map(b => b.textContent.trim() + ' ' + b.title)`);
const goes = (words, url) => gates.some(g => g.startsWith(`${words} ↗ ${url}skw_`) && g.endsWith('@v1'));
c.ok('A over a state: the apps it reaches, each on that state', goes('Open in particles', '/apps/particles/?open=')
  && goes('Place in compose', '/apps/compose/?place='), JSON.stringify(gates));
const pie = await page.eval(`!!document.querySelector('skw-pie')`);
c.ok("…the graph's, not the app's pie", !pie);
await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
