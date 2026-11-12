#!/usr/bin/env node
/**
 * scripts/check-3d.mjs — M10's app in Chrome: primitives drawn by three.js.
 *
 *   node scripts/check-3d.mjs
 *
 * Served as plain files with no vault, it opens and draws its box, sphere
 * and torus (rule 7) — with WebGPU, or WebGL2 where Chrome gives no WebGPU,
 * which the bar then says. On the server: the sphere in the middle is blue
 * and lit, the corners the ground; the cards fold to a line each; a click on
 * the sphere chooses it — its card the one open, its box dashed round it in
 * the view and nowhere else — a click on nothing chooses nothing, a click on
 * a card's name chooses that, Escape none; a shape added from the menu is
 * drawn and chosen, a hidden one is not drawn nor picked, a card's value
 * moves its shape, and one taken out goes; the chosen shape has handles, and
 * a drag up its y arrow raises it, its card saying so, the view unturned;
 * E, R and W say which handles; D duplicates it beside itself, Delete takes
 * it out; a drag that starts on a shape
 * turns round the model by as much as camera.js says and chooses nothing,
 * the right button slides it, the wheel comes nearer, F frames it. Saved: a `model`
 * whose recipe is its shapes and whose render is the format; drawn again by
 * its app it is its render; at scale 2 it is drawn again at twice the
 * pixels, the same picture; `?open=` brings its shapes back; compose places
 * it; the PNG is the format at its scale. With WebGPU taken away, as the
 * laptop's Intel has it, three draws the same opening with WebGL2. And no
 * page said anything wrong. Its print is check-print.mjs's, since
 * 2026-10-22; past 400 lines, it is one model followed from the opening to
 * its save (scripts/lines.mjs says so).
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck, inner } from './check-kit.mjs';   // inner: a smart object as its app has it (S6b)
import { TURN } from '../apps/3d/camera.js';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const panelRow = name => `[...document.querySelectorAll('#side > .pp > .pp-body .pp-row:not(.pp-stack-layer .pp-row), .viewer-head > .vf .pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const value = name => page.eval(`Number(${panelRow(name)}?.querySelector('.pp-num')?.value)`);
/** The shapes' cards — not the modifiers' inside them. */
const cards = `[...document.querySelectorAll('.pp-card')].filter(c => !c.parentElement.closest('.pp-card'))`;
const modCards = i => `[...${cards}[${i}].querySelectorAll('.pp-card')]`;
const cardRow = (i, name) => `[...${cards}[${i}].querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const headButton = (i, label) => `[...${cards}[${i}].querySelectorAll('.pp-head .pp-btn')].find(b => b.textContent === ${JSON.stringify(label)})`;
/** A pixel of the preview, at a fraction of its width and height. */
const pixelAt = (fx, fy) => page.eval(`(() => { const c = document.getElementById('stage');
  const x = Math.min(c.width - 1, Math.round(${fx} * c.width)), y = Math.min(c.height - 1, Math.round(${fy} * c.height));
  return [...c.getContext('2d').getImageData(x, y, 1, 1).data]; })()`);
/** The preview as a grid of samples, to tell two pictures apart. */
const grid = () => page.eval(`(() => { const c = document.getElementById('stage'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const out = []; for (let y = 0.05; y < 1; y += 0.1) for (let x = 0.05; x < 1; x += 0.1) { const i = (Math.floor(y * c.height) * c.width + Math.floor(x * c.width)) * 4; out.push(d[i], d[i + 1], d[i + 2]); } return out; })()`);
const apart = (a, b) => a.reduce((m, x, i) => Math.max(m, Math.abs(x - b[i])), 0);
/** Where a fraction of the preview is on screen — a whole pixel, as Chrome's mouse events are. */
const onStage = (fx, fy) => page.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect();
  return [Math.round(r.left + ${fx} * r.width), Math.round(r.top + ${fy} * r.height)]; })()`);
