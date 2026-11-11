/**
 * scene.js — a recipe as a three.js scene, kept in step with it.
 *
 * A model is its shapes and one light (docs/object-model.md, `model`). This
 * builds the scene those make and keeps it: `update(recipe)` again moves,
 * turns and recolours what is there, and makes a shape's geometry again only
 * when its form changed — its own params or its stack of modifiers
 * (modifiers.js) — so a drag that turns a box does not rebuild it, and lets
 * three free what goes. A shape or a modifier that is off is not drawn; one
 * its catalogue does not know is named (`unknownIn`), never thrown on, so an
 * old recipe still opens in a newer app and the other way round. How each
 * shape is dressed — its material, under the model's style — is look.js's.
 *
 * The light: a sun, from a direction fixed in the world — so turning round
 * the model shows its dark side — and an ambient fill. Its intensities are
 * three's physical ones: a white face square to a sun of π is white.
 *
 * Only three.core.js: a scene needs no GPU until it is drawn (renderer.js),
 * and Node runs this (tests/3d-model.mjs).
 */

import {
  Scene, Mesh, InstancedMesh, InstancedBufferAttribute, MeshStandardMaterial, DirectionalLight, AmbientLight, Box3, Sphere,
} from '../../core/libs/three/three.core.js';
import { inksOf } from './palettes.js';
import { pointsOf } from './emitters.js';
import { Evolution, forcesOn, forceKey } from './forces.js';
import { SHAPES, shapeSchema, formKeys, finer } from './shapes.js';
import { MODIFIERS, modify } from './modifiers.js';
import { dress, bandsOf, outline, outlineOf, inkOf, inkUp, shade, shadowsOf } from './look.js';
import { direction } from './camera.js';
import { valuesFor } from '../../core/params.js';

const light = 'light';

/** The light's rows, for the app's schema; the ground under the model goes with them. */
export const LIGHT_PARAMS = {
  sun:       { type: 'range', min: 0, max: 12, step: 0.05, default: 2.6, label: 'sun', group: light },
  sunYaw:    { type: 'range', min: -180, max: 180, step: 0.5, default: -35, label: 'sun from', unit: '°', group: light },
  sunPitch:  { type: 'range', min: -89, max: 89, step: 0.5, default: 50, label: 'sun raised', unit: '°', group: light },
  ambient:   { type: 'range', min: 0, max: 6, step: 0.05, default: 1, label: 'ambient', group: light },
  ground:    { type: 'ground', default: '#fffdf6', label: 'ground', group: light },
};

const RAD = Math.PI / 180;

/**
 * The shapes a recipe draws, in order, each with its values coerced by its
 * schema, its `index` in the recipe's list — its card's, hidden ones counted
 * — and its stack: the modifiers on and known, in order, theirs coerced too.
 */
export function shapesOf(recipe) {
  const out = [];
  ((recipe && recipe.shapes) || []).forEach((entry, index) => {
    if (!entry || entry.on === false || !SHAPES[entry.id]) return;
    const stack = (Array.isArray(entry.modifiers) ? entry.modifiers : [])
      .filter(m => m && m.on !== false && MODIFIERS[m.id])
      .map(m => ({ id: m.id, values: valuesFor(MODIFIERS[m.id].params, m.params || {}) }));
    out.push({ id: entry.id, values: valuesFor(shapeSchema(entry.id), entry.params || {}), index, stack });
  });
  return out;
}

/** The ids a recipe names that the catalogues do not have — shapes, and modifiers on the shapes known. */
export function unknownIn(recipe) {
  const out = [];
  for (const e of (recipe && recipe.shapes) || []) {
    if (!e || !SHAPES[e.id]) { out.push((e && e.id) || '?'); continue; }
    for (const m of Array.isArray(e.modifiers) ? e.modifiers : []) if (!m || !MODIFIERS[m.id]) out.push((m && m.id) || '?');
  }
  return out;
}

/**
 * What a shape's geometry is made from — its form's values and its stack, and what came from the vault beside
 * them, a palette's colours and an emitter's points (counted, not written out): equal, the same mesh kept.
 */
const formOf = (id, values, stack) => id + ':' + JSON.stringify([formKeys(id).map(k => values[k]), values.inks || null,
  values.points ? values.points.list.length : 0, stack]);

export class Model {
  constructor() {
    this.scene = new Scene();
    this.sun = new DirectionalLight(0xffffff, LIGHT_PARAMS.sun.default);
    this.fill = new AmbientLight(0xffffff, LIGHT_PARAMS.ambient.default);
    this.scene.add(this.sun, this.sun.target, this.fill);
    /** One per shape drawn, in the recipe's order: { mesh, form, index } — `index` its place in the recipe's list. */
    this.parts = [];
    /** The outline's material and its uniforms, and the shadows' catcher, once asked for (look.js). */
    this.ink = null;
    this.catcher = null;
  }

