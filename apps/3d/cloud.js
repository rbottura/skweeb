/**
 * cloud.js — a cloud of dots, placed once: particles' emitter in the 3D app
 * (2026-11-11, the author's ask for BEC 2027, docs/plan.md `3d/cloud`): "utiliser
 * cette forme émettrice également dans le contexte 3d mais pour générer des
 * cercles ou des sphères à l'apparence 2d mais dans un espace 3D … on crée une
 * fois les objets dans l'espace", "tout en gardant le paramètre de seed pour
 * changer de génération de placement random, de couleurs random". A shape of
 * the catalogue (shapes.js), as BEC's grid is.
 *
 * `count` dots, each born on its emitter — a vault object's ink, as particles'
 * object emitter has it (core/points.js), or a disc, a ring, a square, a line,
 * a ball, a sphere's surface — each a sphere of its own size and colour. Drawn
 * as one InstancedMesh (scene.js): one sphere's geometry, a matrix and a colour
 * for each dot, so thousands draw at once and the model's look is theirs — a
 * cloud starts *unlit*, its palette's colours exactly, circles in space.
 *
 * ── Draws ──────────────────────────────────────────────────────────────────
 *
 * Every dot draws from a generator of its own — the seed and its index — so
 * dot k is where it was whatever the count, and more dots add to the cloud
 * without moving it. Two seeds, as the grid has: `seed` where the dots are and
 * how big (R), `hues` their colours alone (C). A dot's draws are made in a
 * fixed order — spot, spot, spot, depth, size, scatter, scatter, scatter — and
 * a new one only ever goes at the end, so a saved cloud draws the same after
 * this file has grown.
 *
 * ── Where ──────────────────────────────────────────────────────────────────
 *
 * In the shape's own space, y up, its middle at 0: a flat emitter — the
 * object, a disc, a ring, a square, a line — lies in x and y, facing the eye
 * as the model opens, `depth` deep along z; a ball and a shell are round in
 * all three. An object's points come beside the values (emitters.js), its
 * longer side `extent` long, a picture's sample jittered within its cell; until
 * they come — none named, still loading, or no vault — it is a disc.
 *
 * The cloud's place is a shape's (shapes.js PLACE), but a dot stays round: a
 * stretch moves the dots, never shapes one (scene.js `placeDots`). A stack of
 * modifiers moves the dots too — a twist, a bend, a push by noise, a mirror, a
 * row — the shape's stack on its dots rather than on one sphere; subdivide
 * has nothing to cut.
 *
 * Only three.core.js: Node runs it (tests/3d-cloud.mjs).
 */

import { SphereGeometry, BufferGeometry, Float32BufferAttribute, Color } from '../../core/libs/three/three.core.js';
import { makeRng } from '../../core/rng.js';
import { PALETTES } from './bec-palettes.js';
import { deform, twist, bend, displace } from './deform.js';
import { mirror, array } from './repeat.js';

/** More dots than this from a stack — a mirror, a row — is cut short, the same way every time. */
export const MAX_DOTS = 60000;

/** Where a dot is born: the flat ones lie in x and y, `depth` deep; the round ones are round all three ways. */
export const EMITTERS = ['ball', 'shell', 'disc', 'ring', 'square', 'line', 'object'];
const FLAT = ['disc', 'ring', 'square', 'line', 'object'];
const EMITTER_LABELS = { ball: 'a ball', shell: 'a sphere\'s surface', disc: 'a disc', ring: 'a ring', square: 'a square',
  line: 'a line', object: 'an object of the vault' };

/** How a dot's colour is dealt: at random, or in the palette's order along an axis, or out from the middle. */
export const DEALS = ['random', 'x', 'y', 'z', 'out'];
const DEAL_LABELS = { random: 'at random', x: 'along x', y: 'up y', z: 'along z', out: 'out from the middle' };

const form = 'form', look = 'look';
const world = (label, d, min = 0.001) => ({ type: 'range', min, max: 50, step: 'any', log: true, default: d, label, group: form });