const stageHeight = () => page.eval(`document.getElementById('stage').getBoundingClientRect().height`);
const drawn = `/box, sphere, torus|nothing draws/.test(${say})`;
const isBlue = ([r, g, b]) => b > r + 40 && b > g;
const GROUND = [255, 253, 246];
const isGround = p => apart(p.slice(0, 3), GROUND) <= 2;
/** Each card as the choice has it. */
const choice = () => page.eval(`${cards}.map(c => c.classList.contains('pp-card--chosen') ? 'chosen' : c.classList.contains('pp-card--folded') ? 'folded' : 'open').join(' ')`);
const press = async (fx, fy) => { await page.pointer(await onStage(fx, fy)); await wait(300); };
/** The preview kept in the page, and later where it changed since: what a guide adds. */
const keep = () => page.eval(`(c => { window.__kept = c.getContext('2d').getImageData(0, 0, c.width, c.height); return true; })(document.getElementById('stage'))`);
const changed = () => page.eval(`(() => { const c = document.getElementById('stage'), a = window.__kept;
  const b = c.getContext('2d').getImageData(0, 0, c.width, c.height);
  if (!a || a.width !== b.width || a.height !== b.height) return null;
  let n = 0, x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (let i = 0; i < b.data.length; i += 4) {
    if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) < 24) continue;
    const x = (i / 4) % c.width / c.width, y = Math.floor(i / 4 / c.width) / c.height;
    n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { share: n / (c.width * c.height), box: n ? [x0, y0, x1, y1].map(v => +v.toFixed(3)) : null }; })()`);

// ── Rule 7 ──────────────────────────────────────────────────────────────────

await c.go(c.plain + '/apps/3d/');
await page.until(drawn, { timeout: 30000 });
const firstSay = await page.eval(say);
c.ok('opens with no vault, and draws its box, sphere and torus', firstSay.startsWith('box, sphere, torus'), firstSay);
const backend = /nothing draws/.test(firstSay) ? 'nothing' : /WebGL2$/.test(firstSay) ? 'WebGL2' : 'WebGPU';
console.log(`     drawn with ${backend}`);

await c.go(c.base + '/apps/3d/');
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
await page.until(drawn, { timeout: 30000 });
await wait(400);

// ── The picture ─────────────────────────────────────────────────────────────

const middle = await pixelAt(0.5, 0.5);
c.ok('the sphere in the middle: blue, and lit', isBlue(middle) && middle[3] === 255, JSON.stringify(middle));
const corners = await Promise.all([[0.02, 0.02], [0.98, 0.02], [0.02, 0.98], [0.98, 0.98]].map(([x, y]) => pixelAt(x, y)));
c.ok('the corners are the ground', corners.every(isGround), JSON.stringify(corners[0]));
const lit = await pixelAt(0.5, 0.42), shade = await pixelAt(0.5, 0.58);
c.ok('lit from above: the top of the sphere brighter than its foot', lit[2] > shade[2], `${lit[2]} over ${shade[2]}`);
c.ok('three cards, the shapes drawer says 3', (await page.eval(`${cards}.length`)) === 3
  && (await page.eval(`document.querySelector('.dr-note')?.textContent`)) === '3');
const tallest = await page.eval(`Math.max(...${cards}.map(c => c.getBoundingClientRect().height))`);
c.ok('the cards fold: none chosen, a line each', (await choice()) === 'folded folded folded' && tallest < 48, `${await choice()}, ${tallest} px`);
await c.shot('1-opening');

// ── Chosen by a click ───────────────────────────────────────────────────────

await keep();
await press(0.5, 0.5);
c.ok('a click on the sphere chooses its card: marked, the one open', (await choice()) === 'folded chosen folded'
  && (await page.eval(`${cards}[1].querySelector('.pp-body').getBoundingClientRect().height`)) > 100, await choice());
const marked = await changed();
const [mx0, my0, mx1, my1] = (marked && marked.box) || [0, 0, 0, 0];
c.ok('…and the view draws its box round it, an outline', !!marked && marked.share > 0 && marked.share < 0.03
  && Math.abs((mx0 + mx1) / 2 - 0.5) < 0.03 && Math.abs((my0 + my1) / 2 - 0.5) < 0.03 && mx1 - mx0 > 0.2 && mx1 - mx0 < 0.4,
  JSON.stringify(marked));
