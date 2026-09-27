/**
 * pointer.js — the plane moved by hand: a drag pans it, the wheel zooms it
 * about the pointer.
 *
 * Both go through the panel's own rows — `cx`, `cy`, `zoom` — so the rows
 * move with the picture and what is saved is what the panel says. A drag
 * keeps the point it took hold of under the pointer; a wheel keeps the
 * point under the pointer where it is and brings the rest in or out round
 * it (fractal.js `zoomAbout`). The zoom stays within its row's bounds, and
 * the centre follows the zoom it really got, so nothing drifts at a bound.
 *
 * With copies (copies.js) there is no plane: they are fitted to the
 * picture, and the wheel sizes them about its centre; a drag does nothing.
 */

import { planeAt, zoomAbout } from './fractal.js';

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {object} opts.params   the app's Params
 */
export function wirePointer({ canvas, params }) {
  let drag = null;

  /** A pointer's place in the picture's own pixels, and the picture's size. */
  const at = ev => {
    const rect = canvas.getBoundingClientRect();
    const w = params.get('width'), h = params.get('height');
    return { px: ((ev.clientX - rect.left) / rect.width) * w, py: ((ev.clientY - rect.top) / rect.height) * h, w, h };
  };

  const copies = () => params.get('family') === 'copies';

  canvas.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || copies()) return;
    const p = at(ev);
    drag = { from: p, view: params.values };
    canvas.setPointerCapture(ev.pointerId);
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('pointermove', ev => {
    if (!drag) return;
    const p = at(ev);
    const [x0, y0] = planeAt(drag.view, p.w, p.h, drag.from.px, drag.from.py);
    const [x1, y1] = planeAt(drag.view, p.w, p.h, p.px, p.py);
    params.set({ cx: drag.view.cx - (x1 - x0), cy: drag.view.cy - (y1 - y0) });
  });

  const drop = () => { drag = null; canvas.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);

  canvas.addEventListener('wheel', ev => {
    ev.preventDefault();
    if (copies()) {
      // Copies are fitted to the picture: the wheel sizes them about its centre.
      const spec = params.spec('size');
      params.set('size', Math.min(spec.max, Math.max(spec.min, params.get('size') * Math.exp(-ev.deltaY * 0.0015))));
      return;
    }
    const p = at(ev);
    const v = params.values;
    const spec = params.spec('zoom');
    const want = v.zoom * Math.exp(-ev.deltaY * 0.0015);
    const factor = Math.min(spec.max, Math.max(spec.min, want)) / v.zoom;
    if (factor === 1) return;
    params.set(zoomAbout(v, p.w, p.h, p.px, p.py, factor));
  }, { passive: false });
}
