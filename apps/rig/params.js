/**
 * params.js — the rig's schema: the drawing it rigs, and how its bones are
 * proposed from that drawing's strokes.
 *
 * M9's app (docs/roadmap.md): a drawing made of marks rigged at its marks.
 * The bones are not drawn by hand; they are found — strokes where the pen
 * was lifted, joints where a stroke turns, a long run cut — so these values
 * are the whole of a proposal, and the same values on the same drawing
 * propose the same bones. A pose — the turns given by dragging — and the
 * waves are kept beside these values, by bone, as a map keeps its cells.
 *
 * A loop is `length` frames at `fps`; each bone's wave is edited through
 * `boneParams` when its handle is chosen (motion.js), and the whole drawing
 * may rise and fall. A crawl moves the body as a worm's (crawl.js): a wave
 * down it in place, or round a path — drawn, or a circle, an ellipse, an
 * eight — the body following its head.
 */

import { defineParams } from '../../core/params.js';
import { CRAWLS, PATHS } from './crawl.js';
import { PARTS } from './parts.js';
import { LAYERS } from '../../core/layers.js';

/** The drawers. */
export const GROUPS = {
  drawing: { label: 'Drawing', open: true },
  bones:   { label: 'Bones', open: true },
  motion:  { label: 'Motion', open: true },
  crawl:   { label: 'Crawl', open: true },
};

const ON_PATH = { crawl: 'along a path' };

export function rigParams() {
  return defineParams('rig', {
    /** A gamepad still: its marks are what the bones carry. */
    drawing: { type: 'object', accepts: ['still'], label: 'drawing', group: 'drawing' },
    /** The least jump between two marks that is the pen lifted: a stroke ends there. */
    jump:    { type: 'range', min: 4, max: 200, step: 1, default: 16, label: 'a lifted pen', unit: 'px', group: 'bones' },
    /** The least turn of a stroke that is a joint: an elbow, a knee. */
    corner:  { type: 'range', min: 10, max: 120, step: 1, default: 30, label: 'a corner, degrees', group: 'bones' },
    /** A run longer than this is cut into bones of equal length, so a long body bends too. */
    longest: { type: 'range', min: 20, max: 2000, step: 5, default: 200, log: true, label: 'longest bone', unit: 'px', group: 'bones' },
    /** How far along a stroke, either side of a joint, its two bones share the stamps: the fan of a bend. */
    bend:    { type: 'range', min: 0, max: 60, step: 1, default: 12, label: 'bend', unit: 'px', group: 'bones' },
    /** A loop's length: every wave a whole number of cycles in it, so it closes. */
    length:  { type: 'int', min: 2, max: 600, default: 60, label: 'loop, frames', group: 'motion' },
    fps:     { type: 'int', min: 1, max: 60, default: 30, label: 'fps', group: 'motion' },
    /** The whole drawing rising and falling, px either way: a walk's bob, a breath. */
    rise:    { type: 'range', min: 0, max: 200, step: 0.5, default: 0, label: 'rise', unit: 'px', group: 'motion' },
    rises:   { type: 'int', min: 1, max: 8, default: 2, label: 'rises a loop', group: 'motion', when: { rise: { not: 0 } } },

    /** The body — the first stroke — as a spine: a wave down it, or a path it follows. */
    crawl:      { type: 'enum', options: CRAWLS, default: 'none', label: 'crawl', group: 'crawl' },
    undulate:   { type: 'range', min: 0, max: 90, step: 1, default: 25, label: 'undulate, degrees', group: 'crawl', when: { crawl: 'in place' } },
    wavelength: { type: 'range', min: 20, max: 2000, step: 5, log: true, default: 160, label: 'wavelength', unit: 'px', group: 'crawl', when: { crawl: 'in place' } },
    ripples:    { type: 'int', min: 1, max: 12, default: 1, label: 'ripples a loop', group: 'crawl', when: { crawl: 'in place' } },
    path:       { type: 'enum', options: PATHS, default: 'ellipse', label: 'path', group: 'crawl', when: ON_PATH },
    /** A gamepad drawing: its first stroke is the path, closed end to start. */
    pathFrom:   { type: 'object', accepts: ['still'], label: 'drawn path', group: 'crawl', when: { ...ON_PATH, path: 'drawn' } },
    pathWidth:  { type: 'range', min: 20, max: 4000, step: 5, log: true, default: 500, label: 'path width', unit: 'px', group: 'crawl',
                  when: { ...ON_PATH, path: ['circle', 'ellipse', 'eight'] } },
    pathHeight: { type: 'range', min: 20, max: 4000, step: 5, log: true, default: 320, label: 'path height', unit: 'px', group: 'crawl',
                  when: { ...ON_PATH, path: ['ellipse', 'eight'] } },
    laps:       { type: 'int', min: 1, max: 12, default: 1, label: 'laps a loop', group: 'crawl', when: ON_PATH },
    way:        { type: 'enum', options: ['one way', 'the other way'], default: 'one way', label: 'way round', group: 'crawl', when: ON_PATH },
    /** Waves laid on the path, fixed to the ground: the body slithers through them. */
    wiggle:     { type: 'range', min: 0, max: 200, step: 1, default: 14, label: 'wiggle', unit: 'px', group: 'crawl', when: ON_PATH },
    wiggles:    { type: 'int', min: 0, max: 60, default: 8, label: 'wiggles round it', group: 'crawl', when: { ...ON_PATH, wiggle: { not: 0 } } },
    layers: LAYERS,      // its layers, in the Stack section: an overlay in front, a picture behind (core/layers.js, L13)
  });
}

/** The chosen bone's drawers. */
export const BONE_GROUPS = {
  chain: { label: 'Its chain', open: true },
  wave:  { label: 'The bone, swinging', open: true },
};

/**
 * One bone's wave, as its panel edits it — degrees all: as far as it swings
 * either way, how many times a loop, where in its swing it starts, and
 * whether the bones below it in its chain follow, each a lag later. And what
 * its chain is (parts.js): a walk is made of parts.
 */
export function boneParams() {
  return defineParams('rig-bone', {
    part:   { type: 'enum', options: PARTS, default: 'none', label: 'part', group: 'chain' },
    swing:  { type: 'range', min: 0, max: 120, step: 1, default: 0, label: 'swing, degrees', group: 'wave' },
    cycles: { type: 'int', min: 1, max: 12, default: 1, label: 'cycles a loop', group: 'wave', when: { swing: { not: 0 } } },
    phase:  { type: 'range', min: -180, max: 180, step: 1, default: 0, label: 'phase, degrees', group: 'wave', when: { swing: { not: 0 } } },
    follow: { type: 'bool', default: false, label: 'the chain follows', group: 'wave', when: { swing: { not: 0 } } },
    lag:    { type: 'range', min: 0, max: 180, step: 1, default: 45, label: 'lag a bone, degrees', group: 'wave',
              when: { swing: { not: 0 }, follow: true } },
  });
}
