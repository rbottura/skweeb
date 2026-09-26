#!/usr/bin/env node
/**
 * scripts/check-filters.mjs — filters, each against what it should do, on
 * the GPU.
 *
 *   node scripts/check-filters.mjs
 *
 * check-gpu.mjs holds the kit, and the catalogue up to its neighbourhood
 * filters; this file holds the batches after it — the stylise group so far:
 * halftone dots bigger where it is darker, coloured dots that stop between
 * cells, a CRT's lines, a vignette's dark corners; and grain and glitch, the
 * first filters that draw at random, held to rule 2 — the same seed and frame
 * give the same pixels, another seed or another frame others, and still
 * grain comes back the same when it is told not to move.
 *
 * Needs a GPU, as check-gpu.mjs does. Not in the tests loop.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;

/** Runs in the page; returns plain data. */
async function inPage() {
  const { createRunner } = await import('/core/gpu/runner.js');
  const runner = await createRunner();
  if (!runner) return { gpu: false };
  await runner.prepare(['halftone', 'dots', 'crt', 'vignette', 'grain', 'glitch'].map(id => ({ id })));

  const canvas = (w, h, draw) => {
    const el = Object.assign(document.createElement('canvas'), { width: w, height: h });
    draw(el.getContext('2d'));
    return el;
  };
  const read = picture => {
    const el = Object.assign(document.createElement('canvas'), { width: picture.width, height: picture.height });
    const ctx = el.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(picture, 0, 0);
    return Array.from(ctx.getImageData(0, 0, el.width, el.height).data);
  };
  const at = (d, w, x, y) => d.slice((y * w + x) * 4, (y * w + x) * 4 + 4);
  const flat = colour => canvas(64, 64, x => { x.fillStyle = colour; x.fillRect(0, 0, 64, 64); });
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const differing = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i]) n++; return n / (a.length / 4); };
  const out = { gpu: true };

  // Halftone: dark on the left, light on the right; the dots cover more of the dark.
  const halves = canvas(64, 64, x => { x.fillStyle = 'rgb(64,64,64)'; x.fillRect(0, 0, 32, 64);
    x.fillStyle = 'rgb(192,192,192)'; x.fillRect(32, 0, 32, 64); });
  const ht = read(runner.run(halves, [{ id: 'halftone', params: { cell: 8, angle: 45, ink: '#111111', paper: 'none' } }]));
  const cover = (x0, x1) => { let s = 0, n = 0;
    for (let y = 8; y < 56; y++) for (let x = x0; x < x1; x++) { s += at(ht, 64, x, y)[3]; n++; } return Math.round(s / n); };
  const inked = [];
  for (let i = 0; i < ht.length; i += 4) if (ht[i + 3] === 255) inked.push(ht[i]);
  out.halftone = { dark: cover(4, 28), light: cover(36, 60), ink: inked.length ? Math.max(...inked) : null };

  // Dots: each cell's colour in a disc at its centre, nothing at its corners.
  const dotted = read(runner.run(flat('#ff0000'), [{ id: 'dots', params: { cell: 8, size: 0.9 } }]));
  out.dots = { centre: at(dotted, 64, 3, 3), corner: at(dotted, 64, 0, 0)[3] };

  // CRT: a flat grey in dark lines down it, its alpha kept.
  const scanned = read(runner.run(flat('rgb(128,128,128)'), [{ id: 'crt', params: { lines: 3, darkness: 0.35, split: 0 } }]));
  const column = Array.from({ length: 12 }, (_, y) => at(scanned, 64, 10, y + 20)[0]);
  out.crt = { lightest: Math.max(...column), darkest: Math.min(...column), alpha: at(scanned, 64, 10, 20)[3] };

  // Vignette: the centre as it was, the corners gone dark.
  const lens = read(runner.run(flat('#ffffff'), [{ id: 'vignette', params: { strength: 1, size: 0.9, softness: 0.5 } }]));
  out.vignette = { centre: at(lens, 64, 32, 32)[0], corner: at(lens, 64, 0, 0)[0] };

  // Grain: drawn from the seed and the tick, never the clock.
  const grey = flat('rgb(128,128,128)');
  const grain = (seed, tick, moving = true) => read(runner.run(grey,
    [{ id: 'grain', params: { amount: 0.5, size: 1, moving } }], { seed, tick }));
  const g = grain(7, 0);
  out.grain = {
    again: same(g, grain(7, 0)),
    otherSeed: differing(g, grain(8, 0)),
    nextFrame: differing(g, grain(7, 1)),
    held: same(grain(7, 0, false), grain(7, 5, false)),
    mean: Math.round(g.filter((v, i) => i % 4 === 0).reduce((a, b) => a + b, 0) / (g.length / 4)),
  };

  // Glitch: every band torn, from the seed and the tick.
  const stripes = canvas(64, 64, x => { for (let i = 0; i < 64; i += 8) {
    x.fillStyle = i % 16 ? '#2040ff' : '#ffd000'; x.fillRect(i, 0, 8, 64); } });
  const src = read(stripes);
  const glitch = (seed, tick) => read(runner.run(stripes,
    [{ id: 'glitch', params: { shift: 12, bands: 8, rate: 1, split: 0, moving: true } }], { seed, tick }));
  const t = glitch(3, 0);
  out.glitch = { torn: differing(t, src), again: same(t, glitch(3, 0)), nextFrame: differing(t, glitch(3, 1)) };

  runner.dispose();
  return out;
}

await c.go(c.base + '/scripts/check-page.html');
const r = await page.eval(`(${inPage})()`);
c.ok('a GPU device on this page', r.gpu);
if (r.gpu) {
  const h = r.halftone;
  c.ok('halftone: dots cover more where it is darker', h.dark > h.light + 60, `dark side ${h.dark}, light side ${h.light} — mean coverage`);
  c.ok('in the ink it was given, on no paper', h.ink !== null && h.ink <= 20, 'ink channel ' + h.ink);
  c.ok('dots: each its cell\'s colour, nothing between', r.dots.centre.join() === '255,0,0,255' && r.dots.corner === 0,
    `centre ${r.dots.centre}, corner alpha ${r.dots.corner}`);
  c.ok('CRT: dark lines down a flat grey, alpha kept', r.crt.lightest - r.crt.darkest > 30 && r.crt.alpha === 255,
    `${r.crt.darkest} to ${r.crt.lightest}, alpha ${r.crt.alpha}`);
  c.ok('vignette: the centre kept, the corners dark', r.vignette.centre === 255 && r.vignette.corner < 40,
    `centre ${r.vignette.centre}, corner ${r.vignette.corner}`);
  const g = r.grain;
  c.ok('grain: the same seed and frame, the same grain', g.again);
  c.ok('another seed, other grain; another frame, other grain', g.otherSeed > 0.5 && g.nextFrame > 0.5,
    `${Math.round(g.otherSeed * 100)}% and ${Math.round(g.nextFrame * 100)}% of pixels differ`);
  c.ok('told not to move, the same on every frame', g.held);
  c.ok('and around the grey it was', Math.abs(g.mean - 128) <= 6, 'mean ' + g.mean);
  const t = r.glitch;
  c.ok('glitch: bands torn, the same for the same seed and frame', t.torn > 0.2 && t.again,
    `${Math.round(t.torn * 100)}% of pixels moved`);
  c.ok('and torn again on the next frame', t.nextFrame > 0.1, `${Math.round(t.nextFrame * 100)}% differ`);
}

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
