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
 *               whole text (LICENSE-p5.FIP.txt, LICENSE-glfx.txt), as MIT and BSD ask
 *   licence     rule 5: every shader says under what. MIT, BSD or the like;
 *               LYGIA and unlicensed Shadertoy code are noncommercial and
 *               never enter
 *   params      a param schema, as an app's (core/params.js)
 *   random?     true when it draws at random — from the recipe's seed and
 *               the frame's tick, never the clock (rule 2)
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
import sharpen from './sharpen.js';
import unsharp from './unsharp.js';
import emboss from './emboss.js';
import edges from './edges.js';
import dilate from './dilate.js';
import erode from './erode.js';
import halftone from './halftone.js';
import dots from './dots.js';
import crt from './crt.js';
import vignette from './vignette.js';
import grain from './grain.js';
import glitch from './glitch.js';
import gradientmap from './gradientmap.js';
import motionblur from './motionblur.js';
import zoomblur from './zoomblur.js';
import dither from './dither.js';
// For game assets, the suite's own.
import outline from './outline.js';
import shadow from './shadow.js';
import palette from './palette.js';

/**
 * In the order the add menu lists them: tone and colour; blur and detail;
 * shape and edges; stylise; then for game assets.
 */
export const FILTERS = Object.freeze(Object.fromEntries([
  brightness, contrast, saturation, invert, sepia, duotone, gradientmap, threshold, posterize,
  blur, motionblur, zoomblur, sharpen, unsharp, pixelate,
  emboss, edges, dilate, erode,
  halftone, dots, dither, crt, vignette, grain, glitch,
  outline, shadow, palette,
].map(f => [f.id, f])));
