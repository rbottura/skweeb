/**
 * shapes.js — the primitives a model is made of, as data.
 *
 * A shape is a catalogue entry — an id, a label, a param schema, and the
 * three.js geometry its values make — as a filter is in core/gpu/filters/.
 * A model's recipe names a shape by id and keeps its values, never its
 * vertices (docs/object-model.md, `model`): the geometry is made again from
 * them, the same for the same values, so a frame draws on its own at any size
 * and a print is drawn again, not enlarged.
 *
 * Besides its own form every shape has a place — where it stands, how it is
 * turned, how big — and a look — its colour, its shading. PLACE is spread
 * into every shape's schema, so a card's drawers are form, place and look,
 * and a recipe holds all three as one entry's values (`shapeSchema`).
 *
 * Units are the world's, a metre if anything, y up: the camera starts six
 * away. Sizes run over orders of ten (`log`); segments are how round a round
 * shape is. Angles are degrees, as every panel in the suite has them.
 *
 * Only three.core.js is imported: geometry needs no GPU, and Node runs it
 * (tests/3d-shapes.mjs).
 */

import {
  BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry,
  TorusGeometry, PlaneGeometry, CapsuleGeometry,
} from '../../core/libs/three/three.core.js';
import { gridGeometry, PALETTES } from './grid.js';
import { CLOUD_PARAMS, dotGeometry, dotsOf } from './cloud.js';

/** A card's drawers: what the shape is, where it stands, how it looks. */
export const SHAPE_GROUPS = {
  form:  { label: 'Form', open: true },
  place: { label: 'Place', open: false },
  swing: { label: 'Swing', open: false },
  look:  { label: 'Look', open: true },
};

/**
 * What can swing in a shape's place (P2, 2026-11-06; motion.js `swungAt`): the place key it moves — a turn
 * about an axis, a move along one, its size — or nothing.
 */
export const SWINGS = ['none', 'turnY', 'turnX', 'turnZ', 'y', 'x', 'z', 'size'];
const SWING_LABELS = { none: 'nothing', turnY: 'turned about y', turnX: 'turned about x', turnZ: 'turned about z',
  y: 'up and down', x: 'along x', z: 'along z', size: 'its size' };
const swinging = { swingBy: { not: 'none' } };

const form = 'form';
const size = (label, d) => ({ type: 'range', min: 0.01, max: 50, step: 'any', log: true, default: d, label, group: form });
const round = (label, d, min = 3) => ({ type: 'int', min, max: 128, default: d, label, group: form });

