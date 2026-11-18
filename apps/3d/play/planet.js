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
 * Built again when its rows change; a bigger planet, past a few hundred
 * units, wants detail by distance (M16i).
 *
 * Pure: three's core only, Node runs it (tests/3d-play.mjs).
 */

import {
  Scene, Color, Mesh, IcosahedronGeometry, ConeGeometry, DodecahedronGeometry, InstancedMesh, MeshToonMaterial,
  DirectionalLight, HemisphereLight, Object3D, Vector3, Float32BufferAttribute,
} from '../../../core/libs/three/three.core.js';
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

const holder = new Object3D();
const Y = new Vector3(0, 1, 0);

export class Planet {
  constructor() {
    this.scene = new Scene();
    this.sky = new HemisphereLight('#ffffff', '#555555', 1.1);
    this.sun = new DirectionalLight('#ffffff', 1.6);
    this.sun.position.set(0.6, 1, 0.35).multiplyScalar(1000);
    this.scene.add(this.sky, this.sun);
    this.ground = null;
    this.things = [];
    this.radius = 0;
  }

  /** Built as `v` says: its radius, its things and their seed, its ground's and its sky's colours. */
  build(v) {
    this.dispose();
    const radius = this.radius = v.radius;
    const rng = makeRng(v.seed >>> 0);
    const ground = new Color(v.ground), sky = new Color(v.sky);
    this.scene.background = sky.clone();
    this.sky.color.copy(sky).lerp(new Color('#ffffff'), 0.5);
    this.sky.groundColor.copy(ground).multiplyScalar(0.5);

    const detail = Math.max(DETAIL[0], Math.min(DETAIL[1], Math.round(radius)));
    const geometry = new IcosahedronGeometry(radius, detail);
    const waves = wavesOf(rng), P = geometry.getAttribute('position'), colours = new Float32Array(P.count * 3);
    const n = new Vector3(), shade = new Color();
    for (let i = 0; i < P.count; i++) {
      n.fromBufferAttribute(P, i).normalize();
      shade.copy(ground).multiplyScalar(0.8 + 0.35 * patchAt(waves, n));
      colours.set([shade.r, shade.g, shade.b], i * 3);
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
    this.ground = new Mesh(geometry, new MeshToonMaterial({ vertexColors: true, gradientMap: rampOf(3) }));
    this.scene.add(this.ground);

    // Things: tufts most, stones the rest — each its place, its turn about its up and its size from the seed.
    const count = Math.max(0, Math.round(v.things));
    const tufts = Math.round(count * 0.7), stones = count - tufts;
    const kinds = [
      { count: tufts, geometry: new ConeGeometry(0.35, 1.1, 6).translate(0, 0.5, 0), colour: ground.clone().multiplyScalar(0.62) },
      { count: stones, geometry: new DodecahedronGeometry(0.45, 0).translate(0, 0.15, 0), colour: new Color('#9a9488') },
    ];
    for (const kind of kinds) {
      if (!kind.count) { kind.geometry.dispose(); continue; }
      const mesh = new InstancedMesh(kind.geometry, new MeshToonMaterial({ color: kind.colour, gradientMap: rampOf(3) }), kind.count);
      scatter(rng, kind.count).forEach((up, i) => {
        holder.position.copy(up).multiplyScalar(radius);
        holder.quaternion.setFromUnitVectors(Y, up);
        holder.rotateY(2 * Math.PI * rng());
        holder.scale.setScalar(0.5 + 1.3 * rng());
        holder.updateMatrix();
        mesh.setMatrixAt(i, holder.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.things.push(mesh);
      this.scene.add(mesh);
    }
    return this;
  }

  dispose() {
    for (const mesh of [this.ground, ...this.things]) {
      if (!mesh) continue;
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      if (mesh.isInstancedMesh) mesh.dispose();
    }
    this.ground = null;
    this.things = [];
  }
}