await c.shot('1b-chosen');
await press(0.03, 0.03);
c.ok('a click on nothing chooses nothing: folded, no box', (await choice()) === 'folded folded folded'
  && (await changed()).share === 0, `${await choice()}, ${JSON.stringify(await changed())}`);
await page.click(`${cards}[2].querySelector('.pp-title')`);
await wait(300);
const torusBox = (await changed()).box || [0, 0, 0, 0];
c.ok('a click on a card\'s name chooses it, and its shape is marked', (await choice()) === 'folded folded chosen'
  && (torusBox[0] + torusBox[2]) / 2 > 0.6, `${await choice()}, ${JSON.stringify(torusBox)}`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
await wait(300);
c.ok('Escape chooses none', (await choice()) === 'folded folded folded' && (await changed()).share === 0, await choice());

// ── Shapes by hand ──────────────────────────────────────────────────────────

await page.typeInto(`[...document.querySelectorAll('.pp-cards-add')].find(m => !m.closest('.pp-card'))`, 'cone');
await page.until(`${say}.startsWith('box, sphere, torus, cone')`, { timeout: 10000 }).catch(() => {});
c.ok('a cone added from the menu is drawn, and named', (await page.eval(say)).startsWith('box, sphere, torus, cone')
  && (await page.eval(`${cards}.length`)) === 4, await page.eval(say));
c.ok('…and chosen, its card the one open', (await choice()) === 'folded folded folded chosen', await choice());
c.ok('…beside the others, in the next colour', (await page.eval(`Number(${cardRow(3, 'x')}?.querySelector('.pp-num')?.value)`)) === 3.2
  && (await page.eval(`${cardRow(3, 'colour')}?.querySelector('input')?.value`)) === '#1b998b');

const before = await grid();
await page.typeInto(`${cardRow(1, 'radius')}?.querySelector('.pp-num')`, '0.3');
await wait(400);
const away = await pixelAt(0.5, 0.39);
c.ok('a smaller sphere: where it was is ground now', isGround(away) && apart(await grid(), before) > 0, JSON.stringify(away));

await page.click(headButton(1, 'shown'));
await wait(400);
c.ok('hidden: the sphere is not drawn, nor named', isGround(await pixelAt(0.5, 0.5)) && !(await page.eval(say)).includes('sphere')
  && (await page.eval(`document.querySelector('.dr-note')?.textContent`)) === '3 of 4 shown', await page.eval(say));
await press(0.5, 0.5);
c.ok('…nor picked: a click where it was chooses nothing', (await choice()) === 'folded folded folded folded', await choice());
await page.click(headButton(1, 'hidden'));
await page.click(headButton(3, '✕'));
await wait(400);
c.ok('taken out: three cards again, the sphere back', (await page.eval(`${cards}.length`)) === 3 && isBlue(await pixelAt(0.5, 0.5)),
  await page.eval(say));
await page.typeInto(`${cardRow(1, 'radius')}?.querySelector('.pp-num')`, '0.6');
await wait(300);

// ── Handles on the chosen shape ─────────────────────────────────────────────

const disabled = id => page.eval(`document.getElementById(${JSON.stringify(id)}).disabled`);
const pressed = () => page.eval(`['move', 'turn', 'size'].filter(m => document.getElementById('handle-' + m).getAttribute('aria-pressed') === 'true').join()`);
const key = k => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`).then(() => wait(300));
/** The y arrow's pure green on the preview: how much, and its topmost pixel, as fractions of the picture. */
const green = () => page.eval(`(() => { const c = document.getElementById('stage'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0, top = null;
  for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 200 && d[i] < 80 && d[i + 2] < 80) { n++; if (!top) top = [(i / 4) % c.width / c.width, Math.floor(i / 4 / c.width) / c.height]; }
  return n ? { n, top: top.map(v => +v.toFixed(3)) } : null; })()`);
c.ok('nothing chosen: nothing to duplicate or remove, no handles', (await disabled('duplicate')) && (await disabled('remove')) && !(await green()));
await press(0.5, 0.5);
const arrow = await green();
c.ok('the chosen sphere has handles: its y arrow, green, above its middle', !!arrow && Math.abs(arrow.top[0] - 0.5) < 0.03 && arrow.top[1] < 0.45,
  JSON.stringify(arrow));
const [gx, gy] = arrow ? [arrow.top[0], 0.5 + 0.7 * (arrow.top[1] - 0.5)] : [0.5, 0.42];
const yaw2 = await value('turned');
await page.pointer(await onStage(gx, gy), await onStage(gx, gy - 0.08), 8);
await wait(300);
const raised = await page.eval(`Number(${cardRow(1, 'y — up')}?.querySelector('.pp-num')?.value)`);
c.ok('a drag up the arrow raises the sphere, written in its card', raised > 0.3 && (await choice()) === 'folded chosen folded', `y ${raised}`);
c.ok('…the view unturned, the arrow gone up with it', (await value('turned')) === yaw2 && ((await green()) || { top: [0, 1] }).top[1] < arrow.top[1] - 0.05,
  JSON.stringify(await green()));
await page.typeInto(`${cardRow(1, 'y — up')}?.querySelector('.pp-num')`, '0');
await c.shot('1c-moved');
await key('E');
const turnMode = await pressed();
await c.shot('1d-turn-handles');
await key('R');
const sizeMode = await pressed();
await c.shot('1e-size-handles');
await key('W');
c.ok('E turns, R sizes, W moves: the button pressed says which', [turnMode, sizeMode, await pressed()].join(' ') === 'turn size move', `${turnMode} ${sizeMode}`);
await key('D');
c.ok('D duplicates it: right after it, beside it, and chosen', (await page.eval(`${cards}.length`)) === 4 && (await choice()) === 'folded folded chosen folded'
  && Math.abs((await page.eval(`Number(${cardRow(2, 'x')}?.querySelector('.pp-num')?.value)`)) - 1.5) < 0.01
  && (await page.eval(say)).startsWith('box, sphere ×2, torus'), `${await choice()} · ${await page.eval(say)}`);
await key('Delete');
c.ok('Delete takes it out: three again, nothing chosen', (await page.eval(`${cards}.length`)) === 3 && (await choice()) === 'folded folded folded'
  && (await disabled('remove')), await choice());

// ── A stack of modifiers ────────────────────────────────────────────────────

await page.click(`${cards}[0].querySelector('.pp-title')`);
await wait(300);
await keep();
const modMenu = `${cards}[0].querySelector('.pp-cards-add')`;
await page.typeInto(modMenu, 'subdivide');
await page.typeInto(modMenu, 'twist');
await wait(400);
const stackNames = await page.eval(`${modCards(0)}.map(m => m.querySelector('.pp-title').textContent).join(', ')`);
c.ok('the box\'s card takes modifiers, in order: subdivide, twist', stackNames === 'subdivide, twist', stackNames);
const bent = await changed();
c.ok('…and the box is drawn twisted: the picture changed where it is', !!bent.box && bent.share > 0.003 && bent.box[2] < 0.42, JSON.stringify(bent));
await c.shot('1f-twisted');
await page.click(`[...${modCards(0)}[1].querySelectorAll('.pp-head .pp-btn')].find(b => b.textContent === 'on')`);
await wait(400);
c.ok('the twist switched off: the box as it was, subdivided changes nothing seen', (await changed()).share < 0.001, JSON.stringify(await changed()));
await page.click(`[...${modCards(0)}[1].querySelectorAll('.pp-head .pp-btn')].find(b => b.textContent === 'off')`);
await wait(400);
await keep();
await page.typeInto(modMenu, 'displace');
await wait(400);
const bumps = await changed();
c.ok('displaced after: the twisted box made rough, by its seed', !!bumps.box && bumps.share > 0.001 && bumps.box[2] < 0.42, JSON.stringify(bumps));
await c.shot('1g-displaced');
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
await wait(300);

// ── The style ───────────────────────────────────────────────────────────────

/** Down the middle of the preview, through the sphere: how many blues, and how many of its pixels the four commonest hold. */
const blues = () => page.eval(`(() => { const c = document.getElementById('stage'), x = Math.round(c.width / 2);
  const d = c.getContext('2d').getImageData(x, 0, 1, c.height).data, seen = new Map(); let all = 0;
  for (let y = 0; y < c.height; y++) { const r = d[y * 4], g = d[y * 4 + 1], b = d[y * 4 + 2]; if (!(b > r + 40 && b > g)) continue;
    all++; const k = r + ',' + g + ',' + b; seen.set(k, (seen.get(k) || 0) + 1); }
  const top = [...seen.values()].sort((a, b) => b - a).slice(0, 4).reduce((a, b) => a + b, 0);
  return { colours: seen.size, share: all ? top / all : 0 }; })()`);
const smoothBlues = await blues();
await page.typeInto(`${panelRow('bands of light — 0, smooth')}?.querySelector('.pp-num')`, '3');
await wait(500);
const toonBlues = await blues();
c.ok('three bands of light: the sphere in a few flat blues, where smooth had dozens', smoothBlues.colours > 30 && toonBlues.share > 0.9,
  `smooth ${smoothBlues.colours} blues, toon: four hold ${(toonBlues.share * 100).toFixed(1)}%`);
await c.shot('1h-toon');
/** Right from the sphere's middle along the middle row: the first pixel not its blue, and how many dark ones run from there. */
const pastSphere = () => page.eval(`(() => { const c = document.getElementById('stage'), y = Math.round(c.height / 2);
  const d = c.getContext('2d').getImageData(0, y, c.width, 1).data, dark = x => d[x * 4] < 80 && d[x * 4 + 1] < 80 && d[x * 4 + 2] < 80;
  for (let x = Math.round(c.width / 2); x < c.width; x++) { const r = d[x * 4], g = d[x * 4 + 1], b = d[x * 4 + 2];
    if (b > r + 40 && b > g) continue;
    let run = 0; while (x + run < c.width && dark(x + run)) run++;
    return { rgb: [r, g, b], run, height: c.height }; }
  return null; })()`);
const bare = await pastSphere();
await page.typeInto(`${panelRow('outline, thousandths of its height')}?.querySelector('.pp-num')`, '6');
await wait(500);
const inked = await pastSphere();
c.ok('an outline of six thousandths: past the sphere, ink where the ground was', !!bare && !!inked && bare.rgb.every(v => v > 180)
  && inked.run >= 2 && Math.abs(inked.run - 0.006 * inked.height) <= 3, `${JSON.stringify(bare)} → ${JSON.stringify(inked)}`);
await c.shot('1i-outline');
await keep();
await page.click(`${panelRow('shadows, on a ground of their own')}?.querySelector('input')`);
await wait(600);
const shadowed = await page.eval(`(() => { const c = document.getElementById('stage'), a = window.__kept;
  const b = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let darker = 0, lighter = 0;
  for (let i = 0; i < b.length; i += 4) { const d = (b[i] + b[i + 1] + b[i + 2]) - (a.data[i] + a.data[i + 1] + a.data[i + 2]);
    if (d < -30) darker++; else if (d > 30) lighter++; }
  return { darker: darker / (c.width * c.height), lighter: lighter / (c.width * c.height) }; })()`);
c.ok('shadows: the picture darker where they fall, nowhere lighter', shadowed.darker > 0.01 && shadowed.lighter < 0.001, JSON.stringify(shadowed));
await c.shot('1j-shadows');

// ── The view, by hand ───────────────────────────────────────────────────────

const yaw0 = await value('turned'), pitch0 = await value('raised');
const [ax, ay] = await onStage(0.5, 0.5), [bx, by] = await onStage(0.62, 0.55);
const h = await stageHeight();
const turned = await grid();
await page.pointer([ax, ay], [bx, by], 8);
await wait(300);
const yaw1 = await value('turned'), pitch1 = await value('raised');
const wantYaw = yaw0 - (bx - ax) * TURN / h, wantPitch = pitch0 + (by - ay) * TURN / h;
c.ok('a drag turns round the model, as far as the pointer went', Math.abs(yaw1 - wantYaw) < 0.01 && Math.abs(pitch1 - wantPitch) < 0.01,
  `yaw ${yaw0} → ${yaw1.toFixed(2)} (${wantYaw.toFixed(2)}), pitch ${pitch0} → ${pitch1.toFixed(2)} (${wantPitch.toFixed(2)})`);
c.ok('…and the picture turned', apart(await grid(), turned) > 20);
c.ok('…and a drag that started on the sphere chose nothing', (await choice()) === 'folded folded folded', await choice());
await c.shot('2-turned');

const tx0 = await value('looking at x'), ty0 = await value('looking at y');
await page.pointer([ax, ay], [ax + 40, ay + 30], 6, { button: 'right' });
await wait(300);
c.ok('the right button slides what is looked at', (await value('looking at x')) !== tx0 || (await value('looking at y')) !== ty0,
  `x ${tx0} → ${await value('looking at x')}, y ${ty0} → ${await value('looking at y')}`);

const d0 = await value('distance');
await page.eval(`document.getElementById('stage').dispatchEvent(new WheelEvent('wheel', { clientX: ${ax}, clientY: ${ay}, deltaY: -300, bubbles: true, cancelable: true }))`);
await wait(300);
const d1 = await value('distance');
c.ok('the wheel comes nearer', d1 < d0 && Math.abs(d1 - d0 * Math.exp(-300 * 0.0015)) < 1e-6, `${d0} → ${d1}`);

await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F' }))`);
await wait(400);
const framed = [await value('looking at x'), await value('looking at y'), await value('distance')];
c.ok('F frames every shape: looking at their middle, from far enough', Math.abs(framed[0]) < 0.1 && Math.abs(framed[1]) < 0.1
  && framed[2] > 3, JSON.stringify(framed.map(x => +x.toFixed(3))));
