#!/usr/bin/env node
/**
 * check-params-copy.mjs — S15d: values copied from one shape and pasted onto
 * another, by level (core/params-copy.js), in the 3D app.
 *
 * A section copied from the box by its menu — a right click on its head —
 * and pasted onto the torus by Ctrl V, asked first, Enter: every value of it,
 * a default too, the torus's rows flashing; Ctrl Z takes the paste back as one
 * step. A row copied by Ctrl C over it and pasted by the sphere's menu; every
 * value of the box onto the sphere, only what the sphere has.
 *
 * And the keys in their contexts (S15i), pressed on the page as a hand does —
 * through the document, where every app hears its own: Ctrl V is not V, the
 * vault stays shut; Ctrl S is the app's save, once, and never the browser's;
 * V alone still opens the vault.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
// Down through the document, as a key a hand presses: the app's own keys hear it there.
const press = (k, ctrlKey = false) => page.eval(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}',
  code: '${/^[a-z]$/.test(k) ? 'Key' + k.toUpperCase() : k}', ctrlKey: ${ctrlKey}, bubbles: true, cancelable: true }))`);
const ctrl = k => press(k, true);
const key = k => press(k);
const vaultOpen = () => page.eval(`!!document.querySelector('.vp--visible')`);
const card = name => `[...document.querySelectorAll('.pp-card')].find(c => !c.parentElement.closest('.pp-card') && c.querySelector('.pp-title').textContent === '${name}')`;
const values = name => page.eval(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(${card(name)}.querySelector('.pp-row[data-key]')).params.values)`);
const choose = i => page.click(`document.querySelectorAll('.pp-cards-line')[${i}]`);
const menuItems = () => page.eval(`[...document.querySelectorAll('.pc-menu-item')].map(b => b.textContent + (b.disabled ? ' (off)' : ''))`);
const menuOn = el => page.eval(`(() => { const t = ${el}; const r = t.getBoundingClientRect();
  t.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 10, clientY: r.top + 5 })); })()`);
const pick = words => page.click(`[...document.querySelectorAll('.pc-menu-item')].find(b => b.textContent.startsWith(${JSON.stringify(words)}))`);

await c.go(c.base + '/apps/3d/');
await page.until(`document.querySelectorAll('.pp-cards-line').length === 3`, { timeout: 30000 });
await wait(800);

// ── Ctrl V with nothing copied: not V — no vault (S15i) ─────────────────────
await ctrl('v');
await wait(250);
c.ok('Ctrl V with nothing copied: no vault, no question — Ctrl V is not V', !(await vaultOpen())
  && await page.eval(`!document.querySelector('.pc-prompt')`));

// ── A section, by its menu; pasted by Ctrl V, asked, Enter ───────────────────
await choose(0);
await wait(200);
await page.eval(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(${card('box')}.querySelector('.pp-row[data-key]')).params.set({ x: -2.5, y: 0.75 }))`);
const placeHead = `[...${card('box')}.querySelectorAll('.dr-head')].find(h => /^Place/.test(h.textContent))`;
await menuOn(placeHead);
const items = await menuItems();
c.ok('a right click on a section\'s head: its copy, and every value\'s', items.some(t => /^Copy Place \(\d+\)$/.test(t)) && items.some(t => /^Copy every value \(\d+\)$/.test(t)) && !items.some(t => t.startsWith('Paste')), JSON.stringify(items));
await pick('Copy Place');
const box = await values('box');
await choose(2);
await wait(200);
const before = await values('torus');
await ctrl('v');
await wait(150);
await c.shot('asked');
const asked = await page.eval(`document.querySelector('.pc-prompt')?.textContent || ''`);
c.ok('Ctrl V asks first, over the chosen card: what, from where, onto what — and no vault', /^Paste Place of box onto torus — \d+ values/.test(asked)
  && /Enter$/.test(asked) && !(await vaultOpen()), asked);
const still = await values('torus');
await key('Enter');
await wait(100);
const after = await values('torus');
const flashed = await page.eval(`${card('torus')}.querySelectorAll('.pc-row-pasted').length`);
c.ok('Enter pastes the section: every value, a default too — its turn none as the box\'s', JSON.stringify(still) === JSON.stringify(before)
  && after.x === box.x && after.y === box.y && after.turnX === box.turnX && before.turnX !== box.turnX && after.colour === before.colour, JSON.stringify({ box, after }));
c.ok('…its rows flash, its section opened', flashed >= 3 && await page.eval(`[...${card('torus')}.querySelectorAll('.dr')].find(d => /^Place/.test(d.querySelector('.dr-head').textContent)).classList.contains('dr--open')`), String(flashed));
await ctrl('z');
await wait(200);
const back = await values('torus');
c.ok('Ctrl Z takes the paste back, one step', back.x === before.x && back.turnX === before.turnX, JSON.stringify(back));

// ── A row, by Ctrl C over it; pasted by the other card's menu ───────────────
await choose(0);
await wait(200);
await page.eval(`(() => { const r = ${card('box')}.querySelector('.pp-row[data-key="colour"]'); r.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); })()`);
await ctrl('c');
await wait(100);
const said = await page.eval(`document.querySelector('.pc-said')?.textContent || ''`);
c.ok('Ctrl C over a row copies that value, and says so', /^Copied colour of box — 1 value$/.test(said), said);
await choose(1);
await wait(200);
await menuOn(`${card('sphere')}.querySelector('.pp-head')`);
const sphereItems = await menuItems();
await pick('Paste colour of box');
await wait(100);
c.ok('the sphere\'s menu pastes it: its colour the box\'s', (await values('sphere')).colour === box.colour && sphereItems.includes('Paste colour of box (1 of 1)'), JSON.stringify(sphereItems));

// ── Every value, where the other has it ─────────────────────────────────────
await menuOn(`${card('sphere')}.querySelector('.pp-head')`);
await page.eval(`document.querySelector('.pc-menu') && document.querySelector('.pc-menu').remove()`);
await choose(0);
await wait(200);
await menuOn(`${card('box')}.querySelector('.pp-head')`);
await pick('Copy every value');
await choose(1);
await wait(200);
await menuOn(`${card('sphere')}.querySelector('.pp-head')`);
const all = (await menuItems()).find(t => t.startsWith('Paste')) || '';
const [, got, of] = all.match(/\((\d+) of (\d+)\)/) || [];
c.ok('every value of the box onto the sphere: only what a sphere has — no width, no depth', +got > 5 && +got < +of, all);
await pick('Paste every value');
await wait(100);
const sphere = await values('sphere');
c.ok('…pasted: its place the box\'s, no width given it', sphere.x === box.x && !('width' in sphere), JSON.stringify(sphere));

// ── Ctrl S keeps its letter: the app's save, once, never the browser's (S15i) ──
const saves = await page.eval(`(async () => { let n = 0; document.addEventListener('vault:saved', () => n++);
  const kept = document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 's', code: 'KeyS', ctrlKey: true, bubbles: true, cancelable: true }));
  for (let i = 0; i < 150 && !n; i++) await new Promise(r => setTimeout(r, 100));
  await new Promise(r => setTimeout(r, 1500));
  return { n, prevented: !kept }; })()`);
c.ok("Ctrl S: the app's save, once — the browser's page never saved", saves.n === 1 && saves.prevented, JSON.stringify(saves));
await key('v');
await wait(400);
c.ok('V alone opens the vault, as ever', await vaultOpen());

await c.shot('params-copy');
const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
