/**
 * spritesheet.js — a loop as a sprite sheet: every frame on one PNG, and a
 * JSON a game engine reads to cut it up again.
 *
 * The sibling of sheet.js, which lays out a set's members as its contact
 * sheet; this lays out a loop's frames, in order, for a game (docs/roadmap.md,
 * *Across M5–M7*). Any app with frames can use it: particles first, then
 * compose, then anything core's openFrames() opens.
 *
 * ── The JSON ────────────────────────────────────────────────────────────────
 *
 * Aseprite's "array" export, which Phaser, Godot's importers, PixiJS and most
 * engines read: `frames`, one entry per frame in order — its rect on the
 * sheet, its size, its duration in whole milliseconds — and `meta`: the
 * image's file name, the sheet's size, and one tag spanning the loop, its
 * direction `forward`. Durations are whole ms, as the format wants; frame
 * `i` lasts `round((i + 1) × 1000 / fps) − round(i × 1000 / fps)`, so they
 * sum to the loop's own length exactly — 30 fps is 33, 34, 33, …, never a
 * loop that drifts a millisecond a frame.
 *
 * ── The crop ────────────────────────────────────────────────────────────────
 *
 * A game wants a torch the size of a torch. Every frame is cropped to one
 * box: where anything is drawn — alpha above zero — in any frame of the
 * loop, grown by a margin. One box for all, so the frames stay registered:
 * the emitter is at the same place in each, and the engine plays them in
 * place. So a sheet is drawn on no ground; a ground would fill the box.
 *
 * The pure parts — the box, the layout, the durations, the JSON — take and
 * give numbers, and are pinned in tests/spritesheet.mjs. `buildSheet()` is
 * the part that draws.
 */

/** Chrome's cap on a canvas's area; a sheet past it cannot be drawn. */
export const MAX_AREA = 268_435_456;

/**
 * Where anything is drawn in a frame's pixels: the smallest box holding
 * every pixel whose alpha is above zero, or null for an empty frame.
 *
 * @param {{data: Uint8ClampedArray, width: number, height: number}} image   ImageData, or its shape
 * @returns {?{x, y, w, h}}
 */
export function inkBox({ data, width, height }) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3] === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** The smallest box holding both; either may be null. */
export function unionBox(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/** A box grown by `pad` on every side, kept inside a `width` × `height` frame. */
export function padBox(box, pad, width, height) {
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
  return { x, y, w: Math.min(width, box.x + box.w + pad) - x, h: Math.min(height, box.y + box.h + pad) - y };
}

/**
 * Where each frame goes on the sheet: a grid, left to right and down, with
 * `gap` pixels between cells so an engine sampling at an edge never bleeds
 * into the next frame. As square as the frames allow, unless `cols` is said.
 *
 * @returns {{cols, rows, width, height, rects: Array<{x, y, w, h}>}}
 */
export function sheetLayout(count, w, h, { cols, gap = 2 } = {}) {
  const n = Math.max(1, count);
  const c = Math.max(1, Math.min(n, cols || Math.ceil(Math.sqrt((n * (h + gap)) / (w + gap)))));
  const rows = Math.ceil(n / c);
  const rects = Array.from({ length: n }, (_, i) =>
    ({ x: (i % c) * (w + gap), y: Math.floor(i / c) * (h + gap), w, h }));
  return { cols: c, rows, width: c * w + (c - 1) * gap, height: rows * h + (rows - 1) * gap, rects };
}

/** Each frame's duration in whole ms, summing to the loop's length in ms exactly. */
export function durations(count, fps) {
  const at = i => Math.round((i * 1000) / (fps > 0 ? fps : 30));
  return Array.from({ length: count }, (_, i) => at(i + 1) - at(i));
}

/**
 * The JSON beside the sheet, in Aseprite's array format.
 *
 * @param {object} args
 * @param {string} args.image     the sheet's file name, as it will sit beside this
 * @param {object} args.layout    from sheetLayout
 * @param {number} args.fps
 * @param {string} [args.name]    the frames' stem, and the tag's name
 * @param {boolean} [args.loop]   a loop or a one-shot: said in the tag, for whoever reads it
 * @param {object} [args.source]  anything to keep beside: the object's id, the crop
 */
export function sheetJson({ image, layout, fps, name = 'loop', loop = true, source = null }) {
  const ms = durations(layout.rects.length, fps);
  return {
    frames: layout.rects.map((r, i) => ({
      filename: `${name} ${i}`,
      frame: { x: r.x, y: r.y, w: r.w, h: r.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: r.w, h: r.h },
      sourceSize: { w: r.w, h: r.h },
      duration: ms[i],
    })),
    meta: {
      app: 'skweeb',
      version: '1',
      image,
      format: 'RGBA8888',
      size: { w: layout.width, h: layout.height },
      scale: '1',
      frameTags: [{ name, from: 0, to: layout.rects.length - 1, direction: 'forward', loop }],
      ...(source ? { skweeb: source } : {}),
    },
  };
}

/** Off screen where the browser can. */
function surface(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return Object.assign(document.createElement('canvas'), { width: w, height: h });
}

/**
 * Draw a sprite sheet: every frame once to find the box the loop reaches,
 * then every frame again onto the sheet, cropped to it.
 *
 * @param {object} args
 * @param {number} args.count                 frames in the loop
 * @param {(i: number) => CanvasImageSource & {width, height}} args.frame
 *        frame `i`, on no ground; borrowed — it may be drawn over on the next call
 * @param {number} args.fps
 * @param {string} args.name                  the files' stem: `<name>.png`, `<name>.json`
 * @param {boolean} [args.loop=true]
 * @param {number} [args.pad=2]               margin round the box, in the frame's pixels
 * @param {boolean} [args.crop=true]          false keeps the whole frame
 * @param {object} [args.source]              kept in meta.skweeb
 * @param {(done: number, total: number) => void} [args.onProgress]
 * @returns {Promise<{canvas, json, box, layout}>}
 */
export async function buildSheet({ count, frame, fps, name, loop = true, pad = 2, crop = true,
                                   source = null, onProgress = () => {} }) {
  const first = frame(0);
  const W = first.width, H = first.height;
  let box = { x: 0, y: 0, w: W, h: H };

  if (crop) {
    const probe = surface(W, H).getContext('2d', { willReadFrequently: true });
    let ink = null;
    for (let i = 0; i < count; i++) {
      probe.clearRect(0, 0, W, H);
      probe.drawImage(frame(i), 0, 0);
      ink = unionBox(ink, inkBox(probe.getImageData(0, 0, W, H)));
      onProgress(i + 1, count * 2);
      if (i % 8 === 7) await new Promise(r => setTimeout(r, 0));
    }
    box = ink ? padBox(ink, pad, W, H) : { x: 0, y: 0, w: 1, h: 1 };
  }

  const layout = sheetLayout(count, box.w, box.h);
  if (layout.width * layout.height > MAX_AREA) {
    throw new Error(`a sheet of ${layout.width} × ${layout.height} is past what a canvas can hold — fewer frames, or a smaller picture`);
  }
  const canvas = surface(layout.width, layout.height);
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < count; i++) {
    const cell = layout.rects[i];
    ctx.drawImage(frame(i), box.x, box.y, box.w, box.h, cell.x, cell.y, cell.w, cell.h);
    onProgress(count + i + 1, count * 2);
    if (i % 8 === 7) await new Promise(r => setTimeout(r, 0));
  }

  const json = sheetJson({ image: `${name}.png`, layout, fps, name, loop,
                           source: { ...(source || {}), crop: box, from: { w: W, h: H } } });
  return { canvas, json, box, layout };
}
