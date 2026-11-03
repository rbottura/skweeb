/**
 * param-rows.js — a param's row, as ParamPanel lays it out (S2, S2b,
 * 2026-11-03; docs/scene.md): its mark, its label, its widget; two numbers on
 * one line; the fold of rows seldom touched. ParamPanel owns the drawers and
 * the values; this makes the rows they hold. Every part is the schema's:
 *
 *   unit: 'px'           inside the number's box, at its right (widgets.js) —
 *                        not in the label
 *   more: true           folded under its drawer's "n more" until asked for;
 *                        a value changed from its default stays out
 *   pair: '<key>'        this number and that one on one line, a box each:
 *                        `pairLabel` the line's name, `axis` each box's letter,
 *                        a `unit` beside the name,
 *                        `link: '<bool key>'` a switch between them, `swap:
 *                        true` a button that swaps them
 *
 * A pair's halves are rows still — `.pp-row`, `data-key`, a `.pp-name` with
 * the param's whole label, hidden — so the search and the checks find each
 * value where they found it before.
 */

import { WIDGETS } from './widgets.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

const titleCase = key => key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
const NUMERIC = new Set(['range', 'int']);

// Static markup only: two glyphs of the bench's, a link and a swap.
const ICONS = {
  link: '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.9.9"/><path d="M9.4 6.6a2.6 2.6 0 0 0-3.7 0L3.5 8.8a2.6 2.6 0 0 0 3.7 3.7l.9-.9"/></g></svg>',
  swap: '<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5.5h9.5M10 3l2.5 2.5L10 8"/><path d="M13 10.5H3.5M6 8l-2.5 2.5L6 13"/></g></svg>',
};

function iconButton(name, title) {
  const b = el('button', `pp-pair-btn pp-pair-${name}`);
  b.type = 'button';
  b.title = title;
  b.setAttribute('aria-label', title);
  b.innerHTML = ICONS[name];
  return b;
}

/**
 * One param's row. A half of a pair shows its axis and its box, nothing else.
 *
 * @param {object} panel   the ParamPanel: `value(key)`, `_sliderShown`, `_pin`
 * @param {object} params  its Params
 * @returns {{ row: HTMLElement, widget: object }}
 */
export function buildRow(panel, params, key, spec, { half = false } = {}) {
  const row = el('div', half ? 'pp-row pp-row--half' : 'pp-row');
  row.dataset.key = key;
  row.append(el('span', 'pp-mark'));
  const label = el('div', 'pp-label');
  if (half) label.append(el('span', 'pp-axis', spec.axis || (spec.label || key).slice(0, 1)));
  label.append(el('span', 'pp-name', spec.label || titleCase(key)));
  const readout = el('span', 'pp-value');
  label.append(readout);
  if (spec.bind) label.append(el('span', 'pp-bind', spec.bind));
  row.append(label);

  const widget = WIDGETS[spec.type]({
    key, spec,
    value: params.get(key),
    set: value => params.set(key, value),
    readout,
    panel,
  });
  if (spec.type === 'bool') readout.replaceChildren(widget.node);     // a switch, on its label's line
  else row.append(widget.node);
  if (NUMERIC.has(spec.type)) {
    row.classList.add('pp-row--num');
    if (!half) {
      row.classList.toggle('pp-row--slider', panel._sliderShown(key, spec));
      label.title = 'Alt click: its slider, shown or hidden';
      label.addEventListener('click', e => {
        if (!e.altKey) return;
        e.preventDefault();
        panel._pin(key, spec, row);
      });
    }
  }
  if (spec.more) row.classList.add('pp-row--more');
  return { row, widget };
}

/** The keys a pair takes off the list, painted with its lead: the other number, and the link. */
export function pairedKeys(params) {
  const out = new Set();
  for (const key of params.keys) {
    const spec = params.spec(key);
    if (!spec.pair) continue;
    out.add(spec.pair);
    if (spec.link) out.add(spec.link);
  }
  return out;
}

/**
 * Two numbers on one line, led by `key`: its name, a box each, and between
 * them the link and the swap if the schema has them.
 *
 * @returns {{ node: HTMLElement, rows: Array<{ key, row, widget, spec }> }}
 *   `row` is null for the link: its switch is the pair's
 */
export function buildPair(panel, params, key) {
  const spec = params.spec(key), other = spec.pair, ospec = params.spec(other);
  const node = el('div', 'pp-pair');
  node.dataset.pair = `${key} ${other}`;
  const name = el('span', 'pp-pair-name', spec.pairLabel || `${spec.label} · ${ospec.label}`);
  if (spec.unit) name.append(el('span', 'pp-pair-unit', ` ${spec.unit}`));    // the pair's, beside its name: no room in its boxes
  node.append(el('span', 'pp-mark'), name);
  const bare = s => (s.unit ? { ...s, unit: undefined } : s);
  const a = buildRow(panel, params, key, bare(spec), { half: true });
  const b = buildRow(panel, params, other, bare(ospec), { half: true });
  const halves = el('div', 'pp-halves');
  halves.append(a.row, b.row);
  node.append(halves);
  const rows = [{ key, row: a.row, widget: a.widget, spec }, { key: other, row: b.row, widget: b.widget, spec: ospec }];

  if (spec.link) {
    const link = iconButton('link', `${params.spec(spec.link).label || spec.link}: one follows the other`);
    link.addEventListener('click', () => params.set(spec.link, !params.get(spec.link)));
    const sync = v => link.setAttribute('aria-pressed', String(!!v));
    sync(params.get(spec.link));
    halves.insertBefore(link, b.row);
    rows.push({ key: spec.link, row: null, widget: { sync }, spec: params.spec(spec.link) });
  }
  if (spec.swap) {
    const swap = iconButton('swap', `${spec.label} and ${ospec.label}, swapped`);
    swap.addEventListener('click', () => params.set({ [key]: params.get(other), [other]: params.get(key) }));
    halves.append(swap);
  }
  return { node, rows };
}

// ── The fold ─────────────────────────────────────────────────────────────────

const foldKey = app => `skweeb/more/${app}`;
export function loadFolds(app) {
  try { return JSON.parse(localStorage.getItem(foldKey(app)) || '{}') || {}; } catch { return {}; }
}
function saveFolds(app, open) {
  try { localStorage.setItem(foldKey(app), JSON.stringify(open)); } catch { /* a convenience: without storage, folded again */ }
}

/**
 * The fold of a drawer that has rows marked `more`: a button at its end,
 * "n more" or "fewer". Its state is the viewer's, kept per app and drawer.
 *
 * @param {object} open   the app's folds, `{ [drawer id]: true }` — changed in place
 * @returns {{ button, paint(n) } | null}   `paint` with the rows it folds away now
 */
export function addFold(app, id, drawer, open) {
  if (!drawer.body.querySelector('.pp-row--more')) return null;
  const button = el('button', 'pp-more');
  button.type = 'button';
  drawer.body.append(button);
  let folded = 0;
  const paint = n => {
    folded = n;
    const shown = !!open[id];
    drawer.root.classList.toggle('pp-more-open', shown);
    button.hidden = !shown && !n;
    button.textContent = shown ? 'fewer' : `${n} more`;
    button.title = shown ? 'Fold the rows seldom touched' : 'The rows seldom touched';
  };
  button.addEventListener('click', () => {
    if (open[id]) delete open[id]; else open[id] = true;
    saveFolds(app, open);
    paint(folded);
  });
  return { button, paint };
}
