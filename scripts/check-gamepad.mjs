/**
 * check-gamepad.mjs — the gamepad itself, in a real browser (C6,
 * docs/gamepad.md): the brushes family chosen, a recording armed, a stroke
 * drawn by a pad that is not there, the recording a layer of the timeline;
 * the ink cleared and the layer played, the stage drawing it on the canvas;
 * exported to the vault as a loop, and that loop replayed by core
 * (core/rebuild.js) — its frame the one saved, pixel for pixel. Then at a
 * HiDPI screen's density, twice the pixels each way: a still saved is its
 * frame in the marks' units, the marks drawn again by core over it. Since
 * C6c: Start on the pad arms and disarms the recording, R3 steps the
 * pattern — a setting of core's panel, which holds the gamepad's. Since
 * C6d, a module with no splash: every family offered, brushes first, the
 * next decoded the first time it is drawn with — and a recording replayed
 * on the page leaves them all (core/registry.js `loadFamilies`).
 *
 * What it guards through C6 is the drawing and the replay with no p5 in
 * them: core's stage (C6a), then the page (C6b).
 *
 *   node scripts/check-gamepad.mjs
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const sketch = `import('/apps/gamepad/sketch/gamepadSketch.js')`;

/** The page opened — no splash since C6d: brushes, the family git keeps, decoded first. */
async function open() {
  await c.go(c.base + '/apps/gamepad/');
  await page.until(`!!document.querySelector('#sketch-container canvas') && !!document.querySelector('#side .pp-row')`, { timeout: 20000 });
  await wait(400);
}

/** A stroke drawn by a pad that is not there, its stick held over and turning, A held. */
const stroke = (ax, ay, turn, frames) => `
  const { InputManager } = await import('/apps/gamepad/core/inputManager.js');
  const pad = (ax, ay, turn, held = [0]) => ({ axes: [ax, ay, turn, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: held.includes(i), value: held.includes(i) ? 1 : 0 })) });
  InputManager.update(pad(0, 0, 0, []));
  for (let i = 0; i < ${frames}; i++) { InputManager.update(pad(${ax}, ${ay}, ${turn})); await new Promise(r => requestAnimationFrame(r)); }
  InputManager.update(pad(0, 0, 0, []));`;

/** A button of the pad pressed and let go (Start 9, R3 11), the sticks at rest. */
const press = button => `await (async () => {
    const { InputManager: I } = await import('/apps/gamepad/core/inputManager.js');
    const b = held => ({ axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: held.includes(i), value: held.includes(i) ? 1 : 0 })) });
    I.update(b([${button}])); I.update(b([]));
  })();`;

/** Two pictures' pixels, read the same way. */
const reading = `const read = (src, w, h) => { const x = Object.assign(document.createElement('canvas'), { width: w, height: h }).getContext('2d');
    x.drawImage(src, 0, 0); return x.getImageData(0, 0, w, h).data; };`;

// The ink on the page's canvas, as a share of it: what is not white.
const inked = `(() => {
  const cv = document.querySelector('#sketch-container canvas');
  const x = Object.assign(document.createElement('canvas'), { width: 240, height: 135 }).getContext('2d');
  x.drawImage(cv, 0, 0, 240, 135);
  const d = x.getImageData(0, 0, 240, 135).data;
  let ink = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 600) ink++;
  return ink / (d.length / 4);
})()`;

await open();

// Armed by Start, a stroke drawn, disarmed by Start: a layer.
const drew = await page.eval(`(async () => {
  const { SequenceRecorder } = await import('/core/stage/recorder.js');
  ${press(9)}
  const armed = SequenceRecorder.recording;
  ${stroke(0.7, 0.3, 0.4, 40)}
  const marks = SequenceRecorder.liveCount;
  ${press(9)}
  return armed && !SequenceRecorder.recording ? marks : -marks;
})()`);
const layers = await page.eval(`${sketch}.then(m => m.getStage().layers.map(l => ({ name: l.name, canvas: l.player.buffer instanceof HTMLCanvasElement,
  w: l.player.buffer.width, h: l.player.buffer.height, bytes: l.player.byteSize })))`);
c.ok(`Start, a stroke of ${drew} marks, Start: recorded, a layer, its buffer a canvas`, drew >= 30 && layers.length === 1 && layers[0].canvas
  && layers[0].bytes === layers[0].w * layers[0].h * 4, JSON.stringify(layers));
const drawn = await page.eval(inked);
c.ok('…the stroke on the ink', drawn > 0.005, `${(drawn * 100).toFixed(2)}% inked`);

