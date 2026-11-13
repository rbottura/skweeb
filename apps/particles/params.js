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
import { LAYERS } from '../../core/layers.js';
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

/** The picture panel's drawers — the Format in the viewer since S14b, its layers the Stack's since L13b. */
export const PICTURE_GROUPS = {
  player: { label: 'Sequence player', open: true },
  look:   { label: 'Look', open: true },
  camera: { label: 'Camera', open: false },
};

const D = DEFAULTS;
const STREAM = { mode: 'stream' };
const BURST = { mode: 'burst' };

/** `slider: true` keeps a slider under its box, as the bench kept these six (S2, 2026-11-03). */
export function emitParams() {
  return defineParams('particles', {
    mode:    { type: 'enum', options: ['stream', 'burst'], default: D.mode, display: 'chips', label: 'mode', group: 'emission' },
    rate:    { type: 'range', min: 1, max: 2000, step: 1, default: 90, label: 'a second', group: 'emission', when: STREAM, slider: true },
    count:   { type: 'int', min: 1, max: 5000, default: D.count, label: 'at once', group: 'emission', when: BURST },
    /** A stream's loop, in the picture's frames: its period is frames / fps. */
    frames:  { type: 'int', min: 2, max: 1200, default: 60, label: 'loop, frames', group: 'emission', when: STREAM },
    prewarm: { type: 'bool', default: D.prewarm, label: 'full from the first frame', group: 'emission', when: STREAM, more: true },
    jitter:  { type: 'range', min: 0, max: 1, step: 0.01, default: D.jitter, label: 'birth jitter', group: 'emission', when: STREAM, more: true },
    x:       { type: 'int', min: -4000, max: 4000, default: D.x, label: 'x from centre', group: 'emission', pair: 'y', pairLabel: 'from centre', axis: 'x' },
    y:       { type: 'int', min: -4000, max: 4000, default: 260, label: 'y from centre', group: 'emission', axis: 'y' },
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
    extent:    { type: 'range', min: 1, max: 2000, step: 1, default: D.extent, label: 'length · radius · size', unit: 'px',
                 group: 'emission', when: { shape: { not: 'point' } } },
    lineAngle: { type: 'range', min: -180, max: 180, step: 1, default: D.lineAngle, label: 'line angle', unit: '°',
                 group: 'emission', when: { shape: 'line' } },
    /** An object emitter turned round its centre, clockwise (model.js `spotOf`). */
    objectAngle: { type: 'range', min: -180, max: 180, step: 1, default: D.objectAngle, label: 'object angle', unit: '°',
                   group: 'emission', when: { shape: 'object' } },
    aim:       { type: 'enum', options: ['fixed', 'outward'], default: D.aim, display: 'chips', label: 'launch',
                 labels: { fixed: 'as the angle', outward: 'outward' }, group: 'emission',
                 when: { shape: ['disc', 'ring', 'object'] } },

    speed:       { type: 'range', min: 0, max: 3000, step: 1, default: 140, label: 'speed', unit: 'px/s', group: 'launch', slider: true },
    speedSpread: { type: 'range', min: 0, max: 1, step: 0.01, default: D.speedSpread, label: 'speed spread', group: 'launch' },
    angle:       { type: 'range', min: -180, max: 180, step: 1, default: D.angle, label: 'angle ° from up', group: 'launch' },
    spread:      { type: 'range', min: 0, max: 360, step: 1, default: 36, label: 'cone', unit: '°', group: 'launch', slider: true },

    life:       { type: 'range', min: 0.05, max: 20, step: 0.05, default: 1.4, label: 'life', unit: 's', group: 'life', slider: true },
    lifeSpread: { type: 'range', min: 0, max: 1, step: 0.01, default: D.lifeSpread, label: 'life spread', group: 'life' },

    gravity: { type: 'range', min: -3000, max: 3000, step: 1, default: -260, label: 'gravity', unit: 'px/s²', group: 'forces', slider: true },
    wind:    { type: 'range', min: -3000, max: 3000, step: 1, default: D.wind, label: 'wind', unit: 'px/s²', group: 'forces' },
    drag:    { type: 'range', min: 0, max: 20, step: 0.05, default: 1.2, label: 'drag', unit: '/s', group: 'forces' },

    /**
     * Pulls that depend on where a particle is (forces.js): round a centre,
     * towards it, and along curl noise. Any of them on, each particle is
     * integrated from its birth — slower, and every frame still its own.
     */
    vortex:     { type: 'range', min: -3000, max: 3000, step: 1, default: D.vortex, label: 'vortex', unit: 'px/s²', group: 'fields' },
    attract:    { type: 'range', min: -3000, max: 3000, step: 1, default: D.attract, label: 'attract', unit: 'px/s²', group: 'fields' },
    /** The vortex's and the pull's reach round their centre: 0 is everywhere, at full strength (forces.js `reach`). */
    falloff:    { type: 'range', min: 0, max: 4000, step: 1, default: D.falloff, label: 'reach px (0: everywhere)', group: 'fields' },
    fx:         { type: 'int', min: -4000, max: 4000, default: D.fx, label: 'centre x', group: 'fields', pair: 'fy', pairLabel: 'centre', axis: 'x' },
    fy:         { type: 'int', min: -4000, max: 4000, default: D.fy, label: 'centre y', group: 'fields', axis: 'y' },
    noise:      { type: 'range', min: 0, max: 5000, step: 1, default: D.noise, label: 'curl noise', unit: 'px/s²', group: 'fields' },
    noiseScale: { type: 'range', min: 4, max: 2000, step: 1, default: D.noiseScale, label: 'noise size', unit: 'px',
                  group: 'fields', when: { noise: { not: 0 } } },
    /**
     * A field from another object, asked of the app that made it
     * (core/fields.js) — M7's link, `fractal → particles: a field`: escape
     * time points at its set. Its pull, and turned: 0 towards what it points
     * at, 180 away, 90 round it.
     */
    fieldFrom: { type: 'object', accepts: ['still', 'sequence'], label: 'a field from', group: 'fields' },
    fieldPull: { type: 'range', min: -3000, max: 3000, step: 1, default: 300, label: 'its pull', unit: 'px/s²', group: 'fields',
                 when: { fieldFrom: { not: null } } },
    fieldTurn: { type: 'range', min: -180, max: 180, step: 1, default: D.fieldTurn, label: 'its pull turned', unit: '°',
                 group: 'fields', when: { fieldFrom: { not: null } } },

    /**
     * Out of the picture's plane (model.js, *Depth*): the emitter's depth,
     * and the cone tilted into depth — the picture's camera turns it into
     * size and place. Both 0, the particles are flat, as before.
     */
    z:           { type: 'int', min: -2000, max: 4000, default: D.z, label: 'emitter depth', unit: 'px', group: 'depth' },
    depthSpread: { type: 'range', min: 0, max: 180, step: 1, default: D.depthSpread, label: 'into depth', unit: '°', group: 'depth' },

    /** Facing where it goes — a spark, a streak — instead of turning on its own. */
    align:      { type: 'bool', default: D.align, label: 'face where it goes', group: 'turning' },
    turn:       { type: 'range', min: 0, max: 360, step: 1, default: D.turn, label: 'start angle spread', unit: '°', group: 'turning', when: { align: false } },
    spin:       { type: 'range', min: -1080, max: 1080, step: 1, default: D.spin, label: 'spin', unit: '°/s', group: 'turning', when: { align: false } },
    spinSpread: { type: 'range', min: 0, max: 1, step: 0.01, default: D.spinSpread, label: 'spin spread', group: 'turning', when: { align: false } },
  });
}

