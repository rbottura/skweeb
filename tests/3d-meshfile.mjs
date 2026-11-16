/**
 * tests/3d-meshfile.mjs — run with: node tests/3d-meshfile.mjs
 *
 * Covers apps/3d/meshfile.js (G5), on three.js's core: a model out as a
 * binary glTF and as an OBJ. The promises — a .glb is its header, its JSON
 * and one buffer, each a multiple of four, its length its own; a node for
 * every shape shown, its place its matrix; every accessor within the buffer,
 * its count the geometry's, its positions bounded; normals of length one; a
 * drawn body's uv turned over, as glTF reads a picture from its top, its skin
 * a PNG in the file — once, for two bodies that share it; unlit as
 * KHR_materials_unlit says; a cloud's dots baked, each its colour. The OBJ:
 * each point where its place puts it, its faces within its points, from one.
 */

const { Model } = await import('../apps/3d/scene.js');
const { glbOf, objOf } = await import('../apps/3d/meshfile.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 7, 7, 7]);
const recipe = { shapes: [
  { id: 'box', params: { x: 2 } },
  { id: 'drawn', params: { shading: 'unlit' } },
  { id: 'cloud', params: { count: 40, x: -2 } },
  { id: 'drawn', params: { y: 2 } },
  { id: 'sphere', on: false, params: {} },
] };
const model = new Model().update(recipe);
const skin = { width: 4, height: 4 };          // a picture, as a drawn body's skin holds one (drawn.js)
for (const k of [1, 3]) model.parts[k].mesh.material.map = { image: skin };

const parse = bytes => {
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), n = d.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + n)));
  const m = d.getUint32(20 + n, true);
  return { head: [d.getUint32(0, true), d.getUint32(4, true), d.getUint32(8, true) === bytes.length, d.getUint32(16, true), d.getUint32(24 + n, true)],
    n, m, json, bin: bytes.subarray(28 + n, 28 + n + m) };
};
const out = await glbOf(model, { png: async picture => (picture === skin ? PNG : new Uint8Array(0)), name: 'a test' });
const { head, n, m, json, bin } = parse(out.bytes);
const floats = (a, i) => { const v = json.bufferViews[a.bufferView]; return new Float32Array(bin.buffer, bin.byteOffset + v.byteOffset, a.count * { VEC2: 2, VEC3: 3, SCALAR: 1 }[a.type]); };

ok('a .glb: glTF 2, its length its own, a JSON chunk then a BIN', head, [0x46546c67, 2, true, 0x4e4f534a, 0x004e4942]);
ok('…each a multiple of four, every view too', [n % 4, m % 4, json.bufferViews.every(v => v.byteOffset % 4 === 0)], [0, 0, true]);
ok('a node for every shape shown, the hidden sphere none', json.nodes.map(x => x.name), ['box-0', 'drawn-1', 'cloud-2', 'drawn-3']);
ok('…its place its matrix: the box two along x', json.nodes[0].matrix.slice(12, 15), [2, 0, 0]);
const box = json.meshes[0].primitives[0], boxPos = json.accessors[box.attributes.POSITION];
ok('the box: its 24 points, 36 corners of triangles, its bounds', [boxPos.count, json.accessors[box.indices].count, boxPos.min, boxPos.max],
  [24, 36, [-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]]);
ok('every accessor within the buffer', json.accessors.every(a => json.bufferViews[a.bufferView].byteOffset
  + a.count * { VEC2: 2, VEC3: 3, SCALAR: 1 }[a.type] * 4 <= m), true);
const normals = floats(json.accessors[box.attributes.NORMAL]);
ok('normals of length one', [...Array(normals.length / 3).keys()].every(i => Math.abs(Math.hypot(normals[3 * i], normals[3 * i + 1], normals[3 * i + 2]) - 1) < 1e-5), true);
const body = json.meshes[1].primitives[0], uv = floats(json.accessors[body.attributes.TEXCOORD_0]);
const given = model.parts[1].mesh.geometry.attributes.uv.array;
ok('a drawn body: its uv, v turned over for glTF', [uv[0] === given[0], Math.abs(uv[1] - (1 - given[1])) < 1e-6], [true, true]);
ok('…its skin a PNG in the file, once for the two bodies that share it',
  [json.images.length, [...bin.subarray(json.bufferViews[json.images[0].bufferView].byteOffset, json.bufferViews[json.images[0].bufferView].byteOffset + PNG.length)].join(),
   json.materials[body.material].pbrMetallicRoughness.baseColorTexture.index, json.materials[json.meshes[3].primitives[0].material].pbrMetallicRoughness.baseColorTexture.index],
  [1, [...PNG].join(), 0, 0]);
ok('…unlit, as KHR_materials_unlit says; the other lit', [!!json.materials[body.material].extensions?.KHR_materials_unlit,
  !json.materials[json.meshes[3].primitives[0].material].extensions, json.extensionsUsed], [true, true, ['KHR_materials_unlit']]);
const cloud = json.meshes[2].primitives[0], dots = model.parts[2].mesh, one = dots.geometry.attributes.position.count;
const colours = floats(json.accessors[cloud.attributes.COLOR_0]), c0 = dots.getColorAt(0, new (await import('../core/libs/three/three.core.js')).Color());
ok('a cloud baked: every dot its points, each its colour', [json.accessors[cloud.attributes.POSITION].count === dots.count * one,
  [colours[0], colours[1], colours[2]].map(x => +x.toFixed(4)).join() === [c0.r, c0.g, c0.b].map(x => +x.toFixed(4)).join()], [true, true]);
ok('what the file holds, said', [out.shapes, out.points === json.accessors.filter((a, i) => json.meshes.some(me => me.primitives[0].attributes.POSITION === i)).reduce((s, a) => s + a.count, 0), out.left],
  [4, true, []]);

// ── The OBJ ──────────────────────────────────────────────────────────────────
const obj = objOf(model, 'a test'), lines = obj.text.split('\n');
const vs = lines.filter(l => l.startsWith('v ')), fs = lines.filter(l => l.startsWith('f '));
ok('an OBJ: an object a shape, its points, its faces', [lines.filter(l => l.startsWith('o ')).length, vs.length === obj.points,
  fs.length === json.meshes.reduce((s, me) => s + json.accessors[me.primitives[0].indices].count / 3, 0)], [4, true, true]);
const boxXs = vs.slice(0, 24).map(l => +l.split(' ')[1]);
ok('…each point where its place puts it: the box from 1.5 to 2.5 along x', [Math.min(...boxXs), Math.max(...boxXs)], [1.5, 2.5]);
const most = Math.max(...fs.flatMap(l => l.slice(2).split(' ').map(t => +t.split('/')[0])));
ok('…its faces within its points, counted from one', [most <= vs.length, fs.every(l => !/\b0\//.test(l))], [true, true]);
ok('…every uv kept, as three reads it — the box\'s, the drawn bodies\'; a cloud baked, none', lines.filter(l => l.startsWith('vt ')).length,
  [0, 1, 3].reduce((s, k) => s + model.parts[k].mesh.geometry.attributes.uv.count, 0));

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
