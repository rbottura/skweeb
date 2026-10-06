/**
 * chosen.js — what can be done to the chosen shape, besides its card.
 *
 * Its handles (handles.js): they move it, turn it or size it, as the buttons
 * over the view say — W, E and R, as three's examples key them — and what a
 * handle does goes back into the shape's card (scene.js `placeOf`). It can
 * be duplicated — D — the copy right after it in the list and beside it in
 * the world, a quarter of its width between them, and chosen; and taken
 * out — Delete — as its card's ✕ does. With nothing chosen there is nothing
 * to duplicate or take out, and the buttons say so.
 */

import { Box3, Vector3 } from '../../core/libs/three/three.core.js';
import { Handles, MODES } from './handles.js';
import { placeOf } from './scene.js';

/** The keys, by what they do. */
const KEYS = { w: 'move', e: 'turn', r: 'size' };

/**
 * @param {object} opts
 * @param {import('../../core/Cards.js').Cards} opts.cards   the shapes
 * @param {import('./scene.js').Model} opts.model            as last drawn
 * @param {() => void} opts.onChange                          something to draw again
 * @returns {{handles: Handles, paint(): void, key(e: KeyboardEvent): boolean}}
 */
export function wireChosen({ cards, model, onChange }) {
  const handles = new Handles({
    onMove(mesh, how) {
      const entry = cards.chosen;
      if (entry) entry.params.set(placeOf(mesh, entry.params.values, how.mode, how.axis));
    },
    onChange,
  });

  const modes = Object.fromEntries(Object.keys(MODES).map(name => [name, document.getElementById('handle-' + name)]));
  for (const [name, b] of Object.entries(modes)) b.addEventListener('click', () => mode(name));
  const copyBtn = document.getElementById('duplicate');
  const outBtn = document.getElementById('remove');
  copyBtn.addEventListener('click', duplicate);
  outBtn.addEventListener('click', remove);

  function mode(name) {
    handles.mode = MODES[name];
    for (const [n, b] of Object.entries(modes)) b.setAttribute('aria-pressed', String(n === name));
  }

  function duplicate() {
    const entry = cards.chosen;
    if (!entry) return;
    const part = model.partAt(cards.chosenIndex);
    const width = part ? new Box3().setFromObject(part.mesh).getSize(new Vector3()).x : 1;
    cards.duplicate(entry, { x: entry.params.values.x + width * 1.25 });
  }

  function remove() {
    if (cards.chosen) cards.remove(cards.chosen);
  }

  return {
    handles,

    /** The buttons as the choice has them. */
    paint() { copyBtn.disabled = outBtn.disabled = !cards.chosen; },

    /** W, E, R, D or Delete, unheld by ctrl, alt or ⌘: true when it was one of them. */
    key(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      const k = e.key.toLowerCase();
      if (KEYS[k]) mode(KEYS[k]);
      else if (k === 'd') duplicate();
      else if (e.key === 'Delete' || e.key === 'Backspace') remove();
      else return false;
      return true;
    },
  };
}
