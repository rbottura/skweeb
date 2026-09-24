/**
 * growth.js — sprites growing in as their cell fills, and out as it empties.
 *
 * A cell is empty or holds a tile, frame by frame. With `growIn` at N frames a
 * cell that has just filled draws its tile small and grows it to full size over
 * N frames; with `growOut` at M frames a cell that has just emptied keeps its
 * last tile and shrinks it away over M — the same curve run backwards, from
 * whatever size it had reached. A tile that changes in a filled cell stays full.
 *
 * ── A tracker, and a look-back ──────────────────────────────────────────────
 *
 * Each cell's size comes from its history: how long it has been filled, or how
 * long since it emptied and how grown it was then. Moving on one frame, that
 * history is updated in one pass over the cells (`advance`) — exact, and as
 * cheap as the dither itself. Only a jump — a scrub, the first frame of an
 * export, a replay opened in the middle — has to read it back through the
 * frames before (`historyAt`). A loop wraps, so frame 0 reads back into the
 * end and an export closes; a sequence that does not loop starts from nothing.
 *
 * ── The live preview never reads back ───────────────────────────────────────
 *
 * A gamepad recording is replayed from its marks, and a replay only walks
 * forward cheaply: one frame back is a walk all the way round the loop. So the
 * preview (`draft`) never reads back through the source. When playback skips
 * ticks it guesses the ones it did not see; after a jump, or a setting that
 * changes the dither, it starts settled — every tile full — and the tracker
 * takes over from the next frame. Exports and replays are exact: they move one
 * frame at a time, and a look-back maps its frames oldest first, so the source
 * still only steps forward.
 *
 * The first two versions read back on every frame, and on a real recording
 * the preview crawled or froze at two frames of growth (2026-09-24).
 */

import { mapFrame } from './grid.js';
import { easing }   from '../../core/easing.js';

const wrapTo = (k, n) => ((k % n) + n) % n;

/**
 * What each cell of frame `i` has been doing, read back. A filled cell's
 * `ages`: frames it has been filled, 1 on the first, counted to `growIn`. An
 * empty cell's `gaps`: frames since it emptied, if under `growOut` — with
 * `last`, the tile it had, and `then`, how old that tile was when it went.
 *
 * @param {(k:number) => Int16Array} indicesAt  a frame's cells, -1 for empty
 * @param {number} i
 * @param {{frames:number, loop:boolean, growIn:number, growOut:number}} o
 */
export function historyAt(indicesAt, i, { frames, loop, growIn, growOut }) {
  const now = indicesAt(i);
  const n = now.length;
  const ages = new Uint16Array(n), gaps = new Uint16Array(n), then = new Uint16Array(n);
  const last = new Int16Array(n).fill(-1);
  const capIn = Math.max(1, growIn), capOut = Math.max(0, growOut);

  let counting = [], seeking = [], aging = [];
  for (let c = 0; c < n; c++) {
    if (now[c] >= 0) { ages[c] = 1; if (capIn > 1) counting.push(c); }
    else if (capOut > 1) seeking.push(c);
  }

  for (let back = 1; counting.length || seeking.length || aging.length; back++) {
    let k = i - back;
    if (k < 0) {
      if (!loop) break;                         // before the start: nothing was there
      k = wrapTo(k, frames);
    }
    const past = indicesAt(k);
    if (counting.length) {
      const still = [];
      for (const c of counting) if (past[c] >= 0 && ++ages[c] < capIn) still.push(c);
      counting = still;
    }
    if (aging.length) {
      const still = [];
      for (const c of aging) if (past[c] >= 0 && ++then[c] < capIn) still.push(c);
      aging = still;
    }
    if (seeking.length) {
      const still = [];
      for (const c of seeking) {
        if (past[c] >= 0) {
          gaps[c] = back; last[c] = past[c]; then[c] = 1;
          if (capIn > 1) aging.push(c);
        } else if (back + 1 < capOut) still.push(c);
      }
      seeking = still;
    }
  }
  return { ages, gaps, last, then };
}

