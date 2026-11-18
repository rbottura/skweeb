#!/usr/bin/env node
/**
 * scripts/check-3d-phase.mjs — the phase in Chrome (M16b, docs/worm.md).
 *
 *   node scripts/check-3d-phase.mjs
 *
 * Served as plain files with no vault: a frozen worm a few steps ahead of
 * the start, a shell, its radius on the ground. Walked into it, the walker
 * stops — Z still held, it goes nowhere — the camera goes to where both
 * bodies are as far from it, the world dims and the bridge's ghosts shine;
 * the phase swings there and back as many times as asked, the brightest
 * ghost running along the bridge with it, and comes to rest on B; held
 * there, the world turns to B's reality — its sky — and B is walked, A left
 * where it stood. Not taken in again at once; walked out of A's radius,
 * turned round and back into it, the passage plays the other way, and A is
 * walked under A's sky. WebGPU or WebGL2, whichever the machine has.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const peek = `import('/apps/3d/play/main.js').then(m => m.peek())`;
const tune = values => page.eval(`import('/apps/3d/play/main.js').then(m => m.tune(${JSON.stringify(values)}))`);
const key = (type, code) => page.eval(`document.dispatchEvent(new KeyboardEvent('${type}', { code: '${code}', key: '?', bubbles: true }))`);
const hold = async (code, ms) => { await key('keydown', code); await wait(ms); await key('keyup', code); };
const len = v => Math.hypot(...v);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const near = (a, b, e = 30) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < e;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
/** Every frame's stage and phase for `ms`, read in the page, with how far the eye is from each body and the ghosts' lights. */
const sample = ms => page.eval(`(async () => {
  const m = await import('/apps/3d/play/main.js'), out = [], t0 = performance.now();
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  while (performance.now() - t0 < ${ms}) {
    const p = m.peek();
    if (p) out.push({ stage: p.stage, phase: p.phase, walking: p.walking, lights: p.lights,
                      fromA: d(p.eye, p.bodies[0]), fromB: d(p.eye, p.bodies[1]), at: p.p });
    await new Promise(r => requestAnimationFrame(r));
  }
  return out; })()`);
/** The picture's top, and how much of it is the bridge's light: bright, and bluer than red. */
const look = `(async () => {
  const cv = document.querySelector('canvas.world'), b = await createImageBitmap(cv);
  const o = new OffscreenCanvas(b.width, b.height), g = o.getContext('2d');
  g.drawImage(b, 0, 0);
  const d = g.getImageData(0, 0, b.width, b.height).data;
  let lit = 0, n = 0;
  for (let i = 0; i < d.length; i += 4 * 7) { n++; if (d[i + 2] > 150 && d[i + 2] > d[i] + 40) lit++; }
  const top = Array.from(d.slice((2 * b.width + (b.width >> 1)) * 4, (2 * b.width + (b.width >> 1)) * 4 + 3));
  return { top, lit: lit / n };
})()`;

await c.go(c.plain + '/apps/3d/play/');
await page.until(`${peek}.then(p => p && p.frames > 3)`, { timeout: 40000 }).catch(() => {});
await tune({ away: 9, reach: 4, swings: 4, swing: 2.4, otherSky: '#1f1b3a', sky: '#cfe3f1' });
await wait(300);
let p = await page.eval(peek);
c.ok('two worms on the planet, the first walked', !!p && p.bodies.length === 2 && p.walking === 0 && p.stage === 'walking',
  p ? `${p.bodies.length} bodies, ${p.stage}` : 'nothing');
c.ok('…the other frozen ahead, a shell, its radius shown', p.shells[1] === 1 && p.shells[0] === 0 && p.reach[1] > 0 && p.reach[0] === 0,
  `shells ${p.shells}, radii ${p.reach.map(x => x.toFixed(2))}`);
const day = await page.eval(look);
c.ok('…under the day\'s sky', near(day.top, hex('#cfe3f1')), `${day.top}`);

