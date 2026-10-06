#!/usr/bin/env node
/**
 * scripts/check-rig.mjs — M9's rig in Chrome: a drawing's strokes as its
 * bones, bent.
 *
 *   node scripts/check-rig.mjs
 *
 * Served as plain files with no vault, the rig opens and asks for a drawing
 * (rule 7). On the server: a gamepad still saved as the gamepad saves one —
 * a body drawn upwards, an arm out and up, an eye — its render painted as
 * the gamepad paints a mark. The rig finds three strokes and three bones; at
 * rest it draws the still again as it was saved; the bones are drawn over
 * it, and B takes them away; the forearm's handle, dragged, swings the
 * forearm and leaves the body be. S saves the pose — a still the rig made,
 * its bones whole, its turns, its drawing its parent — which replays to its
 * render to the pixel, and at scale 2 is drawn again from the marks; R puts
 * every bone back to the pixel; a shorter longest bone cuts more bones; a
 * still with no marks is said to have none. A bone that swings makes a loop
 * that plays, saves, replays and closes. The chosen bone's chain is named a
 * part; a preset — a walk — moves the named chains, a chain renamed by hand
 * takes its part's wave, and Still takes them off. Crawling along a path
 * widens the stage to the path and goes round it; saved, the crawl replays
 * to its render and closes. `?open=` brings the pose back; the vault offers
 * the drawing to the rig and the pose back to it; compose places the pose
 * and plays the loop. Needs no GPU, and brings what it needs: the brushes
 * family is in git.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;

// ── Rule 7 ──────────────────────────────────────────────────────────────────

await c.go(c.plain + '/apps/rig/');
await page.until(`${say}.includes('Choose a drawing')`, { timeout: 20000 }).catch(() => {});
c.ok('opens with no vault, and asks for a drawing', (await page.eval(say)).includes('Choose a drawing'), await page.eval(say));
c.ok('the bar says there is no vault', await page.until(`document.body.textContent.includes('no vault')`, { timeout: 8000 })
  .then(() => true, () => false));

// ── A drawing saved as the gamepad saves one ────────────────────────────────

await c.go(c.base + '/apps/rig/');
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
const made = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const line = (x0, y0, x1, y1, scale) => { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 2);
    return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, rotation: 0.3, scale,
      familyId: 'brushes', spriteIndex: 8, pattern: 'single' })); };
  const marks = [...line(300, 460, 300, 280, 0.5), ...line(304, 370, 420, 370, 0.2), ...line(420, 368, 420, 270, 0.2).slice(1),
    { x: 300, y: 262, rotation: 0.3, scale: 0.15, familyId: 'brushes', spriteIndex: 8, pattern: 'single' }];
  marks.forEach((m, i) => { m.t = i * 17; });
  const from = { x: 100, y: 120, w: 400, h: 400 };
  // The gamepad's own way with a mark (core/stage/player.js): moved, turned, scaled, its sprite centred.
  const sprite = await createImageBitmap(await (await fetch('/apps/gamepad/gamepad_sprites/brushes/sprite(9).png')).blob());
  const c = new OffscreenCanvas(400, 400), g = c.getContext('2d');
  for (const m of marks) { g.setTransform(1, 0, 0, 1, m.x - from.x, m.y - from.y); g.rotate(m.rotation); g.scale(m.scale, m.scale);
    g.drawImage(sprite, -sprite.width / 2, -sprite.height / 2); }
  const blob = await c.convertToBlob({ type: 'image/png' });
  const recipe = { canvas: { w: 800, h: 600, background: 'none' }, frame: { from, to: { x: 0, y: 0, w: 400, h: 400 }, w: 400, h: 400 },
    brush: { familyId: 'brushes', familyIndex: 0, spriteIndex: 8, patternIndex: 0 }, params: {}, marks };
  const still = (await Vault.save({ type: 'still', title: 'a figure', tags: ['gamepad'], origin: { app: 'gamepad', version: '1.0.0' },
    seed: null, recipe, render: { blob, ext: 'png', w: 400, h: 400 }, thumb: await thumbFromBlob(blob) })).id;
  const flat = (await Vault.save({ type: 'still', title: 'no marks', tags: ['import'], origin: { app: 'import', version: '1.0.0' },
    seed: null, recipe: null, render: { blob, ext: 'png', w: 400, h: 400 }, thumb: await thumbFromBlob(blob) })).id;
  await Vault.refresh();
  return { still, flat, stamps: marks.length }; })()`);
c.ok('a gamepad still in the vault, and a still with no marks', !!(made.still && made.flat), JSON.stringify(made));

// ── Rigged ──────────────────────────────────────────────────────────────────

await c.go(c.base + '/apps/rig/?drawing=' + made.still);
await page.until(`${say}.includes('bones')`, { timeout: 30000 }).catch(() => {});
c.ok('its strokes found, and a bone proposed for each run between corners',
  (await page.eval(say)).startsWith(`3 strokes · 3 bones · ${made.stamps} stamps · at rest`), await page.eval(say));

/** The rig's drawing at rest, at the picture's own pixels, against the still's render. */
const rest = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { familySprite } = await import('/core/sprites.js');
  const { drawingOf, spritesOf } = await import('/apps/rig/drawing.js');
  const { proposeBones, posed } = await import('/apps/rig/bones.js');
  const { bind, placeOf } = await import('/apps/rig/skin.js');
  const { drawRig } = await import('/apps/rig/draw.js');
  const { object, url } = await Vault.load(${JSON.stringify(made.still)});
  const images = new Map();
  for (const [key, [f, i]] of spritesOf(object.recipe)) images.set(key, await familySprite(f, i));
  const d = drawingOf(object.recipe), bones = proposeBones(d), binds = bind(d, bones), at = posed(bones);
  const mine = new OffscreenCanvas(d.width, d.height).getContext('2d');
  drawRig(mine, d, d.stamps.map((s, i) => placeOf(s, binds[i], bones, at)), images, 1, { x: 0, y: 0 });
  const theirs = new OffscreenCanvas(d.width, d.height).getContext('2d');
  theirs.drawImage(await createImageBitmap(await (await fetch(url)).blob()), 0, 0);
  const a = mine.getImageData(0, 0, d.width, d.height).data, b = theirs.getImageData(0, 0, d.width, d.height).data;
  let sum = 0, worst = 0;
  for (let k = 0; k < a.length; k++) { const dd = Math.abs(a[k] - b[k]); sum += dd; worst = Math.max(worst, dd); }
  return { mean: sum / a.length, worst };
})()`);
c.ok('at rest it draws the still again as it was saved', rest.mean < 0.5, JSON.stringify(rest));

/** The stage's pixels over a box of the picture, and where a picture point is on screen. */
const geometry = `(async () => { const { stageOf } = await import('/apps/rig/draw.js'); const { drawingOf } = await import('/apps/rig/drawing.js');
  const { Vault } = await import('/core/vault.js'); const { object } = await Vault.load(${JSON.stringify(made.still)});
  return stageOf(drawingOf(object.recipe)); })()`;
const stage = await page.eval(geometry);
const box = (x, y, w, h) => page.eval(`(() => { const c = document.getElementById('stage'), k = c.width / ${stage.width};
  return [...c.getContext('2d').getImageData(Math.round((${x} - ${stage.x}) * k), Math.round((${y} - ${stage.y}) * k),
    Math.max(1, Math.round(${w} * k)), Math.max(1, Math.round(${h} * k))).data]; })()`);
const onScreen = (x, y) => page.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect();
  return [r.left + (${x} - ${stage.x}) / ${stage.width} * r.width, r.top + (${y} - ${stage.y}) / ${stage.height} * r.height]; })()`);
