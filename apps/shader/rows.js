/**
 * rows.js — the chain, every row with its picture.
 *
 * Filter's chain (core/Cards.js): entries of the kit's catalogue, each a
 * card drawn from its own schema, in an order that is the point. What the
 * shader app adds is one thing — over each card, the picture as it stands
 * at that row, the chain cut there (frames.js): the grey noise, the noise
 * moving, masked, in colour. A picture clicked chooses its row — seen large
 * in the viewer — and clicked again lets it go, back to the whole.
 *
 * The pictures are small canvases the app draws into (`paint`); this file
 * makes them and says which was clicked.
 */

import { FILTERS } from '../../core/gpu/filters/index.js';
import { Cards }   from '../../core/Cards.js';

/** A row's picture: this many pixels along its longer side. */
export const ROW_SIDE = 96;

export class Rows extends Cards {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mount            where the cards and the add menu go
   * @param {() => void} opts.onChange          a row came or went, moved, or changed a value
   * @param {(index: number) => void} opts.onChoose   a row's picture clicked: its index, or -1 for the whole
   */
  constructor({ mount, onChange = () => {}, onChoose = () => {} }) {
    super({
      mount, onChange, onChoose,
      catalogue: FILTERS,
      app: 'shader',
      key: 'chain',
      order: true,
      words: {
        label: 'the chain',
        add: 'add a row…',
        empty: 'No rows yet. Add a generator — noise, gradient, shape — or open a starter.',
        toggle: 'Switch this row off or on',
        up: 'Run it earlier', down: 'Run it later',
        out: 'Take it out of the chain',
      },
    });
  }

  add(id, values, on, at) {
    const entry = super.add(id, values, on, at);
    const see = document.createElement('button');
    see.type = 'button';
    see.className = 'sh-row';
    see.title = 'See the surface as it stands at this row — again for the whole';
    entry.picture = document.createElement('canvas');
    entry.picture.width = entry.picture.height = ROW_SIDE;
    see.append(entry.picture);
    see.addEventListener('click', () => this.choose(this.chosen === entry ? null : entry));
    entry.card.prepend(see);
    return entry;
  }

  /** Every row's canvas, top first. */
  get pictures() {
    return this.entries.map(e => e.picture);
  }
}
