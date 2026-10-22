#!/usr/bin/env node
/**
 * scripts/check-particles-fields.mjs — M6's app in Chrome: what moves the
 * particles, and what is moved by hand.
 *
 *   node scripts/check-particles-fields.mjs
 *
 * A ring aimed outward blooms, and the burst leaves as a sprite sheet
 * tagged as played once; a stream through a vortex and curl noise still
 * closes its loop, and a frame of it costs less than a 60 fps frame; tilted
 * into depth behind a close camera, it is another picture and still a loop.
 * The guides: G switches them, the emitter and the fields' centre are dragged
 * by their handles, and a save made with them on has none in its picture.
 * A picture from outside, dropped on the vault panel, comes in as a shape and
 * is picked as the one sprite; an opaque one is a still, several a set too.
 * Split from check-particles.mjs on 2026-10-22, at the line cap; the loop,
 * the burst, print scale, a set's sprites and the saves are there.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const DL = path.join(c.dir, 'downloads');
/** A downloaded file whose name ends so, once it has finished. */
const downloaded = async ending => {
  for (let i = 0; i < 100; i++) {
    const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => n.endsWith(ending));
    if (f) return path.join(DL, f);
    await new Promise(r => setTimeout(r, 200));
  }
  return null;
};
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const count = `(document.querySelector('.tp-count')?.textContent || '')`;
const key = k => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`);
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const set = async (name, value) => { await page.typeInto(`${row(name)}?.querySelector('.pp-num')`, value); await wait(300); };
const scrubTo = async tick => {
  await page.eval(`(() => { const s = document.querySelector('.tp-scrub'); s.value = ${tick};
    s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await wait(250);
};
// The picture as a 16 × 16 grid of mean colours: two frames are the same when no cell differs.
const pixels = () => page.eval(`(() => { const c = document.getElementById('stage');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const n = 16, out = new Array(n * n).fill(0), k = new Array(n * n).fill(0);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4, j = Math.floor(y * n / c.height) * n + Math.floor(x * n / c.width);
    out[j] += d[i] + d[i + 1] + d[i + 2]; k[j]++;
  }
  return out.map((v, j) => v / Math.max(1, k[j]) / 3); })()`);
const apart = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));
/** A store-only zip's entries, as core/export.js writes them: [{ name, bytes }]. */
const readZip = file => {
  const b = fs.readFileSync(file), out = [];
  for (let off = 0; b.readUInt32LE(off) === 0x04034b50;) {
    const size = b.readUInt32LE(off + 18), nl = b.readUInt16LE(off + 26);
    out.push({ name: b.slice(off + 30, off + 30 + nl).toString(), bytes: b.slice(off + 30 + nl, off + 30 + nl + size) });
    off += 30 + nl + size;
  }
  return out;
};

// ── Emitters and fields ─────────────────────────────────────────────────────