const differ = (a, b) => a.reduce((n, v, i) => n + (Math.abs(v - b[i]) > 24 ? 1 : 0), 0);

const blueish = p => { let n = 0; for (let i = 0; i < p.length; i += 4) if (p[i + 2] > 150 && p[i] < 80 && p[i + 1] < 120) n++; return n; };
const withBones = await box(300, 160, 40, 40);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))`);
await wait(300);
const without = await box(300, 160, 40, 40);
c.ok('the bones are drawn over it, and B takes them away', differ(withBones, without) > 20
  && !(await page.eval(`document.getElementById('bones').getAttribute('aria-pressed') === 'true'`)), String(differ(withBones, without)));
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))`);
await wait(300);

const atRest = await page.eval(`[...document.getElementById('stage').getContext('2d').getImageData(0, 0, document.getElementById('stage').width, document.getElementById('stage').height).data]`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))`);
await wait(300);
const restStage = await page.eval(`[...document.getElementById('stage').getContext('2d').getImageData(0, 0, document.getElementById('stage').width, document.getElementById('stage').height).data]`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))`);
await wait(300);
const bodyBefore = await box(150, 280, 100, 60), foreBefore = await box(300, 150, 40, 80);
await page.pointer(await onScreen(320, 150), await onScreen(390, 240), 10);
await wait(300);
const bodyAfter = await box(150, 280, 100, 60), foreAfter = await box(300, 150, 40, 80);
c.ok('the forearm\'s handle, dragged, swings the forearm', (await page.eval(say)).includes('posed')
  && differ(foreBefore, foreAfter) > 200, `${differ(foreBefore, foreAfter)} values changed · ${await page.eval(say)}`);
