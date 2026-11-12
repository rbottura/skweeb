/**
 * layers-row.js — the widget of a `layers` param (core/layers.js, L13): an
 * object's layers in its Stack section, top first, each a line — what it is,
 * in front or behind — switched off or on, moved up or down, taken off; the
 * chosen one's rows below, drawn from `LAYER_PARAMS` (rule 1): where, fitted,
 * its size, from centre, turned, its opacity, its blend. "+ overlay…" puts a
 * picture of the vault in front, fitted to the format, in one click — or one
 * dragged here from the vault (core/vault-drag.js).
 *
 * Every change is the param's, set whole: a step Ctrl Z takes back, a value
 * an S keeps. The chosen layer's rows are no steps of their own — what they
 * change is the param's. DOM and params; core/stack-panel.css draws it.
 */

import { ParamPanel }   from './ParamPanel.js';
import { defineParams } from './params.js';
import { Vault }        from './vault.js';
import { dropOn }       from './vault-drag.js';
import { LAYER_PARAMS, layerOn } from './layers.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;     // never innerHTML: titles are the user's
  return node;
};

const button = (label, title, onClick) => {
  const b = el('button', 'nb-btn pp-stack-btn', label);
  b.type = 'button';
  b.title = title;
  b.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return b;
};

const named = new Map();            // ref → { title, what }, as the vault says, asked once

/** A layer's object in a few words: its title, and what it is — read once from the vault. */
function nameOf(ref, then) {
  if (named.has(ref)) return named.get(ref);
  const row = (Vault.index || []).find(r => r.id === ref);
  const of = o => ({ title: o.title || ref, what: (o.type === 'skw' ? `${o.binds || (o.recipe && o.recipe.type) || 'smart'} · v${o.version || 1}` : o.type)
    + (o.render && o.render.w ? ` · ${o.render.w} × ${o.render.h}` : '') });
  if (row) { named.set(ref, of(row)); return named.get(ref); }
  named.set(ref, { title: ref, what: 'reading…' });
  Vault.load(ref).then(({ object }) => { named.set(ref, of(object)); then(); },
    () => { named.set(ref, { title: ref, what: 'not in this vault' }); then(); });
  return named.get(ref);
}

/**
 * @param {object} ctx   a widget's (core/widgets.js): `{ key, spec, value, set, panel }`
 * @returns {{node: HTMLElement, sync: (value: object[]) => void}}
 */
export function layersWidget({ key, spec, value, set, panel }) {
  const wrap = el('div', 'pp-layers');
  const list = el('ul', 'pp-stack pp-layers-list');
  const rows = el('div', 'pp-stack-layer pp-layers-rows');
  const adds = el('div', 'pp-stack-adds');
  const none = el('p', 'pp-layers-none', 'No layer yet: a picture in front of this one, or behind it.');
  wrap.append(none, list, rows, adds);
  // Or dragged here from the vault: on top, in front.
  dropOn(wrap, spec, row => add(row.id));

  let layers = value || [];
  let chosen = layers.length ? layers.length - 1 : -1;
  const app = (panel.params && panel.params.app) || 'app';
  const values = defineParams(`${app}-layer`, LAYER_PARAMS);
  new ParamPanel(values, { title: 'layer', mount: rows, steps: false });
  let painting = false;                 // its rows given the chosen layer's values: no change of it
  values.on(() => {
    if (painting || chosen < 0 || !layers[chosen]) return;
    set(layers.map((l, i) => (i === chosen ? { ...l, ...values.values } : l)));
  });

  /** A layer on top, in front, as it is — chosen. */
  function add(ref) {
    if (!ref) return;
    chosen = layers.length;
    set([...layers, layerOn(ref)]);
  }

  /** Layer `i` moved to `j`: up is towards the end, nearer the eye. */
  function move(i, j) {
    if (j < 0 || j >= layers.length) return;
    const next = layers.slice();
    const [l] = next.splice(i, 1);
    next.splice(j, 0, l);
    if (chosen === i) chosen = j;
    set(next);
  }

  function paint() {
    none.hidden = layers.length > 0;
    if (chosen >= layers.length || chosen < 0) chosen = layers.length - 1;     // the top one, when none is

    list.replaceChildren(...layers.map((l, i) => ({ l, i })).reverse().map(({ l, i }) => {
      const { title, what } = nameOf(l.ref, paint);
      const row = el('li', 'pp-layer-row' + (i === chosen ? ' pp-layer-row--chosen' : '') + (l.on ? '' : ' pp-layer-row--off'));
      row.dataset.ref = l.ref;
      const where = l.at === 'behind' ? 'behind' : 'in front';
      row.title = `${title} — ${where} · ${what}` + (l.at === 'behind' ? " — seen where the picture's ground is none" : '');
      const text = el('span', 'pp-stack-text');
      const head = el('span', 'pp-stack-name');
      head.append(el('span', 'pp-stack-app', title));
      text.append(head, el('span', 'pp-stack-what', `${where} · ${what}`));     // where first: what a narrow line keeps
      const acts = el('span', 'pp-stack-acts');
      acts.append(button(l.on ? 'on' : 'off', 'Switch this layer off, or on again', () => set(layers.map((x, k) => (k === i ? { ...x, on: !x.on } : x)))),
        button('▲', 'up: nearer the eye', () => move(i, i + 1)),
        button('▼', 'down: further from it', () => move(i, i - 1)),
        button('×', 'take this layer off', () => { if (chosen >= i) chosen--; set(layers.filter((_, k) => k !== i)); }));
      row.append(text, acts);
      row.addEventListener('click', () => { chosen = i; paint(); });
      return row;
    }));
    rows.hidden = chosen < 0;
    if (chosen >= 0) { painting = true; try { values.restore(layers[chosen]); } finally { painting = false; } }
    adds.replaceChildren(button('＋ overlay…', 'a picture of the vault — or a loop, a page, a smart object — in front, fitted to the format',
      () => panel.pick(key, spec, o => add(o.id))));
  }

  paint();
  return {
    node: wrap,
    sync(v) {
      layers = Array.isArray(v) ? v : [];
      paint();
    },
  };
}
