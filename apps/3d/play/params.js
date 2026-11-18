/**
 * params.js — the worm's player's rows (M16a, docs/worm.md): the worm, how
 * it walks, the planet, the camera behind it.
 *
 * Nothing the player does is saved (docs/worm.md, *Settled* 5): these rows
 * are tuned by hand, a schema still (rule 1) so that a world can be an
 * object one day (M16j). The worm is a gamepad drawing, lofted as the 3D
 * app lofts one, or a model's drawn body as the author shaped it there.
 */

import { defineParams } from '../../../core/params.js';

export const GROUPS = {
  worm: { label: 'Worm', open: true },
  walk: { label: 'Walk', open: true },
  planet: { label: 'Planet', open: false },
  camera: { label: 'Camera', open: false },
};

/** The rows the worm is shaped by: a change to one shapes it again. */
export const WORM_KEYS = ['avatar', 'seen', 'head', 'size', 'colour', 'wave', 'waves', 'sway'];

/** The rows the planet is built from: a change to one builds it again. */
export const PLANET_KEYS = ['radius', 'things', 'ground', 'sky', 'seed'];

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

    radius: { type: 'range', min: 6, max: 200, step: 'any', log: true, default: 24, label: 'its radius, units',
              group: 'planet' },
    things: { type: 'int', min: 0, max: 3000, default: 260, label: 'things on it', group: 'planet' },
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
