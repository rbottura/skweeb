/**
 * tests/3d-cloud.mjs — run with: node tests/3d-cloud.mjs
 *
 * Covers apps/3d/cloud.js and the cloud in the scene (scene.js, look.js). The
 * promises — a cloud is a shape of the catalogue, unlit as it starts, its
 * colours its palette's; its dots are the same for the same values, each
 * drawn on its own, so more of them add to the cloud and move none; R moves
 * them and keeps their colours, C deals the colours and moves nothing; each
 * emitter has them where it says — a ball within its radius, a shell on it, a
 * flat one in its plane and its depth, an object's dots on its points, a disc
 * until its points come; sizes between two, more small ones as asked;
 * colours by an axis in the palette's order; a stack moves the dots — a twist,
 * a mirror twice as many, a row cut short past MAX_DOTS — and keeps them round;
 * in the scene, one instanced mesh, a matrix and a colour a dot, a stretch
 * that moves the dots and never shapes one, a click that picks it, a print's
 * segments raised no further than a dot needs, an outline on its dots' very
 * matrices.
 */

import { valuesFor } from '../core/params.js';

const { SHAPES, shapeSchema, finer } = await import('../apps/3d/shapes.js');
const { dotsOf, MAX_DOTS, EMITTERS } = await import('../apps/3d/cloud.js');
const { PALETTES } = await import('../apps/3d/bec-palettes.js');
const { Model } = await import('../apps/3d/scene.js');
const { pick } = await import('../apps/3d/pick.js');
const { inkOf, outline } = await import('../apps/3d/look.js');
const { boxOnPicture } = await import('../apps/3d/guides.js');
const { MODIFIERS } = await import('../apps/3d/modifiers.js');
const { Color, PerspectiveCamera, Vector3, Matrix4 } = await import('../core/libs/three/three.core.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(72), JSON.stringify(got).slice(0, 70),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

const values = (v = {}) => valuesFor(shapeSchema('cloud'), v);
// What comes from the vault beside the values — a palette's colours, an emitter's points — as scene.js adds it.
const cloud = ({ inks, points, ...v } = {}, stack) => dotsOf({ ...values(v), ...(inks ? { inks } : {}), ...(points ? { points } : {}) }, stack);
const at = (d, k) => [d.centres[k * 3], d.centres[k * 3 + 1], d.centres[k * 3 + 2]];
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const hexes = d => { const out = []; for (let k = 0; k < d.count; k++) out.push(new Color(d.colours[k * 3], d.colours[k * 3 + 1], d.colours[k * 3 + 2]).getHexString()); return out; };

// ── A shape of the catalogue ────────────────────────────────────────────────

ok('a shape of the catalogue, the menu\'s last', Object.keys(SHAPES).at(-1), 'cloud');
ok('…no colour of its own: its palette\'s', 'colour' in shapeSchema('cloud'), false);
ok('…unlit as it starts, every other shape smooth', [shapeSchema('cloud').shading.default, shapeSchema('box').shading.default], ['unlit', 'smooth']);
ok('…its emitters, a vault object among them', EMITTERS.join(), 'ball,shell,disc,ring,square,line,object');

// ── Its draws ───────────────────────────────────────────────────────────────

const base = cloud();
ok('its dots, as many as asked', [base.count, base.radii.length, base.centres.length, base.colours.length], [600, 600, 1800, 1800]);
ok('the same for the same values, to the bit', same(base.centres, cloud().centres) && same(base.colours, cloud().colours), true);
const more = cloud({ count: 900 });
ok('more dots add to the cloud and move none', same(more.centres.slice(0, 1800), base.centres) && same(more.radii.slice(0, 600), base.radii), true);
const reseeded = cloud({ seed: 2 });
ok('R, a new seed: other places, the same colours', [same(reseeded.centres, base.centres), same(reseeded.colours, base.colours)], [false, true]);
const rehued = cloud({ hues: 2 });
ok('C, new hues: other colours, the same places', [same(rehued.centres, base.centres), same(rehued.colours, base.colours)], [true, false]);
const bec = PALETTES.bec.map(h => h.slice(1).toLowerCase());
ok('…every colour one of the palette\'s, exactly', hexes(base).every(h => bec.includes(h)), true);
ok('…and every one of them dealt', new Set(hexes(base)).size, bec.length);
const given = cloud({ inks: ['#ff00ff', '#00ffff'] });
ok('a palette of the vault, given as its colours: drawn in them alone (V1)', [...new Set(hexes(given))].sort(), ['00ffff', 'ff00ff']);

// ── Where ───────────────────────────────────────────────────────────────────

const all = d => Array.from({ length: d.count }, (_, k) => at(d, k));
const len = p => Math.hypot(...p);
ok('a ball: every dot within its radius, and some deep inside', (b => all(b).every(p => len(p) <= 1.2 + 1e-6) && all(b).some(p => len(p) < 0.6))(cloud({ emitter: 'ball' })), true);
ok('a shell: every dot on its surface', all(cloud({ emitter: 'shell' })).every(p => Math.abs(len(p) - 1.2) < 1e-5), true);
const disc = cloud({ emitter: 'disc', depth: 0.4 });
ok('a disc: in its plane, its depth deep, within its radius', all(disc).every(([x, y, z]) => Math.hypot(x, y) <= 1.2 + 1e-6 && Math.abs(z) <= 0.2 + 1e-6)
  && all(disc).some(([, , z]) => Math.abs(z) > 0.15), true);
ok('a ring: on its edge', all(cloud({ emitter: 'ring', depth: 0 })).every(([x, y, z]) => Math.abs(Math.hypot(x, y) - 1.2) < 1e-5 && z === 0), true);
ok('a square: within its side', all(cloud({ emitter: 'square', extent: 2 })).every(([x, y]) => Math.abs(x) <= 1 && Math.abs(y) <= 1), true);
ok('a line: along x, its length', all(cloud({ emitter: 'line', extent: 2, depth: 0 })).every(([x, y, z]) => Math.abs(x) <= 1 && y === 0 && z === 0), true);
// An object's points, as core/points.js gives them: centred, the longer side 1, a picture's y down; a picture's cell.
const L = { list: [[-0.5, -0.25], [0.5, -0.25], [0, 0.25]], cell: 0.1 };
const born = cloud({ emitter: 'object', extent: 2, depth: 0, points: L });
const near = ([x, y]) => L.list.some(([px, py]) => Math.abs(x - px * 2) <= 0.1 + 1e-6 && Math.abs(y + py * 2) <= 0.1 + 1e-6);
ok('an object: every dot on one of its points, within a sample, its y up', all(born).every(near), true);
ok('…on every one of them', L.list.every(([px, py]) => all(born).some(([x, y]) => Math.abs(x - px * 2) < 0.1 && Math.abs(y + py * 2) < 0.1)), true);
ok('…a dot-set\'s exactly: no cell, no jitter', all(cloud({ emitter: 'object', extent: 2, depth: 0, points: { list: L.list, cell: 0 } }))
  .every(([x, y]) => L.list.some(([px, py]) => Math.abs(x - px * 2) < 1e-6 && Math.abs(y + py * 2) < 1e-6)), true);
ok('…and until its points come, a disc', same(cloud({ emitter: 'object' }).centres, cloud({ emitter: 'disc' }).centres), true);
const scattered = cloud({ emitter: 'ring', depth: 0, scatter: 0.3 });
ok('scattered: round their place, as far as it says', all(scattered).every(p => Math.abs(Math.hypot(p[0], p[1]) - 1.2) <= 0.3 + 1e-6 && Math.abs(p[2]) <= 0.3 + 1e-6)
  && all(scattered).some(p => Math.abs(p[2]) > 0.05), true);

// ── Sizes and colours ───────────────────────────────────────────────────────

const sized = cloud({ sizeMin: 0.02, sizeMax: 0.1 });
ok('each dot its own size, between the two', [...sized.radii].every(r => r >= 0.02 - 1e-7 && r <= 0.1 + 1e-7) && new Set(sized.radii).size > 500, true);
const mean = d => d.radii.reduce((s, r) => s + r, 0) / d.count;
ok('…more small ones as asked: the mean lower', mean(cloud({ sizeMin: 0.02, sizeMax: 0.1, sizeBias: 3 })) < mean(sized) - 0.015, true);
ok('…the two the other way round, the same sizes', same(cloud({ sizeMin: 0.1, sizeMax: 0.02 }).radii, sized.radii), true);
const banded = cloud({ emitter: 'square', extent: 2, deal: 'y', mix: 0 });
const order = PALETTES.bec.map(h => h.slice(1).toLowerCase());
const bandOf = k => order.indexOf(hexes(banded)[k]);
const rising = Array.from({ length: banded.count }, (_, k) => k).sort((a, b) => banded.centres[a * 3 + 1] - banded.centres[b * 3 + 1]);
ok('colours up y, unmixed: the palette in its order, bottom to top', rising.every((k, i) => i === 0 || bandOf(k) >= bandOf(rising[i - 1])), true);
ok('…mixed, some out of their band', (m => { const h = hexes(m); return rising.some((k, i) => i && order.indexOf(h[k]) < order.indexOf(h[rising[i - 1]])); })(cloud({ emitter: 'square', extent: 2, deal: 'y', mix: 0.5 })), true);

// ── A stack, on the dots ────────────────────────────────────────────────────

const stack = (id, v = {}) => [{ id, values: valuesFor(MODIFIERS[id].params, v) }];
const flat = { emitter: 'square', extent: 2, depth: 0 };
const twisted = cloud(flat, stack('twist', { axis: 'x', angle: 180 }));
ok('a twist moves the dots, their sizes and colours kept', [same(twisted.centres, cloud(flat).centres), same(twisted.radii, cloud(flat).radii),
  same(twisted.colours, cloud(flat).colours)], [false, true, true]);
ok('…out of their plane', all(twisted).some(([, , z]) => Math.abs(z) > 0.3), true);
const bumped = cloud(flat, stack('displace', { amount: 0.3 }));
ok('a push by noise: a flat cloud pushed out of its plane, along z alone', all(bumped).some(([, , z]) => Math.abs(z) > 0.02)
  && all(bumped).every(([x, y], k) => x === at(cloud(flat), k)[0] && y === at(cloud(flat), k)[1]), true);
const twins = cloud(flat, stack('mirror', { axis: 'x', offset: 1.5 }));
ok('a mirror: twice the dots, the twins across its plane, their sizes kept', [twins.count, same(twins.radii.slice(0, 600), twins.radii.slice(600)),
  Math.abs(at(twins, 600)[0] - (3 - at(twins, 0)[0])) < 1e-5], [1200, true, true]);
ok('a row: as many clouds', cloud(flat, stack('array', { count: 3, dx: 3 })).count, 1800);
ok('…cut short past MAX_DOTS', cloud({ ...flat, count: 20000 }, stack('array', { count: 64 })).count, Math.floor(MAX_DOTS / 20000) * 20000);
ok('subdivide: nothing to cut', same(cloud(flat, stack('subdivide')).centres, cloud(flat).centres), true);

// ── In the scene ────────────────────────────────────────────────────────────

const recipe = (params, more = {}) => ({ sun: 2, sunYaw: 0, sunPitch: 90, ambient: 0.5, shapes: [{ id: 'cloud', params, ...more }] });
const model = new Model().update(recipe({ count: 300, emitter: 'shell', extent: 1 }));
const mesh = model.parts[0].mesh;
ok('one instanced mesh, a dot each', [mesh.isInstancedMesh, mesh.count, mesh.instanceColor.count >= 300], [true, 300, true]);
ok('…unlit, its colours the dots\' own', [mesh.material.isMeshBasicMaterial, mesh.material.color.getHexString()], [true, 'ffffff']);
const dot0 = new Vector3().setFromMatrixPosition(new Matrix4().fromArray(mesh.instanceMatrix.array, 0));
ok('…each dot where the cloud has it', Math.abs(dot0.length() - 1) < 1e-5, true);
const toon = new Model().update({ ...recipe({ count: 10, shading: 'smooth' }), toon: 3 });
ok('…lit when its shading says so, in the style\'s bands', toon.parts[0].mesh.material.isMeshToonMaterial, true);
const stretched = new Model().update(recipe({ count: 50, emitter: 'shell', extent: 1, size: 2, sy: 3 }));
stretched.scene.updateMatrixWorld(true);
const s = stretched.parts[0].mesh, world = new Matrix4(), inst = new Matrix4();
const radiusOf = k => { s.getMatrixAt(k, inst); world.multiplyMatrices(s.matrixWorld, inst); const e = world.elements;
  return [Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10])].map(x => +x.toFixed(6)); };
