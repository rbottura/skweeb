#!/usr/bin/env node
/**
 * scripts/check-vault.mjs — the vault panel (core/VaultPanel.js), in a real browser.
 *
 *   node scripts/check-vault.mjs
 *
 * On a copy of the vault: the objects made from one another sit together, one
 * small container each, in the order core/vault-kin.js gives when node runs
 * it on the same index — the most original first; a container names a parent
 * it does not show, and that name opens it; the head's `lineage` switch lays
 * them out one by one and back. A folder reads as a folder: a card shorter
 * than an object's, its members a small peek; it opens, and closes from its
 * strip's head. A set of exactly a folder's members is in that folder, first,
 * and not beside it (S9g).
 */

import { startCheck } from './check-kit.mjs';
import { kinOf } from '../core/vault-kin.js';
import { filedWith, folderOf } from '../core/vault-folder.js';

const c = await startCheck();
const { page } = c;
const V = `document.querySelector('.vp--visible')`;

// What the panel should show, worked out here from the same index.
const all = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
const shown = all.filter(r => !(r.tags || []).includes('trash'));
const fileOf = filedWith(shown);
const loose = shown.filter(r => !fileOf(r));
const groups = [...new Set(kinOf(loose, all).values())];
// The order the grid meets them in: where each group's newest member is.
const firstAt = g => Math.min(...g.members.map(m => loose.indexOf(m)));
const want = groups.sort((a, b) => firstAt(a) - firstAt(b)).map(g => g.members.map(m => m.title || m.id));

