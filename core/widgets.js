/**
 * widgets.js — one control per parameter type.
 *
 * The half of "parameters are data" you can touch. core/params.js holds the
 * types and their rules; this holds how each one is drawn, and ParamPanel.js
 * lays them out. Every key here must exist in params.js's PARAM_TYPES and the
 * reverse — tests/params.mjs holds the two lists against each other, because a
 * type with no widget is a declared control that quietly never draws.
 *
 * Each widget is `ctx => ({ node, sync(value), values?(all) })`:
 *   node      what goes in the row
 *   sync      a value arrived from elsewhere — a restore, a key press, a drag
 *             on the canvas — and the control must move to match it
 *   values    optional: every value, after any change, for a widget that
 *             depends on another param (the sprite grid reads its family)
 *
 * `ctx` is { key, spec, value, set, readout, panel }. `readout` is the slot
 * beside the label; a number widget puts a typed box there.
 */

import * as Registry from './registry.js';
import { Vault }     from './vault.js';
import { numberBox, boxed, paintFill } from './numbox.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

export const WIDGETS = {
  /**
   * A slider and a number. With `log: true` the slider runs on the
   * logarithm — every factor of ten the same length of track — for a range
   * of many orders, a zoom from 0.1 to a million; the number is the value.
   * Its min must be above 0.
   */
  range: ({ key, spec, value, set, readout, panel }) => {
    const input = el('input', 'pp-range');
    input.type = 'range';
    const log = !!spec.log && spec.min > 0;
    const along = v => (log ? Math.log10(v) : v);
    input.min = along(spec.min ?? 0);
    input.max = along(spec.max ?? 100);
    // The slider's step is five of the box's, a quick way to a round value
    // (the author's, 2026-11-03) — unless that leaves it fewer than eight stops.
    const lo = spec.min ?? 0, hi = spec.max ?? 100, fine = spec.step ?? 1;
    const coarse = (hi - lo) / (fine * 5) >= 8 ? fine * 5 : fine;
    input.step = 'any';
    input.value = along(value);
    input.addEventListener('input', () => {
      const x = parseFloat(input.value);
      set(log ? 10 ** x : Math.min(hi, Math.max(lo, Math.round(x / coarse) * coarse)));
    });
    const box = numberBox(spec, value, set, () => panel.value(key));
    readout.replaceChildren(spec.unit ? boxed(box, spec.unit) : box);
    return { node: input, sync(v) { input.value = along(v); box.value = v; paintFill(box, spec, v); } };
  },

  // A count. Declaring `int` rather than `range` with step 1 says the value is
  // whole, which a panel shows the same way but a recipe reader can rely on.
  int: ctx => WIDGETS.range({ ...ctx, spec: { ...ctx.spec, step: 1 } }),   // a log slider's value is rounded by the param

  bool: ({ value, set }) => {
    const wrap  = el('label', 'pp-switch');
    const input = el('input');
    input.type = 'checkbox';
    input.checked = value;
    wrap.append(input, el('span', 'pp-track'));
    input.addEventListener('change', () => set(input.checked));
    return { node: wrap, sync(v) { input.checked = v; } };
  },

  /**
   * A choice: a dropdown, or a row of chips with `display: 'chips'` — for a
   * list you pick from often and want to see whole. `labels` maps an option
   * to what it says, since `ig-portrait` is an id and 1080×1350 is the choice.
   */
  enum: ctx => (ctx.spec.display === 'chips' ? chipEnum(ctx) : selectEnum(ctx)),

  /**
   * A colour. Its sync never writes back a value the input already shows: the
   * panel syncs every change, the input's own included, and writing a colour
   * input's value while its picker is open closes the picker under the hand
   * dragging in it. The same holds for `ground` and each swatch of `color[]`.
   */
  color: ({ value, set, readout }) => {
    const input = el('input', 'pp-color');
    input.type = 'color';
    input.value = value;
    readout.textContent = value;
    input.addEventListener('input', () => set(input.value));
    return { node: input, sync(v) { if (input.value !== v) input.value = v; readout.textContent = v; } };
  },

  /** A colour, or none: a transparent ground is a choice, not a second switch. */
  ground: ({ value, set, readout }) => {
    const wrap = el('div', 'pp-ground');
    const color = el('input', 'pp-color');
    color.type = 'color';
    const none = el('button', 'pp-chip', 'none');
    none.type = 'button';
    none.title = 'No ground: transparent';
    wrap.append(color, none);

    let current = value;
    let last = value === 'none' ? '#ffffff' : value;
    color.addEventListener('input', () => set(color.value));
    none.addEventListener('click', () => set(current === 'none' ? last : 'none'));

    const sync = v => {
      current = v;
      const off = v === 'none';
      if (!off) { last = v; if (color.value !== v) color.value = v; }
      none.classList.toggle('pp-chip--on', off);
      color.classList.toggle('pp-color--off', off);
      readout.textContent = off ? 'none' : v;
    };
    sync(value);
    return { node: wrap, sync };
  },

  /** One line, or a box with `multiline: true` — ckt sets type in lines. */
  text: ({ spec, value, set }) => {
    const input = el(spec.multiline ? 'textarea' : 'input', 'pp-text');
    if (spec.multiline) input.rows = 3;
    else input.type = 'text';
    input.value = value;
    input.addEventListener('input', () => set(input.value));
    return { node: input, sync(v) { input.value = v; } };
  },

  'color[]': ({ value, set, readout }) => {
    const wrap = el('div', 'pp-colors');
    let colors = Array.from(value || []);
    let swatches = [];
    const repaint = () => {
      wrap.replaceChildren();
      readout.textContent = colors.length;
      swatches = colors.map((c, i) => {
        const swatch = el('input', 'pp-color');
        swatch.type = 'color';
        swatch.value = c;
        swatch.addEventListener('input', () => { colors[i] = swatch.value; set(colors.slice()); });
        wrap.append(swatch);
        return swatch;
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
    return {
      node: wrap,
      /**
       * As many colours as before: each swatch set in place, the one being
       * picked left alone. Only a colour added or taken away rebuilds the row
       * — rebuilding while a picker is open takes its swatch, and the picker,
       * away (see `color`).
       */
      sync(v) {
        const next = Array.from(v || []);
        if (next.length !== swatches.length) { colors = next; repaint(); return; }
        colors = next;
        next.forEach((c, i) => { if (swatches[i].value !== c) swatches[i].value = c; });
        readout.textContent = colors.length;
      },
    };
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
    choose.addEventListener('click', () => panel.pick(key, spec, object => set(object.id)));
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
        // The vault may be absent or the object gone. Say so; keep the value,
        // which is still what the recipe holds.
        sub.textContent = 'not in this vault';
      }
    };
    sync(value);
    return { node: wrap, sync };
  },

  /**
   * One sprite of a family, picked from a grid of the family's own images —
   * v2 had this, the gamepad's brush panel shows one at a time. `spec.family`
   * names the param holding the family; when it changes, the grid redraws.
   */
  sprite: ({ spec, value, set, readout, panel }) => {
    const wrap = el('div', 'pp-sprites');
    const cells = [];
    let family, count = 0, current = value;

    const mark = () => {
      const on = count ? ((current % count) + count) % count : -1;
      cells.forEach((cell, i) => cell.classList.toggle('pp-sprite--on', i === on));
      readout.textContent = count ? `${on} / ${count}` : '';
    };

    const build = fam => {
      family = fam;
      wrap.replaceChildren();
      cells.length = 0;
      count = fam ? Registry.spriteCount(fam) : 0;
      if (!count) wrap.append(el('div', 'pp-empty', 'no sprites here'));
      for (let i = 0; i < count; i++) {
        const cell = el('button', 'pp-sprite');
        cell.type = 'button';
        cell.title = 'sprite ' + i;
        const img = el('img');
        img.loading = 'lazy';
        img.alt = '';
        img.src = Registry.getSpriteUrl(fam, i);
        cell.append(img);
        cell.addEventListener('click', () => set(i));
        cells.push(cell);
        wrap.append(cell);
      }
      mark();
    };

    build(panel.value(spec.family));
    return {
      node: wrap,
      sync(v) { current = v; mark(); },
      values(all) { if (all[spec.family] !== family) build(all[spec.family]); },
    };
  },
};

// ── The two faces of an enum ─────────────────────────────────────────────────

/** What a run of a list is called, where an enum marks its runs (`groups`, frame.js's format). */
const RUN_WORDS = { derived: 'from the picture', ratio: 'shape', px: 'pixels', print: 'print', custom: 'yours' };

function selectEnum({ spec, value, set }) {
  const select = el('select', 'pp-select');
  let into = select;
  for (const option of spec.options || []) {
    const run = spec.groups && spec.groups[option];
    if (run) {
      into = el('optgroup');
      into.label = RUN_WORDS[run] || run;
      select.append(into);
    }
    const o = el('option', null, labelFor(spec, option));
    o.value = option;
    into.append(o);
  }
  select.value = value;
  select.addEventListener('change', () => set(select.value));
  return { node: select, sync(v) { select.value = v; } };
}

function chipEnum({ spec, value, set }) {
  const wrap = el('div', 'pp-chips');
  const chips = new Map();
  for (const option of spec.options || []) {
    const chip = el('button', 'pp-chip', labelFor(spec, option));
    chip.type = 'button';
    chip.title = option;
    // A group rules a line before the first chip of each run, so ratios,
    // pixel sizes and paper do not read as one wall.
    const group = spec.groups && spec.groups[option];
    if (group) chip.dataset.group = group;
    chip.addEventListener('click', () => set(option));
    chips.set(option, chip);
    wrap.append(chip);
  }
  const sync = v => {
    for (const [option, chip] of chips) chip.classList.toggle('pp-chip--on', option === v);
  };
  sync(value);
  return { node: wrap, sync };
}

const labelFor = (spec, option) => (spec.labels && spec.labels[option]) || option;

/** The types this file can draw. Held against params.js's PARAM_TYPES. */
export const WIDGET_TYPES = Object.keys(WIDGETS);
