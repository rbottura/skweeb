/**
 * things.js — what stands on the map, and in what order it is drawn.
 *
 * Each thing is a block, as the map's recipe keeps it — `{ ref, col, row,
 * width }`, the part that is saved — and the object that block names,
 * opened into frames (core/rebuild.js `openFrames`): a preview's drafts in
 * the editor, exact ones for a save and a replay (frames.js).
 * Its size is its ink, as on a compose page; it stands with its feet at its
 * cell's bottom middle, `width` tiles wide, as tall as its shape makes it,
 * so something tall rises over the cells above — a lamp over the wall.
 *
 * Drawn after the tiles, back to front by the row a thing stands on, then as
 * they were placed (`drawOrder`): lower on the map is nearer. A loop keeps
 * its own speed on the map's rate (core/playback.js `tickAt`), and a frame
 * is asked for once a tick.
 *
 * A block may name no object: an event with nothing to see — an exit, the
 * spawn (params.js `EVENTS`). It opens nothing, draws nothing, and is a
 * tile square where a press finds it.
 */

import { Vault }      from '../../core/vault.js';
import { openFrames } from '../../core/rebuild.js';
import { listen }     from '../../core/scope.js';
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
  /**
   * @param {object} opts
   * @param {() => void} opts.onChange   the list, or an object in it, changed
   * @param {boolean} [opts.draft=true]  a preview's frames; a save and a replay ask for exact ones
   * @param {number} [opts.scale=1]      pixels per pixel of each thing's own size, for a print
   */
  constructor({ onChange, draft = true, scale = 1 }) {
    this.items = [];
    this.onChange = onChange;
    this.draft = draft;
    this.scale = scale;
    // A smart object standing on the map took a new version (core/vault.js `vault:updated`): opened again,
    // drawn as it is now, wherever the map is — the editor, the player, a replay (L11).
    this._off = typeof document === 'undefined' ? () => {} : listen(document, 'vault:updated', ({ detail }) => {
      for (const p of this.items) if (detail && p.block.ref === detail.id) this._again(p);
    });
  }

  /** A thing opened again, its block the same: what it names changed. */
  _again(p) {
    if (p.handle && p.handle.dispose) p.handle.dispose();
    Object.assign(p, { handle: null, size: null, error: null, tick: -1, image: null });
    p.opening = this._open(p);
  }

  /** The blocks, as the map's recipe keeps them. */
  blocks() { return this.items.map(p => ({ ...p.block })); }

  /** A thing on the map, opened; it shows as soon as its frames are in. */
  add(block) {
    const p = { block: { ...block }, title: block.ref ? '…' : '', thumb: null, handle: null, size: null, error: null, tick: -1, image: null };
    this.items.push(p);
    this.onChange();
    p.opening = this._open(p);
    return p;
  }

  remove(p) {
    this.items = this.items.filter(q => q !== p);
    p.gone = true;                                // still opening: its frames are let go of as they come
    if (p.handle && p.handle.dispose) p.handle.dispose();
    this.onChange();
  }

  /** Every thing let go of, its frames with it — one still opening, as they come: its app unmounted. */
  dispose() {
    for (const p of this.items) { p.gone = true; if (p.handle && p.handle.dispose) p.handle.dispose(); p.handle = null; }
    this.items = [];
    this._off();
  }

  /** A block edited: opened again only when it names another object. */
  update(p, block) {
    const other = block.ref !== p.block.ref;
    p.block = { ...block };
    if (other) {
      if (p.handle && p.handle.dispose) p.handle.dispose();
      Object.assign(p, { handle: null, size: null, error: null, tick: -1, image: null,
                         title: block.ref ? '…' : '', thumb: null, type: null });
      p.opening = this._open(p);
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

  /**
   * What the map draws at one of its ticks: `{ image, box, row }`, back to front, each with the row it
   * stands on — so the player puts its avatar among them — and less the blocks `skip` says, the spawn
   * there: the avatar wears what stands on it (play/avatar.js).
   */
  layers(tick, m, skip = null) {
    const out = [];
    for (const p of drawOrder(this.items)) {
      if (!p.handle || (skip && skip(p.block))) continue;
      const image = this._frame(p, tickAt(tick, p.handle, m.fps));
      if (image) out.push({ image, box: boxOf(p.block, p.size, m.tile), row: p.block.row });
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
    if (!p.block.ref) return this.onChange();     // an event with nothing to see
    try {
      const { object, url, thumbUrl } = await Vault.load(p.block.ref);
      p.title = object.title || object.id;
      p.type = object.type;
      p.thumb = thumbUrl;
      const handle = await openFrames(object, { url, draft: this.draft, scale: this.scale });
      if (p.gone) { if (handle.dispose) handle.dispose(); return; }   // taken off, or its app gone, while it opened
      p.handle = handle;
      p.size = sizeOf(p.handle);
    } catch (err) {
      p.error = err.message;
    }
    this.onChange();
  }
}
