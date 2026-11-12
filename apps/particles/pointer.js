/**
 * pointer.js — the emitter, the fields' centre and their reach, dragged on
 * the preview.
 *
 * Press on a handle (guides.js `handlesOf`) and drag: the handle follows,
 * through the emitter panel's own rows — `x` and `y`, `fx` and `fy`, or the
 * reach, `falloff`, as far as the pointer is from the centre — so the rows
 * move with it and what is saved is what the panel says. An
 * emitter deep in the picture is seen smaller and moves less on screen, so
 * its drag is divided by the camera's scale and it stays under the pointer.
 * Over a handle the pointer says it can move it; with the guides off there
 * is nothing to take hold of.
 *
 * Since S8 (core/shell/guides.js) a handle dragged is pulled by the viewer's
 * magnet — to the picture's edges, its centre, the guides; Ctrl held, not —
 * and the one last pressed is the selection: F puts it at the centre, the
 * emitter until another is pressed.
 *
 * And its layers (G3's overlay, a list since L13b): a press on one, on no
 * handle — the topmost under it — drags it by its middle through its `x`
 * and `y`, the magnet pulling its middle; F places the one pressed last
 * with its own edge or corner on the picture's.
 */

import { handlesOf, layerOnPicture, onOverlay } from './guides.js';
import { pictureSize } from './draw.js';
import { snapPoint, endSnap, select, placeable } from '../../core/shell/guides.js';

/** How near a press must be to a handle, in CSS pixels. */
const REACH = 12;

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {() => number} opts.view        canvas pixels per picture pixel, as last painted
 * @param {object} opts.emit              the emitter's Params
 * @param {object} opts.picture           the picture's Params
 * @param {() => boolean} opts.guides     whether the guides, and so the handles, are shown
 * @param {() => void} [opts.chose]       a handle was pressed: the selection changed, to be drawn
 * @param {() => object[]} [opts.layers]   its layers, opened and laid (core/layers-draw.js `laidOn`), once they come
 * @returns {{layer: () => number}}   the layer pressed last, by its place in the list — F's, ringed — or -1
 */
export function wirePointer({ canvas, view, emit, picture, guides, chose = () => {}, layers = () => [] }) {
  let drag = null, last = -1;

  /** Layer `i` of the list, its middle moved to (x, y) from the format's: a step, as its rows' change is. */
  const moveLayer = (i, x, y) => picture.set('layers', picture.values.layers.map((l, k) => (k === i ? { ...l, x, y } : l)));

  /** A pointer's place in picture pixels from the centre, and CSS pixels per picture pixel. */
  const at = ev => {
    const rect = canvas.getBoundingClientRect();
    const css = (rect.width / canvas.width) * view();
    const { width, height } = pictureSize(picture.values);
    return { x: (ev.clientX - rect.left) / css - width / 2, y: (ev.clientY - rect.top) / css - height / 2, css };
  };

  /** The handle under a point, the nearest within reach, or null. */
  const under = pt => {
    if (!guides()) return null;
    let best = null, near = REACH / pt.css;
    for (const h of handlesOf(emit.values, picture.values)) {
      const d = Math.hypot(h.x - pt.x, h.y - pt.y);
      if (d <= near) { best = h; near = d; }
    }
    return best;
  };

  /** The topmost layer under a point, away from every handle — laid, with its place in the list — or null. */
  const onIt = pt => {
    if (!guides()) return null;
    const laid = layers();
    for (let i = laid.length - 1; i >= 0; i--) if (onOverlay(layerOnPicture(laid[i], picture.values), pt.x, pt.y)) return laid[i];
    return null;
  };

  canvas.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    const pt = at(ev);
    const h = under(pt);
    const o = h ? null : onIt(pt);
    if (o) {
      last = o.index;
      select('overlay');
      chose();
      drag = { layer: o.index, from: pt, x: o.layer.x || 0, y: o.layer.y || 0 };
      canvas.setPointerCapture(ev.pointerId);
      return;
    }
    if (!h) return;
    select(h.id === 'emitter' ? 'emitter' : 'field');
    chose();
    const [kx, ky] = h.id === 'emitter' ? ['x', 'y'] : ['fx', 'fy'];
    drag = { reach: h.id === 'reach', from: pt, kx, ky, x: emit.get(kx), y: emit.get(ky), k: h.k };
    canvas.setPointerCapture(ev.pointerId);
  });

  canvas.addEventListener('pointermove', ev => {
    const pt = at(ev);
    if (!drag) { canvas.classList.toggle('can-move', !!under(pt) || !!onIt(pt)); return; }
    if (drag.layer != null) {
      // Its middle, pulled by the magnet — in the picture's pixels from its top left.
      const { width, height } = pictureSize(picture.values);
      const [sx, sy] = snapPoint(drag.x + (pt.x - drag.from.x) + width / 2, drag.y + (pt.y - drag.from.y) + height / 2, ev.ctrlKey || ev.metaKey);
      moveLayer(drag.layer, Math.round(sx - width / 2), Math.round(sy - height / 2));
      return;
    }
    if (drag.reach) {
      emit.set('falloff', Math.max(1, Math.round(Math.hypot(pt.x - emit.get('fx'), pt.y - emit.get('fy')))));
      return;
    }
    // Where the handle is seen, pulled by the magnet — in the picture's pixels from its top left.
    const { width, height } = pictureSize(picture.values);
    const [sx, sy] = snapPoint(drag.x * drag.k + (pt.x - drag.from.x) + width / 2,
                               drag.y * drag.k + (pt.y - drag.from.y) + height / 2, ev.ctrlKey || ev.metaKey);
    emit.set({ [drag.kx]: Math.round((sx - width / 2) / drag.k),
               [drag.ky]: Math.round((sy - height / 2) / drag.k) });
  });

  const drop = () => { if (drag) endSnap(); drag = null; };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);

  // What F places: put where it is seen — the emitter through the camera at its depth.
  const put = (kx, ky, deep) => (x, y) => {
    const { width, height } = pictureSize(picture.values);
    const k = (deep && handlesOf(emit.values, picture.values).find(h => h.id === 'emitter')?.k) || 1;
    emit.set({ [kx]: Math.round((x - width / 2) / k), [ky]: Math.round((y - height / 2) / k) });
  };
  placeable([
    { id: 'emitter', label: 'the emitter', put: put('x', 'y', true) },
    { id: 'field', label: "the fields' centre", put: put('fx', 'fy', false) },
    // The layer pressed last with its own edge or corner on the picture's: its middle where the anchor says,
    // moved back by as much of its box — so at the top it stands under the top, not half over it.
    { id: 'overlay', label: 'the layer pressed last', put: (x, y) => {
      const laid = layers(), o = laid.find(l => l.index === last) || laid[laid.length - 1];
      const b = o && layerOnPicture(o, picture.values);
      if (!b) return;
      const { width, height } = pictureSize(picture.values);
      const fx = x / width - 0.5, fy = y / height - 0.5;
      moveLayer(o.index, Math.round(x - width / 2 - fx * b.w), Math.round(y - height / 2 - fy * b.h));
    } },
  ]);
  return { layer: () => last };
}