c.ok('…and every corner is still ground', (await Promise.all([[0.02, 0.02], [0.98, 0.98]].map(([x, y]) => pixelAt(x, y)))).every(isGround));
await c.shot('3-framed');

// ── Saved, replayed, drawn again ────────────────────────────────────────────

await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }))`);
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const mid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const o = mid ? inner(await (await fetch(c.base + '/api/vault/' + mid)).json()) : null;
c.ok('saved: a model, made by 3d, titled by its shapes — the first state of its smart object', !!o && o.type === 'model' && o.origin.app === '3d'
  && o.title === 'box, sphere, torus' && o.smart && o.version === 1, o ? `${o.id} ${o.type} "${o.title}"` : await page.eval(say));
c.ok('its recipe: the view and its shapes, no vertices', !!o && o.recipe.shapes.length === 3 && o.recipe.shapes[1].id === 'sphere'
  && o.recipe.shapes[1].params.radius === 0.6 && typeof o.recipe.yaw === 'number' && !JSON.stringify(o.recipe).includes('position'));
const kept = o && o.recipe.shapes[0].modifiers;
c.ok('…the box\'s stack kept with it, in order', !!kept && kept.map(m => `${m.id}:${m.on}`).join() === 'subdivide:true,twist:true,displace:true'
  && kept[1].params.angle === 90, JSON.stringify(kept));
c.ok('…and its style, three bands, an outline, shadows', !!o && o.recipe.toon === 3 && o.recipe.outline === 6 && o.recipe.shadows === true, o && `${o.recipe.toon} ${o.recipe.outline} ${o.recipe.shadows}`);
c.ok('its render: the format, 1080 square', !!o && o.render.w === 1080 && o.render.h === 1080 && o.render.file === 'render.png',
  o && `${o.render.w} × ${o.render.h} ${o.render.file}`);

/** A saved model as the vault replays it: at its size, drawn again by its app, and at scale 2. */
const replayOf = id => page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { openFrames } = await import('/core/rebuild.js');
  const app = await import('/apps/3d/rebuild.js');
  const { object, url } = await Vault.load(${JSON.stringify(id)});
  const img = await createImageBitmap(await (await fetch(url)).blob());
  const read = (src, w, h) => { const x = new OffscreenCanvas(w, h).getContext('2d'); x.drawImage(src, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
  const render = read(img, img.width, img.height);
  const it = object.type === 'skw' ? (await import('/core/smart.js')).unwrap(object) : object;   // the app's rebuild takes the object a smart one binds
  const own = await app.openObject(it, { url });
  const again = read(own.frame(0), img.width, img.height);
  let worst = 0, off = 0;
  for (let i = 0; i < render.length; i++) { const d = Math.abs(render[i] - again[i]); worst = Math.max(worst, d); if (d > 8) off++; }
  const big = await openFrames(object, { url, scale: 2 });
  const bigFrame = big.frame(0);
  const down = read(bigFrame, img.width, img.height);
  let mean = 0; for (let i = 0; i < render.length; i++) mean += Math.abs(render[i] - down[i]); mean /= render.length;
  const out = { worst, off: off / render.length, big: [big.scale, bigFrame.width, bigFrame.height], mean, missing: own.missing,
                atOwn: (await openFrames(object, { url })).scale };
  own.dispose(); big.dispose(); return out;
})()`);
if (o) {
  const replay = await replayOf(o.id);
  c.ok('drawn again by its app, it is its render', replay.off < 0.001 && replay.worst <= 64,
    `worst ${replay.worst}, ${(replay.off * 100).toFixed(3)}% past 8`);
  c.ok('at its own size the vault shows its render', replay.atOwn === 1);
  c.ok('at scale 2: drawn again, twice the pixels', replay.big[0] === 2 && replay.big[1] === 2160 && replay.big[2] === 2160, JSON.stringify(replay.big));
  c.ok('…the same picture, sharper', replay.mean < 2, `mean difference ${replay.mean.toFixed(3)} of 255`);
  c.ok('…with nothing missing', replay.missing.length === 0);

  await c.go(c.base + '/apps/3d/?open=' + o.id);
  await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
  c.ok('?open= brings its shapes back, folded, the box\'s stack too', (await page.eval(`${cards}.length`)) === 3
    && (await page.eval(`Number(${cardRow(1, 'radius')}?.querySelector('.pp-num')?.value)`)) === 0.6
    && Math.abs((await value('distance')) - o.recipe.distance) < 1e-9 && (await choice()) === 'folded folded folded'
    && (await page.eval(`${modCards(0)}.map(m => m.querySelector('.pp-title').textContent).join()`)) === 'subdivide,twist,displace'
    && (await value('bands of light — 0, smooth')) === 3 && (await value('outline, thousandths of its height')) === 6, await page.eval(say));

  await c.go(c.base + '/apps/compose/?place=' + o.id);
  await page.until(`${say}.includes(' on the page') || ${say}.includes('could not')`, { timeout: 60000 });
  c.ok('compose places it', (await page.eval(say)).includes('box, sphere, torus — model'), await page.eval(say));
  await c.shot('4-placed');
}