await c.go(c.base + '/apps/compose/');
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'V' }))`);
await page.until(`!!${V} && ${V}.querySelectorAll('.vp-card').length > 0`);

// ── Kin ──────────────────────────────────────────────────────────────────────
const boxes = () => page.eval(`[...${V}.querySelectorAll('.vp-kin')].map(k =>
  [...k.querySelectorAll(':scope > .vp-card')].map(card => card.querySelector('.vp-name').textContent))`);
const got = await boxes();
c.ok('kin sit together, one container each', got.length === want.length && got.length > 0,
  `${got.length} containers, ${want.length} worked out`);
c.ok('each the most original first, as vault-kin.js orders them', JSON.stringify(got) === JSON.stringify(want),
  got.map(g => g.length).join(', ') + ' members');
const spans = await page.eval(`[...${V}.querySelectorAll('.vp-kin')].map(k =>
  [Number(k.dataset.n), Number(getComputedStyle(k).getPropertyValue('--kin-span'))])`);
c.ok('each spans its members, no more than the grid has', spans.every(([n, s]) => s >= 1 && s <= n), JSON.stringify(spans));
const arrows = await page.eval(`[...${V}.querySelectorAll('.vp-kin > .vp-card ~ .vp-card')]
  .every(k => getComputedStyle(k, '::before').content.includes('→'))`);
c.ok('an arrow before every member but the first', arrows);

const from = await page.eval(`(() => { const b = ${V}.querySelector('.vp-kin-from'); if (!b) return null;
  b.click(); return b.textContent; })()`);
if (from) {
  await page.until(`${V}.querySelector('.vp-detail--open .vp-name')?.textContent.length > 0`);
  const opened = await page.eval(`${V}.querySelector('.vp-detail .vp-name').textContent`);
  c.ok('a parent it does not show is named, and opens', from === 'from ' + opened, `${from} → ${opened}`);
  c.ok('…its detail, over the page, with its picture', await page.eval(`!!${V}.querySelector('.vp-detail--open .vp-preview')`));
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
} else {
  console.log('     (no group here has a parent outside it — skipping the link)');
}
await c.shot('1-kin');

const lineage = `[...${V}.querySelectorAll('.vp-head .vp-chip')].find(b => b.textContent === 'lineage')`;
await page.click(lineage);
await page.until(`${V}.querySelectorAll('.vp-kin').length === 0`);
c.ok('lineage off: every object on its own', await page.eval(`!${lineage}.classList.contains('vp-chip--on')`));
await page.click(lineage);
await page.until(`${V}.querySelectorAll('.vp-kin').length === ${want.length}`);
c.ok('and back on', true, want.length + ' containers');

// ── A folder reads as a folder ──────────────────────────────────────────────
const shape = await page.eval(`(() => {
  const f = ${V}.querySelector('.vp-fcard'), o = ${V}.querySelector('.vp-grid--top > .vp-card:not(.vp-fcard)');
  if (!f || !o) return null;
  const pics = [...f.querySelectorAll('.vp-fthumb img')];
  return { folder: Math.round(f.getBoundingClientRect().height), object: Math.round(o.getBoundingClientRect().height),
    peek: pics.length, small: pics.every(p => p.getBoundingClientRect().width < f.getBoundingClientRect().width / 3) };
})()`);
if (shape) {
  c.ok('a folder is shorter than an object, its members a small peek', shape.folder < shape.object * 0.75 && shape.small,
    `${shape.folder} px against ${shape.object}; ${shape.peek} small pictures`);
  await page.click(`${V}.querySelector('.vp-fcard')`);
  await page.until(`${V}.querySelector('.vp-fstrip:not([hidden])') !== null`);
  await page.click(`${V}.querySelector('.vp-fstrip:not([hidden]) .vp-fstrip-head')`);
  await page.until(`${V}.querySelector('.vp-fstrip:not([hidden])') === null`);
  c.ok('it opens, and closes from its strip\'s head', true);
} else {
  console.log('     (no folder and object both here — skipping the folder)');
}
// A set filed with the folder holding exactly its members — the legacy grid's materials: in it, first; not beside it.
const filedSet = shown.find(r => r.type === 'set' && !folderOf(r) && fileOf(r));
if (filedSet) {
  const name = fileOf(filedSet);
  c.ok('a set of exactly a folder\'s members is not beside it', await page.eval(`!${V}.querySelector('.vp-grid--top > .vp-card[data-id="${filedSet.id}"]')`),
    `${filedSet.title} → ${name}`);
  await page.click(`${V}.querySelector('.vp-fcard[data-folder=${JSON.stringify(name).replace(/"/g, '\\"')}]')`);
  await page.until(`${V}.querySelector('.vp-fstrip:not([hidden]) .vp-card') !== null`);
  c.ok('…it is in that folder, its first', await page.eval(`${V}.querySelector('.vp-fstrip:not([hidden]) .vp-grid > .vp-card')?.dataset.id`) === filedSet.id);
  await page.click(`${V}.querySelector('.vp-fstrip:not([hidden]) .vp-fstrip-head')`);
} else {
  console.log('     (no set here holds exactly a folder\'s members — skipping the filing)');
}
await c.shot('2-folder');

// The vault, an app (S9b): the panel docked full screen, the object whose detail opens drawn beside it.
await c.go(c.base + '/apps/vault/');
await page.until(`document.querySelectorAll('.vp.vp--docked .vp-card').length > 0`, { timeout: 20000 });
c.ok('the vault app: the panel docked in the page, always shown, no close',
  await page.eval(`(() => { const vp = document.querySelector('.vp.vp--docked');
    return !!vp && !!vp.closest('#vault-side') && getComputedStyle(vp).visibility === 'visible'
      && [...vp.querySelectorAll(':scope > .vp-head .vp-btn')].every(b => b.textContent !== '✕' || b.hidden); })()`));
c.ok('…nothing to save, so no Save and no Export above it', await page.eval(`!document.querySelector('skw-titlebar .tb-save, skw-titlebar .tb-export')`));
const inked = `(() => { const cv = document.querySelector('#stage'), g = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let n = 0; for (let i = 3; i < g.length; i += 4) if (g[i] > 0) n++; return n; })()`;
const choose = async type => {
  // A card of that type, by the type it says (core/vault-card.js `.vp-type`).
  await page.eval(`[...document.querySelectorAll('.vp-card')].find(k => k.querySelector('.vp-type')?.textContent === '${type}').click()`);
  await page.until(`/ · ${type}/.test(document.querySelector('.bar-say')?.textContent || '')`, { timeout: 20000 });
  await new Promise(r => setTimeout(r, 500));
};
await choose('still');
c.ok('a still chosen: its detail open, and drawn in the viewer', (await page.eval(`!!document.querySelector('.vp-detail--open')`)) && (await page.eval(inked)) > 1000,
  `${await page.eval(inked)} pixels inked`);
