/**
 * tests/recorder.mjs — run with: node tests/recorder.mjs
 *
 * No runner and no dependencies: node imports the app's modules directly, and
 * the two browser globals the recorder touches are stubbed below.
 *
 * What is being protected: recording does not switch capture on. Marks are
 * always buffered, and a clip is a *range* over that buffer. Get this wrong
 * and a still silently loses the marks that made it, which is the difference
 * between an object that can be re-rendered for print and one that cannot.
 */

globalThis.document = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(name, init) { Object.assign(this, init); } };

const { SequenceRecorder: R } = await import('../core/stage/recorder.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(44), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};
const mark = (x, y) =>
  R.capture({ x, y, rotation: 0, scale: 1, familyId: 'b', spriteIndex: 1, pattern: 'none' });

R.resetBuffer(800, 600);

// Marks land with nothing armed. This is the whole point.
for (let i = 0; i < 5; i++) mark(i * 20, 0);
ok('buffered while disarmed', R.markCount, 5);
ok('not recording', R.recording, false);
ok('liveCount while disarmed', R.liveCount, 0);

// Arming sets an in point; it does not start capture.
R.start(800, 600);
ok('recording after start', R.recording, true);
ok('liveCount at the in point', R.liveCount, 0);
for (let i = 0; i < 3; i++) mark(200 + i * 20, 0);
ok('liveCount counts the range', R.liveCount, 3);
ok('buffer keeps everything', R.markCount, 8);

// The clip is that range, with t re-based so a sequence starts at zero.
const seq = R.stop();
ok('clip length is the range', seq.events.length, 3);
ok('clip t starts at zero', seq.events[0].t, 0);
ok('clip starts at the in point', seq.events[0].x, 200);
ok('buffer survives the stop', R.markCount, 8);
ok('sequence was stored', R.count, 1);

// A still takes the whole buffer, copied rather than shared.
const shot = R.snapshot();
ok('snapshot covers everything', shot.events.length, 8);
ok('snapshot carries canvas size', [shot.w, shot.h], [800, 600]);
shot.events[0].x = 999;
ok('snapshot is a copy, not a view', R.marks[0].x, 0);

// Clearing the canvas drops the marks that described it, but not the clips.
R.resetBuffer(800, 600);
ok('buffer empty after reset', R.markCount, 0);
ok('sequences survive a reset', R.count, 1);

// Unchanged behaviour worth keeping.
R.start(800, 600);
ok('empty clip discarded', R.stop(), null);
mark(10, 10); mark(10, 10);
ok('identical mark rejected', R.markCount, 1);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
