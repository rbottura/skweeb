/**
 * keys.js — the left hand (S5b, 2026-11-03; docs/scene.md): keys by their
 * place on the keyboard, not their letter — `event.code` — so the fingers
 * resting on A Z E R of an AZERTY are on Q W E R of a QWERTY, and Q and D
 * under them step frames either way. A key tapped does its first act; held,
 * it opens its pie at the pointer (core/shell/pie.js): the pointer aims, the
 * key let go takes what it aims at — or a digit, or Escape for nothing.
 *
 * What the keys do is core/shell/bindings.js's, and an app's: `bind` a code.
 * An app that means something else by a key keeps it — `own('KeyR')`, the
 * rig's rest — and core leaves it alone. Never in a field, never with Ctrl,
 * Alt or the Meta key: those are the browser's and the app's.
 *
 * A key the checks press has no code; its letter is read as an AZERTY's.
 * No DOM at import.
 */

import { typing } from './Palette.js';

const HOLD_MS = 180;          // longer than a tap, shorter than a wait: the bench's 164, a little more

/** code → { label, tap(e), pie?() → { title, items: [{ label, run, on? }] }, when?() } */
const bindings = new Map();
const owned = new Set();
const AZERTY = { a: 'KeyQ', z: 'KeyW', e: 'KeyE', r: 'KeyR', q: 'KeyA', s: 'KeyS', d: 'KeyD', f: 'KeyF',
  g: 'KeyG', h: 'KeyH', x: 'KeyX', w: 'KeyZ' };
const codeOf = e => e.code || AZERTY[(e.key || '').toLowerCase()] || '';

let installed = false;
let held = null;              // { code, b, timer, pie } while a bound key is down
let pointer = null;           // where the pointer last was: a pie opens there

/** What a key does: a tap, and a pie to hold — `when` false, the key is not core's this moment. */
export function bind(code, spec) { bindings.set(code, spec); }

/** Keys an app keeps for itself: core never acts on them in its page. */
export function own(...codes) { for (const c of codes) owned.add(c); }

/** The bindings that answer now, for a page that lists them: [{ code, label, short, pie }]. */
export const bound = () => [...bindings].filter(([c, b]) => !owned.has(c) && (!b.when || b.when()))
  .map(([code, b]) => ({ code, label: b.label, short: b.short || b.label, pie: !!b.pie }));

/** The letter a code is on an AZERTY — the author's keyboard. */
export const letterOf = code => Object.keys(AZERTY).find(k => AZERTY[k] === code)?.toUpperCase() || code.replace(/^Key/, '');

/** Once a page, by core/Bar.js. */
export function installKeys() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('pointermove', e => {
    pointer = { x: e.clientX, y: e.clientY };
    if (held && held.pie) held.pie.aim(e.clientX, e.clientY);
  }, { passive: true });
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => drop());
}

function down(e) {
  if (held && held.pie) {                        // a pie open: a digit takes, Escape lets go of it
    const n = /^Digit[1-9]$/.test(e.code) ? +e.code.slice(5) : /^[1-9]$/.test(e.key) ? +e.key : 0;
    if (n || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      const pie = held.pie;
      drop();
      if (n) pie.take(n - 1);
      return;
    }
  }
  if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
  const code = codeOf(e), b = bindings.get(code);
  if (!b || owned.has(code) || (b.when && !b.when())) return;
  e.preventDefault();
  if (e.repeat || held) return;
  if (!b.pie) { b.tap(e); return; }               // nothing to hold: the tap, at once
  held = { code, b, shift: e.shiftKey, timer: setTimeout(() => open(held), HOLD_MS), pie: null };
}

function up(e) {
  if (!held || codeOf(e) !== held.code) return;
  const h = held;
  drop(false);
  if (h.pie) { const it = h.pie.aimed(); h.pie.remove(); if (it) it.run(); }
  else h.b.tap({ shiftKey: h.shift });
}

/** The pie of the key held, where the pointer is. */
async function open(h) {
  if (!h || held !== h) return;
  const spec = h.b.pie();
  if (!spec || !spec.items.length) return;
  await import('./shell/pie.js');
  if (held !== h) return;                          // let go while it loaded: a tap after all
  const pie = document.createElement('skw-pie');
  const at = pointer || { x: innerWidth / 2, y: innerHeight / 2 };
  Object.assign(pie, { x: at.x, y: at.y, title: spec.title, items: spec.items });
  document.body.append(pie);
  h.pie = pie;
}

/** Nothing held: its timer stopped, its pie gone — unless kept, to be taken. */
function drop(remove = true) {
  if (!held) return;
  clearTimeout(held.timer);
  if (remove && held.pie) held.pie.remove();
  held = null;
}
