/**
 * check-gamepad.mjs — the gamepad itself, in a real browser (C6a,
 * docs/gamepad.md): the brushes family chosen, a recording armed, a stroke
 * drawn by a pad that is not there, the recording a layer of the timeline;
 * the ink cleared and the layer played, the stage drawing it on the canvas;
 * exported to the vault as a loop, and that loop replayed by core
 * (core/rebuild.js) — its frame the one saved, pixel for pixel.
 *
 * What it guards through C6 is the drawing and the replay with no p5 in
 * them: core's stage first (C6a), then the page (C6b).
 *
 *   node scripts/check-gamepad.mjs
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const sketch = `import('/apps/gamepad/sketch/gamepadSketch.js')`;

await c.go(c.base + '/apps/gamepad/');
await page.until(`!!document.querySelector('.bsel-card')`, { timeout: 20000 });
// The brushes family alone, which is in git: Clear All, then its card.
await page.eval(`(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Clear All')?.click();
  [...document.querySelectorAll('.bsel-card')].find(c => c.textContent.trim().startsWith('brushes'))?.click();
  document.querySelector('#bsel-launch')?.click();
})()`);
await page.until(`!!document.querySelector('#sketch-container canvas')`, { timeout: 20000 });
await wait(400);

// The ink on the page's canvas, as a share of it: what is not white.
const inked = `(() => {
  const cv = document.querySelector('#sketch-container canvas');
  const x = Object.assign(document.createElement('canvas'), { width: 240, height: 135 }).getContext('2d');
  x.drawImage(cv, 0, 0, 240, 135);
  const d = x.getImageData(0, 0, 240, 135).data;
  let ink = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 600) ink++;
  return ink / (d.length / 4);
})()`;

// Armed, a stroke drawn with a pad held over, turning — and disarmed: a layer.
const drew = await page.eval(`(async () => {
  const { InputManager } = await import('/apps/gamepad/core/inputManager.js');
  const { SequenceRecorder } = await import('/core/stage/recorder.js');
  const pad = (ax, ay, turn, held = [0]) => ({ axes: [ax, ay, turn, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: held.includes(i), value: held.includes(i) ? 1 : 0 })) });
  document.dispatchEvent(new CustomEvent('parampanel:toggleSequence'));
  InputManager.update(pad(0, 0, 0, []));
  for (let i = 0; i < 40; i++) { InputManager.update(pad(0.7, 0.3, 0.4)); await new Promise(r => requestAnimationFrame(r)); }
  InputManager.update(pad(0, 0, 0, []));
  const marks = SequenceRecorder.liveCount;
  document.dispatchEvent(new CustomEvent('parampanel:toggleSequence'));
  return marks;
})()`);
const layers = await page.eval(`${sketch}.then(m => m.getStage().layers.map(l => ({ name: l.name, canvas: l.player.buffer instanceof HTMLCanvasElement,
  w: l.player.buffer.width, h: l.player.buffer.height, bytes: l.player.byteSize })))`);
c.ok(`a stroke of ${drew} marks recorded: a layer, its buffer a canvas`, drew >= 30 && layers.length === 1 && layers[0].canvas
  && layers[0].bytes === layers[0].w * layers[0].h * 4, JSON.stringify(layers));
const drawn = await page.eval(inked);
c.ok('…the stroke on the ink', drawn > 0.005, `${(drawn * 100).toFixed(2)}% inked`);

// The ink cleared, the layer played: what the canvas shows is the stage's — the cursor is not drawn over it.
await page.eval(`document.dispatchEvent(new CustomEvent('parampanel:clearCanvas'))`);
await wait(200);
const cleared = await page.eval(`${sketch}.then(m => {
  const ink = m.getOverlayCanvas(), d = ink.getContext('2d').getImageData(0, 0, ink.width, ink.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
  return n / (d.length / 4);
})`);
await page.eval(`${sketch}.then(m => m.playStage())`);
await page.until(`${sketch}.then(m => m.getStage().layers[0].player.position > 20)`, { timeout: 10000 }).catch(() => {});
await wait(300);
const played = await page.eval(inked);
const state = await page.eval(`${sketch}.then(m => ({ active: m.isStageActive(), playing: m.getTransport().playing, at: m.getStage().layers[0].player.position }))`);
c.ok('the ink cleared, the layer played: the stage draws it on the canvas', cleared === 0 && played > 0.002 && state.active && state.playing,
  `${(cleared * 100).toFixed(2)}% → ${(played * 100).toFixed(2)}% · ${JSON.stringify(state)}`);
await c.shot('gamepad-played');
await page.eval(`${sketch}.then(m => m.stopStage())`);

// Exported as a loop, and replayed by core: the frame it kept, to the pixel.
const replay = await page.eval(`(async () => {
  const { getStage } = await ${sketch};
  const { exportLayerToVault } = await import('/apps/gamepad/core/exportSequence.js');
  const { representativeTick } = await import('/core/stage/clip.js');
  const { openSequence } = await import('/core/rebuild.js');
  const layer = getStage().layers[0];
  const { object, frames } = await exportLayerToVault(layer, { fps: 30 });
  if (!object) return { saved: false };
  const handle = await openSequence(object);
  const at = Math.min(representativeTick(layer.player.clip), frames - 1);
  const frame = handle.frame(at);
  const bmp = await createImageBitmap(await (await fetch('/vault/objects/' + object.id + '/' + object.render.file)).blob());
  const read = (src, w, h) => { const x = Object.assign(document.createElement('canvas'), { width: w, height: h }).getContext('2d');
    x.drawImage(src, 0, 0); return x.getImageData(0, 0, w, h).data; };
  const w = bmp.width, h = bmp.height, a = read(bmp, w, h), b = read(frame, w, h);
  let off = 0, ink = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > off) off = d; }
  for (let i = 3; i < a.length; i += 4) if (a[i] > 0) ink++;
  const out = { saved: true, frames, length: handle.length, size: [w, h], replayed: [frame.width, frame.height], off, ink, missing: handle.missing };
  handle.dispose();
  return out;
})()`);
c.ok('exported as a loop, replayed by core: its frame the one saved, to the pixel', replay.saved && replay.length === replay.frames
  && replay.size.join() === replay.replayed.join() && replay.off === 0 && replay.ink > 50 && !replay.missing.length, JSON.stringify(replay));

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
