/**
 * params.js — particles' two schemas: what the particles do, and the picture
 * they are drawn on.
 *
 * Two, as compose has a page and a placement, because they are two kinds of
 * thing and sit in two columns. The emitter — emission, launch, life,
 * forces, fields, turning — is the model's recipe (model.js), key for key, with its
 * defaults, but where the app opens on a torch — rising, warm, shrinking as
 * it goes — rather than the model's plain fountain. The picture is core's
 * Format drawer, less what has no meaning without a source (no `ink` or
 * `canvas` format, no `zoom`), with the look — sprites or dots, size and
 * fade over life — the ground and the player's rate. `toModel()` joins them
 * into what the model reads.
 *
 * A stream's loop is set in frames and not in seconds: `frames / fps` is its
 * period, a whole number of the picture's frames, so the loop closes on a
 * frame and not between two.
 */

import { defineParams } from '../../core/params.js';
import { frameParams, DERIVED } from '../../core/frame.js';
import { easeParam } from '../../core/easing.js';
import { DEFAULTS } from './model.js';

/** The emitter panel's drawers. */
export const EMIT_GROUPS = {
  emission: { label: 'Emission', open: true },
  launch:   { label: 'Launch', open: true },
  life:     { label: 'Life', open: true },
  forces:   { label: 'Forces', open: true },
  fields:   { label: 'Fields', open: false },
  turning:  { label: 'Turning', open: false },
  depth:    { label: 'Depth', open: false },
};

/** The picture panel's drawers. Format is the picture, so it starts open. */
export const PICTURE_GROUPS = {
  format: { label: 'Format', open: true },
  player: { label: 'Sequence player', open: true },
  look:   { label: 'Look', open: true },
  camera: { label: 'Camera', open: false },
};

const D = DEFAULTS;
const STREAM = { mode: 'stream' };
const BURST = { mode: 'burst' };

export function emitParams() {
  return defineParams('particles', {
    mode:    { type: 'enum', options: ['stream', 'burst'], default: D.mode, display: 'chips', label: 'mode', group: 'emission' },
    rate:    { type: 'range', min: 1, max: 2000, step: 1, default: 90, label: 'a second', group: 'emission', when: STREAM },
    count:   { type: 'int', min: 1, max: 5000, default: D.count, label: 'at once', group: 'emission', when: BURST },
    /** A stream's loop, in the picture's frames: its period is frames / fps. */
    frames:  { type: 'int', min: 2, max: 1200, default: 60, label: 'loop, frames', group: 'emission', when: STREAM },
    prewarm: { type: 'bool', default: D.prewarm, label: 'full from the first frame', group: 'emission', when: STREAM },
    jitter:  { type: 'range', min: 0, max: 1, step: 0.01, default: D.jitter, label: 'birth jitter', group: 'emission', when: STREAM },
    x:       { type: 'int', min: -4000, max: 4000, default: D.x, label: 'x from centre', group: 'emission' },
    y:       { type: 'int', min: -4000, max: 4000, default: 260, label: 'y from centre', group: 'emission' },
    seed:    { type: 'int', min: 0, max: 999999, default: D.seed, label: 'seed', group: 'emission' },
    /** Where on the emitter a particle leaves from (model.js, *Where it leaves from*). */
    shape:     { type: 'enum', options: ['point', 'line', 'disc', 'ring', 'object'], default: D.shape, display: 'chips',
                 label: 'emitter', group: 'emission' },
    /**
     * An object's dots, or where it has ink (core/points.js): a ckt dot-set —
     * one cut from text is the word, one glyph — a shape, a still. Its points
     * are loaded beside the recipe, which keeps only the id: the link
     * `ckt → particles: an emitter`.
     */
    from:      { type: 'object', accepts: ['dataset', 'shape', 'still'], label: 'emitter object',
                 group: 'emission', when: { shape: 'object' } },
    glyph:     { type: 'int', min: 0, max: 999, default: 0, label: 'glyph, of a dot-set', group: 'emission',
                 when: { shape: 'object' } },
    extent:    { type: 'range', min: 1, max: 2000, step: 1, default: D.extent, label: 'length · radius · size px',
                 group: 'emission', when: { shape: { not: 'point' } } },
    lineAngle: { type: 'range', min: -180, max: 180, step: 1, default: D.lineAngle, label: 'line angle °',
                 group: 'emission', when: { shape: 'line' } },
    aim:       { type: 'enum', options: ['fixed', 'outward'], default: D.aim, display: 'chips', label: 'launch',
                 labels: { fixed: 'as the angle', outward: 'outward' }, group: 'emission',
                 when: { shape: ['disc', 'ring', 'object'] } },

    speed:       { type: 'range', min: 0, max: 3000, step: 1, default: 140, label: 'speed px/s', group: 'launch' },
    speedSpread: { type: 'range', min: 0, max: 1, step: 0.01, default: D.speedSpread, label: 'speed spread', group: 'launch' },
    angle:       { type: 'range', min: -180, max: 180, step: 1, default: D.angle, label: 'angle ° from up', group: 'launch' },
    spread:      { type: 'range', min: 0, max: 360, step: 1, default: 36, label: 'cone °', group: 'launch' },

    life:       { type: 'range', min: 0.05, max: 20, step: 0.05, default: 1.4, label: 'life s', group: 'life' },
    lifeSpread: { type: 'range', min: 0, max: 1, step: 0.01, default: D.lifeSpread, label: 'life spread', group: 'life' },

    gravity: { type: 'range', min: -3000, max: 3000, step: 1, default: -260, label: 'gravity px/s²', group: 'forces' },
    wind:    { type: 'range', min: -3000, max: 3000, step: 1, default: D.wind, label: 'wind px/s²', group: 'forces' },
    drag:    { type: 'range', min: 0, max: 20, step: 0.05, default: 1.2, label: 'drag /s', group: 'forces' },

    /**
     * Pulls that depend on where a particle is (forces.js): round a centre,
     * towards it, and along curl noise. Any of them on, each particle is
     * integrated from its birth — slower, and every frame still its own.
     */
    vortex:     { type: 'range', min: -3000, max: 3000, step: 1, default: D.vortex, label: 'vortex px/s²', group: 'fields' },
    attract:    { type: 'range', min: -3000, max: 3000, step: 1, default: D.attract, label: 'attract px/s²', group: 'fields' },
    /** The vortex's and the pull's reach round their centre: 0 is everywhere, at full strength (forces.js `reach`). */
    falloff:    { type: 'range', min: 0, max: 4000, step: 1, default: D.falloff, label: 'reach px (0: everywhere)', group: 'fields' },
    fx:         { type: 'int', min: -4000, max: 4000, default: D.fx, label: 'centre x', group: 'fields' },
    fy:         { type: 'int', min: -4000, max: 4000, default: D.fy, label: 'centre y', group: 'fields' },
    noise:      { type: 'range', min: 0, max: 5000, step: 1, default: D.noise, label: 'curl noise px/s²', group: 'fields' },
    noiseScale: { type: 'range', min: 4, max: 2000, step: 1, default: D.noiseScale, label: 'noise size px',
                  group: 'fields', when: { noise: { not: 0 } } },
    /**
     * A field from another object, asked of the app that made it
     * (core/fields.js) — M7's link, `fractal → particles: a field`: escape
     * time points at its set. Its pull, and turned: 0 towards what it points
     * at, 180 away, 90 round it.
     */
    fieldFrom: { type: 'object', accepts: ['still', 'sequence'], label: 'a field from', group: 'fields' },
    fieldPull: { type: 'range', min: -3000, max: 3000, step: 1, default: 300, label: 'its pull px/s²', group: 'fields',
                 when: { fieldFrom: { not: null } } },
    fieldTurn: { type: 'range', min: -180, max: 180, step: 1, default: D.fieldTurn, label: 'its pull turned °',
                 group: 'fields', when: { fieldFrom: { not: null } } },

    /**
     * Out of the picture's plane (model.js, *Depth*): the emitter's depth,
     * and the cone tilted into depth — the picture's camera turns it into
     * size and place. Both 0, the particles are flat, as before.
     */
    z:           { type: 'int', min: -2000, max: 4000, default: D.z, label: 'emitter depth px', group: 'depth' },
    depthSpread: { type: 'range', min: 0, max: 180, step: 1, default: D.depthSpread, label: 'into depth °', group: 'depth' },

    /** Facing where it goes — a spark, a streak — instead of turning on its own. */
    align:      { type: 'bool', default: D.align, label: 'face where it goes', group: 'turning' },
    turn:       { type: 'range', min: 0, max: 360, step: 1, default: D.turn, label: 'start angle spread °', group: 'turning', when: { align: false } },
    spin:       { type: 'range', min: -1080, max: 1080, step: 1, default: D.spin, label: 'spin °/s', group: 'turning', when: { align: false } },
    spinSpread: { type: 'range', min: 0, max: 1, step: 0.01, default: D.spinSpread, label: 'spin spread', group: 'turning', when: { align: false } },
  });
}

