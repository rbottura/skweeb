/**
 * params.js — particles' two schemas: what the particles do, and the picture
 * they are drawn on.
 *
 * Two, as compose has a page and a placement, because they are two kinds of
 * thing and sit in two columns. The emitter — emission, launch, life, forces
 * — is the model's recipe (model.js), key for key, with its defaults. The
 * picture is core's Format drawer, less what has no meaning without a
 * source (no `ink` or `canvas` format, no `zoom`), with the dots' look, the
 * ground and the player's rate. `toModel()` joins them into what the model
 * reads.
 *
 * A stream's loop is set in frames and not in seconds: `frames / fps` is its
 * period, a whole number of the picture's frames, so the loop closes on a
 * frame and not between two.
 */

import { defineParams } from '../../core/params.js';
import { frameParams, DERIVED } from '../../core/frame.js';
import { DEFAULTS } from './model.js';

/** The emitter panel's drawers. */
export const EMIT_GROUPS = {
  emission: { label: 'Emission', open: true },
  launch:   { label: 'Launch', open: true },
  life:     { label: 'Life', open: true },
  forces:   { label: 'Forces', open: true },
};

/** The picture panel's drawers. Format is the picture, so it starts open. */
export const PICTURE_GROUPS = {
  format: { label: 'Format', open: true },
  player: { label: 'Sequence player', open: true },
  look:   { label: 'Look', open: true },
};

const D = DEFAULTS;
const STREAM = { mode: 'stream' };
const BURST = { mode: 'burst' };

export function emitParams() {
  return defineParams('particles', {
    mode:    { type: 'enum', options: ['stream', 'burst'], default: D.mode, display: 'chips', label: 'mode', group: 'emission' },
    rate:    { type: 'range', min: 1, max: 2000, step: 1, default: D.rate, label: 'a second', group: 'emission', when: STREAM },
    count:   { type: 'int', min: 1, max: 5000, default: D.count, label: 'at once', group: 'emission', when: BURST },
    /** A stream's loop, in the picture's frames: its period is frames / fps. */
    frames:  { type: 'int', min: 2, max: 1200, default: 60, label: 'loop, frames', group: 'emission', when: STREAM },
    prewarm: { type: 'bool', default: D.prewarm, label: 'full from the first frame', group: 'emission', when: STREAM },
    jitter:  { type: 'range', min: 0, max: 1, step: 0.01, default: D.jitter, label: 'birth jitter', group: 'emission', when: STREAM },
    x:       { type: 'int', min: -4000, max: 4000, default: D.x, label: 'x from centre', group: 'emission' },
    y:       { type: 'int', min: -4000, max: 4000, default: 200, label: 'y from centre', group: 'emission' },
    seed:    { type: 'int', min: 0, max: 999999, default: D.seed, label: 'seed', group: 'emission' },

    speed:       { type: 'range', min: 0, max: 3000, step: 1, default: D.speed, label: 'speed px/s', group: 'launch' },
    speedSpread: { type: 'range', min: 0, max: 1, step: 0.01, default: D.speedSpread, label: 'speed spread', group: 'launch' },
    angle:       { type: 'range', min: -180, max: 180, step: 1, default: D.angle, label: 'angle ° from up', group: 'launch' },
    spread:      { type: 'range', min: 0, max: 360, step: 1, default: D.spread, label: 'cone °', group: 'launch' },

    life:       { type: 'range', min: 0.05, max: 20, step: 0.05, default: D.life, label: 'life s', group: 'life' },
    lifeSpread: { type: 'range', min: 0, max: 1, step: 0.01, default: D.lifeSpread, label: 'life spread', group: 'life' },

    gravity: { type: 'range', min: -3000, max: 3000, step: 1, default: D.gravity, label: 'gravity px/s²', group: 'forces' },
    wind:    { type: 'range', min: -3000, max: 3000, step: 1, default: D.wind, label: 'wind px/s²', group: 'forces' },
    drag:    { type: 'range', min: 0, max: 20, step: 0.05, default: D.drag, label: 'drag /s', group: 'forces' },
  });
}

export function pictureParams() {
  const { zoom, ...frame } = frameParams({ format: 'ig-square' });
  return defineParams('particles-picture', {
    ...frame,
    format: { ...frame.format, options: frame.format.options.filter(o => !DERIVED.includes(o)) },
    fps:    { type: 'int', min: 1, max: 60, default: 30, label: 'fps', group: 'player' },
    size:   { type: 'range', min: 0.5, max: 64, step: 0.5, default: 6, label: 'dot size px', group: 'look' },
    color:  { type: 'color', default: '#111111', label: 'dot colour', group: 'look' },
    /** Fading out over its life, so a particle leaves rather than blinks out. */
    fade:   { type: 'bool', default: true, label: 'fade over its life', group: 'look' },
    ground: { type: 'ground', default: '#fffdf6', label: 'ground', group: 'look' },
  });
}

/**
 * The model's recipe from the two panels' values: a stream's period from
 * its frames at the picture's rate. What the model does not read, it ignores.
 */
export function toModel(emit, picture) {
  return { ...emit, period: emit.frames / picture.fps };
}

/** How many frames the picture lasts: a stream's loop, or a burst until its longest life ends. */
export function framesOf(emit, picture, longest) {
  if (emit.mode !== 'burst') return emit.frames;
  return Math.max(1, Math.ceil(longest * picture.fps));
}
