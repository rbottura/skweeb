#!/usr/bin/env node
/**
 * scripts/check-puppet.mjs — the rig's puppet in Chrome: a drawing worn,
 * the author's eyes at its eyestalks' tips, moved by the head.
 *
 *   node scripts/check-puppet.mjs
 *
 * Chrome's fake camera stands in for the author's, playing a few frames of a
 * square going round, made here — headless, the fake camera's own picture
 * never reaches a video — so there is a camera and no face in it. Served
 * as plain files with no vault, the puppet opens and
 * says there is none (rule 7). On the server: a gamepad still saved as the
 * gamepad saves one — a body drawn upwards, a stalk each side from the head
 * out, an arm — is worn: two eyestalks found, the drawing drawn, the camera
 * on, MediaPipe up and looking for a face (or saying how to put it on this
 * machine), each frame of the camera read once. Then the page's own code on
 * a picture of two discs where a face's eyes are: each disc cut and drawn at
 * a stalk's tip, as a mirror shows them and as the camera does; a head
 * leaning bends the body, its base kept, and the springs bring it back. A
 * value changed is in the address, and the address read again brings it
 * back; H shows the avatar alone, G the guide to OBS; and inside OBS, the
 * camera refused, the page says which flag OBS wants. MediaPipe's own
 * logging aside, the console stays quiet. No GPU needed.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** A second of a grey picture with a white square going round, as Y4M: what Chrome's fake camera plays. */
