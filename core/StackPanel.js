/**
 * StackPanel.js — the Stack drawer: the windows of the suite open in this
 * browser and what each has on screen (core/live.js), this window first.
 * M11's first brick; the stack itself — its layers in order, each with its
 * opacity and blend — grows here next (docs/smart-objects.md, *The live
 * stack*).
 *
 * `stackDrawer(panel, { app, layer })` is the one line an app adds: it joins
 * the windows with what is on screen — the envelope its print draws — and
 * puts the drawer in its panel. DOM only; core/param-panel.css draws
 * `.pp-stack`.
 */

import { joinLive } from './live.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;     // never innerHTML: titles are the page's
  return node;
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

/**
 * Join this browser's windows and show them in a drawer.
 *
 * @param {object} panel                 a core ParamPanel: the drawer goes at its end
 * @param {object} opts
 * @param {string} opts.app
 * @param {() => (object|string|null)} opts.layer   what is on screen, as its print has it
 * @returns {object}                     the window, core/live.js's
 */
export function stackDrawer(panel, { app, layer }) {
  const live = joinLive({ app, layer });
  const drawer = panel.addDrawer({ id: 'stack', title: 'Stack' });
  const note = el('p', 'pp-stack-note');
  const list = el('ul', 'pp-stack');
  drawer.body.append(note, list);

  const paint = () => {
    const all = [live.mine(), ...live.windows()];
    note.textContent = all.length > 1
      ? `${all.length} windows of the suite open in this browser`
      : 'Alone in this browser: open another app of the suite, and it shows here.';
    list.replaceChildren(...all.map((w, i) => {
      const row = el('li', 'pp-stack-row' + (i ? '' : ' pp-stack-row--mine'));
      row.dataset.app = w.app;
      row.append(el('span', 'pp-stack-app', w.app), el('span', 'pp-stack-what', layerLine(w)));
      if (!i) row.append(el('span', 'pp-stack-tag', 'this window'));
      return row;
    }));
  };
  live.on(paint);
  paint();
  return live;
}
