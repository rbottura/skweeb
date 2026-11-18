/**
 * matrix.js — the planet's matrix, in its heart (docs/worm.md, the heart):
 * "une sphère flottante translucide en plein centre (matrice de planète)
 * qui semble faite d'un liquide visqueux, présentant flottant à l'intérieur
 * la version itémisée des éléments qu'on peut trouver sur et dans la
 * planète".
 *
 * A sphere at the heart's middle in a node material (three's TSL, WebGPU
 * and WebGL2 alike): see-through, its edges brighter as they turn from the
 * eye, its surface breathing in long slow waves — a liquid too thick to
 * splash. Inside it, one of each thing the planet's ground grows, small
 * (planet.js `KINDS`): a stone, a tuft — each drifting round where it
 * floats and turning, slowly, as in honey. What the worm puts in it, along the
 * appendage, floats there too, a card of its picture turned to the eye
 * (M16p); and is let out again.
 *
 * Pure but for its material, three's node one: Node runs it (tests/3d-heart.mjs).
 */

import { Group, Mesh, SphereGeometry, MeshToonMaterial, Color, Vector3 } from '../../../core/libs/three/three.core.js';
import { MeshBasicNodeMaterial, TSL } from '../../../core/libs/three/three.webgpu.js';
import { rampOf } from '../look.js';
import { cardOf } from './finds.js';

const { uniform, time, positionLocal, normalLocal, normalView, positionViewDirection, dot, abs, pow, oneMinus, float, clamp, sin, mix } = TSL;

/** A viscous material of `colour`: see-through, brighter at its edges, its surface breathing `wobble` deep. */
export function viscous(colour, { wobble = 0.15 } = {}) {
  const tint = uniform(new Color(colour));
  const material = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const p = positionLocal;
  const breath = sin(p.x.mul(1.7).add(time.mul(0.6))).mul(sin(p.y.mul(1.3).add(time.mul(0.45)))).mul(sin(p.z.mul(1.5).add(time.mul(0.5))));
  material.positionNode = p.add(normalLocal.mul(breath.mul(float(wobble))));
  const edge = pow(oneMinus(clamp(abs(dot(normalView, positionViewDirection)), 0, 1)), float(2));
  material.colorNode = mix(tint.mul(0.6), tint.mul(1.5).add(0.12), edge);
  material.opacityNode = float(0.4).add(edge.mul(0.45));
  return { material, tint };
}

/** Where item `i` of `n` floats: spread round the middle, the golden angle apart, `r` out. */
function homeOf(i, n, r) {
  if (n === 1) return new Vector3(0, 0, 0);
  const y = 1 - (2 * (i + 0.5)) / n, a = i * Math.PI * (3 - Math.sqrt(5)), s = Math.sqrt(1 - y * y);
  return new Vector3(Math.cos(a) * s, y, Math.sin(a) * s).multiplyScalar(r);
}

export class Matrix {
  constructor() {
    this.group = new Group();
    this.ball = null;
    this.items = [];          // { mesh, home, axis, phase }
    this.held = [];           // what was put in it: { item, mesh, home, phase }
    this.radius = 0;
    this.seconds = 0;
  }

  /** Built `radius` round in `colour`, one of each of `kinds` floating in it — a tuft in the reality's ground. */
  build({ radius, colour = '#ffb347' }, kinds = [], { ground = '#7fae6b' } = {}) {
    this.dispose();
    this.radius = radius;
    this.ball = new Mesh(new SphereGeometry(radius, 72, 54), viscous(colour, { wobble: 0.05 * radius }).material);
    this.ball.renderOrder = 2;
    this.group.add(this.ball);
    kinds.forEach((kind, i) => {
      const tone = kind.name === 'tufts' ? new Color(ground).multiplyScalar(0.62) : new Color(kind.colour);
      const mesh = new Mesh(kind.shape().center(), new MeshToonMaterial({ color: tone, gradientMap: rampOf(3) }));
      mesh.scale.setScalar(0.24 * radius);
      const home = homeOf(i, kinds.length, 0.4 * radius);
      mesh.position.copy(home);
      this.items.push({ mesh, home, axis: new Vector3(Math.sin(i * 2.1), 1, Math.cos(i * 1.3)).normalize(), phase: i * 1.9 });
      this.group.add(mesh);
    });
    return this;
  }

  /** `item` put in it: a card of its picture — `load(url)`'s, or plain — floating with the planet's things. */
  hold(item, load = null) {
    const r = this.radius, i = this.held.length, mesh = cardOf(item, 0.42 * r, load);
    const home = new Vector3(Math.cos(i * 2.4) * 0.3 * r, (0.22 - 0.15 * (i % 4)) * r, Math.sin(i * 2.4) * 0.3 * r);
    this.held.push({ item, mesh, home, phase: 3 + i * 1.3 });
    mesh.position.copy(home);
    this.group.add(mesh);
    return this;
  }

  /** What was put in it `i`th let out: its card gone; the item, or null. */
  release(i) {
    const h = this.held.splice(i, 1)[0];
    if (!h) return null;
    this.group.remove(h.mesh);
    h.mesh.geometry.dispose();
    if (h.mesh.material.map) h.mesh.material.map.dispose();
    h.mesh.material.dispose();
    return h.item;
  }

  /** `dt` on: each thing drifting round where it floats, and turning — slowly, as in honey; what was put in turned to `eye`. */
  update(dt, eye = null) {
    this.seconds += dt;
    const t = this.seconds, r = 0.08 * this.radius;
    for (const it of [...this.items, ...this.held]) {
      const a = t * 0.35 + it.phase;
      it.mesh.position.copy(it.home).add(new Vector3(Math.sin(a) * r, Math.sin(a * 0.7 + 1) * r, Math.cos(a * 0.8) * r));
      if (it.axis) it.mesh.rotateOnAxis(it.axis, 0.25 * dt);
      else if (eye) it.mesh.lookAt(eye);
    }
  }

  dispose() {
    while (this.held.length) this.release(0);
    for (const m of [this.ball, ...this.items.map(it => it.mesh)]) {
      if (!m) continue;
      this.group.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    this.ball = null;
    this.items = [];
  }
}
