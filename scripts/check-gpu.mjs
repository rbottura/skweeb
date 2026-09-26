#!/usr/bin/env node
/**
 * scripts/check-gpu.mjs — the GPU kit (core/gpu/), in a real browser.
 *
 *   node scripts/check-gpu.mjs
 *
 * What node cannot check, because it has no GPU: every filter in the
 * catalogue compiles; a chain's picture reaches Canvas 2D in the same call,
 * as a handle's frame(i) needs; each filter lands on the pixels its formula
 * says, a sprite's edge does not go dark under a blur, sizes follow the
 * print scale, a broken shader names its own line — and a page with no
 * WebGPU gets null and a reason, not a throw. Measured, not held: how long a
 * chain of three takes on a 1024 × 1024 picture.
 *
 * Needs a GPU: WebGPU has no software fallback here, where WebGL had one
 * (docs/roadmap.md, *Still open* 4). Not in the tests loop, for that reason.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const PAGE = c.base + '/scripts/check-page.html';

/** Runs in the page. Everything it needs, it imports; it returns plain data. */
async function inPage() {
  const { createRunner } = await import('/core/gpu/runner.js');
  const { whyNoGpu } = await import('/core/gpu/device.js');
  const { FILTERS } = await import('/core/gpu/filters/index.js');
  const runner = await createRunner();
  if (!runner) return { gpu: false, why: whyNoGpu() };
  const out = { gpu: true, maxSide: runner.maxSide, format: runner.format };

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
  const at = (data, w, x, y) => data.slice((y * w + x) * 4, (y * w + x) * 4 + 4);
  const worst = (a, b) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);

  // Everything compiles, or prepare() says which pass did not.
  try {
    await runner.prepare(Object.keys(FILTERS).map(id => ({ id })));
    out.compiled = Object.keys(FILTERS);
  } catch (err) { out.compileError = err.message; return out; }

  // A gradient, and a band of half-transparent grey across its foot.
  const grad = canvas(64, 64, x => {
    for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) {
      x.fillStyle = `rgb(${i * 4},${j * 4},${(i + j) * 2})`;
      x.fillRect(i, j, 1, 1);
    }
    x.clearRect(0, 56, 64, 8);
    x.fillStyle = 'rgba(128,128,128,0.502)';
    x.fillRect(0, 56, 64, 8);
  });
  const src = read(grad);

  out.identity = worst(read(runner.run(grad, [])), src);

  const lit = read(runner.run(grad, [{ id: 'brightness', params: { amount: 0.2 } }]));
  out.brightOpaque = [at(src, 64, 10, 10), at(lit, 64, 10, 10)];
  out.brightHalf = [at(src, 64, 10, 60), at(lit, 64, 10, 60)];

  // The six from p5.FIP, each on one opaque pixel of the gradient, against its formula.
  const [pr, pg, pb] = at(src, 64, 10, 30).slice(0, 3).map(v => v / 255);
  const L709 = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
  const L601 = 0.299 * pr + 0.587 * pg + 0.114 * pb;
  const byte = v => Math.round(Math.min(1, Math.max(0, v)) * 255);
  const formulas = {
    saturation: [{ amount: 0 }, [L709, L709, L709]],
    invert: [{}, [1 - pr, 1 - pg, 1 - pb]],
    sepia: [{}, [L601 * 1.2, L601 * 0.9, L601 * 0.7]],
    duotone: [{ dark: '#ff0000', light: '#0000ff' }, [1 - L601, 0, L601]],
    threshold: [{ level: 0.5 }, L709 >= 0.5 ? [1, 1, 1] : [0, 0, 0]],
    posterize: [{ shades: 4 }, [pr, pg, pb].map(v => Math.min(Math.floor(v * 4), 3) / 3)],
  };
  out.ported = {};
  for (const [id, [params, want]] of Object.entries(formulas)) {
    const got = at(read(runner.run(grad, [{ id, params }])), 64, 10, 30);
    out.ported[id] = { got: got.slice(0, 3).join(','), want: want.map(byte).join(','),
      off: Math.max(...want.map((w, i) => Math.abs(byte(w) - got[i]))), alpha: got[3] };
  }
  out.invertHalf = [at(src, 64, 10, 60), at(read(runner.run(grad, [{ id: 'invert' }])), 64, 10, 60)];

  const hard = read(runner.run(grad, [{ id: 'contrast', params: { amount: 2 } }]));
  out.contrast = [at(hard, 64, 16, 16)[0], at(hard, 64, 48, 48)[0]];

  const blocks = read(runner.run(grad, [{ id: 'pixelate', params: { size: 8 } }]));
  let flat = 0, centred = 0;
  for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) {
    const first = at(blocks, 64, bx * 8, by * 8);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      flat = Math.max(flat, worst(at(blocks, 64, bx * 8 + x, by * 8 + y), first));
    }
    centred = Math.max(centred, worst(first, at(src, 64, bx * 8 + 4, by * 8 + 4)));
  }
  out.pixelate = { flat, centred };

  // One white pixel on black: the blur's own weights, pixel for pixel.
  const dot = canvas(64, 64, x => { x.fillStyle = '#000'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#fff'; x.fillRect(32, 32, 1, 1); });
  const blurred = read(runner.run(dot, [{ id: 'blur', params: { radius: 2 } }]));
  const weights = [];
  for (let i = -6; i <= 6; i++) weights.push(Math.exp(-(i * i) / 8));
  const sum = weights.reduce((a, b) => a + b, 0);
  let off = 0;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const wx = Math.abs(x - 32) <= 6 ? weights[x - 32 + 6] / sum : 0;
    const wy = Math.abs(y - 32) <= 6 ? weights[y - 32 + 6] / sum : 0;
    off = Math.max(off, Math.abs(at(blurred, 64, x, y)[0] - 255 * wx * wy));
  }
  out.blurOff = off;
  out.blurSymmetric = at(blurred, 64, 31, 32)[0] === at(blurred, 64, 33, 32)[0]
    && at(blurred, 64, 32, 31)[0] === at(blurred, 64, 32, 33)[0];

  // The print scale: a blur of 2 at 2x is a blur of 4 at 1x.
  out.scaled = worst(read(runner.run(dot, [{ id: 'blur', params: { radius: 2 } }], { scale: 2 })),
                     read(runner.run(dot, [{ id: 'blur', params: { radius: 4 } }])));

  // A red sprite on nothing, blurred: its edge fades, it does not go dark.
  const sprite = canvas(64, 64, x => { x.fillStyle = '#f00'; x.fillRect(24, 24, 16, 16); });
  const soft = read(runner.run(sprite, [{ id: 'blur', params: { radius: 3 } }]));
  let darkest = 255, tinted = 0, spread = 0;
  for (let i = 0; i < soft.length; i += 4) {
    if (soft[i + 3] >= 8) { darkest = Math.min(darkest, soft[i]); tinted = Math.max(tinted, soft[i + 1], soft[i + 2]); }
  }
  spread = at(soft, 64, 22, 32)[3];
  out.halo = { darkest, tinted, spread };

  // For game assets, on a red square on nothing (x and y 16 to 31).
  const square = canvas(48, 48, x => { x.fillStyle = '#f00'; x.fillRect(16, 16, 16, 16); });
  const blue = { id: 'outline', params: { width: 2, colour: '#0000ff' } };
  const lined = read(runner.run(square, [blue]));
  out.outline = { inside: at(lined, 48, 24, 24), one: at(lined, 48, 32, 24), two: at(lined, 48, 33, 24),
    past: at(lined, 48, 35, 24)[3], corner: at(lined, 48, 33, 33)[3] };
  // Second in a chain, its `orig` is its own input — the brightened square, not the source.
  out.outlineSecond = at(read(runner.run(square, [{ id: 'brightness', params: { amount: 0.2 } }, blue])), 48, 24, 24);
  const cast = read(runner.run(square, [{ id: 'shadow',
    params: { x: 4, y: 4, softness: 0, colour: '#000000', opacity: 1 } }]));
  out.shadow = { under: at(cast, 48, 34, 34), sprite: at(cast, 48, 24, 24), beside: at(cast, 48, 18, 34)[3] };

  // Palette lock: each pixel to the colour OKLab calls nearest, worked out here the same way.
  const lab = rgb => {
    const l = rgb.map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    const q = [0.4122214708 * l[0] + 0.5363325363 * l[1] + 0.0514459929 * l[2],
      0.2119034982 * l[0] + 0.6806995451 * l[1] + 0.1073969566 * l[2],
      0.0883024619 * l[0] + 0.2817188376 * l[1] + 0.6299787005 * l[2]].map(Math.cbrt);
    return [0.2104542553 * q[0] + 0.7936177850 * q[1] - 0.0040720468 * q[2],
      1.9779984951 * q[0] - 2.4285922050 * q[1] + 0.4505937099 * q[2],
      0.0259040371 * q[0] + 0.7827717662 * q[1] - 0.8086757660 * q[2]];
  };
  const palette = [[0, 0, 0], [255, 255, 255], [255, 0, 0]];
  const nearest = rgb => palette.reduce((best, p) => {
    const d = Math.hypot(...lab(p).map((v, i) => v - lab(rgb)[i]));
    return d < best.d ? { p, d } : best;
  }, { p: null, d: Infinity }).p;
  const locked = read(runner.run(grad, [{ id: 'palette', params: { colours: ['#000000', '#ffffff', '#ff0000'] } }]));
  out.palette = [[10, 30], [60, 2], [2, 2], [50, 40]].map(([x, y]) => ({
    at: `${x},${y}`, got: at(locked, 64, x, y).slice(0, 3).join(','), want: nearest(at(src, 64, x, y).slice(0, 3)).join(',') }));

  // The neighbourhood filters, on one step from dark (64) to light (192) at x = 16.
  const stair = canvas(32, 8, x => { x.fillStyle = 'rgb(64,64,64)'; x.fillRect(0, 0, 16, 8);
    x.fillStyle = 'rgb(192,192,192)'; x.fillRect(16, 0, 16, 8); });
  const row = (chain, xs) => { const d = read(runner.run(stair, chain)); return xs.map(x => at(d, 32, x, 4)[0]); };
  out.steps = {
    sharpen: row([{ id: 'sharpen', params: { amount: 1 } }], [4, 15, 16, 28]),
    unsharp: row([{ id: 'unsharp', params: { radius: 1, amount: 1 } }], [4, 15, 16, 28]),
    emboss: row([{ id: 'emboss', params: { strength: 1 } }], [4, 15, 28]),
    edges: row([{ id: 'edges', params: { level: 0.25 } }], [4, 15, 16, 28]),
  };
  const grownSq = read(runner.run(square, [{ id: 'dilate', params: { radius: 2 } }]));
  const shrunkSq = read(runner.run(square, [{ id: 'erode', params: { radius: 2 } }]));
  out.morph = { grown: [33, 34].map(x => at(grownSq, 48, x, 24)[3]), corner: at(grownSq, 48, 33, 33)[3],
    shrunk: [17, 18, 24].map(x => at(shrunkSq, 48, x, 24)[3]) };

  // A sprite trimmed to its ink: grown, a blur keeps its halo past the trim;
  // held, the size stays and what lies past the edge is the edge's colour.
  const tight = canvas(16, 16, x => { x.fillStyle = '#f00'; x.fillRect(0, 0, 16, 16); });
  const blur2 = [{ id: 'blur', params: { radius: 2 } }];
  const grown = runner.run(tight, blur2, { grow: true });
  const gw = grown.width, gh = grown.height;
  const g = read(grown);
  out.grow = { width: gw, height: gh, halo: at(g, gw, 2, gw >> 1)[3], centre: at(g, gw, gw >> 1, gh >> 1)[3] };
  out.held = { width: runner.run(tight, blur2).width, corner: at(read(runner.run(tight, blur2)), 16, 0, 0)[3] };

  // Mistakes are named.
  try { await runner.prepare([{ id: 'nope' }]); out.unknown = ''; } catch (err) { out.unknown = err.message; }
  try {
    await runner.compile({ code: 'fn fx(uv: vec2f) -> vec4f {\n  return nothing;\n}' }, 'rgba16float', 'broken');
    out.broken = '';
  } catch (err) { out.broken = err.message; }

  // How long a chain of three takes, the picture read back each time.
  const big = canvas(1024, 1024, x => {
    const g = x.createLinearGradient(0, 0, 1024, 1024);
    g.addColorStop(0, '#123'); g.addColorStop(1, '#fd8');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
  });
  const three = [{ id: 'brightness', params: { amount: 0.1 } }, { id: 'blur', params: { radius: 4 } },
    { id: 'pixelate', params: { size: 4 } }];
  const probe = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  const times = [];
  for (let i = 0; i < 21; i++) {
    const t = performance.now();
    probe.drawImage(runner.run(big, three), 0, 0, 1, 1);
    probe.getImageData(0, 0, 1, 1);
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  out.ms = Math.round(times[10] * 10) / 10;
  runner.dispose();
  return out;
}

/** Runs in a fresh page with WebGPU taken away. */
async function withoutGpu() {
  Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });
  const { createRunner } = await import('/core/gpu/runner.js');
  const { whyNoGpu } = await import('/core/gpu/device.js');
  let runner = 'threw';
  try { runner = await createRunner(); } catch { /* the thing checked */ }
  return { runner, why: whyNoGpu() };
}