function squareGoingRound(file, W = 320, H = 240, frames = 30) {
  const out = [Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420jpeg\n`)];
  for (let f = 0; f < frames; f++) {
    const y = Buffer.alloc(W * H, 110), a = (2 * Math.PI * f) / frames;
    const cx = Math.round(W / 2 + 80 * Math.cos(a)), cy = Math.round(H / 2 + 60 * Math.sin(a));
    for (let j = cy - 20; j < cy + 20; j++) for (let i = cx - 20; i < cx + 20; i++) y[j * W + i] = 235;
    out.push(Buffer.from('FRAME\n'), y, Buffer.alloc((W * H) / 2, 128));
  }
  fs.writeFileSync(file, Buffer.concat(out));
  return file;
}

const camera = squareGoingRound(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'skweeb-camera-')), 'square.y4m'));
process.env.CHROME_FLAGS = [process.env.CHROME_FLAGS, '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
  `--use-file-for-fake-video-capture=${camera}`].filter(Boolean).join(' ');
const { startCheck } = await import('./check-kit.mjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendored = fs.existsSync(path.join(ROOT, 'core/libs/mediapipe/face_landmarker.task'));
const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const row = name => `[...document.querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const wait = ms => new Promise(r => setTimeout(r, ms));
/** MediaPipe's own logging, through console.error: not the page's. */
const ours = list => list.filter(e => !/XNNPACK|TensorFlow Lite|gl_context|landmark_projection|W0000|I0000/.test(e.text || ''));

// ── Rule 7 ──────────────────────────────────────────────────────────────────

await c.go(c.plain + '/apps/rig/puppet/');
await page.until(`${say}.includes('no vault')`, { timeout: 20000 }).catch(() => {});
c.ok('opens with no vault, and says so', (await page.eval(say)).includes('no vault'), await page.eval(say));

// ── A drawing worn ──────────────────────────────────────────────────────────

await page.beforeLoad(`(() => { const p = HTMLVideoElement.prototype, r = p.requestVideoFrameCallback;
  window.__frames = 0; if (r) p.requestVideoFrameCallback = function (cb) { return r.call(this, (n, m) => { window.__frames++; cb(n, m); }); }; })();`);
await c.go(c.base + '/apps/rig/puppet/');
const plainNoise = ours(c.quiet()).filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
const made = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const line = (x0, y0, x1, y1, scale) => { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 2);
    return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, rotation: 0.3, scale,
      familyId: 'brushes', spriteIndex: 8, pattern: 'single' })); };
  const marks = [...line(300, 560, 300, 330, 0.4), ...line(270, 318, 250, 200, 0.12), ...line(330, 318, 352, 205, 0.12), ...line(294, 470, 180, 470, 0.15)];
  marks.forEach((m, i) => { m.t = i * 17; });
  const from = { x: 100, y: 120, w: 400, h: 500 };
  const sprite = await createImageBitmap(await (await fetch('/apps/gamepad/gamepad_sprites/brushes/sprite(9).png')).blob());
  const c = new OffscreenCanvas(400, 500), g = c.getContext('2d');
  for (const m of marks) { g.setTransform(1, 0, 0, 1, m.x - from.x, m.y - from.y); g.rotate(m.rotation); g.scale(m.scale, m.scale);
    g.drawImage(sprite, -sprite.width / 2, -sprite.height / 2); }
  const blob = await c.convertToBlob({ type: 'image/png' });
  const recipe = { canvas: { w: 800, h: 700, background: 'none' }, frame: { from, to: { x: 0, y: 0, w: 400, h: 500 }, w: 400, h: 500 },
    brush: { familyId: 'brushes', familyIndex: 0, spriteIndex: 8, patternIndex: 0 }, params: {}, marks };
  const id = (await Vault.save({ type: 'still', title: 'a slug', tags: ['gamepad'], origin: { app: 'gamepad', version: '1.0.0' },
    seed: null, recipe, render: { blob, ext: 'png', w: 400, h: 500 }, thumb: await thumbFromBlob(blob) })).id;
  return { id }; })()`);
c.ok('a gamepad still in the vault: a body, two stalks, an arm', !!made.id, JSON.stringify(made));

await c.go(c.base + '/apps/rig/puppet/?drawing=' + made.id);
await page.until(`${say}.includes('eyestalks')`, { timeout: 30000 }).catch(() => {});
c.ok('worn: two eyestalks found, and its bones', /a slug · 2 eyestalks · \d+ bones/.test(await page.eval(say)), await page.eval(say));
const inked = await page.eval(`(() => { const cv = document.getElementById('stage'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; })()`);
c.ok('the drawing drawn', inked > 1000, inked + ' pixels inked');
await page.until(`${say}.includes('square.y4m') || ${say}.includes('no camera')`, { timeout: 20000 }).catch(() => {});
c.ok('the camera on: Chrome\'s fake one, playing the square', (await page.eval(say)).includes('square.y4m'), await page.eval(say));
if (vendored) {
  await page.until(`${say}.includes('looking for a face') || ${say}.includes('would not start')`, { timeout: 60000 }).catch(() => {});
  c.ok('MediaPipe up, looking for a face in it', (await page.eval(say)).includes('looking for a face'), await page.eval(say));
  const a = await page.eval('window.__frames'); await wait(2000); const b = await page.eval('window.__frames');
  c.ok('each frame of the camera read once, when it comes', b - a >= 20 && b - a <= 70, `${b - a} in 2 s`);
} else {
  await page.until(`${say}.includes('vendor-mediapipe')`, { timeout: 20000 }).catch(() => {});
  c.ok('no MediaPipe here: it says how to put it on this machine', (await page.eval(say)).includes('vendor-mediapipe'), await page.eval(say));
}

// ── The eyes and the mouth, cut and worn — the page's own code on discs where a face's eyes and mouth are ──

const worn = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { wear, placesAt } = await import('/apps/rig/puppet/wear.js');
  const { eyesOf, asShown, EYE_RINGS } = await import('/apps/rig/puppet/eyes.js');
  const { mouthOf, mouthShown, MOUTH_CORNERS, ASPECT } = await import('/apps/rig/puppet/mouth.js');
  const { cutBox } = await import('/apps/rig/puppet/crop.js');
  const { tipsAt, faceAt } = await import('/apps/rig/puppet/tips.js');
  const { drawPuppet, roomOf } = await import('/apps/rig/puppet/draw.js');
  const worn = await wear((await Vault.load(${JSON.stringify(made.id)})).object, { longest: 70 });
  // The camera: a red disc on its left, a blue on its right, a green below them — and a face whose eyes and mouth are there.
  const cam = new OffscreenCanvas(640, 480), g = cam.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 640, 480);
  for (const [x, y, colour] of [[250, 240, '#ff0000'], [390, 240, '#0000ff'], [320, 352, '#00ff00']]) { g.fillStyle = colour; g.beginPath(); g.arc(x, y, 34, 0, 2 * Math.PI); g.fill(); }
  const points = Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0 }));
  EYE_RINGS.forEach((ring, k) => ring.forEach((i, j) => { const a = 2 * Math.PI * j / ring.length; points[i] = { x: [250, 390][k] + 20 * Math.cos(a), y: 240 + 8 * Math.sin(a), z: 0 }; }));
  points[MOUTH_CORNERS[0]] = { x: 280, y: 330, z: 0 }; points[MOUTH_CORNERS[1]] = { x: 360, y: 330, z: 0 };
  const places = placesAt(worn, 0), tips = tipsAt(worn.drawing, worn.tips, places, worn.images), face = faceAt(worn.drawing, worn.face, places, worn.images);
  const spots = [...tips.map(t => ({ ...t, height: t.width })), { ...face, width: face.width * 0.6, height: face.width * 0.6 * ASPECT, mouth: true }];
  const room = roomOf(worn.ink, tips, 1);
  const colour = d => (d[1] > 150 && d[0] < 100 && d[2] < 100 ? 'green' : d[0] > 150 && d[2] < 100 ? 'red' : d[2] > 150 && d[0] < 100 ? 'blue' : 'neither');
  const at = mirror => {
    const eyes = asShown(eyesOf(points, { around: 1.2 }), mirror), mouth = mouthShown(mouthOf(points, { around: 1.7 }), mirror);
    const wears = spots.map(s => ({ ...s, cut: cutBox(null, cam, s.mouth ? mouth : eyes[s.eye], { side: 64, soft: 0.2 }) }));
    const out = new OffscreenCanvas(room.width, room.height), o = out.getContext('2d');
    drawPuppet(o, { drawing: worn.drawing, places, images: worn.images, view: 1, room, ground: null, wears });
    return spots.map(s => colour(o.getImageData(Math.round(s.x - room.x), Math.round(s.y - room.y), 1, 1).data));
  };
  return { mirrored: at(true), camera: at(false) }; })()`);
