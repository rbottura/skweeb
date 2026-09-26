/**
 * placements.js — what is on the page, in order, bottom first.
 *
 * Each entry is two things. Its `block` is the placement as a composition's
 * recipe keeps it (docs/object-model.md, *Placement*): the part that will be
 * saved, and the only part that is. The rest is the object that block names,
 * opened into frames (core/rebuild.js) — what gets drawn, which comes and
 * goes, a slow rebuild or a missing object, without the block changing.
 *
 * Time follows the author's rule of 2026-09-24: a loop plays again until the
 * page ends, a still is there for all of it, and the page lasts as long as
 * its longest loop (time.js).
 */

import { Vault }      from '../../core/vault.js';
import { openFrames } from '../../core/rebuild.js';
import { lookOver }   from '../../core/gpu/look.js';
import { inkSize }    from './page.js';
import { moves, framesOnPage, tickAt } from './time.js';

/**
 * An object from the vault as a preview's frames (`draft`): near exact where
 * its app has a faster way. An export will ask for exact ones.
 *
 * A block's look, when it has one, goes over the frames (core/gpu/look.js).
 *
 * @param {string} ref
 * @param {object} [block]
 * @returns {Promise<{object, handle, thumb}>}
 */
async function fromVault(ref, block) {
  const { object, url, thumbUrl } = await Vault.load(ref);
  const handle = await openFrames(object, { url, draft: true });
  return { object, handle: await lookOver(handle, block && block.look), thumb: thumbUrl };
}

export class Placements {
  /**
   * @param {object} opts
   * @param {() => void} opts.onChange     the list, or an object in it, changed
   * @param {(text: string) => void} opts.say   something worth telling
   * @param {(ref: string, block: object) => Promise<{object, handle, thumb}>} [opts.load]
   *        how an object is opened: the vault, unless a test says otherwise;
   *        given the block too, for the size it will be drawn at
   */
  constructor({ onChange = () => {}, say = () => {}, load = fromVault } = {}) {
    this.items = [];
    this.onChange = onChange;
    this.say = say;
    this.load = load;
  }

  get length() { return this.items.length; }

  /** Whether anything on the page moves. */
  get moving() { return this.items.some(p => moves(p.handle)); }

  /** The blocks, bottom first: the composition's `place` list. */
  blocks() { return this.items.map(p => p.block); }

  /**
   * Put an object on the page, on top. The entry comes back at once; its
   * object opens behind it (`entry.opening`).
   *
   * @param {object} block   a placement block
   */
  add(block) {
    const p = { block, title: block.ref, type: '', thumb: null, error: null,
                handle: null, size: null, tick: -1, image: null, loads: 0, opening: null };
    this.items.push(p);
    p.opening = this.open(p);
    this.onChange();
    return p;
  }

  /** Take an entry off the page. */
  remove(p) {
    const i = this.items.indexOf(p);
    if (i < 0) return;
    this.items.splice(i, 1);
    p.loads++;                                   // a load still running is dropped
    if (p.handle) p.handle.dispose();
    this.onChange();
  }

  /**
   * Move an entry through the stack: `+1` draws it over the one above it,
   * `-1` under the one below. Stops at the top and the bottom.
   */
  move(p, by) {
    const i = this.items.indexOf(p);
    const j = Math.max(0, Math.min(this.items.length - 1, i + by));
    if (i < 0 || i === j) return;
    this.items.splice(i, 1);
    this.items.splice(j, 0, p);
    this.onChange();
  }

  /** An entry's block, changed. Naming another object, or another look, opens it again. */
  update(p, block) {
    const other = block.ref !== p.block.ref || (block.look || null) !== (p.block.look || null);
    p.block = block;
    if (other) p.opening = this.open(p);
    return p.opening;
  }

  /**
   * Open an entry's object into frames. The newest ask wins: one that
   * finishes after another was made, or after the entry left the page, is
   * dropped.
   */
  async open(p) {
    const token = ++p.loads;
    if (p.handle) p.handle.dispose();
    Object.assign(p, { handle: null, size: null, tick: -1, image: null, error: null });
    try {
      const { object, handle, thumb } = await this.load(p.block.ref, p.block);
      if (token !== p.loads) { handle.dispose(); return p; }
      if (!handle.length) { handle.dispose(); throw new Error('it rebuilt to no frames'); }
      Object.assign(p, { title: object.title || object.id, type: object.type, thumb,
                         handle, size: inkSize(handle) });
      const missing = handle.missing || [];
      if (missing.length) this.say(`${p.title} is drawn without ${missing.join(', ')}: not on this machine`);
    } catch (err) {
      if (token !== p.loads) return p;
      p.error = err.message;
      console.warn('[compose] could not open', p.block.ref, err);
      this.say(`could not open ${p.block.ref}: ${err.message}`);
    }
    this.onChange();
    return p;
  }

  /** How long the page is, in its frames: its longest loop, or one. */
  frames(fps) {
    return Math.max(1, ...this.items.map(p => framesOnPage(p.handle, fps)));
  }

  /** What the page draws at one of its ticks: every open entry, bottom first. */
  layers(pageTick, fps) {
    const out = [];
    for (const p of this.items) {
      if (!p.handle) continue;
      const image = this.frameOf(p, tickAt(pageTick, p.handle, fps));
      if (image) out.push({ image, size: p.size, transform: p.block.transform });
    }
    return out;
  }

  /**
   * An entry's object at its own `tick`, asked for once per tick. The frame
   * is borrowed from the handle and nothing else asks it for another, so it
   * holds until the tick moves — a dragged slider must not re-dither a grid.
   * A tick that fails to draw is said once and left out.
   */
  frameOf(p, tick) {
    const t = Math.min(tick, p.handle.length - 1);
    if (p.tick === t) return p.image;
    p.tick = t;
    try {
      p.image = p.handle.frame(t);
    } catch (err) {
      p.image = null;
      console.warn('[compose] could not draw frame', t, 'of', p.title, err);
      this.say(`could not draw ${p.title}: ${err.message}`);
    }
    return p.image;
  }
}
