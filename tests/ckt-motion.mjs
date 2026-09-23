/**
 * tests/ckt-motion.mjs — run with: node tests/ckt-motion.mjs
 *
 * ckt's stage two without a canvas: where the attractor is, and where every
 * dot sits because of it.
 *
 * The checks that matter most replay v2 itself. `gravCircle` and `fastSquare`
 * are run here exactly as v2 ran them — a target each frame, the attractor
 * eased a fixed fraction of the way — for thousands of frames, and the closed
 * forms in apps/ckt/attractor.js are held to where that loop settled. If they
 * agree, the paths are v2's and not a lookalike.
 */

const A = await import('../apps/ckt/attractor.js');
const M = await import('../apps/ckt/motion.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};
const near = (label, got, want, slop = 1e-6) => {
  const pass = Math.abs(got - want) <= slop;
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), +got.toFixed(6),
    pass ? '' : '  expected ~' + want);
};

const W = 1920, H = 1080;
const world = { width: W, height: H };
const TAU = Math.PI * 2;

// -- the easing ----------------------------------------------------------------

{
  const e = A.easing(1, 0.3);             // α = 1 jumps to the target: a pure one-frame delay
  near('α = 1 keeps the whole swing', e.gain, 1);
  near('and lags exactly one frame', e.lag, 0.3);
  near('v2 circle keeps 98% of its radius', A.easing(0.1, 0.02).gain, 0.98248, 1e-4);
  near("v2 eight's fast swing is eased down to 8%", A.easing(0.01, 0.125).gain, 0.0802, 1e-3);
}

// -- gravCircle, replayed ------------------------------------------------------

{
  // v2, verbatim in effect: target from rotateVal, move 10% of the way, then
  // rotateVal += 0.02. Run long enough for the start-up transient to die.
  let x = W / 2, y = H / 2, theta = 0, worst = 0;
  for (let n = 0; n < 6000; n++) {
    if (n > 3000) {
      const c = A.PATHS.circle.at(theta / TAU, W, H);
      worst = Math.max(worst, Math.hypot(c.x - x, c.y - y));
    }
    const tx = W / 2.2 + Math.cos(theta) * W / 2.5;
    const ty = H / 2.2 + Math.sin(theta) * H / 1.5;
    x += (tx - x) * 0.1;
    y += (ty - y) * 0.1;
    theta += 0.02;
  }
  near('circle: closed form is where v2 settled (px)', worst, 0, 1e-6);
}

// -- fastSquare, replayed ------------------------------------------------------

{
  let x = W / 2, y = H / 2, corner = 0, count = 0, worst = 0;
  const pts = [[0, 0], [W, 0], [W, H], [0, H]];
  for (let n = 0; n < 520 * 12; n++) {
    if (n >= 520 * 8) {
      const c = A.PATHS.square.at((n % 520) / 520, W, H);
      worst = Math.max(worst, Math.hypot(c.x - x, c.y - y));
    }
    x += (pts[corner][0] - x) * 0.02;
    y += (pts[corner][1] - y) * 0.02;
    if (++count >= 130) { count = 0; corner = (corner + 1) % 4; }
  }
  near('square: closed form is where v2 settled (px)', worst, 0, 1e-6);

  const before = A.PATHS.square.at(0.25 - 1e-9, W, H);
  const after = A.PATHS.square.at(0.25, W, H);
  near('square: no jump where it turns a corner', Math.hypot(before.x - after.x, before.y - after.y), 0, 1e-4);
}

// -- gravEight: the same easing, a loop that closes ----------------------------