// ── The PNG: the format at its scale, drawn again ───────────────────────────

await c.go(c.base + '/apps/3d/');
await page.until(drawn, { timeout: 30000 });
const DL = path.join(c.dir, 'downloads');
await page.downloadsTo(DL);
await page.typeInto(`${panelRow('scale')}?.querySelector('.pp-num')`, '2');
await wait(300);
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Download the picture (PNG)')`);
await page.until(`/^downloaded|failed/.test(${say})`, { timeout: 60000 });
let file = null;
for (let i = 0; i < 100 && !file; i++) {
  const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => n.endsWith('.png'));
  if (f) file = path.join(DL, f); else await wait(200);
}
const size = file ? (b => [b.readUInt32BE(16), b.readUInt32BE(20)])(fs.readFileSync(file)) : [0, 0];
c.ok('the PNG is the format at its scale', size[0] === 2160 && size[1] === 2160, size.join(' × '));

// ── BEC's grid (M13a; apps/3d/grid.js): a shape of the catalogue, its colours its palette's, its draws seeds ──

await c.go(c.base + '/apps/3d/');
await page.until(drawn, { timeout: 30000 });
await keep();
await page.typeInto(`[...document.querySelectorAll('.pp-cards-add')].find(m => !m.closest('.pp-card'))`, 'grid');
await page.until(`${cards}.length === 4`, { timeout: 10000 }).catch(() => {});
await wait(600);
const bec = await changed();
c.ok('BEC\'s grid added from the menu: drawn and chosen, no colour of its own', (await page.eval(`${cards}.length`)) === 4 && bec.share > 0.01
  && (await choice()) === 'folded folded folded chosen' && !(await page.eval(`!!${cardRow(3, 'colour')}`)), JSON.stringify(bec));