/**
 * The tracker: a history moved on by `k` frames, given the frame it lands on.
 * One frame is exact — what historyAt would read back, counted forward, for
 * one pass over the cells. More than one is the live preview skipping ticks,
 * and guesses at the frames it did not look at: a cell filled on both sides
 * stayed filled; one that changed did so halfway.
 *
 * @param {object} h     { prev, ages, gaps, last, then } — updated in place
 * @param {Int16Array} now
 * @param {number} k     frames moved on
 * @param {{growIn:number, growOut:number}} o
 */
export function advance(h, now, k, { growIn, growOut }) {
  const capIn = Math.max(1, growIn), capOut = Math.max(0, growOut);
  const first = k === 1 ? 1 : Math.ceil(k / 2);
  const { prev, ages, gaps, last, then } = h;
  for (let c = 0; c < now.length; c++) {
    if (now[c] >= 0) {
      ages[c] = Math.min(capIn, prev[c] >= 0 ? ages[c] + k : first);
      gaps[c] = 0;
    } else {
      if (prev[c] >= 0) {
        gaps[c] = first < capOut ? first : 0;
        last[c] = prev[c];
        then[c] = ages[c];
      } else if (gaps[c]) {
        gaps[c] = gaps[c] + k < capOut ? gaps[c] + k : 0;
      }
      ages[c] = 0;
    }
  }
  prev.set(now);
  return h;
}

/** A history with nothing moving: every filled cell full, nothing going. */
export function settled(now, growIn) {
  const ages = new Uint16Array(now.length);
  for (let c = 0; c < now.length; c++) if (now[c] >= 0) ages[c] = Math.max(1, growIn);
  return {
    prev: Int16Array.from(now), ages, gaps: new Uint16Array(now.length),
    last: new Int16Array(now.length).fill(-1), then: new Uint16Array(now.length),
  };
}

/**
 * Frame `i` as it is drawn: which tile each cell shows — a cell just emptied
 * still shows the one it had — and how big, 0 for nothing.
 *
 * @param {Int16Array} now      frame i's cells
 * @param {object} h            from historyAt, or the tracker's state
 * @param {{growIn:number, growOut:number, ease:(t:number)=>number}} o
 * @param {?{indices: Int16Array, scales: Float32Array}} [out]  reused when given
 * @returns {{indices: Int16Array, scales: Float32Array}}
 */
export function transitionAt(now, h, { growIn, growOut, ease }, out = null) {
  const indices = out ? out.indices : new Int16Array(now.length);
  const scales = out ? out.scales : new Float32Array(now.length);
  indices.set(now);
  const grown = age => (growIn < 2 || age >= growIn ? 1 : ease(age / growIn));
  for (let c = 0; c < now.length; c++) {
    if (now[c] >= 0) scales[c] = grown(h.ages[c]);
    else if (h.gaps[c]) {
      indices[c] = h.last[c];
      scales[c] = grown(h.then[c]) * ease((growOut - h.gaps[c]) / growOut);
    } else scales[c] = 0;
  }
  return { indices, scales };
}

/** How far back a look-back can read: the longest gap, then how old the tile was. */
export function depthOf(growIn, growOut) {
  const inBack = Math.max(0, growIn - 1);
  return growOut > 1 ? growOut - 1 + inBack : inBack;
}

/** What the mapping depends on: change any of these and every cached frame is stale. */
const keyOf = (recipe, frame, steps) => JSON.stringify([
  recipe.cell, recipe.invert, recipe.alphaFloor, recipe.weighting, steps,
  frame.width, frame.height, frame.from, frame.to,
]);

export class Growth {
  /**
   * @param {object} source   a handle from source.js, or anything with
   *                          frame(i), frames and loop
   * @param {object} [opts]
   * @param {boolean} [opts.draft=false]  the live preview: never read back
   */
  constructor(source, { draft = false } = {}) {
    this.source = source;
    this.draft = draft;
    this.cache = new Map();       // frame index → Int16Array, least recent first
    this.key = null;
    this.room = 16;
    this.state = null;            // the tracker: a history, at `tick`
    this.out = null;              // what at() hands back, reused
  }

