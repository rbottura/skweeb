/**
 * scene.js — a recipe as a three.js scene, kept in step with it.
 *
 * A model is its shapes and one light (docs/object-model.md, `model`). This
 * builds the scene those make and keeps it: `update(recipe)` again moves,
 * turns and recolours what is there, and makes a shape's geometry again only
 * when its form changed — a drag that turns a box does not rebuild it — and
 * lets three free what goes. A shape that is off is not drawn; one the
 * catalogue does not know is named (`unknownIn`), never thrown on, so an old
 * recipe still opens in a newer app and the other way round.
 *
 * The light: a sun, from a direction fixed in the world — so turning round
 * the model shows its dark side — and an ambient fill. Its intensities are
 * three's physical ones: a white face square to a sun of π is white.
 *
 * Only three.core.js: a scene needs no GPU until it is drawn (renderer.js),
 * and Node runs this (tests/3d-model.mjs).
 */

import {
  Scene, Mesh, MeshStandardMaterial, DirectionalLight, AmbientLight,
  DoubleSide, FrontSide, Box3, Sphere,
} from '../../core/libs/three/three.core.js';
import { SHAPES, shapeSchema, formKeys } from './shapes.js';
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
 * schema and its `index` in the recipe's list — its card's, hidden ones counted.
 */
export function shapesOf(recipe) {
  const out = [];
  ((recipe && recipe.shapes) || []).forEach((entry, index) => {
    if (!entry || entry.on === false || !SHAPES[entry.id]) return;
    out.push({ id: entry.id, values: valuesFor(shapeSchema(entry.id), entry.params || {}), index });
  });
  return out;
}

/** The ids a recipe names that the catalogue does not have. */
export function unknownIn(recipe) {
  return ((recipe && recipe.shapes) || []).filter(e => !e || !SHAPES[e.id]).map(e => (e && e.id) || '?');
}

/** What a shape's geometry is made from: equal keys, the same mesh kept. */
const formOf = (id, values) => id + ':' + JSON.stringify(formKeys(id).map(k => values[k]));

export class Model {
  constructor() {
    this.scene = new Scene();
    this.sun = new DirectionalLight(0xffffff, LIGHT_PARAMS.sun.default);
    this.fill = new AmbientLight(0xffffff, LIGHT_PARAMS.ambient.default);
    this.scene.add(this.sun, this.sun.target, this.fill);
    /** One per shape drawn, in the recipe's order: { mesh, form, index } — `index` its place in the recipe's list. */
    this.parts = [];
  }

  /** How many shapes are drawn. */
  get count() { return this.parts.length; }

  /** The part drawn for the recipe's `index`-th shape, or null — hidden, unknown, or not there. */
  partAt(index) {
    return this.parts.find(p => p.index === index) || null;
  }

  /**
   * Bring the scene into step with a recipe.
   * @param {object} recipe   the app's values and `shapes: [{ id, params, on }]`
   * @returns {Model} this
   */
  update(recipe) {
    const shapes = shapesOf(recipe);
    shapes.forEach(({ id, values, index }, i) => {
      const form = formOf(id, values);
      let part = this.parts[i];
      if (!part) {
        part = this.parts[i] = { mesh: new Mesh(undefined, new MeshStandardMaterial()), form: '', index };
        this.scene.add(part.mesh);
      }
      part.index = index;
      if (part.form !== form) {
        if (part.mesh.geometry) part.mesh.geometry.dispose();
        part.mesh.geometry = SHAPES[id].geometry(values);
        part.form = form;
      }
      place(part.mesh, values);
      look(part.mesh.material, id, values);
    });
    for (const part of this.parts.splice(shapes.length)) {
      this.scene.remove(part.mesh);
      part.mesh.geometry.dispose();
      part.mesh.material.dispose();
    }

    const v = recipe || {};
    const d = direction(num(v.sunYaw, LIGHT_PARAMS.sunYaw.default), num(v.sunPitch, LIGHT_PARAMS.sunPitch.default));
    this.sun.position.set(d[0] * 10, d[1] * 10, d[2] * 10);
    this.sun.intensity = num(v.sun, LIGHT_PARAMS.sun.default);
    this.fill.intensity = num(v.ambient, LIGHT_PARAMS.ambient.default);
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
    for (const part of this.parts) box.expandByObject(part.mesh);
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
  }
}

/** Where a shape stands, how it is turned, how big. */
function place(mesh, v) {
  mesh.position.set(v.x, v.y, v.z);
  mesh.rotation.set(v.turnX * RAD, v.turnY * RAD, v.turnZ * RAD);
  mesh.scale.setScalar(v.size);
}

/** Its colour and shading; a plane is seen from both sides. */
function look(material, id, v) {
  material.color.set(v.colour);
  material.roughness = 0.75;
  material.metalness = 0;
  const flat = v.shading === 'flat';
  const side = id === 'plane' ? DoubleSide : FrontSide;
  if (material.flatShading !== flat || material.side !== side) {
    material.flatShading = flat;
    material.side = side;
    material.needsUpdate = true;
  }
}

const num = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