const r0 = +(2 * stretched.parts[0].dots.radii[0]).toFixed(6);
ok('stretched: the dots apart, each still round — its radius its size times the cloud\'s', radiusOf(0), [r0, r0, r0]);
const before = model.parts[0].mesh;
model.update(recipe({ count: 300, emitter: 'shell', extent: 1, x: 2 }));
ok('moved, the same mesh kept; made again when its form changes', [model.parts[0].mesh === before,
  (model.update(recipe({ count: 301, emitter: 'shell', extent: 1, x: 2 })), model.parts[0].mesh !== before && model.parts[0].mesh.count === 301)], [true, true]);
const swapped = new Model().update(recipe({ count: 20 }));
swapped.update({ shapes: [{ id: 'box', params: {} }] });
ok('a box where the cloud was: a mesh again, the cloud let go of', [swapped.parts[0].mesh.isInstancedMesh === true, swapped.scene.children.filter(c => c.isInstancedMesh).length], [false, 0]);
const camera = new PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 6);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld(true);
const one = new Model().update(recipe({ count: 1, emitter: 'shell', extent: 0.001, sizeMin: 0.5, sizeMax: 0.5 }));
ok('a click on a dot picks the cloud, on nothing nothing', [pick(one, camera, 0, 0)?.index, pick(one, camera, 0.9, 0.9)], [0, null]);
ok('its bounds: round its dots', (b => b && Math.abs(b.radius - 0.5 * Math.sqrt(3)) < 0.05)(one.bounds()), true);
const ball = new Model().update({ shapes: [{ id: 'sphere', params: { radius: 0.5, segments: 64 } }] });
const boxes = [boxOnPicture(one.parts[0].mesh, camera, 1000, 1000), boxOnPicture(ball.parts[0].mesh, camera, 1000, 1000)];
ok('chosen, its box on the picture hugs its dots, as a sphere\'s hugs it', boxes.every(Boolean) && ['x', 'y', 'w', 'h'].every(k => Math.abs(boxes[0][k] - boxes[1][k]) < 3), true);
ok('…and none when a dot is behind the eye', (camera.position.set(0, 0, 0.2), camera.updateMatrixWorld(true), boxOnPicture(one.parts[0].mesh, camera, 1000, 1000)), null);
ok('a print: a dot\'s segments raised, no further than 32', [finer('cloud', values({ segments: 16 }), 400).segments, finer('cloud', values({ segments: 16 }), 8).segments], [32, 16]);
outline(mesh, 'cloud', inkOf());
const hull = mesh.userData.hull;
ok('an outline: its hull instanced on the dots\' very matrices', [hull.isInstancedMesh, hull.instanceMatrix === mesh.instanceMatrix, hull.count], [true, true, 300]);
model.dispose();

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
