/**
 * params.js — the puppet's schema: what it wears, and how the author's eyes
 * are cut from the camera and worn at its eyestalks' tips.
 *
 * The drawing is a gamepad still, rigged the puppet's way — each stroke's
 * part found, or told (roles.js) — or a pose or a loop the rig saved, worn
 * as saved (wear.js). An eye is a box round the
 * author's eye, `around` eye widths a side (eyes.js), drawn at its tip
 * `eye size` times as wide as the tip is drawn, fading at its edge (crop.js),
 * held steady (steady.js) — shown as a mirror shows the author, and kept
 * level however the head leans, unless asked otherwise. The mouth is cut
 * the same way (mouth.js), wider than tall, and worn on the face — the
 * body's top — or lower down it (tips.js). The head moves the
 * drawing (sway.js): the body sways as it leans and turns, the drawing
 * rises as it nods, the stalks and arms wobble after it. The ground is
 * `none` for OBS's Browser source, which composites what is transparent,
 * or a colour to key out of a captured window.
 */

import { defineParams } from '../../../core/params.js';

/** The drawers. */
export const GROUPS = {
  wear: { label: 'Wearing', open: true },
  parts: { label: 'Parts', open: true },
  eyes: { label: 'My eyes', open: true },
  mouth: { label: 'My mouth', open: true },
  move: { label: 'Moving with me', open: true },
  obs:  { label: 'For OBS', open: true },
};

export function puppetParams() {
  return defineParams('puppet', {
    /** A gamepad drawing with its eyestalks drawn from the head out — or a pose or loop the rig saved of one. */
    drawing: { type: 'object', accepts: ['still', 'sequence'], label: 'drawing', group: 'wear' },
    /** A gamepad drawing's strokes cut into bones this long at most, so the body bends along it; a rig's pose keeps its own. */
    longest: { type: 'range', min: 20, max: 400, step: 5, log: true, default: 70, label: 'longest bone, px', group: 'wear' },
    /** What each stroke is, told — body, eye or limb, a word a stroke in drawing order, comma between, empty where found (roles.js). */
    parts:   { type: 'text', default: '', label: 'told, a word a stroke', group: 'parts' },

    /** An eye on the avatar, as wide as its stalk's tip times this. */
    eyeSize: { type: 'range', min: 0.2, max: 4, step: 0.05, default: 1, label: 'eye size, × the tip', group: 'eyes' },
    /** How much of the face round an eye is cut with it, in eye widths: the lids, a little skin. */
    around:  { type: 'range', min: 1, max: 4, step: 0.05, default: 1.8, label: 'around the eye, × its width', group: 'eyes' },
    /** The share of an eye's radius that fades out. */
    soft:    { type: 'range', min: 0, max: 1, step: 0.01, default: 0.4, label: 'soft edge', group: 'eyes' },
    /** 0 follows every tremble of the face's points; 1 holds so still that a slow nod drifts. */
    steady:  { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'steadiness', group: 'eyes' },
    /** The eyes as a mirror shows them: the camera's right-hand eye on the left. */
    mirror:  { type: 'bool', default: true, label: 'as in a mirror', group: 'eyes' },
    /** Cut level with the line through both eyes, so a lean of the head stays out of them. */
    level:   { type: 'bool', default: true, label: 'kept level', group: 'eyes' },

    /** The author's mouth on the face — the body's last stamp, its top. */
    mouth:       { type: 'bool', default: true, label: 'my mouth on the face', group: 'mouth' },
    /** The mouth on the avatar, as wide as the face times this. */
    mouthSize:   { type: 'range', min: 0.1, max: 3, step: 0.05, default: 0.6, label: 'mouth size, × the face', group: 'mouth', when: { mouth: true } },
    /** How much of the face round the mouth is cut with it, in closed mouths: room to smile and to open. */
    mouthAround: { type: 'range', min: 1, max: 3, step: 0.05, default: 1.7, label: 'around the mouth, × its width', group: 'mouth', when: { mouth: true } },
    /** The mouth moved down the body from the face, in face widths — up when below 0. */
    mouthLower:  { type: 'range', min: -1, max: 2, step: 0.05, default: 0, label: 'mouth lower, × the face', group: 'mouth', when: { mouth: true } },

    /** How far the body bends as the head leans, turns and moves aside — 1 a little, 0 not at all. */
    sway:    { type: 'range', min: 0, max: 2, step: 0.05, default: 1, label: 'sway with my head', group: 'move' },
    /** How far the drawing rises as the head looks up, and sinks as it looks down. */
    nod:     { type: 'range', min: 0, max: 2, step: 0.05, default: 1, label: 'rise as I nod', group: 'move' },
    /** How loosely the eyestalks and the arms swing after a move: 0 settles at once, 1 swings long. */
    wobble:  { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'wobble', group: 'move' },

    /** Under the avatar: none for OBS's Browser source; a colour to key out of a captured window. */
    ground:  { type: 'ground', default: 'none', label: 'ground', group: 'obs' },
  });
}
