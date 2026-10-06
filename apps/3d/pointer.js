/**
 * pointer.js — the view moved by hand: a drag turns round the model, a drag
 * with shift or the right button slides it, the wheel comes nearer.
 *
 * All three go through the panel's own rows — `yaw`, `pitch`, `distance`,
 * and the point looked at — so the rows move with the picture and what is
 * saved is what the panel says (camera.js). A drag is measured from where
 * it started, not summed move by move, so a slow drag and a fast one end
 * where the pointer does.
 */

import { orbit, pan, dolly } from './camera.js';

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {object} opts.params   the app's Params
 */
export function wirePointer({ canvas, params }) {
  let drag = null;

  canvas.addEventListener('contextmenu', ev => ev.preventDefault());

  canvas.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 && ev.button !== 2 && ev.button !== 1) return;
    const sliding = ev.button !== 0 || ev.shiftKey;
    drag = { x: ev.clientX, y: ev.clientY, view: params.values, sliding };
    canvas.setPointerCapture(ev.pointerId);
    canvas.classList.add(sliding ? 'sliding' : 'turning');
    ev.preventDefault();
  });

  canvas.addEventListener('pointermove', ev => {
    if (!drag) return;
    const h = canvas.getBoundingClientRect().height;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    params.set(drag.sliding ? pan(drag.view, dx, dy, h) : orbit(drag.view, dx, dy, h));
  });

  const drop = () => {
    drag = null;
    canvas.classList.remove('turning', 'sliding');
  };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);

  canvas.addEventListener('wheel', ev => {
    ev.preventDefault();
    params.set(dolly(params.values, Math.exp(ev.deltaY * 0.0015)));
  }, { passive: false });
}
