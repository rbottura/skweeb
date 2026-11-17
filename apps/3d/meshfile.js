/**
 * meshfile.js — a model out as meshes (G5, 2026-11-17): a binary glTF, a
 * `.glb`, each shape its place, its colour or its skin — and an OBJ, the
 * shapes' surfaces alone.
 *
 * The author, the drawn body made: the model out of the suite — to Blender,
 * a game's engine, a print in three dimensions. A `.glb` is a header, its
 * JSON and one buffer, so it is written here, as a PNG is in core/png.js;
 * nothing is vendored for it. glTF is metres and y up, as the world is.
 *
 * What leaves is the model at rest — no turntable, no swing, a cloud's dots
 * where they were born — every shape shown, its stack applied: a node each,
 * its place as a matrix, and a mesh — positions, normals, a drawn body's uv
 * and a grid's colours where they are; a cloud's dots baked into one mesh,
 * each dot its colour. A material each: its colour; unlit, as
 * KHR_materials_unlit says; a drawn body's skin its picture, a PNG in the
 * file. Not kept: flat shading — its normals are smooth — the outline, the
 * light and the shadows: a glTF's viewer brings its own. The OBJ has no
 * places: each point is where the place puts it, its uv kept, no colour.
 *
 * Pure but for `png`, handed in: three.core and numbers (tests/3d-meshfile.mjs).
 */

import { Color, Matrix3, Matrix4, Vector3, DoubleSide } from '../../core/libs/three/three.core.js';

/** A cloud baked past this many points is left out of the file, and said so. */
export const MOST_POINTS = 3_000_000;

/**
 * The shapes of a model as pieces to write: a name, its arrays — every point
 * already in its shape's own frame, a cloud's dots baked — its node's matrix,
 * its material.
 *
 * @param {{parts: Array<{mesh: object, index: number, form: string}>}} model   scene.js's Model, updated
 * @returns {{pieces: object[], left: string[]}}  `left` the shapes too big to write
 */
export function piecesOf(model) {
  const pieces = [], left = [];
  for (const part of model.parts) {
    const mesh = part.mesh;
    if (!mesh || !mesh.geometry) continue;
    const id = String(part.form || '').split(':')[0] || 'shape';
    const name = `${id}-${part.index}`;
    const g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv, C = g.attributes.color;
    const index = g.index ? Uint32Array.from(g.index.array) : Uint32Array.from({ length: P.count }, (_, i) => i);
    mesh.updateMatrix();
    const m = mesh.material;
    const material = {
      color: m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1],
      unlit: !!m.isMeshBasicMaterial, doubleSided: m.side === DoubleSide,
      map: m.map && m.map.image ? m.map.image : null, wrap: m.map ? [m.map.wrapS, m.map.wrapT] : null,
    };
    let position = Float32Array.from(P.array), normal = N ? Float32Array.from(N.array) : new Float32Array(P.count * 3);
    let color = C ? rgbOf(C) : null, uv = UV ? Float32Array.from(UV.array) : null, idx = index;
    if (mesh.isInstancedMesh) {
      const n = mesh.count;
      if (n * P.count > MOST_POINTS) { left.push(name); continue; }
      ({ position, normal, color, idx } = baked(mesh, position, normal, index, n));
      uv = null;
      material.color = [1, 1, 1];
    }
    pieces.push({ name, position, normal: unit(normal), uv, color, index: idx, matrix: mesh.matrix.elements.slice(), material });
  }
  return { pieces, left };
}

/** A colour attribute's red, green and blue, whatever its width. */
function rgbOf(C) {
  const out = new Float32Array(C.count * 3);
  for (let i = 0; i < C.count; i++) { out[3 * i] = C.getX(i); out[3 * i + 1] = C.getY(i); out[3 * i + 2] = C.getZ(i); }
  return out;
}

/** Normals of length one; none, where a point had none — a fold to nothing — up the way it faces z. */
function unit(normal) {
  for (let i = 0; i < normal.length; i += 3) {
    const l = Math.hypot(normal[i], normal[i + 1], normal[i + 2]);
    if (l > 1e-12) { normal[i] /= l; normal[i + 1] /= l; normal[i + 2] /= l; } else { normal[i] = 0; normal[i + 1] = 0; normal[i + 2] = 1; }
  }
  return normal;
}

