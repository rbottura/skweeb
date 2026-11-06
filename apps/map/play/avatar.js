/**
 * avatar.js — who walks the map (M8's fourth brick, P4, 2026-11-06): what it
 * wears, where it stands, its steps, and its picture at each frame.
 *
 * It wears what stands on the spawn (walk.js `spawnOf`): a character
 * (core/character.js) — a loop by direction, the left the right mirrored —
 * or any other object, the same picture facing every way; on a spawn with
 * nothing to see, a disc with a nose the way it faces. It stands on a cell,
 * faces one way, and walks a cell at a time, STEP_MS a cell, drawn between
 * the two as it goes: its direction's loop plays at its own rate while it
 * walks, on from cell to cell, and it shows the loop's first frame — its
 * stance — standing. Drawn as a thing is (things.js `boxOf`): its feet at
 * its cell's bottom middle, a tile wide.
 *
 * Where it stands lives here, in the player, never in a recipe (M8's rule).
 */

import { Vault }      from '../../../core/vault.js';
import { openFrames } from '../../../core/rebuild.js';
import { surface }    from '../../../core/surface.js';
import { characterOf, STANCE } from '../../../core/character.js';
import { boxOf }      from '../things.js';
import { walkable, ahead } from '../walk.js';

/** How long a step from one cell to the next takes: four cells a second, near enough. */
export const STEP_MS = 240;

/** An object's own size: its ink over the whole loop (things.js keeps the same rule). */
const sizeOf = h => (h.bounds && h.bounds.w > 0 && h.bounds.h > 0 ? { width: h.bounds.w, height: h.bounds.h }
  : { width: h.width, height: h.height });

const opened = async id => {
  const { object, url } = await Vault.load(id);
  return { object, handle: await openFrames(object, { url, draft: true }) };
};

export class Avatar {
  constructor() {
    this.at = { col: 0, row: 0 };
    this.face = 'down';
    this.step = null;          // { from, to, t0 }: between two cells
    this.path = [];            // the cells a tap asked for, in turn
    this.since = 0;            // when it began walking, for its loop's frame; 0 standing
    this.ref = undefined;      // what it wears, by id — null for nothing; undefined before the first
    this.ways = null;          // { down, left, right, up }: { handle, mirrored, size }
    this.flipped = null;       // a mirrored frame's canvas, drawn again each frame
  }

  /** Stood on a cell, facing a way: the spawn, or where a warp brings it. A step under way is dropped. */
  place({ col, row, face }) {
    Object.assign(this, { at: { col, row }, face: face || 'down', step: null, path: [], since: 0 });
  }

  /** Dressed in what a spawn names — a character, anything else, or nothing; asked for what it wears, kept. */
  async wear(ref) {
    if (ref === this.ref) return;
    const was = this.ways;
    this.ref = ref || null;
    this.ways = null;
    if (ref) {
      try {
        const { object, handle } = await opened(ref);
        const character = characterOf(object);
        if (character) {
          if (handle.dispose) handle.dispose();     // the set's own picture, its contact sheet: not what it walks as
          const handles = new Map();
          for (const { id } of Object.values(character)) if (!handles.has(id)) handles.set(id, (await opened(id)).handle);
          this.ways = Object.fromEntries(Object.entries(character).map(([face, w]) =>
            [face, { handle: handles.get(w.id), mirrored: w.mirrored, size: sizeOf(handles.get(w.id)) }]));
        } else {
          const one = { handle, mirrored: false, size: sizeOf(handle) };
          this.ways = { down: one, left: one, right: one, up: one };
        }
      } catch (err) {
        console.warn('[map] the avatar could not wear', ref, err);
        this.ways = null;
      }
    }
    this._let(was);
  }

  /** Whether it is between two cells. */
  get walking() { return !!this.step; }

  /** The cell it stands on once the step under way ends: where a tap's way starts. */
  get bound() { return this.step ? this.step.to : this.at; }

  /** Turned a way, and a step taken there if the cell can be walked. Whether it stepped. */
  go(face, recipe, now) {
    this.face = face;
    const to = ahead(this.at, face);
    if (!walkable(recipe, to.col, to.row)) return false;
    this.step = { from: this.at, to, t0: now };
    if (!this.since) this.since = now;
    return true;
  }

  /** Time passes: the step under way ends on its cell, given back — or null, still between, or standing. */
  advance(now) {
    if (!this.step || now - this.step.t0 < STEP_MS) return null;
    this.at = this.step.to;
    this.step = null;
    return this.at;
  }

  /** Standing again: its loop back to its stance. */
  stand() { this.since = 0; }

  /** What the map draws for it at `now`: `{ image, box, row }`, its row the one it is nearest on. */
  layer(m, now) {
    const way = this.ways && this.ways[this.face];
    const t = this.step ? Math.min(1, (now - this.step.t0) / STEP_MS) : 0;
    const from = this.step ? this.step.from : this.at, to = this.step ? this.step.to : this.at;
    const block = { col: from.col + (to.col - from.col) * t, row: from.row + (to.row - from.row) * t, width: 1 };
    const row = Math.max(from.row, to.row);
    if (!way) return { image: this._disc(m.tile), box: boxOf(block, null, m.tile), row };
    const { handle, mirrored, size } = way;
    const n = Math.max(1, handle.length || 1);
    const frame = this.since && n > 1 ? Math.floor(((now - this.since) / 1000) * (handle.fps || 12)) % n : Math.min(STANCE, n - 1);
    const image = handle.frame(frame);
    return { image: mirrored ? this._mirror(image) : image, box: boxOf(block, size, m.tile), row };
  }

  /** Everything it wore let go of: the player gone. */
  dispose() { this._let(this.ways); this.ways = null; this.ref = undefined; }

  _let(ways) {
    for (const w of new Set(Object.values(ways || {}).map(w => w.handle))) if (w && w.dispose) w.dispose();
  }

  /** A frame flipped left to right: a left that is the right, mirrored. */
  _mirror(image) {
    if (!this.flipped || this.flipped.width !== image.width || this.flipped.height !== image.height) this.flipped = surface(image.width, image.height);
    const g = this.flipped.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, image.width, image.height);
    g.setTransform(-1, 0, 0, 1, image.width, 0);
    g.drawImage(image, 0, 0);
    return this.flipped;
  }

  /** Nothing to wear: a dark disc, a yellow nose the way it faces, a tile square. */
  _disc(tile) {
    const side = Math.max(8, Math.round(tile));
    const key = side + this.face;
    if (this._discKey === key) return this._discImage;
    const c = surface(side, side), g = c.getContext('2d'), r = side * 0.34, mid = side / 2;
    g.fillStyle = '#111111';
    g.beginPath(); g.arc(mid, mid, r, 0, Math.PI * 2); g.fill();
    const [dx, dy] = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.face] || [0, 1];
    g.fillStyle = '#ffd60a';
    g.beginPath();
    g.moveTo(mid + dx * r * 1.25, mid + dy * r * 1.25);
    g.lineTo(mid + dx * r * 0.45 - dy * r * 0.45, mid + dy * r * 0.45 + dx * r * 0.45);
    g.lineTo(mid + dx * r * 0.45 + dy * r * 0.45, mid + dy * r * 0.45 - dx * r * 0.45);
    g.fill();
    this._discKey = key;
    this._discImage = c;
    return c;
  }
}