c.ok('as a mirror: the camera\'s right-hand eye on the left stalk, the mouth on the face', worn.mirrored, ['blue', 'red', 'green']);
c.ok('as the camera sees: its left-hand eye on the left stalk', worn.camera, ['red', 'blue', 'green']);

// ── The head moving it ──────────────────────────────────────────────────────

const moved = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { wear, placesAt } = await import('/apps/rig/puppet/wear.js');
  const { targetsOf, springsFor } = await import('/apps/rig/puppet/sway.js');
  const worn = await wear((await Vault.load(${JSON.stringify(made.id)})).object, { longest: 70 });
  const body = worn.drawing.strokes[worn.bones.find(b => b.parent == null).stroke].stamps;
  const base = body[0], top = body[body.length - 1], rest = placesAt(worn, 0);
  const springs = springsFor(worn.bones, worn.limbs);
  const lean = targetsOf(worn.bones, worn.limbs, { yaw: 0, pitch: 0, roll: 0.3, x: 0 }, { sway: 1, nod: 1 }, worn.body);
  let live; for (let i = 0; i < 180; i++) live = { turns: springs.step(lean.turns, 1 / 60, { wobble: 0.5 }), lift: lean.lift };
  const leant = placesAt(worn, 0, live);
  const none = targetsOf(worn.bones, worn.limbs, null);
  for (let i = 0; i < 240; i++) live = { turns: springs.step(none.turns, 1 / 60, { wobble: 0.5 }), lift: 0 };
  const back = placesAt(worn, 0, live);
  return { top: leant[top].x - rest[top].x, base: Math.hypot(leant[base].x - rest[base].x, leant[base].y - rest[base].y),
           back: Math.hypot(back[top].x - rest[top].x, back[top].y - rest[top].y) }; })()`);
c.ok('a head leaning right bends the body right, its base kept', moved.top > 10 && moved.base < 1, JSON.stringify(moved));
c.ok('no face, and the springs bring it back to rest', moved.back < 0.5, moved.back.toFixed(3) + ' px from rest');

// ── The guides ──────────────────────────────────────────────────────────────

/** How many of a canvas's pixels are within a few of a colour. */
const count = (sel, [r, g, b]) => page.eval(`(() => { const cv = ${sel}; if (!cv || !cv.width) return 0; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - ${r}) < 4 && Math.abs(d[i + 1] - ${g}) < 4 && Math.abs(d[i + 2] - ${b}) < 4) n++; return n; })()`);
const stage = `document.getElementById('stage')`;
const boneBlue = [0x1f, 0x5f, 0xd6], ringYellow = [0xff, 0xd6, 0x0a];
c.ok('no guides at first: no bone over the puppet', (await count(stage, boneBlue)) === 0, (await count(stage, boneBlue)) + ' pixels');
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))`);
await wait(500);
c.ok('B: the bones as the rig draws them, the body\'s chain blue', (await count(stage, boneBlue)) > 50, (await count(stage, boneBlue)) + ' pixels');
c.ok('…and rings where the eyes and the mouth go', (await count(stage, ringYellow)) > 50, (await count(stage, ringYellow)) + ' pixels');
const seen = await page.eval(`(() => { const v = document.getElementById('seen'); return { shown: getComputedStyle(v).display !== 'none', w: v.width, h: v.height }; })()`);
c.ok('…and what the camera sees, in the corner', seen.shown && seen.w > 50 && seen.h > 30, JSON.stringify(seen));
await c.shot('guides');
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))`);
await wait(300);
c.ok('B again: gone', (await count(stage, boneBlue)) === 0 && !(await page.eval(`getComputedStyle(document.getElementById('seen')).display !== 'none'`)), true);

// ── The address, alone, the guide ───────────────────────────────────────────

await page.typeInto(`${row('eye size, × the tip')}?.querySelector('.pp-num')`, 1.4);
await wait(300);
c.ok('a value changed is in the address', (await page.eval('location.search')).includes('eyeSize=1.4'), await page.eval('location.search'));
await c.go(c.base + '/apps/rig/puppet/' + (await page.eval('location.search')));
await page.until(`${say}.includes('eyestalks')`, { timeout: 30000 }).catch(() => {});
c.ok('…and the address brings it back', Number(await page.eval(`${row('eye size, × the tip')}?.querySelector('.pp-num')?.value`)) === 1.4,
  await page.eval(`${row('eye size, × the tip')}?.querySelector('.pp-num')?.value`));
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }))`);
c.ok('H: the avatar alone, and obs in the address', await page.eval(`document.documentElement.classList.contains('obs') && location.search.endsWith('obs')`), true);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }))`);
await page.until(`document.querySelector('.nb-guide-body h1')`, { timeout: 10000 }).catch(() => {});
c.ok('G: the guide to OBS, read in the page', await page.eval(`document.querySelector('.nb-guide-body h1')?.textContent`), 'The puppet in OBS');
await c.shot('alone-with-guide');

// ── The camera switched off, for OBS, and on again ──────────────────────────

const power = `[...document.querySelectorAll('.app-side .nb-btn')].find(b => /^camera (on|off)$/.test(b.textContent))`;
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }))`);     // the panel back
await page.click(power);
await page.until(`${say}.includes('camera off')`, { timeout: 10000 }).catch(() => {});
c.ok('the camera switched off: let go, the switch says so', (await page.eval(say)).includes('camera off')
  && await page.eval(`!document.getElementById('camera').srcObject && ${power}.textContent === 'camera off'`), await page.eval(say));