/** The catalogue, in the order the add menu offers it. */
export const SHAPES = {
  box: {
    id: 'box', label: 'box',
    params: { width: size('width', 1), height: size('height', 1), depth: size('depth', 1) },
    geometry: v => new BoxGeometry(v.width, v.height, v.depth),
  },
  sphere: {
    id: 'sphere', label: 'sphere',
    params: { radius: size('radius', 0.6), segments: round('segments round', 48) },
    geometry: v => new SphereGeometry(v.radius, v.segments, Math.max(2, Math.round(v.segments / 2))),
  },
  cylinder: {
    id: 'cylinder', label: 'cylinder',
    params: {
      // Linear, not log: a radius of 0 is a point, and a cylinder with one is a cone.
      top:    { type: 'range', min: 0, max: 20, step: 'any', default: 0.5, label: 'radius at the top', group: form },
      bottom: { type: 'range', min: 0, max: 20, step: 'any', default: 0.5, label: 'radius at the bottom', group: form },
      height: size('height', 1.2),
      segments: round('segments round', 48),
    },
    geometry: v => new CylinderGeometry(v.top, v.bottom, v.height, v.segments),
  },
  cone: {
    id: 'cone', label: 'cone',
    params: { radius: size('radius', 0.6), height: size('height', 1.2), segments: round('segments round', 48) },
    geometry: v => new ConeGeometry(v.radius, v.height, v.segments),
  },
  torus: {
    id: 'torus', label: 'torus',
    params: {
      radius: size('radius, to the tube\'s middle', 0.55),
      tube: size('tube\'s radius', 0.2),
      segments: round('segments round', 64),
      sides: round('segments round the tube', 24),
    },
    geometry: v => new TorusGeometry(v.radius, v.tube, v.sides, v.segments),
  },
  plane: {
    id: 'plane', label: 'plane',
    params: { width: size('width', 2), height: size('height', 2) },
    geometry: v => new PlaneGeometry(v.width, v.height),
  },
  capsule: {
    id: 'capsule', label: 'capsule',
    params: { radius: size('radius', 0.35), length: size('length between the caps', 0.8), segments: round('segments round', 32) },
    geometry: v => new CapsuleGeometry(v.radius, v.length, Math.max(2, Math.round(v.segments / 4)), v.segments),
  },
  /**
   * BEC_2025's grid (grid.js; M13a, docs/bec.md): cells, the edges drawn among theirs and the faces filled,
   * each draw a seed — R a new `seed`, C new `hues`. Its colours are its palette's, so it has no colour of its own.
   */
  grid: {
    id: 'grid', label: 'BEC grid', ownColours: true,
    params: {
      cellsX: { type: 'int', min: 1, max: 16, default: 4, label: 'cells along x', group: form },
      cellsY: { type: 'int', min: 1, max: 16, default: 2, label: 'cells up, y', group: form },
      cellsZ: { type: 'int', min: 1, max: 16, default: 4, label: 'cells along z', group: form },
      cell: size('a cell', 0.5),
      edges: { type: 'int', min: 0, max: 3000, default: 24, label: 'edges drawn', group: form },
      seed: { type: 'int', min: 0, max: 999999, default: 1, label: 'which edges (R)', group: form },
      thickness: { type: 'range', min: 0.002, max: 1, step: 'any', log: true, default: 0.035, label: 'thickness', group: form },
      overhang: { type: 'range', min: 0, max: 1, step: 'any', default: 0.08, label: 'past the joints', group: form },
      faces: { type: 'int', min: 0, max: 3000, default: 6, label: 'faces filled', group: form },
      fill: { type: 'int', min: 0, max: 999999, default: 1, label: 'which faces', group: form },
      palette: { type: 'enum', options: Object.keys(PALETTES), default: 'bec', display: 'chips', label: 'palette', group: 'look' },
      /** One of the vault's palettes in place of its own three (V1; palettes.js): BEC 2027's, made by hand. */
      colours: { type: 'object', accepts: ['palette'], label: 'a palette of the vault', group: 'look' },
      hues: { type: 'int', min: 0, max: 999999, default: 1, label: 'colours dealt (C)', group: 'look' },
    },
    geometry: v => gridGeometry(v),
  },
  /**
   * A cloud of dots, placed once on an emitter (cloud.js, 2026-11-11): particles' object emitter in 3D, each dot
   * a sphere of its own size and colour — `geometry` one dot's, `dots` where they all are. Unlit as it starts, its
   * palette's colours exactly: circles in space. R a new `seed`, C new `hues`, as the grid's.
   */
  cloud: {
    id: 'cloud', label: 'cloud of dots', ownColours: true, instanced: true,
    defaults: { shading: 'unlit' },
    finest: 32,                            // a dot is small: more segments for a print than this, and nothing shows
    params: CLOUD_PARAMS,
    geometry: v => dotGeometry(v.segments),
    dots: (v, stack) => dotsOf(v, stack),
  },
};

const place = 'place';
const at = axis => ({ type: 'range', min: -50, max: 50, step: 'any', default: 0, label: axis, group: place });
const turn = axis => ({ type: 'range', min: -180, max: 180, step: 0.5, default: 0, label: `turned about ${axis}`, unit: '°', group: place });
const times = label => ({ type: 'range', min: 0.05, max: 20, step: 'any', log: true, default: 1, label, unit: '×', group: place });

/**
 * What every shape has besides its form: a place in the world, and a look.
 * Its size is `size` times a stretch along each of its own axes, before it is
 * turned — what a handle by one axis changes (handles.js); a sphere stretched
 * along y is an egg.
 */
