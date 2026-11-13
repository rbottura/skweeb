/**
 * tests/gpu-filters.mjs — run with: node tests/gpu-filters.mjs
 *
 * The filter catalogue as data (core/gpu/filters/), checked without a GPU:
 * every filter says where it came from and under what licence (rule 5), its
 * params are a schema core/params.js takes, and its WGSL keeps the two rules
 * the runner depends on — an `fx`, and a `Params` of f32 fields whose count
 * is what its uniforms() returns. Compiling and running the shaders is the
 * browser check's: node scripts/check-gpu.mjs.
 */

import fs from 'node:fs';
const { FILTERS } = await import('../core/gpu/filters/index.js');
const { passesOf, reachOf, readsOf, marginOf, drawsAtRandom } = await import('../core/gpu/runner.js');
const { moduleFor } = await import('../core/gpu/wgsl.js');
const { PARAM_TYPES, valuesFor } = await import('../core/params.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(56), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

const LICENCES = ['MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', 'ISC', 'Zlib', 'CC0-1.0'];
const RESERVED = /\b(?:let|var|fn|struct)\s+(filter|pass|target|type|module|set|self|shared|smooth|precise|resource|common)\b/;
const info = { width: 64, height: 64, scale: 1, time: 0, seed: 7 };

// ── Every filter, the same rules ─────────────────────────────────────────────
const all = Object.entries(FILTERS);
ok('the catalogue has filters', all.length > 0, true);

for (const [key, f] of all) {
  const name = f.id + ': ';
  ok(name + 'listed under its own id', key, f.id);
  ok(name + 'has a label', typeof f.label === 'string' && f.label.length > 0, true);
  ok(name + 'says where it came from', f.source === 'skweeb' || /^https:\/\//.test(f.source), true);
  if (f.source !== 'skweeb') {
    ok(name + 'keeps its copyright line', typeof f.copyright === 'string', true);
    const notice = new URL('../core/gpu/filters/' + (f.notice || '-'), import.meta.url);
    ok(name + 'the whole text of its licence is beside it', fs.existsSync(notice)
      && fs.readFileSync(notice, 'utf8').includes(f.copyright), true);
  }
  ok(name + 'a licence that allows a game', LICENCES.includes(f.licence), true);

  const schema = f.params || {};
  ok(name + 'every param a known type', Object.values(schema).every(s => PARAM_TYPES.includes(s.type)), true);
  const defaults = valuesFor(schema, {});
  ok(name + 'its defaults come back as themselves', valuesFor(schema, defaults), defaults);

  ok(name + 'at least one pass', Array.isArray(f.passes) && f.passes.length > 0, true);
  f.passes.forEach((p, i) => {
    const pass = `${name}pass ${i} `;
    ok(pass + 'defines fx(uv) -> vec4f', /fn fx\(uv: vec2f\) -> vec4f/.test(p.code), true);
    ok(pass + 'names nothing WGSL reserves', RESERVED.test(p.code), false);
    const struct = p.code.match(/struct Params \{([^}]*)\}/);
    if (!p.uniforms) {
      ok(pass + 'takes no params, reads none', /params\./.test(p.code), false);
      return;
    }
    ok(pass + 'declares its Params', !!struct, true);
    if (!struct) return;
    // f32 fields, and last at most one array<vec4f, N> after a multiple of four of them.
    const fields = struct[1].split(/,(?![^<]*>)/).map(s => s.trim()).filter(Boolean);
    const tail = /^\w+: array<vec4f, (\d+)>$/.exec(fields[fields.length - 1] || '');
    const flat = tail ? fields.slice(0, -1) : fields;
    ok(pass + 'Params is f32 fields, a vec4f array last', flat.every(s => /^\w+: f32$/.test(s))
      && (!tail || flat.length % 4 === 0), true);
    const numbers = p.uniforms(defaults, info);
    ok(pass + 'uniforms() fills every field', numbers.length, flat.length + (tail ? 4 * Number(tail[1]) : 0));
    ok(pass + 'with finite numbers', numbers.every(Number.isFinite), true);
    ok(pass + 'and the module binds params', /@binding\(3\) var<uniform> params: Params/.test(moduleFor(p)), true);
  });
}

// ── A chain, read ────────────────────────────────────────────────────────────
const chain = [
  { id: 'brightness', params: { amount: 0.2 } },
  { id: 'blur', params: { radius: 'lots' }, on: false },
  { id: 'blur', params: { radius: 999 } },
  { id: 'pixelate' },
];
const passes = passesOf(chain);
ok('an entry switched off is skipped', passes.map(p => p.label), ['brightness.0', 'blur.0', 'blur.1', 'pixelate.0']);
ok('a value past its range is held to it', passes[1].values, { radius: 64 });
ok('a missing value is its default', passes[3].values, { size: 8 });
let thrown = '';
try { passesOf([{ id: 'nope' }]); } catch (err) { thrown = err.message; }
ok('an unknown filter is named', thrown.includes('"nope"'), true);

// ── Sizes follow the print scale ─────────────────────────────────────────────
const at = (id, values, scale) => FILTERS[id].passes[0].uniforms(values, { ...info, scale });
ok('a blur of 2 at 2x is a blur of 4 at 1x', at('blur', { radius: 2 }, 2), at('blur', { radius: 4 }, 1));
ok('its taps reach three deviations', at('blur', { radius: 4 }, 1)[3], 12);
ok('a block of 8 at 2x is 16 pixels', at('pixelate', { size: 8 }, 2), [16]);
ok('a blur of nothing takes no taps', at('blur', { radius: 0 }, 1)[3], 0);
ok('an outline looks its width and a pixel past', at('outline', { width: 2, colour: '#000000' }, 2), [6]);
ok('a palette of two fills two of 32 places', at('palette', { colours: ['#000000', '#ffffff'] }, 1).slice(0, 12),
  [2, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0]);

// ── How far a chain reaches past its picture ────────────────────────────────
ok('a colour change reaches nowhere', reachOf([{ id: 'brightness' }, { id: 'contrast' }]), 0);
ok('a blur reaches its three deviations', reachOf([{ id: 'blur', params: { radius: 4 } }]), 12);
ok('two blurs, their reaches added, rounded up',
  reachOf([{ id: 'blur', params: { radius: 1.5 } }, { id: 'blur', params: { radius: 2 } }]), 11);
ok('a filter switched off reaches nowhere', reachOf([{ id: 'blur', params: { radius: 4 }, on: false }]), 0);
ok('an outline reaches its width and a pixel', reachOf([{ id: 'outline', params: { width: 2 } }]), 3);
ok('a shadow reaches as far as it goes and its softness',
  reachOf([{ id: 'shadow', params: { x: -5, y: 3, softness: 2 } }]), 11);
ok('palette lock reaches nowhere', reachOf([{ id: 'palette' }]), 0);
ok('edges reach the line round the outside', reachOf([{ id: 'edges' }]), 1);
ok('dilate reaches its radius, erode nowhere',
  [reachOf([{ id: 'dilate', params: { radius: 2 } }]), reachOf([{ id: 'erode', params: { radius: 2 } }])], [2, 0]);
ok('sharpening reaches nowhere: what it pushes past the edge is held to nothing',
  reachOf([{ id: 'sharpen' }, { id: 'unsharp' }, { id: 'emboss' }]), 0);
ok('a CRT reaches as far as its colours split; a glitch as far as it tears, and splits',
  [reachOf([{ id: 'crt', params: { split: 2 } }]), reachOf([{ id: 'glitch', params: { shift: 10, split: 2 } }])], [2, 12]);

ok('a motion blur reaches half its length; zoom blur, dither and gradient map nowhere',
  [reachOf([{ id: 'motionblur', params: { length: 8 } }]), reachOf([{ id: 'zoomblur' }, { id: 'dither' }, { id: 'gradientmap' }])], [4, 0]);
// ── How far a chain reads round a pixel: what a window of its picture needs ──
ok('a colour change reads nowhere; a blur as far as it reaches', [readsOf([{ id: 'brightness' }]), readsOf([{ id: 'blur', params: { radius: 4 } }])], [0, 12]);
ok('a pixelation reads its block; dots and a halftone their cell', [readsOf([{ id: 'pixelate', params: { size: 8 } }]),
  readsOf([{ id: 'dots', params: { cell: 6 } }]), readsOf([{ id: 'halftone', params: { cell: 10 } }])], [8, 6, 10]);
ok('erode reads its radius, though it spreads nowhere; unsharp its blur', [readsOf([{ id: 'erode', params: { radius: 2 } }]),
  readsOf([{ id: 'unsharp', params: { radius: 2 } }])], [2, 6]);
ok('a chain reads its filters added up, one switched off not at all',
  readsOf([{ id: 'pixelate', params: { size: 8 } }, { id: 'sharpen' }, { id: 'blur', params: { radius: 1 }, on: false }]), 9);
ok('a zoom blur reads from anywhere: no window holds it', readsOf([{ id: 'blur' }, { id: 'zoomblur' }]) === Infinity, true);
ok('every filter reads at least as far as it reaches', all.filter(([, f]) => {
  const v = valuesFor(f.params || {}, {});
  return (f.reads ? f.reads(v) : 0) < (f.reach && f.reads ? f.reach(v) : 0);
}).map(([id]) => id), []);

ok('a motion blur steps no more than a pixel, both ways',
  FILTERS.motionblur.passes[0].uniforms({ length: 10, angle: 90 }, { scale: 1 }).map(v => Math.round(v * 1000) / 1000), [0, 1, 5]);
ok('a gradient of three fills three of sixteen stops',
  FILTERS.gradientmap.passes[0].uniforms({ colours: ['#000000', '#ff0000', '#ffffff'], amount: 1 }).slice(0, 16),
  [3, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0]);
ok('a 4×4 matrix is two bits a side', FILTERS.dither.passes[0].uniforms({ levels: 2, matrix: '4', size: 1, grey: false }, { scale: 1 })[1], 2);

// ── What draws at random ─────────────────────────────────────────────────────
ok('grain and glitch draw at random, and noise', ['grain', 'glitch', 'noise'].every(id => FILTERS[id].random === true), true);
ok('and nothing else in the catalogue does',
  Object.values(FILTERS).filter(f => f.random).map(f => f.id).sort(), ['glitch', 'grain', 'noise']);
ok('a chain with one draws at random', drawsAtRandom([{ id: 'blur' }, { id: 'grain' }]), true);
ok('switched off, it does not', drawsAtRandom([{ id: 'blur' }, { id: 'grain', on: false }]), false);
ok('a chain without one does not', drawsAtRandom([{ id: 'blur' }, { id: 'halftone' }]), false);
ok('unsharp mask blurs with the blur\'s own two passes, then one of its own',
  FILTERS.unsharp.passes.length === 3 && FILTERS.unsharp.passes[0].code === FILTERS.blur.passes[0].code, true);
ok('a filter this catalogue lacks is left out, not thrown', reachOf([{ id: 'nope' }, { id: 'blur', params: { radius: 1 } }]), 3);
ok('the room at 2x is twice the pixels', marginOf([{ id: 'blur', params: { radius: 4 } }], 2), 24);
ok('and whole pixels at any scale', marginOf([{ id: 'blur', params: { radius: 1.5 } }], 1.5), 8);

// ── The generators: what makes a picture (M15a, docs/vfx.md) ─────────────────
const { BLENDS, phaseOf } = await import('../core/gpu/filters/meet.js');
const { noiseAt } = await import('../core/gpu/filters/noise.js');
const makers = Object.values(FILTERS).filter(f => f.generates);
ok('noise, gradient and shape make their picture', makers.map(f => f.id).sort(), ['gradient', 'noise', 'shape']);
ok('each ends its Params with how it meets what is under it', makers.every(f =>
  /blend: f32, amount: f32 \}/.test(f.passes[0].code) && f.params.blend.options === BLENDS && f.params.amount.default === 1), true);