await c.go(c.base + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
key(' '); await wait(200);
const chip = (name, text) => page.click(`[...${row(name)}.querySelectorAll('button')].find(b => b.textContent === ${JSON.stringify(text)})`);
await scrubTo(20);
const torchAt20 = await pixels();

// A ring, aimed outward, as a burst: a bloom.
await chip('mode', 'burst');
await chip('emitter', 'ring');
await wait(200);
await chip('launch', 'outward');
await set('gravity px/s²', '0');
await scrubTo(12);
c.ok('a ring aimed outward blooms', apart(await pixels(), torchAt20) > 4, 'apart by ' + apart(await pixels(), torchAt20).toFixed(1));
await c.shot('7-ring-bloom');

// The one-shot as a sprite sheet too: M6's Done when — a torch loop and a burst, both as sheets.
await page.downloadsTo(DL);
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Download a sprite sheet')`);
await page.until(`/^downloaded|failed/.test(${say})`, { timeout: 120000 });
const burstZip = await downloaded('particles_burst_55f_sheet.zip');
const burstJson = burstZip ? readZip(burstZip).find(e => e.name.endsWith('.json')) : null;
const burstSheet = burstJson ? JSON.parse(burstJson.bytes.toString()) : null;
c.ok('a burst leaves as a sprite sheet too, tagged as played once', !!burstSheet && burstSheet.frames.length === 55
  && burstSheet.meta.frameTags[0].loop === false, burstSheet ? `${burstSheet.frames.length} frames, ${JSON.stringify(burstSheet.meta.frameTags[0])}` : await page.eval(say));

// A stream through a vortex and curl noise: every frame still its own, the loop still closed.
await chip('mode', 'stream');
await chip('emitter', 'disc');
await set('gravity px/s²', '-200');
await set('vortex px/s²', '600');
await set('curl noise px/s²', '900');
await scrubTo(17);
const swirl = await pixels();
c.ok('a vortex and curl noise move the stream', apart(swirl, torchAt20) > 4);
await scrubTo(59); key('.'); await wait(300);
for (let i = 0; i < 17; i++) key('.');
await wait(500);
c.ok('through a field, the loop still closes pixel for pixel', apart(await pixels(), swirl) === 0,
  `${await page.eval(count)}, apart by ${apart(await pixels(), swirl)}`);
const ms = await page.eval(`(async () => {
  const { particlesAt, prepare } = await import('/apps/particles/model.js');
  const m = prepare({ rate: 90, period: 2, life: 1.4, gravity: -200, vortex: 600, noise: 900, shape: 'disc' });
  const t0 = performance.now(); for (let i = 0; i < 20; i++) particlesAt(m, i / 30); return (performance.now() - t0) / 20;
})()`);
c.ok('a frame through the fields costs less than a 60 fps frame', ms < 16, ms.toFixed(1) + ' ms');
await c.shot('8-swirl');

// Depth: the cone tilted into it, a camera close in — far ones small, near ones large, and still a loop.
await set('vortex px/s²', '0');
await set('curl noise px/s²', '0');
await set('into depth °', '160');
await set('focal px', '400');
await scrubTo(24);
const deep = await pixels();
await set('into depth °', '0');
await scrubTo(24);
const flatNow = await pixels();
c.ok('into depth, the same stream is another picture', apart(deep, flatNow) > 2, 'apart by ' + apart(deep, flatNow).toFixed(1));
await set('into depth °', '160');
await scrubTo(59); key('.'); await wait(300);
for (let i = 0; i < 24; i++) key('.');
await wait(500);
c.ok('in depth, the loop still closes pixel for pixel', apart(await pixels(), deep) === 0,
  `${await page.eval(count)}, apart by ${apart(await pixels(), deep)}`);
await c.shot('9-depth');

// ── Guides: seen in the preview, dragged, never saved ───────────────────────

await c.go(c.base + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
key(' '); await wait(200);
await scrubTo(10);
const guided = await pixels();
key('g'); await wait(300);
const bare = await pixels();
c.ok('G takes the guides away, and the particles stay', apart(guided, bare) > 1
  && (await page.eval(`document.getElementById('guides').getAttribute('aria-pressed')`)) === 'false');
key('g'); await wait(300);
// Within a level, not to the pixel: Chrome moves a canvas read back often off
// the GPU and draws it a hair differently after (check-frames.mjs says the same).
c.ok('and G brings them back', apart(await pixels(), guided) <= 1, 'apart by ' + apart(await pixels(), guided).toFixed(2));
await page.click(`document.getElementById('guides')`); await wait(300);
c.ok('the switch over the viewer turns them off too', apart(await pixels(), bare) <= 1
  && (await page.eval(`document.getElementById('guides').getAttribute('aria-pressed')`)) === 'false');
await page.click(`document.getElementById('guides')`); await wait(300);

/** Where a point of the picture, from its centre, is on screen. */
const onScreen = (x, y) => page.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect();
  return [r.left + r.width / 2 + ${x} * r.width / 1080, r.top + r.height / 2 + ${y} * r.height / 1080]; })()`);
const value = name => page.eval(`Number(${row(name)}?.querySelector('.pp-num')?.value)`);
const grab = await onScreen(0, 260);
await page.pointer(grab, [grab[0] + 80, grab[1] - 60], 8);
await wait(300);
const moved = [await value('x from centre'), await value('y from centre')];
const css = await page.eval(`document.getElementById('stage').getBoundingClientRect().width / 1080`);
c.ok('the emitter dragged by its handle, its rows following', Math.abs(moved[0] - 80 / css) <= 2 && Math.abs(moved[1] - (260 - 60 / css)) <= 2,
  `x ${moved[0]}, y ${moved[1]}`);
await page.pointer(await onScreen(300, -300), await onScreen(200, -200), 4);
await wait(200);
c.ok('a press away from any handle moves nothing', (await value('x from centre')) === moved[0]);

// The fields' centre is there before any field is on, to be placed first.
const fgrab = await onScreen(0, 0);
await page.pointer(fgrab, [fgrab[0] - 50, fgrab[1] + 40], 6);
await wait(300);
const f = [await value('centre x'), await value('centre y')];
c.ok('the fields\' centre, placed by its handle before a field is on', Math.abs(f[0] + 50 / css) <= 2 && Math.abs(f[1] - 40 / css) <= 2, `fx ${f[0]}, fy ${f[1]}`);

// A vortex with a reach: its circle's handle pulls the radius wider.
await set('vortex px/s²', '500');
await set('reach px (0: everywhere)', '150');
const rgrab = await onScreen(f[0] + 150, f[1]);
await page.pointer(rgrab, await onScreen(f[0] + 230, f[1] + 60), 6);
await wait(300);
const reached = await value('reach px (0: everywhere)');
c.ok('the reach dragged by the handle on its circle', Math.abs(reached - Math.hypot(230, 60)) <= 3, `reach ${reached}`);
await c.shot('10-guides');

// Saved, the render is the particles alone: the replay, which draws no guides, is it to the pixel.
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
key('S');
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const gid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const clean = gid && await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { openFrames } = await import('/core/rebuild.js');
  const { object, url } = await Vault.load(${JSON.stringify(gid || '')});
  const h = await openFrames(object, { url });
  const img = await createImageBitmap(await (await fetch(url)).blob());
  const a = new OffscreenCanvas(img.width, img.height).getContext('2d'); a.drawImage(img, 0, 0);
  const b = new OffscreenCanvas(img.width, img.height).getContext('2d'); b.drawImage(h.frame(10), 0, 0);
  const da = a.getImageData(0, 0, img.width, img.height).data, db = b.getImageData(0, 0, img.width, img.height).data;
  let worst = 0; for (let i = 0; i < da.length; i++) worst = Math.max(worst, Math.abs(da[i] - db[i]));
  h.dispose(); return worst;
})()`);
c.ok('saved with the guides on, its picture has none', clean === 0, 'worst ' + clean);

