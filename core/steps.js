/**
 * steps.js — the session's steps (S6c, 2026-11-03; docs/scene.md): every
 * change of a page's params a step, held in memory, so going back costs
 * nothing — Ctrl Z back, Ctrl Y or Ctrl Shift Z on. The author's, on the
 * bench: an object's states saved, and "un historique de session … des
 * fonctions de ctrl Z et ctrl Y sans coûts supérieurs de traitement".
 *
 * A drag is one step however long: changes come together while they come
 * fast (BURST_MS), and the frame chain's answer to a typed width with them.
 * A recipe arriving — an object opened, a state gone back to — is where the
 * steps start from, not a step; a panel's Reset is one (`around`). A step is
 * a params' values before and after, given back through `restore`, so an
 * app hears it as it hears an object opened. A new change after going back
 * forgets the steps on. Never in a text field: a field undoes its typing.
 * A save ends the step being made: what came before it and what after are
 * two steps, however close.
 * What an app sets itself while it boots, before a hand has touched the
 * page, is where the steps start from too — not a step to go back over.
 *
 * ParamPanel watches every panel's params; core/Bar.js says each step. A
 * page that lists them — cluster's History (S9f) — reads `list()`, hears
 * `onSteps`, and goes to one with `go`.
 * No DOM at import.
 */

import { typing } from './Palette.js';

const BURST_MS = 450;          // closer than this, two changes are one step
const KEEP = 200;              // the steps held, the oldest let go first

const back = [], ahead = [];   // the steps behind, and those gone back over
const cur = new Map();         // params → its values after its latest change: a step's before, its after
const offs = new Map();        // params → what stops hearing it
const ears = new Set();
const lists = new Set();       // what hears the steps change: one taken, gone back over or on
let open = null;               // { params, before, at }: the step being made
let replaying = false;
let installed = false;
let touched = typeof window === 'undefined';   // a page counts its steps from the first touch; a test from the start
let clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const snap = params => params.values;          // a deep copy already (core/params.js)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const say = text => { for (const fn of ears) fn(text); };
const changed = () => { for (const fn of lists) fn(); };

/** Hear each step taken back or on, in words for the status bar. */
export function onStep(fn) { ears.add(fn); return () => ears.delete(fn); }

/** Hear the steps change — one begun, made, taken back or on: a page listing them paints again. */
export function onSteps(fn) { lists.add(fn); return () => lists.delete(fn); }

/** Every change of these params a step from here on. */
export function watch(params) {
  if (cur.has(params)) return;
  cur.set(params, snap(params));
  offs.set(params, params.on(() => heard(params)));
  installKeys();
}

/**
 * These params no more: their app unmounted (core/scope.js, S9). Their steps
 * go with them — a Ctrl Z in the next app never lays values into one gone.
 */
export function unwatch(params) {
  if (!cur.has(params)) return;
  if (open && open.params === params) open = null;
  offs.get(params)();
  offs.delete(params);
  cur.delete(params);
  for (const list of [back, ahead]) {
    for (let i = list.length - 1; i >= 0; i--) if (list[i].params === params) list.splice(i, 1);
  }
}

function heard(params) {
  if (replaying || params.following) return;      // a smart object held, at its new version: no step (L11)
  const values = snap(params);
  if (params.restoring || !touched) {          // a recipe arriving, or the app setting itself up: the steps start from it
    if (open && open.params === params) open = null;
    cur.set(params, values);
    return;
  }
  const now = clock();
  if (open && (open.params !== params || now - open.at > BURST_MS)) settle();
  const begun = !open;
  if (!open) { open = { params, before: cur.get(params) }; ahead.length = 0; }
  open.at = now;
  cur.set(params, values);
  if (begun) changed();
}

/** The step being made, made: what tests and going back start with. */
export function settle() {
  if (!open) return;
  const { params, before } = open;
  open = null;
  const after = cur.get(params);
  if (same(after, before)) return;
  back.push({ params, before, after });
  if (back.length > KEEP) back.shift();
  changed();
}

