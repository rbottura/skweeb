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

const { runFrames, captureFrames, toPng, zipStore, crc32, frameName } =
  await import('../core/export.js');

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

// -- runFrames, the loop with nothing collected ------------------------------
//
// captureFrames is now a caller of this rather than the loop itself, so the
// indexing above no longer covers it on its own. Grid dithering a sequence
// rides on this directly: it runs every frame and keeps one, so a loop that
// skips a frame or runs one twice silently changes the artwork.

const seen = [];
await runFrames({ count: 6, frame: i => { seen.push(i); } });
ok('runFrames visits every index in order', seen, [0, 1, 2, 3, 4, 5]);

const progress = [];
await runFrames({ count: 3, frame: () => {}, onProgress: (d, t) => progress.push([d, t]) });
ok('progress counts done, not index', progress, [[1, 3], [2, 3], [3, 3]]);

ok('a count of zero runs nothing', await (async () => {
  let n = 0;
  await runFrames({ count: 0, frame: () => n++ });
  return n;
})(), 0);

// An async frame must be awaited before the next one starts — grid writes into
// one reused canvas per frame, so two frames in flight is two dithers of the
// same pixels.
const order = [];
await runFrames({
  count: 3,
  frame: async i => {
    order.push('in' + i);
    await new Promise(r => setTimeout(r, 0));
    order.push('out' + i);
  },
});
ok('async frames do not overlap', order,
   ['in0', 'out0', 'in1', 'out1', 'in2', 'out2']);

// Abort is checked before the frame runs, so a cancelled export does no more
// work — the frame that was already in flight is the last one.
const controller = new AbortController();
const ran = [];
let aborted = '';
try {
  await runFrames({
    count: 10,
    signal: controller.signal,
    frame: i => { ran.push(i); if (i === 2) controller.abort(); },
  });
} catch (err) { aborted = err.name; }
ok('abort stops the loop', ran, [0, 1, 2]);
ok('abort throws AbortError', aborted, 'AbortError');

// -- toPng, on both kinds of canvas ------------------------------------------
//
// Every surface grid makes is an OffscreenCanvas, which has convertToBlob and
// no toBlob. Getting this wrong is a TypeError at frame zero of an export and
// nowhere else, which is the worst place to find out.

const fromToBlob = await toPng({ toBlob: cb => cb(new Blob([new Uint8Array([9])])) });
ok('toPng uses toBlob when that is what there is',
   new Uint8Array(await fromToBlob.arrayBuffer())[0], 9);

const fromConvert = await toPng({ convertToBlob: () => Promise.resolve(new Blob([new Uint8Array([7])])) });
ok('toPng uses convertToBlob on an OffscreenCanvas',
   new Uint8Array(await fromConvert.arrayBuffer())[0], 7);

let nullBlob = '';
try {
  await toPng({ toBlob: cb => cb(null) });
} catch (err) { nullBlob = err.message; }
ok('a null blob throws rather than saving nothing', /toBlob returned null/.test(nullBlob), true);

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

// An entry can be a Blob with its CRC and size counted, placed by reference:
// the same zip, byte for byte, without holding every frame's bytes at once.
const asBlobs = entries.map(e => ({ name: e.name, blob: new Blob([e.bytes]), crc: crc32(e.bytes), size: e.bytes.length }));
const zipped = new Uint8Array(await zipStore([asBlobs[0], entries[1]]).arrayBuffer());
ok('a blob entry makes the same zip as its bytes', zipped.length === zip.length && zipped.every((b, i) => b === zip[i]), true);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
