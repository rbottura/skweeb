/**
 * things.js — what stands on the map, and in what order it is drawn.
 *
 * Each thing is a block, as the map's recipe keeps it — `{ ref, col, row,
 * width }`, the part that is saved — and the object that block names,
 * opened into a preview's frames (core/rebuild.js `openFrames`, `draft`).
 * Its size is its ink, as on a compose page; it stands with its feet at its
 * cell's bottom middle, `width` tiles wide, as tall as its shape makes it,
 * so something tall rises over the cells above — a lamp over the wall.
 *
 * Drawn after the tiles, back to front by the row a thing stands on, then as
 * they were placed (`drawOrder`): lower on the map is nearer. A loop keeps
 * its own speed on the map's rate (core/playback.js `tickAt`), and a frame
 * is asked for once a tick.
 */

import { Vault }      from '../../core/vault.js';
import { openFrames } from '../../core/rebuild.js';
import { tickAt, framesOnPage } from '../../core/playback.js';

/** A new thing's block: one tile wide, on a cell. */
export const newBlock = (ref, col, row) => ({ ref, col, row, width: 1 });

/** An object's own size: its ink over the whole loop (as compose's `inkSize`). */
const sizeOf = h => (h.bounds && h.bounds.w > 0 && h.bounds.h > 0 ? { width: h.bounds.w, height: h.bounds.h }
  : { width: h.width, height: h.height });

/** Back to front: by the row it stands on, then as they were placed. */
export function drawOrder(items) {
  return items.map((p, i) => [p, i]).sort((a, b) => a[0].block.row - b[0].block.row || a[1] - b[1]).map(([p]) => p);
}

/**
 * Where a thing is drawn, in the map's pixels: its feet at its cell's
 * bottom middle, `width` tiles wide, its height its ink's shape.
 */
export function boxOf(block, size, tile) {
  const w = block.width * tile;
  const h = size && size.width > 0 ? (w * size.height) / size.width : w;
  return { x: (block.col + 0.5) * tile - w / 2, y: (block.row + 1) * tile - h, w, h };
}

/** The nearest thing whose box holds a point of the map — the one drawn last there — or null. */
export function thingAt(items, x, y, tile) {
  const order = drawOrder(items);
  for (let i = order.length - 1; i >= 0; i--) {
    const p = order[i];
    const b = boxOf(p.block, p.size, tile);
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return p;
  }
  return null;
}

export class Things {
  /** @param {{onChange: () => void}} opts   the list, or an object in it, changed */
  constructor({ onChange }) {
    this.items = [];
    this.onChange = onChange;
  }

  /** The blocks, as the map's recipe keeps them. */
  blocks() { return this.items.map(p => ({ ...p.block })); }

  /** A thing on the map, opened; it shows as soon as its frames are in. */
  add(block) {
    const p = { block: { ...block }, title: '…', thumb: null, handle: null, size: null, error: null, tick: -1, image: null };
    this.items.push(p);
    this.onChange();
    p.opening = this._open(p);
    return p;
  }

  remove(p) {
    this.items = this.items.filter(q => q !== p);
    if (p.handle && p.handle.dispose) p.handle.dispose();
    this.onChange();
  }

  /** A block edited: opened again only when it names another object. */
  update(p, block) {
    const other = block.ref !== p.block.ref;
    p.block = { ...block };
    if (other) {
      if (p.handle && p.handle.dispose) p.handle.dispose();
      Object.assign(p, { handle: null, size: null, error: null, tick: -1, image: null, title: '…' });
      if (block.ref) p.opening = this._open(p);
    }
    this.onChange();
  }

  /** Every thing, as blocks name them — a map reopened — once all are open. */
  async load(blocks) {
    for (const p of this.items) if (p.handle && p.handle.dispose) p.handle.dispose();
    this.items = [];
    for (const b of blocks || []) this.add(b);
    await Promise.all(this.items.map(p => p.opening));
  }

  /** How many of the map's frames it lasts: its longest loop's, one if nothing moves. */
  length(fps) {
    return Math.max(1, ...this.items.map(p => (p.handle ? framesOnPage(p.handle, fps) : 1)));
  }

  /** What the map draws at one of its ticks: `{ image, box }`, back to front. */
  layers(tick, m) {
    const out = [];
    for (const p of drawOrder(this.items)) {
      if (!p.handle) continue;
      const image = this._frame(p, tickAt(tick, p.handle, m.fps));
      if (image) out.push({ image, box: boxOf(p.block, p.size, m.tile) });
    }
    return out;
  }

  _frame(p, t) {
    if (p.tick === t) return p.image;
    p.tick = t;
    try {
      p.image = p.handle.frame(Math.min(t, p.handle.length - 1));
    } catch (err) {
      p.image = null;
      console.warn('[map] could not draw frame', t, 'of', p.title, err);
    }
    return p.image;
  }

  async _open(p) {
    try {
      const { object, url, thumbUrl } = await Vault.load(p.block.ref);
      p.title = object.title || object.id;
      p.type = object.type;
      p.thumb = thumbUrl;
      p.handle = await openFrames(object, { url, draft: true });
      p.size = sizeOf(p.handle);
    } catch (err) {
      p.error = err.message;
    }
    this.onChange();
  }
}
