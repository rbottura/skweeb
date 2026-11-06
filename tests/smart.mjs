/**
 * tests/smart.mjs — run with: node tests/smart.mjs
 *
 * Covers core/smart.js without a vault: a smart object as the object it
 * binds. The promises — its id says what it is; unwrapped, it is the kind of
 * object its app made, its app's recipe and seed, its own id and picture, its
 * version; at a version kept, what it was then; and at its latest, no trip
 * to the vault.
 */

const { isSmart, unwrap, innerOf } = await import('../core/smart.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

const skw = {
  id: 'skw_1791324790511_ff3db6', type: 'skw', title: 'smoke', origin: { app: 'particles', version: '1.0.0' },
  recipe: { kind: 'bound', app: 'particles', type: 'sequence', recipe: { emit: { rate: 151 } }, seed: 7 },
  render: { file: 'render.png', w: 1080, h: 1080, frames: 60, fps: 30, loop: true }, version: 2,
};

ok('a smart object\'s id says so', [isSmart(skw.id), isSmart('par_1791324790511_ff3db6'), isSmart(null)], [true, false, false]);
const inner = unwrap(skw);
ok('unwrapped: the kind of object its app made', [inner.type, inner.origin.app], ['sequence', 'particles']);
ok('…its app\'s recipe and seed', [inner.recipe, inner.seed], [{ emit: { rate: 151 } }, 7]);
ok('…its own id, picture and version', [inner.id, inner.render.file, inner.render.frames, inner.version], [skw.id, 'render.png', 60, 2]);
const then = unwrap(skw, { version: 1, recipe: { kind: 'bound', app: 'particles', type: 'sequence', recipe: { emit: { rate: 90 } }, seed: 7 },
  render: { file: 'v1.png', w: 1080, h: 1080, frames: 60 } });
ok('at a version kept: what it was then, its picture of then', [then.recipe.emit.rate, then.render.file, then.version], [90, 'v1.png', 1]);
const latest = await innerOf(skw);
ok('at its latest, no trip to the vault', [latest.object.recipe.emit.rate, latest.url], [151, null]);
ok('a bound form with nothing in it is a still of no recipe', [unwrap({ id: 'skw_1_1', type: 'skw', recipe: null }).type, unwrap({ id: 'skw_1_1', type: 'skw' }).recipe], ['still', null]);

// L3: no page that comes to hold itself (core/cycles.js) — A holds B; B saved again holding A is refused.
const { cycleOf, chainSaid } = await import('../core/cycles.js');
const holding = { skw_A: ['skw_B'], skw_B: ['skw_C'], skw_C: [] };
const refsOf = id => holding[id] || [];
ok('A holding B, B saved again holding A: refused, the chain named', cycleOf('skw_B', ['skw_A'], refsOf), ['skw_B', 'skw_A', 'skw_B']);
ok('…itself at once, or through a state it names', [cycleOf('skw_A', ['skw_A'], refsOf), cycleOf('skw_C', ['skw_A@v2'], refsOf)],
  [['skw_A', 'skw_A'], ['skw_C', 'skw_A', 'skw_B', 'skw_C']]);
ok('a page holding what holds nothing of it: no chain', [cycleOf('skw_A', ['skw_B'], refsOf), cycleOf('skw_A', [], refsOf)], [null, null]);
ok('the chain in words, by title where it has one', chainSaid(['skw_B', 'skw_A', 'skw_B'], id => ({ skw_A: 'the poster' })[id]),
  'skw_B → the poster → skw_B');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
