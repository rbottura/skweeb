/**
 * chain.js — the filters, in order: each one's values, and its card.
 *
 * An entry is a filter from the catalogue (core/gpu/filters/) with values of
 * its own, declared from the filter's schema, and a card drawn from that, in
 * core's cards (core/Cards.js) — the list the 3D app's shapes are too. A
 * chain is a list whose order is the point: each card goes up or down.
 *
 * `recipe()` is the chain as a recipe holds it — `[{ id, params, on }]`, what
 * core/gpu's runner takes and what a save will write.
 */

import { FILTERS } from '../../core/gpu/filters/index.js';
import { Cards }   from '../../core/Cards.js';

export class Chain extends Cards {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mount     where the cards and the add menu go
   * @param {() => void} opts.onChange   an entry came or went, moved, or changed a value
   */
  constructor({ mount, onChange = () => {} }) {
    super({
      mount, onChange,
      catalogue: FILTERS,
      app: 'filter',
      order: true,
      words: {
        add: 'add a filter…',
        empty: 'No filters yet. Add one — they run top to bottom.',
        toggle: 'Switch this filter off or on',
        up: 'Run it earlier', down: 'Run it later',
        out: 'Take it out of the chain',
      },
    });
  }
}
