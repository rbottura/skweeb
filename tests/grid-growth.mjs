/**
 * tests/grid-growth.mjs — run with: node tests/grid-growth.mjs
 *
 * Covers the arithmetic of apps/grid/growth.js: each cell's history, read back
 * from a frame — how long it has been filled, how long since it emptied and
 * what it held — across a loop's wrap and from a sequence's start; the sizes
 * that come of it, growing in and out; and that the look-back never reads
 * further than its depth, which is what lets a replayed source only walk
 * forward. The frames are index arrays written by hand; no canvas.
 */

const { historyAt, transitionAt, depthOf, advance, settled } = await import('../apps/grid/growth.js');
const { easing } = await import('../core/easing.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

/** Frames of one cell each, from a string: '.' empty, a digit the tile. */
const film = str => [...str].map(ch => Int16Array.from([ch === '.' ? -1 : Number(ch)]));
const lin = easing('linear');
const round = xs => [...xs].map(x => Math.round(x * 1000) / 1000);

/** One cell's history at frame i. */
function cell(str, i, { loop = true, growIn = 4, growOut = 0 } = {}) {
  const f = film(str);
  const h = historyAt(k => f[k], i, { frames: f.length, loop, growIn, growOut });
  return { age: h.ages[0], gap: h.gaps[0], last: h.last[0], then: h.then[0] };
}

// -- Growing in ------------------------------------------------------------------

ok('empty is 0, the frame it fills is 1', [cell('...1111111', 2).age, cell('...1111111', 3).age], [0, 1]);
ok('it counts up while it stays', cell('...1111111', 5).age, 3);
ok('to the growth\'s length and no further', cell('...1111111', 9).age, 4);
ok('a tile that changes is still a filled cell', cell('...1234567', 6, { growIn: 9 }).age, 4);
ok('a loop counts back across its wrap', cell('11......11', 1).age, 4);
ok('a sequence that does not loop starts from nothing', cell('11......11', 1, { loop: false }).age, 2);

// -- Growing out -----------------------------------------------------------------

ok('an emptied cell knows how long since, and what it had',
   cell('1115......', 5, { growOut: 4 }), { age: 0, gap: 2, last: 5, then: 4 });
ok('past the grow-out it is simply empty', cell('1115......', 8, { growOut: 4 }).gap, 0);
ok('and how grown it was when it went', cell('..15......', 5, { growIn: 9, growOut: 4 }).then, 2);
ok('grow-out without grow-in: the tile went at full size',
   cell('1115......', 4, { growIn: 0, growOut: 4 }), { age: 0, gap: 1, last: 5, then: 1 });

// -- The sizes ---------------------------------------------------------------------

{
  const now = Int16Array.from([2, -1, -1, 3]);
  const h = { ages: Uint16Array.from([1, 0, 0, 9]), gaps: Uint16Array.from([0, 1, 0, 0]),
              last: Int16Array.from([-1, 7, -1, -1]), then: Uint16Array.from([0, 4, 0, 0]) };
  const t = transitionAt(now, h, { growIn: 4, growOut: 4, ease: lin });
  ok('a just-filled cell a quarter grown, an old one full', round([t.scales[0], t.scales[3]]), [0.25, 1]);
  ok('a just-emptied cell still shows its tile', [t.indices[1], round([t.scales[1]])[0]], [7, 0.75]);
  ok('an empty cell shows nothing', [t.indices[2], t.scales[2]], [-1, 0]);
  const half = transitionAt(now, { ...h, then: Uint16Array.from([0, 2, 0, 0]) }, { growIn: 4, growOut: 4, ease: lin });
  ok('it shrinks from the size it had reached, not from full', round([half.scales[1]])[0], 0.375);
  const off = transitionAt(now, h, { growIn: 0, growOut: 4, ease: lin });
  ok('with no grow-in, a filled cell is full at once', [off.scales[0], off.scales[3]], [1, 1]);
}

// -- The look-back stays inside its depth --------------------------------------------

ok('depth: grow-in alone reads back growIn − 1', depthOf(4, 0), 3);
ok('with grow-out, the longest gap and then the tile\'s age', depthOf(4, 5), 7);
ok('none at all', depthOf(0, 0), 0);
{
  // Twenty frames, a cell flickering: every frame read must be within depth of i.
  const f = film('1.11.1111..1.1111.1.');
  let furthest = 0;
  for (const [gi, go] of [[2, 0], [3, 3], [0, 6], [6, 6]]) {
    for (let i = 0; i < f.length; i++) {
      historyAt(k => { furthest = Math.max(furthest, ((i - k) % 20 + 20) % 20); return f[k]; }, i,
        { frames: 20, loop: true, growIn: gi, growOut: go });
      if (furthest > depthOf(gi, go)) break;
    }
    ok(`grow ${gi}/${go}: it never reads past depth ${depthOf(gi, go)}`, furthest <= depthOf(gi, go), true);
    furthest = 0;
  }
}

// -- The tracker: a frame at a time is exactly the look-back ------------------------

{
  // A seeded shuffle, so a failure can be found again.
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const same = (h, e, cells) => {
    for (let c = 0; c < cells; c++) {
      if (h.ages[c] !== e.ages[c] || h.gaps[c] !== e.gaps[c]) return false;
      if (e.gaps[c] && (h.last[c] !== e.last[c] || h.then[c] !== e.then[c])) return false;
    }
    return true;
  };
  let checked = 0, wrong = null;
  for (const loop of [true, false]) {
    for (const [growIn, growOut] of [[2, 0], [3, 3], [0, 5], [6, 4], [4, 9], [1, 2]]) {
      for (let trial = 0; trial < 6 && !wrong; trial++) {
        const frames = 18, cells = 12;
        const film = Array.from({ length: frames }, () =>
          Int16Array.from({ length: cells }, () => (rand() < 0.45 ? -1 : Math.floor(rand() * 5))));
        const at = k => film[k];
        const o = { frames, loop, growIn, growOut };
        const start = loop ? Math.floor(rand() * frames) : 0;
        const h = { prev: Int16Array.from(film[start]), ...historyAt(at, start, o) };
        const steps = loop ? frames * 2 : frames - 1;
        for (let t = 1; t <= steps; t++) {
          const i = (start + t) % frames;
          advance(h, film[i], 1, { growIn, growOut });
          checked++;
          if (!same(h, historyAt(at, i, o), cells)) { wrong = { loop, growIn, growOut, i }; break; }
        }
      }
    }
  }
  ok(`a frame at a time is exactly the look-back (${checked} frames checked)`, wrong, null);
}

{
  const s0 = settled(Int16Array.from([3, -1, 0]), 5);
  ok('settled: every filled cell full, nothing going', [[...s0.ages], [...s0.gaps]], [[5, 0, 5], [0, 0, 0]]);
  // Four ticks skipped: filled on both sides grows by four; filled since, from halfway.
  const h = { prev: Int16Array.from([1, -1, 2, -1]), ages: Uint16Array.from([2, 0, 3, 0]),
              gaps: Uint16Array.from([0, 0, 0, 2]), last: Int16Array.from([-1, -1, -1, 4]),
              then: Uint16Array.from([0, 0, 0, 1]) };
  advance(h, Int16Array.from([1, 3, -1, -1]), 4, { growIn: 9, growOut: 9 });
  ok('a skip: filled throughout grows by the skip', h.ages[0], 6);
  ok('a skip: filled since grows from halfway', h.ages[1], 2);
  ok('a skip: emptied since is halfway gone, its tile kept', [h.gaps[2], h.last[2], h.then[2]], [2, 2, 3]);
  ok('a skip: already going goes on', h.gaps[3], 6);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
