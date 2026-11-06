/**
 * vault-palette.js — a palette, made where the objects are (V1, 2026-11-06;
 * docs/workshop.md). The author: "l'objet palette de couleur doit exister"
 * — BEC's grid had three of its identity's, written in its code.
 *
 * A `palette` is an object of the vault (docs/object-model.md): its recipe
 * its colours in their order, `#rrggbb`, and a name for each or none; its
 * picture a strip of its swatches. Made from the vault panel's head, *+
 * palette*; edited from its detail, *Edit its colours*, as a material is —
 * kept, it is a new palette, the one it came from its parent: whatever was
 * made with that one keeps its colours. In the panel's detail, which in a
 * scene is a tab of the properties.
 *
 * DOM only when an editor is drawn or a palette saved.
 */

import { Vault }         from './vault.js';
import { thumbFromBlob } from './thumb.js';
import { toPng }         from './export.js';

/** Who made it: the vault, by hand. */
export const PALETTE_ORIGIN = { app: 'vault', version: '1.0.0' };
const HEX = /^#[0-9a-f]{6}$/;
const FIRST = ['#111111', '#7a7a7a', '#f2f0e9'];      // a new palette's, until the hand changes them

/**
 * A palette's recipe made sure of: colours `#rrggbb` in lower case — at least one — and a name for each, a
 * string, empty for none.
 *
 * @param {{colours?: string[], names?: string[]}} [r]
 * @returns {{colours: string[], names: string[]}}
 */
export function tidy({ colours = [], names = [] } = {}) {
  const kept = [];
  colours.forEach((c, i) => { const hex = String(c).trim().toLowerCase(); if (HEX.test(hex)) kept.push([hex, names[i]]); });
  if (!kept.length) kept.push(['#000000', '']);
  return { colours: kept.map(([c]) => c), names: kept.map(([, n]) => (typeof n === 'string' ? n.trim() : '')) };
}

/** Its picture: a strip of its swatches, a square each. */
export function swatches(colours, side = 96) {
  const c = new OffscreenCanvas(side * Math.max(1, colours.length), side);
  const ctx = c.getContext('2d');
  colours.forEach((hex, i) => { ctx.fillStyle = hex; ctx.fillRect(i * side, 0, side, side); });
  return c;
}

/**
 * A palette into the vault.
 *
 * @param {object} p
 * @param {string} p.title
 * @param {string[]} p.colours
 * @param {string[]} [p.names]
 * @param {string[]} [p.parents]   the palette it was edited from, the picture it was read from
 * @param {string[]} [p.tags]
 * @returns {Promise<object>}       the object saved
 */
export async function savePalette({ title, colours, names = [], parents = [], tags = [] }) {
  const recipe = tidy({ colours, names });
  const canvas = swatches(recipe.colours);
  const blob = await toPng(canvas);
  return Vault.save({
    type: 'palette', title: (title || '').trim() || 'palette', tags: ['palette', ...tags], origin: PALETTE_ORIGIN,
    recipe, seed: null, parents, render: { blob, ext: 'png', w: canvas.width, h: canvas.height }, thumb: await thumbFromBlob(blob),
  });
}

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/**
 * The editor, drawn into the panel's detail: the palette's name; its swatches, each a colour and a name,
 * moved, taken out, one added; a strip of them as they are. Kept, a palette is saved — from one there was,
 * a new one, that one its parent.
 *
 * @param {HTMLElement} body
 * @param {object} o
 * @param {?object} [o.from]                 the palette edited, as loaded; none for a new one
 * @param {(saved: object) => void} o.onKept
 * @param {() => void} o.onCancel
 */
export function paletteEditor(body, { from = null, onKept, onCancel }) {
  const start = from ? tidy(from.recipe || {}) : { colours: [...FIRST], names: FIRST.map(() => '') };
  const rows = start.colours.map((c, i) => ({ colour: c, name: start.names[i] }));
  const name = el('input', 'vp-pal-title');
  Object.assign(name, { type: 'text', value: from ? (from.title || '') : 'palette', placeholder: 'its name' });
  name.setAttribute('aria-label', 'The palette’s name');
  const strip = el('div', 'vp-pal-strip');
  const list = el('ol', 'vp-pal-list');
  const add = el('button', 'vp-btn', '+ a colour');
  add.type = 'button';
  add.addEventListener('click', () => { rows.push({ colour: rows[rows.length - 1]?.colour || '#808080', name: '' }); paint(); });
  const keep = el('button', 'vp-btn vp-btn--primary', from ? 'Keep, as a new palette' : 'Keep');
  keep.type = 'button';
  const cancel = el('button', 'vp-btn', 'Cancel');
  cancel.type = 'button';
  cancel.addEventListener('click', () => onCancel());
  const said = el('div', 'vp-sub');
  keep.addEventListener('click', async () => {
    keep.disabled = true;
    said.textContent = 'keeping…';
    try {
      const saved = await savePalette({ title: name.value, colours: rows.map(r => r.colour), names: rows.map(r => r.name),
        parents: from ? [from.id] : [] });
      onKept(saved);
    } catch (err) {
      said.textContent = 'not kept: ' + err.message;
      keep.disabled = false;
    }
  });
  const acts = el('div', 'vp-actions');
  acts.append(keep, cancel);
  body.replaceChildren(el('div', 'vp-section', from ? 'Its colours, edited' : 'A palette'), name, strip, list, add, acts, said);

  function paint() {
    strip.replaceChildren(...rows.map(r => { const s = el('span'); s.style.background = r.colour; s.title = r.name || r.colour; return s; }));
    list.replaceChildren(...rows.map((r, i) => {
      const li = el('li', 'vp-pal-row');
      const colour = el('input', 'vp-pal-colour');
      Object.assign(colour, { type: 'color', value: r.colour });
      colour.setAttribute('aria-label', `Colour ${i + 1}`);
      colour.addEventListener('input', () => { r.colour = colour.value; strip.children[i].style.background = r.colour; });
      const label = el('input', 'vp-pal-name');
      Object.assign(label, { type: 'text', value: r.name, placeholder: r.colour });
      label.setAttribute('aria-label', `Its name, colour ${i + 1}`);
      label.addEventListener('input', () => { r.name = label.value; });
      const move = (d, text, title) => {
        const b = el('button', 'vp-btn vp-pal-move', text);
        Object.assign(b, { type: 'button', title, disabled: i + d < 0 || i + d >= rows.length });
        b.addEventListener('click', () => { [rows[i], rows[i + d]] = [rows[i + d], rows[i]]; paint(); });
        return b;
      };
      const out = el('button', 'vp-btn vp-pal-move', '✕');
      Object.assign(out, { type: 'button', title: 'Take it out', disabled: rows.length < 2 });
      out.addEventListener('click', () => { rows.splice(i, 1); paint(); });
      li.append(colour, label, move(-1, '↑', 'Sooner'), move(1, '↓', 'Later'), out);
      return li;
    }));
  }
  paint();
  name.focus?.();
}