// The author's C (2026-11-05): beside the viewer, the detail is the object's facts, no picture of its own, narrower.
const facts = await page.eval(`(() => { const d = document.querySelector('.vp-detail--open');
  return { picture: !!d.querySelector('.vp-preview'), play: [...d.querySelectorAll('.vp-btn')].some(b => /Play the loop/.test(b.textContent)),
           facts: !!d.querySelector('.vp-facts'), name: !!d.querySelector('.vp-name'), width: Math.round(d.getBoundingClientRect().width) }; })()`);
c.ok('…its detail the facts only: no picture of its own, as wide as the bench\'s properties',
  !facts.picture && !facts.play && facts.facts && facts.name && facts.width <= 300, JSON.stringify(facts));
await choose('sequence');
const t1 = await page.eval(`document.querySelector('.bar-say').textContent`);
await new Promise(r => setTimeout(r, 800));
const t2 = await page.eval(`document.querySelector('.bar-say').textContent`);
const strip = await page.eval(`(() => { const p = document.querySelector('.viewer > .viewer-player'); if (!p || p.hidden) return null;
  const r = p.getBoundingClientRect(); return { height: Math.round(r.height), play: !!p.querySelector('.tp-count'), scrub: !!p.querySelector('.tp-scrub') }; })()`);
c.ok('…a sequence: drawn and played, the controls of its player under it (S9h)', t1 !== t2 && /frame \d+ of \d+/.test(t2)
  && !!strip && strip.height > 20 && strip.play && strip.scrub, `${t1} → ${t2} · ${JSON.stringify(strip)}`);
const still = shown.find(r => r.type === 'still');
await c.go(c.base + '/apps/vault/?open=' + encodeURIComponent(still.id));
await page.until(`/ · still/.test(document.querySelector('.bar-say')?.textContent || '')`, { timeout: 20000 });
c.ok('?open=<id>: drawn as it opens', (await page.eval(inked)) > 1000);