// ── Into the phase ──────────────────────────────────────────────────────────

await key('keydown', 'KeyW');
await page.until(`${peek}.then(p => p && p.stage !== 'walking')`, { timeout: 8000 }).catch(() => {});
const begun = await page.eval(peek);
c.ok('walked into its radius, the passage begins', begun.stage === 'framing' || begun.stage === 'swinging', begun.stage);
const frames = await sample(2600);
await key('keyup', 'KeyW');
await c.shot('3d-phase-bridge');              // still swinging: the bridge, for the eye
const during = frames.filter(f => f.stage === 'swinging');
c.ok('…Z still held, the walker goes nowhere', during.length > 10 && len(sub(during[0].at, during[during.length - 1].at)) < 1e-6,
  `${during.length} frames swinging`);
let crossings = 0;
for (let i = 1; i < frames.length; i++) if ((frames[i - 1].phase - 0.5) * (frames[i].phase - 0.5) < 0) crossings++;
c.ok('the phase swings there and back, then over', crossings >= 7, `${crossings} passings of the middle`);
const framed = during.slice(-5).every(f => Math.abs(f.fromA - f.fromB) < 0.3 * Math.max(f.fromA, f.fromB));
c.ok('…the camera as far from both bodies', framed, during.length ? `${during.at(-1).fromA.toFixed(1)} and ${during.at(-1).fromB.toFixed(1)}` : '');
const brightest = new Set(during.filter(f => f.lights && f.lights.length).map(f => f.lights.indexOf(Math.max(...f.lights))));
c.ok('…the brightest ghost running along the bridge', brightest.size >= 4, `${brightest.size} ghosts brightest in turn`);

// ── Bonded ──────────────────────────────────────────────────────────────────

await page.until(`${peek}.then(p => p && p.stage === 'walking')`, { timeout: 8000 }).catch(() => {});
p = await page.eval(peek);
c.ok('bonded: B is walked', p.walking === 1 && p.stage === 'walking', `${p.walking}, ${p.stage}`);
c.ok('…A left a shell, B filled', p.shells[0] === 1 && p.shells[1] === 0, `${p.shells}`);
await wait(400);
const night = await page.eval(look);
c.ok('…under B\'s reality, its sky', near(night.top, hex('#1f1b3a'), 40), `${night.top}`);
const aWas = p.bodies[0];
await wait(500);
p = await page.eval(peek);
c.ok('not taken in again at once', p.stage === 'walking' && p.walking === 1, p.stage);
await hold('KeyW', 2500);
p = await page.eval(peek);
c.ok('B walks; A stays where it stood', len(sub(p.bodies[1], p.p)) < 1e-6 && len(sub(p.bodies[0], aWas)) < 1e-6 && p.stage === 'walking',
  `${p.stage}, ${len(sub(p.bodies[1], aWas)).toFixed(1)} from A`);

// ── And back ────────────────────────────────────────────────────────────────

await hold('KeyD', 1200);
await key('keydown', 'KeyW');
await page.until(`${peek}.then(p => p && p.stage !== 'walking')`, { timeout: 10000 }).catch(() => {});
const again = await page.eval(peek);
await key('keyup', 'KeyW');
c.ok('turned round and back into A\'s radius, the passage plays the other way', again.stage !== 'walking', again.stage);
await page.until(`${peek}.then(p => p && p.stage === 'walking')`, { timeout: 10000 }).catch(() => {});
await wait(400);
p = await page.eval(peek);
const home = await page.eval(look);
c.ok('…A walked again, under A\'s sky', p.walking === 0 && near(home.top, hex('#cfe3f1')), `${p.walking}, ${home.top}`);
const noise = c.quiet().filter(e => !(e.url || '').includes('/api/vault'));
c.ok('…and it said nothing wrong', !noise.length, JSON.stringify(noise).slice(0, 300));

await c.shot('3d-phase');
await c.finish();
