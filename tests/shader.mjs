/**
 * tests/shader.mjs — run with: node tests/shader.mjs
 *
 * Covers what the shader app holds without a GPU (apps/shader/): a chain cut
 * at a row, a recipe's loop, and the starters — each a row of data that the
 * catalogue must be able to run: every row a filter of it, every value a
 * param of that filter and one its schema allows, the first row a generator
 * laid over nothing. What they draw is check-shader's.
 */

const { cut, loopOf, isLife } = await import('../apps/shader/frames.js');
const { STARTERS, FIRST } = await import('../apps/shader/starters.js');
const { FILTERS } = await import('../core/gpu/filters/index.js');
const { defineParams } = await import('../core/params.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(56), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

const chain = ['a', 'b', 'c'];
ok('cut at a row: the rows down to it', cut(chain, 1), ['a', 'b']);
ok('cut at the first: it alone', cut(chain, 0), ['a']);
ok('cut at the last, or past it: the whole', [cut(chain, 2), cut(chain, 9)], [chain, chain]);
ok('not cut: the whole', [cut(chain), cut(chain, -1)], [chain, chain]);
ok('a loop is its frames, at least one', [loopOf({ frames: 48 }), loopOf({ frames: 0 }), loopOf({})], [48, 1, 1]);

/** What is wrong with a chain, row by row; nothing when the catalogue runs it as written. */
function wrong(list) {
  const out = [];
  list.forEach((row, i) => {
    const filter = FILTERS[row.id];
    if (!filter) return out.push(`${i}: no ${row.id}`);
    const params = defineParams('test:' + row.id, filter.params || {});
    for (const [k, v] of Object.entries(row.params)) {
      if (!(k in (filter.params || {}))) { out.push(`${i}: ${row.id} has no ${k}`); continue; }
      params.set({ [k]: v });
      if (JSON.stringify(params.get(k)) !== JSON.stringify(v)) out.push(`${i}: ${row.id}.${k} ${JSON.stringify(v)} kept as ${JSON.stringify(params.get(k))}`);
    }
  });
  return out;
}

ok('what the app opens on: one generator', [FIRST.length, !!FILTERS[FIRST[0].id].generates, wrong(FIRST)], [1, true, []]);
ok('four starters, each its own; the last a life', [STARTERS.map(s => s.id), STARTERS.map(s => s.values.time)],
  [['fire', 'smoke', 'energy', 'burst'], ['loop', 'loop', 'loop', 'life']]);
ok('a life is played once: its frames no loop', [isLife({ time: 'life' }), isLife({ time: 'loop' }), isLife({})], [true, false, false]);
for (const s of STARTERS) {
  ok(`${s.id}: every row the catalogue's, every value its schema's`, wrong(s.chain), []);
  const first = s.chain[0];
  ok(`${s.id}: begun by a generator, over nothing`, [!!FILTERS[first.id].generates, first.params.blend || 'replace'], [true, 'replace']);
  ok(`${s.id}: frames to play, said in a line`, [s.values.frames > 1, s.values.fps > 0, s.about.length > 20], [true, true, true]);
  // What scrolls is a whole number of tiles a loop: the schema's ints, so the loop closes (tests/gpu-filters.mjs).
  const scrolls = s.chain.flatMap(r => ['scroll', 'scrollX', 'scrollY'].filter(k => k in r.params).map(k => r.params[k]));
  ok(`${s.id}: it moves, by whole tiles`, [scrolls.length > 0, scrolls.every(Number.isInteger)], [true, true]);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
