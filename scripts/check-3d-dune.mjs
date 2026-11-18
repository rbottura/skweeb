#!/usr/bin/env node
/**
 * scripts/check-3d-dune.mjs — the worm under the ground in Chrome (M16c, docs/worm.md).
 *
 *   node scripts/check-3d-dune.mjs
 *
 * Served as plain files with no vault: loft.js's worm on the ground, turned
 * blue so the picture finds it. Space pressed once, it dives — carried
 * ahead with no key held, its head leaping first and into the ground, its
 * tail after — and is buried: the middle of the picture no longer blue, the
 * ground raised over it. Under the ground it walks at its own speed, on it
 * at the other; Space again, it comes up, its head first, the ground let
 * down, blue again. A frozen worm's radius gone into under the ground takes
 * nothing in; come up in it, the passage begins. WebGPU or WebGL2,
 * whichever the machine has.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const peek = `import('/apps/3d/play/main.js').then(m => m.peek())`;
const tune = values => page.eval(`import('/apps/3d/play/main.js').then(m => m.tune(${JSON.stringify(values)}))`);
const key = (type, code) => page.eval(`document.dispatchEvent(new KeyboardEvent('${type}', { code: '${code}', key: '?', bubbles: true }))`);
const press = async code => { await key('keydown', code); await key('keyup', code); };
const hold = async (code, ms) => { await key('keydown', code); await wait(ms); await key('keyup', code); };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const max = list => list.reduce((a, b) => Math.max(a, b), -Infinity);
/** How much of the picture's middle is blue: the worm, turned blue, where it is seen. */
const look = `(async () => {
  const cv = document.querySelector('canvas.world'), b = await createImageBitmap(cv);
  const o = new OffscreenCanvas(b.width, b.height), g = o.getContext('2d');
  g.drawImage(b, 0, 0);
  const d = g.getImageData(0, 0, b.width, b.height).data;
  let blue = 0, n = 0;
  for (let y = Math.round(b.height * 0.3); y < b.height * 0.8; y += 2) for (let x = Math.round(b.width * 0.25); x < b.width * 0.75; x += 2) {
    const i = (y * b.width + x) * 4; n++;
    if (d[i + 2] > d[i] + 50 && d[i + 2] > d[i + 1] + 50) blue++;
  }
  return { blue: blue / n };
})()`;
/** Every frame for `ms`, read in the page: the dive, the distance walked, the head's height, how much is under, the ground's highest. */
const sample = ms => page.eval(`(async () => {
  const m = await import('/apps/3d/play/main.js'), out = [], t0 = performance.now();
  while (performance.now() - t0 < ${ms}) {
    const p = m.peek();
    if (p) out.push({ dive: p.dive, walked: p.walked, nose: p.nose, sunk: p.sunk, ridge: p.ridge });
    await new Promise(r => requestAnimationFrame(r));
  }
  return out; })()`);
const open = async () => {
  await c.go(c.plain + '/apps/3d/play/');
  await page.until(`${peek}.then(p => p && p.frames > 3)`, { timeout: 40000 }).catch(() => {});
};

await open();
await tune({ colour: '#1030ff', away: 60 });          // the frozen worm well out of the way
await wait(300);
let p = await page.eval(peek);
c.ok('on the ground: nothing of it under, the ground as it is', !!p && p.dive === 'surface' && p.sunk < 1e-3 && p.ridge === 0,
  p ? `${p.dive}, ${p.sunk.toFixed(4)} under, raised ${p.ridge}` : 'nothing');
const seen = await page.eval(look);
c.ok('…turned blue, the middle of the picture is', seen.blue > 0.01, `${(seen.blue * 100).toFixed(1)}%`);

// ── Down ────────────────────────────────────────────────────────────────────

const from = p.walked, nose = p.nose;
await press('Space');
const down = await sample(2200);
const diving = down.filter(f => f.dive === 'diving'), last = down.at(-1);
c.ok('Space: it dives', diving.length > 5, `${diving.length} frames diving`);
c.ok('…carried ahead, no key held', last.walked - from > 5, `${(last.walked - from).toFixed(2)} units`);
const noses = diving.map(f => f.nose);
c.ok('…its head leaping first, then into the ground', max(noses) > nose + 0.4 && Math.min(...noses) < 0,
  `its head ${nose.toFixed(2)} high, up to ${max(noses).toFixed(2)}, down to ${Math.min(...noses).toFixed(2)}`);
c.ok('…its tail after it: all of it under, buried', last.dive === 'buried' && last.sunk > 0.95, `${last.dive}, ${last.sunk.toFixed(3)} under`);
c.ok('…the ground raised over it', last.ridge > 0.15, `${last.ridge.toFixed(3)} units`);
await wait(300);
const buried = await page.eval(look);
c.ok('…out of sight: the middle no longer blue', buried.blue < seen.blue / 5, `${(buried.blue * 100).toFixed(2)}%`);
await c.shot('3d-dune');

await tune({ under: 9, speed: 3 });
let at = (await page.eval(peek)).walked;
await hold('KeyW', 1000);
p = await page.eval(peek);
c.ok('under the ground, it walks at its own speed', p.walked - at > 6 && p.walked - at < 11, `${(p.walked - at).toFixed(2)} units in a second, 9 asked`);

// ── Up ──────────────────────────────────────────────────────────────────────

await press('Space');
const up = await sample(2200), rising = up.filter(f => f.dive === 'rising');
c.ok('Space again: it comes up', rising.length > 5 && up.at(-1).dive === 'surface', `${rising.length} frames rising, ${up.at(-1).dive}`);
c.ok('…its head out first, leaping', max(rising.map(f => f.nose)) > nose + 0.4, `up to ${max(rising.map(f => f.nose)).toFixed(2)}`);
c.ok('…the ground let down', up.at(-1).ridge === 0 && up.at(-1).sunk < 1e-3, `raised ${up.at(-1).ridge}, ${up.at(-1).sunk.toFixed(4)} under`);
await wait(300);
const again = await page.eval(look);
c.ok('…blue again in the middle', again.blue > 0.01, `${(again.blue * 100).toFixed(1)}%`);
at = (await page.eval(peek)).walked;
await hold('KeyW', 1000);
p = await page.eval(peek);
c.ok('on the ground, at the other', p.walked - at > 2 && p.walked - at < 4, `${(p.walked - at).toFixed(2)} units in a second, 3 asked`);

// ── A phase, under the ground and on it ─────────────────────────────────────

await open();
await tune({ away: 10, reach: 7 });
await wait(300);
await press('Space');
await wait(250);
await c.shot('3d-dune-leap');                         // its head in the air, for the eye
await page.until(`${peek}.then(p => p && p.dive === 'buried')`, { timeout: 6000 }).catch(() => {});
await wait(500);
p = await page.eval(peek);
const near = Math.hypot(...sub(p.bodies[0], p.bodies[1]));
c.ok('a frozen worm\'s radius gone into under the ground: nothing takes it in', p.dive === 'buried' && near < 7 && p.stage === 'walking',
  `${p.dive}, ${near.toFixed(1)} from it, ${p.stage}`);
await press('Space');
await page.until(`${peek}.then(p => p && p.stage !== 'walking')`, { timeout: 6000 }).catch(() => {});
p = await page.eval(peek);
c.ok('…come up in it, the passage begins', p.stage !== 'walking' && p.dive === 'surface', `${p.stage}, ${p.dive}`);
const noise = c.quiet().filter(e => !(e.url || '').includes('/api/vault'));
c.ok('…and it said nothing wrong', !noise.length, JSON.stringify(noise).slice(0, 300));

await c.finish();
