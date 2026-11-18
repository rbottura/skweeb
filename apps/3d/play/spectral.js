/**
 * spectral.js — light that is not matter (M16b, docs/worm.md): a material
 * bright at a body's edges and see-through where the body faces the eye — a
 * *fresnel* — added to what is behind it. A shell's, a ghost's, a radius's.
 *
 * A node material (three's TSL), so the WebGPU renderer and its WebGL2
 * fallback both draw it: the light at a point is how far its normal turns
 * from the eye, raised to `edge`, over a little of its own (`core`) — times
 * `strength`, a uniform the frame sets, 0 nothing at all.
 */

import { MeshBasicNodeMaterial, TSL } from '../../../core/libs/three/three.webgpu.js';
import { AdditiveBlending, DoubleSide, Color } from '../../../core/libs/three/three.core.js';

const { uniform, normalView, positionViewDirection, dot, abs, pow, oneMinus, float, clamp } = TSL;

/**
 * A spectral material of `colour`, and its two uniforms: `strength`, 0 to 1 and past, and `tint`.
 *
 * @returns {{ material: MeshBasicNodeMaterial, strength: object, tint: object }}
 */
export function spectral(colour = '#a6e3ff', { edge = 2.2, core = 0.14 } = {}) {
  const strength = uniform(0), tint = uniform(new Color(colour));
  const material = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });
  const facing = clamp(abs(dot(normalView, positionViewDirection)), 0, 1);
  material.colorNode = tint.mul(pow(oneMinus(facing), float(edge)).add(float(core)).mul(strength));
  return { material, strength, tint };
}