await c.go(PAGE);
const r = await page.eval(`(${inPage})()`);
c.ok('a GPU device on this page', r.gpu, r.gpu ? `${r.format}, textures to ${r.maxSide}` : r.why);
if (r.gpu) {
  c.ok('every filter in the catalogue compiles', !!r.compiled, r.compiled ? r.compiled.join(', ') : r.compileError);
  if (r.compiled) {
    c.ok('no filters: the picture comes back as it went in', r.identity <= 1, 'worst channel off by ' + r.identity);
    const [was, now] = r.brightOpaque;
    c.ok('brightness +0.2 adds 51 to each channel', Math.abs(now[0] - was[0] - 51) <= 2, `${was[0]} → ${now[0]}`);
    const [hw, hn] = r.brightHalf;
    c.ok('on a half-clear pixel it moves the colour, not the alpha',
      hn[3] === hw[3] && Math.abs(hn[0] - (hw[0] + 51)) <= 3, `${hw} → ${hn}`);
    c.ok('contrast 2 pushes 64 to black and 192 to white', r.contrast[0] <= 2 && r.contrast[1] >= 253, r.contrast.join(', '));
    for (const [id, p] of Object.entries(r.ported)) {
      c.ok(`${id}, from p5.FIP, lands on its formula`, p.off <= 2 && p.alpha === 255, `${p.got} (formula ${p.want})`);
    }
    const [iw, ih] = r.invertHalf;
    c.ok('inverted, a half-clear pixel keeps its coverage', ih[3] === iw[3] && Math.abs(ih[0] - (255 - iw[0])) <= 2, `${iw} → ${ih}`);
    c.ok('pixelate: every block one colour', r.pixelate.flat === 0, 'worst in a block ' + r.pixelate.flat);
    c.ok('the colour the source had at its centre', r.pixelate.centred <= 1, 'off by ' + r.pixelate.centred);
    c.ok('a blur lands on its own Gaussian weights', r.blurOff <= 1.5, 'worst pixel off by ' + r.blurOff.toFixed(2));
    c.ok('and spreads the same both ways', r.blurSymmetric);
    c.ok('a blur of 2 at 2x is a blur of 4 at 1x', r.scaled === 0, 'off by ' + r.scaled);
    c.ok('a blurred sprite\'s edge stays red, never dark', r.halo.darkest >= 250 && r.halo.tinted <= 3,
      `reddest-to-darkest ${r.halo.darkest}, most green or blue ${r.halo.tinted}`);
    c.ok('and fades out past where it was', r.halo.spread > 0 && r.halo.spread < 255, 'alpha 2 px out: ' + r.halo.spread);
    const o = r.outline;
    c.ok('outline: the line one colour and its width, round the sprite',
      o.one.join() === '0,0,255,255' && o.two.join() === '0,0,255,255' && o.past === 0 && o.inside.join() === '255,0,0,255',
      `inside ${o.inside}, 1 out ${o.one}, 2 out ${o.two}, 4 out alpha ${o.past}`);
    c.ok('its corners round, as a pen draws them', o.corner > 0 && o.corner < 255, 'corner alpha ' + o.corner);
    c.ok('second in a chain, it lays back its own input, not the source',
      Math.abs(r.outlineSecond[1] - 51) <= 2 && r.outlineSecond[0] === 255, String(r.outlineSecond));
    const s = r.shadow;
    c.ok('drop shadow: cast where it was sent, under the sprite',
      s.under.join() === '0,0,0,255' && s.sprite.join() === '255,0,0,255' && s.beside === 0,
      `under ${s.under}, sprite ${s.sprite}, beside alpha ${s.beside}`);
    for (const p of r.palette) {
      c.ok(`palette lock: ${p.at} to the nearest colour in OKLab`, p.got === p.want, `${p.got} (nearest ${p.want})`);
    }
    const st = r.steps, near = (v, want, by = 2) => Math.abs(v - want) <= by;
    c.ok('sharpen pushes the two sides of a step apart, and leaves flat ground',
      near(st.sharpen[0], 64) && st.sharpen[1] === 0 && st.sharpen[2] === 255 && near(st.sharpen[3], 192), st.sharpen.join(', '));
    c.ok('unsharp mask does so against a true blur', near(st.unsharp[0], 64) && near(st.unsharp[1], 26, 3)
      && near(st.unsharp[2], 230, 3) && near(st.unsharp[3], 192), st.unsharp.join(', '));
    c.ok('emboss: flat ground mid grey, the step stood up', near(st.emboss[0], 128, 1) && st.emboss[1] === 255
      && near(st.emboss[2], 128, 1), st.emboss.join(', '));
    c.ok('edges: white on the step, black on flat ground',
      st.edges[0] === 0 && st.edges[1] === 255 && st.edges[2] === 255 && st.edges[3] === 0, st.edges.join(', '));
    const m = r.morph;
    c.ok('dilate grows a sprite by its radius, round at the corner',
      m.grown[0] === 255 && m.grown[1] === 0 && m.corner === 0, `2 out ${m.grown[0]}, 3 out ${m.grown[1]}, corner ${m.corner}`);
    c.ok('erode shrinks it by as much', m.shrunk.join() === '0,255,255', `alpha at 1, 2 and 8 in: ${m.shrunk}`);
    c.ok('grown, a trimmed sprite keeps its halo past the trim',
      r.grow.width === 28 && r.grow.height === 28 && r.grow.halo > 0 && r.grow.centre === 255,
      `${r.grow.width} × ${r.grow.height}, alpha 4 px past the trim ${r.grow.halo}`);
    c.ok('held, it keeps its size and its edge', r.held.width === 16 && r.held.corner === 255,
      `${r.held.width} wide, corner alpha ${r.held.corner}`);
    c.ok('an unknown filter is named', r.unknown.includes('"nope"'), r.unknown);
    c.ok('a broken shader names its own line', /broken does not compile — line 2/.test(r.broken), r.broken);
    c.ok('a chain of three on 1024 × 1024, read back', true, r.ms + ' ms a run');
  }
}

await c.go(PAGE);
const none = await page.eval(`(${withoutGpu})()`);
c.ok('no WebGPU: null and a reason, not a throw', none.runner === null && /no WebGPU/.test(none.why), none.why);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