{
  // v2's two frequencies never close, so the loop rounds their ratio to 16.
  // The size of what the eye sees is v2's: replay v2 and measure the swing.
  let x = W / 2, y = H / 2, xv = 0, sv = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let n = 0; n < 20000; n++) {
    if (n > 8000) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    x += ((W / 2 + Math.cos(xv) * W * 1.2) - x) * 0.01;
    y += ((H / 2.5 + Math.sin(sv) * 600) - y) * 0.01;
    xv += 5 / 2 * 0.05;
    sv += 0.008;
  }
  let cMinX = Infinity, cMaxX = -Infinity, cMinY = Infinity, cMaxY = -Infinity;
  for (let i = 0; i < 20000; i++) {
    const c = A.PATHS.eight.at(i / 20000, W, H);
    cMinX = Math.min(cMinX, c.x); cMaxX = Math.max(cMaxX, c.x);
    cMinY = Math.min(cMinY, c.y); cMaxY = Math.max(cMaxY, c.y);
  }
  near("eight: v2's side-to-side swing (px)", cMaxX - cMinX, maxX - minX, 2);
  near("eight: v2's up-and-down sweep (px)", cMaxY - cMinY, maxY - minY, 2);

  const a = A.PATHS.eight.at(0, W, H), b = A.PATHS.eight.at(1 - 1e-9, W, H);
  near('eight: the loop closes', Math.hypot(a.x - b.x, a.y - b.y), 0, 1e-3);
}

// -- point, and the clock ------------------------------------------------------

ok('point: where the recipe put it', A.PATHS.point.at(0.3, W, H, { pointX: 0.25, pointY: 0.75 }),
   { x: 480, y: 810 });
ok('phase wraps backwards, for trails', A.phaseOf(-1, 10), 0.9);
ok('and forwards', A.phaseOf(25, 10), 0.5);

// -- the tethers ---------------------------------------------------------------

const glyph = [[100, 100], [140, 100], [100, 160], [140, 160], [120, 130]];
const anchors = M.centre(glyph, world);

ok("centred as v2's boundingBox() centred it",
   [anchors[8], anchors[9]], [W / 2, H / 2]);

const base = { path: 'circle', period: 120, tether: 100, rotate: 'none', size: 1 };

{
  const { dots, attractor } = M.place(anchors, base, 17, world);
  let worstLen = 0, worstDir = 0;
  for (let i = 0; i < glyph.length; i++) {
    const ax = anchors[i * 2], ay = anchors[i * 2 + 1];
    const x = dots[i * M.STRIDE], y = dots[i * M.STRIDE + 1];
    worstLen = Math.max(worstLen, Math.abs(Math.hypot(x - ax, y - ay) - 100));
    // On the ray from the anchor towards the attractor: the cross product is 0
    // and the dot product is positive.
    const cross = (x - ax) * (attractor.y - ay) - (y - ay) * (attractor.x - ax);
    const dot = (x - ax) * (attractor.x - ax) + (y - ay) * (attractor.y - ay);
    worstDir = Math.max(worstDir, dot > 0 ? Math.abs(cross) / Math.hypot(attractor.x - ax, attractor.y - ay) : Infinity);
  }
  near('every dot is one tether from its anchor', worstLen, 0, 1e-9);
  near('leaning straight at the attractor', worstDir, 0, 1e-9);
}

{
  const { dots } = M.place(anchors, { ...base, tether: 0 }, 5, world);
  ok('no tether, no movement', [dots[0], dots[1]], [anchors[0], anchors[1]]);
}

{
  // An attractor dead on an anchor has no direction to pull in.
  const on = { ...base, path: 'point', pointX: anchors[8] / W, pointY: anchors[9] / H };
  const { dots } = M.place(anchors, on, 0, world);
  near('an anchor under the attractor stays put (x)', dots[4 * M.STRIDE], anchors[8], 1e-6);
}

// -- rotation and pulse --------------------------------------------------------

{
  const spin = { ...base, rotate: 'spin', turns: 2 };
  near('spin: nothing at the start', M.place(anchors, spin, 0, world).dots[2], 0);
  near('spin: two turns a loop is half a turn at a quarter',
       M.place(anchors, spin, 30, world).dots[2], Math.PI, 1e-9);
  near('spin turns every sprite together',
       M.place(anchors, spin, 30, world).dots[2 + M.STRIDE], Math.PI, 1e-9);

  const face = { ...base, rotate: 'face' };
  const { dots, attractor } = M.place(anchors, face, 40, world);
  near("face: towards the attractor, plus v2's 0.9π",
       dots[2], Math.atan2(attractor.y - dots[1], attractor.x - dots[0]) + 0.9 * Math.PI, 1e-12);

  near('angle is added to any mode', M.place(anchors, { ...base, angle: 90 }, 3, world).dots[2], Math.PI / 2, 1e-12);
}

