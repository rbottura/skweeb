/**
 * reach.js — a frozen worm's radius, drawn on the ground round it (M16b,
 * docs/worm.md): within it, the walker enters into phase.
 *
 * A ribbon laid on the sphere — each point gone `reach` along the ground
 * from the worm's foot, a hair over the ground — never a flat ring, which a
 * small planet would leave floating at its rim. Its light spectral.js's,
 * breathing (`breathe`), so a phase is seen from afar.
 *
 * Its geometry three's core: Node builds it (tests/3d-play.mjs).
 */

import { BufferGeometry, Float32BufferAttribute, Mesh, Vector3 } from '../../../core/libs/three/three.core.js';
import { spectral } from './spectral.js';

/** The ribbon's geometry: round `p` on the planet of `radius`, `reach` along the ground, `width` across. */
export function ribbonOf(p, radius, reach, { width = 0.12, segments = 96, over = 0.04 } = {}) {
  const up = p.clone().normalize();
  const e1 = new Vector3(1, 0, 0).addScaledVector(up, -up.x);
  if (e1.lengthSq() < 1e-6) e1.set(0, 0, 1).addScaledVector(up, -up.z);
  e1.normalize();
  const e2 = up.clone().cross(e1).normalize();
  const position = [], index = [];
  for (let i = 0; i <= segments; i++) {
    const a = (2 * Math.PI * i) / segments, dir = e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a));
    for (const d of [reach - width, reach + width]) {
      const angle = d / radius;
      position.push(...up.clone().multiplyScalar(Math.cos(angle)).addScaledVector(dir, Math.sin(angle)).multiplyScalar(radius + over).toArray());
    }
    if (i < segments) { const k = 2 * i; index.push(k, k + 1, k + 3, k, k + 3, k + 2); }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(position, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

export class Reach {
  constructor(colour = '#a6e3ff') {
    const { material, strength, tint } = spectral(colour, { edge: 0.5, core: 0.6 });
    this.strength = strength;
    this.tint = tint;
    this.mesh = new Mesh(new BufferGeometry(), material);
  }

  /** Laid round `p` on the planet of `radius`, `reach` units out. */
  lay(p, radius, reach) {
    this.mesh.geometry.dispose();
    this.mesh.geometry = ribbonOf(p, radius, reach);
    return this;
  }

  /** Its light at `seconds`: breathing, once in two seconds; `shown` 0 hides it. */
  breathe(seconds, shown = 1) { this.strength.value = shown * (0.55 + 0.25 * Math.sin(Math.PI * seconds)); }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
  }
}