// ── The vault app's viewer (S9h): an object at its ink's shape, fitted evenly, seen closer ──
const gamepadLoop = shown.find(r => r.type === 'sequence' && r.origin && r.origin.app === 'gamepad' && r.render && r.render.w && r.render.h);
if (gamepadLoop) {
  await c.go(c.base + '/apps/vault/?open=' + encodeURIComponent(gamepadLoop.id));
  await page.until(`/ · sequence/.test(document.querySelector('.bar-say')?.textContent || '')`, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 600));
  const box = () => page.eval(`(() => { const k = document.querySelector('#stage'), st = k.parentElement, r = k.getBoundingClientRect(), s = st.getBoundingClientRect(), cs = getComputedStyle(st);
    const pad = ['Left', 'Top', 'Right', 'Bottom'].map(e => parseFloat(cs['padding' + e]));
    return { w: k.width, h: k.height, x: r.left + r.width / 2, y: r.top + r.height / 2, cw: r.width, ch: r.height,
      gaps: [r.left - s.left - pad[0], r.top - s.top - pad[1], s.right - pad[2] - r.right, s.bottom - pad[3] - r.bottom].map(Math.round),
      cls: k.className, said: document.querySelector('.vault-zoom')?.textContent }; })()`);
  const fitted = await box();
  const ink = gamepadLoop.render.w / gamepadLoop.render.h;
  c.ok('a gamepad loop drawn at the shape of its ink, not of its screen: never stretched', Math.abs(fitted.w / fitted.h - ink) < 0.02,
    `${fitted.w}×${fitted.h} against ${gamepadLoop.render.w}×${gamepadLoop.render.h}`);
  const [l, t, r, b] = fitted.gaps;
  c.ok('…fitted with an even margin: as far from the rulers as from the edges', Math.abs(l - r) <= 1 && Math.abs(t - b) <= 1 && Math.min(l, t) >= 0
    && fitted.said === 'fit', JSON.stringify(fitted.gaps));
  await page.eval(`(() => { const k = document.querySelector('#stage'), r = k.getBoundingClientRect();
    k.parentElement.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true })); })()`);
  await new Promise(r => setTimeout(r, 200));
  const near = await box();
  c.ok('…the wheel: closer about the pointer, the point under it staying', near.cw > fitted.cw * 1.4 && Math.abs(near.x - fitted.x) < 2 && Math.abs(near.y - fitted.y) < 2
    && /%$/.test(near.said || ''), `${Math.round(fitted.cw)} → ${Math.round(near.cw)} px wide, ${near.said}`);
  await page.eval(`(() => { const st = document.querySelector('#stage').parentElement, r = st.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const at = (type, dx, dy) => st.dispatchEvent(new PointerEvent(type, { pointerId: 7, button: 0, buttons: 1, clientX: x + dx, clientY: y + dy, bubbles: true }));
    at('pointerdown', 0, 0); at('pointermove', 60, 40); at('pointerup', 60, 40); })()`);
  await new Promise(r => setTimeout(r, 200));
  const moved = await box();
  c.ok('…a drag moves it', Math.abs(moved.x - near.x - 60) < 2 && Math.abs(moved.y - near.y - 40) < 2, `${Math.round(moved.x - near.x)}, ${Math.round(moved.y - near.y)}`);
  await page.eval(`(() => { const st = document.querySelector('#stage').parentElement, r = st.getBoundingClientRect();
    for (let i = 0; i < 12; i++) st.dispatchEvent(new WheelEvent('wheel', { deltaY: -400, clientX: r.left + 40, clientY: r.top + 60, bubbles: true, cancelable: true })); })()`);
  await new Promise(r => setTimeout(r, 200));
  const pixels = await box();
  c.ok('…closer than its own pixels: shown as pixels, its canvas no bigger than the picture', pixels.cls.includes('zm-pixels')
    && pixels.w <= gamepadLoop.render.w + 1, `${pixels.w}×${pixels.h}, ${pixels.said}`);
  await page.eval(`document.querySelector('#stage').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`);
  await new Promise(r => setTimeout(r, 200));
  const again = await box();
  c.ok('…a double click: fitted again', Math.abs(again.cw - fitted.cw) < 1 && Math.abs(again.x - fitted.x) < 1 && again.said === 'fit', again.said);
  await c.shot('3-vault-viewer');
} else {
  console.log('     (no gamepad loop in this vault — skipping the viewer)');
}

// ── A palette, made by hand in the vault (V1, core/vault-palette.js) ─────────
await c.go(c.base + '/apps/vault/');
await page.until(`!!document.querySelector('.vp-make')`, { timeout: 20000 });
const palettesBefore = ((await (await fetch(c.base + '/api/vault')).json()).objects || []).filter(r => r.type === 'palette').length;
await page.eval(`document.querySelector('.vp-make').click()`);
await page.until(`document.querySelectorAll('.vp-pal-row').length === 3`, { timeout: 5000 });
await page.eval(`(() => { const set = (n, v, ev = 'input') => { n.value = v; n.dispatchEvent(new Event(ev, { bubbles: true })); };
  const rows = () => [...document.querySelectorAll('.vp-pal-row')];
  set(rows()[0].querySelector('.vp-pal-colour'), '#0073dc'); set(rows()[0].querySelector('.vp-pal-name'), 'blue');
  [...document.querySelectorAll('.vp-detail .vp-btn')].find(b => b.textContent === '+ a colour').click();
  set(rows()[3].querySelector('.vp-pal-colour'), '#e40514'); set(rows()[3].querySelector('.vp-pal-name'), 'red');
  set(document.querySelector('.vp-pal-title'), 'bec 2027, a first try');
  [...document.querySelectorAll('.vp-detail .vp-btn')].find(b => b.textContent === 'Keep').click(); })()`);
