/**
 * params.js — the worm's player's rows (M16a, docs/worm.md): the worm, how
 * it walks, the planet, the camera behind it.
 *
 * Nothing the player does is saved (docs/worm.md, *Settled* 5): these rows
 * are tuned by hand, a schema still (rule 1) so that a world can be an
 * object one day (M16j). The worm is a gamepad drawing, lofted as the 3D
 * app lofts one, or a model's drawn body as the author shaped it there.
 * Its dive and the ground over it (M16c) are at size 1, and grow with it.
 */

import { defineParams } from '../../../core/params.js';

export const GROUPS = {
  worm: { label: 'Worm', open: true },
  walk: { label: 'Walk', open: true },
  dune: { label: 'Under the ground', open: true },
  heart: { label: 'Heart', open: true },
  phase: { label: 'Phase', open: true },
  planet: { label: 'Planet', open: false },
  camera: { label: 'Camera', open: false },
};

/** The rows the worms are shaped by — the walked one's and the frozen one's: a change to one shapes them again. */
export const WORM_KEYS = ['avatar', 'other', 'seen', 'head', 'size', 'colour', 'otherColour', 'wave', 'waves', 'sway'];

/** The rows the planet is built from: a change to one builds it again. */
export const PLANET_KEYS = ['radius', 'things', 'seed', 'tunnel', 'size'];

/** The rows the heart and its cuts are built from: a change to one builds again the one the worm is in. */
export const HEART_KEYS = ['core', 'tunnel', 'size', 'radius', 'matrix', 'matrixColour', 'things', 'seed'];

/** Where the frozen worm stands, and its radius: a change to one places it again. */
export const PLACE_KEYS = ['away', 'bearing', 'reach', 'radius'];

/** Each reality's colours: the planet dressed in the walked worm's. */
export const REALITY_KEYS = ['ground', 'sky', 'otherGround', 'otherSky'];