const cardNumber = name => page.eval(`Number(${cardRow(3, name)}?.querySelector('.pp-num')?.value)`);
const tapKey = k => page.eval(`(() => { for (const type of ['keydown', 'keyup'])
  document.dispatchEvent(new KeyboardEvent(type, { code: 'Key${k.toUpperCase()}', key: '${k}', bubbles: true })); })()`);
const edgesWere = await cardNumber('which edges (R)'), huesWere = await cardNumber('colours dealt (C)');
await tapKey('f');                                   // the whole model in view: the grid came in beside the others
await wait(600);
await keep();
await tapKey('r');
await wait(600);
const byR = await changed();
c.ok('…R, as BEC\'s e: other edges drawn, its seed the next', (await cardNumber('which edges (R)')) === edgesWere + 1 && byR.share > 0.0005, JSON.stringify(byR));
await keep();
await tapKey('c');
await wait(600);
const byC = await changed();
c.ok('…C, as BEC\'s c: its colours dealt anew', (await cardNumber('colours dealt (C)')) === huesWere + 1 && byC.share > 0.0005, JSON.stringify(byC));
// …a palette of the vault (V1, apps/3d/palettes.js): made by hand, named by the grid, its colours the grid's.
const pal = await page.eval(`import('/core/vault-palette.js').then(({ savePalette }) => savePalette({ title: 'magenta and cyan', colours: ['#ff00ff', '#00ffff'] })).then(o => o && o.id)`);
const tinted = () => page.eval(`(() => { const c = document.getElementById('stage'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 0; i < d.length; i += 4) { const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    if ((r > g + 60 && b > g + 60) || (g > r + 60 && b > r + 60 && g > 90)) n++; } return n; })()`);
const tintedBefore = await tinted();
await page.eval(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(${cardRow(3, 'a palette of the vault')}).params.set('colours', ${JSON.stringify(pal)}))`);
await page.until(`(() => { const c = document.getElementById('stage'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > d[i + 1] + 60 && d[i + 2] > d[i + 1] + 60) n++; return n > 200; })()`, { timeout: 10000 }).catch(() => {});
const tintedAfter = await tinted();
c.ok('…a palette of the vault named: the grid drawn in its colours', !!pal && tintedAfter > tintedBefore + 200, `${tintedBefore} → ${tintedAfter} magenta or cyan`);
await c.shot('4-bec-grid');

// ── With no WebGPU: three falls back to WebGL2, as on the laptop's Intel ────

const stub = await page.beforeLoad(`Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });`);
await c.go(c.base + '/apps/3d/');
await page.until(drawn, { timeout: 30000 });
const fallback = await page.eval(say);
c.ok('no WebGPU: drawn with WebGL2, and the bar says so', fallback.endsWith('WebGL2'), fallback);
c.ok('…the same opening: the sphere blue in the middle, the corners ground', isBlue(await pixelAt(0.5, 0.5)) && isGround(await pixelAt(0.02, 0.02)));
await press(0.5, 0.5);
c.ok('…and a click chooses the sphere there too, its handles drawn', (await choice()) === 'folded chosen folded' && !!(await green()), await choice());
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
await wait(300);
await keep();
await page.typeInto(`${panelRow('bands of light — 0, smooth')}?.querySelector('.pp-num')`, '3');
await page.typeInto(`${panelRow('outline, thousandths of its height')}?.querySelector('.pp-num')`, '6');
await page.click(`${panelRow('shadows, on a ground of their own')}?.querySelector('input')`);
await wait(800);
const glStyle = [await blues(), await pastSphere()];
c.ok('…and the style there too: toon bands, ink round the sphere', glStyle[0].share > 0.9 && glStyle[1] && glStyle[1].run >= 2, JSON.stringify(glStyle));
await c.shot('5-webgl2');
await page.forget(stub);

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