await page.until(`document.querySelector('.vp-detail--open .vp-name')?.textContent === 'bec 2027, a first try'`, { timeout: 20000 });
const palettes = async () => ((await (await fetch(c.base + '/api/vault')).json()).objects || []).filter(r => r.type === 'palette');
const first = (await palettes()).find(r => r.title === 'bec 2027, a first try');
const kept = first && (await (await fetch(c.base + '/api/vault/' + first.id)).json());
c.ok('a palette made by hand: kept as an object, its colours and their names in order, its picture their strip', !!kept
  && JSON.stringify(kept.recipe.colours) === '["#0073dc","#7a7a7a","#f2f0e9","#e40514"]' && kept.recipe.names[0] === 'blue' && kept.recipe.names[3] === 'red'
  && kept.render.w === 4 * kept.render.h, JSON.stringify(kept && { recipe: kept.recipe, w: kept.render.w, h: kept.render.h }));
await page.eval(`[...document.querySelectorAll('.vp-detail--open .vp-btn')].find(b => b.textContent === 'Edit its colours').click()`);
await page.until(`document.querySelectorAll('.vp-pal-row').length === 4`, { timeout: 5000 });
await page.eval(`(() => { const n = document.querySelectorAll('.vp-pal-row')[1].querySelector('.vp-pal-colour'); n.value = '#00a773';
  n.dispatchEvent(new Event('input', { bubbles: true }));
  [...document.querySelectorAll('.vp-detail .vp-btn')].find(b => /^Keep/.test(b.textContent)).click(); })()`);
await page.until(`import('/core/vault.js').then(({ Vault }) => Vault.refresh().then(() => Vault.index.filter(r => r.type === 'palette').length === ${palettesBefore + 2}))`, { timeout: 20000 });
const second = (await palettes()).find(r => (r.parents || []).includes(first.id));
const edited = second && (await (await fetch(c.base + '/api/vault/' + second.id)).json());
c.ok('…its colours edited: a new palette, the first its parent and as it was', !!edited && edited.recipe.colours[1] === '#00a773'
  && (edited.parents || []).includes(first.id) && (await (await fetch(c.base + '/api/vault/' + first.id)).json()).recipe.colours[1] === '#7a7a7a',
  JSON.stringify(edited && { colours: edited.recipe.colours, parents: edited.parents }));

// ── Groups by hand (V3, core/vault-groups.js): selected into one, renamed, one out ──
await c.go(c.base + '/apps/vault/');
await page.until(`document.querySelectorAll('.vp-grid--top > .vp-card[data-id]').length >= 2`, { timeout: 20000 });
const two = await page.eval(`[...document.querySelectorAll('.vp-grid--top > .vp-card[data-id]')].slice(0, 2).map(k => k.dataset.id)`);
const ctrlClick = id => page.eval(`document.querySelector('.vp-card[data-id="${id}"]').dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }))`);
const press = text => page.eval(`[...document.querySelectorAll('.vp-bar .vp-btn')].find(b => b.textContent === ${JSON.stringify(text)}).click()`);
const named = (where, name) => page.eval(`(() => { const f = document.querySelector('${where} .vp-group-name'); f.value = ${JSON.stringify(name)};
  f.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`);
