/**
 * tests/stack.mjs — run with: node tests/stack.mjs
 *
 * Covers core/stack.js, and core/blend.js under it, on Node's own
 * BroadcastChannel. The promises — a block added in one window is in every
 * window's stack, the page set by the first; a block moved, set or taken off
 * anywhere is so everywhere; two changes made at once end on one stack in
 * both windows; a window that opens late is handed the stack; a window that
 * goes takes its block with it, and the next change leaves it out; opacity
 * and blend are kept only when they say something; and a blend is canvas's
 * name for it as well as CSS's.
 */

const { joinLive } = await import('../core/live.js');
const { joinStack } = await import('../core/stack.js');
const { BLENDS, compositeOf, cssBlendOf } = await import('../core/blend.js');
const { tickNow } = await import('../core/stackView.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const window = (app, size) => {
  const live = joinLive({ app, layer: () => ({ type: 'still', origin: { app }, recipe: {}, render: { w: size[0], h: size[1] } }),
    channel: new BroadcastChannel('live-test'), every: 30, call: 50 });
  return { live, stack: joinStack(live, { channel: new BroadcastChannel('stack-test') }) };
};
const blocks = s => s.get().place.map(b => b.live ? 'live' : b.ref);

const compose = window('compose', [1240, 1754]);
const filter = window('filter', [520, 907]);
await wait(120);

// A composition under, the filter's own layer over it.
compose.stack.add({ live: compose.live.id }, { width: 1240, height: 1754 });
await wait(40);
filter.stack.add({ live: filter.live.id, opacity: 0.6, blend: 'multiply' }, { width: 520, height: 907 });
await wait(40);
ok('a block added in one window is in every window\'s stack', [compose.stack.get().place.length, filter.stack.get().place.length], [2, 2]);
ok('bottom first: the composition, then the filter', filter.stack.get().place.map(b => b.live), [compose.live.id, filter.live.id]);
ok('the page is the first block\'s size', compose.stack.get().page, { width: 1240, height: 1754 });
ok('opacity and blend are kept', compose.stack.get().place[1].opacity + ' ' + compose.stack.get().place[1].blend, '0.6 multiply');
ok('a transform whole, centred and its own size by default', compose.stack.get().place[0].transform, { x: 0, y: 0, scale: 1, rot: 0 });
ok('each knows where a window\'s block is', [filter.stack.indexOf(filter.live.id), filter.stack.indexOf('nobody')], [1, -1]);

// Set, moved, a vault object added, taken off: from either window.
compose.stack.set(1, { transform: { x: 40, scale: 0.5 }, opacity: 1, blend: 'normal' });
await wait(40);
const set = filter.stack.get().place[1];
ok('a block set in one window is set in the other', [set.transform.x, set.transform.scale, set.transform.y], [40, 0.5, 0]);
ok('opacity 1 and a normal blend are left out, as a block leaves them', ['opacity' in set, 'blend' in set], [false, false]);
filter.stack.add({ ref: 'par_1790543217587_2527be', blend: 'plus-lighter' });
await wait(40);
filter.stack.move(2, 0);
await wait(40);
ok('a vault object added and moved to the bottom, everywhere', blocks(compose.stack), ['par_1790543217587_2527be', 'live', 'live']);
compose.stack.remove(0);
await wait(40);
ok('taken off in one, gone from both', [blocks(filter.stack).length, blocks(compose.stack).length], [2, 2]);

// Two changes at once end on one stack.
compose.stack.set(0, { opacity: 0.25 });
filter.stack.set(0, { opacity: 0.75 });
await wait(60);
ok('two changes made at once: both windows end on one', compose.stack.get().place[0].opacity, filter.stack.get().place[0].opacity);

// A window opening late is handed the stack.
const grid = window('grid', [800, 600]);
await wait(150);
ok('a window that opens late is handed the stack', grid.stack.get().place.map(b => b.live), [compose.live.id, filter.live.id]);

// A window that goes takes its block with it.
filter.stack.leave();
filter.live.leave();
await wait(80);
ok('a window that goes: its block is no longer shown', compose.stack.get().place.map(b => b.live), [compose.live.id]);
grid.stack.add({ ref: 'fra_1790550593459_6f70cb' });
await wait(40);
ok('and the next change leaves it out', compose.stack.get().place.map(b => b.live || b.ref), [compose.live.id, 'fra_1790550593459_6f70cb']);
for (const w of [compose, grid]) { w.stack.leave(); w.live.leave(); }

// Blends: CSS's names, canvas's spelling.
ok('seventeen blends, normal first', [BLENDS.length, BLENDS[0]], [17, 'normal']);
ok('canvas spells normal and add its own way', [compositeOf('normal'), compositeOf('plus-lighter'), compositeOf('multiply')], ['source-over', 'lighter', 'multiply']);
ok('anything unknown is normal, for both', [compositeOf('glow'), cssBlendOf('glow'), cssBlendOf('screen')], ['source-over', 'normal', 'screen']);

// A loop at the wall clock's frame: every window the same, with no word passed.
ok('a loop shows the wall clock\'s frame: the same in every window at one moment', [tickNow(60, 30, 10_000), tickNow(60, 30, 10_000)], [0, 0]);
ok('…moving on at its rate, round its length', [tickNow(60, 30, 10_500), tickNow(60, 30, 12_000), tickNow(60, 30, 12_034)], [15, 0, 1]);
ok('a still is its one frame', tickNow(1, 30, 12_345), 0);

// No channel: a stack of its own, and nothing thrown.
const alone = joinLive({ app: 'rig', layer: () => null, channel: null });
const own = joinStack(alone, { channel: null });
own.add({ live: alone.id }, { width: 10, height: 10 });
ok('with no channel: a stack of one window\'s own', own.get().place.length, 1);

// L1: a smart object's layer kept at a state, or following; the page keeps what the stack kept (stackSave.js).
const { placed } = await import('../core/stackSave.js');
own.add({ ref: 'skw_1_a' });
await wait(10);
own.set(1, { version: 3 });
ok('a smart object\'s layer kept at a state', own.get().place[1].version, 3);
own.set(1, { version: 0 });
ok('…or following its latest: no version kept', 'version' in own.get().place[1], false);
const t0 = { x: 0, y: 0, scale: 1, rot: 0 };
ok('saved as a page: kept at its state, or at its latest; a window always its latest', [placed({ ref: 'skw_1_a', version: 3, transform: t0 }, 'skw_1_a').version,
  placed({ ref: 'skw_1_a', transform: t0 }, 'skw_1_a').version, placed({ live: 'w1', version: 3, transform: t0 }, 'skw_2_b').version], [3, 'latest', 'latest']);
own.leave();
alone.leave();

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
