/**
 * guides.js — the viewer's guides as numbers (S8, 2026-11-03; docs/scene.md):
 * where they are on the picture, the size they were laid on, the magnet that
 * pulls a drag to them, and what an app lets F place.
 *
 * In the picture's own pixels — the size the bar is told (core/Bar.js
 * `output`, its scale taken out), bleed included: 0 at its top left, its
 * width and height at its far edges. A set of guides belongs to the size it
 * was laid on, as the bench found (a gabarit is a format and its guides): on
 * another size they are not shown, and can be laid on it again, in % or in
 * px. Kept per app in this browser, a few sizes each, until the gabarit is an
 * object of the vault — its type waits on the author (docs/plan.md, S8).
 *
 * The magnet: a guide dragged, or a thing an app lets be placed, is pulled to
 * the picture's edges, its centre and the guides, from 8 screen pixels; Ctrl
 * held, nothing pulls. F puts the selection at the picture's centre, held, at
 * an edge or a corner (core/shell/bindings.js).
 *
 * No DOM at import. core/shell/rulers.js draws all of it; an app asks this
 * only for the magnet and the placing — particles' handles (apps/particles/).
 */

const SIZES = 12;            // sizes remembered per app
const NEAR = 8;              // screen pixels the magnet pulls from

const ears = { change: new Set(), say: new Set() };
const s = {
  app: '',
  doc: null,                 // { w, h }: the picture, in its own pixels; null while there is none
  z: 1,                      // screen pixels per picture pixel, as the rulers last measured
  rulers: true,              // the rulers, and the guides with them
  magnet: true,
  sizes: [],                 // [{ w, h, guides: [{ axis: 'x' | 'y', px }] }], the latest first
  lines: [],                 // what the magnet pulls to, while it pulls: [{ axis, at }]
  items: new Map(),          // what F places: id → { id, label, put(x, y) }
  sel: null,                 // the one chosen, by a press on it
};
let quiet = 0;

const changed = () => { for (const fn of ears.change) fn(); };
const say = text => { for (const fn of ears.say) fn(text); };

/** Hear it: 'change' when anything drawn moves, 'say' for a line worth the status bar. */
export function on(what, fn) { ears[what].add(fn); return () => ears[what].delete(fn); }

/** Read only. */
export const state = () => s;

// ── Kept in this browser ─────────────────────────────────────────────────────

const store = () => { try { return window.localStorage; } catch { return null; } };
const keyOf = what => `skweeb/${what}/${s.app || 'page'}`;
const okGuide = g => g && (g.axis === 'x' || g.axis === 'y') && Number.isFinite(g.px);

function load() {
  const ls = store();
  if (!ls) return;
  try {
    const prefs = JSON.parse(ls.getItem(keyOf('viewer')) || '{}');
    if (typeof prefs.rulers === 'boolean') s.rulers = prefs.rulers;
    if (typeof prefs.magnet === 'boolean') s.magnet = prefs.magnet;
    const kept = JSON.parse(ls.getItem(keyOf('guides')) || '[]');
    s.sizes = (Array.isArray(kept) ? kept : [])
      .filter(r => r && r.w > 0 && r.h > 0 && Array.isArray(r.guides))
      .map(r => ({ w: r.w, h: r.h, guides: r.guides.filter(okGuide).map(g => ({ axis: g.axis, px: Math.round(g.px) })) }));
  } catch { s.sizes = []; }
}

function save() {
  const ls = store();
  if (!ls) return;
  try {
    ls.setItem(keyOf('viewer'), JSON.stringify({ rulers: s.rulers, magnet: s.magnet }));
    ls.setItem(keyOf('guides'), JSON.stringify(s.sizes.slice(0, SIZES)));
  } catch { /* a private window: kept for this page only */ }
}

/** The app whose guides these are: its own, kept apart from every other's. */
export function forApp(app) {
  if (s.app === app) return;
  s.app = app;
  load();
  changed();
}

/** The picture's size, in its own pixels — 0 for none. Said every paint: only a change is heard. */
export function setDoc(w, h) {
  const doc = w > 0 && h > 0 ? { w: Math.round(w), h: Math.round(h) } : null;
  if (doc ? s.doc && doc.w === s.doc.w && doc.h === s.doc.h : !s.doc) return;
  s.doc = doc;
  changed();
}

/** Screen pixels per picture pixel, from the rulers: how near the magnet pulls. */
export function setZoom(z) { if (z > 0) s.z = z; }

/** Rulers or magnet, on or off; remembered. */
export function toggle(what) {
  if (what !== 'rulers' && what !== 'magnet') return;
  s[what] = !s[what];
  save();
  changed();
  say(`${what === 'rulers' ? 'rulers and guides' : 'magnetism'} ${s[what] ? 'on' : 'off'}`);
}

// ── The guides of this size ──────────────────────────────────────────────────

const here = () => s.doc && s.sizes.find(r => r.w === s.doc.w && r.h === s.doc.h);

/** This size's guides, as they are shown: none with the rulers off. */
export function guides() {
  const r = here();
  return r && s.rulers ? r.guides : [];
}

