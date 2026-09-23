/**
 * ParamPanel.js — the controls, drawn from the schema.
 *
 * The half of "parameters are data" you can see. core/params.js holds the
 * declaration and the values; this reads the same declaration and lays out a
 * widget per param (core/widgets.js), so adding a control to an app is one
 * schema entry and never a row of HTML plus a listener plus a serializer line.
 *
 * ── Drawers ─────────────────────────────────────────────────────────────────
 *
 * A param may name a `group`; each group is a collapsible drawer
 * (core/Drawer.js), in the order its first param appears. Some groups are the
 * suite's, not an app's — `format` is the frame group every app spreads in —
 * so they are declared here once and look the same everywhere. An app can add
 * drawers of its own for things that are not parameters: a sequence player,
 * export actions, a list of sets (`addDrawer`), or put a button into one of
 * the param drawers (`drawer(id).body`).
 *
 * ── Rows that apply ─────────────────────────────────────────────────────────
 *
 * A param's `when` says when its row means anything — point x only for the
 * `point` attractor. The row hides otherwise, and its value stays in the
 * recipe (params.js `applies`). A drawer whose every row is hidden hides too.
 *
 * ── Docked or floating ──────────────────────────────────────────────────────
 *
 * With `mount`, the panel is a column of the page layout and never covers the
 * canvas. Without it, it floats over the right edge as it always did.
 */

import { VaultPanel } from './VaultPanel.js';
import { Drawer }     from './Drawer.js';
import { applies }    from './params.js';
import { WIDGETS, WIDGET_TYPES } from './widgets.js';

export { WIDGET_TYPES };

/** Groups every app shares, so a Format section is the same section everywhere. */
const CORE_GROUPS = {
  format: { label: 'Format', open: false },
};

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

const titleCase = key => key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');

export class ParamPanel {
  /**
   * @param {object} params             from defineParams()
   * @param {object} [opts]
   * @param {string} [opts.title]       defaults to the app name
   * @param {HTMLElement} [opts.mount]  dock into this element instead of floating
   * @param {Object<string,{label:string, open?:boolean}>} [opts.groups]
   */
  constructor(params, opts = {}) {
    this._params  = params;
    this._title   = opts.title || params.app;
    this._groups  = { ...CORE_GROUPS, ...(opts.groups || {}) };
    this._mount   = opts.mount || null;
    this._rows    = new Map();       // key -> { widget, row, spec, group }
    this._drawers = new Map();       // group id -> Drawer
    this._extra   = new Set();       // drawers holding more than params
    this._open    = false;

    this._build();
    this._paint();
    if (this._mount) this.show();

    // An external change — a restore, a key, a drag on the canvas — has to
    // move the widgets too, or the panel starts lying about the values. The
    // value as it is now, not as announced: a listener heard before this one
    // may already have moved it on (the frame chain gives a typed width back).
    params.on(key => {
      const row = this._rows.get(key);
      if (row) row.widget.sync(this._params.get(key));
      this._refresh();
    });
    this._refresh();
  }

  show()   { this._open = true;  this._root.classList.add('pp--visible'); }
  hide()   { this._open = false; this._root.classList.remove('pp--visible'); }
  toggle() { this._open ? this.hide() : this.show(); }

  get isOpen() { return this._open; }

  /** A current value, for a widget that depends on another param. */
  value(key) { return this._params.get(key); }

  /** A drawer by group id or by the id it was added under. */
  drawer(id) { return this._drawers.get(id) || null; }

  /**
   * A drawer for something that is not a parameter.
   *
   * @param {object} opts  { id, title, open, note, before } — `before` is the
   *                       id of a drawer to go in front of; the end otherwise
   * @returns {Drawer}
   */
  addDrawer({ id, title, open = true, note = '', before = null }) {
    const drawer = new Drawer({ title, open, note, id: `${this._params.app}:${id}` });
    const next = before && this._drawers.get(before);
    if (next) this._body.insertBefore(drawer.root, next.root);
    else this._body.append(drawer.root);
    this._drawers.set(id, drawer);
    this._extra.add(id);
    return drawer;
  }

  /** Open a vault picker for an `object` row: one per row, kept, since it subscribes to the vault. */
  pick(key, spec, onPick) {
    if (!this._pickers) this._pickers = new Map();
    if (!this._pickers.has(key)) {
      this._pickers.set(key, new VaultPanel({ accepts: spec.accepts, use: spec.use, pickLabel: 'Use this', onPick }));
    }
    this._pickers.get(key).show();
  }

  // ── Building ─────────────────────────────────────────────────────────────

  _build() {
    this._root = el('aside', this._mount ? 'pp pp--docked' : 'pp');
    this._root.setAttribute('aria-label', this._title + ' parameters');

    const head = el('div', 'pp-head');
    head.append(el('span', 'pp-title', this._title), el('span', 'pp-spacer'));
    const reset = el('button', 'pp-btn', 'Reset');
    reset.title = 'Every parameter back to its default';
    reset.addEventListener('click', () => this._params.reset());
    head.append(reset);
    if (!this._mount) {
      const close = el('button', 'pp-btn', '✕');
      close.title = 'Close';
      close.addEventListener('click', () => this.hide());
      head.append(close);
    }

    this._body = el('div', 'pp-body');
    this._loose = el('div', 'pp-loose');          // rows with no group, above the drawers
    this._body.append(this._loose);
    this._root.append(head, this._body);
    (this._mount || document.body).append(this._root);
  }

  _drawerFor(id) {
    if (!this._drawers.has(id)) {
      const g = this._groups[id] || {};
      const drawer = new Drawer({
        title: g.label || titleCase(id),
        open: g.open !== false,
        id: `${this._params.app}:${id}`,
      });
      this._body.append(drawer.root);
      this._drawers.set(id, drawer);
    }
    return this._drawers.get(id);
  }

  _paint() {
    for (const key of this._params.keys) {
      const spec = this._params.spec(key);
      const build = WIDGETS[spec.type];
      if (!build) continue;                       // params.js refuses these first

      const row = el('div', 'pp-row');
      const label = el('div', 'pp-label');
      label.append(el('span', 'pp-name', spec.label || titleCase(key)));
      const readout = el('span', 'pp-value');
      label.append(readout);
      if (spec.bind) label.append(el('span', 'pp-bind', spec.bind));
      row.append(label);

      const widget = build({
        key, spec,
        value: this._params.get(key),
        set: value => this._params.set(key, value),
        readout,
        panel: this,
      });
      row.append(widget.node);

      const group = spec.group || null;
      (group ? this._drawerFor(group).body : this._loose).append(row);
      this._rows.set(key, { widget, row, spec, group });
    }
  }

  /** Rows that apply, drawers that have anything to show, widgets that read others. */
  _refresh() {
    const values = this._params.values;
    const shown = new Map();
    for (const { widget, row, spec, group } of this._rows.values()) {
      const on = applies(spec, values);
      row.hidden = !on;
      if (widget.values) widget.values(values);
      if (group) shown.set(group, (shown.get(group) || false) || on);
    }
    for (const [id, drawer] of this._drawers) {
      if (!this._extra.has(id)) drawer.hidden = !shown.get(id);
    }
  }
}
