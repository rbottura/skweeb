/**
 * tests/windowed.mjs — run with: node tests/windowed.mjs
 *
 * Covers core/windowed.js, against a context that writes down what it is
 * told. The promises — the window's corner moves the transform it starts
 * with, every transform it is given by six numbers or by a matrix, a reset
 * of either kind, and a pixel put or read; a transform read back is the
 * app's own, the corner taken off again; its canvas says the whole
 * picture's size; everything else — a fill, a style set and read — goes
 * straight through, the same function each time it is asked for.
 */

const { windowed } = await import('../core/windowed.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

/** A context that writes down what it is told, and keeps a transform as a real one does. */
function scribe() {
  const log = [];
  const t = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  return {
    log,
    canvas: { width: 300, height: 200 },
    fillStyle: '#000',
    setTransform(a, b, c, d, e, f) { Object.assign(t, { a, b, c, d, e, f }); log.push(['setTransform', a, b, c, d, e, f]); },
    getTransform() { return { ...t }; },
    reset() { Object.assign(t, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }); log.push(['reset']); },
    putImageData(data, dx, dy) { log.push(['putImageData', dx, dy]); },
    getImageData(sx, sy, sw, sh) { log.push(['getImageData', sx, sy, sw, sh]); return null; },
    fillRect(x, y, w, h) { log.push(['fillRect', x, y, w, h]); },
  };
}

const real = scribe();
const ctx = windowed(real, { x: 1000, y: 400, width: 14173, height: 20787 });
ok('it starts at the window\'s corner', real.log.at(-1), ['setTransform', 1, 0, 0, 1, -1000, -400]);
ctx.setTransform(2, 0, 0, 2, 50, 60);
ok('a transform by six numbers, moved by the corner', real.log.at(-1), ['setTransform', 2, 0, 0, 2, -950, -340]);
ctx.setTransform({ a: 1, b: 0, c: 0, d: 1, e: 7, f: 9 });
ok('…and by a matrix', real.log.at(-1), ['setTransform', 1, 0, 0, 1, -993, -391]);
ctx.setTransform(1, 0, 0, 1, 0, 0);
ok('the identity an app starts a frame with is the corner', real.log.at(-1), ['setTransform', 1, 0, 0, 1, -1000, -400]);
ctx.setTransform(3, 0, 0, 3, 5, 5);
ctx.resetTransform();
ok('resetTransform: the corner again', real.log.at(-1), ['setTransform', 1, 0, 0, 1, -1000, -400]);
ctx.reset();
ok('reset: the context reset, then the corner', real.log.slice(-2), [['reset'], ['setTransform', 1, 0, 0, 1, -1000, -400]]);
ctx.setTransform(2, 0, 0, 2, 50, 60);
ok('a transform read back is the app\'s own', [ctx.getTransform().e, ctx.getTransform().f], [50, 60]);
ctx.putImageData(null, 1200, 500);
ok('a pixel put lands moved', real.log.at(-1), ['putImageData', 200, 100]);
ctx.getImageData(1010, 410, 4, 4);
ok('…and read from where it lies', real.log.at(-1), ['getImageData', 10, 10, 4, 4]);
ok('its canvas says the whole picture\'s size', [ctx.canvas.width, ctx.canvas.height, ctx.canvas.real === real.canvas], [14173, 20787, true]);
ctx.fillStyle = '#ffd60a';
ctx.fillRect(0, 0, 14173, 20787);
ok('a style set goes through, and reads back', [real.fillStyle, ctx.fillStyle], ['#ffd60a', '#ffd60a']);
ok('a fill goes through as it was asked', real.log.at(-1), ['fillRect', 0, 0, 14173, 20787]);
ok('the same function each time it is asked for', ctx.fillRect === ctx.fillRect, true);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
