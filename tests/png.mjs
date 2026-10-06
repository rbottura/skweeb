/**
 * tests/png.mjs — run with: node tests/png.mjs
 *
 * Covers core/png.js. The promises — what it writes is a PNG every reader
 * takes: its signature, every chunk's CRC right, the header its size, 8 bits,
 * RGBA or RGB; a pHYs of the dpi in pixels per metre, none without one; the
 * rows, inflated and unfiltered, are the pixels it was given to the byte,
 * however the bands were cut — past a write's rows, one row at a time — and
 * RGB drops only the alpha; too few or too many rows throw.
 */

const { writePng, crc32 } = await import('../core/png.js');
const zlib = await import('node:zlib');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

/** A picture with everything in it: gradients, a hard edge, noise, alpha. */
const W = 301, H = 517;
const pixels = new Uint8ClampedArray(W * H * 4);
for (let y = 0, s = 7; y < H; y++) for (let x = 0; x < W; x++) {
  s = (s * 1103515245 + 12345) >>> 0;
  const i = (y * W + x) * 4;
  pixels.set([x % 256, (y * 3) % 256, x > 150 ? 255 : (s >>> 24), (x + y) % 256], i);
}

/** The picture cut into bands of `sizes` rows, round and round. */
function* bandsOf(sizes) {
  for (let y = 0, k = 0; y < H; k++) {
    const n = Math.min(sizes[k % sizes.length], H - y);
    yield { rows: pixels.subarray(y * W * 4, (y + n) * W * 4), count: n };
    y += n;
  }
}

/** A PNG read back: its chunks, CRCs checked, and its rows unfiltered. */
async function read(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const out = { signature: [...bytes.subarray(0, 8)], chunks: [], crcs: true, idat: [] };
  for (let at = 8; at < bytes.length;) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const data = bytes.subarray(at + 8, at + 8 + length);
    if (((crc32(bytes.subarray(at + 4, at + 8 + length)) ^ 0xffffffff) >>> 0) !== view.getUint32(at + 8 + length)) out.crcs = false;
    out.chunks.push(type);
    if (type === 'IHDR') out.ihdr = [view.getUint32(at + 8), view.getUint32(at + 12), data[8], data[9]];
    if (type === 'pHYs') out.phys = [view.getUint32(at + 8), view.getUint32(at + 12), data[8]];
    if (type === 'IDAT') out.idat.push(data);
    at += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(out.idat));
  const [w, h, , kind] = out.ihdr;
  const channels = kind === 6 ? 4 : 3, stride = w * channels;
  const rows = new Uint8Array(w * h * channels);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const v = raw[y * (stride + 1) + 1 + i];
      rows[y * stride + i] = filter === 2 && y > 0 ? (v + rows[(y - 1) * stride + i]) & 255 : v;
    }
  }
  out.rows = rows;
  return out;
}

const rgba = await read(await writePng({ width: W, height: H, dpi: 300, bands: bandsOf([64, 1, 300, 17]) }));
ok('a PNG\'s signature', rgba.signature, [137, 80, 78, 71, 13, 10, 26, 10]);
ok('its chunks in order, every CRC right', [rgba.chunks[0], rgba.chunks[1], rgba.chunks.at(-1), rgba.crcs], ['IHDR', 'pHYs', 'IEND', true]);
ok('its header: its size, 8 bits, RGBA', rgba.ihdr, [W, H, 8, 6]);
ok('300 dpi as pixels per metre, both ways', rgba.phys, [11811, 11811, 1]);
ok('its rows are the pixels given, to the byte, however the bands were cut', Buffer.from(rgba.rows).equals(Buffer.from(pixels)), true);

const rgb = await read(await writePng({ width: W, height: H, alpha: false, bands: bandsOf([H]) }));
ok('no alpha: RGB, no pHYs without a dpi', [rgb.ihdr[3], rgb.chunks.includes('pHYs')], [2, false]);
const sansAlpha = Uint8Array.from({ length: W * H * 3 }, (_, i) => pixels[Math.floor(i / 3) * 4 + (i % 3)]);
ok('…the same pixels, the alpha dropped', Buffer.from(rgb.rows).equals(Buffer.from(sansAlpha)), true);

const flat = new Uint8ClampedArray(2000 * 400 * 4).fill(240);
const small = await writePng({ width: 2000, height: 400, alpha: false, bands: [{ rows: flat, count: 400 }] });
ok('a flat ground costs next to nothing', small.size < 6000, true);

let threw = '';
try { await writePng({ width: W, height: H, bands: [{ rows: pixels.subarray(0, W * 4 * 10), count: 10 }] }); } catch (e) { threw = e.message; }
ok('too few rows throw', /rows of its/.test(threw), true);
threw = '';
try { await writePng({ width: W, height: 5, bands: [{ rows: pixels.subarray(0, W * 4 * 10), count: 10 }] }); } catch (e) { threw = e.message; }
ok('…and too many', /more rows than/.test(threw), true);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