c.ok('and leaves the body be', differ(bodyBefore, bodyAfter) === 0, String(differ(bodyBefore, bodyAfter)));
await c.shot('1-bent');

// ── The pose saved, replayed, reopened, placed ──────────────────────────────

const whole = `[...document.getElementById('stage').getContext('2d').getImageData(0, 0, document.getElementById('stage').width, document.getElementById('stage').height).data]`;
const press = async key => { await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)} }))`); await wait(300); };
await press('b');
const posedStage = await page.eval(whole);
await press('b');
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await press('S');
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const pid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const pose = pid ? await (await fetch(c.base + '/api/vault/' + pid)).json() : null;
c.ok('S saves the pose: a still the rig made, its bones whole, a turn each, its drawing its parent', !!pose && pose.type === 'still'
  && pose.origin.app === 'rig' && pose.recipe.bones.length === 3 && pose.recipe.turns.length === 3
  && pose.recipe.turns[2] !== 0 && pose.recipe.turns[0] === 0 && JSON.stringify(pose.parents) === JSON.stringify([made.still])
  && pose.title === 'a figure · posed', pose ? `${pose.title} · ${JSON.stringify(pose.recipe.turns)} · ${JSON.stringify(pose.parents)}` : await page.eval(say));
if (pose) {
  const replay = await page.eval(`(async () => {
    const { Vault } = await import('/core/vault.js');
    const { openFrames } = await import('/core/rebuild.js');
    const { object, url } = await Vault.load(${JSON.stringify(pid)});
    const h = await openFrames(object, { url });
    const img = await createImageBitmap(await (await fetch(url)).blob());
    const a = new OffscreenCanvas(img.width, img.height).getContext('2d'); a.drawImage(img, 0, 0);
    const rebuilt = await (await import('/apps/rig/rebuild.js')).openObject(object);
    const b = new OffscreenCanvas(img.width, img.height).getContext('2d'); b.drawImage(rebuilt.frame(0), 0, 0);
    const da = a.getImageData(0, 0, img.width, img.height).data, db = b.getImageData(0, 0, img.width, img.height).data;
    let worst = 0; for (let k = 0; k < da.length; k++) worst = Math.max(worst, Math.abs(da[k] - db[k]));
    const big = await openFrames(object, { url, scale: 2 });
    return { worst, size: [img.width, img.height], drawn: [rebuilt.width, rebuilt.height], big: [big.scale, big.frame(0).width, h.width] }; })()`);
  c.ok('replayed from its recipe, it is its render, pixel for pixel', replay.worst === 0
    && replay.size.join() === replay.drawn.join(), JSON.stringify(replay));
  c.ok('at scale 2, drawn again from the marks at twice the pixels', replay.big[0] === 2 && replay.big[1] === 2 * replay.big[2],
    JSON.stringify(replay.big));
}
if (pose) {
  const printed = await c.printMatch(pid, { scale: 3 });
  c.ok('printed in tiles, the pose is the pose drawn whole: the rig draws each window', printed.enlarged === 1 && printed.off < 0.002 && printed.mean < 0.3,
    JSON.stringify(printed));
}

await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))`);
await page.until(`${say}.includes('at rest')`, { timeout: 8000 }).catch(() => {});   // past a save's few seconds on the bar
await press('b');                                  // the drawing alone: the chosen bone's handle stays lit
const back = await page.eval(whole);
await press('b');
c.ok('R puts every bone back, to the pixel', back.length === restStage.length && differ(back, restStage) === 0
  && (await page.eval(say)).includes('at rest'), String(differ(back, restStage)));

