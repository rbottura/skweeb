/**
 * numbox.js — a number's box, as every number widget draws it (S2, S2b,
 * 2026-11-03; docs/scene.md): typed for an exact value, dragged sideways for
 * feel, a fill behind it where the value sits in its range, and its unit
 * inside it. The slider beside it is widgets.js's; where a row shows it is
 * ParamPanel's.
 */

import { places } from './params.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/**
 * A number, on one line: typed for an exact value, dragged sideways for
 * feel — the slider is a second line only where it is wanted (ParamPanel).
 * A number the param refuses or clamps to what it already was changes
 * nothing, so nothing syncs the box — it puts the real value back itself, or
 * it would go on showing -50 against a width of 1.
 *
 * The wheel scrolls the panel, never the value under it: Chrome steps a
 * focused number box by the wheel, so a box clicked once and then scrolled
 * over moved (the author, 2026-11-15). The wheel takes the focus away first —
 * what was typed is kept, as a click elsewhere keeps it — and scrolls on.
 */
export function numberBox(spec, value, set, current) {
  const box = el('input', 'pp-num');
  box.type = 'number';
  const least = spec.hardMin !== undefined ? spec.hardMin : spec.min, most = spec.hardMax !== undefined ? spec.hardMax : spec.max;
  if (least != null) box.min = least;      // the schema's limits: two ends set by hand (S15g) are the drag's, not these
  if (most != null) box.max = most;
  box.step = spec.step ?? 1;
  box.value = short(value, spec);
  box.addEventListener('change', () => {
    const v = parseFloat(box.value);
    if (!Number.isFinite(v) || !set(v)) box.value = short(current(), spec);
  });
  box.addEventListener('wheel', () => { if (document.activeElement === box) box.blur(); }, { passive: true });
  scrubbable(box, spec, set, current);
  paintFill(box, spec, value);
  return box;
}

/**
 * A number as its box shows it, short (the author, 2026-11-15: "des valeurs
 * avec des floats … qui devraient être trunc plus court"): to its step's
 * decimals — a step of 0.05, two — or, with no step, four digits that count
 * and never fewer than its whole part: 0.7436, 12.35, 1235; a tiny one in
 * four digits, 1.234e-7. The value kept is every digit: only the box is short.
 */
export function short(v, spec = {}) {
  if (typeof v !== 'number' || !Number.isFinite(v) || Number.isInteger(v)) return String(v);
  const d = typeof spec.step === 'number' && spec.step > 0 ? places(spec.step) : 3 - Math.floor(Math.log10(Math.abs(v)));
  return String(d > 6 ? Number(v.toPrecision(4)) : Number(v.toFixed(Math.max(0, d))));
}

/** Where a value sits in its range, a fill behind its box: from the left, or from zero when the range holds it. */
export function paintFill(box, spec, v) {
  if (typeof spec.min !== 'number' || typeof spec.max !== 'number' || !(spec.max > spec.min)) return;
  const log = !!spec.log && spec.min > 0, at = x => (log ? Math.log10(x) : x);
  const lo = at(spec.min), hi = at(spec.max), q = Math.min(1, Math.max(0, (at(v) - lo) / (hi - lo)));
  let a = 0, b = q;
  if (!log && spec.min < 0 && spec.max > 0) { const z = -lo / (hi - lo); a = Math.min(z, q); b = Math.max(z, q); }
  box.style.setProperty('--fa', (a * 100).toFixed(2) + '%');
  box.style.setProperty('--fb', (b * 100).toFixed(2) + '%');
}

/**
 * The box scrubs: dragged sideways it moves the value — Shift ten times
 * faster, Ctrl ten times finer — and a click without a drag still types. A
 * log range scrubs on the logarithm, as its slider runs. Four hundred pixels
 * cross its range, whatever its step: the param snaps to the step itself, so
 * a step is never more than the hand moves (2026-11-06 — a pixel was a whole
 * step, a count of five crossed in five pixels, and `step: 'any'` was NaN).
 */
function scrubbable(box, spec, set, current) {
  let st = null, log = false, per = 0;
  box.addEventListener('pointerdown', e => {
    if (e.button !== 0 || document.activeElement === box) return;      // typing: the caret is the box's
    // Its span read at each drag: two ends set by hand since the box was made are the hand's now (S15g).
    log = !!spec.log && spec.min > 0;
    const lo = spec.min ?? 0, hi = spec.max ?? lo + 100;
    per = spec.drag ?? (log ? Math.log10(hi) - Math.log10(lo) : hi - lo) / 400;
    st = { x: e.clientX, last: e.clientX, v0: current(), acc: 0, moved: false, id: e.pointerId };
  });
  box.addEventListener('pointermove', e => {
    if (!st) return;
    if (!st.moved) {
      if (Math.abs(e.clientX - st.x) < 3) return;
      st.moved = true; st.last = e.clientX;
      try { box.setPointerCapture(st.id); } catch { /* the pointer is gone already */ }
      document.body.classList.add('pp-scrubbing');
    }
    e.preventDefault();
    st.acc += (e.clientX - st.last) * per * (e.shiftKey ? 10 : 1) * (e.ctrlKey || e.metaKey ? 0.1 : 1);
    st.last = e.clientX;
    set(log ? 10 ** (Math.log10(st.v0) + st.acc) : st.v0 + st.acc);
  });
  const stop = () => {
    if (!st) return;
    const moved = st.moved;
    st = null;
    document.body.classList.remove('pp-scrubbing');
    if (moved) box.blur();
  };
  box.addEventListener('pointerup', stop);
  box.addEventListener('pointercancel', stop);
}

/** A number's box with its unit inside, at its right — the schema's `unit` (S2b): `px`, `°`, `s`. */
export function boxed(box, unit) {
  const wrap = el('span', 'pp-numbox');
  wrap.style.setProperty('--pp-unit', String([...unit].length));
  wrap.append(box, el('span', 'pp-unit', unit));
  return wrap;
}
