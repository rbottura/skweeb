/**
 * export.js — the deterministic exporter.
 *
 * The other one is p5.capture, which records the live canvas at its display
 * size from the live draw loop. It is the right tool for a draft and the wrong
 * one for anything that becomes an object: it cannot give you frame 437 at
 * 7000px without running frames 0 to 436 on screen first, and its
 * MediaRecorder path drops frames under load.
 *
 * This one has no clock in it. A frame is a pure function of its index, so the
 * same recipe and seed produce the same bytes at any size, and print scale is
 * one pass rather than a loop you sit through.
 *
 * Resolution is an export concern — see docs/core-api.md. Nothing here runs
 * during normal drawing.
 */

/**
 * Run a clockless frame loop.
 *
 * Split out from captureFrames() because collecting PNGs is one thing a frame
 * loop may be asked to do, not what a frame loop is. Grid dithering a sequence
 * runs every frame and keeps one of them; making it encode 1060 blobs in order
 * to throw 1059 away would cost hundreds of megabytes for nothing.
 *
 * @param {object} opts
 * @param {number} opts.count
 * @param {(i:number)=>any} opts.frame   called with the index, in order. May be
 *        async; must not read the clock.
 * @param {(done:number,total:number)=>void} [opts.onProgress]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<void>}
 */
export async function runFrames({ count, frame, onProgress, signal }) {
  for (let i = 0; i < count; i++) {
    if (signal && signal.aborted) throw new DOMException('export cancelled', 'AbortError');

    await frame(i);
    if (onProgress) onProgress(i + 1, count);

    // Yield to the event loop so a long export does not freeze the page and
    // the progress readout can actually paint.
    if ((i & 3) === 3) await new Promise(r => setTimeout(r, 0));
  }
}

/**
 * Run a frame loop and collect the results as PNG blobs.
 *
 * @param {object} opts
 * @param {number} opts.count            frames to produce
 * @param {(i:number)=>(HTMLCanvasElement|{canvas:HTMLCanvasElement}|null)} opts.draw
 *        Called with the frame index; returns the canvas holding that frame.
 *        Must be synchronous and must not read the clock.
 * @param {(done:number,total:number)=>void} [opts.onProgress]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<Blob[]>}
 */
export async function captureFrames({ count, draw, onProgress, signal }) {
  const frames = [];
  await runFrames({
    count,
    async frame(i) {
      const drawn = draw(i);
      const canvas = drawn && drawn.canvas ? drawn.canvas : drawn;
      if (!canvas) throw new Error('export: frame ' + i + ' produced no canvas');
      frames.push(await toPng(canvas));
    },
    onProgress,
    signal,
  });
  return frames;
}

/**
 * A canvas to a PNG blob, whichever kind of canvas it is.
 *
 * An OffscreenCanvas has `convertToBlob` and no `toBlob`, and every surface
 * grid makes is one — see apps/grid/grid.js. Getting this wrong is a
 * TypeError at frame zero of an export and nowhere else.
 */
export function toPng(canvas) {
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type: 'image/png' });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png');
  });
}

/** Zero-padded frame name, so an alphabetical sort is a numeric one. */
export function frameName(i, total, stem = 'frame') {
  const width = Math.max(4, String(Math.max(0, total - 1)).length);
  return stem + '_' + String(i).padStart(width, '0') + '.png';
}

// -- A zip, so a frame set is one file and not two hundred downloads ----------

/**
 * Store-only zip. PNGs are already deflated, so compressing again costs time
 * and saves nothing — and store-only is a few dozen lines instead of a
 * dependency, which is the trade this project keeps making.
 *
 * An entry is its bytes, or a Blob with its CRC and size already counted: a
 * Blob is placed in the zip by reference, so a long frame export holds one
 * frame's bytes at a time — to count them — rather than every frame's at once.
 *
 * @param {Array<{name:string, bytes:Uint8Array} | {name:string, blob:Blob, crc:number, size:number}>} entries
 * @returns {Blob}
 */
export function zipStore(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name);
    const crc = entry.blob ? entry.crc : crc32(entry.bytes);
    const size = entry.blob ? entry.size : entry.bytes.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);       // version needed
    local.setUint16(6, 0, true);        // flags
    local.setUint16(8, 0, true);        // method: stored
    local.setUint16(10, 0, true);       // time
    local.setUint16(12, 0x21, true);    // date: 1980-01-01, so zips are reproducible
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);

    chunks.push(new Uint8Array(local.buffer), name, entry.blob || entry.bytes);

    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(10, 0, true);
    dir.setUint16(12, 0, true);
    dir.setUint16(14, 0x21, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, size, true);
    dir.setUint32(24, size, true);
    dir.setUint16(28, name.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), name);

    offset += 30 + name.length + size;
  }

  let centralSize = 0;
  for (const c of central) centralSize += c.length;
  // A zip without ZIP64 counts in 32 bits: past 4 GiB, or 65535 entries, its numbers would wrap and
  // leave a file nothing can open. Said, rather than written broken.
  if (offset + centralSize + 22 > 0xffffffff || entries.length > 0xffff) {
    throw new Error(`these frames come to ${(offset / 2 ** 30).toFixed(2)} GiB in ${entries.length} files — `
      + 'past what a zip holds (4 GiB, 65535 files): export fewer frames, or at a smaller scale');
  }

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Hand a blob to the browser as a download. */
export function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
