#!/usr/bin/env node
/**
 * scripts/check-3d-heart.mjs — the planet's heart in Chrome (docs/worm.md, the heart).
 *
 *   node scripts/check-3d-heart.mjs
 *
 * Served as plain files with no vault: loft.js's worm, turned blue, walked
 * into a brush on the ground and carrying it (M16m), set by
 * the north's hole and walked into it — Z held — and it is in a cut, seen
 * flat: the sky over it, the tunnel dark round it, the worm blue in the
 * middle. S held, down its tunnel into the heart: in 3D again, the field
 * wider, the worm floating under the mouth it came by, off the wall (M16o),
 * the camera out behind it looking at the matrix; the matrix amber, the
 * ground's two things drifting in it; the appendage from it to the worm,
 * the brush clicked in the strip put in along it, held, clicked out again
 * (M16p). D held, round the matrix, at its
 * distance, the camera still on it; Z, up and over. The right button held:
 * aimed, the sight shown; the pointer moved onto a mouth: found, its rim
 * lit, the sight warm; a click, in that way's cut at its tunnel's bottom;
 * held toward that way, up it, out on the ground beside its hole. WebGPU or
 * WebGL2, whichever the machine has.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const player = `import('/apps/3d/play/main.js')`;
const peek = `${player}.then(m => m.peek())`;
const tune = values => page.eval(`${player}.then(m => m.tune(${JSON.stringify(values)}))`);
const visit = (way, given) => page.eval(`${player}.then(m => m.visit(${way}, ${JSON.stringify(given)}))`);
const key = (type, code) => page.eval(`document.dispatchEvent(new KeyboardEvent('${type}', { code: '${code}', key: '?', bubbles: true }))`);
const until = (test, ms) => page.until(`${peek}.then(p => p && (${test}))`, { timeout: ms }).catch(() => {});
const holdUntil = async (code, test, ms) => { await key('keydown', code); await until(test, ms); await key('keyup', code); };
const len = v => Math.hypot(...v);
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (len(a) * len(b)))));
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const near = (a, b, e = 30) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < e;
/** The picture: its top's colour, how much of its middle is blue, how much of it is the hollow's near black, how much warm. */
const look = `(async () => {
  const cv = document.querySelector('canvas.world'), b = await createImageBitmap(cv);
  const o = new OffscreenCanvas(b.width, b.height), g = o.getContext('2d');
  g.drawImage(b, 0, 0);
  const d = g.getImageData(0, 0, b.width, b.height).data;
  let blue = 0, n = 0, hollow = 0, all = 0, warm = 0;
  for (let y = Math.round(b.height * 0.3); y < b.height * 0.7; y += 2) for (let x = Math.round(b.width * 0.3); x < b.width * 0.7; x += 2) {
    const i = (y * b.width + x) * 4; n++;
    if (d[i + 2] > d[i] + 50 && d[i + 2] > d[i + 1] + 50) blue++;
  }
  for (let i = 0; i < d.length; i += 4 * 13) {
    all++;
    if (Math.abs(d[i] - 23) + Math.abs(d[i + 1] - 19) + Math.abs(d[i + 2] - 28) < 12) hollow++;
    if (d[i] > 120 && d[i] - d[i + 2] > 60 && d[i + 1] > d[i + 2] + 20) warm++;
  }
  const top = Array.from(d.slice((2 * b.width + (b.width >> 1)) * 4, (2 * b.width + (b.width >> 1)) * 4 + 3));
  return { top, blue: blue / n, hollow: hollow / all, warm: warm / all };
})()`;

await c.go(c.plain + '/apps/3d/play/');
await until('p.frames > 3', 40000);
await tune({ colour: '#1030ff', away: 60 });
let p = await page.eval(peek);
c.ok('on the ground, six ways in', !!p && p.place === 'ground' && p.ways.length === 6, p ? `${p.place}, ${p.ways.length} ways` : 'nothing');
await page.eval(`${player}.then(m => m.seek(0, { away: 4 }))`);
await holdUntil('KeyW', 'p.carried.length === 1', 8000);
p = await page.eval(peek);
c.ok('…a brush walked into on the way: carried', p.carried.length === 1, p.carried.map(i => i.title).join(', ') || 'nothing');

// ── Down ────────────────────────────────────────────────────────────────────