/** A change made at once, as one step — a panel's Reset, which arrives as a restore. */
export function around(params, fn) {
  settle();
  const before = snap(params);
  replaying = true;
  try { fn(); } finally { replaying = false; }
  const after = snap(params);
  cur.set(params, after);
  if (same(after, before)) return;
  back.push({ params, before, after });
  ahead.length = 0;
  changed();
}

function replay(params, values) {
  replaying = true;
  try { params.restore(values); } finally { replaying = false; }
  cur.set(params, snap(params));
}

/** A step back: true if there was one. */
export function undo() {
  settle();
  const st = back.pop();
  if (!st) { say('nothing to go back to'); return false; }
  replay(st.params, st.before);
  ahead.push(st);
  say(`a step back${back.length ? ` · ${back.length} more` : ''}`);
  changed();
  return true;
}

/** A step on again: true if there was one. */
export function redo() {
  settle();
  const st = ahead.pop();
  if (!st) { say('nothing to go on to'); return false; }
  replay(st.params, st.after);
  back.push(st);
  say(`a step on${ahead.length ? ` · ${ahead.length} more` : ''}`);
  changed();
  return true;
}

/** A value as a step's line says it: a number to three places, a word, a short list; anything else, as "…". */
const shortly = v => typeof v === 'number' ? String(Math.round(v * 1000) / 1000)
  : typeof v === 'string' ? (v.length > 16 ? v.slice(0, 15) + '…' : v)
  : typeof v === 'boolean' ? (v ? 'on' : 'off') : v == null ? '—' : '…';

/** What a step changed, in a line: the value and where it went, or how many. */
function described({ params, before = {}, after = {} }) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(k => !same(before[k], after[k]));
  if (keys.length !== 1) return `${keys.length} values${params.app ? ' · ' + params.app : ''}`;
  const spec = typeof params.spec === 'function' ? params.spec(keys[0]) : null;
  return `${(spec && spec.label) || keys[0]} ${shortly(before[keys[0]])} → ${shortly(after[keys[0]])}`;
}

/**
 * The steps as a page lists them, oldest first: what each changed, and whether it is taken or gone back over —
 * the one being made among those taken. `go(i)` is the page after the ith of them; `go(-1)`, before any.
 */
export function list() {
  const made = open ? [...back, { ...open, after: cur.get(open.params) }] : back;
  return [...made.map(st => ({ label: described(st), ahead: false })), ...[...ahead].reverse().map(st => ({ label: described(st), ahead: true }))];
}

/** The page as it was after step `i` of `list()` — every step up to it taken, none after; -1, before any. */
export function go(i) {
  settle();
  while (back.length > i + 1 && undo());
  while (back.length < i + 1 && ahead.length && redo());
}

/** The params of the page, as watched: what a state's recipe is laid back into (core/shell/graph.js). */
export const watched = () => [...cur.keys()];

/** A line for the status bar, from what changes the steps — a merge (core/shell/graph.js). */
export const tell = text => say(text);

/** How many steps there are each way. */
export const counts = () => ({ back: back.length + (open ? 1 : 0), ahead: ahead.length });

/** For tests: a clock of their own, and every step forgotten. */
export function forTests({ now = null } = {}) {
  if (now) clock = now;
  for (const off of offs.values()) off();
  back.length = 0; ahead.length = 0; cur.clear(); offs.clear(); open = null;
}

/** Ctrl Z, Ctrl Y and Ctrl Shift Z — by their letter, as every program has them. */
function installKeys() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const touch = () => { touched = true; };
  for (const t of ['pointerdown', 'keydown', 'input', 'change']) window.addEventListener(t, touch, { capture: true, passive: true });
  document.addEventListener('vault:saved', () => settle());       // a save ends a step (core/vault.js says it)
  window.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || typing(e.target)) return;
    const k = (e.key || '').toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
  });
}
