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
  await runner.prepare(['halftone', 'dots', 'crt', 'vignette', 'grain', 'glitch',
    'gradientmap', 'motionblur', 'zoomblur', 'dither', 'noise', 'gradient', 'shape'].map(id => ({ id })));

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

  // Gradient map: black, red, white — a flat grey lands where its brightness is.
  const mapped = g => at(read(runner.run(flat(`rgb(${g},${g},${g})`),
    [{ id: 'gradientmap', params: { colours: ['#000000', '#ff0000', '#ffffff'], amount: 1 } }])), 64, 5, 5);
  out.gradient = { black: mapped(0), quarter: mapped(64), white: mapped(255) };

  // Motion blur: a white line one pixel wide, smeared across it, then along it.
  const line = canvas(64, 64, x => { x.fillStyle = '#000'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#fff'; x.fillRect(32, 0, 1, 64); });
  const across = read(runner.run(line, [{ id: 'motionblur', params: { length: 8, angle: 0 } }]));
  const along = read(runner.run(line, [{ id: 'motionblur', params: { length: 8, angle: 90 } }]));
  out.motion = { centre: at(across, 64, 32, 20)[0], near: at(across, 64, 35, 20)[0], far: at(across, 64, 37, 20)[0],
    along: at(along, 64, 32, 20)[0], beside: at(along, 64, 33, 20)[0] };

  // Zoom blur: a red square at the centre streaked outwards, the same twice.
  const sq = canvas(64, 64, x => { x.fillStyle = '#f00'; x.fillRect(24, 24, 16, 16); });
  const zoomed = () => read(runner.run(sq, [{ id: 'zoomblur', params: { strength: 0.5, x: 0.5, y: 0.5 } }]));
  const z = zoomed();
  out.zoom = { centre: at(z, 64, 32, 32), streak: at(z, 64, 44, 44)[3], clear: at(z, 64, 60, 60)[3], again: same(z, zoomed()) };

  // Ordered dither: a flat grey in two levels, as much white as it was light.
  const dithered = g => {
    const d = read(runner.run(flat(`rgb(${g},${g},${g})`), [{ id: 'dither', params: { levels: 2, matrix: '4', size: 1, grey: true } }]));
    let white = 0, between = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i] === 255) white++; else if (d[i] !== 0) between++; }
    return { white: white / (d.length / 4), between };
  };
  out.dither = { half: dithered(128), quarter: dithered(64) };

  // The generators (M15a): what makes a picture — over nothing, 64 by 64.
  {
    const { noiseAt } = await import('/core/gpu/filters/noise.js');
    const blank = canvas(64, 64, () => {});
    const red = flat('#ff0000');
    const px = (d, x, y) => at(d, 64, x, y);
    const nv = { cells: 4, octaves: 3, rough: 0.5, contrast: 1.5, variant: 0, scrollX: 1, scrollY: 0, blend: 'replace', amount: 1 };
    const noise = (opts, v = nv) => read(runner.run(blank, [{ id: 'noise', params: v }], opts));
    const n0 = noise({ seed: 7, tick: 0, frames: 16 });
    const n8 = noise({ seed: 7, tick: 8, frames: 16 });
    // A window of a bigger noise: the bottom right quarter of 128 by 128, against the whole.
    const whole = read(runner.run(canvas(128, 128, () => {}), [{ id: 'noise', params: nv }], { seed: 7 }));
    const part = read(runner.run(blank, [{ id: 'noise', params: nv }], { seed: 7, window: { x: 64, y: 64, width: 128, height: 128 } }));
    let worst = 0, lo = 255, hi = 0, shifted = 0, apart = 0;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const g = n0[(y * 64 + x) * 4];
      worst = Math.max(worst, Math.abs(g - Math.round(noiseAt((x + 0.5) / 64, (y + 0.5) / 64, 64, 64, nv, 7) * 255)));
      lo = Math.min(lo, g);
      hi = Math.max(hi, g);
      shifted = Math.max(shifted, Math.abs(n8[(y * 64 + x) * 4] - n0[(y * 64 + (x + 32) % 64) * 4]));
      apart = Math.max(apart, Math.abs(part[(y * 64 + x) * 4] - whole[((y + 64) * 128 + x + 64) * 4]));
    }
    out.genNoise = { worst, lo, hi, shifted, apart, alpha: n0[3],
      closes: same(noise({ seed: 7, tick: 16, frames: 16 }), n0), still: same(noise({ seed: 7, tick: 5 }), n0),
      moves: differing(noise({ seed: 7, tick: 1, frames: 16 }), n0),
      seed: differing(noise({ seed: 8 }), n0), variant: differing(noise({ seed: 7 }, { ...nv, variant: 1 }), n0) };

    const grad = (params, opts) => read(runner.run(blank, [{ id: 'gradient', params }], opts));
    const g0 = grad({ kind: 'along', angle: 0 }), g90 = grad({ kind: 'along', angle: 90 });
    const round = grad({ kind: 'round' }), ridge = grad({ kind: 'along', mirror: true }), fan = grad({ kind: 'about' });
    const rings = { kind: 'round', repeats: 4, scroll: 1 };
    const r0 = grad(rings, { tick: 0, frames: 8 });
    out.genGradient = {
      along: [px(g0, 0, 32)[0], px(g0, 32, 32)[0], px(g0, 63, 32)[0], px(g0, 32, 0)[0]],
      down: [px(g90, 32, 0)[0], px(g90, 32, 63)[0]],
      round: [px(round, 32, 32)[0], px(round, 48, 32)[0], px(round, 0, 0)[0]],
      flipped: px(grad({ kind: 'round', flip: true }), 32, 32)[0],
      ridge: [px(ridge, 0, 32)[0], px(ridge, 32, 32)[0], px(ridge, 63, 32)[0]],
      about: [px(fan, 48, 33)[0], px(fan, 32, 48)[0], px(fan, 16, 33)[0], px(fan, 32, 16)[0]],
      closes: same(grad(rings, { tick: 8, frames: 8 }), r0), moves: differing(grad(rings, { tick: 1, frames: 8 }), r0),
    };

    const shape = (params, on = blank) => read(runner.run(on, [{ id: 'shape', params }]));
    const disc = { kind: 'disc', size: 0.5, soft: 0 };
    const d = shape(disc), ring = shape({ kind: 'ring', size: 0.8, width: 0.25, soft: 0 });
    const star = shape({ kind: 'star', size: 0.8, points: 5, inner: 0.4, soft: 0 }), glow = shape({ kind: 'disc', size: 1, soft: 1 });
    const met = (blend, on) => { const m = shape({ ...disc, blend }, on); return [px(m, 32, 32).join(), px(m, 0, 0).join()]; };
    out.genShape = {
      disc: [px(d, 32, 32)[0], px(d, 44, 32)[0], px(d, 52, 32)[0], px(d, 0, 0).join()],
      ring: [px(ring, 32, 32)[0], px(ring, 54, 32)[0], px(ring, 44, 32)[0]],
      star: [px(star, 32, 32)[0], px(star, 32, 16)[0], px(star, 42, 17)[0]],
      glow: [px(glow, 32, 32)[0], px(glow, 48, 32)[0], px(glow, 63, 32)[0]],
      multiply: met('multiply', red), mask: met('mask', red), add: met('add', blank),
      screen: met('screen', flat('rgb(128,128,128)')),
      half: px(shape({ ...disc, amount: 0.5 }, red), 32, 32),
      none: same(shape({ ...disc, amount: 0 }, red), read(red)),
    };
  }

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

  const gm = r.gradient;
  c.ok('gradient map: black to its first stop, white to its last',
    gm.black.join() === '0,0,0,255' && gm.white.join() === '255,255,255,255', `${gm.black} · ${gm.white}`);
  c.ok('and a quarter grey halfway from black to red', Math.abs(gm.quarter[0] - 128) <= 2 && gm.quarter[1] === 0,
    String(gm.quarter));
  const m = r.motion;
  c.ok('motion blur: a line smeared four pixels either side, and no further',
    Math.abs(m.centre - 28) <= 2 && Math.abs(m.near - 28) <= 2 && m.far === 0, `${m.centre} · ${m.near} · ${m.far}`);
  c.ok('along the line, the line is left as it was', m.along === 255 && m.beside === 0, `${m.along} · ${m.beside}`);
  const zb = r.zoom;
  c.ok('zoom blur: streaked out from its centre, the centre kept',
    zb.centre.join() === '255,0,0,255' && zb.streak > 0 && zb.streak < 255 && zb.clear === 0,
    `streak alpha ${zb.streak}, far corner ${zb.clear}`);
  c.ok('and the same twice: no seed, no chance', zb.again);
  const d = r.dither;
  c.ok('ordered dither: half grey half white, a quarter a quarter, nothing between',
    d.half.white === 0.5 && d.quarter.white === 0.25 && !d.half.between && !d.quarter.between,
    `${d.half.white} and ${d.quarter.white} white`);

  // The generators (M15a, docs/vfx.md).
  const close = (a, b, by = 2) => Math.abs(a - b) <= by;
  const nz = r.genNoise;
  c.ok('noise: the grey core/noise.js gives, at every pixel', nz.worst <= 2 && nz.alpha === 255, `worst ${nz.worst} of 255`);
  c.ok('…dark and light both', nz.lo < 64 && nz.hi > 192, `${nz.lo} to ${nz.hi}`);
  c.ok('…a tile: scrolled half a loop, it is itself half a picture across', nz.shifted <= 1, `worst ${nz.shifted}`);
  c.ok('…the loop over, its first frame again; told no length, it holds still', nz.closes && nz.still);
  c.ok('…a frame on it has moved; another seed, another variant, another noise',
    nz.moves > 0.5 && nz.seed > 0.5 && nz.variant > 0.5, `${nz.moves} · ${nz.seed} · ${nz.variant} of its pixels`);
  c.ok('…and a window of a bigger one is its part of the whole', nz.apart <= 1, `worst ${nz.apart}`);
  const gd = r.genGradient;
  c.ok('gradient: along, dark at one edge and light at the other, every row the same',
    close(gd.along[0], 2) && close(gd.along[1], 129) && close(gd.along[2], 253) && gd.along[3] === gd.along[1], String(gd.along));
  c.ok('…turned a quarter, top to bottom', close(gd.down[0], 2) && close(gd.down[1], 253), String(gd.down));
  c.ok('…round: dark at its centre, grey half way, light past the picture\'s half; flipped, light at its centre',
    close(gd.round[0], 6) && close(gd.round[1], 132) && gd.round[2] === 255 && close(gd.flipped, 249), `${gd.round} · ${gd.flipped}`);
  c.ok('…there and back: a ridge', gd.ridge[0] < 8 && gd.ridge[1] > 247 && gd.ridge[2] < 8, String(gd.ridge));
  c.ok('…about: lighter clockwise round its centre',
    gd.about[0] < gd.about[1] && gd.about[1] < gd.about[2] && gd.about[2] < gd.about[3], String(gd.about));
  c.ok('…rings scrolled: a frame on they have moved, the loop over they are back', gd.moves > 0.5 && gd.closes, String(gd.moves));
  const sh = r.genShape;
  c.ok('shape: a disc light inside and dark out, opaque when it replaces',
    sh.disc.join() === '255,255,0,0,0,0,255', String(sh.disc));
  c.ok('…a ring: its band light, its middle and the inside of it dark', sh.ring.join() === '0,255,0', String(sh.ring));
  c.ok('…a star: its middle and a tip, up, light; the notch beside it dark', sh.star.join() === '255,255,0', String(sh.star));
  c.ok('…all soft, a glow: light at its centre, grey half way, nothing at its edge',
    sh.glow[0] >= 253 && close(sh.glow[1], 121, 4) && sh.glow[2] <= 1, String(sh.glow));
  c.ok('meeting what is under: multiplied, red inside and black out; masked, nothing out',
    sh.multiply.join(' ') === '255,0,0,255 0,0,0,255' && sh.mask.join(' ') === '255,0,0,255 0,0,0,0', `${sh.multiply} · ${sh.mask}`);
  c.ok('…added over nothing, its light alone; screened over grey, white inside and the grey out',
    sh.add.join(' ') === '255,255,255,255 0,0,0,0' && sh.screen.join(' ') === '255,255,255,255 128,128,128,255', `${sh.add} · ${sh.screen}`);
  c.ok('…half of it, half way to white; none of it, the picture as it was',
    sh.half[0] === 255 && close(sh.half[1], 128) && close(sh.half[2], 128) && sh.half[3] === 255 && sh.none, String(sh.half));
}

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
