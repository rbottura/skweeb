/**
 * viewzoom.js — every app's viewer seen closer or farther (S14a, 2026-11-12;
 * the author's pick): the viewer's tools' zoom, as the bench has it — Fit, or
 * so many CSS pixels a picture pixel, 25 % to 200 % in its menu — Ctrl and the
 * wheel about the pointer, the middle button or Space held and a drag to move
 * it. No app loses its wheel or its drag: the 3D app's camera and fractals'
 * zoom keep the wheel alone, every handle keeps its press.
 *
 * An app lays its canvas by core/view.js `viewFactor`, every paint, and that
 * is where this is read (`lay`): at Fit the canvas fits its stage as it always
 * did, by CSS's max sizes; zoomed, it is sized in CSS pixels, moved off the
 * stage's middle by `x`, `y`, and drawn in as many canvas pixels as that shows
 * — never more than the picture's own scale, and closer than that, shown as
 * pixels. Every app's pointer reads its canvas's box, so a press lands where
 * it always did, and the rulers are told it moved (core/shell/guides.js).
 * A zoom asks the app to draw again — the redraw its Bar was given — while a
 * pan moves the canvas by CSS alone.
 *
 * A stage that zooms itself — the vault app's (core/zoom.js, `.zm`) — is left
 * to it. No DOM at import.
 */

import { moved } from './shell/guides.js';

const MIN = 0.02, MAX = 16;                  // CSS pixels a picture pixel: a fiftieth to sixteen
export const STEPS = [0.25, 0.5, 1, 2];      // the menu's, past Fit
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/** What a press on the stage leaves alone: the rulers, a guide's grip, a button. */
const theirs = t => t instanceof Element && !!t.closest('skw-rulers .rl, .gd-grip, .gd-away, button');

const views = new WeakMap();                 // stage → its zoom: { fit, z, x, y, laid, redraw }
const ears = new Set();                      // told when any zoom changes: the viewer's tools
let space = false, panned = false, over = null, replaying = false, wired = false;

/** The zoom of a stage, made the first time: at Fit. */
const viewOf = stage => {
  let v = views.get(stage);
  if (!v) views.set(stage, v = { fit: true, z: 1, x: 0, y: 0, laid: null, redraw: null });
  return v;
};

/** A stage the app lays through `viewFactor`, and what draws it again — its Bar's redraw (core/Bar.js). */
export function zoomable(stage, redraw) {
  if (!stage || stage.classList.contains('zm')) return;
  const v = viewOf(stage);
  if (redraw) v.redraw = redraw;
  wire();
  if (v.heard) return;
  v.heard = true;
  stage.addEventListener('wheel', e => wheel(stage, e), { capture: true, passive: false });
  stage.addEventListener('pointerdown', e => press(stage, e), { capture: true });
  // The middle button's own scrolling, never started over a viewer.
  stage.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); }, { capture: true });
}

/** A stage's zoom as its tools show it: at Fit, and how many CSS pixels a picture pixel — null before it was laid. */
export function zoomOf(stage) {
  const v = stage && views.get(stage);
  if (!v || !v.laid) return null;
  return { fit: v.fit, z: v.fit ? v.laid.fitCss : v.z };
}

/** Told when a zoom changes; gives back its own undoing. */
export function onZoom(fn) { ears.add(fn); return () => ears.delete(fn); }

/** Back to Fit. */
export function fit(stage) {
  const v = viewOf(stage);
  Object.assign(v, { fit: true, x: 0, y: 0 });
  changed(stage, true);
}

/** So many CSS pixels a picture pixel, the picture's middle on the stage's. */
export function zoomTo(stage, z) {
  const v = viewOf(stage);
  Object.assign(v, { fit: false, z: clamp(z, MIN, MAX), x: 0, y: 0 });
  changed(stage, true);
}

/**
 * The canvas laid for this paint (core/view.js): at Fit, null — CSS fits it, as before; zoomed, its CSS
 * size and place set, and the canvas pixels a picture pixel to draw in.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{width, height}} size        the picture, in its own pixels
 * @param {number} scale                the most it is ever drawn at
 * @param {number} fitCss               CSS pixels a picture pixel at Fit
 * @param {number} dpr
 * @returns {?number}
 */
export function lay(canvas, size, scale, fitCss, dpr) {
  const stage = canvas.parentElement, v = stage && views.get(stage);
  if (!v) return null;
  const was = v.laid;
  v.laid = { size, scale, fitCss, canvas };
  // Laid the first time, or its Fit another size — the stage resized, the picture another format: the tools told.
  if (!was || (v.fit && Math.abs(was.fitCss - fitCss) > 1e-4)) for (const fn of ears) fn(stage);
  if (v.fit) { unsize(canvas, stage); return null; }
  const k = Math.min(scale, Math.ceil(v.z * dpr * 20) / 20);
  size_(canvas, stage, size, v, v.z * dpr > k * 1.001);
  return k;
}

