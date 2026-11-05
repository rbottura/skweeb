/**
 * keys-view.js — cluster's Keys (S9f; the bench's side view): the left hand
 * as the app mounted has it — its keys by their place (core/keys.js), each
 * with what a tap does, a dot where a hold opens a pie, dashed where it does
 * nothing here; a key lit while it is down. Under the keys, every one the
 * page answers to: the left hand's, the app's own (its status bar's,
 * core/Bar.js), and the suite's.
 *
 * No DOM at import.
 */

import { bound, letterOf } from '../../core/keys.js';

/** The left hand's three rows, by place: an AZERTY's A Z E R T, Q S D F G, W X C V B. */
const ROWS = [['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'], ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG'], ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB']];

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/**
 * @param {HTMLElement} root   where the view is drawn
 * @returns {{ paint: () => void }}
 */
export function keysView(root) {
  const board = el('div', 'ck-board');
  const list = el('ul', 'ck-binds');
  const legend = el('p', 'ck-legend');
  legend.append(el('span', 'ck-l ck-l--pie', 'held: a pie'), el('span', 'ck-l ck-l--free', 'nothing here'), el('span', 'ck-l ck-l--lit', 'down'));
  root.append(el('p', 'ck-intro', 'The left hand, by the keys’ places: tapped, a key does its act; held, it opens its pie at the pointer.'),
    board, legend, list);

  const light = (code, on) => { const k = board.querySelector(`[data-code="${code}"]`); if (k) k.classList.toggle('ck-key--lit', on); };
  window.addEventListener('keydown', e => { if (!e.repeat) light(e.code, true); });
  window.addEventListener('keyup', e => light(e.code, false));
  window.addEventListener('blur', () => { for (const k of board.querySelectorAll('.ck-key--lit')) k.classList.remove('ck-key--lit'); });

  function paint() {
    const now = bound(), by = new Map(now.map(k => [k.code, k]));
    board.replaceChildren(...ROWS.map(row => {
      const r = el('div', 'ck-row');
      r.append(...row.map(code => {
        const b = by.get(code);
        const k = el('div', 'ck-key' + (!b ? ' ck-key--free' : b.pie ? ' ck-key--pie' : ''));
        k.dataset.code = code;
        k.title = b ? b.label + (b.pie ? ' — held, its pie' : '') : 'nothing here, in this app';
        k.append(el('span', 'ck-cap', letterOf(code)), el('span', 'ck-act', b ? b.short : ''));
        return k;
      }));
      return r;
    }));
    const rows = now.map(b => [letterOf(b.code), b.label + (b.pie ? ' — held, its pie' : '')]);
    const own = document.querySelector('.cl-host footer.bar')?.dataset.keys;
    if (own) rows.push(['its own', own]);
    if (document.querySelector('.cl-host skw-titlebar .tb-save')) rows.push(['S', 'save: the next state of the project']);
    rows.push(['Ctrl Z · Y', 'a step back · a step on'], ['² · Ctrl K', 'every control and act, by name']);
    list.replaceChildren(...rows.map(([k, what]) => {
      const li = el('li');
      li.append(el('kbd', null, k), el('span', null, what));
      return li;
    }));
  }

  return { paint };
}
