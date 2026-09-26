/**
 * params.js — filter's parameters: its source. The chain is not here.
 *
 * A chain is a list, and each entry carries the schema of its own filter
 * (core/gpu/filters/), so it lives beside the params, as compose's
 * placements live beside its page (chain.js). The recipe is
 * `{ source, chain }`.
 */

import { defineParams } from '../../core/params.js';

/** How the drawers read, top to bottom. */
export const GROUPS = {
  source: { label: 'Source', open: true },
};

export function filterParams() {
  return defineParams('filter', {
    /**
     * Anything with a picture, still or moving: a still or a shape as its
     * render, a sequence or a composition that moves replayed (core/rebuild.js,
     * openFrames). A file off disk comes in by the Source drawer or a drop.
     */
    source: {
      type: 'object',
      accepts: ['still', 'shape', 'sequence', 'composition'],
      label: 'source',
      group: 'source',
    },
  });
}