export function pictureParams() {
  const { zoom, ...frame } = frameParams({ format: 'ig-square' });
  return defineParams('particles-picture', {
    ...frame,
    format: { ...frame.format, options: frame.format.options.filter(o => !DERIVED.includes(o)) },
    fps:    { type: 'int', min: 1, max: 60, default: 30, label: 'fps', group: 'player' },
    /**
     * A vault set whose members are the particles' sprites, one each by its
     * `pick` (model.js) — M6's link, `set → particles: sprites`, offered
     * through core/uses.js — or one sprite, a shape or a still, for every
     * particle. None: dots, in `color`.
     */
    sprites: { type: 'object', accepts: ['set', 'shape', 'still'], use: 'particles', label: 'sprites', group: 'look' },
    /** A dot's width, or a sprite's: its height follows its own shape. */
    size:   { type: 'range', min: 0.5, max: 256, step: 0.5, default: 22, label: 'size px', group: 'look' },
    color:  { type: 'color', default: '#d9481c', label: 'dot colour', group: 'look', when: { sprites: null } },
    /** Its size at the end of its life, as a share of `size`, reached along `growEase`. */
    grow:     { type: 'range', min: 0, max: 4, step: 0.05, default: 0.2, label: 'size at its end ×', group: 'look' },
    growEase: easeParam({ default: 'linear', label: 'growing', group: 'look', when: { grow: { not: 1 } } }),
    /** Fading out over its life, so a particle leaves rather than blinks out. */
    fade:     { type: 'bool', default: true, label: 'fade over its life', group: 'look' },
    fadeEase: easeParam({ default: 'linear', label: 'fading', group: 'look', when: { fade: true } }),
    /**
     * Which way the particles stack: the newest over the ones before it, as
     * a spray comes towards you — or under them, as a trail or smoke does,
     * the older ones in front.
     */
    order: { type: 'enum', options: ['over', 'under'], default: 'over', display: 'chips',
             labels: { over: 'newest on top', under: 'newest behind' }, label: 'stacking', group: 'look' },
    ground: { type: 'ground', default: '#fffdf6', label: 'ground', group: 'look' },
    /**
     * px from the camera to the picture's plane: shorter is wider-angle, so
     * depth shows more. Nothing changes while every particle is at depth 0.
     */
    focal:  { type: 'range', min: 100, max: 5000, step: 10, default: 800, label: 'focal px', group: 'camera' },
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
