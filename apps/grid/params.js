/**
 * params.js — grid's parameters, and therefore grid's recipe.
 *
 * The schema is a function of the material manifest rather than a constant,
 * because the ramps an installation has are whatever `generate-grid-manifest`
 * found on disk. That keeps rule 3 intact: the app reads a generated list, and
 * nothing walks a directory at runtime.
 *
 * What is NOT here is as deliberate as what is. The original carried
 * `listPlayers`, a webcam capture, a 226-frame clip loader, letters from a
 * text blob and four debug colours, all at file scope and all dead or
 * commented out. None of it is a parameter, so none of it is here.
 *
 * On seeds: grid has none, and `seed: null` is the honest envelope value.
 * A luminance dither is a pure function of its source and its ramp — there is
 * no random in it to record. That is the same position the gamepad is in, for
 * the same reason.
 */

import { defineParams } from '../../core/params.js';

/** The width, in pixels, the live canvas renders at. Export re-runs at scale. */
const DEFAULT_WIDTH = 518;

/**
 * @param {{ramps: Array<{id: string, count: number}>}} manifest
 * @returns {ReturnType<typeof defineParams>}
 */
export function gridParams(manifest) {
  const ramps = (manifest && manifest.ramps || []).map(r => r.id);
  if (!ramps.length) {
    throw new Error('grid: no material ramps in the manifest. ' +
                    'Run node scripts/generate-grid-manifest.js');
  }

  return defineParams('grid', {
    /**
     * The image being dithered. This one row is how grid eats what the
     * gamepad made, and choosing something here is also the whole of the
     * lineage — Params.consumedObjectIds() reads it straight back out as the
     * saved object's `parents`.
     */
    source: {
      type: 'object',
      accepts: ['still', 'sequence'],
      label: 'source',
    },

    /** Which ordered run of tiles the luminance is mapped onto. */
    ramp: {
      type: 'enum',
      options: ramps,
      default: ramps[0],
      label: 'material',
    },

    /**
     * Cell size in pixels. With `width`, this decides how many cells there
     * are, and so how much of the source survives: at 6px on a 518px canvas
     * the source is resampled to 86 columns, and everything finer than that
     * is gone before a single tile is drawn.
     */
    cell: {
      type: 'int',
      min: 2,
      max: 64,
      default: 6,
      label: 'cell size',
    },

    /**
     * Live render width. Height follows the source's aspect, so the grid is
     * the shape of what it is dithering rather than of the browser window —
     * which is the change the sketch had already made for itself by the end,
     * with a fixed 1728x2160 page at 0.3.
     *
     * Resolution is otherwise an export concern: render() takes its width
     * from the exporter and this is only what the screen shows.
     */
    width: {
      type: 'int',
      min: 128,
      max: 4096,
      default: DEFAULT_WIDTH,
      label: 'width',
    },

    /** Swap which end of the ramp the shadows land on. */
    invert: {
      type: 'bool',
      default: false,
      label: 'invert',
    },

    /**
     * How brightness is measured. `perceptual` is Rec. 709 and is how an eye
     * reads it; `flat` weights the channels equally, which is what the
     * original did, and is here so a ported piece can be compared against the
     * sketch it came from rather than only asserted to match.
     */
    weighting: {
      type: 'enum',
      options: ['perceptual', 'flat'],
      default: 'perceptual',
      label: 'brightness',
    },

    /**
     * Below this alpha a cell draws nothing. It matters because most of what
     * this suite makes is cut out: a gamepad drawing is ink on transparency,
     * and mapping that ground to "black" would fill the page with the densest
     * tile in the ramp.
     */
    alphaFloor: {
      type: 'int',
      min: 0,
      max: 255,
      default: 8,
      label: 'alpha floor',
    },

    /** What shows through the empty cells. */
    background: {
      type: 'color',
      default: '#000000',
      label: 'ground',
    },
  });
}