/** Guides laid on another size, the latest, while this one has never had any: what can be laid again. */
export function elsewhere() {
  if (!s.doc || here()) return null;
  return s.sizes.find(r => r.guides.length) || null;
}

/** This size's set, made if it is new, and brought first. */
function record() {
  const r = here() || { w: s.doc.w, h: s.doc.h, guides: [] };
  s.sizes = [r, ...s.sizes.filter(x => x !== r)].slice(0, SIZES);
  return r;
}

/** A guide, `axis` 'x' upright, 'y' level, at `px`: its index. Kept at `commit`. */
export function add(axis, px) {
  if (!s.doc) return -1;
  const r = record();
  r.guides.push({ axis, px: Math.round(px) });
  changed();
  return r.guides.length - 1;
}

/** Guide `i` dragged to `t`, the magnet pulling it — to the other guides, not to itself. */
export function drag(i, t, free = false) {
  const r = here(), g = r && r.guides[i];
  if (!g) return;
  s.lines = [];
  g.px = Math.round(snapAxis(g.axis, t, { free, skip: g }));
  changed();
}

export function remove(i) {
  const r = here();
  if (!r || !r.guides[i]) return;
  r.guides.splice(i, 1);
  save();
  changed();
}

/** What a drag made, kept. */
export function commit() { s.lines = []; save(); changed(); }

/** This size without guides — and without the offer to lay another's again. */
export function clear() {
  if (!s.doc) return;
  const r = record(), n = r.guides.length;
  r.guides = [];
  save();
  changed();
  if (n) say(`${n} guide${n > 1 ? 's' : ''} cleared`);
}

/** Another size's guides laid on this one: scaled, 'pct', or pixel for pixel, 'px'. */
export function relay(how) {
  const from = elsewhere();
  if (!from) return;
  const r = record();
  r.guides = from.guides.map(g => {
    const [a, b] = g.axis === 'x' ? [from.w, s.doc.w] : [from.h, s.doc.h];
    return { axis: g.axis, px: how === 'pct' ? Math.round((g.px / a) * b) : g.px };
  });
  save();
  changed();
  say(`${r.guides.length} guides of ${from.w} × ${from.h}, laid ${how === 'pct' ? 'in %' : 'in px'}`);
}

// ── The magnet ───────────────────────────────────────────────────────────────

/** `t` on `axis`, pulled to the nearest edge, centre or guide within reach; Ctrl held (`free`), as it is. */
export function snapAxis(axis, t, { free = false, skip = null } = {}) {
  if (!s.magnet || free || !s.doc) return t;
  const L = axis === 'x' ? s.doc.w : s.doc.h, near = NEAR / s.z;
  let best = null;
  for (const at of [0, L / 2, L, ...guides().filter(g => g.axis === axis && g !== skip).map(g => g.px)]) {
    if (Math.abs(at - t) <= near && (best == null || Math.abs(at - t) < Math.abs(best - t))) best = at;
  }
  if (best == null) return t;
  s.lines.push({ axis, at: best });
  return best;
}

/** A point an app drags — a handle — pulled on both axes; the lines it was pulled to shown a moment. */
export function snapPoint(x, y, free = false) {
  s.lines = [];
  const out = [snapAxis('x', x, { free }), snapAxis('y', y, { free })];
  clearTimeout(quiet);
  changed();
  quiet = setTimeout(endSnap, 900);
  return out;
}

/** The drag over: its lines gone. */
export function endSnap() {
  clearTimeout(quiet);
  if (!s.lines.length) return;
  s.lines = [];
  changed();
}

// ── What F places ────────────────────────────────────────────────────────────

const ANCHORS = { c: [0.5, 0.5], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5], nw: [0, 0] };
export const WORDS = { c: 'the centre', n: 'the top', ne: 'the top right', e: 'the right', se: 'the bottom right',
  s: 'the bottom', sw: 'the bottom left', w: 'the left', nw: 'the top left' };

/**
 * What can be placed: `[{ id, label, put(x, y) }]`, `put` in the picture's
 * pixels from its top left. The first is placed until another is chosen.
 */
export function placeable(list) {
  for (const it of list) s.items.set(it.id, it);
}

/** Whether the page has anything to place: F is core's only then. */
export const hasPlaceable = () => s.items.size > 0;

/** The one a press chose: what F places. */
export function select(id) {
  if (!s.items.has(id) || s.sel === id) return;
  s.sel = id;
  changed();
}

/** The one chosen by a press, or null while none was. */
export const selected = () => s.sel;

/** The selection — or the first that can be placed — put at an anchor of the picture: 'c', 'n', 'ne'… */
export function place(anchor = 'c') {
  const it = s.items.get(s.sel) || s.items.values().next().value;
  const at = ANCHORS[anchor];
  if (!it || !at || !s.doc) return false;
  it.put(at[0] * s.doc.w, at[1] * s.doc.h);
  say(`${it.label} → ${WORDS[anchor]}`);
  return true;
}
