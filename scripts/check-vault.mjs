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
 * strip's head.
 */

import { startCheck } from './check-kit.mjs';
import { kinOf } from '../core/vault-kin.js';

const c = await startCheck();
const { page } = c;
const V = `document.querySelector('.vp--visible')`;

// What the panel should show, worked out here from the same index.
const all = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
const shown = all.filter(r => !(r.tags || []).includes('trash'));
const loose = shown.filter(r => !(r.tags || []).some(t => t.startsWith('folder:')));
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
await choose('sequence');
const t1 = await page.eval(`document.querySelector('.bar-say').textContent`);
await new Promise(r => setTimeout(r, 800));
const t2 = await page.eval(`document.querySelector('.bar-say').textContent`);
c.ok('…a sequence: drawn and played, its player under it', t1 !== t2 && /frame \d+ of \d+/.test(t2)
  && await page.eval(`!document.querySelector('#player').hidden`), `${t1} → ${t2}`);
const still = shown.find(r => r.type === 'still');
await c.go(c.base + '/apps/vault/?open=' + encodeURIComponent(still.id));
await page.until(`/ · still/.test(document.querySelector('.bar-say')?.textContent || '')`, { timeout: 20000 });
c.ok('?open=<id>: drawn as it opens', (await page.eval(inked)) > 1000);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