await visit(0, { away: 5 });
await holdUntil('KeyW', `p.place === 'cut'`, 8000);
p = await page.eval(peek);
c.ok('walked into the north\'s hole: in a cut', p.place === 'cut' && !!p.cut, `${p.place}${p.cut ? `, across ${p.cut.across}, at ${p.cut.q.map(x => x.toFixed(1))}` : ''}`);
await wait(300);
const flat = await page.eval(look);
c.ok('…seen flat: the sky over it, the tunnel dark round the worm, blue', near(flat.top, hex('#cfe3f1')) && flat.hollow > 0.02 && flat.blue > 0.01,
  `top ${flat.top}, ${(flat.hollow * 100).toFixed(1)}% hollow, ${(flat.blue * 100).toFixed(1)}% blue`);
await c.shot('3d-heart-cut');
const y0 = p.cut.q[1];
await holdUntil('KeyS', `p.place === 'heart'`, 12000);
p = await page.eval(peek);
c.ok('S held: down its tunnel, into the heart', p.place === 'heart', `${p.place}, came down from ${y0.toFixed(1)}`);
c.ok('…in 3D again, the field wider', p.fov === 75, `${p.fov}°`);
const o = p.orbit, onMatrix = q => (angle(q.ahead, q.eye.map(x => -x)) * 180) / Math.PI;
c.ok('…floating under the mouth it came by, off the wall, between it and the matrix', !!o && Math.abs(len(p.p) - o.at) < 1e-6
  && angle(p.p, p.ways[0]) < 0.3 && o.at > p.matrix && o.at < p.heart,
  o ? `${len(p.p).toFixed(2)} from the middle, the matrix ${p.matrix.toFixed(2)} round, the wall ${p.heart.toFixed(2)}` : 'no float');
c.ok('…the camera out behind it, looking at the matrix', onMatrix(p) < 0.5 && len(p.eye) > o.at && len(p.eye) < p.heart,
  `${onMatrix(p).toFixed(2)}° off its middle, ${len(p.eye).toFixed(2)} out`);
await wait(300);
await c.shot('3d-heart');
c.ok('…the matrix at its middle, a share of it round, the ground\'s two things in it', Math.abs(p.matrix - 0.32 * p.heart) < 1e-6
  && p.items.length === 2 && p.items.every(q => len(q) < p.matrix), `${p.matrix.toFixed(2)} round, ${p.items.length} things`);
const inside = await page.eval(look);
c.ok('…seen from where the worm floats, amber', inside.warm > 0.01, `${(inside.warm * 100).toFixed(1)}% of the picture`);
const drift = (await page.eval(peek)).items;
c.ok('…its things drifting', drift.some((q, i) => len(q.map((x, k) => x - p.items[i][k])) > 0.01), '');
const ends = p.appendage, gap = ends ? len(ends[3].map((x, i) => x - p.p[i])) : Infinity;
c.ok('…the appendage: from the matrix to the worm', !!ends && Math.abs(len(ends[0]) - p.matrix) < 1e-6 && gap < 0.6,
  ends ? `${len(ends[0]).toFixed(2)} from the middle, ${gap.toFixed(2)} from the worm` : 'none');
const click = list => page.eval(`(() => { const li = document.querySelector('.${list} li'); if (li) li.click(); return !!li; })()`);
const clicked = await click('carried');
await until('p.held.length === 1 && !p.passing', 4000);
p = await page.eval(peek);
c.ok('…the brush clicked in the strip: along it into the matrix, held there', clicked && p.held.length === 1 && p.carried.length === 0
  && p.inMatrix === 1, `${p.held.join(', ') || 'nothing'} held, ${p.carried.length} carried`);
await c.shot('3d-heart-held');
await click('held');
await until('p.carried.length === 1 && !p.passing', 4000);
p = await page.eval(peek);
c.ok('…clicked there: let out along it, carried again', p.carried.length === 1 && p.held.length === 0 && p.inMatrix === 0,
  `${p.carried.map(i => i.title).join(', ') || 'nothing'} carried`);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const was = o.dir, walked = p.walked;
await key('keydown', 'KeyD');
await wait(1500);
await key('keyup', 'KeyD');
p = await page.eval(peek);
c.ok('…D held: round the matrix, at its distance, the camera still on it, the worm facing that way', angle(p.orbit.dir, was) > 0.2
  && Math.abs(len(p.p) - p.orbit.at) < 1e-6 && onMatrix(p) < 3 && dot(p.f, p.orbit.right) > 0.8 && p.walked > walked + 2,
  `${((angle(p.orbit.dir, was) * 180) / Math.PI).toFixed(1)}° round, ${onMatrix(p).toFixed(2)}° off the matrix`);
