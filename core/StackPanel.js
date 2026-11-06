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
 * `stackDrawer(panel, { app, layer, clock })` is the one line an app adds:
 * it joins the windows with what is on screen — the envelope its print
 * draws, a loop as a loop by its clock — and the stack, puts the drawer in
 * its panel, and draws the stack round its canvas (core/stackView.js). DOM and params;
 * core/stack-panel.css draws `.pp-stack`.
 */

import { joinLive, loopOf, savedBy } from './live.js';
import { sendButtons, takeWhenAsked } from './send.js';
import { saveStack }    from './stackSave.js';
import { joinStack }    from './stack.js';
import { stackView }    from './stackView.js';
import { BLENDS, BLEND_LABELS } from './blend.js';
import { defineParams } from './params.js';
import { ParamPanel }   from './ParamPanel.js';
import { VaultPanel }   from './VaultPanel.js';
import { Vault }        from './vault.js';
import { follow, reopenUrl } from './reopen.js';

/** A layer's rows: how it meets what is under it, and where it sits on the page. */
export const LAYER_PARAMS = {
  opacity: { type: 'range', min: 0, max: 1, step: 0.01, default: 1, label: 'opacity' },
  blend: { type: 'enum', options: BLENDS, labels: BLEND_LABELS, default: 'normal', label: 'blend' },
  x: { type: 'int', min: -20000, max: 20000, default: 0, label: 'x from centre', pair: 'y', pairLabel: 'from centre', axis: 'x' },
  y: { type: 'int', min: -20000, max: 20000, default: 0, label: 'y from centre', axis: 'y' },
  scale: { type: 'range', min: 0.01, max: 8, step: 0.01, default: 1, label: 'scale' },
  rot: { type: 'range', min: -180, max: 180, step: 0.5, default: 0, label: 'rotation', unit: '°' },
  /** The layer's object, carried and never shown — `when` a list none of which holds — for the row under it. */
  ref: { type: 'text', default: '', label: 'object', when: [] },
  /** A smart object's layer: kept at a state, or 0, following its latest (L1) — compose's row, the same words (S6b). */
  version: { type: 'int', min: 0, max: 100000, default: 0, label: 'at its state · 0 follows', when: { ref: { prefix: 'skw_' } } },
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
 * @param {?object} [opts.clock]          the app's, core/playback.js's: what plays goes as a loop
 * @param {() => ?HTMLCanvasElement} [opts.canvas]  its own canvas: by default, its viewer's
 * @param {() => *} [opts.save]          its own save: what another window asks of it before it holds this one
 * @param {(windowId: string) => void} [opts.take]   take another window as its source (core/send.js)
 * @returns {{live: object, stack: object, view: object}}
 */
export function stackDrawer(panel, { app, layer, clock = null, save = null, take = null,
  canvas = () => document.querySelector('.viewer-stage canvas:not(.stack-layer)') }) {
  const live = joinLive({ app, layer: async () => loopOf(await layer(), clock) });
  const stack = joinStack(live);
  const view = stackView({ live, stack, canvas });
  const drawer = panel.addDrawer({ id: 'stack', title: 'Stack' });
  const note = el('p', 'pp-stack-note');
  const list = el('ul', 'pp-stack');
  const rows = el('div', 'pp-stack-layer');
  const adds = el('div', 'pp-stack-adds');
  const said = el('p', 'pp-stack-said');
  const sends = el('div', 'pp-stack-sends');
  const say = text => { said.textContent = text; };
  sends.append(...sendButtons(live, app, { button, say }), button('Save the stack as a page', 'every window in it saved as a smart object, and a page placing them', async () => {
    try {
      const page = await saveStack({ live, stack, say });
      if (!page) return say('no vault here: the page is downloaded instead');
      say(`saved ${page.id}, a page of ${page.recipe.place.length} layers — `);
      const open = el('a', 'pp-stack-open', 'open it in compose ↗');
      open.href = new URL('../compose/?open=' + encodeURIComponent(page.id), location.href).href;
      open.target = '_blank';
      // A plain click follows it — in a scene, compose in place (core/reopen.js); Ctrl or the middle button, a tab.
      open.addEventListener('click', e => {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        follow(open.href);
      });
      said.append(open);
    } catch (err) {
      say('the stack was not saved: ' + err.message);
    }
  }));
  drawer.body.append(note, list, rows, adds, sends, said);
  // Asked to save for something that will hold it: as a smart object, made once and then versioned.
  if (save) live.answer('save', ({ smart }) => { if (smart && !Vault.bound) Vault.bind({}); return savedBy(save); });
  if (take) takeWhenAsked(live, take);

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
    stack.set(i, { opacity: v.opacity, blend: v.blend, transform: { x: v.x, y: v.y, scale: v.scale, rot: v.rot },
                   ...(v.ref.startsWith('skw_') ? { version: v.version } : {}) });
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
      // A smart object's layer edited in place (L6): its app opened on it, bound — following it again if it was kept.
      if (b.ref && b.ref.startsWith('skw_')) row.append(button('✎', 'edit it in its app: its next save drawn here', () => editInPlace(i, b)));
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
      values.restore({ opacity: block.opacity ?? 1, blend: block.blend || 'normal', x: t.x, y: t.y, scale: t.scale, rot: t.rot,
                       ref: block.ref || '', version: Number.isInteger(block.version) ? block.version : 0 });
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

  /** A smart object's layer, in its app: opened on it, the window bound; kept at a state, it follows from now on. */
  async function editInPlace(i, b) {
    try {
      const url = await reopenUrl((await Vault.load(b.ref)).object);
      if (!url) return;
      if (Number.isInteger(b.version)) stack.set(i, { version: 0 });
      follow(url);
    } catch (err) {
      console.warn('[stack] could not open it to edit:', err);
    }
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
  return { live, stack, view };
}
