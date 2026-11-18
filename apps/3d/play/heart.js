/**
 * heart.js — the planet's heart, in 3D again (docs/worm.md, the heart):
 * "une fois sorti dans le cœur, on repasse en 3D, fov plus large pour un
 * espace plus réduit".
 *
 * A hollow `heart` round at the planet's middle, walked on the inside of
 * its wall, its up the heart's middle (walker.js `inside`) — the planet's
 * ground the other way round. The six tunnels' mouths on its wall, where
 * the ways in are above it, each a way back into its cut (section.js). Lit
 * from its middle, where the matrix floats (matrix.js), and dimly from all
 * round; its wall the reality's earth.
 *
 * Pure: three's core only, Node runs it (tests/3d-heart.mjs).
 */

import {
  Scene, Mesh, SphereGeometry, CircleGeometry, TorusGeometry, MeshToonMaterial, MeshBasicMaterial, HemisphereLight,
  PointLight, Color, BackSide, Vector3, Quaternion,
} from '../../../core/libs/three/three.core.js';
import { rampOf } from '../look.js';
import { HOLLOW, WAYS } from './access.js';

const Z = new Vector3(0, 0, 1);
/** The earth's colour, a share of the ground's: the strata's deepest (section.js). */
const EARTH = 0.4;

export class Heart {
  constructor() {
    this.scene = new Scene();
    this.scene.background = new Color('#0d0b10');
    this.glow = new PointLight('#ffe9c4', 2.4, 0, 0);
    this.sky = new HemisphereLight('#c9b8ff', '#3a2a20', 0.8);
    this.scene.add(this.glow, this.sky);
    this.parts = [];
    this.wall = null;
    this.radius = 0;
  }

  /** Built `heart` round, its mouths `width` wide, a rim round each as thick as the worm's `size` asks. */
  build({ heart, width, size = 1 }, reality) {
    this.dispose();
    this.radius = heart;
    const add = m => { this.parts.push(m); this.scene.add(m); return m; };
    this.wall = add(new Mesh(new SphereGeometry(heart, 96, 64), new MeshToonMaterial({ side: BackSide, gradientMap: rampOf(3) })));
    // A flat mouth on a hollow's wall: its middle stood off the wall by the wall's curve under it, its edge on it.
    const r = width / 2, off = heart - Math.sqrt(Math.max(0, heart * heart - r * r)) + 0.03;
    for (const way of WAYS) {
      const facing = new Quaternion().setFromUnitVectors(Z, way.dir.clone().negate());
      const hole = add(new Mesh(new CircleGeometry(r, 48), new MeshBasicMaterial({ color: HOLLOW })));
      const rim = add(new Mesh(new TorusGeometry(r, 0.14 * size, 8, 48), new MeshToonMaterial({ color: '#8f877a', gradientMap: rampOf(3) })));
      for (const m of [hole, rim]) { m.position.copy(way.dir).multiplyScalar(heart - off); m.quaternion.copy(facing); }
    }
    return this.dress(reality);
  }

  /** Its wall in a reality's earth. */
  dress({ ground }) {
    if (this.wall) this.wall.material.color.copy(new Color(ground).multiplyScalar(EARTH));
    return this;
  }

  dispose() {
    for (const m of this.parts) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.parts = [];
    this.wall = null;
  }
}
