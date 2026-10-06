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

/** A card's drawers: what the shape is, where it stands, how it looks. */
export const SHAPE_GROUPS = {
  form:  { label: 'Form', open: true },
  place: { label: 'Place', open: false },
  look:  { label: 'Look', open: true },
};

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
};

const place = 'place';
const at = axis => ({ type: 'range', min: -50, max: 50, step: 'any', default: 0, label: axis, group: place });
const turn = axis => ({ type: 'range', min: -180, max: 180, step: 0.5, default: 0, label: `turned about ${axis} °`, group: place });
const times = label => ({ type: 'range', min: 0.05, max: 20, step: 'any', log: true, default: 1, label, group: place });

/**
 * What every shape has besides its form: a place in the world, and a look.
 * Its size is `size` times a stretch along each of its own axes, before it is
 * turned — what a handle by one axis changes (handles.js); a sphere stretched
 * along y is an egg.
 */
export const PLACE = {
  x: at('x'), y: at('y — up'), z: at('z'),
  turnX: turn('x'), turnY: turn('y'), turnZ: turn('z'),
  size: times('size ×'),
  sx: times('stretched along x ×'), sy: times('stretched along y ×'), sz: times('stretched along z ×'),
  colour: { type: 'color', default: '#ffd60a', label: 'colour', group: 'look' },
  /** Smooth reads as round; flat shows the facets the segments make. */
  shading: { type: 'enum', options: ['smooth', 'flat'], default: 'smooth', display: 'chips', label: 'shading', group: 'look' },
};

/** A shape's whole schema: its form, then its place and look. */
export function shapeSchema(id) {
  const shape = SHAPES[id];
  if (!shape) throw new Error(`3d: no shape "${id}"`);
  return { ...shape.params, ...PLACE };
}

/** The keys that make a shape's geometry: change one and the mesh is made again. */
export const formKeys = id => Object.keys(SHAPES[id].params);

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
