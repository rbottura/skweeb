/**
 * planet.js — the world the worm walks (M16a, docs/worm.md): "une sphère
 * comme sur mario galaxy", a sun, a sky.
 *
 * The ground is an icosphere, its triangles even all over — no pole where a
 * latitude's would bunch — of as many as its radius asks, within bounds; its
 * colour patched by a few long waves round it, so the eye sees it pass under
 * the worm. Things stand on it, tufts and stones, each turned and sized at
 * random — the seed's (rule 2): `makeRng`, the same planet every time. Toon
 * shaded in three bands, as the 3D app's style draws (look.js `rampOf`): a
 * sun from one side, the sky's light from all, so its night side is the
 * sky's colour dimmed, never black.
 *
 * Six holes in it, the ways into its heart (access.js), a rim round each,
 * nothing growing in them. Built again when its rows change; a bigger
 * planet, past a few hundred units, wants detail by distance (M16i).
 *
 * Pure: three's core only, Node runs it (tests/3d-play.mjs).
 */

import {
  Scene, Color, Mesh, IcosahedronGeometry, ConeGeometry, DodecahedronGeometry, InstancedMesh, MeshToonMaterial,
  DirectionalLight, HemisphereLight, Object3D, Vector3, Float32BufferAttribute, CircleGeometry, TorusGeometry,
  MeshBasicMaterial, Quaternion,
} from '../../../core/libs/three/three.core.js';
import { HOLLOW, WAYS } from './access.js';
import { makeRng } from '../../../core/rng.js';
import { rampOf } from '../look.js';

/** The icosphere's subdivisions: about one a unit of radius, within these. */
const DETAIL = [16, 72];

/** The long waves the ground's patches are summed from: a direction, a frequency and a phase each, from the seed. */
function wavesOf(rng) {
  return Array.from({ length: 6 }, (_, i) => {
    const z = 2 * rng() - 1, a = 2 * Math.PI * rng(), r = Math.sqrt(1 - z * z);
    return { d: new Vector3(r * Math.cos(a), r * Math.sin(a), z), f: 2 + 3 * i + 2 * rng(), phase: 2 * Math.PI * rng() };
  });
}

/** A patch's shade at a point of the unit sphere, 0 to 1. */
export function patchAt(waves, n) {
  let sum = 0;
  for (const w of waves) sum += Math.sin(w.d.dot(n) * w.f + w.phase);
  return 0.5 + sum / (2 * waves.length);
}

/** `count` points spread over the unit sphere, evenly on average, from `rng`. */
export function scatter(rng, count) {
  return Array.from({ length: count }, () => {
    const z = 2 * rng() - 1, a = 2 * Math.PI * rng(), r = Math.sqrt(1 - z * z);
    return new Vector3(r * Math.cos(a), r * Math.sin(a), z);
  });
}

/** What the ground grows: tufts most, stones the rest — their shapes, what the heart's matrix holds small (matrix.js). */
export const KINDS = [
  { name: 'tufts', shape: () => new ConeGeometry(0.35, 1.1, 6).translate(0, 0.5, 0), colour: '#4f6b43' },
  { name: 'stones', shape: () => new DodecahedronGeometry(0.45, 0).translate(0, 0.15, 0), colour: '#9a9488' },
];

const holder = new Object3D();
const Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);
const WHITE = new Color('#ffffff');

export class Planet {
  constructor() {
    this.scene = new Scene();
    this.sky = new HemisphereLight('#ffffff', '#555555', 1.1);
    this.sun = new DirectionalLight('#ffffff', 1.6);
    this.sun.position.set(0.6, 1, 0.35).multiplyScalar(1000);
    this.scene.add(this.sky, this.sun);
    this.ground = this.tufts = null;
    this.things = [];
    this.holes = [];         // the ways in: a hole and its rim each
    this.present = [];       // the kinds of thing it grows (`KINDS`)
    this.radius = 0;
    this.waves = [];         // the ground's patches' waves: the dune shades its patch by them (dune.js)
    this.look = '';
  }