{
  const pulse = { ...base, pulse: true, pulses: 1, size: 0.5 };
  near('pulse: full size at the start', M.place(anchors, pulse, 0, world).dots[3], 0.5);
  near('pulse: through zero and inside out halfway', M.place(anchors, pulse, 60, world).dots[3], -0.5);
  near('no pulse: size as set', M.place(anchors, base, 60, world).dots[3], 1);
}

// -- a frame is a function of its index ----------------------------------------

{
  // No state anywhere: frame 400 asked cold is frame 400 walked to. Nothing
  // here would break it today — this is here so nothing added later can.
  const r = { ...base, rotate: 'face', pulse: true, pulses: 3, path: 'eight' };
  const cold = Array.from(M.place(anchors, r, 400, world).dots);
  let buf = null;
  for (let t = 0; t <= 400; t++) buf = M.place(anchors, r, t, world, buf).dots;
  ok('frame 400 cold equals frame 400 walked to', cold, Array.from(buf));

  ok('the loop closes: tick period is tick 0',
     Array.from(M.place(anchors, r, 120, world).dots), Array.from(M.place(anchors, r, 0, world).dots));
}

// -- the box -------------------------------------------------------------------

{
  const r = { ...base, path: 'square' };
  const box = M.loopBounds(anchors, r, world, 5);
  let inside = true;
  for (let t = 0; t < 120; t++) {
    const { dots } = M.place(anchors, r, t, world);
    for (let i = 0; i < glyph.length; i++) {
      const x = dots[i * M.STRIDE], y = dots[i * M.STRIDE + 1];
      if (x - 5 < box.x - 1e-9 || y - 5 < box.y - 1e-9 ||
          x + 5 > box.x + box.w + 1e-9 || y + 5 > box.y + box.h + 1e-9) inside = false;
    }
  }
  ok('every dot, every tick, reach included, is inside the box', inside, true);

  const still = M.loopBounds(anchors, { ...base, path: 'point', pointX: 0.9, pointY: 0.5 }, world, 0);
  const { dots } = M.place(anchors, { ...base, path: 'point', pointX: 0.9, pointY: 0.5 }, 0, world);
  const xs = [], ys = [];
  for (let i = 0; i < glyph.length; i++) { xs.push(dots[i * M.STRIDE]); ys.push(dots[i * M.STRIDE + 1]); }
  near('a still attractor: the box is the frame itself',
       still.w, Math.max(...xs) - Math.min(...xs), 1e-9);
}

{
  // A still carries the tick it shows, and its box is that frame alone — a
  // brush cut mid-sweep is cropped to its own dots, not to the whole sweep.
  const loop = { ...base, path: 'square' };
  const at = { ...loop, tick: 37 };
  const box = M.loopBounds(anchors, at, world, 0);
  const { dots } = M.place(anchors, loop, 37, world);
  const xs = [], ys = [];
  for (let i = 0; i < glyph.length; i++) { xs.push(dots[i * M.STRIDE]); ys.push(dots[i * M.STRIDE + 1]); }
  near('a still: the box is its own frame (x)', box.x, Math.min(...xs), 1e-9);
  near('a still: the box is its own frame (w)', box.w, Math.max(...xs) - Math.min(...xs), 1e-9);
  ok('and it is smaller than the loop\'s', box.w < M.loopBounds(anchors, loop, world, 0).w, true);

  const trailed = M.loopBounds(anchors, { ...at, trail: 20 }, world, 0);
  ok('a trail widens it by the frames drawn under it', trailed.w >= box.w && trailed.h >= box.h, true);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
