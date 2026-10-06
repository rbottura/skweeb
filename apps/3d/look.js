/**
 * look.js — how the shapes are drawn: their materials, and the model's
 * style over them (M10's brick 4). Toon shading on a ramp first; an outline
 * and shadows to come.
 *
 * A shape's colour, and whether it is flat or smooth, are its own
 * (shapes.js, its card's *Look*). The style is the model's, in the panel's
 * Style drawer:
 *
 * - `toon`, the bands of light. At 0 a shape is three's physical shading, as
 *   it always was; at 1 to 6 it is a MeshToonMaterial whose gradient map is
 *   a ramp of that many steps, so the sun falls on it in flat bands — each
 *   step's level the middle of its band, so the brightest stays under white
 *   where the physical shading would, and one band is a shape in one flat
 *   colour, a sprite's.
 * - `outline`, ink round every shape, in thousandths of the picture's
 *   height, and its colour. An inverted hull, as three's toon outline pass
 *   draws one: each shape again, its back faces only, pushed out on the
 *   picture along its normals — normals smoothed where a box's edge splits
 *   them, so a corner has no gap. The push is a share of the picture, never
 *   pixels, so the same line comes back at any print scale. A plane, with no
 *   inside, has none.
 * - `shadows`: the shapes cast them on each other and on a catcher under
 *   the model, which is nothing but its shadows (`shade`).
 *
 * three.core.js, and the node material three.webgpu.js gives the hull —
 * neither reaches a GPU until drawn: Node runs it (tests/3d-look.mjs).
 */

import {
  Mesh, MeshStandardMaterial, MeshToonMaterial, ShadowMaterial, DataTexture, RGBAFormat, NearestFilter,
  DoubleSide, FrontSide, BackSide, Color, Float32BufferAttribute, PlaneGeometry, Box3, Sphere,
} from '../../core/libs/three/three.core.js';
import { NodeMaterial, TSL } from '../../core/libs/three/three.webgpu.js';
import { copiesOf } from './deform.js';

const style = 'style';

/** The style's rows, for the app's schema. */
export const STYLE_PARAMS = {
  toon: { type: 'int', min: 0, max: 6, default: 0, label: 'bands of light — 0, smooth', group: style },
  outline: { type: 'range', min: 0, max: 20, step: 0.5, default: 0, label: 'outline, thousandths of its height', group: style },
  ink: { type: 'color', default: '#111111', label: 'outline colour', group: style, when: { outline: { not: 0 } } },
  shadows: { type: 'bool', default: false, label: 'shadows, on a ground of their own', group: style },
};

/** The bands a recipe asks for, whatever it holds: 0 to 6. */
export const bandsOf = recipe => Math.max(0, Math.min(6, Math.round(Number(recipe && recipe.toon) || 0)));

const ramps = new Map();

/** A ramp of `n` steps, one texel each, made once and shared: every model's toon reads the same. */
export function rampOf(n) {
  if (!ramps.has(n)) {
    const data = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) {
      const level = Math.round(((i + 0.5) / n) * 255);
      data.set([level, level, level, 255], i * 4);
    }
    const ramp = new DataTexture(data, n, 1, RGBAFormat);
    ramp.magFilter = ramp.minFilter = NearestFilter;
    ramp.generateMipmaps = false;
    ramp.needsUpdate = true;
    ramps.set(n, ramp);
  }
  return ramps.get(n);
}

/**
 * A shape's mesh dressed as its values and the style say: a toon for bands,
 * three's standard otherwise — the old material freed when the kind changes.
 * Its colour, flat or smooth; a plane seen from both sides.
 */
export function dress(mesh, id, values, bands) {
  const toon = bands > 0;
  if (!!mesh.material.isMeshToonMaterial !== toon) {
    mesh.material.dispose();
    mesh.material = toon ? new MeshToonMaterial() : new MeshStandardMaterial();
  }
  const m = mesh.material;
  m.color.set(values.colour);
  if (toon) {
    if (m.gradientMap !== rampOf(bands)) {
      m.gradientMap = rampOf(bands);
      m.needsUpdate = true;
    }
  } else {
    m.roughness = 0.75;
    m.metalness = 0;
  }
  const flat = values.shading === 'flat';
  const side = id === 'plane' ? DoubleSide : FrontSide;
  if (m.flatShading !== flat || m.side !== side) {
    m.flatShading = flat;
    m.side = side;
    m.needsUpdate = true;
  }
}

// ── The outline ─────────────────────────────────────────────────────────────

const { attribute, cameraProjectionMatrix, modelViewMatrix, positionLocal, vec2, vec4, normalize, uniform } = TSL;

/** The outline a recipe asks for, in thousandths of the picture's height: 0 to 20. */
export const outlineOf = recipe => Math.max(0, Math.min(20, Number(recipe && recipe.outline) || 0));

/**
 * One model's ink: a node material for its shapes' hulls, and the uniforms
 * the style sets on it — its width on the picture, the picture's
 * proportions, its colour. The vertex is moved on the picture itself, after
 * the camera: along its normal's way there, by a share of the height.
 */
