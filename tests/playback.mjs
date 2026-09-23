/**
 * tests/playback.mjs — run with: node tests/playback.mjs
 *
 * Covers core/playback.js, which is the piece two players now share and the
 * piece whose bugs are invisible: a loop that plays at the wrong speed still
 * plays, and looks fine until you put it next to the thing it was recorded
 * from.
 *
 * The clock is stubbed rather than waited on. Real time in a test means a slow
 * test that fails on a loaded machine, and the whole point of this class is
 * that it does arithmetic on elapsed milliseconds — so handing it the
 * milliseconds directly tests exactly what it does.
 */

let now = 0;
let nextId = 0;
const pending = new Map();

globalThis.performance = { now: () => now };
globalThis.requestAnimationFrame = fn => { const id = ++nextId; pending.set(id, fn); return id; };
globalThis.cancelAnimationFrame = id => { pending.delete(id); };

/** Move the clock and run whatever was waiting on a frame. */
const advance = ms => {
  now += ms;
  const due = [...pending.values()];
  pending.clear();
  for (const fn of due) fn(now);
};

const { Playhead } = await import('../core/playback.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(50), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

/**
 * A playhead plus the ticks it has shown, on a clock rewound to zero.
 *
 * Rewinding matters for more than tidiness. `elapsed` is a subtraction of two
 * clock readings, so on a clock that has been running a while the difference
 * loses its last bits and a tick can land one frame late — harmless in a
 * player, where the remainder is carried and nothing drifts, but enough to
 * make an exact assertion here fail for a reason that has nothing to do with
 * what is being tested. Each block gets its own clock and its own queue.
 */
const make = (opts = {}) => {
  now = 0;
  pending.clear();
  const shown = [];
  const head = new Playhead({ onShow: t => shown.push(t), fps: 60, length: 100, ...opts });
  return { head, shown };
};

// -- show(), and the wrap ----------------------------------------------------

{
  const { head, shown } = make({ length: 10 });
  head.show(3);
  head.show(10);          // one past the end is the start
  head.show(-1);          // and one before the start is the end
  head.show(23);
  ok('show wraps both ways', shown, [3, 0, 9, 3]);
  ok('tick is the wrapped one', head.tick, 3);
}

{
  const { head, shown } = make({ length: 0 });
  head.show(0);
  ok('show does nothing with no loop', shown, []);
}

{
  const { head, shown } = make({ length: 5 });
  head.show(4);
  head.step(1);
  head.step(-2);
  ok('step wraps the way the loop does', shown, [4, 0, 3]);
}

// -- The frame rate, which is the whole reason this file exists --------------
//
// One tick per animation frame would play a 60fps loop at double speed on a
// 120Hz display. Time is accumulated and spent in whole ticks instead, with
// the remainder carried, so two 120Hz frames make one 60fps tick.

{
  const { head, shown } = make({ fps: 60 });
  head.play();
  advance(1000 / 120);
  ok('half a tick shows nothing', shown, []);
  advance(1000 / 120);
  ok('two 120Hz frames make one 60fps tick', shown, [1]);
  advance(1000 / 120);
  advance(1000 / 120);
  ok('and the next two make the next', shown, [1, 2]);
}

{
  const { head, shown } = make({ fps: 12 });
  head.play();
  advance(1000 / 60);      // a 60Hz display, a 12fps loop
  ok('a slow loop does not run at display rate', shown, []);
  advance(1000 / 60);
  advance(1000 / 60);
  advance(1000 / 60);
  advance(1000 / 60);
  ok('it advances on its own schedule', shown, [1]);
}

// A frame that costs more than its share of time drops ticks and keeps real
// time. Grid re-dithers a whole field per frame, so this is the normal case
// there, not the exceptional one.
{
  const { head, shown } = make({ fps: 60, length: 1000 });
  head.play();
  advance(500);
  ok('a slow frame drops ticks rather than slowing down', shown, [30]);
  ok('real time is kept', head.tick, 30);
}

// -- Ends --------------------------------------------------------------------

{
  const { head, shown } = make({ fps: 60, length: 10 });
  head.play();
  advance(1000);          // 60 ticks worth, on a 10-tick loop
  ok('a looping playhead wraps', shown, [0]);
  ok('and keeps playing', head.playing, true);
}

{
  const { head, shown } = make({ fps: 60, length: 10, loop: false });
  head.play();
  advance(1000);
  ok('a one-shot stops on the last frame', shown, [9]);
  ok('and pauses itself', head.playing, false);
}

// -- Transport ---------------------------------------------------------------

{
  const { head } = make({ length: 1 });
  head.play();
  ok('a single frame is not a loop, so it will not play', head.playing, false);
}

{
  const states = [];
  const { head } = make({ onState: () => states.push('x') });
  head.play();
  head.play();            // already playing: no second announcement
  head.pause();
  head.pause();           // already paused: likewise
  ok('state is announced once per real change', states.length, 2);
}

{
  const { head, shown } = make({ fps: 60 });
  head.play();
  advance(1000 / 60);
  head.pause();
  advance(1000);
  ok('a paused playhead shows nothing more', shown, [1]);
  ok('and nothing is left queued', pending.size, 0);
}

{
  const { head } = make({ fps: 60, length: 100 });
  head.show(40);
  head.play();
  head.configure({ length: 44, fps: 12 });
  ok('configure pauses', head.playing, false);
  ok('configure rewinds — a tick means nothing in a new loop', head.tick, 0);
  ok('configure takes the new length', head.length, 44);
}

// -- smooth: every animation frame, and the position between ticks -----------

{
  // A 30fps loop on a 60Hz screen: a whole tick every other refresh, and in
  // between the half — the frame ckt draws, so a turn does not step.
  now = 0;
  pending.clear();
  const seen = [];
  const head = new Playhead({ onShow: (t, at) => seen.push([t, at]), fps: 30, length: 10, smooth: true });
  head.play();
  for (let i = 0; i < 4; i++) advance(1000 / 60);
  head.pause();
  ok('smooth: called on every frame, not every tick', seen.length, 4);
  ok('smooth: the whole ticks are the loop\'s', seen.map(s => s[0]), [0, 1, 1, 2]);
  ok('smooth: at runs between them', seen.map(s => Math.round(s[1] * 100) / 100), [0.5, 1, 1.5, 2]);
}

{
  now = 0;
  pending.clear();
  const seen = [];
  const head = new Playhead({ onShow: (t, at) => seen.push(at), fps: 30, length: 4, smooth: true });
  head.play();
  for (let i = 0; i < 9; i++) advance(1000 / 60);
  head.pause();
  ok('smooth: it wraps like the loop, at staying under length', seen.every(a => a >= 0 && a < 4), true);
  head.show(2);
  ok('smooth: show() gives the whole tick as at', seen[seen.length - 1], 2);
}

{
  const { head, shown } = make({ fps: 30 });
  head.play();
  advance(1000 / 60);
  advance(1000 / 60);
  head.pause();
  ok('not smooth: a tick only when one is due', shown, [1]);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
