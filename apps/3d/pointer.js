/**
 * pointer.js — the view moved by hand: a drag turns round the model, a drag
 * with shift or the right button slides it, the wheel comes nearer — and a
 * click, a press that never moved, picks what it lands on (pick.js).
 *
 * All three moves go through the panel's own rows — `yaw`, `pitch`,
 * `distance`, and the point looked at — so the rows move with the picture and
 * what is saved is what the panel says (camera.js). A drag is measured from
 * where it started, not summed move by move, so a slow drag and a fast one
 * end where the pointer does. It starts only past SLOP pixels: a click
 * shaken by a hand does not turn the model a degree before it picks.
 */

import { orbit, pan, dolly } from './camera.js';
import { onPicture } from './pick.js';

/** How far a press may wander, in CSS pixels, and still be a click. */
export const SLOP = 4;

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {object} opts.params   the app's Params
 * @param {(at: number[], ev: PointerEvent) => void} [opts.onClick]
 *        a left click, at its point on the picture: -1 to 1 each way, y up
 */
export function wirePointer({ canvas, params, onClick = () => {} }) {
  let drag = null;

  canvas.addEventListener('contextmenu', ev => ev.preventDefault());

  canvas.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 && ev.button !== 2 && ev.button !== 1) return;
    const sliding = ev.button !== 0 || ev.shiftKey;
    drag = { x: ev.clientX, y: ev.clientY, view: params.values, sliding, button: ev.button, moved: false };
    canvas.setPointerCapture(ev.pointerId);
    canvas.classList.add(sliding ? 'sliding' : 'turning');
    ev.preventDefault();
  });

  canvas.addEventListener('pointermove', ev => {
    if (!drag) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < SLOP) return;
    drag.moved = true;
    const h = canvas.getBoundingClientRect().height;
    params.set(drag.sliding ? pan(drag.view, dx, dy, h) : orbit(drag.view, dx, dy, h));
  });

  const drop = () => {
    drag = null;
    canvas.classList.remove('turning', 'sliding');
  };
  canvas.addEventListener('pointerup', ev => {
    const click = drag && !drag.moved && drag.button === 0;
    drop();
    if (click) onClick(onPicture(ev.clientX, ev.clientY, canvas.getBoundingClientRect()), ev);
  });
  canvas.addEventListener('pointercancel', drop);

  canvas.addEventListener('wheel', ev => {
    ev.preventDefault();
    params.set(dolly(params.values, Math.exp(ev.deltaY * 0.0015)));
  }, { passive: false });
}
