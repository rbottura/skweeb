/**
 * tests/compose-time.mjs — run with: node tests/compose-time.mjs
 *
 * Covers apps/compose/time.js: a loop placed on a page keeps its own speed
 * whatever the page's rate. The promises — every tick shown when the rates
 * agree, none skipped or doubled but by the ratio when they do not, a loop
 * that closes on the page when it closes on its own, a picture that holds.
 */

const { moves, framesOnPage, tickAt } = await import('../apps/compose/time.js');

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

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