  /** Built as `v` says: its radius, its things and their seed, its ground's and its sky's colours. */
  build(v) {
    this.dispose();
    const radius = this.radius = v.radius;
    const rng = makeRng(v.seed >>> 0);

    // The ground's patches are greys, its colour the reality's (`dress`): a passage turns it without a rebuild.
    const detail = Math.max(DETAIL[0], Math.min(DETAIL[1], Math.round(radius)));
    const geometry = new IcosahedronGeometry(radius, detail);
    const waves = this.waves = wavesOf(rng), P = geometry.getAttribute('position'), colours = new Float32Array(P.count * 3);
    const n = new Vector3();
    for (let i = 0; i < P.count; i++) {
      const k = 0.8 + 0.35 * patchAt(waves, n.fromBufferAttribute(P, i).normalize());
      colours.set([k, k, k], i * 3);
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
    this.ground = new Mesh(geometry, new MeshToonMaterial({ vertexColors: true, gradientMap: rampOf(3) }));
    this.scene.add(this.ground);

    // The ways into the heart: a hole each, a rim round it — as wide as a tunnel is for the worm's size.
    const size = v.size || 1, mouth = this.mouth = ((v.tunnel || 3.2) * size) / 2;
    for (const way of WAYS) {
      const facing = new Quaternion().setFromUnitVectors(Z, way.dir);
      const hole = new Mesh(new CircleGeometry(mouth, 48), new MeshBasicMaterial({ color: HOLLOW }));
      const rim = new Mesh(new TorusGeometry(mouth, 0.14 * size, 8, 48), new MeshToonMaterial({ color: '#8f877a', gradientMap: rampOf(3) }));
      hole.position.copy(way.dir).multiplyScalar(radius + 0.03);
      rim.position.copy(way.dir).multiplyScalar(radius);
      for (const m of [hole, rim]) { m.quaternion.copy(facing); this.holes.push(m); this.scene.add(m); }
    }
    const inHole = up => WAYS.some(w => radius * up.angleTo(w.dir) < mouth + 0.8 * size);

    // Things: tufts most, stones the rest — each its place, its turn about its up and its size from the seed.
    const count = Math.max(0, Math.round(v.things));
    const tufts = Math.round(count * 0.7), stones = count - tufts;
    const kinds = KINDS.map((k, i) => ({ ...k, count: i ? stones : tufts, geometry: k.shape(), colour: new Color(k.colour) }));
    this.present = KINDS.filter((k, i) => (i ? stones : tufts) > 0);
    for (const kind of kinds) {
      if (!kind.count) { kind.geometry.dispose(); continue; }
      const mesh = new InstancedMesh(kind.geometry, new MeshToonMaterial({ color: kind.colour, gradientMap: rampOf(3) }), kind.count);
      if (kind.name === 'tufts') this.tufts = mesh;
      scatter(rng, kind.count).forEach((up, i) => {
        holder.position.copy(up).multiplyScalar(radius);
        holder.quaternion.setFromUnitVectors(Y, up);
        holder.rotateY(2 * Math.PI * rng());
        holder.scale.setScalar((0.5 + 1.3 * rng()) * (inHole(up) ? 0 : 1));     // none grows in a hole
        holder.updateMatrix();
        mesh.setMatrixAt(i, holder.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.things.push(mesh);
      this.scene.add(mesh);
    }
    this.look = '';
    return this.dress({ ground: v.ground, sky: v.sky });
  }

  /**
   * Dressed in a reality's colours — its ground, its sky (M16b) — and dimmed by `dim`, 0 to 1, as a passage holds
   * the world still and the bridge's light shows. Only what changed is set again.
   */
  dress({ ground, sky }, dim = 0) {
    const key = `${ground}|${sky}|${dim.toFixed(3)}`;
    if (key === this.look) return this;
    this.look = key;
    const g = new Color(ground), s = new Color(sky);
    this.scene.background = s.clone().multiplyScalar(1 - 0.6 * dim);
    this.sky.color.copy(s).lerp(WHITE, 0.5).multiplyScalar(1 - 0.5 * dim);
    this.sky.groundColor.copy(g).multiplyScalar(0.5 * (1 - 0.5 * dim));
    this.sun.intensity = 1.6 * (1 - 0.55 * dim);
    if (this.ground) this.ground.material.color.copy(g);
    if (this.tufts) this.tufts.material.color.copy(g).multiplyScalar(0.62);
    return this;
  }

  dispose() {
    for (const mesh of [this.ground, ...this.things, ...this.holes]) {
      if (!mesh) continue;
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      if (mesh.isInstancedMesh) mesh.dispose();
    }
    this.ground = this.tufts = null;
    this.things = [];
    this.holes = [];
  }
}
