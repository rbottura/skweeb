/**
 * filters/ — the catalogue, by id. A manifest, not a scan (rule 3): a filter
 * is in the catalogue when it is listed here.
 *
 * A filter is data, and imports nothing, so node can check it without a GPU
 * (tests/gpu-filters.mjs):
 *
 *   id, label
 *   source      where it came from: `skweeb` for one written here, otherwise
 *               a URL — and then `copyright`, the line its licence asks to keep
 *   licence     rule 5: every shader says under what. MIT, BSD or the like;
 *               LYGIA and unlicensed Shadertoy code are noncommercial and
 *               never enter
 *   params      a param schema, as an app's (core/params.js)
 *   passes      in order: { code, uniforms?(values, info) → number[] }, the
 *               code a WGSL `fx` (core/gpu/wgsl.js), the numbers its `Params`
 *               fields in the order declared
 */

import brightness from './brightness.js';
import contrast from './contrast.js';
import blur from './blur.js';
import pixelate from './pixelate.js';

export const FILTERS = Object.freeze(Object.fromEntries(
  [brightness, contrast, blur, pixelate].map(f => [f.id, f])));
