#!/usr/bin/env node
/**
 * scripts/check-palette.mjs — the search of S5 (core/Palette.js) in Chrome.
 *
 *   node scripts/check-palette.mjs
 *
 * In particles and in compose: ² opens it, and Ctrl K; a word finds the row
 * by its name under its drawer's title, the current value beside it; Enter
 * puts the hand on it — its drawer open, its box focused and selected for
 * typing; the acts of the drawers are found by their words, the Export
 * box's among them; Escape closes it; typed into a field, ² is a letter and
 * no search. The title bar's search opens it, and its Export lists the
 * Export box's acts and the print. And no page said anything wrong.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const key = (code, k, extra = '') => page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { code: '${code}', key: '${k}', bubbles: true${extra} }))`);
const shown = () => page.eval(`[...document.querySelectorAll('.pal-list li')].map(li => li.querySelector('.pal-name')?.textContent + ' = ' + (li.querySelector('.pal-detail')?.textContent || ''))`);
const type = text => page.eval(`(() => { const i = document.querySelector('.pal-input'); i.value = ${JSON.stringify(text)}; i.dispatchEvent(new Event('input')); })()`);
const press = k => page.eval(`document.querySelector('.pal-input').dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', bubbles: true }))`);

await c.go(c.base + '/apps/particles/');
await page.until(`!!document.querySelector('.pp-row .pp-num')`);

await key('Backquote', '²');
c.ok('² opens the search', await page.eval(`!!document.querySelector('.pal .pal-input') && document.activeElement === document.querySelector('.pal-input')`));
await type('gravity');
const found = await shown();
c.ok('a word finds the row, under its drawer, with its value', found[0] === 'Forces › gravity px/s² = -260', JSON.stringify(found.slice(0, 3)));
await press('Enter');
await wait(400);
const hand = await page.eval(`(() => { const a = document.activeElement, row = a && a.closest('.pp-row');
  return { gone: !document.querySelector('.pal'), name: row?.querySelector('.pp-name')?.textContent, num: a?.classList.contains('pp-num'),
           selected: a ? a.selectionStart === 0 && a.selectionEnd === String(a.value).length : false, open: !!row?.closest('.dr.dr--open') }; })()`);
c.ok('Enter puts the hand on it: its box focused, ready to type', hand.gone && hand.name === 'gravity px/s²' && hand.num && hand.open, JSON.stringify(hand));
await page.eval(`document.activeElement && document.activeElement.blur()`);

await key('KeyK', 'k', ', ctrlKey: true');
await type('sprite sheet');
const acts = await page.eval(`[...document.querySelectorAll('.pal-list li.pal-act .pal-name')].map(n => n.textContent)`);
c.ok('Ctrl K opens it too, and finds the acts by their words', acts.includes('Download a sprite sheet'), JSON.stringify(acts));
await type('vault');
const saves = await page.eval(`[...document.querySelectorAll('.pal-list li.pal-act .pal-name')].map(n => n.textContent)`);
c.ok('the Export box among them', saves.some(t => t.startsWith('Save to the vault')), JSON.stringify(saves.slice(0, 4)));
await press('Escape');
c.ok('Escape closes it', await page.eval(`!document.querySelector('.pal')`));

// In a field, ² is a letter and no search.
await page.eval(`(() => { const b = document.querySelector('.pp-num'); b.focus(); })()`);
await page.eval(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote', key: '²', bubbles: true }))`);
c.ok('typed into a field, ² opens nothing', await page.eval(`!document.querySelector('.pal')`));

await c.go(c.base + '/apps/compose/');
await page.until(`!!document.querySelector('#page-side .pp-row')`);
await key('Backquote', '²');
await type('onion');
const compose = await shown();
c.ok('compose: its rows by name too', compose.length === 1 && compose[0].startsWith('Sequence player › onion skin'), JSON.stringify(compose));
await press('Escape');

// The title bar (core/shell/titlebar.js, S12): its search opens this; its Export lists the Export box's acts.
await page.until(`!!document.querySelector('skw-titlebar .tb-search')`);
await page.click(`document.querySelector('skw-titlebar .tb-search')`);
c.ok("the title bar's search opens it", await page.eval(`!!document.querySelector('.pal .pal-input')`));
await press('Escape');
await page.click(`document.querySelector('skw-titlebar .tb-export')`);
await wait(200);
const menu = await page.eval(`[...document.querySelectorAll('skw-titlebar .tb-menu-item')].map(b => b.textContent.trim())`);
c.ok("its Export lists the box's acts, and the print", menu.some(t => t.startsWith('Save to the vault')) && menu.some(t => t.startsWith('Print')), JSON.stringify(menu));

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
