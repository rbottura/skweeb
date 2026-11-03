/**
 * param-history.js — a row's value in every state of the object the page
 * holds (S6d, 2026-11-03): the author on the bench, "si on se trouve en v4 et
 * qu'une valeur est différente de v1 à vN … un alt click sur la pastille
 * pourrait ouvrir une liste déroulante de toutes les versions et leurs
 * valeurs associées, donc je pourrais dans ma v5 choisir facilement la valeur
 * d'un paramètre que j'aimais bien en v2".
 *
 * Alt click on a row's mark (core/param-rows.js): the states of the smart
 * object the page is bound to (core/vault.js `bound`, `states`), each with
 * the value that row had in it — read off the state's recipe, in the part
 * of it that is this row's params — the one the page has now marked. A pick
 * sets it: a step of its own, Ctrl Z takes it back (core/steps.js). Nothing bound yet,
 * it says S makes the first state. DOM only; param-rows.css draws `.pp-hist`.
 */

import { Vault } from './vault.js';
import { settle } from './steps.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

const recipes = new Map();          // `${id}@v${n}` → the recipe its app made: a state never changes
let open = null;

/** The recipe of state `n` of smart object `id`, as its app has it. */
async function recipeAt(id, n, now) {
  const key = `${id}@v${n}`;
  if (!recipes.has(key)) {
    const at = n === now ? (await Vault.load(id)).object : await Vault.version(id, n);
    recipes.set(key, (at && at.recipe && at.recipe.recipe) || null);
  }
  return recipes.get(key);
}

/**
 * Where in a recipe this params' values are: the recipe itself, or the part
 * of it — particles' `emit`, its `picture` — that has most of its keys.
 */
export function partOf(recipe, keys) {
  let best = null, most = 0;
  const look = (o, depth) => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return;
    const n = keys.filter(k => Object.prototype.hasOwnProperty.call(o, k)).length;
    if (n > most) { most = n; best = o; }
    if (depth < 2) for (const v of Object.values(o)) look(v, depth + 1);
  };
  look(recipe, 0);
  return most >= Math.min(3, keys.length) ? best : null;
}

const shown = v => (typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : v == null ? '—' : String(v));

function close() {
  if (!open) return;
  open.root.remove();
  document.removeEventListener('pointerdown', open.away, true);
  window.removeEventListener('keydown', open.esc, true);
  open = null;
}

/**
 * The list, under a row: its value in each state, the page's now marked.
 *
 * @param {HTMLElement} row
 * @param {{ params: object, key: string }} of   the row's (core/param-rows.js `rowParams`)
 */
export async function showValues(row, { params, key }) {
  close();
  const root = el('div', 'pp-hist');
  root.setAttribute('role', 'listbox');
  root.append(el('div', 'pp-hist-head', 'its value in each state'));
  const r = row.getBoundingClientRect();
  Object.assign(root.style, { left: `${Math.round(r.left + 10)}px`, top: `${Math.round(r.bottom + 2)}px` });
  document.body.append(root);
  const away = e => { if (!root.contains(e.target)) close(); };
  const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('pointerdown', away, true);
  window.addEventListener('keydown', esc, true);
  open = { root, away, esc };

  const bound = Vault.bound;
  if (!bound || !bound.id) { root.append(el('div', 'pp-hist-none', 'no states yet — S saves the first')); return; }
  let states;
  try { states = await Vault.states(bound.id); } catch { states = []; }
  if (!open || open.root !== root) return;
  const now = states.length ? states[states.length - 1].version : 0;
  const keys = params.keys;
  for (const st of states.slice().reverse()) {
    const recipe = await recipeAt(bound.id, st.version, now).catch(() => null);
    if (!open || open.root !== root) return;
    const part = partOf(recipe, keys);
    if (!part || !(key in part)) continue;
    const value = part[key];
    const item = el('button', 'pp-hist-item' + (JSON.stringify(value) === JSON.stringify(params.get(key)) ? ' pp-hist-item--now' : ''));
    item.type = 'button';
    item.append(el('span', 'pp-hist-v', `v${st.version}${st.version === bound.version ? ' · held' : ''}`), el('span', 'pp-hist-val', shown(value)));
    item.addEventListener('click', () => { settle(); params.set(key, value); settle(); close(); });   // a step of its own
    root.append(item);
  }
  if (root.querySelectorAll('.pp-hist-item').length === 0) root.append(el('div', 'pp-hist-none', 'not in any state'));
}