// The ink cleared, the layer played: what the canvas shows is the stage's — the cursor is not drawn over it.
await page.eval(`document.dispatchEvent(new CustomEvent('gamepad:clear'))`);
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
  ${reading}
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

// Every family offered, brushes first; the D-pad's next one decoded when first drawn with — and the replay above left
// the selection as it was (core/registry.js `loadFamilies`, C6d).
const families = await page.eval(`(async () => {
  const R = await import('/core/registry.js');
  const m = await ${sketch};
  const ids = R.allFamilyMetas().map(f => f.id);
  ${press(13)}
  const id = R.familyIdByIndex(m.familyIndex), before = R.isFamilyLoaded(id);
  for (let i = 0; i < 200 && !R.isFamilyLoaded(id); i++) await new Promise(r => setTimeout(r, 50));
  await new Promise(r => setTimeout(r, 100));
  const marked = [...document.querySelectorAll('#side .gp-family')].findIndex(b => b.classList.contains('nb-btn--primary'));
  return { count: ids.length, first: ids[0], index: m.familyIndex, id, before, loaded: R.isFamilyLoaded(id),
    listed: document.querySelectorAll('#side .gp-family').length, marked };
})()`);
c.ok('every family offered, brushes first; the next decoded when first drawn with, the drawer marking it', families.count >= 2
  && families.first === 'brushes' && families.index === 1 && !families.before && families.loaded && families.listed === families.count
  && families.marked === 1, JSON.stringify(families));

// R3: the next pattern — the setting's, so core's panel shows it; the panel holds the gamepad's settings.
const pattern = await page.eval(`(async () => {
  ${press(11)}
  const m = await ${sketch};
  const rows = [...document.querySelectorAll('#side .pp-row')].map(r => r.querySelector('.pp-name')?.textContent).filter(Boolean);
  const chip = [...document.querySelectorAll('#side .pp-row')].find(r => r.querySelector('.pp-name')?.textContent === 'pattern')
    ?.querySelector('[aria-pressed="true"], .on, .is-on, .active')?.textContent || '';
  return { pattern: m.getParams().get('pattern'), index: m.patternIndex, chip: chip.trim(), rows };
})()`);
c.ok("R3: the next pattern, a setting of core's panel — which holds the gamepad's", pattern.pattern === 'mirror-x' && pattern.index === 1
  && ['move', 'turn', 'grow', 'pattern', 'reference', 'saved on'].every(n => pattern.rows.includes(n)), JSON.stringify(pattern));
await c.shot('gamepad-panel');

// At a HiDPI screen's density: the page's canvas and the ink twice the pixels each way. A still saved is its frame in
// the marks' units — what the recipe says — and the marks, drawn again by core (core/stage/still.js), lie over it.
const twice = await page.beforeLoad(`Object.defineProperty(window, 'devicePixelRatio', { get: () => 2, configurable: true })`);
await open();
const hd = await page.eval(`(async () => {
  ${stroke(-0.6, 0.4, 0.5, 30)}
  const cv = document.querySelector('#sketch-container canvas');
  const saved = new Promise(r => document.addEventListener('vault:saved', e => r(e.detail), { once: true }));
  document.dispatchEvent(new CustomEvent('gallery:saveCanvas'));
  const { id } = await saved;
  const { Vault } = await import('/core/vault.js');
  const { object } = await Vault.load(id);
  const { openStill } = await import('/core/stage/still.js');
  const again = (await openStill(object)).frame();
  const bmp = await createImageBitmap(await (await fetch('/vault/objects/' + id + '/' + object.render.file)).blob());
  ${reading}
  const w = bmp.width, h = bmp.height, a = read(bmp, w, h), b = read(again, w, h);
  let sum = 0, ink = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  for (let i = 3; i < a.length; i += 4) if (a[i] > 0) ink++;
  return { density: cv.width / parseFloat(cv.style.width), size: [w, h], frame: [object.recipe.frame.w, object.recipe.frame.h], again: [again.width, again.height],
    marks: object.recipe.marks.length, mean: +(sum / a.length).toFixed(2), ink: +(ink / (w * h)).toFixed(3) };
})()`);
await page.forget(twice);
c.ok('at twice the density, a still saved: its frame in the marks\' units, drawn again by core over it', hd.density === 2
  && hd.size.join() === hd.frame.join() && hd.size.join() === hd.again.join() && hd.marks >= 20 && hd.mean < 3 && hd.ink > 0.05,
  JSON.stringify(hd));

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