// ── A bone that swings by itself: a loop ────────────────────────────────────

const num = (name, value) => page.typeInto(`${row(name)}?.querySelector('.pp-num')`, value);
c.ok('the bone last pressed is chosen, its wave beside the drawing', (await page.eval(`document.querySelector('#bone-side .rg-note')?.textContent || ''`))
  .startsWith('Bone 3 of 3'), await page.eval(`document.querySelector('#bone-side .rg-note')?.textContent || ''`));
await num('swing, degrees', 30);
await page.until(`${say}.includes('a loop of 60 at 30 fps')`, { timeout: 8000 }).catch(() => {});
const t1 = await page.eval(whole);
await wait(400);
const t2 = await page.eval(whole);
c.ok('a swing, and the loop plays by itself', (await page.eval(say)).includes('a loop of 60 at 30 fps') && differ(t1, t2) > 100,
  `${differ(t1, t2)} values moved · ${await page.eval(say)}`);
await num('loop, frames', 30);
await page.until(`${say}.includes('a loop of 30')`, { timeout: 8000 }).catch(() => {});
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await press('S');
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 90000 });
const lid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const loop = lid ? await (await fetch(c.base + '/api/vault/' + lid)).json() : null;
c.ok('saved: a loop, its frames and rate, the swinging bone\'s wave and no other', !!loop && loop.type === 'sequence'
  && loop.render.frames === 30 && loop.render.fps === 30 && loop.title === 'a figure · moving'
  && loop.recipe.waves[2].swing === 30 && loop.recipe.waves[0] === null && loop.recipe.waves[1] === null,
  loop ? `${loop.type} · ${loop.title} · ${loop.render.frames} at ${loop.render.fps} · ${JSON.stringify(loop.recipe.waves)}` : await page.eval(say));
if (loop) {
  const replayed = await page.eval(`(async () => {
    const { Vault } = await import('/core/vault.js');
    const { openFrames } = await import('/core/rebuild.js');
    const { object, url } = await Vault.load(${JSON.stringify(lid)});
    const h = await openFrames(object, { url });
    const img = await createImageBitmap(await (await fetch(url)).blob());
    const grab = c => { const g = new OffscreenCanvas(img.width, img.height).getContext('2d'); g.drawImage(c, 0, 0);
      return g.getImageData(0, 0, img.width, img.height).data; };
    const saved = grab(img);
    let best = Infinity;
    for (let i = 0; i < h.length; i++) { const d = grab(h.frame(i)); let w = 0; for (let k = 0; k < d.length; k++) w = Math.max(w, Math.abs(d[k] - saved[k])); best = Math.min(best, w); }
    const first = grab(h.frame(0)), after = grab(h.frame(h.length));
    let closes = 0; for (let k = 0; k < first.length; k++) closes = Math.max(closes, Math.abs(first[k] - after[k]));
    const mid = grab(h.frame(Math.floor(h.length / 4)));
    let moved = 0; for (let k = 0; k < first.length; k += 4) if (Math.abs(first[k + 3] - mid[k + 3]) > 24) moved++;
    return { length: h.length, best, closes, moved }; })()`);
  c.ok('the vault replays it: one of its frames is its render, pixel for pixel', replayed.length === 30 && replayed.best === 0,
    JSON.stringify(replayed));
  c.ok('and the loop closes: frame 30 is frame 0, to the pixel, and a quarter in it has moved', replayed.closes === 0
    && replayed.moved > 100, JSON.stringify(replayed));
}
await num('swing, degrees', 0);
await page.until(`!${say}.includes('a loop of')`, { timeout: 8000 }).catch(() => {});
c.ok('no swing, no loop', !(await page.eval(say)).includes('a loop of')
  && await page.eval(`document.getElementById('play').disabled`), await page.eval(say));

