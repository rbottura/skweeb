/**
 * ParamPanel.js — the controls, drawn from the schema.
 *
 * This is the half of "parameters are data" you can see. core/params.js holds
 * the declaration and the values; this reads the same declaration and builds a
 * widget per type, so adding a control to an app is one schema entry and never
 * a row of HTML plus a listener plus a line in the serializer.
 *
 * The rule that keeps it honest: a type this file cannot draw is a type
 * params.js should not accept. If a control cannot be expressed as a schema
 * entry, the fix is a new widget type here — once, for everyone — rather than
 * a bespoke control in an app. That is the whole bargain.
 *
 * The `object` row is the interesting one. It is a vault picker filtered to
 * the param's `accepts`, and choosing something writes an id into the params —
 * which is also, by itself, the lineage, since Params.consumedObjectIds()
 * reads those ids straight back out. Cross-app loading is this row.
 *
 * Reads core/params.js and core/VaultPanel.js. No p5, no app, no HUD.
 */

import { VaultPanel } from './VaultPanel.js';
import { Vault }      from './vault.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

const titleCase = key => key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');

export class ParamPanel {
  /**
   * @param {object} params        from defineParams()
   * @param {object} [opts]
   * @param {string} [opts.title]  defaults to the app name
   */
  constructor(params, opts = {}) {
    this._params = params;
    this._title  = opts.title || params.app;
    this._rows   = new Map();          // key -> { sync(value) }
    this._open   = false;

    this._build();
    this._paint();

    // An external change — a restore, a gamepad binding, another panel — has
    // to move the widgets too, or the panel starts lying about the values.
    params.on((key, value) => {
      const row = this._rows.get(key);
      if (row) row.sync(value);
    });
  }

  show()   { this._open = true;  this._root.classList.add('pp--visible'); }
  hide()   { this._open = false; this._root.classList.remove('pp--visible'); }
  toggle() { this._open ? this.hide() : this.show(); }

  get isOpen() { return this._open; }

  // ── Chrome ─────────────────────────────────────────────────────────────────

  _build() {
    this._root = el('aside', 'pp');
    this._root.setAttribute('aria-label', this._title + ' parameters');

    const head = el('div', 'pp-head');
    head.append(el('span', 'pp-title', this._title));
    head.append(el('span', 'pp-spacer'));

    const reset = el('button', 'pp-btn', 'Reset');
    reset.title = 'Every parameter back to its default';
    reset.addEventListener('click', () => this._params.reset());

    const close = el('button', 'pp-btn', '✕');
    close.title = 'Close';
    close.addEventListener('click', () => this.hide());

    head.append(reset, close);

    this._body = el('div', 'pp-body');
    this._root.append(head, this._body);
    document.body.append(this._root);
  }

  _paint() {
    this._body.replaceChildren();
    this._rows.clear();

    for (const key of this._params.keys) {
      const spec = this._params.spec(key);
      const build = WIDGETS[spec.type];
      if (!build) continue;                       // params.js refuses these first

      const row   = el('div', 'pp-row');
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
      this._body.append(row);
      this._rows.set(key, widget);
    }
  }

  /**
   * Open a vault picker for an `object` row. One panel per row, kept, because
   * building it also subscribes it to vault events.
   */
  _pickerFor(key, spec, onPick) {
    if (!this._pickers) this._pickers = new Map();
    if (!this._pickers.has(key)) {
      this._pickers.set(key, new VaultPanel({
        accepts: spec.accepts,
        pickLabel: 'Use this',
        onPick,
      }));
    }
    this._pickers.get(key).show();
  }
}

// ── Widgets ──────────────────────────────────────────────────────────────────
// Each returns { node, sync(value) }. `sync` exists so a restore moves the
// control; without it the panel and the values drift apart silently.
//
// Every key here must exist in params.js's PARAM_TYPES and vice versa. The
// suites hold the two lists against each other, because the failure mode is
// quiet: a type with no widget is a declared control that never draws.

