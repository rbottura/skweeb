/**
 * bindings.js — what the left hand's keys do in every app (S5b, 2026-11-03;
 * docs/scene.md), by their place (core/keys.js) — the letters an AZERTY
 * shows, a QWERTY's in brackets:
 *
 *   A [Q]   the app's own: tapped its next, held its pie — `appPie`, the
 *           author's word: each app's own; nothing where an app has none
 *   Z [W]   the view: tapped the app's overlay — particles' and map's guides,
 *           G's before — or the rulers; held rulers, magnet, guides cleared
 *   E       export: tapped the title bar's menu; held the Export box's acts
 *   R       again: tapped a new seed; held the seed before, or the section
 *           under the pointer reset
 *   F       place: tapped the selection to the centre; held an edge or a
 *           corner — where the app has anything to place (S8)
 *   Q D [A D]  the frame before, after; Shift ten
 *   G       the ground: its colour, or none — the author's word, 2026-11-03
 *   X       what is under the pointer reset: a value, or a drawer by its head
 *   H       the object's states, a graph over the page (S7, core/shell/graph.js)
 *
 * DOM only when a key is pressed: it reads the page as it stands — the
 * player's buttons, the Export box, a row's params (core/param-rows.js) —
 * so an app wires nothing but its own pie and its overlay.
 */

import { bind } from '../keys.js';
import * as Guides from './guides.js';
import { actsOnPage, showPrint } from '../boxes/export.js';
import { rowParams } from '../param-rows.js';
import { Vault } from '../vault.js';
import { held } from '../scope.js';

const $ = sel => document.querySelector(sel);
const press = node => { if (node && !node.disabled) { node.click(); return true; } return false; };

let appPie = null;            // { title, items() → [{ label, run, on? }], tap() }
let overlay = null;           // { label, on() → bool, toggle() }

/** The app's own pie, on A: its choices, and what a tap does. */
export function setAppPie(spec) { appPie = spec; held(() => { if (appPie === spec) appPie = null; }); }

/** What the view's tap shows or hides, first: an app's guides over its picture. */
export function setOverlay(spec) { overlay = spec; held(() => { if (overlay === spec) overlay = null; }); }

/**
 * A pie of an enum's options, the one picked lit; a tap the next. For an
 * app whose own choice is one param — particles' emitter shape.
 */
export function enumPie(params, key, title) {
  const spec = params.spec(key), label = v => (spec.labels && spec.labels[v]) || v;
  return {
    title,
    items: () => spec.options.map(v => ({ label: label(v), on: params.get(key) === v, run: () => params.set(key, v) })),
    tap: () => {
      const i = spec.options.indexOf(params.get(key));
      params.set(key, spec.options[(i + 1) % spec.options.length]);
    },
  };
}

/** The frames: the player's own buttons, so a busy export stops them as it stops a click. */
function step(dir, ten) {
  const button = $(dir < 0 ? '.tp .tp-back' : '.tp .tp-on');
  for (let i = 0; i < (ten ? 10 : 1); i++) if (!press(button)) return;
}

/** The ground of the page's picture — not a print's paper, a card's, a stack layer's. */
function groundChip() {
  const row = [...document.querySelectorAll('.pp-row')]
    .find(r => r.querySelector('.pp-ground') && !r.closest('.pp-print, .pp-card, .pp-stack-layer, [hidden]'));
  return row ? row.querySelector('.pp-ground .pp-chip') : null;
}

const hovered = sel => [...document.querySelectorAll(`${sel}:hover`)].pop() || null;

/** Under the pointer: a row's value back to its default, or every row of a drawer by its head. */
function resetUnder() {
  const row = hovered('.pp-row');
  const head = row ? null : hovered('.dr-head');
  const rows = row ? [row] : head ? [...head.closest('.dr').querySelectorAll('.pp-row')] : [];
  for (const r of rows) {
    const o = rowParams(r);
    if (o) o.params.set(o.key, o.params.defaultOf(o.key));
  }
}

/** The seed's row, the first a panel shows. */
function seedRow() {
  const row = [...document.querySelectorAll('.pp-row[data-key="seed"]')].find(r => !r.closest('[hidden]'));
  return rowParams(row);
}
const reseed = d => { const o = seedRow(); if (o) o.params.set(o.key, o.params.get(o.key) + d); };

const ANCHORS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];       // round the pie as round the picture

export function installBindings() {
  bind('KeyA', { short: 'frame', label: 'the frame before · Shift ten', tap: e => step(-1, e.shiftKey) });
  bind('KeyD', { short: 'frame', label: 'the frame after · Shift ten', tap: e => step(1, e.shiftKey) });

  bind('KeyQ', {
    short: 'its own', label: "the app's own", when: () => !!appPie,
    tap: () => appPie.tap && appPie.tap(),
    pie: () => ({ title: appPie.title, items: appPie.items() }),
  });

  bind('KeyW', {
    short: 'view', label: 'the view',
    tap: () => (overlay ? overlay.toggle() : Guides.toggle('rulers')),
    pie: () => {
      const st = Guides.state(), n = Guides.guides().length;
      return { title: 'view', items: [
        ...(overlay ? [{ label: overlay.label, on: overlay.on(), run: () => overlay.toggle() }] : []),
        { label: 'rulers and guides', on: st.rulers, run: () => Guides.toggle('rulers') },
        { label: 'magnetism', on: st.magnet, run: () => Guides.toggle('magnet') },
        ...(n ? [{ label: `clear ${n} guide${n > 1 ? 's' : ''}`, run: () => Guides.clear() }] : []),
      ] };
    },
  });

  bind('KeyE', {
    short: 'export', label: 'export',
    tap: () => press($('skw-titlebar .tb-export')),
    pie: () => ({ title: 'export', items: [
      ...actsOnPage().flatMap(s => s.acts.map(a => ({ label: a.label.replace(/\s*\[S\]$/, ''), run: () => a.button.click() }))),
      { label: 'Print…', run: () => showPrint() },
    ] }),
  });

  bind('KeyR', {
    short: 'again', label: 'again: a new seed',
    tap: () => reseed(1),
    pie: () => {
      const items = [];
      if (seedRow()) items.push({ label: 'a new seed', run: () => reseed(1) }, { label: 'the seed before', run: () => reseed(-1) });
      const dr = hovered('.dr');
      const title = dr && dr.querySelector(':scope > .dr-head > span')?.textContent;
      if (dr && dr.querySelector('.pp-row')) {
        items.push({ label: `reset ${title || 'this section'}`, run: () => {
          for (const r of dr.querySelectorAll('.pp-row')) { const o = rowParams(r); if (o) o.params.set(o.key, o.params.defaultOf(o.key)); }
        } });
      }
      return { title: 'again', items };
    },
  });

  bind('KeyF', {
    short: 'place', label: 'place the selection', when: () => Guides.hasPlaceable(),
    tap: () => Guides.place('c'),
    pie: () => ({ title: 'place', items: ANCHORS.map(a => ({ label: Guides.WORDS[a], run: () => Guides.place(a) })) }),
  });

  bind('KeyG', { short: 'ground', label: 'the ground, or none', when: () => !!groundChip(), tap: () => press(groundChip()) });
  bind('KeyH', { short: 'states', label: "the object's states, as a graph over the page", when: () => !!(Vault.bound && Vault.bound.id),
    tap: () => import('./graph.js').then(m => m.toggleGraph()) });
  bind('KeyX', { short: 'reset', label: 'reset what is under the pointer', tap: () => resetUnder() });
}
