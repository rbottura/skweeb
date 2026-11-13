/**
 * effects.js — what plays over the map when an effect is used: an object's
 * frames, once, at the thing's cell, and then it is gone (M15g, docs/vfx.md).
 *
 * The object is any the suite makes, opened as everything is
 * (core/rebuild.js `openFrames`): a life from the shader, particles wearing
 * one, a compose page of several — a flash, the fire, its smoke. It is not a
 * thing of the map: nothing of it is saved, walked round or outlined; it is
 * drawn over the things for as long as it lasts, by the wall clock, at its
 * own rate — `effectFrame` (maps.js) says which frame, and when it is over.
 *
 * A map's effects are opened as the map is, so a click plays at once; one
 * that would not open plays nothing, and says so once. Used again while it
 * plays, it plays again over itself: two bursts, each on its clock.
 */

import { Vault }      from '../../../core/vault.js';
import { openFrames } from '../../../core/rebuild.js';
import { effectOf, effectFrame, effectBox } from './maps.js';

export class Effects {
  constructor() {
    this.opened = new Map();   // an object's id → Promise<its frames>
    this.playing = [];         // { effect, handle, start } — each one on its own clock
  }

  /** An object's frames, opened once and kept for every time it plays. */
  _open(id) {
    if (!this.opened.has(id)) {
      this.opened.set(id, Vault.load(id).then(({ object, url }) => openFrames(object, { url })));
    }
    return this.opened.get(id);
  }

  /** A map's effects opened ahead, so the first click plays at once; what would not open waits to be said. */
  ready(recipe) {
    for (const b of (recipe && recipe.place) || []) {
      const e = effectOf(b);
      if (e && e.plays) this._open(e.plays).catch(() => {});
    }
  }

  /**
   * Play a block's effect from `now` — when its frames are in, if they are
   * not yet. Resolves true once it plays; throws when it would not open.
   */
  async play(block, now = () => performance.now()) {
    const effect = effectOf(block);
    if (!effect || !effect.plays) return false;
    const handle = await this._open(effect.plays);
    this.playing.push({ effect, handle, start: now() });
    return true;
  }

  /** Whether anything plays: the map is drawn again every frame while it does. */
  get active() { return this.playing.length > 0; }

  /**
   * What plays at `now`, as the map draws its things — `{ image, box }`, over
   * them all; what has reached its end is let go of here, so the frame after
   * its last is the map alone.
   */
  layers(now, m) {
    const out = [];
    this.playing = this.playing.filter(p => {
      const i = effectFrame(now - p.start, p.handle.fps, p.handle.length);
      if (i < 0) return false;
      try {
        const image = p.handle.frame(i);
        if (image) out.push({ image, box: effectBox(p.effect, p.handle, m.tile) });
        return true;
      } catch (err) {
        console.warn('[map] an effect would not draw its frame', i, err);
        return false;
      }
    });
    return out;
  }

  /** Nothing playing any more — another map — its frames kept for the way back. */
  stop() { this.playing = []; }
}