const WIDGETS = {
  range: ({ spec, value, set, readout }) => {
    const input = el('input', 'pp-range');
    input.type = 'range';
    input.min = spec.min ?? 0;
    input.max = spec.max ?? 100;
    input.step = spec.step ?? 1;
    input.value = value;
    readout.textContent = value;
    input.addEventListener('input', () => set(parseFloat(input.value)));
    return {
      node: input,
      sync(v) { input.value = v; readout.textContent = v; },
    };
  },

  // A whole-number range. Declaring `int` rather than `range` with step 1 says
  // the value is a count, which a panel shows the same way but a recipe reader
  // can rely on.
  int: ctx => WIDGETS.range({ ...ctx, spec: { ...ctx.spec, step: 1 } }),

  bool: ({ value, set }) => {
    const wrap  = el('label', 'pp-switch');
    const input = el('input');
    input.type = 'checkbox';
    input.checked = value;
    const track = el('span', 'pp-track');
    wrap.append(input, track);
    input.addEventListener('change', () => set(input.checked));
    return { node: wrap, sync(v) { input.checked = v; } };
  },

  enum: ({ spec, value, set }) => {
    const select = el('select', 'pp-select');
    for (const option of spec.options || []) {
      const o = el('option', null, option);
      o.value = option;
      select.append(o);
    }
    select.value = value;
    select.addEventListener('change', () => set(select.value));
    return { node: select, sync(v) { select.value = v; } };
  },

  color: ({ value, set, readout }) => {
    const input = el('input', 'pp-color');
    input.type = 'color';
    input.value = value;
    readout.textContent = value;
    input.addEventListener('input', () => set(input.value));
    return { node: input, sync(v) { input.value = v; readout.textContent = v; } };
  },

  text: ({ value, set }) => {
    const input = el('input', 'pp-text');
    input.type = 'text';
    input.value = value;
    input.addEventListener('input', () => set(input.value));
    return { node: input, sync(v) { input.value = v; } };
  },

  'color[]': ({ value, set, readout }) => {
    const wrap = el('div', 'pp-colors');
    let colors = Array.from(value || []);

    const repaint = () => {
      wrap.replaceChildren();
      readout.textContent = colors.length;
      colors.forEach((c, i) => {
        const swatch = el('input', 'pp-color');
        swatch.type = 'color';
        swatch.value = c;
        swatch.addEventListener('input', () => {
          colors[i] = swatch.value;
          set(colors.slice());
        });
        wrap.append(swatch);
      });
      const add = el('button', 'pp-btn', '+');
      add.title = 'Add a colour';
      add.addEventListener('click', () => { colors = [...colors, '#ffffff']; set(colors.slice()); });
      const drop = el('button', 'pp-btn', '−');
      drop.title = 'Remove the last';
      drop.addEventListener('click', () => { colors = colors.slice(0, -1); set(colors.slice()); });
      wrap.append(add, drop);
    };

    repaint();
    return { node: wrap, sync(v) { colors = Array.from(v || []); repaint(); } };
  },

  /**
   * A vault object as a parameter. The row shows what is chosen; the button
   * opens the picker, narrowed to `accepts`. Writing the id here is all the
   * lineage there is — nothing else records a parent.
   */
  object: ({ key, spec, value, set, panel }) => {
    const wrap = el('div');
    const face = el('div', 'pp-object');

    const thumb = el('img', 'pp-object-thumb');
    thumb.alt = '';
    const meta = el('div', 'pp-object-meta');
    const name = el('div', 'pp-object-name');
    const sub  = el('div', 'pp-object-sub');
    meta.append(name, sub);
    face.append(thumb, meta);

    const actions = el('div', 'pp-object-actions');
    const choose = el('button', 'pp-btn', 'Choose…');
    choose.addEventListener('click', () =>
      panel._pickerFor(key, spec, object => set(object.id)));
    const clear = el('button', 'pp-btn', 'Clear');
    clear.addEventListener('click', () => set(null));
    actions.append(choose, clear);

    wrap.append(face, actions);

    const sync = async id => {
      if (!id) {
        thumb.removeAttribute('src');
        name.className = 'pp-object-name pp-empty';
        name.textContent = 'nothing chosen';
        sub.textContent = (spec.accepts || []).join(' or ') || 'any object';
        return;
      }
      name.className = 'pp-object-name';
      name.textContent = id;
      sub.textContent = 'reading…';
      try {
        const { object, thumbUrl } = await Vault.load(id);
        name.textContent = object.title || object.id;
        sub.textContent = object.type
          + (object.render && object.render.w ? '  ' + object.render.w + '×' + object.render.h : '');
        if (thumbUrl) thumb.src = thumbUrl;
      } catch {
        // The vault may be absent, or the object gone. Say so; do not blank
        // the value, which is still what the recipe holds.
        sub.textContent = 'not in this vault';
      }
    };

    sync(value);
    return { node: wrap, sync };
  },
};

/** The types this panel can draw. Held against params.js's PARAM_TYPES. */
export const WIDGET_TYPES = Object.keys(WIDGETS);
