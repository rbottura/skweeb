#!/usr/bin/env node
/**
 * scripts/check-frames.mjs — a flipbook in compose: stills one after another.
 *
 *   node scripts/check-frames.mjs
 *
 * On a copy of the vault: a still placed, then two more with *Next frame…* —
 * each where the one before it is, starting where it ends, and shown as it
 * comes; the list says which frame each is; the page is as long as its
 * frames, at the flipbook's rate; stepped, each frame shows its own still and
 * then the first again; pressed on, the page gives the frame that shows, not
 * the one stacked over it; saved, its blocks keep their time, and the vault
 * replays it three frames long. Paused, the onion skin shows the frames
 * either side, and switched off it does not; a frame held longer pushes the
 * ones after it on, one taken out lets them close up, and one put in after
 * frame 1 makes room.
 */

import { startCheck, inner } from './check-kit.mjs';   // inner: a smart object as its app has it (S6b)

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const rows = `[...document.querySelectorAll('#place-side .pl-row')]`;
// The page as a 12 × 12 grid of mean colours. Read back often, Chrome moves a
// canvas off the GPU and filters a shrunk still a hair differently, so two
// frames are the same when no cell differs by more than a few levels.
const pixels = () => page.eval(`(() => { const c = document.getElementById('page');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const n = 12, out = new Array(n * n * 3).fill(0), count = new Array(n * n).fill(0);
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) {
    const i = (y * c.width + x) * 4, k = Math.floor(y * n / c.height) * n + Math.floor(x * n / c.width);
    out[k * 3] += d[i]; out[k * 3 + 1] += d[i + 1]; out[k * 3 + 2] += d[i + 2]; count[k]++;
  }
  return out.map((v, j) => Math.round(v / Math.max(1, count[Math.floor(j / 3)]))); })()`);