  /** How many shapes are drawn. */
  get count() { return this.parts.length; }

  /** The part drawn for the recipe's `index`-th shape, or null — hidden, unknown, or not there. */
  partAt(index) {
    return this.parts.find(p => p.index === index) || null;
  }

  /**
   * Bring the scene into step with a recipe.
   * @param {object} recipe   the app's values and `shapes: [{ id, params, on, modifiers }]` — and `elapsed`, a
   *                          frame's time under its clouds' forces (motion.js `seenAt`)
   * @param {object} [print]  drawn above its own size (frames.js `sharper`): `detail`, the fewest segments a
   *                          smooth round shape is made with (shapes.js `finer`), and
   *                          `shadowMap`, the side of the sun's shadow map
   * @returns {Model} this
   */
  update(recipe, { detail = 0, shadowMap = 2048 } = {}) {
    const shapes = shapesOf(recipe);
    const bands = bandsOf(recipe);
    const lined = outlineOf(recipe) > 0;
    const elapsed = Math.max(0, Number(recipe && recipe.elapsed) || 0);
    if (lined && !this.ink) this.ink = inkOf();
    if (this.ink) inkUp(this.ink, recipe);
    shapes.forEach(({ id, values, index, stack }, i) => {
      const shape = SHAPES[id];
      // A palette of the vault the shape names, its colours beside its values once read (palettes.js); the object
      // a cloud is born on, its points (emitters.js) — the draw called again when either comes.
      const inks = values.colours ? inksOf(values.colours, this.onInks) : null;
      const points = shape.instanced && values.emitter === 'object' ? pointsOf(values.from, values.glyph, this.onInks) : null;
      const made = { ...finer(id, values, detail), ...(inks ? { inks } : {}), ...(points ? { points } : {}) };
      const form = formOf(id, made, stack);
      let part = this.parts[i];
      if (part && part.instanced !== !!shape.instanced) {       // a cloud where a mesh was, or the other way
        free(this.scene, part);
        part = null;
      }
      if (!part) {
        part = this.parts[i] = { mesh: null, form: '', index, instanced: !!shape.instanced };
        if (!shape.instanced) this.scene.add(part.mesh = new Mesh(undefined, new MeshStandardMaterial()));
      }
      part.index = index;
      if (part.form !== form) {
        if (shape.instanced) dotsUp(this.scene, part, shape, made, stack);
        else {
          if (part.mesh.geometry) part.mesh.geometry.dispose();
          part.mesh.geometry = modify(shape.geometry(made), stack);
        }
        part.form = form;
      }
      place(part.mesh, values);
      if (part.instanced) placeDots(part, values, elapsed);
      dress(part.mesh, id, values, bands);
      outline(part.mesh, id, lined ? this.ink : null);
    });
    for (const part of this.parts.splice(shapes.length)) free(this.scene, part);

    return this.light(recipe || {}, { shadowMap });
  }

  /**
   * The light from the values — the sun's way and strength, the fill, the shadows fitted to them: the last
   * of `update`, and alone a turntable's frame, the sun turned with the eye (motion.js).
   * @returns {Model} this
   */
  light(v, { shadowMap = 2048 } = {}) {
    const d = direction(num(v.sunYaw, LIGHT_PARAMS.sunYaw.default), num(v.sunPitch, LIGHT_PARAMS.sunPitch.default));
    this.sun.position.set(d[0] * 10, d[1] * 10, d[2] * 10);
    this.sun.target.position.set(0, 0, 0);
    this.sun.intensity = num(v.sun, LIGHT_PARAMS.sun.default);
    this.fill.intensity = num(v.ambient, LIGHT_PARAMS.ambient.default);
    shade(this, shadowsOf(v), shadowMap);
    this.scene.updateMatrixWorld(true);
    return this;
  }

  /**
   * The sphere round every shape drawn, as the scene stands — what the view
   * frames (camera.js `frameAround`) — or null with nothing drawn.
   *
   * @returns {?{centre: number[], radius: number}}
   */
  bounds() {
    const box = new Box3();
    // By every vertex: a twisted box's own box, turned, would frame it loose.
    for (const part of this.parts) box.expandByObject(part.mesh, true);
    if (box.isEmpty()) return null;
    const sphere = box.getBoundingSphere(new Sphere());
    return { centre: sphere.center.toArray(), radius: sphere.radius };
  }

  /** Let three free every geometry and material: the GPU's copies go with them. */
  dispose() {
    for (const part of this.parts) free(null, part);
    this.parts = [];
    if (this.ink) this.ink.material.dispose();
    if (this.catcher) {
      this.catcher.geometry.dispose();
      this.catcher.material.dispose();
    }
  }
}

