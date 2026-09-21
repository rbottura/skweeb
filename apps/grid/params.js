/**
 * params.js — grid's parameters, and therefore grid's recipe.
 *
 * The schema is a function of the material manifest rather than a constant,
 * because the ramps an installation has are whatever `generate-grid-manifest`
 * found on disk. That keeps rule 3 intact: the app reads a generated list, and
 * nothing walks a directory at runtime.
 *
 * What is NOT here is as deliberate as what is. The webcam capture, the
 * 226-frame clip loader, the letters from a text blob and the four debug
 * colours were all at file scope and all abandoned; none of them is a
 * parameter, so none of them is here.
 *
 * `listPlayers` is a different case and was wrongly lumped in with those on
 * first reading. A Player is an agent on the grid — it holds a current cell,
 * knows its four neighbours, moves in bounds, and carries a verb set that acts
 * on cells: paint, resize, rotate, change image, swap with another cell. Its
 * `index` already separates player 1 from player 2. That is a bot framework
 * half-built, not leftovers, and the intent is several of them wandering the
 * grid under programmed behaviours. Deferred, not dropped — see STATUS.md.
 *
 * On seeds: grid has none, and `seed: null` is the honest envelope value.
 * A luminance dither is a pure function of its source and its ramp — there is
 * no random in it to record. That is the same position the gamepad is in, for
 * the same reason.
 */

import { defineParams } from '../../core/params.js';

/** 1x is the source's own size. Export re-runs render() at a larger one. */
const DEFAULT_SCALE = 1;

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
     * Cell size, measured in the SOURCE's pixels. This alone decides how many
     * cells there are — `scale` only changes how big they are drawn — so it is
     * the parameter that says how much of the source survives: a 1772px-wide
     * image at 6 becomes 295 columns, and everything finer than that is gone
     * before a single tile is drawn.
     */
    cell: {
      type: 'int',
      min: 2,
      max: 64,
      default: 6,
      label: 'cell size',
    },

    /**
     * Output size as a multiple of the source's own. 1x renders at exactly
     * the source's dimensions, which is the only width that means anything
     * without asking what is being dithered — the old absolute `width` was
     * inherited from a fixed 1728x2160 page at 0.3 and said nothing about the
     * image it was applied to.
     *
     * Scale does not change what the picture is, only how large it is drawn:
     * the cell count comes from the source and `cell` alone, and the tiles are
     * drawn bigger. That is what makes this the `density` of
     * docs/roadmap.md — live at 1, export re-running once at 4 or more.
     */
    scale: {
      type: 'range',
      min: 0.1,
      max: 8,
      step: 0.1,
      default: DEFAULT_SCALE,
      label: 'scale',
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
