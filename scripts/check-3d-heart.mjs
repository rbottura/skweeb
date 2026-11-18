#!/usr/bin/env node
/**
 * scripts/check-3d-heart.mjs — the planet's heart in Chrome (docs/worm.md, the heart).
 *
 *   node scripts/check-3d-heart.mjs
 *
 * Served as plain files with no vault: loft.js's worm, turned blue, set by
 * the north's hole and walked into it — Z held — and it is in a cut, seen
 * flat: the sky over it, the tunnel dark round it, the worm blue in the
 * middle. S held, down its tunnel into the heart: in 3D again, the field
 * wider, the worm on the inside of the hollow, its up the heart's middle,
 * walked on its wall; the matrix at its middle, amber, seen from there, the
 * ground's two things drifting in it. Set by another way's mouth and walked into it, it is
 * in a cut at that tunnel's bottom; held toward that way, up it, out on the
 * ground beside its hole. WebGPU or WebGL2, whichever the machine has.
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
const up = p.up, at = p.p;
c.ok('…on the inside of the hollow, its up the heart\'s middle', p.inside && Math.abs(len(at) - p.heart) < 1e-6
  && (up[0] * at[0] + up[1] * at[1] + up[2] * at[2]) / len(at) < -0.999, `${len(at).toFixed(3)} from the middle, the heart ${p.heart.toFixed(2)}`);
await wait(300);
await c.shot('3d-heart');
c.ok('…the matrix at its middle, a share of it round, the ground\'s two things in it', Math.abs(p.matrix - 0.32 * p.heart) < 1e-6
  && p.items.length === 2 && p.items.every(q => len(q) < p.matrix), `${p.matrix.toFixed(2)} round, ${p.items.length} things`);
const inside = await page.eval(look);
c.ok('…seen from where the worm walks, amber', inside.warm > 0.01, `${(inside.warm * 100).toFixed(1)}% of the picture`);
const drift = (await page.eval(peek)).items;
c.ok('…its things drifting', drift.some((q, i) => len(q.map((x, k) => x - p.items[i][k])) > 0.01), '');
const walked = p.walked;
await key('keydown', 'KeyW');
await wait(1000);
await key('keyup', 'KeyW');
p = await page.eval(peek);
c.ok('…walked on its wall, on it', p.walked > walked + 2 && Math.abs(len(p.p) - p.heart) < 1e-6 && p.place === 'heart',
  `${(p.walked - walked).toFixed(2)} units, ${p.place}`);

// ── And out by another ──────────────────────────────────────────────────────

await visit(3, { heart: true, away: 3 });
await holdUntil('KeyW', `p.place === 'cut'`, 8000);
p = await page.eval(peek);
c.ok('walked into the 90°\'s mouth: in a cut, at its tunnel\'s bottom', p.place === 'cut' && len(p.cut.q) < p.heart + 3.5,
  `${p.place}, ${p.cut ? len(p.cut.q).toFixed(2) : '?'} from the middle`);
const side = await page.eval(`import('/apps/3d/play/access.js').then(a => a.onCut(a.PLANES.find(c => c.across === ${p.cut.across}), 3))`);
const code = side[0] > 0 ? 'KeyD' : side[0] < 0 ? 'KeyA' : side[1] > 0 ? 'KeyW' : 'KeyS';
await holdUntil(code, `p.place === 'ground'`, 12000);
p = await page.eval(peek);
const off = angle(p.p, p.ways[3]) * p.radius;
c.ok(`…${code} held, toward it on the screen: up it, out on the ground beside its hole`, p.place === 'ground' && !p.inside && off > 1.6 && off < 6,
  `${p.place}, ${off.toFixed(2)} from its hole`);
const facing = p.f, away = p.p.map((x, i) => x / len(p.p) - p.ways[3][i]);
c.ok('…facing away from it', facing[0] * away[0] + facing[1] * away[1] + facing[2] * away[2] > 0, '');
const noise = c.quiet().filter(e => !(e.url || '').includes('/api/vault'));
c.ok('…and it said nothing wrong', !noise.length, JSON.stringify(noise).slice(0, 300));

await c.finish();
