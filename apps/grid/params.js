/**
 * params.js — grid's parameters, and therefore grid's recipe.
 *
 * Grouped into drawers (core/Drawer.js): the source, the material the source
 * is rebuilt in, the ground behind it, and the suite's shared Format drawer —
 * which now carries `scale`, the canvas multiplier grid used to declare for
 * itself, under the same key so old recipes read unchanged.
 *
 * The material ramps come from the generated manifest, so the list of
 * materials is data (rule 3) and adding one is a folder and a regenerate. A
 * material can also be a vault `set` — made in the maker (maker.js), or any
 * set switched on as a material in the vault — and then it replaces the ramp.
 */

import { defineParams } from '../../core/params.js';
import { frameParams }  from '../../core/frame.js';

/** How the drawers read, top to bottom. `format` is core's own. */
export const GROUPS = {
  source:   { label: 'Source',   open: true },
  material: { label: 'Material', open: true },
  ground:   { label: 'Ground',   open: false },
};

export function gridParams(manifest) {
  const ramps = (manifest && manifest.ramps || []).map(r => r.id);
  if (!ramps.length) {
    throw new Error('grid: no material ramps in the manifest. ' +
                    'Run node scripts/generate-grid-manifest.js');
  }

  return defineParams('grid', {
    /** A still or a loop from the vault. A file off disk comes in by the Source drawer's button. */
    source: {
      type: 'object',
      accepts: ['still', 'sequence'],
      label: 'source',
      group: 'source',
    },

    /**
     * A material from the vault: a set, its members light to dark. While one is
     * chosen it is the ramp, and the shipped ramps step aside. Only sets offered
     * as a material are offered here (core/uses.js).
     */
    material: {
      type: 'object',
      accepts: ['set'],
      use: 'material',
      label: 'from the vault',
      group: 'material',
    },

    ramp: {
      type: 'enum',
      options: ramps,
      default: ramps[0],
      label: 'material',
      group: 'material',
      when: { material: null },
    },

    /** One tile's size, in the frame's own pixels. */
    cell: {
      type: 'int',
      min: 2,
      max: 64,
      default: 6,
      label: 'cell size',
      group: 'material',
    },

    /**
     * How big each tile is drawn, against its cell: 1 fills the cell, 3 draws
     * it three cells wide, centred, over its neighbours. The grid does not
     * change — how many cells, and which tile each gets — only the picture in
     * them. Overflow at the edge of the canvas is cut; `bleed` gives it room.
     */
    tileScale: {
      type: 'range',
      min: 0.1,
      max: 10,
      step: 0.05,
      default: 1,
      label: 'sprite size',
      group: 'material',
    },

    invert: {
      type: 'bool',
      default: false,
      label: 'invert',
      group: 'material',
    },

    weighting: {
      type: 'enum',
      options: ['perceptual', 'flat'],
      default: 'perceptual',
      label: 'brightness',
      group: 'material',
    },

    /** Below this opacity a cell stays empty, so the ground shows through. */
    alphaFloor: {
      type: 'int',
      min: 0,
      max: 255,
      default: 8,
      label: 'alpha floor',
      group: 'material',
    },

    /**
     * Behind the empty cells: a colour, or none for a transparent ground.
     * Still named `background` — renaming a key changes every saved recipe.
     */
    background: {
      type: 'ground',
      default: '#000000',
      label: 'ground',
      group: 'ground',
    },

    ...frameParams({ format: 'content' }),
  });
}
