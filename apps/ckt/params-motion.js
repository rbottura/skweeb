/**
 * params-motion.js — stage two's parameters, and so the recipe of every
 * still, loop and brush ckt saves.
 *
 * v2's second layer: the dataset list, the animation modes, the sprite panel,
 * the rotation and scale animations, the background toggle, the zoom. What
 * is missing is what never showed: v2's fill colour, tether lines, anchors,
 * density and radius all belonged to the Matter renderer, and that renderer
 * was switched off (`// Render.run(render)`).
 */

import { defineParams } from '../../core/params.js';
import { frameParams }  from '../../core/frame.js';
import { PATH_IDS, PATH_LABELS } from './attractor.js';
import { ROTATE_IDS }   from './motion.js';

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

  return defineParams('ckt', {
    // ── The dots ───────────────────────────────────────────────────────────

    /** v2's radio list of nine. */
    dataset: {
      type: 'enum', options: datasets, default: datasets.includes('garam') ? 'garam' : datasets[0],
      display: 'chips', label: 'dataset', labels: datasetLabels,
    },

    /** A dataset made in stage one. When set, it is drawn instead of `dataset`. */
    made: { type: 'object', accepts: ['dataset'], label: 'made in dots' },

    /**
     * Which glyph — v2's up and down arrows, which still work and wrap round
     * as v2's did. As many as stage one can cut from its widest range.
     */
    glyph: { type: 'int', min: 0, max: 1295, default: 0, label: 'glyph (↑ ↓)' },

    // ── The attractor ──────────────────────────────────────────────────────

    /** v2's animation modes. `point` is its mouse mode and its stop. */
    path: {
      type: 'enum', options: PATH_IDS, default: 'circle',
      display: 'chips', label: 'attractor', labels: PATH_LABELS,
    },

    /** Where `point` holds the attractor, as a fraction of the window. Drag on the canvas. */
    pointX: { type: 'range', min: 0, max: 1, step: 0.001, default: 0.5, label: 'point x' },
    pointY: { type: 'range', min: 0, max: 1, step: 0.001, default: 0.5, label: 'point y' },

    /**
     * How far a dot leans from its place: v2's constraint length, 1–200. Its
     * slider booted at the middle, 101.
     */
    tether: { type: 'int', min: 0, max: 400, default: 100, label: 'tether' },

    // ── The mark ───────────────────────────────────────────────────────────

    mark: {
      type: 'enum', options: ['sprite', 'dot'], default: familyIds.length ? 'sprite' : 'dot',
      display: 'chips', label: 'mark',
    },

    family: {
      type: 'enum', options: familyIds.length ? familyIds : ['none'],
      default: familyIds.includes('brushes') ? 'brushes' : (familyIds[0] || 'none'),
      label: 'family',
    },

    /** v2 opened on `sprites[8]` — the same file as `brushes` 8. */
    sprite: { type: 'int', min: 0, max: 999, default: 8, label: 'sprite' },

    /** A still or shape from the vault on every dot, instead of a family sprite. */
    shape: { type: 'object', accepts: ['still', 'shape'], label: 'sprite from vault' },

    /**
     * v2's particle size: a scale on the sprite's own pixels, 0.01–2. Its
     * slider booted at 1 — a 360px sprite on every dot — but everything v2
     * published was around 0.05, small spheres a few pixels apart.
     */
    size: { type: 'range', min: 0.005, max: 2, step: 0.005, default: 0.05, label: 'size' },

    /** For `dot`. v2's own particle colour, which it never got to show. */
    color: { type: 'color', default: '#e66465', label: 'dot colour' },

    // ── Turning and pulsing ────────────────────────────────────────────────

    /** v2's rotation modes: spin, face the attractor, stop. */
    rotate: {
      type: 'enum', options: ROTATE_IDS, default: 'spin', display: 'chips', label: 'rotate',
    },

    /**
     * Whole turns per loop, so the loop closes. v2 turned 2° a frame, which
     * over its circle's 314 frames is 1.7 turns.
     */
    turns: { type: 'int', min: -16, max: 16, default: 2, label: 'turns' },

    angle: { type: 'int', min: 0, max: 359, default: 0, label: 'angle' },

    /** v2's scale animation: all sprites grow and shrink together, through zero. */
    pulse:  { type: 'bool', default: false, label: 'pulse' },
    pulses: { type: 'int', min: 1, max: 16, default: 1, label: 'pulses' },

    // ── Time ───────────────────────────────────────────────────────────────

    /**
     * Frames drawn under this one, oldest first — v2's "don't clear the
     * background", made finite so the loop still closes.
     */
    trail: { type: 'int', min: 0, max: 240, default: 0, label: 'trail' },

    /** One loop, in frames. v2's circle went round in 314 at 60fps: 5.2 seconds. */
    period: { type: 'int', min: 2, max: 1200, default: 150, label: 'loop frames' },
    fps:    { type: 'int', min: 1, max: 60, default: 30, label: 'fps' },

    // ── Ground and frame ───────────────────────────────────────────────────

    /** v2 drew on white, or on black in its dark mode. */
    ground: { type: 'color', default: '#ffffff', label: 'ground' },
    transparent: { type: 'bool', default: false, label: 'no ground' },

    /**
     * The window. `hd` is 1920x1080, v2's own; `zoom` is v2's zoom slider,
     * scaling about the middle. Width and height are always the window the
     * attractor moves in — with `ink` the output is then cropped to the dots.
     */
    ...frame,
    width:  { ...frame.width, default: 1920 },
    height: { ...frame.height, default: 1080 },
  });
}