/** An instanced mesh's copies as one mesh: each dot moved by its matrix, its colour on every one of its points. */
function baked(mesh, position, normal, index, n) {
  const count = position.length / 3, M = new Matrix4(), NM = new Matrix3(), v = new Vector3(), tint = new Color(), white = new Color(1, 1, 1);
  const out = { position: new Float32Array(n * count * 3), normal: new Float32Array(n * count * 3), color: new Float32Array(n * count * 3),
    idx: new Uint32Array(n * index.length) };
  for (let k = 0; k < n; k++) {
    mesh.getMatrixAt(k, M);
    NM.getNormalMatrix(M);
    if (mesh.instanceColor) mesh.getColorAt(k, tint);
    const c = mesh.instanceColor ? tint : white;
    for (let i = 0; i < count; i++) {
      const o = (k * count + i) * 3;
      v.fromArray(position, i * 3).applyMatrix4(M).toArray(out.position, o);
      v.fromArray(normal, i * 3).applyMatrix3(NM).normalize().toArray(out.normal, o);
      out.color[o] = c.r; out.color[o + 1] = c.g; out.color[o + 2] = c.b;
    }
    for (let t = 0; t < index.length; t++) out.idx[k * index.length + t] = index[t] + k * count;
  }
  return out;
}

const VEC = { SCALAR: 1, VEC2: 2, VEC3: 3 };
const FLOAT = 5126, UINT = 5125, ARRAY = 34962, ELEMENTS = 34963;

/**
 * A model as a binary glTF.
 *
 * @param {object} model                 scene.js's Model, updated
 * @param {object} o
 * @param {(canvas: object) => Promise<Uint8Array>} o.png   a skin's picture as a PNG's bytes
 * @param {string} [o.name]
 * @returns {Promise<{bytes: Uint8Array, shapes: number, points: number, left: string[]}>}
 */