/**
 * A picture's values from before L13 (2026-11-12), its overlay — G3's nine rows — its first layer, word for
 * word: in front or behind the particles, fitted, sized, moved, turned, see-through, blended, as it was drawn.
 * Anything else as it is; what has no overlay row, untouched.
 */
export function overlayAsLayer(p) {
  if (!p || typeof p !== 'object' || !('overlay' in p)) return p;
  const { overlay, overlayAt, overlayFit, overlayScale, overlayX, overlayY, overlayAngle, overlayOpacity, overlayBlend, ...rest } = p;
  if (typeof overlay !== 'string' || !overlay) return rest;
  const layer = { ref: overlay, on: true, at: overlayAt === 'behind' ? 'behind' : 'front', fit: overlayFit === 'fill' ? 'fill' : 'whole',
    scale: overlayScale > 0 ? overlayScale : 1, x: overlayX || 0, y: overlayY || 0, rot: overlayAngle || 0,
    opacity: overlayOpacity ?? 1, blend: overlayBlend || 'normal' };
  return { ...rest, layers: [layer, ...(Array.isArray(rest.layers) ? rest.layers : [])] };
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
     * through core/uses.js — or one sprite, a shape, a still or a 3D model,
     * for every particle; or a loop's frames in time, a flipbook (M15e); a
     * smart object binding one followed at its versions (L11). None: dots,
     * in `color`.
     */
    sprites: { type: 'object', accepts: ['set', 'shape', 'still', 'model', 'sequence'], use: 'particles', label: 'sprites', group: 'look' },
    /**
     * Which of them a particle wears: one, all its life, by a draw of its own
     * (`pick`) — or each in turn, the frame of its age (M15e): a surface
     * dissolving over a life, every particle on its own clock. A loop chosen
     * turns it to its age, anything else back (main.js).
     */
    wears:   { type: 'enum', options: ['pick', 'age'], default: 'pick', display: 'chips',
               labels: { pick: 'one each', age: 'the frame of its age' }, label: 'a particle wears', group: 'look',
               when: { sprites: { not: null } } },
    /**
     * A palette of the vault (V1, docs/workshop.md): each particle one of its
     * colours, by a draw of its own, the same all its life (model.js `dye`) —
     * a dot filled with it, a sprite printed in it (dye.js). None: a dot in
     * `color`, a sprite in its own colours.
     */
    palette: { type: 'object', accepts: ['palette'], label: 'palette', group: 'look' },
    /** A sprite in a palette's colour: its darks take it and its lights stay — or flat, a silhouette. */
    tint:    { type: 'enum', options: ['tones', 'flat'], default: 'tones', display: 'chips',
               labels: { tones: 'keeps its tones', flat: 'flat' }, label: 'on a sprite', group: 'look',
               when: { palette: { not: null }, sprites: { not: null } } },
    /** Each particle its own size between two, by a draw of its own (model.js `gauge`) — or all of them `size`. */
    sizeRandom: { type: 'bool', default: false, label: 'random size', group: 'look' },
    /** A dot's width, or a sprite's: its height follows its own shape. */
    size:   { type: 'range', min: 0.5, max: 256, step: 0.5, default: 22, label: 'size', unit: 'px', group: 'look', slider: true, when: { sizeRandom: false } },
    sizeMin: { type: 'range', min: 0.5, max: 256, step: 0.5, default: 10, label: 'size min', group: 'look',
               pair: 'sizeMax', pairLabel: 'size from, to', unit: 'px', axis: '↓', when: { sizeRandom: true } },
    sizeMax: { type: 'range', min: 0.5, max: 256, step: 0.5, default: 40, label: 'size max', group: 'look', axis: '↑', when: { sizeRandom: true } },
    color:  { type: 'color', default: '#d9481c', label: 'dot colour', group: 'look', when: { sprites: null, palette: null } },
    /** Its size at the end of its life, as a share of `size`, reached along `growEase`. */
    grow:     { type: 'range', min: 0, max: 4, step: 0.05, default: 0.2, label: 'size at its end', unit: '×', group: 'look' },
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
    focal:  { type: 'range', min: 100, max: 5000, step: 10, default: 800, label: 'focal', unit: 'px', group: 'camera' },
    /**
     * Its layers, the Stack section's (core/layers.js, L13b): the overlay of G3 made a list — a poster's type
     * over its particles, to work the composition. Particles draws them itself (draw.js), behind ones between
     * its ground and its particles, as its overlay was.
     */
    layers: { ...LAYERS, behind: 'behind the particles, over the ground' },
  }, { upgrade: overlayAsLayer });     // a recipe from before: its overlay its first layer
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
