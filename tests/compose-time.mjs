/**
 * tests/compose-time.mjs — run with: node tests/compose-time.mjs
 *
 * Covers apps/compose/time.js: a loop placed on a page keeps its own speed
 * whatever the page's rate. The promises — every tick shown when the rates
 * agree, none skipped or doubled but by the ratio when they do not, a loop
 * that closes on the page when it closes on its own, a picture that holds.
 */

const { moves, framesOnPage, tickAt, showsAt, endOf, ripple } = await import('../apps/compose/time.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(58), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};
const ticks = (handle, fps) => Array.from({ length: framesOnPage(handle, fps) }, (_, i) => tickAt(i, handle, fps));

// The vault's own rates: the gamepad records at 60, grid keeps its source's, ckt loops at 30.
const gamepad = { length: 273, fps: 60, loop: true };
const ckt     = { length: 180, fps: 30, loop: true };
const picture = { length: 1, fps: 0, loop: false };

ok('a picture does not move', moves(picture), false);
ok('a loop does', moves(gamepad), true);
ok('a picture is one frame of any page', framesOnPage(picture, 60), 1);
ok('and shows its only tick at every one', [0, 1, 500].map(t => tickAt(t, picture, 60)), [0, 0, 0]);

ok('rates that agree: the loop is its own length', framesOnPage(gamepad, 60), 273);
ok('and every tick shows once, in order', ticks(gamepad, 60).every((t, i) => t === i), true);
ok('a 30 fps loop on a 60 fps page lasts as long', framesOnPage(ckt, 60), 360);
ok('holding each tick for two', ticks(ckt, 60).slice(0, 6), [0, 0, 1, 1, 2, 2]);
ok('and every tick is there', new Set(ticks(ckt, 60)).size, 180);
ok('a 60 fps loop on a 30 fps page shows every other tick', ticks(gamepad, 30).slice(0, 4), [0, 2, 4, 6]);
ok('its length in time kept to the nearest frame', framesOnPage(gamepad, 30), 137);
ok('its last page frame shows its last even tick', ticks(gamepad, 30).at(-1), 272);

// Played on, the page wraps and so does the object, where its own loop does.
const len = framesOnPage(ckt, 60);
ok('the page\'s next loop starts the object\'s', [len - 1, len, len + 1].map(t => tickAt(t, ckt, 60)), [179, 0, 0]);
ok('a tick asked for past the end wraps', tickAt(1000, gamepad, 60), 1000 % 273);
ok('one that does not loop holds its last tick',
   tickAt(1000, { ...gamepad, loop: false }, 60), 272);

// Rates that do not divide still keep time.
const odd = { length: 668, fps: 60, loop: true };
ok('668 ticks at 60 on a 24 fps page', framesOnPage(odd, 24), 267);
ok('never past the loop\'s last tick', Math.max(...ticks(odd, 24)), 665);
ok('never going back', ticks(odd, 24).every((t, i, a) => !i || t >= a[i - 1]), true);

// A placement's time: from `at`, for `length` — or to the page's end.
const frame2 = { at: 2, length: 3 };
ok('a window shows from its start, for its length', [1, 2, 4, 5].map(t => showsAt(t, frame2)), [false, true, true, false]);
ok('with no length, from its start to the page\'s end', [0, 1, 999].map(t => showsAt(t, { at: 1, length: null })), [false, true, true]);
ok('a block with no time at all shows throughout', showsAt(500, {}), true);
const still = { length: 1, fps: 0 };
ok('a still reaches a frame past its start, or as far as its length',
   [endOf({ at: 4, length: null }, still, 60), endOf({ at: 4, length: 3 }, still, 60)], [5, 7]);
ok('a loop with no length reaches as far as its own loop', endOf({ at: 10, length: null }, gamepad, 30), 10 + 137);

// A ripple: what started where one ended moves with its end, and on down the chain.
const book = [{ at: 0, length: 1 }, { at: 1, length: 1 }, { at: 2, length: 1 }, { at: 3, length: 2 }];
const when = blocks => blocks.map(b => [b.at, b.length]);
ok('frame 2 held for two pushes every frame after it', when(ripple(book, 2, 1, 1)), [[0, 1], [1, 1], [3, 1], [4, 2]]);
ok('and cut back, pulls them', when(ripple([{ at: 0, length: 3 }, { at: 3, length: 1 }], 3, -2, 0)), [[0, 3], [1, 1]]);
ok('a frame put in after the first makes room', when(ripple(book, 1, 1)), [[0, 1], [2, 1], [3, 1], [4, 2]]);
ok('a frame taken out closes up', when(ripple(book.filter((_, i) => i !== 1), 2, -1)), [[0, 1], [1, 1], [2, 2]]);
const apart2 = [{ at: 0, length: 2 }, { at: 5, length: 1 }, { at: 0, length: null }];
ok('what comes later, not touching, stays', when(ripple(apart2, 2, 1, 0)), [[0, 2], [5, 1], [0, null]]);
ok('a chain stops at a placement with no length',
   when(ripple([{ at: 0, length: 1 }, { at: 1, length: null }, { at: 2, length: 1 }], 1, 1, 0)), [[0, 1], [2, null], [2, 1]]);
ok('nothing moved, the same blocks', ripple(book, 1, 0, 0) === book, true);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