// ── A picture from outside: dropped on the vault, used as the one sprite ─────

await c.go(c.base + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
key(' '); await wait(200);
/** A star, drawn in the page on no ground, as a PNG File — or a square with a ground, opaque. */
const makeFile = (name, opaque = false) => `(async () => {
  const c = new OffscreenCanvas(64, 64), g = c.getContext('2d');
  if (${opaque}) { g.fillStyle = '#204080'; g.fillRect(0, 0, 64, 64); }
  // Each name its own colour, so no two files are the same bytes: the vault
  // dedups on bytes, and hands back the first of two identical pictures.
  let h = 0; for (const ch of ${JSON.stringify(name)}) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  g.fillStyle = ${JSON.stringify(name)} === 'star.png' ? '#e8a010' : '#' + (h & 0xffffff).toString(16).padStart(6, '0');
  g.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 30, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
  g.fill();
  return new File([await c.convertToBlob({ type: 'image/png' })], ${JSON.stringify(name)}, { type: 'image/png' });
})()`;
await page.click(`[...${row('sprites')}.querySelectorAll('button')].find(b => b.textContent === 'Choose…')`);
await page.until(`!!document.querySelector('.vp--visible')`, { timeout: 20000 });
await page.eval(`(async () => {
  const dt = new DataTransfer(); dt.items.add(await ${makeFile('star.png')});
  document.querySelector('.vp--visible').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
})()`);
await page.until(`[...document.querySelectorAll('.vp--visible .vp-cell')].some(k => k.querySelector('.vp-name')?.textContent === 'star')`,
  { timeout: 30000 }).catch(() => {});
const vaultNow = async () => (await (await fetch(c.base + '/api/vault')).json()).objects || [];
const star = (await vaultNow()).find(r => r.title === 'star' && r.origin && r.origin.app === 'import');
c.ok('a picture dropped on the vault comes in, a shape: it has see-through pixels', !!star && star.type === 'shape',
  star ? `${star.id} ${star.type} ${JSON.stringify(star.tags)}` : 'not found');
await page.click(`[...document.querySelectorAll('.vp--visible .vp-cell')].find(k => k.querySelector('.vp-name')?.textContent === 'star')?.querySelector('.vp-use')`);
await page.until(`/[0-9]+ sprites?|could not/.test(${say})`, { timeout: 30000 });
c.ok('picked in the same panel, it is every particle\'s sprite', (await page.eval(say)).includes('star: 1 sprite'), await page.eval(say));
await scrubTo(10);
await c.shot('11-star');

// Through the importer itself: an opaque picture is a still; several are a set too; twice is once.
const imported = await page.eval(`(async () => {
  const { importPictures } = await import('/core/vault-import.js');
  const one = await importPictures([await ${makeFile('tile.png', true)}]);
  const many = await importPictures([await ${makeFile('b 2.png')}, await ${makeFile('b 10.png', true)}, await ${makeFile('b 1.png', true)}]);
  const again = await importPictures([await ${makeFile('star.png')}]);
  return { tile: one.objects[0].type, members: many.objects.map(o => o.title), set: many.set && many.set.recipe,
           setType: many.set && many.set.type, again: again.objects[0].id };
})()`);
c.ok('an opaque picture comes in as a still', imported.tile === 'still', imported.tile);
c.ok('several come in in their names\' order, numbers as numbers', JSON.stringify(imported.members) === '["b 1","b 2","b 10"]',
  JSON.stringify(imported.members));
c.ok('and make a set, a sprite family', imported.setType === 'set' && imported.set.role === 'brush-family'
  && imported.set.members.length === 3, JSON.stringify(imported.set));
c.ok('the same file twice is one object', imported.again === (star && star.id), imported.again);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
