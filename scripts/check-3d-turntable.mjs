#!/usr/bin/env node
/**
 * scripts/check-3d-turntable.mjs — the 3D app's turntable (M10's fifth
 * brick, P1; apps/3d/motion.js).
 *
 *   node scripts/check-3d-turntable.mjs
 *
 * The opening model given a turn in its Motion drawer: the player under the
 * viewer, 72 frames at 24 fps, playing at once, the chosen sphere's handles
 * hidden while it plays; a frame a quarter round another picture, the frame
 * after the last the first. S saves its loop: a `sequence` made by 3d, its
 * frames and its rate, its recipe the model's and its turn, its picture the
 * frame on screen; drawn again by its app, that frame is its render, and
 * frame 72 is frame 0; core's replay plays it, 72 frames. Every frame
 * downloads, a zip of 72 PNGs and its meta. Turned back to none, the player
 * goes and S saves a model again. And no page said anything wrong.
 *
 * Apart from check-3d, which follows one still model from its opening to
 * its save.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck, inner } from './check-kit.mjs';   // inner: a smart object as its app has it (S6b)

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const panelRow = name => `[...document.querySelectorAll('#side .pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const key = k => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`);
const strip = `document.querySelector('.viewer-player')`;
const playing = () => page.eval(`!!document.querySelector('.tp-play.tp-playing')`);
const count = () => page.eval(`document.querySelector('.tp-count')?.textContent || ''`);
const scrubTo = i => page.eval(`(s => { s.value = ${i}; s.dispatchEvent(new Event('input', { bubbles: true })); return true; })(document.querySelector('.tp-scrub'))`);
const keep = name => page.eval(`(c => { (window.__kept ||= {})[${JSON.stringify(name)}] = c.getContext('2d').getImageData(0, 0, c.width, c.height); return true; })(document.getElementById('stage'))`);
const apart = (a, b) => page.eval(`(() => { const x = window.__kept[${JSON.stringify(a)}], y = window.__kept[${JSON.stringify(b)}];
  if (!x || !y || x.width !== y.width || x.height !== y.height) return null;
  let n = 0;
  for (let i = 0; i < x.data.length; i += 4) if (Math.abs(x.data[i] - y.data[i]) + Math.abs(x.data[i + 1] - y.data[i + 1]) + Math.abs(x.data[i + 2] - y.data[i + 2]) >= 24) n++;
  return n / (x.width * x.height); })()`);
const green = () => page.eval(`(() => { const c = document.getElementById('stage'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 200 && d[i] < 80 && d[i + 2] < 80) n++; return n; })()`);
const onStage = (fx, fy) => page.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect();
  return [Math.round(r.left + ${fx} * r.width), Math.round(r.top + ${fy} * r.height)]; })()`);
const saved = async () => {
  await page.eval(`document.querySelector('.bar-say').textContent = ''`);
  await key('S');
  await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
  const id = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
  return id ? inner(await (await fetch(c.base + '/api/vault/' + id)).json()) : null;
};

await c.go(c.base + '/apps/3d/');
await page.until(`/box, sphere, torus|nothing draws/.test(${say})`, { timeout: 30000 });
if (/nothing draws/.test(await page.eval(say))) {
  console.log('     (nothing draws in 3D here — no turntable to check)');
  await c.finish();
}
const DL = path.join(c.dir, 'downloads');
await page.downloadsTo(DL);
c.ok('a model that does not turn: no player under the viewer', await page.eval(`!${strip} || ${strip}.hidden`));

// The sphere chosen, its handles drawn: then a turn.
await page.pointer(await onStage(0.5, 0.5));
await wait(400);
const handlesStill = await green();
await page.click(`[...document.querySelectorAll('.dr-head, .pp-drawer-head, summary')].find(h => /^Motion/.test(h.textContent.trim()))`).catch(() => {});
await page.typeInto(`${panelRow('turns a loop')}?.querySelector('.pp-num')`, '1');
await page.until(`!!${strip} && !${strip}.hidden && !!document.querySelector('.tp-play.tp-playing')`, { timeout: 10000 });
c.ok('a turn given: the player under the viewer, 72 frames, playing at once', /\/ 72$/.test(await count()) && await playing(), await count());
await wait(500);
c.ok('…the chosen sphere\'s handles hidden while it plays', handlesStill > 50 && (await green()) === 0, `${handlesStill} green, then ${await green()}`);
await c.shot('1-turning');

// Held: frame 0, a quarter round, and the frame after the last.
await key(' ');
await page.until(`!document.querySelector('.tp-play.tp-playing')`, { timeout: 5000 });
await scrubTo(0); await wait(300); await keep('f0');
await scrubTo(18); await wait(300); await keep('f18');
const quarter = await apart('f0', 'f18');
c.ok('held, a frame a quarter round is another picture', quarter > 0.02, `${(quarter * 100).toFixed(1)}% of its pixels apart`);
c.ok('…its handles back, held still', (await green()) > 50);
await scrubTo(71); await wait(200);
await key('.');
await wait(300); await keep('f72');
c.ok('…and . from the last frame is the first again', /^1 \//.test(await count()) && (await apart('f0', 'f72')) === 0, await count());

// S: the loop into the vault, the frame on screen its picture.
await scrubTo(18); await wait(300);
const o = await saved();
c.ok('S saves its loop: a sequence made by 3d, 72 frames at 24 fps, titled as it turns', !!o && o.type === 'sequence' && o.origin.app === '3d'
  && o.render.frames === 72 && o.render.fps === 24 && o.render.loop === true && o.title === 'box, sphere, torus · turning ×72',
  o ? `${o.type} ${o.render.frames}@${o.render.fps} "${o.title}"` : await page.eval(say));
c.ok('…its recipe the model\'s and its turn', !!o && o.recipe.turns === 1 && o.recipe.length === 72 && o.recipe.turning === 'the model'
  && o.recipe.shapes.length === 3);
if (o) {
  const replay = await page.eval(`(async () => {
    const { Vault } = await import('/core/vault.js');
    const { openFrames } = await import('/core/rebuild.js');
    const app = await import('/apps/3d/rebuild.js');
    const { object, url } = await Vault.load(${JSON.stringify(o.id)});
    const img = await createImageBitmap(await (await fetch(url)).blob());
    const read = (src, w, h) => { const x = new OffscreenCanvas(w, h).getContext('2d'); x.drawImage(src, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
    const render = read(img, img.width, img.height);
    const it = object.type === 'skw' ? (await import('/core/smart.js')).unwrap(object) : object;
    const own = await app.openObject(it, { url });
    const at18 = read(own.frame(18), img.width, img.height);
    let off = 0; for (let i = 0; i < render.length; i++) if (Math.abs(render[i] - at18[i]) > 8) off++;
    const f0 = read(own.frame(0), img.width, img.height), f72 = read(own.frame(72), img.width, img.height);
    let same = true; for (let i = 0; i < f0.length; i++) if (f0[i] !== f72[i]) { same = false; break; }
    const played = await openFrames(object, { url });
    const out = { off: off / render.length, same, length: own.length, fps: own.fps, played: played.length };
    own.dispose(); played.dispose(); return out;
  })()`);
  c.ok('drawn again by its app: the frame on screen is its render', replay.off < 0.001, `${(replay.off * 100).toFixed(3)}% past 8`);
  c.ok('…frame 72 is frame 0, to the bit', replay.same && replay.length === 72 && replay.fps === 24, JSON.stringify(replay));
  c.ok('…and core\'s replay plays it, 72 frames', replay.played === 72, String(replay.played));
}

// Every frame, for frames-to-video.
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Download every frame (zip)')`);
await page.until(`/^downloaded|failed/.test(${say})`, { timeout: 120000 });
let zip = null;
for (let i = 0; i < 100 && !zip; i++) {
  const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => n.endsWith('_72_frames.zip'));
  if (f) zip = fs.readFileSync(path.join(DL, f)); else await wait(200);
}
const entries = zip ? zip.toString('latin1').split('PK\x03\x04').length - 1 : 0;
c.ok('every frame downloads: 72 PNGs and its meta, one zip', entries === 73 && zip.includes('"frames": 72'), `${entries} entries`);

// Back to none: the player goes, S a model again.
await page.typeInto(`${panelRow('turns a loop')}?.querySelector('.pp-num')`, '0');
await page.until(`!${strip} || ${strip}.hidden`, { timeout: 10000 });
const every = await page.eval(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Download every frame (zip)')?.hidden`);
c.ok('turned back to none: the player gone, and every frame with it', every === true);
const still = await saved();
c.ok('…S saves a model again, the next state of the same smart object', !!still && still.type === 'model' && !!o && still.id === o.id,
  still ? `${still.type} ${still.id} v${still.version}` : 'nothing saved');
await c.shot('2-still-again');

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
