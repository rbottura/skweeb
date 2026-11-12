#!/usr/bin/env node
/**
 * scripts/check-viewtools.mjs — the viewer's tools in every app (S14a,
 * 2026-11-12; core/shell/viewtools.js, core/viewzoom.js), in Chrome.
 *
 *   node scripts/check-viewtools.mjs
 *
 * In particles, as the bench has them: the zoom, the states, the rulers, the
 * magnet, the guides and the ground. The zoom's menu: at 100 % the canvas a
 * CSS pixel a picture pixel, drawn in its own pixels; back at Fit. Ctrl and
 * the wheel come nearer about the pointer, the point under it staying there;
 * the wheel alone stays the app's. Space held and a drag move the picture and
 * leave the play alone; Space tapped plays or holds, as it did; the middle
 * button moves it too. Zoomed, a handle dragged lands where the pointer goes.
 * The guides and the ground on and off; the states once the object has one,
 * the graph opened by them. In the 3D app no guides, and at 200 % the picture
 * shown as pixels past its own; in cluster, the app's tools in its head; the
 * vault app's stage zooms itself, and has no zoom of these.
 *
 * S14b, the format in the viewer: its list in the head and the picture's size
 * beside it, no Format section left in the properties, particles' overlay a
 * section of its own; a format picked, the picture that shape; the chip
 * opening the size, its link, bleed and scale, a width typed there followed
 * by the height; closed by Escape or a press elsewhere; in cluster too, and
 * in ckt hidden over the dots. And no page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const tools = () => page.eval(`[...document.querySelectorAll('skw-viewtools .vt-btn')].map(b => b.className.replace('vt-btn ', '').replace('vt-', '')
  + (b.disabled ? '-off' : '') + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(' ')`);
const label = () => page.eval(`document.querySelector('skw-viewtools .vt-zoom-btn')?.textContent || ''`);
const canvasAt = () => page.eval(`(() => { const c = document.getElementById('stage'), r = c.getBoundingClientRect();
  return { w: c.width, css: r.width, left: r.left, top: r.top, pixels: c.classList.contains('zm-pixels') }; })()`);
const stageMiddle = () => page.eval(`(() => { const r = document.querySelector('.viewer-stage').getBoundingClientRect();
  return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; })()`);
const pick = async text => {
  await page.click(`document.querySelector('skw-viewtools .vt-zoom-btn')`);
  await wait(200);
  await page.click(`[...document.querySelectorAll('skw-viewtools .vt-mi')].find(b => b.textContent === ${JSON.stringify(text)})`);
  await wait(600);
};
const playing = () => page.eval(`!!document.querySelector('.tp-play.tp-playing')`);
const key = (type, code, k) => page.eval(`window.dispatchEvent(new KeyboardEvent('${type}', { key: ${JSON.stringify(k)}, code: '${code}', bubbles: true, cancelable: true }))`);
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const emitXY = () => page.eval(`import('/core/param-rows.js').then(({ rowParams }) => { const p = rowParams(${row('seed')}).params; return [p.get('x'), p.get('y')]; })`);

// ── particles: the tools, the zoom ──────────────────────────────────────────

await c.go(c.base + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 30000 });
await wait(600);
c.ok("particles' viewer: the zoom, the states, the rulers, the magnet, the guides, the ground", /^zoom-btn states-off rulers\*? magnet\*? guides\*? ground\*?$/.test(await tools()),
  await tools());
const fitted = await canvasAt();
const fitPct = parseInt((await label()).replace('Fit · ', ''), 10);
c.ok('…the zoom at Fit, the canvas fitted as it always was', /^Fit · \d+%$/.test(await label()) && fitted.css < 1080
  && Math.abs(fitted.css / 1080 * 100 - fitPct) < 1, `${await label()} ${Math.round(fitted.css)} px`);
await pick('100 %');
const full = await canvasAt();
c.ok('100 %: a CSS pixel a picture pixel, drawn in its own pixels', (await label()) === '100%' && Math.abs(full.css - 1080) < 1 && full.w === 1080,
  `${await label()} ${full.css} css, ${full.w} drawn`);
await pick('Fit');
c.ok('…and back at Fit', (await label()).startsWith('Fit') && Math.abs((await canvasAt()).css - fitted.css) < 1);

const [mx, my] = await stageMiddle(), px = mx + 60, py = my - 40;
const under = async () => { const a = await canvasAt(); return [(px - a.left) / a.css * 1080, (py - a.top) / a.css * 1080]; };
const before = await under();
await page.eval(`(() => { const s = document.querySelector('.viewer-stage'); for (let i = 0; i < 4; i++)
  s.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, ctrlKey: true, clientX: ${px}, clientY: ${py}, bubbles: true, cancelable: true })); })()`);
await wait(500);
const after = await under(), nearer = await label();
c.ok('Ctrl and the wheel: nearer, about the pointer — the point under it stays', !nearer.startsWith('Fit') && parseInt(nearer, 10) > fitPct
  && Math.hypot(after[0] - before[0], after[1] - before[1]) < 2, `${nearer}; ${before.map(Math.round)} → ${after.map(Math.round)}`);
await page.eval(`document.querySelector('.viewer-stage').dispatchEvent(new WheelEvent('wheel', { deltaY: -120, clientX: ${px}, clientY: ${py}, bubbles: true, cancelable: true }))`);
await wait(300);
c.ok('…the wheel alone stays the app\'s: no zoom', (await label()) === nearer, await label());

// ── Space, the middle button ────────────────────────────────────────────────

const was = await playing(), at0 = await canvasAt();
await page.pointer([mx, my], [mx + 2, my + 2], 1);
await key('keydown', 'Space', ' ');
await page.pointer([mx + 2, my + 2], [mx + 102, my + 42], 8);
await key('keyup', 'Space', ' ');
await wait(400);
const at1 = await canvasAt();
c.ok('Space held and a drag: the picture moved as far, the play left alone', Math.abs(at1.left - at0.left - 100) < 2 && Math.abs(at1.top - at0.top - 40) < 2
  && (await playing()) === was, `${Math.round(at1.left - at0.left)}, ${Math.round(at1.top - at0.top)}; playing ${was} → ${await playing()}`);
await key('keydown', 'Space', ' ');
await key('keyup', 'Space', ' ');
await wait(400);
c.ok('…Space tapped over it: played or held, as it was', (await playing()) === !was);
await page.pointer([mx, my], [mx - 80, my + 30], 8, { button: 'middle' });
await wait(300);
const at2 = await canvasAt();
c.ok('the middle button and a drag: moved too', Math.abs(at2.left - at1.left + 80) < 2 && Math.abs(at2.top - at1.top - 30) < 2,
  `${Math.round(at2.left - at1.left)}, ${Math.round(at2.top - at1.top)}`);

// ── Zoomed, a handle lands where the pointer goes ───────────────────────────

await pick('100 %');
const [ex, ey] = await emitXY(), a = await canvasAt();
const handle = [Math.round(a.left + (540 + ex) * a.css / 1080), Math.round(a.top + (540 + ey) * a.css / 1080)];
await page.pointer(handle, [handle[0] + 50, handle[1] - 30], 8);
await wait(300);
const [ex2, ey2] = await emitXY();
c.ok('at 100 %, the emitter dragged as far as the pointer went', Math.abs(ex2 - ex - 50) <= 2 && Math.abs(ey2 - ey + 30) <= 2, `${ex},${ey} → ${ex2},${ey2}`);
await pick('Fit');

// ── The guides, the ground, the states ──────────────────────────────────────

const guidesPressed = () => page.eval(`document.querySelector('skw-viewtools .vt-guides').getAttribute('aria-pressed')`);
const g0 = await guidesPressed();
await page.click(`document.querySelector('skw-viewtools .vt-guides')`);
await wait(300);
const g1 = await guidesPressed();
await page.click(`document.querySelector('skw-viewtools .vt-guides')`);
await wait(300);
c.ok('the guides: off and on again', g0 !== g1 && (await guidesPressed()) === g0, `${g0} → ${g1} → ${await guidesPressed()}`);
const corner = () => page.eval(`document.getElementById('stage').getContext('2d').getImageData(2, 2, 1, 1).data[3]`);
await page.click(`document.querySelector('skw-viewtools .vt-ground')`);
await wait(400);
const none = [await corner(), await page.eval(`document.querySelector('skw-viewtools .vt-ground').getAttribute('aria-pressed')`)];
await page.click(`document.querySelector('skw-viewtools .vt-ground')`);
await wait(400);
c.ok('the ground: none, then its colour again', none[0] === 0 && none[1] === 'false' && (await corner()) === 255, JSON.stringify(none));
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }))`);
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
await wait(500);
c.ok('the states: there once the object has one', await page.eval(`!document.querySelector('skw-viewtools .vt-states').disabled`));
await page.click(`document.querySelector('skw-viewtools .vt-states')`);
await page.until(`!!document.querySelector('skw-graph')`, { timeout: 10000 }).catch(() => {});
c.ok('…and the graph opened by them', await page.eval(`!!document.querySelector('skw-graph')`));

// ── The 3D app, cluster, the vault app ──────────────────────────────────────

await c.go(c.base + '/apps/3d/');
await page.until(`/box, sphere/.test(${say})`, { timeout: 30000 });
await wait(600);
c.ok('the 3D app: no guides of its own, the rest there', !/guides/.test(await tools()) && /zoom-btn/.test(await tools()) && /ground/.test(await tools()), await tools());
await pick('200 %');
const twice = await canvasAt();
c.ok('…at 200 %: shown as pixels past its own, drawn in no more than them', Math.abs(twice.css - 2160) < 1 && twice.w === 1080 && twice.pixels,
  JSON.stringify(twice));
await c.go(c.base + '/apps/cluster/#particles');
await page.until(`!!document.querySelector('.viewer-head skw-viewtools .vt-zoom-btn')`, { timeout: 30000 }).catch(() => {});
c.ok('in cluster, the app\'s tools in its viewer\'s head', /zoom-btn states(-off)? rulers.*guides.*ground/.test(await tools()), await tools());

// ckt lays its motion through core's fit — its dots, grid's and filter's pictures are laid as they are drawn.
await c.go(c.base + '/apps/ckt/');
await page.until(`!!document.querySelector('skw-viewtools .vt-zoom-btn')`, { timeout: 30000 }).catch(() => {});
c.ok('ckt: the zoom there too', /zoom-btn/.test(await tools()), await tools());
await pick('100 %');
const ckt = await canvasAt();
c.ok('…at 100 %, its preview in its own pixels, a CSS pixel each', (await label()) === '100%' && Math.abs(ckt.css - ckt.w) < 1,
  `${await label()} ${JSON.stringify(ckt)}`);
await c.go(c.base + '/apps/vault/');
await page.until(`!!document.querySelector('skw-viewtools .vt-rulers')`, { timeout: 30000 }).catch(() => {});
c.ok('the vault app zooms its own stage: no zoom of these', !/zoom-btn/.test(await tools()) && /rulers/.test(await tools()), await tools());

// ── S14b: the format in the viewer ──────────────────────────────────────────

await c.go(c.base + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 30000 });
await wait(500);
const vf = `document.querySelector('.viewer-head > .vf')`;
const chip = () => page.eval(`${vf}.querySelector('.vf-size').textContent`);
const sections = () => page.eval(`[...document.querySelectorAll('.dr-head')].map(h => h.textContent.trim())`);
const popOpen = () => page.eval(`!${vf}.querySelector('.vf-pop').hidden`);
c.ok("the format in the viewer's head: its list, and the picture's size", (await page.eval(`${vf}?.querySelector('.vf-list select')?.value`)) === 'ig-square'
  && (await chip()) === '1080 × 1080', await chip());
c.ok('…no Format section in the properties, the overlay one of its own', !(await sections()).some(t => /^Format/i.test(t))
  && (await sections()).some(t => /^Overlay/i.test(t)), JSON.stringify(await sections()));
await page.typeInto(`${vf}.querySelector('.vf-list select')`, 'a3');
await page.until(`${vf}.querySelector('.vf-size').textContent !== '1080 × 1080'`, { timeout: 5000 }).catch(() => {});
await wait(400);
const sheet = await canvasAt(), sheetH = await page.eval(`document.getElementById('stage').height`);
c.ok('a format from the list: the picture that shape, the chip its size', (await chip()) === '1080 × 1527'
  && Math.abs(sheetH / sheet.w - 420 / 297) < 0.01, `${await chip()}; canvas ${sheet.w} × ${sheetH}`);
await page.click(`${vf}.querySelector('.vf-size')`);
await wait(300);
const popRows = await page.eval(`[...${vf}.querySelectorAll('.vf-pop .pp-row:not([hidden]) .pp-name')].map(n => n.textContent)`);
c.ok('the chip opens the rest: the size and its link, bleed, the scale', (await popOpen()) && ['width', 'height', 'bleed', 'scale'].every(k => popRows.includes(k))
  && (await page.eval(`!!${vf}.querySelector('.vf-pop .pp-pair-link')`)), JSON.stringify(popRows));
await page.typeInto(`${vf}.querySelector('.vf-pop .pp-row[data-key="width"] .pp-num')`, '540');
await wait(500);
c.ok('…a width typed there: the height follows, linked, the sheet still itself', (await chip()) === '540 × 764'
  && (await page.eval(`${vf}.querySelector('.vf-list select').value`)) === 'a3', `${await chip()}`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
await wait(200);
c.ok('…and Escape closes it', !(await popOpen()));
await page.click(`${vf}.querySelector('.vf-size')`);
await wait(200);
await page.pointer([30, 860], [32, 860], 1);
await wait(200);
c.ok('…as a press anywhere else does', !(await popOpen()));
await c.go(c.base + '/apps/cluster/?s14b#compose');
await page.until(`!!document.querySelector('.viewer-head > .vf .vf-list select')`, { timeout: 30000 }).catch(() => {});
c.ok("in cluster, the app's format in its viewer", (await page.eval(`${vf}?.querySelector('.vf-list select')?.value`)) === 'a4', await page.eval(`${vf}?.textContent`));
await c.go(c.base + '/apps/ckt/');
await page.until(`!!document.querySelector('.viewer-head > .vf')`, { timeout: 30000 }).catch(() => {});
await page.click(`document.getElementById('view-dots')`);
await wait(500);
const overDots = await page.eval(`${vf}.hidden`);
await page.click(`document.getElementById('view-motion')`);
await wait(500);
c.ok('ckt: the format the motion\'s, not shown over the dots', overDots && !(await page.eval(`${vf}.hidden`)));

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