function unsize(canvas, stage) {
  if (!stage.classList.contains('vz')) return;
  stage.classList.remove('vz');
  canvas.classList.remove('zm-pixels');
  Object.assign(canvas.style, { width: '', height: '', maxWidth: '', maxHeight: '', transform: '', flex: '' });
}

function size_(canvas, stage, size, v, pixels) {
  stage.classList.add('vz');
  canvas.classList.toggle('zm-pixels', pixels);
  Object.assign(canvas.style, { width: `${size.width * v.z}px`, height: `${size.height * v.z}px`, maxWidth: 'none',
    maxHeight: 'none', transform: `translate(${v.x}px, ${v.y}px)`, flex: 'none' });
}

/** A zoom or a pan done: the canvas placed at once, what is over it told — and, for a zoom, the app's redraw. */
function changed(stage, redraw) {
  const v = viewOf(stage), laid = v.laid;
  if (laid && laid.canvas.isConnected) {
    if (v.fit) unsize(laid.canvas, stage);
    else size_(laid.canvas, stage, laid.size, v, laid.canvas.classList.contains('zm-pixels'));
  }
  if (redraw && v.redraw) v.redraw();
  moved();
  for (const fn of ears) fn(stage);
}

/** The middle of the room the canvas sits in, on the screen. */
function middle(stage) {
  const r = stage.getBoundingClientRect(), cs = getComputedStyle(stage);
  const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight), pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom);
  return [r.left + pl + (r.width - pl - pr) / 2, r.top + pt + (r.height - pt - pb) / 2];
}

/** Ctrl and the wheel: closer or farther about the pointer — the point under it staying there. */
function wheel(stage, e) {
  if (!(e.ctrlKey || e.metaKey)) return;
  const v = viewOf(stage);
  if (!v.laid) return;
  e.preventDefault();
  e.stopPropagation();
  const was = v.fit ? v.laid.fitCss : v.z;
  if (v.fit) { v.x = 0; v.y = 0; }
  const next = clamp(was * Math.exp(-e.deltaY * 0.0015), MIN, MAX);
  const [cx, cy] = middle(stage), px = e.clientX - cx, py = e.clientY - cy;
  v.x = px - (px - v.x) * (next / was);
  v.y = py - (py - v.y) * (next / was);
  v.fit = false;
  v.z = next;
  changed(stage, true);
}

/** The middle button, or Space held: the picture moved by a drag — nothing under it pressed. */
function press(stage, e) {
  if (!(e.button === 1 || (e.button === 0 && space)) || theirs(e.target)) return;
  const v = viewOf(stage);
  if (!v.laid) return;
  e.preventDefault();
  e.stopPropagation();
  if (v.fit) Object.assign(v, { fit: false, z: v.laid.fitCss, x: 0, y: 0 });
  const from = { x: e.clientX - v.x, y: e.clientY - v.y };
  panned = true;
  stage.classList.add('vz-held');
  try { stage.setPointerCapture(e.pointerId); } catch { /* a synthetic press: no capture, the drag all the same */ }
  const move = m => { if (m.pointerId !== e.pointerId) return; m.stopPropagation(); v.x = m.clientX - from.x; v.y = m.clientY - from.y; changed(stage, false); };
  const up = u => {
    if (u.pointerId !== e.pointerId) return;
    u.stopPropagation();
    stage.classList.remove('vz-held');
    stage.removeEventListener('pointermove', move, true);
    stage.removeEventListener('pointerup', up, true);
    stage.removeEventListener('pointercancel', up, true);
  };
  stage.addEventListener('pointermove', move, true);
  stage.addEventListener('pointerup', up, true);
  stage.addEventListener('pointercancel', up, true);
}

const typing = t => t instanceof Element && (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable);

/**
 * Space over a zoomable viewer: held, a drag moves the picture; tapped, what Space did in the app — its play —
 * given to it as it is let go, as the bench has it. Anywhere else, Space is the app's as it always was.
 */
function wire() {
  if (wired) return;
  wired = true;
  document.addEventListener('pointermove', e => {
    const s = e.target instanceof Element ? e.target.closest('.viewer-stage') : null;
    over = s && views.has(s) ? s : null;
  }, { passive: true, capture: true });
  window.addEventListener('keydown', e => {
    if (replaying || e.code !== 'Space' || typing(e.target) || !over || !over.isConnected || !views.get(over).laid) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat || space) return;
    space = true;
    panned = false;
    over.classList.add('vz-grab');
  }, true);
  window.addEventListener('keyup', e => {
    if (e.code !== 'Space' || !space) return;
    space = false;
    for (const s of document.querySelectorAll('.viewer-stage.vz-grab')) s.classList.remove('vz-grab');
    if (panned) return;
    replaying = true;
    try { document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true })); }
    finally { replaying = false; }
  }, true);
  window.addEventListener('blur', () => { space = false; });
}
