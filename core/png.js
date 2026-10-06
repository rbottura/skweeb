/**
 * png.js — a PNG written as a stream, band by band, for a picture no canvas
 * can hold whole.
 *
 * A poster at 300 dpi on a 120 × 176 cm sheet is 14173 × 20787 pixels: past
 * Chrome's canvas cap (2^28 pixels), past `toBlob`, past any GPU's side. So
 * whoever draws it hands this its rows a band at a time, and nothing holds
 * the whole picture but the file.
 *
 * Each row is filtered by the one above it (PNG's Up: a flat ground is all
 * zeros) and goes through the platform's own deflate — CompressionStream's
 * 'deflate' is the zlib stream a PNG's IDAT holds — and what comes out is cut
 * into IDAT chunks as it comes. A pHYs chunk carries the dpi, so a print
 * shop's software sets the picture at its size; with no alpha to keep, the
 * rows are RGB, a quarter smaller.
 *
 * Pure but for CompressionStream and Blob, which Node has too: tests/png.mjs
 * writes one and reads it back with zlib.
 */

const SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

/** Rows per write into the deflate: enough to keep it busy, few enough to keep memory flat. */
const ROWS_PER_WRITE = 256;

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

/** PNG's CRC-32, over the bytes given, carried on from `crc`. */
export function crc32(bytes, crc = 0xffffffff) {
  for (let i = 0; i < bytes.length; i++) crc = CRC[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
  return crc;
}

/** One chunk: its length, its type, its data, the CRC of the last two. */
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, (crc32(out.subarray(4, 8 + data.length)) ^ 0xffffffff) >>> 0);
  return out;
}

function header(width, height, alpha) {
  const data = new Uint8Array(13);
  const view = new DataView(data.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  data.set([8, alpha ? 6 : 2, 0, 0, 0], 8);      // 8 bits, RGBA or RGB, deflate, adaptive filters, no interlace
  return data;
}

/** pHYs: pixels per metre, both ways — the dpi a printer reads. */
function physical(dpi) {
  const data = new Uint8Array(9);
  const view = new DataView(data.buffer);
  const perMetre = Math.round(dpi / 0.0254);
  view.setUint32(0, perMetre);
  view.setUint32(4, perMetre);
  data[8] = 1;
  return data;
}

/**
 * Write a PNG from bands of rows.
 *
 * @param {object} opts
 * @param {number} opts.width
 * @param {number} opts.height
 * @param {AsyncIterable<{rows: Uint8ClampedArray|Uint8Array, count: number}>|Iterable} opts.bands
 *        top to bottom, each `count` rows of RGBA, `width × count × 4` bytes
 * @param {number} [opts.dpi]          0 for none: no pHYs
 * @param {boolean} [opts.alpha=true]  false writes RGB and drops the bands' alpha
 * @returns {Promise<Blob>}
 */
export async function writePng({ width, height, bands, dpi = 0, alpha = true }) {
  const channels = alpha ? 4 : 3;
  const stride = width * channels;
  const parts = [SIGNATURE, chunk('IHDR', header(width, height, alpha))];
  if (dpi > 0) parts.push(chunk('pHYs', physical(dpi)));

  const deflate = new CompressionStream('deflate');
  const writer = deflate.writable.getWriter();
  const drained = (async () => {
    const reader = deflate.readable.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      parts.push(chunk('IDAT', value));
    }
  })();

  let above = new Uint8Array(stride), here = new Uint8Array(stride);
  let y = 0;
  for await (const { rows, count } of bands) {
    for (let r0 = 0; r0 < count; r0 += ROWS_PER_WRITE) {
      const n = Math.min(ROWS_PER_WRITE, count - r0);
      const out = new Uint8Array(n * (stride + 1));
      for (let r = 0; r < n; r++, y++) {
        if (y >= height) throw new Error(`png: more rows than its ${height}`);
        const src = (r0 + r) * width * 4;
        const at = r * (stride + 1);
        out[at] = y === 0 ? 0 : 2;                   // None for the first row, Up after
        for (let x = 0, i = 0; x < width; x++) {
          for (let c = 0; c < channels; c++, i++) {
            const v = rows[src + x * 4 + c];
            here[i] = v;
            out[at + 1 + i] = y === 0 ? v : (v - above[i]) & 255;
          }
        }
        [above, here] = [here, above];
      }
      await writer.write(out);
    }
  }
  if (y !== height) throw new Error(`png: ${y} rows of its ${height}`);
  await writer.close();
  await drained;
  parts.push(chunk('IEND', new Uint8Array(0)));
  return new Blob(parts, { type: 'image/png' });
}