await page.click(power);
await page.until(`${say}.includes('square.y4m')`, { timeout: 20000 }).catch(() => {});
c.ok('…and on again: the camera taken back', (await page.eval(say)).includes('square.y4m') && await page.eval(`!!document.getElementById('camera').srcObject`),
  await page.eval(say));

// ── Sent to OBS, and followed there ─────────────────────────────────────────

await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))`);
await page.until(`location.search.startsWith('?open=skw_')`, { timeout: 20000 }).catch(() => {});
const kept = new URLSearchParams(await page.eval('location.search')).get('open');
c.ok('sent: kept in the vault as a smart object, its address now', /^skw_/.test(kept || ''), await page.eval('location.search'));
const offered = await page.eval(`(async () => { const { Vault } = await import('/core/vault.js'); const { reopenUrl } = await import('/core/reopen.js');
  return reopenUrl((await Vault.load(${JSON.stringify(kept)})).object); })()`);
c.ok('the vault offers it back to the puppet', offered, '/apps/rig/puppet/?open=' + kept);
const obsTab = await c.tab(c.base + '/apps/rig/puppet/?open=' + kept + '&obs');
await obsTab.until(`(document.querySelector('.bar-say')?.textContent || '').includes('eyestalks')`, { timeout: 30000 }).catch(() => {});
const eyeIn = t => t.eval(`Number(${row('eye size, × the tip')}?.querySelector('.pp-num')?.value)`);
c.ok('a page opened on it, alone, wears it as sent', [await eyeIn(obsTab), await obsTab.eval(`document.documentElement.classList.contains('obs')`)], [1.4, true]);
await page.typeInto(`${row('eye size, × the tip')}?.querySelector('.pp-num')`, 1.7);
await wait(300);
c.ok('a change not yet sent is counted on the send', (await page.eval(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent.startsWith('Send to OBS'))?.textContent`)) || '',
  'Send to OBS · 1 new');
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))`);
await obsTab.until(`Number(${row('eye size, × the tip')}?.querySelector('.pp-num')?.value) === 1.7`, { timeout: 15000 }).catch(() => {});
c.ok('sent again: the page in OBS follows, with no reload', await eyeIn(obsTab), 1.7);
await obsTab.closeTab?.();

// ── Eyes drawn first, the body after and from its top: the parts found all the same ──

const eyesFirst = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const line = (x0, y0, x1, y1, scale) => { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 2);
    return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, rotation: 0.3, scale,
      familyId: 'brushes', spriteIndex: 8, pattern: 'single' })); };
  // A stalk from its tip down to the head, another from the head up, then the body from its top down, wider.
  const marks = [...line(250, 190, 266, 300, 0.12), ...line(334, 300, 352, 192, 0.12), ...line(300, 330, 300, 560, 0.4)];
  marks.forEach((m, i) => { m.t = i * 17; });
  const tiny = new OffscreenCanvas(8, 8);
  tiny.getContext('2d');
  const blob = await tiny.convertToBlob({ type: 'image/png' });
  const recipe = { canvas: { w: 800, h: 700, background: 'none' }, frame: { from: { x: 100, y: 120, w: 400, h: 500 }, to: { x: 0, y: 0, w: 400, h: 500 }, w: 400, h: 500 },
    brush: { familyId: 'brushes', familyIndex: 0, spriteIndex: 8, patternIndex: 0 }, params: {}, marks };
  const id = (await Vault.save({ type: 'still', title: 'eyes first', tags: ['gamepad'], origin: { app: 'gamepad', version: '1.0.0' },
    seed: null, recipe, render: { blob, ext: 'png', w: 400, h: 500 }, thumb: await thumbFromBlob(blob) })).id;
  const { wear } = await import('/apps/rig/puppet/wear.js');
  const worn = await wear((await Vault.load(id)).object, { longest: 70 });
  const y = i => Math.round(worn.drawing.stamps[i].y);
  return { id, roles: worn.roles.roles, tips: worn.tips.map(y), face: y(worn.face.stamp), root: worn.bones.find(b => b.parent == null).stroke }; })()`);
