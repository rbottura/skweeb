#!/usr/bin/env node
/**
 * scripts/check-compose-export.mjs — a page out of compose, at print scale,
 * checked in a real browser.
 *
 *   node scripts/check-compose-export.mjs [--keep]
 *
 * M4's last clause, "renders at print scale", as checks (scripts/check-kit.mjs
 * starts the server on a copy of the vault and headless Chrome):
 *
 *   its own size        every kind of object opened at scale 1 and 2 keeps the
 *                       size of its render; an app draws its frames at twice
 *                       the pixels, a picture says it stays its pixels
 *   drawn again         a grid dither at 2x has far more fine detail drawn
 *                       again than stretched from 1x
 *   the PNG             A4 at scale 2 downloads as 2480 x 3508, and the bar
 *                       names what was stretched
 *   the frames          a moving page at 12 fps downloads as a zip of its
 *                       frames and a meta.json that says so
 *   the save            a composition saved at scale 2 renders at 2480 x 3508
 *
 * Not in the tests loop: it needs Chrome, and a vault with things in it.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck } from './check-kit.mjs';

const kit = await startCheck({ keep: process.argv.includes('--keep') });
const { page, ok, go, shot } = kit;
const BASE = kit.base;
const DL = path.join(kit.dir, 'downloads');

const said = () => page.eval(`document.querySelector('.bar-say').textContent`);
const set = async (side, label, value) => {
  await page.typeInto(`[...document.querySelectorAll('#${side} .pp-row')]
    .find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(label)})?.querySelector('.pp-num')`, value);
  await new Promise(r => setTimeout(r, 250));
};
/** Press an Export button, and wait for what it announces — not the last thing said. */
const run = async (label, done) => {
  await page.eval(`document.querySelector('.bar-say').textContent = ''`);
  await page.click(`[...document.querySelectorAll('#page-side .nb-btn')].find(b => b.textContent.startsWith(${JSON.stringify(label)}))`);
  await page.until(`${done}.test(document.querySelector('.bar-say')?.textContent || '') || /failed/.test(document.querySelector('.bar-say')?.textContent || '')`,
    { timeout: 600000 });
  return said();
};
/** A downloaded file, once it has finished. */
const downloaded = async ending => {
  for (let i = 0; i < 100; i++) {
    const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => n.endsWith(ending));
    if (f) return path.join(DL, f);
    await new Promise(r => setTimeout(r, 200));
  }
  return null;
};
const pngSize = file => { const b = fs.readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

try {
  await page.downloadsTo(DL);
  const rows = (await (await fetch(BASE + '/api/vault')).json()).objects || [];
  const pick = (type, app) => rows.find(r => r.type === type && r.origin && r.origin.app === app);
  const gridLoop = rows.find(r => r.type === 'sequence' && r.origin.app === 'grid');
  const still = pick('still', 'gamepad');

  // 1. Every kind at scale 1 and 2.
  await go(BASE + '/apps/compose/');
  const kinds = [['gamepad loop', pick('sequence', 'gamepad')], ['gamepad still', still], ['grid loop', gridLoop],
                 ['ckt loop', pick('sequence', 'ckt')], ['ckt still', pick('still', 'ckt')], ['shape', pick('shape', 'gamepad')]];
  for (const [kind, row] of kinds) {
    if (!row) { console.log(`     (no ${kind} in the vault)`); continue; }
    const r = await page.eval(`(async () => {
      const { Vault } = await import('/core/vault.js');
      const { openFrames } = await import('/core/rebuild.js');
      const { object, url } = await Vault.load(${JSON.stringify(row.id)});
      const out = [];
      for (const s of [1, 2]) {
        const h = await openFrames(object, { url, scale: s });
        const b = h.bounds || { w: h.width, h: h.height }, c = h.frame(0);
        out.push({ own: [b.w, b.h], scale: h.scale || 1, frame: [c.width, c.height] });
        h.dispose();
      }
      return out;
    })()`);
    const [one, two] = r;
    const redrawn = two.scale === 2;
    ok(`${kind}: its own size is its render's, at either scale`,
       JSON.stringify(one.own) === JSON.stringify(two.own) && one.own[0] === row.render.w && one.own[1] === row.render.h,
       `${one.own.join('×')} against ${row.render.w}×${row.render.h}`);
    ok(`${kind}: ${redrawn ? 'drawn again at twice the pixels' : 'a picture: it says it stays its pixels'}`,
       redrawn ? Math.abs(two.frame[0] - 2 * one.frame[0]) <= 2 : two.scale === 1 && two.frame[0] === one.frame[0],
       `${two.frame.join('×')}, scale ${two.scale}`);
  }

  // 2. Drawn again against stretched, on a grid dither.
  if (gridLoop) {
    const d = await page.eval(`(async () => {
      const { Vault } = await import('/core/vault.js');
      const { openFrames } = await import('/core/rebuild.js');
      const { object, url } = await Vault.load(${JSON.stringify(gridLoop.id)});
      const a = await openFrames(object, { url, scale: 1 }), b = await openFrames(object, { url, scale: 2 });
      const W = a.width * 2, H = a.height * 2;
      const draw = h => { const c = new OffscreenCanvas(W, H), x = c.getContext('2d');
        x.imageSmoothingQuality = 'high'; x.drawImage(h.frame(40), 0, 0, W, H); return c; };
      const detail = c => { const d = c.getContext('2d').getImageData(0, 0, W, H).data; let s = 0, s2 = 0, n = 0;
        const L = (x, y) => { const i = (y * W + x) * 4; return 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; };
        for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) {
          const v = 4 * L(x, y) - L(x - 1, y) - L(x + 1, y) - L(x, y - 1) - L(x, y + 1); s += v; s2 += v * v; n++; }
        return s2 / n - (s / n) ** 2; };
      return [detail(draw(a)), detail(draw(b))].map(Math.round);
    })()`);
    ok('a grid dither at 2x: drawn again, not stretched', d[1] > 3 * d[0], `fine detail ${d[1]} against ${d[0]}`);
  }

  // 3. The PNG: A4 at scale 2, a dither drawn again and a still stretched beside it.
  if (gridLoop && still) {
    await go(BASE + '/apps/compose/?place=' + gridLoop.id);
    await page.until(`(document.querySelector('.bar-say')?.textContent || '').includes(' on the page')`, { timeout: 90000 });
    await page.click(`[...document.querySelectorAll('#place-side .pl-actions .nb-btn')].find(b => b.textContent === 'Add…')`);
    await page.until(`document.querySelectorAll('.vp--visible .vp-use').length > 0`);
    await page.click(`[...document.querySelectorAll('.vp--visible .vp-cell')].find(c =>
      c.querySelector('.vp-name')?.textContent === ${JSON.stringify(still.title)}
      && c.querySelector('.vp-sub')?.textContent.includes(${JSON.stringify(still.render.w + '×' + still.render.h)}))?.querySelector('.vp-use')`);
    await page.until(`document.querySelectorAll('#place-side .pl-row').length === 2
      && (document.querySelector('.bar-say')?.textContent || '').includes(' on the page')`, { timeout: 90000 });
    await set('place-side', 'x from centre', 380);
    await set('page-side', 'scale', 2);
    const t0 = Date.now();
    const png = await run('Download the page', '/^downloaded/');
    const file = await downloaded('.png');
    ok('the page downloads as a PNG at print scale', !!file && JSON.stringify(pngSize(file)) === '[2480,3508]',
       `${file ? pngSize(file).join('×') : 'nothing'} in ${Date.now() - t0} ms`);
    ok('and the bar names what was stretched', png.includes('stretched') && png.includes(still.title), png);
    await shot('10-print-page');

    // 4. The frames of the moving page, at 12 fps and scale 1.
    await set('page-side', 'scale', 1);
    await set('page-side', 'fps', 12);
    const frames = await run('Download every frame', '/frames at/');
    const zip = await downloaded('_frames.zip');
    let count = 0, meta = null;
    if (zip) {
      const b = fs.readFileSync(zip);
      for (let off = 0; b.readUInt32LE(off) === 0x04034b50;) {
        const size = b.readUInt32LE(off + 18), nl = b.readUInt16LE(off + 26);
        const name = b.slice(off + 30, off + 30 + nl).toString();
        if (name === 'meta.json') meta = JSON.parse(b.slice(off + 30 + nl, off + 30 + nl + size).toString());
        else count++;
        off += 30 + nl + size;
      }
    }
    const want = Math.round((gridLoop.render.frames * 12) / (gridLoop.render.fps || 60));
    ok('a moving page downloads as its frames, zipped', !!meta && count === meta.frames && meta.frames === want,
       `${count} PNGs, meta ${JSON.stringify(meta)}; ${frames}`);
    ok('with its rate, for frames-to-video', !!meta && meta.fps === 12 && meta.width === 1240, JSON.stringify(meta));

    // 5. A save at scale 2 renders at print scale too.
    await set('page-side', 'scale', 2);
    const s = await run('Save to the vault', '/^saved /');
    const m = s.match(/^saved (\S+)/);
    const o = m ? await (await fetch(BASE + '/api/vault/' + m[1])).json() : null;
    ok('a save at scale 2 renders at print scale', !!o && o.render.w === 2480 && o.render.h === 3508 && o.render.density === 2,
       o ? `${o.render.w}×${o.render.h} at density ${o.render.density}` : s);
  }

  const noise = kit.quiet();
  ok('the console stayed quiet on every page', !noise.length, JSON.stringify(noise.slice(0, 3)));
} catch (err) {
  ok(err.message, false);
} finally {
  await kit.finish();
}