// ── Parts, presets, and crawling as a worm ──────────────────────────────────

const pickIn = async (scope, name, value) => {
  await page.typeInto(`[...document.querySelectorAll('${scope} .pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})?.querySelector('select')`, value);
  await wait(300);
};
const presetBtn = label => `[...document.querySelectorAll('.rg-presets .nb-btn')].find(b => b.textContent.startsWith(${JSON.stringify(label)}))`;
c.ok('the chosen bone\'s chain is named: the arm, on the right as seen', (await page.eval(`[...document.querySelectorAll('#bone-side .pp-row')]
  .find(r => r.querySelector('.pp-name')?.textContent === 'part')?.querySelector('select')?.value`)) === 'arm-right',
  await page.eval(`[...document.querySelectorAll('#bone-side select')].map(s => s.value).join()`));
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.click(presetBtn('Walk'));
await wait(400);
c.ok('a preset sets the named chains moving, its loop and its rise', (await page.eval(say)).startsWith('walk: body, arm-right moving — a loop of 24 at 24 fps')
  && Number(await page.eval(`${row('rise, px')}?.querySelector('.pp-num')?.value`)) > 0, await page.eval(say));
await pickIn('#bone-side', 'part', 'leg-left');
await page.click(presetBtn('Walk'));
await wait(400);
c.ok('a chain named by hand takes the part\'s wave', (await page.eval(say)).startsWith('walk: body, leg-left moving'), await page.eval(say));
await page.click(presetBtn('Still'));
await wait(400);
c.ok('Still takes every wave and the rise off', await page.eval(`document.getElementById('play').disabled`)
  && Number(await page.eval(`${row('rise, px')}?.querySelector('.pp-num')?.value`)) === 0, await page.eval(say));

await pickIn('#side', 'crawl', 'along a path');
await num('loop, frames', 40);
await page.until(`${say}.includes('crawling along a path')`, { timeout: 8000 }).catch(() => {});
const grown = await page.eval(`document.getElementById('stage').width / document.getElementById('stage').height`);
const c1 = await page.eval(whole);
await wait(500);
const c2 = await page.eval(whole);
c.ok('crawling along a path: the stage takes the path, and the body goes round it', (await page.eval(say)).includes('crawling along a path')
  && Math.abs(grown - 1) > 0.05 && differ(c1, c2) > 200, `${grown.toFixed(2)} wide a high · ${differ(c1, c2)} values moved · ${await page.eval(say)}`);
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await press('S');
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 120000 });
const cid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const crawlObject = cid ? await (await fetch(c.base + '/api/vault/' + cid)).json() : null;
c.ok('saved: a loop, crawling', !!crawlObject && crawlObject.type === 'sequence' && crawlObject.title === 'a figure · crawling'
  && crawlObject.render.frames === 40 && crawlObject.recipe.rig.crawl === 'along a path', crawlObject ? crawlObject.title : await page.eval(say));