  /** Frame `i` mapped, from the cache when it can be. A new mapping drops the tracker. */
  indicesAt(i, recipe, frame, steps) {
    const key = keyOf(recipe, frame, steps);
    if (key !== this.key) { this.cache.clear(); this.key = key; this.state = null; }
    let indices = this.cache.get(i);
    if (indices) this.cache.delete(i);          // most recent last, for the trim
    else indices = mapFrame({ recipe, source: this.source.frame(i), frame, steps });
    this.cache.set(i, indices);
    while (this.cache.size > this.room) this.cache.delete(this.cache.keys().next().value);
    return indices;
  }

  /** Frames from `a` forward to `b`: round the loop if it wraps; Infinity if not forward. */
  ahead(a, b) {
    const n = this.source.frames;
    if (this.source.loop !== false) return wrapTo(b - a, n);
    return b >= a ? b - a : Infinity;
  }

  /**
   * Frame `i`, ready for renderGrid: which tile each cell shows and how grown —
   * scales null when nothing grows, which draws exactly as before.
   */
  at(i, recipe, frame, steps) {
    const growIn = Math.round(recipe.growIn || 0);
    const growOut = Math.round(recipe.growOut || 0);
    const depth = depthOf(growIn, growOut);
    if (!depth || this.source.frames < 2) {
      this.room = 16;
      this.state = null;
      return { indices: this.indicesAt(i, recipe, frame, steps), scales: null };
    }
    this.room = Math.min(256, Math.max(16, depth + 32));
    const caps = { growIn, growOut };
    const now = this.indicesAt(i, recipe, frame, steps);
    let st = this.state;
    if (st && (st.growIn !== growIn || st.growOut !== growOut)) st = null;
    const k = st ? this.ahead(st.tick, i) : Infinity;

    if (st && k === 0) {
      // The same frame again: a setting downstream of the dither changed.
    } else if (st && k === 1) {
      advance(st, now, 1, caps);                         // exact, one pass
    } else if (st && this.draft && k !== Infinity) {
      advance(st, now, k, caps);                         // the preview skipped ticks: a guess
    } else if (st && k <= depth) {
      for (let t = 1; t <= k; t++) {                     // exact: the skipped frames, forward
        const f = wrapTo(st.tick + t, this.source.frames);
        advance(st, f === i ? now : this.indicesAt(f, recipe, frame, steps), 1, caps);
      }
    } else {
      st = this.draft && !this.cached(i, depth)
        ? settled(now, growIn)
        : { prev: Int16Array.from(now), ...this.history(i, depth, now, recipe, frame, steps, caps) };
      st.growIn = growIn;
      st.growOut = growOut;
    }
    st.tick = i;
    this.state = st;

    if (!this.out || this.out.indices.length !== now.length) {
      this.out = { indices: new Int16Array(now.length), scales: new Float32Array(now.length) };
    }
    return transitionAt(st.prev, st, { growIn, growOut, ease: easing(recipe.growEase) }, this.out);
  }

  /** Whether every frame a look-back from `i` reads is mapped already — no source needed. */
  cached(i, depth) {
    const n = this.source.frames, loop = this.source.loop !== false;
    for (let back = 1; back <= Math.min(depth, n - 1); back++) {
      const k = i - back;
      if (k < 0 && !loop) break;
      if (!this.cache.has(wrapTo(k, n))) return false;
    }
    return true;
  }

  /** A history read back from `i`, exact — its frames mapped oldest first, so the source steps forward. */
  history(i, depth, now, recipe, frame, steps, caps) {
    const n = this.source.frames, loop = this.source.loop !== false;
    for (let back = Math.min(depth, n - 1); back >= 1; back--) {
      const k = i - back;
      if (k < 0 && !loop) continue;
      this.indicesAt(wrapTo(k, n), recipe, frame, steps);
    }
    return historyAt(k => (k === i ? now : this.indicesAt(k, recipe, frame, steps)), i, {
      frames: n, loop, ...caps,
    });
  }
}