/** The cloud's own rows, in its card's Form and Look; its place is every shape's (shapes.js). */
export const CLOUD_PARAMS = {
  emitter: { type: 'enum', options: EMITTERS, labels: EMITTER_LABELS, default: 'ball', label: 'emitter', group: form },
  /** An object's dots, or where it has ink (core/points.js): the link `ckt → particles: an emitter`, in 3D. */
  from: { type: 'object', accepts: ['dataset', 'shape', 'still'], label: 'emitter object', group: form, when: { emitter: 'object' } },
  glyph: { type: 'int', min: 0, max: 999, default: 0, label: 'glyph, of a dot-set', group: form, when: { emitter: 'object' } },
  extent: world('its size — a side, a radius, a length', 1.2, 0.01),
  depth: { type: 'range', min: 0, max: 50, step: 'any', default: 0.3, label: 'depth, along z', group: form, when: { emitter: FLAT } },
  count: { type: 'int', min: 1, max: 20000, default: 600, label: 'dots', group: form },
  seed: { type: 'int', min: 0, max: 999999, default: 1, label: 'where they are (R)', group: form },
  scatter: { type: 'range', min: 0, max: 20, step: 'any', default: 0, label: 'scattered round their place', group: form },
  sizeMin: { ...world('radius from', 0.025), pair: 'sizeMax', pairLabel: 'radius from, to', axis: '↓' },
  sizeMax: { ...world('radius to', 0.06), axis: '↑' },
  /** 1 even; more, more small dots — a size is from + (to − from) × u^this. */
  sizeBias: { type: 'range', min: 0.25, max: 4, step: 'any', log: true, default: 1, label: 'small ones, 1 even — more, more of them', group: form },
  segments: { type: 'int', min: 6, max: 64, default: 16, label: 'segments round a dot', group: form },
  palette: { type: 'enum', options: Object.keys(PALETTES), default: 'bec', display: 'chips', label: 'palette', group: look },
  /** One of the vault's palettes in place of BEC's three (V1; palettes.js). */
  colours: { type: 'object', accepts: ['palette'], label: 'a palette of the vault', group: look },
  hues: { type: 'int', min: 0, max: 999999, default: 1, label: 'colours dealt (C)', group: look },
  deal: { type: 'enum', options: DEALS, labels: DEAL_LABELS, default: 'random', label: 'colours', group: look },
  /** How far a dot's colour strays from its band, at random: 0 the bands, 1 nearly at random. */
  mix: { type: 'range', min: 0, max: 1, step: 0.01, default: 0.25, label: 'mixed across the bands', group: look, when: { deal: { not: 'random' } } },
};

/** One dot's geometry, a sphere of radius 1 — each dot an instance of it, at its own size. */
export const dotGeometry = segments => new SphereGeometry(1, segments, Math.max(3, Math.round(segments / 2)));

/** A point on a sphere's surface from two draws, evenly: [x, y, z], one long. */
const onSphere = (u, v) => {
  const phi = u * Math.PI * 2, cos = v * 2 - 1, sin = Math.sqrt(Math.max(0, 1 - cos * cos));
  return [Math.cos(phi) * sin, cos, Math.sin(phi) * sin];
};

/**
 * Where on its emitter a dot is born, from its draws `u`, and the way it faces — what a push by noise moves
 * it along: out of the plane for a flat emitter, out from the middle for a round one.
 */
export function spotOf(v, points, u) {
  const e = v.extent, d = (u[3] - 0.5) * (v.depth || 0);
  const kind = v.emitter === 'object' && !(points && points.list && points.list.length) ? 'disc' : v.emitter;
  if (kind === 'ball' || kind === 'shell') {
    const r = kind === 'ball' ? e * Math.cbrt(u[0]) : e;
    const [x, y, z] = onSphere(u[1], u[2]);
    return { p: [x * r, y * r, z * r], n: [x, y, z] };
  }
  const flat = (x, y) => ({ p: [x, y, d], n: [0, 0, 1] });
  if (kind === 'disc' || kind === 'ring') {
    const r = kind === 'ring' ? e : e * Math.sqrt(u[0]), a = u[1] * Math.PI * 2;
    return flat(Math.cos(a) * r, Math.sin(a) * r);
  }
  if (kind === 'square') return flat((u[0] - 0.5) * e, (u[1] - 0.5) * e);
  if (kind === 'line') return flat((u[0] - 0.5) * e, 0);
  // An object's point by the first draw, jittered within a picture's sample by the next two — dots are exact.
  const { list, cell } = points;
  const [px, py] = list[Math.min(list.length - 1, Math.floor(u[0] * list.length))];
  return flat((px + (u[1] - 0.5) * cell) * e, -(py + (u[2] - 0.5) * cell) * e);   // a picture's y is down
}

/** The colours a cloud deals: a vault palette's, given as `inks`, or one of BEC's three. */
const paletteOf = v => (Array.isArray(v.inks) && v.inks.length ? v.inks : PALETTES[v.palette] || PALETTES.bec);