/** Where a shape stands, how it is turned, how big: its size times its stretch along each of its axes. */
function place(mesh, v) {
  mesh.position.set(v.x, v.y, v.z);
  mesh.rotation.set(v.turnX * RAD, v.turnY * RAD, v.turnZ * RAD);
  mesh.scale.set(v.size * v.sx, v.size * v.sy, v.size * v.sz);
}

/** A part out of the scene, and three told to free what it held — an instanced mesh its matrices and colours too. */
function free(scene, part) {
  if (!part.mesh) return;
  if (scene) scene.remove(part.mesh);
  part.mesh.geometry.dispose();
  part.mesh.material.dispose();
  letGo(part.mesh);
}

/** A cloud's instances let go of, its outline's with them (look.js `outline`): the matrices they share. */
function letGo(mesh) {
  if (!mesh.isInstancedMesh) return;
  if (mesh.userData.hull) mesh.userData.hull.dispose();
  mesh.dispose();
}

/**
 * A cloud's dots made again (cloud.js): one InstancedMesh, its geometry one dot's, a colour for each — the
 * material kept from the mesh before it, so the look stays as it was dressed. Its matrices are `placeDots`'.
 */
function dotsUp(scene, part, shape, made, stack) {
  const dots = shape.dots(made, stack);
  const old = part.mesh, room = Math.max(1, dots.count);
  const mesh = new InstancedMesh(shape.geometry(made), old ? old.material : new MeshStandardMaterial(), room);
  mesh.count = dots.count;
  mesh.visible = dots.count > 0;
  const colours = new Float32Array(room * 3);
  colours.set(dots.colours);
  mesh.instanceColor = new InstancedBufferAttribute(colours, 3);
  if (old) {
    scene.remove(old);
    old.geometry.dispose();
    letGo(old);
  }
  scene.add(mesh);
  Object.assign(part, { mesh, dots, stretch: '', evolution: null });
}

/**
 * Each dot's matrix: where it is in the cloud — at rest, or `elapsed` seconds under its forces (forces.js) — its
 * size divided by the cloud's stretch, which the mesh's own scale multiplies back, so a stretch moves the dots
 * apart and a dot stays round (cloud.js). Made again only when the dots, the stretch or the time change.
 */
function placeDots(part, v, elapsed = 0) {
  const moving = elapsed > 0 && forcesOn(v);
  const evolution = moving ? evolutionOf(part, v) : null;
  const key = `${v.sx},${v.sy},${v.sz}|${moving ? `${elapsed}|${evolution.key}` : ''}`;
  if (part.stretch === key) return;
  part.stretch = key;
  const { mesh, dots } = part, a = mesh.instanceMatrix.array;
  const centres = moving ? evolution.at(elapsed) : dots.centres;
  const kx = 1 / (v.sx || 1), ky = 1 / (v.sy || 1), kz = 1 / (v.sz || 1);
  for (let k = 0; k < dots.count; k++) {
    const r = dots.radii[k], o = k * 16;
    a.fill(0, o, o + 16);
    a[o] = r * kx; a[o + 5] = r * ky; a[o + 10] = r * kz; a[o + 15] = 1;
    a[o + 12] = centres[k * 3]; a[o + 13] = centres[k * 3 + 1]; a[o + 14] = centres[k * 3 + 2];
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.boundingBox = null;
  mesh.boundingSphere = null;
}

/** A cloud's evolution from rest, kept while its dots and forces are: a frame on goes on from the one before. */
function evolutionOf(part, v) {
  const key = forceKey(v);
  if (!part.evolution || part.evolution.key !== key) part.evolution = new Evolution(part.dots, v);
  return part.evolution;
}

/**
 * The other way: a mesh moved by a handle (handles.js) as the values of the
 * shape it was — only those its `mode` changes, so a move never writes a turn
 * a rounding away from the card's. Stretched by `XYZ`, every axis alike, it is
 * the size; by one axis or two, their stretches, the size kept.
 *
 * @param {object} mesh
 * @param {object} values                    the shape's values before
 * @param {'translate'|'rotate'|'scale'} mode
 * @param {string} [axis='XYZ']              the handle's: X, Y, Z, XY, YZ, XZ or XYZ
 * @returns {object}                         values to set on its card
 */
export function placeOf(mesh, values, mode, axis = 'XYZ') {
  if (mode === 'translate') return { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
  if (mode === 'rotate') return { turnX: mesh.rotation.x / RAD, turnY: mesh.rotation.y / RAD, turnZ: mesh.rotation.z / RAD };
  if (axis === 'XYZ') return { size: mesh.scale.x / values.sx };
  const out = {};
  for (const a of 'xyz') if (axis.includes(a.toUpperCase())) out['s' + a] = mesh.scale[a] / values.size;
  return out;
}

const num = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
