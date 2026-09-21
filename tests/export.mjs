/**
 * tests/export.mjs — run with: node tests/export.mjs
 *
 * Covers the two things in core/export.js that fail silently: the frame loop's
 * indexing, and a hand-written zip.
 *
 * The indexing matters because SequencePlayer.reset() *renders* tick zero and
 * step() advances then renders. Stepping before capturing drops frame zero and
 * nothing complains — the loop is just one frame short and slightly wrong
 * forever.
 */

const { captureFrames, zipStore, crc32, frameName } = await import('../core/export.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(44), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

// crc32 against the standard check vector.
ok('crc32 check vector', crc32(new TextEncoder().encode('123456789')), 0xcbf43926);

// Names sort alphabetically into numeric order, at any magnitude.
ok('frameName pads to four', frameName(7, 120), 'frame_0007.png');
ok('frameName widens past 9999', frameName(7, 12000), 'frame_00007.png');
ok('frameName sorts', [frameName(9, 120), frameName(10, 120)].sort(),
   ['frame_0009.png', 'frame_0010.png']);

// The frame loop, against a stand-in for SequencePlayer with the same
// contract: reset() has already rendered tick 0, step() advances one.
const player = {
  tick: 0,
  reset() { this.tick = 0; },
  step() { this.tick++; },
  get canvas() {
    const t = this.tick;
    return { toBlob(cb) { cb(new Blob([new Uint8Array([t])])); } };
  },
};
player.reset();
const frames = await captureFrames({
  count: 5,
  draw: i => { if (i > 0) player.step(); return player.canvas; },
});
const ticks = [];
for (const f of frames) ticks.push(new Uint8Array(await f.arrayBuffer())[0]);
ok('captures every tick once, from zero', ticks, [0, 1, 2, 3, 4]);
ok('frame count', frames.length, 5);
ok('playhead ends on the last frame', player.tick, 4);

// A draw function that returns nothing is a bug worth a loud failure.
let threw = '';
try {
  await captureFrames({ count: 2, draw: () => null });
} catch (err) { threw = err.message; }
ok('empty frame throws', /produced no canvas/.test(threw), true);

// Zip structure. The bytes were checked against a real unzipper by hand; this
// guards the offsets from drifting.
const entries = [
  { name: 'a.png', bytes: new Uint8Array([1, 2, 3]) },
  { name: 'bb.png', bytes: new Uint8Array([4, 5, 6, 7]) },
];
const zip = new Uint8Array(await zipStore(entries).arrayBuffer());
const u32 = at => new DataView(zip.buffer).getUint32(at, true);
ok('local header signature', u32(0), 0x04034b50);
ok('stored, not deflated', new DataView(zip.buffer).getUint16(8, true), 0);
ok('first entry crc', u32(14), crc32(entries[0].bytes));
ok('second local header follows the first', u32(30 + 5 + 3), 0x04034b50);
const eocd = zip.length - 22;
ok('end of central directory', u32(eocd), 0x06054b50);
ok('entry count in the directory', new DataView(zip.buffer).getUint16(eocd + 10, true), 2);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