if (crawlObject) {
  const crawled = await page.eval(`(async () => {
    const { Vault } = await import('/core/vault.js');
    const { openFrames } = await import('/core/rebuild.js');
    const { object, url } = await Vault.load(${JSON.stringify(cid)});
    const h = await openFrames(object, { url });
    const img = await createImageBitmap(await (await fetch(url)).blob());
    const grab = c => { const g = new OffscreenCanvas(img.width, img.height).getContext('2d'); g.drawImage(c, 0, 0);
      return g.getImageData(0, 0, img.width, img.height).data; };
    const saved = grab(img);
    let best = Infinity;
    for (let i = 0; i < h.length; i++) { const d = grab(h.frame(i)); let w = 0; for (let k = 0; k < d.length; k++) w = Math.max(w, Math.abs(d[k] - saved[k])); best = Math.min(best, w); }
    const a = grab(h.frame(0)), b = grab(h.frame(h.length)), half = grab(h.frame(h.length / 2));
    let closes = 0, apart = 0;
    for (let k = 0; k < a.length; k++) closes = Math.max(closes, Math.abs(a[k] - b[k]));
    for (let k = 3; k < a.length; k += 4) if (Math.abs(a[k] - half[k]) > 128) apart++;
    return { length: h.length, best, closes, apart, size: [img.width, img.height] }; })()`);
  c.ok('the crawl replays to its render, and closes: frame 40 is frame 0, to the pixel', crawled.length === 40 && crawled.best === 0
    && crawled.closes === 0, JSON.stringify(crawled));
  c.ok('halfway round, the body is elsewhere', crawled.apart > 500, JSON.stringify(crawled));
}
await pickIn('#side', 'crawl', 'none');

await page.typeInto(`${row('longest bone, px')}?.querySelector('.pp-num')`, 50);
await page.until(`${say}.includes('bones')`, { timeout: 8000 }).catch(() => {});
await wait(300);
c.ok('a shorter longest bone cuts more bones', (await page.eval(say)).includes('9 bones'), await page.eval(say));

await c.go(c.base + '/apps/rig/?drawing=' + made.flat);
await page.until(`${say}.includes('no marks')`, { timeout: 20000 }).catch(() => {});
c.ok('a still with no marks is said to have none to rig', (await page.eval(say)).includes('no marks to rig'), await page.eval(say));

if (pose) {
  await c.go(c.base + '/apps/rig/?open=' + pid);
  await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 }).catch(() => {});
  await wait(500);
  await press('b');
  const back = await page.eval(whole);
  const near = differ(back, posedStage), far = differ(back, restStage);
  await c.shot('2-reopened');
  c.ok('?open= brings the pose back, its bones as they were', (await page.eval(say)).includes('opened')
    && back.length === posedStage.length && near * 10 < far, `${near} values from the pose saved, ${far} from the rest`);
  await press('b');

  await press('V');
  const card = title => `[...document.querySelectorAll('.vp--visible .vp-card')].find(c => c.querySelector('.vp-name')?.textContent === ${JSON.stringify(title)})`;
  const link = label => page.eval(`[...document.querySelectorAll('.vp-btn')].find(b => b.textContent === ${JSON.stringify(label)})?.title || ''`);
  await page.until(`!!${card('a figure')}`, { timeout: 20000 }).catch(() => {});
  await page.click(card('a figure'));
  await page.until(`[...document.querySelectorAll('.vp-btn')].some(b => b.textContent === 'Rig this ↗')`, { timeout: 20000 }).catch(() => {});
  c.ok('the vault offers a gamepad drawing to the rig — the M9 link', (await link('Rig this ↗')) === '/apps/rig/?drawing=' + made.still,
    await link('Rig this ↗') || 'no link');
  await page.click(card('a figure · posed'));
  await page.until(`[...document.querySelectorAll('.vp-btn')].some(b => b.textContent === 'Open in rig ↗')`, { timeout: 20000 }).catch(() => {});
  c.ok('and a pose back to the rig', (await link('Open in rig ↗')) === '/apps/rig/?open=' + pid && !(await link('Rig this ↗')),
    await link('Open in rig ↗') || 'no link');

  await c.go(c.base + '/apps/compose/?place=' + pid);
  await page.until(`${say}.includes(' on the page') || ${say}.includes('could not')`, { timeout: 60000 }).catch(() => {});
  c.ok('compose places the pose', (await page.eval(say)).includes('a figure · posed'), await page.eval(say));
}
if (loop) {
  await c.go(c.base + '/apps/compose/?place=' + lid);
  await page.until(`${say}.includes(' on the page') || ${say}.includes('could not')`, { timeout: 60000 }).catch(() => {});
  c.ok('and the loop, and it plays: a 30 fps loop of 30', (await page.eval(say)).includes('a 30 fps loop of 30'), await page.eval(say));
}

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