export async function glbOf(model, { png, name = 'model' }) {
  const { pieces, left } = piecesOf(model);
  const json = { asset: { version: '2.0', generator: 'skweeb 3d (apps/3d/meshfile.js)' }, scene: 0, scenes: [{ name, nodes: [] }],
    nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [] };
  const chunks = [];
  let length = 0, points = 0;
  const view = (bytes, target) => {
    const at = length;
    chunks.push(bytes);
    length += bytes.byteLength;
    const pad = (4 - (length % 4)) % 4;
    if (pad) { chunks.push(new Uint8Array(pad)); length += pad; }
    json.bufferViews.push({ buffer: 0, byteOffset: at, byteLength: bytes.byteLength, ...(target ? { target } : {}) });
    return json.bufferViews.length - 1;
  };
  const accessor = (array, type, componentType, target, bounds = false) => {
    const a = { bufferView: view(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), target), componentType,
      count: array.length / VEC[type], type };
    if (bounds) {
      const k = VEC[type], min = new Array(k).fill(Infinity), max = new Array(k).fill(-Infinity);
      for (let i = 0; i < array.length; i++) { min[i % k] = Math.min(min[i % k], array[i]); max[i % k] = Math.max(max[i % k], array[i]); }
      a.min = min; a.max = max;
    }
    json.accessors.push(a);
    return json.accessors.length - 1;
  };
  const textures = new Map(), used = new Set();
  // three's wrapping as glTF's: repeated, clamped, mirrored (a brush wrapped round a body repeats along it, G10).
  const GL = { 1000: 10497, 1001: 33071, 1002: 33648 };
  const samplerOf = wrap => {
    const s = { magFilter: 9729, minFilter: 9987, wrapS: GL[wrap && wrap[0]] || 33071, wrapT: GL[wrap && wrap[1]] || 33071 };
    json.samplers = json.samplers || [];
    const at = json.samplers.findIndex(x => x.wrapS === s.wrapS && x.wrapT === s.wrapT);
    return at >= 0 ? at : json.samplers.push(s) - 1;
  };
  const textureOf = async (picture, wrap) => {
    if (!textures.has(picture)) {
      json.images = json.images || [];
      json.textures = json.textures || [];
      json.images.push({ bufferView: view(await png(picture)), mimeType: 'image/png' });
      json.textures.push({ source: json.images.length - 1, sampler: samplerOf(wrap) });
      textures.set(picture, json.textures.length - 1);
    }
    return textures.get(picture);
  };
  for (const p of pieces) {
    const attributes = { POSITION: accessor(p.position, 'VEC3', FLOAT, ARRAY, true), NORMAL: accessor(p.normal, 'VEC3', FLOAT, ARRAY) };
    // three reads a picture from its bottom row up, glTF from its top: v turned over.
    if (p.uv) attributes.TEXCOORD_0 = accessor(p.uv.map((x, i) => (i % 2 ? 1 - x : x)), 'VEC2', FLOAT, ARRAY);
    if (p.color) attributes.COLOR_0 = accessor(p.color, 'VEC3', FLOAT, ARRAY);
    const pbr = { baseColorFactor: [...p.material.color, 1], metallicFactor: 0, roughnessFactor: 0.75 };
    if (p.material.map && p.uv) pbr.baseColorTexture = { index: await textureOf(p.material.map, p.material.wrap) };
    const material = { name: p.name, pbrMetallicRoughness: pbr, ...(p.material.doubleSided ? { doubleSided: true } : {}) };
    if (p.material.unlit) { material.extensions = { KHR_materials_unlit: {} }; used.add('KHR_materials_unlit'); }
    json.materials.push(material);
    json.meshes.push({ name: p.name, primitives: [{ attributes, indices: accessor(p.index, 'SCALAR', UINT, ELEMENTS), material: json.materials.length - 1 }] });
    json.nodes.push({ name: p.name, mesh: json.meshes.length - 1, matrix: p.matrix });
    json.scenes[0].nodes.push(json.nodes.length - 1);
    points += p.position.length / 3;
  }
  if (used.size) json.extensionsUsed = [...used];
  json.buffers.push({ byteLength: length });

  const text = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = Math.ceil(text.length / 4) * 4;
  const bytes = new Uint8Array(12 + 8 + jsonLength + 8 + length);
  const d = new DataView(bytes.buffer);
  d.setUint32(0, 0x46546c67, true);                  // glTF
  d.setUint32(4, 2, true);
  d.setUint32(8, bytes.length, true);
  d.setUint32(12, jsonLength, true);
  d.setUint32(16, 0x4e4f534a, true);                 // JSON
  bytes.fill(0x20, 20, 20 + jsonLength);
  bytes.set(text, 20);
  d.setUint32(20 + jsonLength, length, true);
  d.setUint32(24 + jsonLength, 0x004e4942, true);    // BIN
  let at = 28 + jsonLength;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
  return { bytes, shapes: pieces.length, points, left };
}

/**
 * A model as an OBJ: each shape an object, its points where its place puts them, its normals turned with them,
 * a drawn body's uv; no material.
 *
 * @returns {{text: string, shapes: number, points: number, left: string[]}}
 */
export function objOf(model, name = 'model') {
  const { pieces, left } = piecesOf(model);
  const lines = [`# ${name} — skweeb 3d (apps/3d/meshfile.js), metres, y up`];
  const M = new Matrix4(), NM = new Matrix3(), v = new Vector3(), r = x => +x.toFixed(6);
  let base = 1, points = 0;
  for (const p of pieces) {
    M.fromArray(p.matrix);
    NM.getNormalMatrix(M);
    const count = p.position.length / 3;
    lines.push(`o ${p.name}`);
    for (let i = 0; i < count; i++) { v.fromArray(p.position, i * 3).applyMatrix4(M); lines.push(`v ${r(v.x)} ${r(v.y)} ${r(v.z)}`); }
    if (p.uv) for (let i = 0; i < count; i++) lines.push(`vt ${r(p.uv[2 * i])} ${r(p.uv[2 * i + 1])}`);
    for (let i = 0; i < count; i++) { v.fromArray(p.normal, i * 3).applyMatrix3(NM).normalize(); lines.push(`vn ${r(v.x)} ${r(v.y)} ${r(v.z)}`); }
    for (let t = 0; t < p.index.length; t += 3) {
      const [a, b, c] = [p.index[t] + base, p.index[t + 1] + base, p.index[t + 2] + base];
      lines.push(p.uv ? `f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}` : `f ${a}//${a} ${b}//${b} ${c}//${c}`);
    }
    base += count;
    points += count;
  }
  return { text: lines.join('\n') + '\n', shapes: pieces.length, points, left };
}
