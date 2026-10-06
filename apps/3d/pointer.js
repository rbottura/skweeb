/**
 * pointer.js — the view moved by hand: a drag turns round the model, a drag
 * with shift or the right button slides it, the wheel comes nearer — and a
 * click, a press that never moved, picks what it lands on (pick.js). The
 * chosen shape's handles (handles.js) are asked first: a press on one is
 * theirs, and the drag moves the shape instead of the view.
 *
 * All three moves of the view go through the panel's own rows — `yaw`,
 * `pitch`, `distance`, and the point looked at — so the rows move with the
 * picture and what is saved is what the panel says (camera.js). A drag is
 * measured from where it started, not summed move by move, so a slow drag
 * and a fast one end where the pointer does. It starts only past SLOP
 * pixels: a click shaken by a hand does not turn the model a degree before
 * it picks.
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
 * @param {import('./handles.js').Handles} [opts.handles]   asked first, at the same points
 */
export function wirePointer({ canvas, params, onClick = () => {}, handles = null }) {
  let drag = null;
  const at = ev => onPicture(ev.clientX, ev.clientY, canvas.getBoundingClientRect());
  const lit = () => canvas.classList.toggle('on-handle', !!handles && handles.lit);

  canvas.addEventListener('contextmenu', ev => ev.preventDefault());

  canvas.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 && ev.button !== 2 && ev.button !== 1) return;
    canvas.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    if (ev.button === 0 && handles && handles.press(at(ev))) {
      drag = { handle: true };
      lit();
      return;
    }
    const sliding = ev.button !== 0 || ev.shiftKey;
    drag = { x: ev.clientX, y: ev.clientY, view: params.values, sliding, button: ev.button, moved: false };
    canvas.classList.add(sliding ? 'sliding' : 'turning');
  });

  canvas.addEventListener('pointermove', ev => {
    if (!drag) {
      if (handles) { handles.hover(at(ev)); lit(); }
      return;
    }
    if (drag.handle) return handles.drag(at(ev));
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < SLOP) return;
    drag.moved = true;
    const h = canvas.getBoundingClientRect().height;
    params.set(drag.sliding ? pan(drag.view, dx, dy, h) : orbit(drag.view, dx, dy, h));
  });

  const drop = () => {
    if (drag && drag.handle) handles.release();
    drag = null;
    canvas.classList.remove('turning', 'sliding');
    lit();
  };
  canvas.addEventListener('pointerup', ev => {
    const click = drag && !drag.handle && !drag.moved && drag.button === 0;
    drop();
    if (click) onClick(at(ev), ev);
  });
  canvas.addEventListener('pointercancel', drop);
  canvas.addEventListener('pointerleave', () => {
    if (drag || !handles) return;
    handles.leave();
    lit();
  });

  canvas.addEventListener('wheel', ev => {
    ev.preventDefault();
    params.set(dolly(params.values, Math.exp(ev.deltaY * 0.0015)));
  }, { passive: false });
}