const apart = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));
const count = `(document.querySelector('.tp-count')?.textContent || '')`;
const key = k => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`);
const wait = ms => new Promise(r => setTimeout(r, ms));

// Three stills, loose and unmistakable in the picker.
const all = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
const loose = r => !(r.tags || []).some(t => t.startsWith('folder:') || t === 'trash');
const label = r => r.title + ' ' + r.render.w + '×' + r.render.h;
const three = all.filter(r => (r.type === 'still' || r.type === 'shape') && loose(r)
  && all.filter(o => label(o) === label(r)).length === 1).slice(0, 3);
if (three.length < 3) { c.ok('the vault has three loose stills', false, three.length + ' found'); await c.finish(); }
const [a, b, d] = three;

await c.go(c.base + '/apps/compose/?place=' + a.id);
await page.until(`${say}.includes(' on the page') || ${say}.includes('could not')`, { timeout: 60000 });

async function nextFrame(row) {
  const n = await page.eval(`${rows}.length`);
  await page.click(`[...document.querySelectorAll('#place-side .pl-actions .nb-btn')].find(x => x.textContent === 'Next frame…')`);
  await page.until(`document.querySelectorAll('.vp--visible .vp-use').length > 0`);
  await page.click(`[...document.querySelectorAll('.vp--visible .vp-cell')].find(k =>
    k.querySelector('.vp-name')?.textContent === ${JSON.stringify(row.title)}
    && k.querySelector('.vp-sub')?.textContent.includes(${JSON.stringify(row.render.w + '×' + row.render.h)}))?.querySelector('.vp-use')`);
  await page.until(`${rows}.length === ${n + 1} && !${rows}.some(r => r.textContent.includes('opening'))`, { timeout: 60000 });
  return page.eval(count);
}
const shown = [await nextFrame(b), await nextFrame(d)];
c.ok('each next frame is shown as it comes', shown.join() === '2 / 2,3 / 3', shown.join(' | '));

const subs = await page.eval(`${rows}.map(r => r.querySelector('.pl-sub').textContent.split(' · ').pop()).reverse()`);
c.ok('Next frame puts each after the last, a frame each', subs.join() === 'frame 1,frame 2,frame 3', subs.join(' | '));
const places = await page.eval(`${rows}.length`);
c.ok('three placed', places === 3);

await page.typeInto(`[...document.querySelectorAll('#page-side .pp-row')].find(r => r.querySelector('.pp-name')?.textContent === 'fps')?.querySelector('.pp-num')`, '8');
await page.until(`(document.querySelector('.dr-note')?.textContent || document.body.textContent).includes('3 frames')`, { timeout: 10000 })
  .catch(() => {});
const note = await page.eval(`[...document.querySelectorAll('#page-side .dr-note')].map(n => n.textContent).join(' ')`);
c.ok('the page is as long as its frames, at the flipbook\'s rate', note.includes('3 frames') && note.includes('0.38 s'), note);

// Step through: each frame its own still, then the first again.
key('.'); key(','); await wait(300);                       // at frame 1, paused
const seen = [];
for (let i = 0; i < 4; i++) { seen.push(await pixels()); key('.'); await wait(300); }
const gaps = [apart(seen[0], seen[1]), apart(seen[1], seen[2]), apart(seen[0], seen[2])];
c.ok('each frame shows its own still', Math.min(...gaps) > 24, 'apart by ' + gaps.join(', '));
c.ok('and after the last, the first again', apart(seen[3], seen[0]) <= 4, 'apart by ' + apart(seen[3], seen[0]));
await c.shot('1-flipbook');

// Pressed on at frame 1, the page gives frame 1 — not frame 3, stacked over it and hidden.
key(','); await wait(300);                                   // the loop above ended on frame 2
const centre = await page.eval(`(() => { const r = document.getElementById('page').getBoundingClientRect();
  return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; })()`);
await page.pointer(centre);
const picked = await page.eval(`document.querySelector('#place-side .pl-row--on .pl-sub')?.textContent.split(' · ').pop()`);
c.ok('pressed on, the page gives the frame that shows', picked === 'frame 1' && (await page.eval(count)) === '1 / 3', picked);

// Saved, it keeps its time, and replays three frames long.
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await key('S');
await page.until(`/^saved |failed/.test(${say})`, { timeout: 120000 });
const id = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const o = id ? inner(await (await fetch(c.base + '/api/vault/' + id)).json()) : null;
c.ok('saved, each block keeps when it shows', !!o && JSON.stringify(o.recipe.place.map(p => [p.at, p.length])) === '[[0,1],[1,1],[2,1]]',
  o ? JSON.stringify(o.recipe.place.map(p => [p.ref === a.id || p.ref === b.id || p.ref === d.id, p.at, p.length])) : 'not saved');
c.ok('a loop of three at eight', !!o && o.render.frames === 3 && o.render.fps === 8, o ? `${o.render.frames} at ${o.render.fps}` : '');
if (o) {
  const replayed = await page.eval(`(async () => {
    const { Vault } = await import('/core/vault.js');
    const { openFrames } = await import('/core/rebuild.js');
    const { object, url } = await Vault.load(${JSON.stringify(id)});
    const h = await openFrames(object, { url });
    const n = h.length; h.dispose(); return n;
  })()`);
  c.ok('the vault replays it, three frames', replayed === 3, replayed + ' frames');
}

// The onion skin: paused on frame 2, the frames either side show, faint; switched off, they do not.
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const onionSwitch = `${row('onion skin, paused')}?.querySelector('input')`;
key('.'); await wait(300);
const withOnion = await pixels();
await page.eval(`(() => { const i = ${onionSwitch}; i.checked = false; i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await wait(300);
const without = await pixels();
c.ok('paused, the onion skin shows the frames either side', apart(withOnion, without) > 4, 'apart by ' + apart(withOnion, without));
c.ok('switched off, frame 2 is its own still again', apart(without, seen[1]) > 4 && (await page.eval(count)) === '2 / 3',
  'apart from the onion-skinned one by ' + apart(without, seen[1]));
await c.shot('2-no-onion');

// The ripple: frame 2 held for two pushes frame 3 on; taken out, the rest close up; one put in makes room.
const when = () => page.eval(`${rows}.map(r => r.querySelector('.pl-sub').textContent.split(' · ').pop()).reverse().join()`);
const choose = label => page.click(`${rows}.find(r => r.querySelector('.pl-sub').textContent.endsWith(${JSON.stringify(label)}))`);
await choose('frame 2');
await page.typeInto(`${row('for frames (0: its own)')}?.querySelector('.pp-num')`, '2');
await wait(300);
const held = await when();
c.ok('frame 2 held for two pushes frame 3 on', held === 'frame 1,frames 2–3,frame 4', held);
await page.click(`[...document.querySelectorAll('#place-side .pl-actions .nb-btn')].find(x => x.textContent === 'Remove')`);
await wait(300);
const closed = await when();
c.ok('taken out, the frames after it close up', closed === 'frame 1,frame 2', closed);
await choose('frame 1');
await nextFrame(b);
const room = await when();
c.ok('a frame put in after frame 1 makes room', room === 'frame 1,frame 2,frame 3', room);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
