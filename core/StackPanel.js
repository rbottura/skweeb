/**
 * StackPanel.js — the Stack drawer: this browser's live stack, and the
 * windows that make it (core/stack.js, core/live.js; docs/smart-objects.md,
 * *The live stack*).
 *
 * The stack top first, each layer a line — what it is, this window marked —
 * moved up or down or taken off; the chosen layer's rows below it, a schema
 * (rule 1): its opacity and blend, its place on the page. Then what can go
 * on: this window, the other windows open, anything in the vault.
 *
 * `stackDrawer(panel, { app, layer })` is the one line an app adds: it joins
 * the windows with what is on screen — the envelope its print draws — and
 * the stack, and puts the drawer in its panel. DOM and params;
 * core/param-panel.css draws `.pp-stack`.
 */

import { joinLive }     from './live.js';
import { joinStack }    from './stack.js';
import { BLENDS, BLEND_LABELS } from './blend.js';
import { defineParams } from './params.js';
import { ParamPanel }   from './ParamPanel.js';
import { VaultPanel }   from './VaultPanel.js';
import { Vault }        from './vault.js';

/** A layer's rows: how it meets what is under it, and where it sits on the page. */
export const LAYER_PARAMS = {
  opacity: { type: 'range', min: 0, max: 1, step: 0.01, default: 1, label: 'opacity' },
  blend: { type: 'enum', options: BLENDS, labels: BLEND_LABELS, default: 'normal', label: 'blend' },
  x: { type: 'int', min: -20000, max: 20000, default: 0, label: 'x from centre' },
  y: { type: 'int', min: -20000, max: 20000, default: 0, label: 'y from centre' },
  scale: { type: 'range', min: 0.01, max: 8, step: 0.01, default: 1, label: 'scale' },
  rot: { type: 'range', min: -180, max: 180, step: 0.5, default: 0, label: 'rotation °' },
};

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

/** A window's layer in a few words — its kind, size and frames — or why there is none. */
export function layerLine(window) {
  const layer = window.layer;
  if (!layer) return window.why || 'nothing on screen';
  const r = layer.render || {};
  const size = r.w > 0 && r.h > 0 ? ` · ${Math.round(r.w)} × ${Math.round(r.h)}` : '';
  const frames = r.frames > 1 ? ` · ${r.frames} frames` : '';
  return (layer.type || 'object') + size + frames;
}

/** Its own size, as a block's first placing takes it: a layer's render, a vault row's. */
const sizeOf = thing => {
  const r = (thing && (thing.layer ? thing.layer.render : thing.render)) || {};
  return r.w > 0 && r.h > 0 ? { width: r.w, height: r.h } : null;
};

/**
 * Join this browser's windows and its stack, and show them in a drawer.
 *
 * @param {object} panel                 a core ParamPanel: the drawer goes at its end
 * @param {object} opts
 * @param {string} opts.app
 * @param {() => (object|string|null)} opts.layer   what is on screen, as its print has it
 * @returns {{live: object, stack: object}}
 */