c.ok('drawn eyes first: the widest stroke is the body, hung first', [eyesFirst.roles, eyesFirst.root], [['eye', 'eye', 'body'], 2]);
c.ok('…the eyes at the stalks\' free ends, the mouth at the body\'s top', [eyesFirst.tips, eyesFirst.face], [[70, 72], 210]);
await c.go(c.base + '/apps/rig/puppet/?drawing=' + eyesFirst.id);
await page.until(`${say}.includes('eyestalks')`, { timeout: 30000 }).catch(() => {});
c.ok('worn: two eyestalks', (await page.eval(say)).includes('eyes first · 2 eyestalks'), await page.eval(say));
await page.typeInto(`[...document.querySelectorAll('.pz-part')][0]?.querySelector('select')`, 'limb');
await page.until(`${say}.includes('one eyestalk')`, { timeout: 30000 }).catch(() => {});
c.ok('a stroke told a limb in Parts: one eyestalk, and told in the address', (await page.eval(say)).includes('one eyestalk')
  && (await page.eval('location.search')).includes('parts=limb'), await page.eval(say) + ' ' + await page.eval('location.search'));

// ── Inside OBS, the camera refused ──────────────────────────────────────────

await page.beforeLoad(`window.obsstudio = { pluginVersion: 'check' };
  navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('refused', 'NotAllowedError'));`);
await c.go(c.base + '/apps/rig/puppet/?drawing=' + made.id + '&obs');
await page.until(`!document.getElementById('trouble').hidden && document.getElementById('trouble').textContent.includes('OBS')`, { timeout: 20000 }).catch(() => {});
c.ok('inside OBS with no camera, it says which flag OBS wants', (await page.eval(`document.getElementById('trouble').textContent`)).includes('--enable-media-stream'),
  await page.eval(`document.getElementById('trouble').textContent`));

const noise = ours(c.quiet());
c.ok('the console stayed quiet, MediaPipe\'s own logging aside', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
