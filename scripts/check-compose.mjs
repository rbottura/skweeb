#!/usr/bin/env node
/**
 * scripts/check-compose.mjs — compose, checked in a real browser.
 *
 *   node scripts/check-compose.mjs [--keep]
 *
 * Starts server.js on a free port against a copy of ./vault in the OS temp
 * folder, so nothing here can write to yours, and opens compose in headless
 * Chrome (scripts/check-kit.mjs, scripts/chrome.mjs). Then, from the page:
 *
 *   an empty page         A4, 150 dpi, and it says what to do
 *   every kind placed     one object per type and app in the vault, by
 *                         `?place=`: drawn, whole, as large as fits
 *   a typed transform     a still lands on the pixels page.js's matrix says
 *   the page              bleed, a transparent ground, A3, scale 2, Reset
 *   the page plays        every loop at its own speed, stepped, and at 30 fps
 *   many placements       added with the picker, listed, chosen, moved, a still
 *                         kept while loops play, removed, picked up and dragged
 *                         on the page, sent back
 *   saved                 the page as a composition in the vault copy: recipe,
 *                         parents, frames, render, and one object for two saves
 *   no vault at all       the repo served as plain files: it boots, says so
 *
 * and a console with nothing in it but a missing favicon. Screenshots land in
 * the temp folder, printed at the end; --keep leaves the folder there.
 * Not in the tests loop: it needs Chrome, and a vault with things in it.
 */

import { startCheck } from './check-kit.mjs';
import { placementMatrix, onPage, pageSize } from '../apps/compose/page.js';

const kit = await startCheck({ keep: process.argv.includes('--keep') });
const { page, ok, go, shot } = kit;
const BASE = kit.base;

// ── What the page shows ──────────────────────────────────────────────────────

/** The bar, the canvas, and where its ink is: anything darker than the paper. */
const look = () => page.eval(`(() => {
  const c = document.getElementById('page');
  const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let clear = 0, x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4;
    if (!g[i + 3]) { clear++; continue; }
    if (g[i] < 200 || g[i + 1] < 200 || g[i + 2] < 200) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const dim = [...document.querySelectorAll('.bar-dim')].map(e => e.textContent);
  return { w: c.width, h: c.height, clear, ink: x1 < 0 ? null : [x0, y0, x1, y1],
    say: document.querySelector('.bar-say').textContent, out: document.querySelector('.bar-out').textContent,
    dpi: dim[1] || '', vault: dim[2] || '' };
})()`);

const row = (side, label) => `[...document.querySelectorAll('#${side} .pp-row')]
  .find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(label)})`;
const type = async (side, label, value) => {
  await page.typeInto(row(side, label) + '?.querySelector(".pp-num")', value);
  await new Promise(r => setTimeout(r, 200));
};
const chip = text => `[...document.querySelectorAll('#page-side .pp-chip')].find(c => c.textContent === ${JSON.stringify(text)})`;
const settled = `(() => { const t = document.querySelector('.bar-say')?.textContent || '';
  return t.includes(' on the page') || t.includes('could not'); })()`;

const SHEET = { width: 1240, height: 1754, bleed: 0 };
let still = null;

// The player: its drawer's note, its count, a key pressed, and a sum of the page's pixels.
const playerNote = () => page.eval(`[...document.querySelectorAll('#page-side .dr')]
  .find(d => d.querySelector('.dr-head').textContent.includes('Sequence player')).querySelector('.dr-note').textContent`);
