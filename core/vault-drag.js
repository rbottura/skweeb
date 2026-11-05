/**
 * vault-drag.js — an object dragged out of the vault onto a field that takes one.
 *
 * The author, 2026-11-05: "un cliqué-glissé-déposé depuis un objet du vault
 * sur un champ d'input d'objet comme un sprite dans fractals devrait être
 * possible". A card of any vault panel is dragged — the browser's own drag
 * and drop — and every field of `type: "object"` on the page that would take
 * it is lit while it is: its `accepts`, a smart object taken for what it
 * binds, as the picker has them. Dropped on one, it is that field's as if
 * picked: a set not offered for the field's use is switched on for it
 * (vault-offer.js), and the field's value is the object's id — one step,
 * like any change of a value.
 *
 * A field may be out of sight: in a drawer folded shut, a card folded to its
 * head, a tab not shown (cluster's). Each of those heads holding a lit field
 * is marked `skw-spring` while the drag is under way, and opens when the drag
 * rests on it a moment — a tab bar marks its own, hearing `vault:drag`.
 *
 * One drag at a time, and what is dragged is this module's while it is: a
 * drag's data cannot be read before it is dropped, and a field must say yes
 * or no as it is crossed. A drag from another page is not taken.
 * No DOM at import.
 */

import { Vault }    from './vault.js';
import { switchOn } from './vault-offer.js';

const TYPE = 'application/x-skweeb-object';
const REST_MS = 450;                   // resting on a folded head this long opens it
const fields = new WeakMap();          // a field's node → its spec
let dragged = null;                    // the row under way
let rest = null;                       // { node, since }: the folded head the drag rests on

/** Whether a field of this spec takes this row: its type accepted, or a smart object binding one. */
export const takes = (spec, row) => !!row && (!spec.accepts || !spec.accepts.length
  || spec.accepts.includes(row.type) || (row.type === 'skw' && spec.accepts.includes(row.binds)));

/**
 * A vault card made draggable.
 *
 * @param {HTMLElement} card
 * @param {object} row       its index row
 */
export function dragOut(card, row) {
  card.draggable = true;
  card.addEventListener('dragstart', e => {
    end();                             // one left over, its dragend never heard
    dragged = row;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(TYPE, row.id);
    e.dataTransfer.setData('text/plain', row.id);
    light(row);
    document.addEventListener('dragover', resting, true);
    document.addEventListener('drop', end);
    document.dispatchEvent(new CustomEvent('vault:drag', { detail: { row } }));
  });
  card.addEventListener('dragend', end);
}

/**
 * A field that takes an object dropped on it, as its picker would hand it one.
 *
 * @param {HTMLElement} node
 * @param {{accepts?: string[], use?: string}} spec   the param's
 * @param {(row: object) => void} take                 the object's index row, once it is the field's to have
 */
export function dropOn(node, spec, take) {
  node.classList.add('skw-drop');
  fields.set(node, spec);
  const yes = e => {
    if (!takes(spec, dragged)) return false;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    return true;
  };
  node.addEventListener('dragenter', e => { if (yes(e)) node.classList.add('skw-over'); });
  node.addEventListener('dragover', yes);
  node.addEventListener('dragleave', e => { if (!node.contains(e.relatedTarget)) node.classList.remove('skw-over'); });
  node.addEventListener('drop', async e => {
    if (!yes(e)) return;
    e.stopPropagation();               // the field's: a page that takes drops as its source does not
    const row = dragged;
    end();
    try {
      await switchOn((await Vault.load(row.id)).object, spec.use);
    } catch (err) {
      console.warn('[vault] dropped, not switched on:', err.message);
    }
    take(row);
  });
}

/**
 * The fields that would take `row` lit, and every folded head over one of them marked to open. A row its
 * `when` hides, or a panel its app hides, is not there to take anything.
 */
function light(row) {
  for (const node of document.querySelectorAll('.skw-drop')) {
    const spec = fields.get(node);
    if (!spec || !takes(spec, row) || node.closest('[hidden]')) continue;
    node.classList.add('skw-takes');
    for (let dr = node.closest('.dr'); dr; dr = dr.parentElement && dr.parentElement.closest('.dr')) {
      if (!dr.classList.contains('dr--open')) dr.querySelector(':scope > .dr-head')?.classList.add('skw-spring');
    }
    for (let card = node.closest('.pp-card--folded'); card; card = card.parentElement && card.parentElement.closest('.pp-card--folded')) {
      card.querySelector(':scope > .pp > .pp-head [role="button"]')?.classList.add('skw-spring');
    }
  }
}

/** The drag resting on a marked head: once it has a moment, the head opened — by its own click. */
function resting(e) {
  const node = e.target instanceof Element ? e.target.closest('.skw-spring') : null;
  if (!node) { rest = null; return; }
  if (!rest || rest.node !== node) { rest = { node, since: performance.now() }; return; }
  if (performance.now() - rest.since < REST_MS) return;
  rest = null;
  node.classList.remove('skw-spring');
  node.click();
}

/** The drag over: nothing lit, nothing marked, nothing heard. Twice is once. */
function end() {
  if (!dragged) return;
  dragged = null;
  rest = null;
  document.removeEventListener('dragover', resting, true);
  document.removeEventListener('drop', end);
  for (const n of document.querySelectorAll('.skw-takes, .skw-over, .skw-spring')) n.classList.remove('skw-takes', 'skw-over', 'skw-spring');
  document.dispatchEvent(new CustomEvent('vault:drag', { detail: { row: null } }));
}