export function playParams() {
  return defineParams('3d-play', {
    avatar: { type: 'object', accepts: ['still', 'sequence', 'model'], by: ['gamepad', '3d'],
              label: 'the worm — a gamepad drawing, or a model\'s drawn body', group: 'worm' },
    seen: { type: 'enum', options: ['side', 'above'], labels: { side: 'from the side', above: 'from above' },
            default: 'side', display: 'chips', label: 'its drawing is seen', group: 'worm' },
    head: { type: 'enum', options: ['end', 'start'], labels: { end: 'where its stroke ends', start: 'where it begins' },
            default: 'end', display: 'chips', label: 'its head', group: 'worm' },
    size: { type: 'range', min: 0.25, max: 4, step: 'any', log: true, default: 1, label: 'its size — 4 units long at 1',
            unit: '×', group: 'worm' },
    colour: { type: 'color', default: '#e3a587', label: 'its colour, where it has no skin', group: 'worm' },

    wave: { type: 'range', min: 0, max: 2, step: 0.01, default: 0.5, label: 'its wave, by its section', unit: '×',
            group: 'walk' },
    waves: { type: 'range', min: 0.25, max: 6, step: 0.05, default: 1.5, label: 'waves along it', group: 'walk',
             when: { wave: { not: 0 } } },
    sway: { type: 'enum', options: ['side', 'up'], labels: { side: 'side to side', up: 'up and down' }, default: 'side',
            display: 'chips', label: 'it undulates', group: 'walk', when: { wave: { not: 0 } } },
    speed: { type: 'range', min: 0.5, max: 30, step: 'any', log: true, default: 4, label: 'speed, units a second',
             group: 'walk' },
    turn: { type: 'range', min: 30, max: 360, step: 1, default: 150, label: 'turn, degrees a second', group: 'walk' },
    under: { type: 'range', min: 0.5, max: 30, step: 'any', log: true, default: 6, label: 'under the ground, units a second',
             group: 'walk' },

    // M16c: under the ground, as a dune worm — the dive into it and out, the ground raised over the body.
    plunge: { type: 'range', min: 0.3, max: 4, step: 'any', log: true, default: 1.1, label: 'a dive, seconds — Space',
              group: 'dune' },
    leap: { type: 'range', min: 0, max: 4, step: 'any', default: 0.8, label: 'its leap as it dives, units', group: 'dune' },
    depth: { type: 'range', min: 0, max: 3, step: 'any', default: 0.1, label: 'its back under the ground, units',
             group: 'dune' },
    ridge: { type: 'range', min: 0, max: 2, step: 'any', default: 0.45, label: 'the ground raised over it, units',
             group: 'dune' },
    spread: { type: 'range', min: 0.05, max: 3, step: 'any', log: true, default: 0.35, label: 'the raised ground\'s width, units',
              group: 'dune' },

    // The heart: a hollow at the planet's middle, six ways down to it — the poles, four round the equator.
    core: { type: 'range', min: 0.15, max: 0.8, step: 'any', default: 0.4, label: 'its heart, a share of its radius',
            group: 'heart' },
    tunnel: { type: 'range', min: 1, max: 8, step: 'any', default: 3.2, label: 'the ways down, how wide, units',
              group: 'heart' },
    matrix: { type: 'range', min: 0.1, max: 0.8, step: 'any', default: 0.32, label: 'its matrix, a share of the heart',
              group: 'heart' },
    matrixColour: { type: 'color', default: '#ffb347', label: 'the matrix\'s colour', group: 'heart' },
    float: { type: 'range', min: 0.05, max: 0.7, step: 'any', default: 0.3, label: 'it floats there, from the matrix to the wall',
             group: 'heart' },
    drift: { type: 'range', min: 0.5, max: 30, step: 'any', log: true, default: 5, label: 'round the matrix, units a second',
             group: 'heart' },

    // M16b: a worm frozen in space-time, a phase of another reality, and the passage into it.
    other: { type: 'object', accepts: ['still', 'sequence', 'model'], by: ['gamepad', '3d'],
             label: 'the frozen worm — a gamepad drawing, or a model\'s drawn body', group: 'phase' },
    otherColour: { type: 'color', default: '#9b7fd6', label: 'its colour, where it has no skin', group: 'phase' },
    away: { type: 'range', min: 3, max: 150, step: 'any', log: true, default: 14, label: 'how far from the start, units',
            group: 'phase' },
    bearing: { type: 'range', min: -180, max: 180, step: 1, default: 0, label: 'which way from the start, degrees',
               group: 'phase' },
    reach: { type: 'range', min: 1, max: 20, step: 'any', default: 4, label: 'its radius, units', group: 'phase' },
    swings: { type: 'int', min: 0, max: 12, default: 4, label: 'the phase there and back, times', group: 'phase' },
    swing: { type: 'range', min: 0.4, max: 12, step: 'any', log: true, default: 2.4, label: 'the swings, seconds',
             group: 'phase' },
    ghosts: { type: 'int', min: 1, max: 16, default: 7, label: 'frames on the bridge', group: 'phase' },
    spectral: { type: 'color', default: '#a6e3ff', label: 'the bridge\'s light, and a shell\'s', group: 'phase' },
    otherGround: { type: 'color', default: '#5d4f86', label: 'its reality: the ground', group: 'phase' },
    otherSky: { type: 'color', default: '#1f1b3a', label: 'its reality: the sky', group: 'phase' },

    radius: { type: 'range', min: 6, max: 200, step: 'any', log: true, default: 24, label: 'its radius, units',
              group: 'planet' },
    things: { type: 'int', min: 0, max: 3000, default: 260, label: 'things on it', group: 'planet' },
    finds: { type: 'int', min: 0, max: 17, default: 3, label: 'brushes lying on it, to find', group: 'planet' },
    ground: { type: 'color', default: '#7fae6b', label: 'its ground', group: 'planet' },
    sky: { type: 'color', default: '#cfe3f1', label: 'its sky', group: 'planet' },
    seed: { type: 'int', min: 0, max: 99999, default: 1, label: 'seed — where its things stand', group: 'planet' },

    distance: { type: 'range', min: 2, max: 80, step: 'any', log: true, default: 10, label: 'behind it, units',
                group: 'camera' },
    height: { type: 'range', min: 0.5, max: 60, step: 'any', log: true, default: 7, label: 'above it, units',
              group: 'camera' },
    ease: { type: 'range', min: 0.5, max: 30, step: 'any', log: true, default: 5, label: 'following, how fast',
            group: 'camera' },
  });
}
