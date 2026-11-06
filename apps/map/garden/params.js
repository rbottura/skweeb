/**
 * params.js — the garden's schema (M14): the flowers the gardener plants,
 * the one in hand, the treatment's seed, how long a flower takes to come up,
 * what the gardener wears. The garden is a map besides (../params.js): its
 * name, its size, its ground and its tiles are the map's own values.
 */

import { defineParams } from '../../../core/params.js';

/** The drawers. */
export const GARDEN_GROUPS = {
  garden: { label: 'Garden', open: true },
};

export function gardenParams() {
  return defineParams('garden', {
    /** A garden saved — a map, or the smart object a garden's saves are the states of — opened here, as `?open=` opens one. */
    plot:    { type: 'object', accepts: ['map'], label: 'open a garden', group: 'garden' },
    /**
     * A set of drawings that keep their marks — a set made as *garden
     * flowers*, or one switched on for the garden in its detail
     * (core/uses.js): E plants one on bare earth.
     */
    flowers: { type: 'object', accepts: ['set'], use: 'garden', label: 'flowers to plant', group: 'garden' },
    /** Which of them E plants, 1 the set's first: the digits choose it. */
    sow:     { type: 'int', min: 1, max: 99, default: 1, label: 'the one in hand', group: 'garden' },
    /** What the treatment's random draws come from: R a new one (core/shell/bindings.js). */
    seed:    { type: 'int', min: 0, max: 99999, default: 1, label: 'seed', group: 'garden' },
    /** How long a flower takes to come up, the hand's rhythm kept (growth.js). */
    grow:    { type: 'range', min: 0.2, max: 30, step: 'any', log: true, default: 3, label: 'grows in', unit: 's', group: 'garden' },
    /** How many tiles wide a flower from the set stands; a generation is as wide as its source. */
    width:   { type: 'range', min: 0.25, max: 8, step: 0.25, default: 1, label: 'a flower, tiles wide', group: 'garden' },
    /** What the gardener wears: a character, any picture — else what stands on the spawn, else a disc. */
    wears:   { type: 'object', accepts: ['set', 'still', 'sequence', 'shape'], label: 'the gardener wears', group: 'garden' },
  });
}
