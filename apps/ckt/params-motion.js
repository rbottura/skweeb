/**
 * params-motion.js — stage two's parameters, and so the recipe of every
 * still, loop and brush ckt saves.
 *
 * v2's second layer — the dataset list, the animation modes, the sprite panel,
 * the rotation and scale animations, the background, the zoom — laid out in
 * drawers (GROUPS below), the rarely touched ones closed. What is missing is
 * what never showed: v2's fill colour, tether lines, anchors, density and
 * radius belonged to the Matter renderer, which was switched off.
 *
 * Defaults, decided 2026-09-23: no attractor and no tether — a letter at rest —
 * turning at 2° a frame, and one loop is one turn (attractor.js loopFrames).
 */

import { defineParams } from '../../core/params.js';
import { frameParams }  from '../../core/frame.js';
import { PATH_IDS, PATH_LABELS } from './attractor.js';
import { ROTATE_IDS }   from './motion.js';

/** The motion panel's drawers, top to bottom. `format` is core's own. */
export const GROUPS = {
  sets:      { label: 'Dot-sets', open: true },
  legacy:    { label: 'Legacy dot-sets', open: false },
  mark:      { label: 'Sprites', open: true },
  rotation:  { label: 'Rotation', open: true },
  attractor: { label: 'Attractor', open: false },
  effects:   { label: 'Pulse & trail', open: false },
  player:    { label: 'Sequence player', open: true },
  ground:    { label: 'Ground', open: false },
};

/**
 * @param {object} datasetManifest   apps/ckt/dataset-manifest.json
 * @param {Array<{id, count}>} families  sprite families on this machine
 */
