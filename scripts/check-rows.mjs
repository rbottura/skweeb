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

// The frame's size: linked, the other side follows; unlinked, not; swapped, the format is custom.
await page.click(`${row('width')}.closest('.dr').querySelector(':scope > .dr-head')`);
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

// The search reaches a folded row: its drawer and its fold opened, its box in hand.
await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote', key: '²', bubbles: true }))`);
await page.eval(`(() => { const i = document.querySelector('.pal-input'); i.value = 'bleed'; i.dispatchEvent(new Event('input')); })()`);
const found = await page.eval(`[...document.querySelectorAll('.pal-list li .pal-name')].map(n => n.textContent)`);
await page.eval(`document.querySelector('.pal-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
await wait(400);
const hand = await page.eval(`({ shown: getComputedStyle(${row('bleed')}).display !== 'none', focus: document.activeElement === ${row('bleed')}.querySelector('.pp-num') })`);
c.ok('the search reaches a folded row, and opens its fold', found[0] === 'Format › bleed px' && hand.shown && hand.focus, JSON.stringify({ found: found.slice(0, 2), hand }));

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