await key('keydown', 'KeyW');
await wait(2000);
await key('keyup', 'KeyW');
p = await page.eval(peek);
c.ok('…Z held: up and over, at its distance', p.place === 'heart' && Math.abs(len(p.p) - p.orbit.at) < 1e-6
  && Math.abs(dot(p.orbit.up, p.orbit.dir)) < 1e-6, `${p.place}, ${len(p.p).toFixed(2)} from the middle`);

// ── Aimed, and out by a mouth ───────────────────────────────────────────────

const mouse = (on, type, init) => page.eval(`${on}.dispatchEvent(new MouseEvent('${type}', { bubbles: true, ...${JSON.stringify(init)} }))`);
const canvas = `document.querySelector('canvas.world')`;
await mouse(canvas, 'mousedown', { button: 2 });
await until('p.orbit && p.orbit.aiming && p.sight', 3000);
p = await page.eval(peek);
c.ok('the right button held: aimed, the sight shown, its gaze where the camera looked', p.orbit.aiming && p.sight
  && angle(p.orbit.gaze, p.orbit.base[0]) < 1e-3, `${p.orbit.aiming ? 'aimed' : 'not aimed'}, the sight ${p.sight ? 'shown' : 'hidden'}`);
const LOOK = await page.eval(`import('/apps/3d/play/orbit.js').then(m => m.LOOK)`);
const [ahead, up] = p.orbit.base, right = [ahead[1] * up[2] - ahead[2] * up[1], ahead[2] * up[0] - ahead[0] * up[2], ahead[0] * up[1] - ahead[1] * up[0]];
const pick = p.ways.map((w, i) => {
  const t = w.map((x, k) => x * p.heart - p.p[k]), n = len(t), u = t.map(x => x / n);
  // seen: the line to it clear of the matrix
  const along = Math.max(0, Math.min(1, -dot(p.p, t) / (n * n))), closest = p.p.map((x, k) => x + along * t[k]);
  return { i, yaw: Math.atan2(dot(u, right), dot(u, ahead)), pitch: Math.asin(dot(u, up)), seen: len(closest) > p.matrix };
}).filter(m => m.seen && Math.abs(m.pitch) < 1.3).sort((a, b) => Math.abs(a.yaw) - Math.abs(b.yaw))[0];
const named = await page.eval(`import('/apps/3d/play/access.js').then(a => a.WAYS[${pick.i}].name)`);
await mouse('document', 'mousemove', { movementX: (pick.yaw - p.orbit.yaw) / LOOK, movementY: -(pick.pitch - p.orbit.pitch) / LOOK });
await until(`p.orbit && p.orbit.aimed === ${pick.i}`, 3000);
await wait(800);
p = await page.eval(peek);
const warm = await page.eval(`document.querySelector('.sight').classList.contains('found')`);
c.ok(`…the pointer moved onto the ${named}'s mouth: found, its rim lit, the sight warm`, p.orbit.aimed === pick.i && p.orbit.lit === pick.i && warm,
  `found ${p.orbit.aimed}, lit ${p.orbit.lit}, the sight ${warm ? 'warm' : 'cold'}`);
await c.shot('3d-heart-aim');
await mouse(canvas, 'mousedown', { button: 0 });
await until(`p.place === 'cut'`, 3000);
await mouse('document', 'mouseup', { button: 2 });
p = await page.eval(peek);
c.ok(`…a click: in the ${named}'s cut, at its tunnel's bottom`, p.place === 'cut' && len(p.cut.q) < p.heart + 3.5,
  `${p.place}, ${p.cut ? len(p.cut.q).toFixed(2) : '?'} from the middle`);
const side = await page.eval(`import('/apps/3d/play/access.js').then(a => a.onCut(a.PLANES.find(c => c.across === ${p.cut.across}), ${pick.i}))`);
const code = side[0] > 0 ? 'KeyD' : side[0] < 0 ? 'KeyA' : side[1] > 0 ? 'KeyW' : 'KeyS';
await holdUntil(code, `p.place === 'ground'`, 12000);
p = await page.eval(peek);
const off = angle(p.p, p.ways[pick.i]) * p.radius;
c.ok(`…${code} held, toward it on the screen: up it, out on the ground beside its hole`, p.place === 'ground' && !p.inside && off > 1.6 && off < 6,
  `${p.place}, ${off.toFixed(2)} from its hole`);
const facing = p.f, away = p.p.map((x, i) => x / len(p.p) - p.ways[pick.i][i]);
c.ok('…facing away from it', facing[0] * away[0] + facing[1] * away[1] + facing[2] * away[2] > 0, '');
const noise = c.quiet().filter(e => !(e.url || '').includes('/api/vault'));
c.ok('…and it said nothing wrong', !noise.length, JSON.stringify(noise).slice(0, 300));

await c.finish();
