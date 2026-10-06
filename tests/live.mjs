/**
 * tests/live.mjs — run with: node tests/live.mjs
 *
 * Covers core/live.js on Node's own BroadcastChannel, which carries messages
 * between channels of one name in one process as a browser's does between
 * its tabs. The promises — a window that opens hears every window already
 * open and is heard by them, each with its layer; a layer that changes is
 * sent, and one that does not is not sent again; a window with nothing on
 * screen says why; a window that leaves is gone from the others, and one
 * that misses three calls is taken for gone; with no channel, nothing.
 */

const { joinLive, CHANNEL } = await import('../core/live.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const name = 'skweeb-live-test';

// Two windows: particles with a still on screen, filter with nothing yet.
let picture = { type: 'still', origin: { app: 'particles' }, recipe: { emit: { rate: 90 } }, render: { w: 1080, h: 1080 } };
let source = 'choose a source';
const heardByFilter = [];
const particles = joinLive({ app: 'particles', title: () => 'particles — skweeb', layer: () => picture,
  channel: new BroadcastChannel(name), every: 40, call: 60 });
await wait(30);
const filter = joinLive({ app: 'filter', title: () => 'filter — skweeb', layer: () => source,
  channel: new BroadcastChannel(name), every: 40, call: 60 });
filter.on(e => heardByFilter.push(e.kind));
await wait(150);

const seen = filter.windows();
ok('a window that opens hears the one already open', seen.map(w => [w.app, w.title]), [['particles', 'particles — skweeb']]);
ok('…with its layer, the envelope a save would write', seen[0].layer, picture);
ok('and is heard by it, with why it has nothing on screen', particles.windows().map(w => [w.app, w.layer, w.why]),
  [['filter', null, 'choose a source']]);
ok('each knows itself as the others have it', [filter.mine().app, filter.mine().why, particles.mine().layer.render.w], ['filter', 'choose a source', 1080]);

// A change: sent, heard, once.
heardByFilter.length = 0;
picture = { ...picture, recipe: { emit: { rate: 120 } } };
await wait(150);
ok('a layer that changes is heard', filter.windows()[0].layer.recipe.emit.rate, 120);
ok('once: one that stays the same is not sent again', heardByFilter.filter(k => k === 'layer').length, 1);
source = { type: 'still', origin: { app: 'filter' }, recipe: { chain: [] }, render: { w: 520, h: 907 } };
await filter.changed();
await wait(60);
ok('changed() says it at once', particles.windows()[0].layer.render, { w: 520, h: 907 });

// A third, then one leaves.
const map = joinLive({ app: 'map', layer: () => null, channel: new BroadcastChannel(name), every: 40, call: 60 });
await wait(150);
ok('a third window: every window hears every other', [particles.windows().length, filter.windows().length, map.windows().length], [2, 2, 2]);
ok('nothing on screen, said so', filter.windows().find(w => w.app === 'map').why, 'nothing on screen');
map.leave();
await wait(100);
ok('a window that leaves is gone from the others', [particles.windows().map(w => w.app), heardByFilter.includes('go')], [['filter'], true]);

// A window that stops answering — a crashed tab — without a bye.
const silent = new BroadcastChannel(name);
silent.postMessage({ kind: 'hello', id: 'deadbeef', app: 'grid', title: 'grid — skweeb', layer: null, why: 'gone soon', known: [] });
await wait(80);
ok('one that is heard once is in', filter.windows().some(w => w.id === 'deadbeef'), true);
await wait(60 * 5);
ok('and taken for gone once it has missed three calls', filter.windows().some(w => w.id === 'deadbeef'), false);
silent.close();

particles.leave();
filter.leave();

// No channel: the app as it was.
const alone = joinLive({ app: 'rig', layer: () => picture, channel: null });
await alone.changed();
ok('with no channel: no windows, and nothing thrown', [alone.windows().length, alone.mine().layer.render.w], [0, 1080]);
alone.leave();
ok('the channel\'s name, for every page of the suite', CHANNEL, 'skweeb-live');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
