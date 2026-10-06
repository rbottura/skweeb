/**
 * params.js — filter's parameters: its source, and what the chain does at its
 * edge. The chain itself is not here.
 *
 * A chain is a list, and each entry carries the schema of its own filter
 * (core/gpu/filters/), so it lives beside the params, as compose's
 * placements live beside its page (chain.js). The recipe is
 * `{ source, edges, seed, chain }`.
 */

import { defineParams } from '../../core/params.js';

/** How the drawers read, top to bottom. The chain's cards join `filters`. */
export const GROUPS = {
  source:  { label: 'Source', open: true },
  filters: { label: 'Filters', open: true },
};

export function filterParams() {
  return defineParams('filter', {
    /**
     * Anything with a picture, still or moving: a still or a shape as its
     * render, a sequence or a composition that moves replayed (core/rebuild.js,
     * openFrames), a model as its picture. A file off disk comes in by the
     * Source drawer or a drop.
     */
    source: {
      type: 'object',
      accepts: ['still', 'shape', 'sequence', 'composition', 'model'],
      label: 'source',
      group: 'source',
    },

    /**
     * What a blur, a glow, an outline does at the picture's edge
     * (core/gpu/runner.js, *Past the edge*). `grow`: the picture gets the
     * room the chain reaches, which a sprite on nothing wants. `keep`: the
     * size stays and the edge is held, which a photograph filling its frame
     * wants. A recipe from before this existed kept its size — main.js and
     * rebuild.js read it as `keep`.
     */
    edges: {
      type: 'enum',
      options: ['grow', 'keep'],
      default: 'grow',
      display: 'chips',
      label: 'at the edge',
      group: 'filters',
    },

    /**
     * What a filter that draws at random draws from — grain, glitch (rule 2):
     * the same seed, the same noise. Saved in the recipe, and as the object's
     * seed when its chain draws at random.
     */
    seed: { type: 'int', min: 0, max: 999999, default: 1, label: 'seed', group: 'filters' },
  });
}