export function inkOf() {
  const width = uniform(0), aspect = uniform(1), colour = uniform(new Color('#111111'));
  const material = new NodeMaterial();
  material.name = 'outline';
  material.side = BackSide;
  const mvp = cameraProjectionMatrix.mul(modelViewMatrix);
  const at = mvp.mul(vec4(positionLocal, 1));
  const out = mvp.mul(vec4(positionLocal.add(attribute('hull', 'vec3')), 1));
  // The normal's way on the picture, in its proportions — a hair off zero where it points at the eye.
  const way = vec2(out.x.div(out.w).sub(at.x.div(at.w)).mul(aspect), out.y.div(out.w).sub(at.y.div(at.w))).add(vec2(1e-7, 0));
  const dir = normalize(way);
  material.vertexNode = vec4(at.xy.add(vec2(dir.x.div(aspect), dir.y).mul(width).mul(at.w)), at.z, at.w);
  material.colorNode = vec4(colour, 1);
  return { material, width, aspect, colour };
}

/** The ink set as a recipe asks: `outline` thousandths of the height — two thousandths of the picture's ±1. */
export function inkUp(ink, recipe) {
  ink.width.value = outlineOf(recipe) * 0.002;
  ink.aspect.value = recipe && recipe.width > 0 && recipe.height > 0 ? recipe.width / recipe.height : 1;
  ink.colour.value.set((recipe && recipe.ink) || STYLE_PARAMS.ink.default);
}

/** Normals shared by a point's copies — a box's corner one direction — for a hull to push along. */
export function hullNormals(geometry) {
  const nor = geometry.attributes.normal;
  const out = new Float32Array(nor.count * 3);
  for (const group of copiesOf(geometry)) {
    const s = [0, 0, 0];
    for (const i of group) { s[0] += nor.getX(i); s[1] += nor.getY(i); s[2] += nor.getZ(i); }
    const l = Math.hypot(s[0], s[1], s[2]) || 1;
    for (const i of group) out.set([s[0] / l, s[1] / l, s[2] / l], i * 3);
  }
  return new Float32BufferAttribute(out, 3);
}

/**
 * A shape's hull — shown with an outline, hidden without, none for a plane —
 * a child of its mesh, so it stands where the shape does, sharing its
 * geometry, which gets its smoothed normals the first time.
 */
export function outline(mesh, id, ink) {
  let hull = mesh.userData.hull;
  if (!ink || id === 'plane') {
    if (hull) hull.visible = false;
    return;
  }
  const g = mesh.geometry;
  if (!g.attributes.hull) g.setAttribute('hull', hullNormals(g));
  if (!hull) {
    hull = mesh.userData.hull = new Mesh(g, ink.material);
    mesh.add(hull);
  }
  hull.geometry = g;
  hull.material = ink.material;
  hull.visible = true;
}

// ── Shadows ─────────────────────────────────────────────────────────────────

/** Whether a recipe asks for shadows. */
export const shadowsOf = recipe => !!(recipe && recipe.shadows === true);

/**
 * A model's shadows: every shape casting and receiving them, the sun's
 * shadow camera fitted round the model from where the sun is, and a catcher
 * under the model — a ground made only of the shadows on it, so a model on a
 * ground of `none` still has its shadow, a sprite's. The sun keeps its way;
 * only where it stands moves, to the model's middle. The shadow map is the
 * same size at any print scale, so a print is the same picture.
 */
export function shade(model, on) {
  for (const p of model.parts) {
    p.mesh.castShadow = on;
    p.mesh.receiveShadow = on;
  }
  model.sun.castShadow = on;
  const box = new Box3();
  if (on) for (const p of model.parts) box.expandByObject(p.mesh);
  if (!on || box.isEmpty()) {
    if (model.catcher) model.catcher.visible = false;
    return;
  }
  const { center: c, radius } = box.getBoundingSphere(new Sphere());
  const r = Math.max(radius, 1e-3);
  const way = model.sun.position.clone().sub(model.sun.target.position).normalize();
  model.sun.target.position.copy(c);
  model.sun.position.copy(c).addScaledVector(way, r * 3);
  const cam = model.sun.shadow.camera;
  cam.left = cam.bottom = -r * 1.2;
  cam.right = cam.top = r * 1.2;
  cam.near = r * 0.5;
  cam.far = r * 5 + (c.y - box.min.y) / Math.max(0.1, way.y);
  cam.updateProjectionMatrix();
  model.sun.shadow.mapSize.set(2048, 2048);
  model.sun.shadow.bias = -0.0005;
  model.sun.shadow.normalBias = r * 0.004;
  if (!model.catcher) {
    model.catcher = new Mesh(new PlaneGeometry(1, 1), new ShadowMaterial({ opacity: 0.35 }));
    model.catcher.rotation.x = -Math.PI / 2;
    model.catcher.receiveShadow = true;
    model.scene.add(model.catcher);
  }
  model.catcher.visible = true;
  model.catcher.position.set(c.x, box.min.y - r * 1e-3, c.z);
  model.catcher.scale.setScalar(r * 10);
}