export const PLACE = {
  x: at('x'), y: at('y — up'), z: at('z'),
  turnX: turn('x'), turnY: turn('y'), turnZ: turn('z'),
  size: times('size'),
  sx: times('stretched along x'), sy: times('stretched along y'), sz: times('stretched along z'),
  colour: { type: 'color', default: '#ffd60a', label: 'colour', group: 'look' },
  /**
   * Smooth reads as round; flat shows the facets the segments make; unlit is its colour alone, no light on it —
   * a silhouette in exactly its colours, for a print (2026-11-11, the cloud's circles).
   */
  shading: { type: 'enum', options: ['smooth', 'flat', 'unlit'], default: 'smooth', display: 'chips', label: 'shading', group: 'look' },
  /** Its place on a wave, as the rig swings a bone (P2): whole cycles in the model's loop, so it closes. */
  swingBy:     { type: 'enum', options: SWINGS, labels: SWING_LABELS, default: 'none', label: 'what swings', group: 'swing' },
  swingTurn:   { type: 'range', min: 0, max: 180, step: 0.5, default: 20, label: 'as far, either way', unit: '°', group: 'swing',
                 when: { swingBy: ['turnY', 'turnX', 'turnZ'] } },
  swingMove:   { type: 'range', min: 0, max: 20, step: 'any', default: 0.25, label: 'as far, either way', group: 'swing',
                 when: { swingBy: ['y', 'x', 'z'] } },
  swingSize:   { type: 'range', min: 0, max: 0.9, step: 0.01, default: 0.15, label: 'as far, a share of its size', group: 'swing',
                 when: { swingBy: 'size' } },
  swingCycles: { type: 'int', min: 1, max: 12, default: 1, label: 'cycles a loop', group: 'swing', when: swinging },
  swingPhase:  { type: 'range', min: -180, max: 180, step: 1, default: 0, label: 'phase', unit: '°', group: 'swing', when: swinging },
};

/**
 * A shape's whole schema: its form, then its place and look — no colour for one whose colours are its own, and
 * a place row starting where its shape says (`defaults`: a cloud unlit).
 */
export function shapeSchema(id) {
  const shape = SHAPES[id];
  if (!shape) throw new Error(`3d: no shape "${id}"`);
  const { colour, ...rest } = PLACE;
  const schema = { ...shape.params, ...(shape.ownColours ? rest : PLACE) };
  for (const [key, d] of Object.entries(shape.defaults || {})) schema[key] = { ...schema[key], default: d };
  return schema;
}

/** The keys that make a shape's geometry: change one and the mesh is made again. */
export const formKeys = id => Object.keys(SHAPES[id].params);

/** The keys that say how round a round shape is: its segments, and a torus's round its tube. */
const ROUNDNESS = ['segments', 'sides'];

/**
 * A shape's values made rounder for a print: its segments raised to at least
 * `n`, so a silhouette many times the preview's size stays round — π√R
 * segments keep a circle R pixels across within half a pixel of true. A flat
 * shape keeps its facets: they are its look, not a want of pixels. A shape
 * small in any picture — a cloud's dot — is raised no further than its
 * `finest`.
 */
export function finer(id, values, n) {
  if (!(n > 0) || values.shading === 'flat') return values;
  const out = { ...values };
  const most = SHAPES[id].finest || Infinity;
  for (const key of ROUNDNESS) if (key in SHAPES[id].params) out[key] = Math.max(values[key], Math.min(most, Math.ceil(n)));
  return out;
}

/** Colours a shape added from the menu takes in turn — a convenience, kept in the recipe like any value. */
export const COLOURS = ['#ffd60a', '#2a62d8', '#d8342a', '#1b998b', '#f4a259', '#6a4c93', '#111111', '#fffdf6'];

/**
 * Where the n-th shape added starts, and its colour: side by side along x —
 * 0, then right, left, further right — so a new shape is seen, not buried
 * in the last one.
 */
export function startOf(n) {
  const step = Math.ceil(n / 2) * 1.6;
  return { x: (n % 2 ? step : -step) || 0, colour: COLOURS[n % COLOURS.length] };
}
