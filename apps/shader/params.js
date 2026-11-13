/**
 * params.js — the shader app's schema: the loop a surface is drawn over, its
 * seed, and the format. The chain itself is not here.
 *
 * A chain is a list, and each row carries the schema of its own filter
 * (core/gpu/filters/), so it lives beside the params as filter's does
 * (rows.js). The recipe is `{ time, frames, fps, seed, …the format, chain }`.
 *
 * `frames` is the loop's length, which every generator that scrolls comes
 * round in (filters/meet.js): a scroll of 1 is one tile across in that many
 * frames. One frame is a still, and nothing moves. `time` says whether
 * those frames close into a loop or are a *life*, played once: a dissolve
 * then runs birth to death over them (filters/meet.js, `ageOf`).
 *
 * The format is core's, less what a picture made from nothing has no use
 * for, as fractals': no `ink` or `canvas` — there is no source to take a
 * size from — no `zoom`, no `bleed`.
 */

import { defineParams } from '../../core/params.js';
import { frameParams, DERIVED } from '../../core/frame.js';

/** The drawers. The chain's rows join `surface`; the starters' is main.js's. */
export const GROUPS = {
  surface:  { label: 'Surface', open: true },
  time:     { label: 'Time', open: true },
};

export function shaderParams() {
  const { zoom, bleed, ...frame } = frameParams({ format: 'ig-square' });
  return defineParams('shader', {
    /** What a row that draws at random draws from — a noise above all (rule 2): the same seed, the same surface. */
    seed:   { type: 'int', min: 0, max: 999999, default: 1, label: 'seed', group: 'surface' },
    /** A loop closes; a life is played once, its first frame its birth and its last its death — what a particle wears. */
    time:   { type: 'enum', options: ['loop', 'life'], default: 'loop', display: 'chips', label: 'played', group: 'time',
              labels: { loop: 'a loop', life: 'a life, once' } },
    frames: { type: 'int', min: 1, max: 600, default: 48, label: 'frames', group: 'time' },
    fps:    { type: 'int', min: 1, max: 60, default: 24, label: 'fps', group: 'time' },
    ...frame,
    format: { ...frame.format, options: frame.format.options.filter(o => !DERIVED.includes(o)) },
  });
}