const tagsOf = async id => ((await (await fetch(c.base + '/api/vault/' + id)).json()).tags || []);
for (const id of two) await ctrlClick(id);
await page.until(`/2 objects selected/.test(document.querySelector('.vp-bar')?.textContent || '')`, { timeout: 5000 });
await press('Into a group…');
await named('.vp-bar', 'a group of two');
await page.until(`!!document.querySelector('.vp-fcard[data-folder="a group of two"]')`, { timeout: 10000 });
c.ok('two selected, into a group: a folder of them, by the name given', (await Promise.all(two.map(tagsOf))).every(t => t.includes('folder:a group of two')));
await page.until(`!!document.querySelector('.vp-fstrip:not([hidden]) .vp-fstrip-rename')`, { timeout: 5000 });
await page.eval(`document.querySelector('.vp-fstrip:not([hidden]) .vp-fstrip-rename').click()`);
await named('.vp-fstrip:not([hidden])', 'two, renamed');
await page.until(`!!document.querySelector('.vp-fcard[data-folder="two, renamed"]') && !document.querySelector('.vp-fcard[data-folder="a group of two"]')`, { timeout: 10000 });
c.ok('…renamed from its strip, every member with it', (await Promise.all(two.map(tagsOf))).every(t => t.includes('folder:two, renamed') && !t.includes('folder:a group of two')));
await page.until(`!!document.querySelector('.vp-fstrip:not([hidden]) .vp-card[data-id="${two[0]}"]')`, { timeout: 5000 });
await ctrlClick(two[0]);
await press('Into a group…');
await press('Out of their group');
await page.until(`fetch('/api/vault/${two[0]}').then(r => r.json()).then(o => !(o.tags || []).some(t => t.startsWith('folder:')))`, { timeout: 10000 });
c.ok('…one out of its group: loose again, the other still in it', (await tagsOf(two[1])).includes('folder:two, renamed'));
await c.shot('4-groups');

// ── A set by hand (V2, core/vault-set.js): three pictures, picked out of the grid's order, a material ──
await c.go(c.base + '/apps/vault/');
await page.until(`document.querySelectorAll('.vp-grid--top > .vp-card[data-id]').length >= 2`, { timeout: 20000 });
const pics = await page.eval(`import('/core/vault.js').then(({ Vault }) => Vault.refresh().then(() => {
  const pictures = new Set(Vault.index.filter(r => (r.type === 'shape' || r.type === 'still') && r.render).map(r => r.id));
  return [...document.querySelectorAll('.vp-card[data-id]')].filter(k => !k.closest('[hidden]') && pictures.has(k.dataset.id)).slice(0, 3).map(k => k.dataset.id); }))`);
const picked = [pics[2], pics[0], pics[1]];
for (const id of picked) await ctrlClick(id);
await page.until(`[...document.querySelectorAll('.vp-bar .vp-btn')].some(b => b.textContent === 'A set of these…')`, { timeout: 5000 });
await press('A set of these…');
await page.eval(`document.querySelector('.vp-bar .vp-set-role').value = 'material'`);
await named('.vp-bar', 'three by hand');
await page.until(`import('/core/vault.js').then(({ Vault }) => Vault.index.some(r => r.type === 'set' && r.title === 'three by hand'))`, { timeout: 20000 });
const made = await page.eval(`import('/core/vault.js').then(async ({ Vault }) => {
  const row = Vault.index.find(r => r.type === 'set' && r.title === 'three by hand');
  const { object } = await Vault.load(row.id);
  return { members: object.recipe.members, role: object.recipe.role, w: object.render.w, h: object.render.h, app: object.origin.app, id: row.id }; })`);
c.ok('three pictures picked, a set of them: its members in the order they were picked, not the grid\'s',
  JSON.stringify(made.members) === JSON.stringify(picked), JSON.stringify([made.members, picked]));
c.ok('…made as a material, its picture one row of them, made in the vault', made.role === 'material' && made.w === 3 * 96 && made.h === 96 && made.app === 'vault',
  JSON.stringify(made));
await page.until(`(document.querySelector('.vp-detail--open') || {}).textContent?.includes('three by hand')`, { timeout: 10000 });
c.ok('…its detail opened, where it is switched on where it goes', true);
await page.until(`import('/core/vault.js').then(({ Vault }) => Vault.refresh().then(() => document.body.textContent.includes(Vault.index.length + ' in vault')))`, { timeout: 10000 });
c.ok('…and the vault app\'s count with it', true);
await c.shot('5-a-set');

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
