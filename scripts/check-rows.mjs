#!/usr/bin/env node
/**
 * scripts/check-rows.mjs — S2 and S2b in Chrome: a value on one line, as the
 * bench has it (core/param-rows.js, core/numbox.js, core/ParamPanel.js).
 *
 *   node scripts/check-rows.mjs
 *
 * In particles: a number's unit sits inside its box, not in its label; the
 * box dragged sideways moves the value, its fill with it, and the row's mark
 * turns a dot that its drawer counts; Alt click on a label shows its slider.
 * Two numbers on one line — width × height, the x and y from the centre —
 * are still a row each for whoever looks for them; the link holds the other
 * side, and off, it does not; the swap swaps, and the format is custom. The
 * rows seldom touched fold under "n more"; a changed one stays out; the
 * search reaches a folded one and opens its fold. No page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = key => `document.querySelector('.pp-row[data-key="${key}"]')`;
const num = key => page.eval(`+${row(key)}.querySelector('.pp-num').value`);
const shown = key => page.eval(`getComputedStyle(${row(key)}).display !== 'none' && !${row(key)}.closest('[hidden]')`);
const rectOf = expr => page.eval(`(() => { const r = (${expr}).getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`);

await c.go(c.base + '/apps/particles/');
await page.until(`!!document.querySelector('.pp-pair') && !!${row('gravity')}`);

// The unit inside the box, at its right; the label without it.
const unit = await page.eval(`(() => { const r = ${row('gravity')}, u = r.querySelector('.pp-unit'), b = r.querySelector('.pp-num');
  const ur = u.getBoundingClientRect(), br = b.getBoundingClientRect();
  return { name: r.querySelector('.pp-name').textContent, unit: u.textContent, inside: ur.left >= br.left && ur.right <= br.right + 0.5 && ur.top >= br.top - 0.5 && ur.bottom <= br.bottom + 0.5 }; })()`);
c.ok('a number\'s unit sits inside its box, not in its label', unit.name === 'gravity' && unit.unit === 'px/s²' && unit.inside, JSON.stringify(unit));

// The box dragged sideways: the value moves, and its fill.
const speed0 = await num('speed'), fill0 = await page.eval(`${row('speed')}.querySelector('.pp-num').style.getPropertyValue('--fb')`);
const sb = await rectOf(`${row('speed')}.querySelector('.pp-num')`);
await page.pointer([sb[0] + sb[2] / 2, sb[1] + sb[3] / 2], [sb[0] + sb[2] / 2 + 40, sb[1] + sb[3] / 2], 8);
const speed1 = await num('speed'), fill1 = await page.eval(`${row('speed')}.querySelector('.pp-num').style.getPropertyValue('--fb')`);
c.ok('a box dragged sideways moves its value, and its fill', speed1 > speed0 && fill1 !== fill0, `${speed0} → ${speed1}, fill ${fill0} → ${fill1}`);
const counted = await page.eval(`({ mod: ${row('speed')}.classList.contains('pp-row--mod'), badge: ${row('speed')}.closest('.dr').querySelector('.dr-mod')?.textContent })`);
c.ok('the changed row is marked, and its drawer counts it', counted.mod && counted.badge === '1', JSON.stringify(counted));

// Alt click on a label: its slider, shown.
const had = await page.eval(`${row('wind')}.classList.contains('pp-row--slider')`);
await page.eval(`${row('wind')}.querySelector('.pp-label').dispatchEvent(new MouseEvent('click', { altKey: true, bubbles: true }))`);
c.ok('Alt click on a label shows its slider', !had && await page.eval(`${row('wind')}.classList.contains('pp-row--slider')`));

// Two numbers on one line, each still a row of its own.
const pair = await page.eval(`(() => { const p = ${row('x')}.closest('.pp-pair');
  return p && { name: p.querySelector('.pp-pair-name').textContent, halves: [...p.querySelectorAll('.pp-row--half')].map(r => r.dataset.key + ' ' + r.querySelector('.pp-name').textContent),
    line: Math.abs(${row('x')}.getBoundingClientRect().top - ${row('y')}.getBoundingClientRect().top) < 2 }; })()`);
c.ok('x and y from the centre on one line, a row each still', pair && pair.name === 'from centre' && pair.line
  && pair.halves.join() === 'x x from centre,y y from centre', JSON.stringify(pair));

// The frame's size: linked, the other side follows; unlinked, not; swapped, the format is custom — behind the
// size's chip in the viewer since S14b (core/viewformat.js).
await page.click(`document.querySelector('.viewer-head > .vf .vf-size')`);
await page.typeInto(`${row('width')}.querySelector('.pp-num')`, '540');
c.ok('linked, the height follows the width', (await num('height')) === 540, `${await num('width')} × ${await num('height')}`);
await page.click(`document.querySelector('.pp-pair-link')`);
await page.typeInto(`${row('width')}.querySelector('.pp-num')`, '800');
const unlinked = [await num('width'), await num('height'), await page.eval(`document.querySelector('.pp-pair-link').getAttribute('aria-pressed')`)];
c.ok('the link off, the height stays where it is', unlinked.join() === '800,540,false', unlinked.join());
await page.click(`document.querySelector('.pp-pair-swap')`);
const swapped = [await num('width'), await num('height'), await page.eval(`${row('format')}.querySelector('select').value`)];
c.ok('the swap swaps, and the format is custom', swapped.join() === '540,800,custom', swapped.join());

// The fold: the rows seldom touched under "n more"; a changed one stays out.
const fold = `${row('jitter')}.closest('.dr').querySelector(':scope > .dr-body > .pp-more')`;
const folded = { jitter: await shown('jitter'), prewarm: await shown('prewarm'), button: await page.eval(`${fold}.textContent`) };
c.ok('the rows seldom touched are folded under "2 more"', !folded.jitter && !folded.prewarm && folded.button === '2 more', JSON.stringify(folded));
await page.click(fold);
const open = { jitter: await shown('jitter'), button: await page.eval(`${fold}.textContent`) };
await page.click(fold);
c.ok('"2 more" shows them, "fewer" folds them again', open.jitter && open.button === 'fewer' && !(await shown('jitter')), JSON.stringify(open));
await page.typeInto(`${row('jitter')}.querySelector('.pp-num')`, '0.5');
c.ok('a row changed from its default stays out of the fold', (await shown('jitter')) && (await page.eval(`${fold}.textContent`)) === '1 more',
  await page.eval(`${fold}.textContent`));

// The search reaches a folded row: its drawer and its fold opened, its box in hand — and a row of the format behind
// the size's chip, the chip opened (S14b).
const search = async words => {
  await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote', key: '²', bubbles: true }))`);
  await page.eval(`(() => { const i = document.querySelector('.pal-input'); i.value = ${JSON.stringify(words)}; i.dispatchEvent(new Event('input')); })()`);
  const found = await page.eval(`[...document.querySelectorAll('.pal-list li .pal-name')].map(n => n.textContent)`);
  await page.eval(`document.querySelector('.pal-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
  await wait(400);
  return found;
};
const handOn = key => page.eval(`({ shown: getComputedStyle(${row(key)}).display !== 'none' && !!${row(key)}.getClientRects().length,
  focus: ${row(key)}.contains(document.activeElement) })`);
const foundFold = await search('first frame'), handFold = await handOn('prewarm');
c.ok('the search reaches a folded row, and opens its fold', /› full from the first frame/.test(foundFold[0]) && handFold.shown && handFold.focus,
  JSON.stringify({ found: foundFold.slice(0, 2), hand: handFold }));
const found = await search('bleed'), hand = await handOn('bleed');
c.ok('…and a row of the format, behind its chip, the chip opened', found[0] === 'Format › bleed px' && hand.shown && hand.focus,
  JSON.stringify({ found: found.slice(0, 2), hand }));

// ── The sliders and boxes the author found stuck in fractals (2026-11-06) ────
// A slider with `step: 'any'` read its step as NaN, and the param put its default back; a count's slider went by
// fives; a box dragged went a whole step a pixel. Each moved by hand here, as the panel has it.
await c.go(c.base + '/apps/fractals/');
await page.until(`!!${row('cx')} && !!${row('cx')}.querySelector('.pp-range')`, { timeout: 30000 });
const slide = (key, v) => page.eval(`(() => { const s = ${row(key)}.querySelector('.pp-range'); s.value = String(${v});
  s.dispatchEvent(new Event('input', { bubbles: true })); return import('/core/param-rows.js').then(({ rowParams }) => rowParams(${row(key)}).params.get('${key}')); })()`);
c.ok('a slider with no grid moves its value — a fractal\'s centre', (await slide('cx', 1.25)) === 1.25 && (await slide('cx', -2.5)) === -2.5);
const cx0 = await num('cx');
const xb = await rectOf(`${row('cx')}.querySelector('.pp-num')`);
await page.pointer([xb[0] + xb[2] / 2, xb[1] + xb[3] / 2], [xb[0] + xb[2] / 2 + 40, xb[1] + xb[3] / 2], 8);
await wait(200);
const cx1 = await num('cx');
c.ok('…its box dragged moves it too, a little for a little', Number.isFinite(cx1) && cx1 > cx0 && cx1 - cx0 < 2, `${cx0} → ${cx1}`);
await page.eval(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(${row('family')}).params.set('family', 'copies'))`);
await page.until(`!!${row('depth')} && !${row('depth')}.hidden`, { timeout: 10000 });
c.ok('a count\'s slider stops at every whole value, not at fives', (await slide('depth', 7.4)) === 7 && (await slide('depth', 8.6)) === 9);
c.ok('a stepped range\'s slider, five of its steps from its least — a turn of 0.5°, 2.5° a stop', (await slide('twist', 10.3)) === 10
  && (await slide('twist', 11.4)) === 12.5);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
