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
 */

import { handlesOf } from './guides.js';
import { pictureSize } from './draw.js';

/** How near a press must be to a handle, in CSS pixels. */
const REACH = 12;

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {() => number} opts.view        canvas pixels per picture pixel, as last painted
 * @param {object} opts.emit              the emitter's Params
 * @param {object} opts.picture           the picture's Params
 * @param {() => boolean} opts.guides     whether the guides, and so the handles, are shown
 */
export function wirePointer({ canvas, view, emit, picture, guides }) {
  let drag = null;

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

  canvas.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    const pt = at(ev);
    const h = under(pt);
    if (!h) return;
    const [kx, ky] = h.id === 'emitter' ? ['x', 'y'] : ['fx', 'fy'];
    drag = { reach: h.id === 'reach', from: pt, kx, ky, x: emit.get(kx), y: emit.get(ky), k: h.k };
    canvas.setPointerCapture(ev.pointerId);
  });

  canvas.addEventListener('pointermove', ev => {
    const pt = at(ev);
    if (!drag) { canvas.classList.toggle('can-move', !!under(pt)); return; }
    if (drag.reach) {
      emit.set('falloff', Math.max(1, Math.round(Math.hypot(pt.x - emit.get('fx'), pt.y - emit.get('fy')))));
      return;
    }
    emit.set({ [drag.kx]: Math.round(drag.x + (pt.x - drag.from.x) / drag.k),
               [drag.ky]: Math.round(drag.y + (pt.y - drag.from.y) / drag.k) });
  });

  const drop = () => { drag = null; };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);
}
