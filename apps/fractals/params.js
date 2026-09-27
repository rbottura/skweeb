/**
 * params.js — fractals' schema: the picture's format, and the fractal.
 *
 * The format is core's Format drawer, less what a picture drawn from nothing
 * has no use for: no `ink` or `canvas` format — there is no source to take a
 * size from — no `zoom`, since the fractal's own zoom is the plane's, and no
 * `bleed`: a fractal fills whatever it is given, so a bleed would only be a
 * bigger picture. The fractal's params are fractal.js's, the pass's own.
 */

import { defineParams } from '../../core/params.js';
import { frameParams, DERIVED } from '../../core/frame.js';
import { FRACTAL_PARAMS } from './fractal.js';

/** The drawers. The fractal first: it is what is being made. */
export const GROUPS = {
  fractal: { label: 'Fractal', open: true },
  colour:  { label: 'Colour', open: true },
  format:  { label: 'Format', open: false },
};

export function fractalParams() {
  const { zoom, bleed, ...frame } = frameParams({ format: 'ig-square' });
  return defineParams('fractals', {
    ...FRACTAL_PARAMS,
    ...frame,
    format: { ...frame.format, options: frame.format.options.filter(o => !DERIVED.includes(o)) },
  });
}
