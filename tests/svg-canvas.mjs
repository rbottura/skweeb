/**
 * tests/svg-canvas.mjs — run with: node tests/svg-canvas.mjs
 *
 * core/svg-canvas.js, the writer an SVG is drawn through (G11). The promises —
 * a whole disc filled is a circle where the canvas would draw it, in its
 * colour and its opacity apart; scaled alike both ways still one, stretched a
 * path; a rectangle a rect, turned a path; a clear of the whole picture
 * forgets what was drawn; a picture kept once and placed as often as drawn;
 * save and restore as canvas's; a blend SVG has a name for written, one it
 * has not said; what it cannot draw throws, naming it; the paper a format's
 * millimetres, its bleed in them; a title written safe.
 */

import { svgCanvas, paintOf, paperOf } from '../core/svg-canvas.js';

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 90),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 90));
};
const lines = text => text.split('\n').filter(l => /^<(circle|rect|path|use)\b/.test(l));
const disc = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

// ── A dot ────────────────────────────────────────────────────────────────────
let ctx = svgCanvas(100, 50);
ctx.fillStyle = '#abc';
ctx.globalAlpha = 0.5;
disc(ctx, 10.123, 20.456, 3);
ctx.globalAlpha = 1;
ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
disc(ctx, 50, 25, 4);
let out = ctx.svg();
ok('a disc filled: a circle, its colour and its opacity apart', lines(out.text),
  ['<circle cx="10.12" cy="20.46" r="3" fill="#aabbcc" fill-opacity="0.5"/>', '<circle cx="50" cy="25" r="4" fill="#ff0000" fill-opacity="0.25"/>']);
ok('…counted as dots', [out.dots, out.shapes, out.pictures], [2, 0, 0]);
ok('…a file of pixels, its viewBox the picture', out.text.split('\n').slice(0, 2),
  ['<?xml version="1.0" encoding="UTF-8"?>',
   '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="100" height="50" viewBox="0 0 100 50">']);

// ── Transformed ──────────────────────────────────────────────────────────────
ctx = svgCanvas(100, 100);
ctx.translate(10, 20);
ctx.scale(2, 2);
ctx.rotate(0.3);
disc(ctx, 0, 0, 5);
ctx.setTransform(2, 0, 0, 1, 0, 0);
disc(ctx, 20, 50, 5);
out = ctx.svg();
const [round, stretched] = lines(out.text);
ok('moved, turned, scaled alike: still a circle, its radius scaled', round, '<circle cx="10" cy="20" r="10" fill="#000000"/>');
ok('stretched one way: a path of curves, as wide as stretched', [/^<path d="M50 50C/.test(stretched), /C30 50/.test(stretched) || /30 50/.test(stretched)],
  [true, true]);

// ── Rectangles, a clear ──────────────────────────────────────────────────────
ctx = svgCanvas(100, 50);
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, 100, 50);
disc(ctx, 5, 5, 1);
ctx.clearRect(0, 0, 100, 50);
ctx.fillStyle = '#fffdf6';
ctx.fillRect(0, 0, 100, 50);
ctx.setTransform(0, 1, -1, 0, 50, 0);
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, 10, 20);
out = ctx.svg();
ok('a clear of the whole picture forgets what was drawn: the ground, then a rect turned as a path', lines(out.text),
  ['<rect x="0" y="0" width="100" height="50" fill="#fffdf6"/>', '<path d="M50 0L50 10L30 10L30 0Z" fill="#000000"/>']);
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.clearRect(0, 0, 10, 10);
ok('…a clear of a part: said, never drawn wrong', ctx.svg().left, ['a clear of part of the picture']);

// ── A picture ────────────────────────────────────────────────────────────────
const urls = [];
ctx = svgCanvas(200, 200, { imageUrl: (image, crop) => (urls.push(crop), `data:image/png;base64,${image.name}`) });
const sprite = { name: 'AAAA', width: 40, height: 20 };
ctx.globalAlpha = 0.5;
ctx.setTransform(0, 1, -1, 0, 100, 100);
ctx.drawImage(sprite, -10, -5, 20, 10);
ctx.globalAlpha = 1;
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.drawImage(sprite, 0, 0);
ctx.drawImage(sprite, 0, 0, 20, 20, 150, 150, 10, 10);
out = ctx.svg();
ok('a picture kept once, cut once more, placed each time it is drawn', [out.text.match(/<image /g).length, urls, out.pictures], [2, [null, [0, 0, 20, 20]], 3]);
ok('…placed by its matrix, its opacity on it', lines(out.text),
  ['<use xlink:href="#picture1" transform="matrix(0 0.5 -0.5 0 105 90)" opacity="0.5"/>',
   '<use xlink:href="#picture1" transform="matrix(1 0 0 1 0 0)"/>',
   '<use xlink:href="#picture2" transform="matrix(0.5 0 0 0.5 150 150)"/>']);

// ── State, blends, what it cannot draw ───────────────────────────────────────
ctx = svgCanvas(100, 100);
ctx.save();
ctx.globalAlpha = 0.2;
ctx.globalCompositeOperation = 'multiply';
ctx.translate(50, 50);
disc(ctx, 0, 0, 2);
ctx.restore();
disc(ctx, 0, 0, 2);
ctx.globalCompositeOperation = 'destination-out';
disc(ctx, 10, 10, 2);
out = ctx.svg();
ok('save and restore as canvas\'s; a blend SVG names, written', lines(out.text).slice(0, 2),
  ['<circle cx="50" cy="50" r="2" fill="#000000" fill-opacity="0.2" style="mix-blend-mode:multiply"/>', '<circle cx="0" cy="0" r="2" fill="#000000"/>']);
ok('…one it has no name for, said', out.left, ['the blend destination-out']);
let threw = '';
try { ctx.fillText('a', 0, 0); } catch (err) { threw = err.message; }
ok('text throws, naming what it cannot draw', /fillText\(\)/.test(threw), true);

// ── Off the picture; the paper; the title ────────────────────────────────────
ctx = svgCanvas(100, 100, { mm: paperOf('a3', 1080, 1527, 20), title: 'particles <a burst> & dots' });
disc(ctx, -10, 50, 5);
disc(ctx, 50, 50, 5);
out = ctx.svg();
ok('a dot wholly off the picture is not written, and counted', [out.dots, out.outside], [1, 1]);
ok('A3 and 20 px of bleed round 1080 × 1527: its millimetres', paperOf('a3', 1080, 1527, 20).map(v => +v.toFixed(2)), [308, 431.0]);
ok('…written as the SVG\'s size; a format of pixels has none', [/width="308mm" height="431mm"/.test(out.text), paperOf('square', 1080, 1080)],
  [true, null]);
ok('a title written safe', out.text.includes('<title>particles &lt;a burst&gt; &amp; dots</title>'), true);
ok('colours as SVG 1.1 reads them', ['#AbC', 'rgb(10 20 30 / 50%)', 'transparent', 'teal'].map(paintOf),
  [{ hex: '#aabbcc', alpha: 1 }, { hex: '#0a141e', alpha: 0.5 }, { hex: '#000000', alpha: 0 }, { hex: 'teal', alpha: 1 }]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