ok('…its blend the place of its name', makers.map(f => f.passes[0].uniforms({ ...valuesFor(f.params, {}), blend: 'mask' }, info).slice(-2)),
  [[2, 1], [2, 1], [2, 1]]);
ok('none reaches past its picture, none in pixels', makers.map(f => reachOf([{ id: f.id }]) + readsOf([{ id: f.id }])), [0, 0, 0]);
ok('a still is at phase 0; frame 12 of 48 a quarter in; the loop\'s length where it began',
  [phaseOf({ tick: 12 }), phaseOf({ tick: 12, frames: 48 }), phaseOf({ tick: 48, frames: 48 }), phaseOf(undefined)], [0, 0.25, 0, 0]);
ok('the phase is a number of the pass', FILTERS.noise.passes[0].uniforms(valuesFor(FILTERS.noise.params, {}), { tick: 12, frames: 48 })[7], 0.25);

const nv = valuesFor(FILTERS.noise.params, { scrollX: 1, scrollY: -2 });
const spots = Array.from({ length: 300 }, (_, i) => [(i * 0.6180339887) % 1, (i * 0.7548776662) % 1]);
const near = (a, b) => Math.abs(a - b) < 1e-9;
const greys = spots.map(([u, v]) => noiseAt(u, v, 64, 64, nv, 7));
ok('noise: a grey from 0 to 1, dark and light both', [greys.every(g => g >= 0 && g <= 1), Math.min(...greys) < 0.25, Math.max(...greys) > 0.75], [true, true, true]);
ok('…a tile: a whole picture across or down, the same grey', spots.every(([u, v], i) =>
  near(noiseAt(u + 1, v, 64, 64, nv, 7), greys[i]) && near(noiseAt(u, v - 1, 64, 64, nv, 7), greys[i])), true);
ok('…on a format twice as wide too, its cells still whole', spots.every(([u, v]) =>
  near(noiseAt(u + 1, v, 128, 64, nv, 7), noiseAt(u, v, 128, 64, nv, 7)) && near(noiseAt(u, v + 1, 128, 64, nv, 7), noiseAt(u, v, 128, 64, nv, 7))), true);
ok('…scrolled, it moves', spots.filter(([u, v], i) => Math.abs(noiseAt(u, v, 64, 64, nv, 7, 0.25) - greys[i]) > 0.02).length > 200, true);
ok('…a quarter of a loop is a quarter of a tile across, half a tile up', spots.every(([u, v], i) =>
  near(noiseAt(u + 0.25, v - 0.5, 64, 64, nv, 7, 0.25), greys[i])), true);
ok('…and the loop over, where it began', spots.every(([u, v], i) => near(noiseAt(u, v, 64, 64, nv, 7, 1), greys[i])), true);
ok('…another seed another noise, another variant another', [8, 7].map((seed, k) =>
  spots.filter(([u, v], i) => Math.abs(noiseAt(u, v, 64, 64, { ...nv, variant: k }, seed) - greys[i]) > 0.02).length > 200), [true, true]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
