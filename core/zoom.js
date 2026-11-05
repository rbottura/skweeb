/**
 * zoom.js — a picture in the viewer, seen closer (S9h, the vault app's
 * first; the author, 2026-11-05: "aucun outil de navigation du viewer pan
 * et zoom"). The wheel zooms about the pointer, a drag moves the picture, a
 * double click fits it again.
 *
 * At 1 the picture fits the stage's room — inside its padding: the rulers'
 * bands and an even margin round it (theme.css). Farther, it is drawn in no
 * more canvas pixels than the screen shows; closer than its own pixels, in
 * its own and no more — shown as pixels, never smoothed, never bigger in
 * memory than it is. What is drawn over it, the rulers and the guides, is
 * told it moved (core/shell/guides.js `moved`); the app says so as it lays
 * the canvas, since only a change of its size is heard otherwise.
 *
 * No DOM at import.
 */

import { moved } from './shell/guides.js';

const MIN = 0.1, MAX = 64;            // the fit's tenth, to sixty-four times it
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/** What a press on the stage leaves alone: the rulers, a guide's grip, a button. */
const theirs = t => t instanceof Element && !!t.closest('skw-rulers .rl, .gd-grip, .gd-away, button');

/**
 * @param {HTMLElement} stage                      the viewer's stage, the picture's canvas in it
 * @param {object} o
 * @param {(target, type, fn, opts?) => void} o.listen   the app's scope's (core/scope.js): let go of at its unmount
 * @param {() => void} o.redraw                    the picture laid and drawn again
 * @returns {{ lay: (w: number, h: number) => object, fit: () => void, readonly zoom: number, moved: () => void }}
 */
export function closer(stage, { listen, redraw }) {
  let z = 1, x = 0, y = 0;            // the zoom, 1 the fit; the picture's centre off the room's, in CSS px
  let held = null;                    // { id, dx, dy }: a drag under way
  stage.classList.add('zm');

  /** The room the picture fits in: the stage inside its padding — its size, and its centre in the stage. */
  const room = () => {
    const cs = getComputedStyle(stage), pl = parseFloat(cs.paddingLeft), pt = parseFloat(cs.paddingTop);
    const w = stage.clientWidth - pl - parseFloat(cs.paddingRight), h = stage.clientHeight - pt - parseFloat(cs.paddingBottom);
    return { w: Math.max(1, w), h: Math.max(1, h), cx: pl + w / 2, cy: pt + h / 2 };
  };

  listen(stage, 'wheel', e => {
    e.preventDefault();
    const r = stage.getBoundingClientRect(), m = room();
    const px = e.clientX - r.left - m.cx, py = e.clientY - r.top - m.cy;     // the pointer, off the room's centre
    const next = clamp(z * Math.exp(-e.deltaY * 0.0015), MIN, MAX);
    x = px - (px - x) * (next / z);                                          // the point under the pointer stays under it
    y = py - (py - y) * (next / z);
    z = next;
    redraw();
  }, { passive: false });
  listen(stage, 'pointerdown', e => {
    if (e.button !== 0 || theirs(e.target)) return;
    held = { id: e.pointerId, dx: e.clientX - x, dy: e.clientY - y };
    try { stage.setPointerCapture(e.pointerId); } catch { /* a synthetic press: no capture, the drag all the same */ }
    stage.classList.add('zm-held');
  });
  listen(stage, 'pointermove', e => {
    if (!held || e.pointerId !== held.id) return;
    x = e.clientX - held.dx;
    y = e.clientY - held.dy;
    redraw();
  });
  const end = e => { if (held && e.pointerId === held.id) { held = null; stage.classList.remove('zm-held'); } };
  listen(stage, 'pointerup', end);
  listen(stage, 'pointercancel', end);
  listen(stage, 'dblclick', e => { if (!theirs(e.target)) fit(); });

  function fit() { z = 1; x = 0; y = 0; redraw(); }

  /**
   * Where a picture of `w` × `h` of its own pixels is laid now: its size on screen in CSS px, where its centre
   * sits off the room's, how many canvas pixels it is drawn in for each of its own (`k`, never more than one),
   * and whether it is shown closer than its own pixels — as pixels, then.
   */
  function lay(w, h) {
    const m = room(), dpr = (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1;
    const css = Math.min(m.w / w, m.h / h) * z;                              // CSS px for one of the picture's
    return { width: w * css, height: h * css, x, y, k: Math.min(1, css * dpr), pixels: css * dpr > 1.001, zoom: z, scale: css * dpr };
  }

  return { lay, fit, get zoom() { return z; }, moved };
}
