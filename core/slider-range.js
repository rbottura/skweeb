/**
 * slider-range.js — a number's slider and box over two ends set by hand
 * (S15g).
 *
 * The author, 2026-11-16: "le alt clic peut permettre d'avoir accès à un
 * champ de sélection de la valeur min et max de la range et de la conserver
 * dans une forme de préférences". Alt click on a number's slider or its box:
 * its two ends, typed — Enter keeps them, Escape does not, *As made* puts the
 * schema's back. The slider runs between them, the box's fill and its drag
 * too: a range of a hundred brought down to the two that matter, every pixel
 * of the hand worth more. A value typed may still go anywhere the schema lets
 * it — the ends are the hand's, never the param's limits, never a recipe's.
 *
 * Kept in this browser, for the app and the key — a preference, as the pins
 * of the sliders shown are (core/ParamPanel.js `_pin`). DOM and storage only;
 * core/shell/shell.css draws `.sr-pop`.
 */

import { held } from './scope.js';

const KEY = app => `skweeb/ranges/${app}`;

function load(app) {
  try { return JSON.parse(localStorage.getItem(KEY(app)) || '{}') || {}; } catch { return {}; }
}
function save(app, all) {
  try { localStorage.setItem(KEY(app), JSON.stringify(all)); } catch { /* a convenience: without storage, for this visit */ }
}

/** The ends a number's slider runs between now: the hand's, within the schema's, or the schema's. */
export function rangeOf(app, key, spec) {
  const lo = spec.min ?? 0, hi = spec.max ?? 100;
  const kept = app ? load(app)[key] : null;
  if (!Array.isArray(kept)) return { min: lo, max: hi, own: false };
  const a = Math.max(lo, Math.min(hi, +kept[0])), b = Math.max(lo, Math.min(hi, +kept[1]));
  return a < b && Number.isFinite(a) && Number.isFinite(b) ? { min: a, max: b, own: true } : { min: lo, max: hi, own: false };
}

/** Two ends kept for the key — or none, the schema's again. */
export function keepRange(app, key, ends) {
  const all = load(app);
  if (ends) all[key] = ends; else delete all[key];
  save(app, all);
}

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

let open = null;       // the one open: { node, close }

/**
 * Its two ends, asked by the row: Enter keeps them, Escape does not.
 * @param {HTMLElement} row
 * @param {{ app: string, key: string, spec: object, name: string, then: (range: {min: number, max: number}) => void }} o
 */
export function askRange(row, { app, key, spec, name, then }) {
  if (open) open.close();
  const now = rangeOf(app, key, spec);
  const lo = spec.min ?? 0, hi = spec.max ?? 100;
  const pop = el('div', 'sr-pop');
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', `${name}: its slider's ends`);
  const field = v => { const f = el('input', 'pp-num sr-end'); f.type = 'number'; f.step = 'any'; f.value = String(+v.toPrecision(6)); return f; };
  const a = field(now.min), b = field(now.max);
  const said = el('p', 'sr-said', `${name} — as made, ${lo} to ${hi}`);
  const keep = el('button', 'nb-btn nb-btn--primary', 'Keep');
  const reset = el('button', 'nb-btn', 'As made');
  keep.type = reset.type = 'button';
  const line = el('div', 'sr-line');
  line.append(a, el('span', 'sr-to', 'to'), b);
  const acts = el('div', 'sr-acts');
  acts.append(reset, keep);
  pop.append(said, line, acts);

  let unhold = () => {};
  const close = () => { pop.remove(); window.removeEventListener('keydown', onKey, true); window.removeEventListener('pointerdown', away, true); open = null; unhold(); };
  const done = ends => {
    keepRange(app, key, ends);
    close();
    then(rangeOf(app, key, spec));
  };
  const take = () => {
    const x = Math.max(lo, Math.min(hi, parseFloat(a.value))), y = Math.max(lo, Math.min(hi, parseFloat(b.value)));
    if (!(Number.isFinite(x) && Number.isFinite(y)) || x === y) { said.textContent = `${name} — two ends, apart, within ${lo} and ${hi}`; return; }
    done([Math.min(x, y), Math.max(x, y)]);
  };
  const onKey = e => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); take(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  };
  const away = e => { if (!pop.contains(e.target)) close(); };
  keep.addEventListener('click', take);
  reset.addEventListener('click', () => done(null));
  window.addEventListener('keydown', onKey, true);
  setTimeout(() => window.addEventListener('pointerdown', away, true));

  document.body.append(pop);
  const r = row.getBoundingClientRect();
  pop.style.left = `${Math.max(4, Math.min(r.left, innerWidth - pop.offsetWidth - 6))}px`;
  pop.style.top = `${Math.max(4, Math.min(r.bottom + 4, innerHeight - pop.offsetHeight - 6))}px`;
  a.focus();
  a.select();
  open = { node: pop, close };
  unhold = held(close);           // closed with its app, at the unmount
}