const count = () => page.eval(`Number(document.querySelector('.tp-count').textContent.split(' / ')[0])`);
const press = key => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)} }))`);
const pixels = () => page.eval(`(() => { const c = document.getElementById('page');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let s = 0; for (let i = 0; i < d.length; i += 97) s = (s * 31 + d[i]) >>> 0; return s; })()`);
const wait = ms => new Promise(r => setTimeout(r, ms));

try {
  // 1. Empty.
  await go(BASE + '/apps/compose/');
  await page.until(`document.querySelector('.bar-say')?.textContent.startsWith('choose')`);
  let s = await look();
  ok('empty: says what to do', s.say.startsWith('choose an object'));
  ok('empty: an A4 page at 150 dpi', s.out === '1240 × 1754 px' && s.dpi.includes('150 dpi on A4'), s.out + ' ' + s.dpi);
  ok('empty: the canvas is the sheet\'s shape', Math.abs(s.w / s.h - 1240 / 1754) < 0.01, s.w + '×' + s.h);
  await shot('01-empty');

  // 2. One of every kind the vault has.
  const rows = (await (await fetch(BASE + '/api/vault')).json()).objects || [];
  const kinds = new Map();
  for (const r of rows) {
    const key = r.type + ' from ' + (r.origin && r.origin.app);
    if (['still', 'sequence', 'shape'].includes(r.type) && !kinds.has(key)) kinds.set(key, r);
  }
  if (!kinds.size) console.log('     (the vault has nothing to place — skipping the placements)');
  for (const [kind, r] of kinds) {
    await go(BASE + '/apps/compose/?place=' + r.id);
    await page.until(settled, { timeout: 90000 });
    s = await look();
    const m = s.say.match(/(\d+) × (\d+) on the page/);
    const scale = Number(await page.eval(row('place-side', 'scale') + '.querySelector(".pp-num").value'));
    const [W, H] = m ? [Number(m[1]), Number(m[2])] : [0, 0];
    const whole = W <= SHEET.width && H <= SHEET.height;
    const large = scale === 1 || Math.max(W / SHEET.width, H / SHEET.height) >= scale / (scale + 0.01) - 1e-9;
    ok(`${kind}: placed and drawn`, !!m && !!s.ink, r.id + (m ? '' : ' — ' + s.say));
    ok(`${kind}: whole, and as large as fits`, whole && large, `${W}×${H} at ${scale}`);
    await shot('02-' + kind.replace(/\W+/g, '-'));
    if (r.type === 'still' && !still) still = r;
  }

  // 3. A typed transform lands where the matrix says.
  if (still) {
    await go(BASE + '/apps/compose/?place=' + still.id);
    await page.until(settled, { timeout: 30000 });
    const t = { x: 200, y: -300, scale: 0.5, rot: 90 };
    await type('place-side', 'x from centre', t.x);
    await type('place-side', 'y from centre', t.y);
    await type('place-side', 'scale', t.scale);
    await type('place-side', 'rotation °', t.rot);
    s = await look();
    const view = s.w / pageSize(SHEET).width;
    const mx = placementMatrix(t, { width: still.render.w, height: still.render.h }, SHEET);
    const pts = [[0, 0], [still.render.w, 0], [still.render.w, still.render.h], [0, still.render.h]]
      .map(p => onPage(mx, p).map(v => v * view));
    const want = [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])),
                  Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
    const off = s.ink ? Math.max(...s.ink.map((v, i) => Math.abs(v - want[i]))) : Infinity;
    ok('a typed transform lands where page.js says', off <= 3,
       `ink ${JSON.stringify(s.ink)} against ${JSON.stringify(want.map(Math.round))}`);
    await shot('03-transformed');

    // 4. The page.
    await type('page-side', 'bleed', 40);
    s = await look();
    ok('bleed grows the canvas round the sheet', s.out === '1320 × 1834 px', s.out);
    await shot('04-bleed');
    await type('page-side', 'bleed', 0);
    await page.click(`[...document.querySelectorAll('#page-side .dr-head')].find(h => h.textContent.includes('Ground'))`);
    await page.click(chip('none'));
    await new Promise(r => setTimeout(r, 200));
    s = await look();
    ok('a ground of none is transparent', s.clear > 0, s.clear + ' clear pixels');
    await page.click(chip('A3'));
    await new Promise(r => setTimeout(r, 200));
    s = await look();
    ok('A3 is A4\'s shape: the box stays, the dpi moves', s.out === '1240 × 1754 px' && s.dpi.includes('106 dpi on A3'), s.dpi);
    await type('page-side', 'scale', 2);
    s = await look();
    ok('scale 2 doubles what an export makes', s.out === '2480 × 3508 px · 2×' && s.dpi.includes('212 dpi'), s.out + ' ' + s.dpi);
    await page.click(`document.querySelector('#place-side .pp-head .pp-btn')`);
    await new Promise(r => setTimeout(r, 300));
    s = await look();
    ok('Reset takes the object away', s.say.startsWith('choose') && !s.ink);
    ok('a page with nothing that moves does not play', (await playerNote()) === 'nothing moves');
  }

  // 5. The page plays: each loop at its own speed, at the page's rate of 60.
  const loops = [...kinds].filter(([, r]) => r.type === 'sequence');
  for (const [kind, r] of loops) {
    await go(BASE + '/apps/compose/?place=' + r.id);
    await page.until(settled, { timeout: 90000 });
    const { render } = await (await fetch(BASE + '/api/vault/' + r.id)).json();
    const frames = Math.round((render.frames * 60) / render.fps);
    ok(`${kind}: the page lasts the loop, in time`, (await playerNote()).startsWith(frames + ' frames'),
       `${render.frames} at ${render.fps} fps → ${await playerNote()}`);
    const first = await pixels();
    await press(' ');
    await wait(2500);
    const rate = await page.eval(`document.querySelector('.bar span:nth-child(3)').textContent`);
    await press(' ');
    const at = await count();
    ok(`${kind}: plays in real time, and moves`, at > 60 && (await pixels()) !== first,
       `frame ${at} after 2.5 s, painting ${rate || 'nothing'}`);
    await press('.');
    ok(`${kind}: paused, a key steps one frame`, (await count()) === (at % frames) + 1);
  }
  if (loops.length) {
    const [kind, r] = loops[0];
    await go(BASE + '/apps/compose/?place=' + r.id);
    await page.until(settled, { timeout: 90000 });
    const { render } = await (await fetch(BASE + '/api/vault/' + r.id)).json();
    await type('page-side', 'fps', 30);
    const frames = Math.round((render.frames * 30) / render.fps);
    ok(`${kind} on a 30 fps page: as long, in fewer frames`, (await playerNote()).startsWith(frames + ' frames'),
       await playerNote());
  }

  // 6. Many placements: a still under two loops, the loops added with the picker.
  const three = ['still from gamepad', 'sequence from gamepad', 'sequence from ckt'].map(k => kinds.get(k));
  if (three.every(Boolean)) {
    const [st, ...added] = three;
    const rowsOf = () => page.eval(`[...document.querySelectorAll('#place-side .pl-row .pl-title')].map(t => t.textContent)`);
    const action = label => `[...document.querySelectorAll('#place-side .pl-actions .nb-btn')].find(b => b.textContent === '${label}')`;
    await go(BASE + '/apps/compose/?place=' + st.id);
    await page.until(settled, { timeout: 30000 });
    for (const [i, r] of added.entries()) {
      await page.click(action('Add…'));
      await page.until(`document.querySelectorAll('.vp--visible .vp-use').length > 0`);
      await page.click(`[...document.querySelectorAll('.vp--visible .vp-cell')].find(c =>
        c.querySelector('.vp-name')?.textContent === ${JSON.stringify(r.title)}
        && c.querySelector('.vp-sub')?.textContent.includes(${JSON.stringify(r.render.w + '×' + r.render.h)}))?.querySelector('.vp-use')`);
      await page.until(`document.querySelectorAll('#place-side .pl-row').length === ${i + 2}
        && (document.querySelector('.bar-say')?.textContent || '').includes(' on the page')`, { timeout: 90000 });
    }
    let rows = await rowsOf();
    ok('three placed, the top of the page listed first', rows.length === 3 && rows[2] === st.title, JSON.stringify(rows));
    const lengths = [];
    for (const r of added) {
      const { render } = await (await fetch(BASE + '/api/vault/' + r.id)).json();
      lengths.push(Math.round((render.frames * 60) / render.fps));
    }
    ok('the page lasts its longest loop', (await playerNote()).startsWith(Math.max(...lengths) + ' frames'),
       `${JSON.stringify(lengths)} → ${await playerNote()}`);

    // Choose the still, the bottom row, and move it below both loops.
    await page.click(`[...document.querySelectorAll('#place-side .pl-row')].at(-1)`);
    await page.until(`document.querySelector('#place-side .pp-object-name')?.textContent === ${JSON.stringify(st.title)}`);
    ok('choosing a row puts it in the panel', true, st.title);
    const before = await pixels();
    await type('place-side', 'x from centre', -400);
    await type('place-side', 'y from centre', 600);
    ok('an edit moves the chosen one', (await pixels()) !== before);
    await shot('06-three-placed');

    // It is 228 x 501 at scale 1, centred at (220, 1477) on the page: find it after the loops have played.
    s = await look();
    const k = s.w / SHEET.width;
    const inStill = `(() => { const c = document.getElementById('page'), k = ${k};
      const d = c.getContext('2d').getImageData(Math.round(120 * k), Math.round(1250 * k),
                                               Math.round(200 * k), Math.round(450 * k)).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] && (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200)) n++;
      return n; })()`;
    const inkFirst = await page.eval(inStill);
    await press(' ');
    await wait(2000);
    await press(' ');
    const inkLater = await page.eval(inStill);
    ok('a still stays while the loops play', inkFirst > 100 && inkLater === inkFirst,
       `${inkFirst} ink pixels at frame 1, ${inkLater} at frame ${await count()}`);

    await page.click(action('Remove'));
    await wait(250);                             // the page repaints on the next frame
    rows = await rowsOf();
    ok('Remove takes the chosen one off', rows.length === 2 && !rows.includes(st.title), JSON.stringify(rows));
    ok('and the page no longer draws it', (await page.eval(inStill)) === 0);

    // On the page itself: pick up what is on top, drag it, send it back, let go of everything.
    const [left, top, width, height] = await page.eval(`(() => { const r = document.getElementById('page')
      .getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`);
    const client = ([x, y]) => [left + (x * width) / SHEET.width, top + (y * height) / SHEET.height];
    const [loopA, loopB] = added;
    await page.pointer(client([620, 877]));
    await page.until(`document.querySelector('#place-side .pp-object-name')?.textContent === ${JSON.stringify(loopB.title)}`);
    ok('a press on the page chooses what is on top there', true, loopB.title);
    const x0 = Number(await page.eval(row('place-side', 'x from centre') + '.querySelector(".pp-num").value'));
    await page.pointer(client([620, 877]), client([620 + 100, 877]));
    const x1 = Number(await page.eval(row('place-side', 'x from centre') + '.querySelector(".pp-num").value'));
    ok('dragged, it follows the pointer in page pixels', Math.abs(x1 - x0 - 100) <= 2, `x ${x0} → ${x1}`);
    await page.click(action('↓'));
    rows = await rowsOf();
    ok('↓ sends it under the one below', JSON.stringify(rows) === JSON.stringify([loopA.title, loopB.title]),
       JSON.stringify(rows));
    await page.pointer(client([100, 100]));
    ok('a press on bare paper chooses nothing', await page.eval(action('Remove') + '.disabled'));

    // 7. Saved: the two loops left, as a composition in the vault copy.
    const saved = async () => {
      await page.eval(`document.querySelector('.bar-say').textContent = ''`);
      await press('S');
      await page.until(`/^saved |failed/.test(document.querySelector('.bar-say')?.textContent || '')`, { timeout: 120000 });
      return (await page.eval(`document.querySelector('.bar-say').textContent`)).match(/^saved (\S+)/);
    };
    const m = await saved();
    ok('S saves the page to the vault', !!m, m ? m[1] : await page.eval(`document.querySelector('.bar-say').textContent`));
    if (m) {
      const o = await (await fetch(BASE + '/api/vault/' + m[1])).json();
      const refs = (o.recipe.place || []).map(b => b.ref);
      ok('a composition, its recipe the page and the list', o.type === 'composition' && !!o.recipe.page
         && JSON.stringify(refs) === JSON.stringify([loopB.id, loopA.id]), `${o.type}: ${JSON.stringify(refs)}`);
      ok('made from what it places, bottom first', JSON.stringify(o.parents) === JSON.stringify(refs));
      ok('the drag is in its recipe', o.recipe.place[0].transform.x === x1, JSON.stringify(o.recipe.place[0].transform));
      ok('it moves: its frames are the page\'s', o.render.frames === Math.max(...lengths) && o.render.fps === 60,
         `${o.render.frames} frames at ${o.render.fps}`);
      ok('its render is the page, with a thumbnail', o.render.w === 1240 && o.render.h === 1754 && !!o.thumb,
         `${o.render.w}×${o.render.h}, thumb ${o.thumb}`);
      const again = await saved();
      ok('saved again unchanged, it is the same object', !!again && again[1] === m[1], again ? again[1] : 'none');
    }
  }
  const noise = kit.quiet();
  ok('the console stayed quiet on every page', !noise.length, JSON.stringify(noise.slice(0, 3)));

  // 8. No vault at all: rule 7.
  await page.goto(kit.plain + '/apps/compose/', { settle: 1500 });
  s = await look();
  ok('with no vault it boots and says so', s.vault === 'no vault' && s.out === '1240 × 1754 px', s.vault);
  await shot('05-no-vault');
} catch (err) {
  ok(err.message, false);
} finally {
  await kit.finish();
}
