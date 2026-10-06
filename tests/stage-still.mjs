/**
 * tests/stage-still.mjs — run with: node tests/stage-still.mjs
 *
 * Covers core/stage/still.js without a canvas: a gamepad still's marks as
 * stamps in its picture's pixels, and how they are drawn, against a context
 * that writes down what it is told. The promises — a stamp lands where its
 * mark's canvas pixel lands in the picture, its frame read out of the canvas
 * and set where the picture has it, scaled with it; a pattern's copies follow
 * their mark, in the order they were drawn; the clip is the part of the
 * picture the canvas covers, where a frame reaches past it; a ground of none
 * is no ground; and a drawing fills its ground, clips, and stamps each
 * sprite it has at its place, moved, turned, scaled and centred, at the view.
 */

const { stampsOf, drawStill, spritesOf, hasMarks, spriteKey } = await import('../core/stage/still.js');
const { stampPoints } = await import('../core/stamp.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const round = v => Math.round(v * 1000) / 1000;
const mark = (x, y, extra = {}) => ({ x, y, rotation: 0.5, scale: 0.4, familyId: 'brushes', spriteIndex: 3, pattern: 'single', ...extra });

// ── Where a stamp lands ─────────────────────────────────────────────────────

const framed = { canvas: { w: 400, h: 300, background: 'none' },
  frame: { from: { x: 100, y: 50, w: 200, h: 150 }, to: { x: 10, y: 5, w: 200, h: 150 }, w: 220, h: 160 },
  marks: [mark(150, 100), mark(120, 80, { pattern: 'mirror-x', spriteIndex: 4 })] };
const s = stampsOf(framed);
ok('the picture is the frame\'s size', [s.width, s.height], [220, 160]);
ok('a stamp lands where its canvas pixel lands in the picture', [s.stamps[0].x, s.stamps[0].y], [60, 55]);
ok('its turn and its scale its mark\'s', [s.stamps[0].rotation, s.stamps[0].scale, s.stamps[0].flipX], [0.5, 0.4, 1]);
const copies = stampPoints(120, 80, 0.5, 'mirror-x', 400, 300).map(([x, y, r, f]) => [x - 100 + 10, y - 50 + 5, r, f]);
ok('a mirrored mark: its copies after it, as stamp.js expands them', s.stamps.slice(1).map(t => [t.x, t.y, t.rotation, t.flipX]), copies);
ok('each knows its mark and which copy it is', s.stamps.map(t => [t.mark, t.copy]), [[0, 0], [1, 0], [1, 1]]);
ok('and the sprite it is drawn with', s.stamps.map(t => t.key), ['brushes#3', 'brushes#4', 'brushes#4']);
ok('a ground of none is no ground', s.ground, null);
ok('the frame inside the canvas: all of it shows', s.clip, { x: 10, y: 5, w: 200, h: 150 });

const scaled = stampsOf({ ...framed, frame: { ...framed.frame, to: { x: 0, y: 0, w: 400, h: 300 }, w: 400, h: 300 } });
ok('a frame drawn bigger: the stamps placed and scaled with it', [scaled.stamps[0].x, scaled.stamps[0].y, round(scaled.stamps[0].scale)], [100, 100, 0.8]);

const past = stampsOf({ ...framed, canvas: { w: 400, h: 300, background: '#ffffff' },
  frame: { from: { x: -20, y: 250, w: 100, h: 100 }, to: { x: 4, y: 4, w: 100, h: 100 }, w: 108, h: 108 } });
ok('a frame past the canvas\'s edge: only the canvas\'s part shows', past.clip, { x: 24, y: 4, w: 80, h: 50 });
ok('its ground, the canvas\'s', past.ground, '#ffffff');

const whole = stampsOf({ canvas: { w: 300, h: 200, background: 'none' }, marks: [mark(30, 40)] });
ok('no frame: the whole canvas, as it was drawn', [whole.width, whole.height, whole.stamps[0].x, whole.stamps[0].y], [300, 200, 30, 40]);

// ── What it draws with ──────────────────────────────────────────────────────

ok('every sprite once, by key', [...spritesOf(framed).entries()], [['brushes#3', ['brushes', 3]], ['brushes#4', ['brushes', 4]]]);
ok('marks, or none to draw again', [hasMarks(framed), hasMarks({ marks: [] }), hasMarks(null)], [true, false, false]);
ok('a key is a family and a sprite', spriteKey('fleurs', 7), 'fleurs#7');

// ── How it draws ────────────────────────────────────────────────────────────

const log = [];
const ctx = {
  canvas: { width: 440, height: 320 },
  set fillStyle(v) { log.push(['fillStyle', v]); },
  set imageSmoothingEnabled(v) { log.push(['smoothing', v]); },
  set imageSmoothingQuality(v) { log.push(['quality', v]); },
  setTransform(...m) { log.push(['setTransform', ...m]); },
  clearRect(...r) { log.push(['clearRect', ...r]); },
  fillRect(...r) { log.push(['fillRect', ...r]); },
  save() { log.push(['save']); },
  restore() { log.push(['restore']); },
  beginPath() {},
  rect(...r) { log.push(['rect', ...r]); },
  clip() { log.push(['clip']); },
  translate(...p) { log.push(['translate', ...p.map(round)]); },
  rotate(r) { log.push(['rotate', r]); },
  scale(...k) { log.push(['scale', ...k.map(round)]); },
  drawImage(image, x, y) { log.push(['drawImage', image.name, x, y]); },
};
const images = new Map([['brushes#3', { name: 'three', width: 40, height: 20 }]]);
drawStill(ctx, { ...past, stamps: s.stamps }, images, 2);
const at = name => log.findIndex(e => e[0] === name);
ok('cleared, then its ground over all of it', [log[1], log[3]], [['clearRect', 0, 0, 440, 320], ['fillRect', 0, 0, 440, 320]]);
ok('then the clip, at the view', log.find(e => e[0] === 'rect'), ['rect', 48, 8, 160, 100]);
ok('a sprite at its own size is resampled as the gamepad\'s canvas did; past it, high', log.filter(e => e[0] === 'quality'), [['quality', 'high']]);
ok('a stamp: at the view, moved, turned, scaled, centred', log.slice(at('drawImage') - 4, at('drawImage') + 1),
  [['setTransform', 2, 0, 0, 2, 0, 0], ['translate', 60, 55], ['rotate', 0.5], ['scale', 0.4, 0.4], ['drawImage', 'three', -20, -10]]);
ok('a sprite it has not got is left out', log.filter(e => e[0] === 'drawImage').length, 1);
ok('and the clip let go of after', log.slice(-2), [['restore'], ['setTransform', 1, 0, 0, 1, 0, 0]]);
log.length = 0;
drawStill(ctx, { ...past, stamps: s.stamps }, images, 1);
ok('at its own size, the browser\'s own resampling', log.filter(e => e[0] === 'quality').length, 0);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
