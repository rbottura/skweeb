/**
 * filters/ — the catalogue, by id. A manifest, not a scan (rule 3): a filter
 * is in the catalogue when it is listed here.
 *
 * A filter is data, and imports nothing, so node can check it without a GPU
 * (tests/gpu-filters.mjs):
 *
 *   id, label
 *   source      where it came from: `skweeb` for one written here, otherwise
 *               a URL — and then `copyright`, the line its licence asks to keep,
 *               and `notice`, the file beside these that holds its licence's
 *               whole text (LICENSE-p5.FIP.txt), as MIT and BSD ask
 *   licence     rule 5: every shader says under what. MIT, BSD or the like;
 *               LYGIA and unlicensed Shadertoy code are noncommercial and
 *               never enter
 *   params      a param schema, as an app's (core/params.js)
 *   reach?      (values) → how far past its picture it can spread, in the
 *               source's pixels: a blur's taps, an outline's width. Absent is
 *               0 — a colour change reaches nowhere (runner.js, *Past the edge*)
 *   passes      in order: { code, uniforms?(values, info) → number[] }, the
 *               code a WGSL `fx` (core/gpu/wgsl.js), the numbers its `Params`
 *               fields in the order declared
 */

import brightness from './brightness.js';
import contrast from './contrast.js';
import blur from './blur.js';
import pixelate from './pixelate.js';
// From p5.FIP (MIT): LICENSE-p5.FIP.txt.
import saturation from './saturation.js';
import invert from './invert.js';
import sepia from './sepia.js';
import duotone from './duotone.js';
import threshold from './threshold.js';
import posterize from './posterize.js';

/** In the order the add menu lists them: tone and colour first, then blur and blocks. */
export const FILTERS = Object.freeze(Object.fromEntries(
  [brightness, contrast, saturation, invert, sepia, duotone, threshold, posterize, blur, pixelate]
    .map(f => [f.id, f])));