export function stackDrawer(panel, { app, layer }) {
  const live = joinLive({ app, layer });
  const stack = joinStack(live);
  const drawer = panel.addDrawer({ id: 'stack', title: 'Stack' });
  const note = el('p', 'pp-stack-note');
  const list = el('ul', 'pp-stack');
  const rows = el('div', 'pp-stack-layer');
  const adds = el('div', 'pp-stack-adds');
  drawer.body.append(note, list, rows, adds);

  const values = defineParams(app + '-stack-layer', LAYER_PARAMS);
  new ParamPanel(values, { title: 'layer', mount: rows });
  let chosen = null;               // the chosen block: a window's id, or `ref:<id>`
  let picker = null;               // the vault, to add from: made when first asked
  const keyOf = b => (b.live ? b.live : 'ref:' + b.ref);
  const windowOf = id => (id === live.id ? live.mine() : live.windows().find(w => w.id === id));

  /** A block's line: its app and what it has for a window; its title for a vault object. */
  function lineOf(b) {
    if (b.live) {
      const w = windowOf(b.live);
      return { name: w ? w.app : 'a window', what: w ? layerLine(w) : '' };
    }
    const row = (Vault.index || []).find(r => r.id === b.ref);
    return { name: (row && row.title) || b.ref, what: row ? `${row.type} · from the vault` : 'from the vault' };
  }

  values.on(() => {
    if (values.restoring) return;
    const i = stack.get().place.findIndex(b => keyOf(b) === chosen);
    if (i < 0) return;
    const v = values.values;
    stack.set(i, { opacity: v.opacity, blend: v.blend, transform: { x: v.x, y: v.y, scale: v.scale, rot: v.rot } });
  });

  /** On top — and this window over it, when it is not in the stack yet: a look tried over what it will join. */
  function add(block, size) {
    const mine = block.live === live.id || stack.indexOf(live.id) >= 0;
    stack.add(mine ? block : [block, { live: live.id }], size);
    chosen = mine ? keyOf(block) : live.id;
    paint();
  }

  function paint() {
    const { page, place } = stack.get();
    const others = live.windows();
    note.textContent = (others.length ? `${others.length + 1} windows open in this browser` : 'Alone in this browser')
      + (page ? ` · the stack's page ${page.width} × ${page.height}` : ' · nothing stacked yet');

    if (!place.some(b => keyOf(b) === chosen)) chosen = place.length ? keyOf(place[place.length - 1]) : null;
    list.replaceChildren(...place.map((b, i) => ({ b, i })).reverse().map(({ b, i }) => {
      const { name, what } = lineOf(b);
      const row = el('li', 'pp-stack-row' + (b.live === live.id ? ' pp-stack-row--mine' : '')
        + (keyOf(b) === chosen ? ' pp-stack-row--chosen' : ''));
      row.dataset.key = keyOf(b);
      row.dataset.app = b.live ? name : 'vault';
      row.append(el('span', 'pp-stack-app', name), el('span', 'pp-stack-what', what));
      if (b.live === live.id) row.append(el('span', 'pp-stack-tag', 'this window'));
      row.append(button('▲', 'up the stack', () => stack.move(i, i + 1)),
        button('▼', 'down the stack', () => stack.move(i, i - 1)),
        button('×', 'off the stack', () => stack.remove(i)));
      row.addEventListener('click', () => { chosen = keyOf(b); paint(); });
      return row;
    }));

    const block = place.find(b => keyOf(b) === chosen);
    rows.hidden = !block;
    if (block) {
      const t = block.transform;
      values.restore({ opacity: block.opacity ?? 1, blend: block.blend || 'normal', x: t.x, y: t.y, scale: t.scale, rot: t.rot });
    }

    const here = new Set(place.filter(b => b.live).map(b => b.live));
    // A window not in the stack, its button saying what it has on screen.
    const add1 = (w, label) => button(label, layerLine(w), () => add({ live: w.id }, sizeOf(w)));
    adds.replaceChildren(
      ...(here.has(live.id) ? [] : [add1(live.mine(), '＋ this window')]),
      ...others.filter(w => !here.has(w.id)).map(w => add1(w, '＋ ' + w.app)),
      button('＋ from the vault…', 'anything in the vault, on top of the stack', () => {
        picker = picker || new VaultPanel({ pickLabel: 'Put on the stack',
          onPick: o => { add({ ref: o.id }, sizeOf(o)); picker.hide(); } });
        picker.show();
      }),
    );
  }

  // A vault object's title, from the index: asked once, and only for one it cannot name.
  let asked = false;
  const titled = () => {
    const unknown = stack.get().place.some(b => b.ref && !(Vault.index || []).some(r => r.id === b.ref));
    if (unknown && !asked) { asked = true; Vault.refresh().then(paint, () => {}); }
  };
  live.on(paint);
  stack.on(() => { titled(); paint(); });
  paint();
  return { live, stack };
}
