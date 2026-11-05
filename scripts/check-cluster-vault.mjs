#!/usr/bin/env node
/**
 * scripts/check-cluster-vault.mjs — S9g: the scene's vault, beside whatever
 * app cluster has mounted (apps/cluster/, core/VaultPanel.js).
 *
 *   node scripts/check-cluster-vault.mjs
 *
 * Still through a switch: its stylesheet the scene's, so from one app to the
 * next its padding, its columns and its cards' size are the same every
 * frame. Beside an app, the app's own objects first, then the rest, a line
 * naming each part, its cards seen moving to their new places; beside the
 * vault app, no parts. A set of exactly a folder's members inside that
 * folder, its first, across the grid. An object dragged from it: every field
 * that would take it lit — a sequence lights none of fractals' — a folded
 * section over one opening as the drag rests on its head, and a tab of the
 * properties as well; dropped, the field's value, nothing left lit. The
 * side's other views (S9f): the keys, the left hand drawn as the app has it,
 * a key lit while it is down; the history, a value changed one step in it,
 * clicked back to where it opened and on again, a state saved by S listed
 * and marked here. And no page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';
import { filedWith, folderOf } from '../core/vault-folder.js';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const booted = name => page.until(`!!document.querySelector('.cl-host > .app ${name === 'vault' ? 'footer.bar' : '.pp-row'}')
  && document.querySelector('skw-titlebar')?.getAttribute('app') === '${name}'`, { timeout: 30000 });
const open = async name => { await page.eval(`document.querySelector('.cl-app[data-app="${name}"]').click()`); await booted(name); await wait(600); };
const rows = ((await (await fetch(c.base + '/api/vault')).json()).objects || []).filter(r => !(r.tags || []).includes('trash'));
const madeBy = Object.fromEntries(rows.map(r => [r.id, String((r.origin && r.origin.app) || '').split('/')[0]]));

await c.go(c.base + '/apps/cluster/');
await booted('vault');
await wait(800);

// ── Still through a switch: its stylesheet never gone between two apps' ──────
await page.eval(`(() => { window.__look = new Set(); let on = true;
  const probe = document.querySelector('.cl-side .vp-grid--top > .vp-card:not([data-type="set"])').dataset.id;
  const look = () => { const body = document.querySelector('.cl-side .vp-body'), grid = body.querySelector('.vp-grid'),
    r = body.querySelector('.vp-card[data-id="' + probe + '"]').getBoundingClientRect();
    window.__look.add([getComputedStyle(body).paddingLeft, getComputedStyle(grid).gridTemplateColumns, Math.round(r.width), Math.round(r.height)].join(' '));
    if (on) requestAnimationFrame(look); };
  requestAnimationFrame(look); window.__unlook = () => { on = false; return [...window.__look]; }; })()`);
await open('fractals');
await open('grid');
const sizes = await page.eval(`window.__unlook()`);
c.ok('the scene\'s vault still through two switches: its padding, columns, cards\' size the same every frame', sizes.length === 1,
  JSON.stringify(sizes).slice(0, 300));

// ── The app's own first, then the rest ───────────────────────────────────────
const parts = () => page.eval(`(() => { const body = document.querySelector('.cl-side .vp-body'), grids = [...body.querySelectorAll(':scope > .vp-grid--top')];
  const loose = g => g ? [...g.querySelectorAll(':scope > .vp-card[data-id]')].map(k => k.dataset.id) : [];
  return { heads: [...body.querySelectorAll(':scope > .vp-part')].map(p => p.textContent), own: loose(grids[0]), rest: loose(grids[1]) }; })()`);
const inGrid = await parts();
c.ok('beside grid, grid\'s own objects first, then the rest, a line naming each', /^grid · \d+$/.test(inGrid.heads[0] || '')
  && /^the rest · \d+$/.test(inGrid.heads[1] || '') && inGrid.own.length > 0 && inGrid.own.every(id => madeBy[id] === 'grid')
  && !inGrid.rest.some(id => madeBy[id] === 'grid'), JSON.stringify({ heads: inGrid.heads, own: inGrid.own.length, rest: inGrid.rest.length }));
await page.eval(`(() => { window.__moving = 0; let on = true; const side = document.querySelector('.cl-side');
  const look = () => { window.__moving = Math.max(window.__moving, document.getAnimations().filter(a => a.effect && side.contains(a.effect.target)).length);
    if (on) requestAnimationFrame(look); }; requestAnimationFrame(look); window.__unmove = () => { on = false; return window.__moving; }; })()`);
await open('particles');
const moved = await page.eval(`window.__unmove()`), inParticles = await parts();
await c.shot('1-particles-first');
c.ok('…switched to particles: particles\' own first, the cards seen moving to their places', /^particles · /.test(inParticles.heads[0] || '')
  && inParticles.own.every(id => madeBy[id] === 'particles') && moved > 0, `${inParticles.heads.join(' / ')}; ${moved} moving at once`);
await open('vault');
c.ok('…beside the vault app, every object as it came: no parts', !(await parts()).heads.length);

// ── A set inside the folder of its members, across the grid ─────────────────
const fileOf = filedWith(rows);
const filed = rows.find(r => r.type === 'set' && !folderOf(r) && fileOf(r));
if (filed) {
  const look = await page.eval(`(async () => {
    const tile = document.querySelector('.cl-side .vp-fcard[data-folder="${fileOf(filed)}"]');
    const loose = !!document.querySelector('.cl-side .vp-grid--top > .vp-card[data-id="${filed.id}"]');
    tile.click();
    await new Promise(r => setTimeout(r, 300));
    window.__strip = tile;
    const strip = tile.nextElementSibling.querySelector(':scope > .vp-grid'), first = strip.querySelector(':scope > .vp-card');
    return { loose, first: first.dataset.id, across: Math.round(first.getBoundingClientRect().width) >= Math.round(strip.clientWidth * 0.8) };
  })()`);
  await c.shot('2-set-in-its-folder');
  await page.eval(`window.__strip.click()`);
  c.ok('a set of exactly a folder\'s members: not beside it, in it, its first, across the grid', !look.loose && look.first === filed.id && look.across,
    `${filed.title} in "${fileOf(filed)}": ${JSON.stringify(look)}`);
} else {
  console.log('     (no set here holds exactly a folder\'s members — skipping the filing)');
}

// ── An object dragged from the scene's vault onto a field that takes it ──────
const DRAG = `const dt = new DataTransfer(), drag = (node, type) => { const e = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
  node.dispatchEvent(e); return e; }, rest = async node => { drag(node, 'dragover'); await new Promise(r => setTimeout(r, 550)); drag(node, 'dragover'); };`;
await open('fractals');
const still = rows.find(r => r.type === 'still' && !folderOf(r));
const dnd = await page.eval(`import('/core/param-rows.js').then(async ({ rowParams }) => { ${DRAG}
  const at = k => document.querySelector('.cl-host .pp-row[data-key="' + k + '"]');
  rowParams(at('family')).params.set('family', 'copies');
  await new Promise(r => setTimeout(r, 300));
  const field = at('sprite').querySelector('.skw-drop'), dr = field.closest('.dr'), head = dr.querySelector(':scope > .dr-head');
  if (dr.classList.contains('dr--open')) head.click();         // folded shut: the drag must open it
  const card = document.querySelector('.cl-side .vp-card[data-id="${still && still.id}"]'), seq = document.querySelector('.cl-side .vp-card[data-type="sequence"]');
  let refused = null;
  if (seq) { drag(seq, 'dragstart'); refused = !field.classList.contains('skw-takes'); drag(seq, 'dragend'); }
  drag(card, 'dragstart');
  const lit = field.classList.contains('skw-takes'), marked = head.classList.contains('skw-spring');
  await rest(head);
  const opened = dr.classList.contains('dr--open');
  drag(field, 'dragenter');
  const over = field.classList.contains('skw-over'), taken = drag(field, 'drop').defaultPrevented;
  drag(card, 'dragend');
  return { refused, lit, marked, opened, over, taken, left: document.querySelectorAll('.skw-takes, .skw-over, .skw-spring').length };
})`);
c.ok('a still dragged from the vault: fractals\' sprite field lit — a sequence lit it not — its folded section opening as the drag rests',
  dnd.lit && dnd.refused !== false && dnd.marked && dnd.opened, JSON.stringify(dnd));
await page.until(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(document.querySelector('.cl-host .pp-row[data-key="sprite"]')).params.get('sprite') === ${JSON.stringify(still && still.id)})`,
  { timeout: 10000 });
await page.until(`document.querySelector('.cl-host .pp-row[data-key="sprite"] .pp-object-name')?.textContent === ${JSON.stringify(still && (still.title || still.id))}`, { timeout: 10000 });
c.ok('…dropped on it: the sprite fractals copies, named in its field, nothing left lit', dnd.over && dnd.taken && !dnd.left, still && still.title);

// A field in a panel not shown: its tab marked, opening as the drag rests on it.
await open('particles');
await page.eval(`[...document.querySelectorAll('.cl-tabs .cl-tab')].find(t => t.textContent === 'picture').click()`);
const tab = await page.eval(`(async () => { ${DRAG}
  const card = document.querySelector('.cl-side .vp-card[data-id="${still && still.id}"]');
  drag(card, 'dragstart');
  const marked = [...document.querySelectorAll('.cl-tabs .cl-tab.skw-spring')].map(t => t.textContent);
  if (marked.length) await rest(document.querySelector('.cl-tabs .cl-tab.skw-spring'));
  const shown = [...document.querySelectorAll('.cl-host .app-main > .app-side.cl-shown')].map(s => s.id), lit = !!document.querySelector('.app-side.cl-shown .skw-takes');
  drag(card, 'dragend');
  return { marked, shown, lit };
})()`);
c.ok('…a field in a panel not shown: its tab marked, opened as the drag rests on it', tab.marked.length === 1 && tab.lit
  && !tab.shown.includes('picture-side'), JSON.stringify(tab));

// ── The side's other views: the keys, the history (S9f) ─────────────────────
const side = name => page.eval(`document.querySelector('.cl-sides .cl-tab[data-side="${name}"]').click()`);
await side('keys');
const keys = await page.eval(`(() => { const v = document.querySelector('.cl-keys');
  const k = v.querySelector('.ck-key[data-code="KeyR"]'), t = v.querySelector('.ck-key[data-code="KeyT"]');
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', key: 't' }));     // a key that does nothing here: lit, and nothing done
  const lit = t.classList.contains('ck-key--lit') && t.classList.contains('ck-key--free');
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyT', key: 't' }));
  return { shown: !v.hidden && document.querySelector('.cl-side').hidden, keys: v.querySelectorAll('.ck-key').length,
    r: k.querySelector('.ck-cap').textContent + ' ' + k.querySelector('.ck-act').textContent, pie: k.classList.contains('ck-key--pie'), lit,
    after: t.classList.contains('ck-key--lit'), listed: v.querySelectorAll('.ck-binds li').length }; })()`);
c.ok('the side\'s keys: the left hand, R a new seed and a pie, lit while down; every key listed', keys.shown && keys.keys === 15
  && keys.r === 'R again' && keys.pie && keys.lit && !keys.after && keys.listed > 5, JSON.stringify(keys));
await c.shot('3-keys');
await side('history');
const before = await page.eval(`import('/core/param-rows.js').then(({ rowParams }) => { const o = rowParams(document.querySelector('.cl-host .pp-row[data-key="seed"]'));
  const was = o.params.get('seed'); window.dispatchEvent(new PointerEvent('pointerdown')); o.params.set('seed', was + 1); return was; })`);
await page.until(`[...document.querySelectorAll('.cl-history .ch-step')].some(b => /seed/.test(b.textContent))`, { timeout: 5000 });
const story = await page.eval(`(async () => { const v = document.querySelector('.cl-history'), steps = () => [...v.querySelectorAll('.ch-step')];
  const listed = steps().map(b => b.textContent), now = steps().findIndex(b => b.classList.contains('ch-step--now'));
  const seed = () => import('/core/param-rows.js').then(({ rowParams }) => rowParams(document.querySelector('.cl-host .pp-row[data-key="seed"]')).params.get('seed'));
  steps()[0].click(); await new Promise(r => setTimeout(r, 200)); const back = await seed();
  steps().at(-1).click(); await new Promise(r => setTimeout(r, 200)); const on = await seed();
  return { listed, now, back, on }; })()`);
c.ok('…the history: a value changed, a step in it; clicked back to where it opened, and on again', story.now === story.listed.length - 1
  && story.listed.some(t => /seed/.test(t)) && story.back === before && story.on === before + 1, JSON.stringify(story));
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }))`);
await page.until(`!!document.querySelector('.cl-history .ch-state--here')`, { timeout: 30000 });
c.ok('…S: the state it saved listed, marked as the one the page holds', await page.eval(`/^v\\d+/.test(document.querySelector('.cl-history .ch-state--here').textContent)`));
await c.shot('4-history');
await side('vault');

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