export function motionParams(datasetManifest, families) {
  const datasets = (datasetManifest.datasets || []).map(d => d.id);
  const datasetLabels = Object.fromEntries(
    (datasetManifest.datasets || []).map(d => [d.id, `${d.id} ${d.glyphs}`]));
  const familyIds = families.map(f => f.id);
  const frame = frameParams({ format: 'hd' });
  const moving = { path: ['circle', 'eight', 'square'] };

  return defineParams('ckt', {
    // ── Dot-sets ───────────────────────────────────────────────────────────

    /** A set made in stage one, or chosen from the vault. When set, it is drawn. */
    made: { type: 'object', accepts: ['dataset'], label: 'from the vault', group: 'sets' },

    /**
     * Which glyph — v2's up and down arrows, which still work and wrap round.
     * As many as stage one can cut from its widest range.
     */
    glyph: { type: 'int', min: 0, max: 1295, default: 0, label: 'glyph (↑ ↓)', group: 'sets' },

    /** The nine v2 shipped. Drawn when no made set is chosen. */
    dataset: {
      type: 'enum', options: datasets, default: datasets.includes('garam') ? 'garam' : datasets[0],
      display: 'chips', label: 'legacy dot-set', labels: datasetLabels, group: 'legacy',
    },

    // ── Sprites ────────────────────────────────────────────────────────────

    mark: {
      type: 'enum', options: ['sprite', 'dot'], default: familyIds.length ? 'sprite' : 'dot',
      display: 'chips', label: 'mark', group: 'mark',
    },

    /** A family on disk, or a vault set switched on as ckt sprites — shown by its title. */
    family: {
      type: 'enum', options: familyIds.length ? familyIds : ['none'],
      labels: Object.fromEntries(families.map(f => [f.id, f.label || f.id])),
      default: familyIds.includes('brushes') ? 'brushes' : (familyIds[0] || 'none'),
      label: 'family', group: 'mark', when: { mark: 'sprite' },
    },

    /** v2 opened on `sprites[8]` — the same file as `brushes` 8. Picked from a grid. */
    sprite: {
      type: 'sprite', family: 'family', default: 8, label: 'sprite',
      group: 'mark', when: { mark: 'sprite' },
    },

    /** A still or shape from the vault on every dot, instead of a family sprite. */
    shape: {
      type: 'object', accepts: ['still', 'shape'], label: 'sprite from the vault',
      group: 'mark', when: { mark: 'sprite' },
    },

    /**
     * v2's particle size: a scale on the sprite's own pixels, 0.01–2. Its
     * slider booted at 1 — a 360px sprite on every dot — but everything v2
     * published was around 0.05, small spheres a few pixels apart.
     */
    size: { type: 'range', min: 0.005, max: 2, step: 0.005, default: 0.05, label: 'size', group: 'mark' },

    /** For `dot`. v2's own particle colour, which it never got to show. */
    color: { type: 'color', default: '#e66465', label: 'dot colour', group: 'mark', when: { mark: 'dot' } },

    // ── Rotation — the loop's clock ────────────────────────────────────────

    /** v2's rotation modes: spin, face the attractor, stop. */
    rotate: {
      type: 'enum', options: ROTATE_IDS, default: 'spin', display: 'chips',
      label: 'rotate', group: 'rotation',
    },

    /**
     * Degrees a frame, and the loop: one loop is one turn at this speed, so
     * 2 is 180 frames. Negative turns the other way. v2 turned 2° a frame.
     */
    speed: {
      type: 'range', min: -20, max: 20, step: 0.25, default: 2,
      label: 'speed (°/frame)', group: 'rotation',
    },

    angle: { type: 'int', min: 0, max: 359, default: 0, label: 'angle', group: 'rotation' },

    // ── Attractor — off until you turn it on ──────────────────────────────

    /** v2's animation modes. `point` is its mouse mode and its stop. */
    path: {
      type: 'enum', options: PATH_IDS, default: 'off', display: 'chips',
      label: 'path', labels: PATH_LABELS, group: 'attractor',
    },

    /** Laps of the path per loop, so the loop still closes. */
    laps: {
      type: 'int', min: 1, max: 8, default: 1, label: 'laps per loop',
      group: 'attractor', when: moving,
    },

    /** Where `point` holds the attractor, as a fraction of the window. Drag on the canvas. */
    pointX: {
      type: 'range', min: 0, max: 1, step: 0.001, default: 0.5, label: 'point x',
      group: 'attractor', when: { path: 'point' },
    },
    pointY: {
      type: 'range', min: 0, max: 1, step: 0.001, default: 0.5, label: 'point y',
      group: 'attractor', when: { path: 'point' },
    },

    /** How far a dot leans from its place: v2's constraint length. 0 is at rest. */
    tether: {
      type: 'int', min: 0, max: 400, default: 0, label: 'tether',
      group: 'attractor', when: { path: { not: 'off' } },
    },

    // ── Pulse and trail ────────────────────────────────────────────────────

    /** Every sprite swells and shrinks together. */
    pulse: { type: 'bool', default: false, label: 'pulse', group: 'effects' },
    pulses: {
      type: 'int', min: 1, max: 16, default: 1, label: 'pulses per loop',
      group: 'effects', when: { pulse: true },
    },

    /** How small a pulse gets, as a share of size. Below 0 the sprites flip, as v2's did. */
    pulseMin: {
      type: 'range', min: -1, max: 1, step: 0.05, default: 0.4, label: 'pulse floor',
      group: 'effects', when: { pulse: true },
    },

    /** Frames drawn under this one, fading — v2's "don't clear the background", made finite. */
    trail: { type: 'int', min: 0, max: 120, default: 0, label: 'trail (frames)', group: 'effects' },

    /** Samples a frame along the trail: more is smoother and slower. */
    trailDensity: {
      type: 'int', min: 1, max: 4, default: 2, label: 'trail smoothness',
      group: 'effects', when: { trail: { not: 0 } },
    },

    // ── Time and ground ────────────────────────────────────────────────────

    fps: { type: 'int', min: 1, max: 60, default: 30, label: 'fps', group: 'player' },

    /** v2 drew on white, or on black in its dark mode; none is transparent. */
    ground: { type: 'ground', default: '#ffffff', label: 'ground', group: 'ground' },

    /**
     * The window. `hd` is 1920x1080, v2's own; zoom is v2's zoom; scale
     * multiplies the canvas. Width and height are always the window the
     * attractor moves in — with `ink` the output is then cropped to the dots.
     */
    ...frame,
    width:  { ...frame.width, default: 1920 },
    height: { ...frame.height, default: 1080 },
  });
}
