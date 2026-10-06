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
  Scene, Mesh, MeshStandardMaterial, DirectionalLight, AmbientLight, Box3, Sphere,
} from '../../core/libs/three/three.core.js';
import { SHAPES, shapeSchema, formKeys, finer } from './shapes.js';
import { MODIFIERS, modify } from './modifiers.js';
import { dress, bandsOf, outline, outlineOf, inkOf, inkUp, shade, shadowsOf } from './look.js';
import { direction } from './camera.js';
import { valuesFor } from '../../core/params.js';

const light = 'light';

/** The light's rows, for the app's schema; the ground under the model goes with them. */
export const LIGHT_PARAMS = {
  sun:       { type: 'range', min: 0, max: 12, step: 0.05, default: 2.6, label: 'sun', group: light },
  sunYaw:    { type: 'range', min: -180, max: 180, step: 0.5, default: -35, label: 'sun from °', group: light },
  sunPitch:  { type: 'range', min: -89, max: 89, step: 0.5, default: 50, label: 'sun raised °', group: light },
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

/** What a shape's geometry is made from — its form's values and its stack: equal, the same mesh kept. */
const formOf = (id, values, stack) => id + ':' + JSON.stringify([formKeys(id).map(k => values[k]), stack]);

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
   * @param {object} recipe   the app's values and `shapes: [{ id, params, on, modifiers }]`
   * @param {object} [print]  drawn above its own size (frames.js `sharper`): `detail`, the fewest segments a
   *                          smooth round shape is made with (shapes.js `finer`), and
   *                          `shadowMap`, the side of the sun's shadow map
   * @returns {Model} this
   */
  update(recipe, { detail = 0, shadowMap = 2048 } = {}) {
    const shapes = shapesOf(recipe);
    const bands = bandsOf(recipe);
    const lined = outlineOf(recipe) > 0;
    if (lined && !this.ink) this.ink = inkOf();
    if (this.ink) inkUp(this.ink, recipe);
    shapes.forEach(({ id, values, index, stack }, i) => {
      const made = finer(id, values, detail);
      const form = formOf(id, made, stack);
      let part = this.parts[i];
      if (!part) {
        part = this.parts[i] = { mesh: new Mesh(undefined, new MeshStandardMaterial()), form: '', index };
        this.scene.add(part.mesh);
      }
      part.index = index;
      if (part.form !== form) {
        if (part.mesh.geometry) part.mesh.geometry.dispose();
        part.mesh.geometry = modify(SHAPES[id].geometry(made), stack);
        part.form = form;
      }
      place(part.mesh, values);
      dress(part.mesh, id, values, bands);
      outline(part.mesh, id, lined ? this.ink : null);
    });
    for (const part of this.parts.splice(shapes.length)) {
      this.scene.remove(part.mesh);
      part.mesh.geometry.dispose();
      part.mesh.material.dispose();
    }

    const v = recipe || {};
    const d = direction(num(v.sunYaw, LIGHT_PARAMS.sunYaw.default), num(v.sunPitch, LIGHT_PARAMS.sunPitch.default));
    this.sun.position.set(d[0] * 10, d[1] * 10, d[2] * 10);
    this.sun.target.position.set(0, 0, 0);
    this.sun.intensity = num(v.sun, LIGHT_PARAMS.sun.default);
    this.fill.intensity = num(v.ambient, LIGHT_PARAMS.ambient.default);
    shade(this, shadowsOf(recipe), shadowMap);
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
    for (const part of this.parts) {
      part.mesh.geometry.dispose();
      part.mesh.material.dispose();
    }
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