/**
 * The cloud's dots, at rest: where each is, how big, its colour — the stack of modifiers on them, in order.
 *
 * @param {object} v        its values (CLOUD_PARAMS), `inks` the colours of a vault palette once read
 *                          (palettes.js), `points` an object emitter's once loaded (emitters.js)
 * @param {Array<{id: string, values: object}>} [stack]   its modifiers, on and known (scene.js `shapesOf`)
 * @returns {{count: number, centres: Float32Array, radii: Float32Array, colours: Float32Array, faces: Float32Array}}
 *          `colours` linear RGB, three to a dot, as three's colours are; `faces` the way each faces, its stack's
 *          turns carried — what a launch `the way it faces` follows (forces.js)
 */
export function dotsOf(v, stack = []) {
  const n = Math.max(0, Math.min(CLOUD_PARAMS.count.max, Math.round(v.count) || 0));
  const lo = Math.min(v.sizeMin, v.sizeMax), hi = Math.max(v.sizeMin, v.sizeMax), bias = v.sizeBias > 0 ? v.sizeBias : 1;
  const centres = new Float32Array(n * 3), faces = new Float32Array(n * 3), radii = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const r = makeRng(`cloud ${v.seed}:${k}`);
    const u = [r(), r(), r(), r()];
    const { p, n: way } = spotOf(v, v.points, u);
    radii[k] = lo + (hi - lo) * r() ** bias;
    const s = (v.scatter || 0) * Math.cbrt(r()), [sx, sy, sz] = onSphere(r(), r());
    centres.set([p[0] + sx * s, p[1] + sy * s, p[2] + sz * s], k * 3);
    faces.set(way, k * 3);
  }
  const moved = stack.length ? onDots({ centres, faces, radii }, stack) : { centres, faces, radii };
  return { count: moved.radii.length, centres: moved.centres, radii: moved.radii, colours: dealt(v, moved.centres), faces: moved.faces };
}

/**
 * The colours dealt to dots where they stand: each its own draw of `hues`, at random — or the palette in its
 * order along an axis, or out from the middle, a dot straying from its band by up to `mix` at random.
 */
export function dealt(v, centres) {
  const palette = paletteOf(v).map(hex => new Color(hex));
  const n = centres.length / 3, out = new Float32Array(n * 3);
  const at = { x: 0, y: 1, z: 2 }[v.deal];
  const measure = k => (v.deal === 'out' ? Math.hypot(centres[k * 3], centres[k * 3 + 1], centres[k * 3 + 2])
    : centres[k * 3 + at]);
  let lo = Infinity, hi = -Infinity;
  if (v.deal !== 'random' && DEALS.includes(v.deal)) for (let k = 0; k < n; k++) { const m = measure(k); lo = Math.min(lo, m); hi = Math.max(hi, m); }
  const banded = hi > lo, mix = Math.max(0, Math.min(1, v.mix ?? 0.25));
  for (let k = 0; k < n; k++) {
    const u = makeRng(`cloud hues ${v.hues}:${k}`)();
    const t = banded ? Math.max(0, Math.min(0.999999, (measure(k) - lo) / (hi - lo) + mix * (u - 0.5) * 2)) : u;
    const c = palette[Math.min(palette.length - 1, Math.floor(t * palette.length))];
    out.set([c.r, c.g, c.b], k * 3);
  }
  return out;
}

/**
 * A stack of modifiers on dots: each dot a vertex of a geometry with no faces, its radius beside it, through
 * deform.js and repeat.js as a mesh's vertices go — a mirror or a row cut short past MAX_DOTS.
 */
function onDots({ centres, faces, radii }, stack) {
  const n = radii.length;
  let g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(centres, 3));
  g.setAttribute('normal', new Float32BufferAttribute(faces, 3));
  g.setAttribute('radius', new Float32BufferAttribute(radii, 1));
  // A face of each dot alone, so the count repeat.js weighs a copy by is the dots', and displace makes no normals.
  g.setIndex(Array.from({ length: n * 3 }, (_, i) => Math.floor(i / 3)));
  for (const { id, values: m } of stack) {
    if (id === 'twist') deform(g, twist(g, m.axis, m.angle));
    else if (id === 'bend') deform(g, bend(g, m.axis, m.angle));
    else if (id === 'displace') displace(g, m);
    else if (id === 'mirror') g = swap(g, mirror(g, m.axis, m.offset, MAX_DOTS));
    else if (id === 'array') g = swap(g, array(g, m.count, [m.dx, m.dy, m.dz], MAX_DOTS));
  }
  const out = { centres: Float32Array.from(g.attributes.position.array), faces: Float32Array.from(g.attributes.normal.array),
                radii: Float32Array.from(g.attributes.radius.array) };
  g.dispose();
  return out;
}

const swap = (g, next) => { if (next !== g) g.dispose(); return next; };
