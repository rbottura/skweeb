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
const { passesOf, reachOf, marginOf, drawsAtRandom } = await import('../core/gpu/runner.js');
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

// ── What draws at random ─────────────────────────────────────────────────────
ok('grain and glitch draw at random', ['grain', 'glitch'].every(id => FILTERS[id].random === true), true);
ok('and nothing else in the catalogue does',
  Object.values(FILTERS).filter(f => f.random).map(f => f.id).sort(), ['glitch', 'grain']);
ok('a chain with one draws at random', drawsAtRandom([{ id: 'blur' }, { id: 'grain' }]), true);
ok('switched off, it does not', drawsAtRandom([{ id: 'blur' }, { id: 'grain', on: false }]), false);
ok('a chain without one does not', drawsAtRandom([{ id: 'blur' }, { id: 'halftone' }]), false);
ok('unsharp mask blurs with the blur\'s own two passes, then one of its own',
  FILTERS.unsharp.passes.length === 3 && FILTERS.unsharp.passes[0].code === FILTERS.blur.passes[0].code, true);
ok('a filter this catalogue lacks is left out, not thrown', reachOf([{ id: 'nope' }, { id: 'blur', params: { radius: 1 } }]), 3);
ok('the room at 2x is twice the pixels', marginOf([{ id: 'blur', params: { radius: 4 } }], 2), 24);
ok('and whole pixels at any scale', marginOf([{ id: 'blur', params: { radius: 1.5 } }], 1.5), 8);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
