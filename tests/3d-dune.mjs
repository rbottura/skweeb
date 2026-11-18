/**
 * tests/3d-dune.mjs — run with: node tests/3d-dune.mjs
 *
 * Covers the worm under the ground (M16c, docs/worm.md): apps/3d/play/
 * dive.js, bend.js, dune.js, and worm.js laid by them, on three.js's core.
 * The promises — a dive's path leaves the ground level, leaps as high as
 * asked, falls steeply into it and levels its drop under, bending and never
 * kinking; a dive begins where the head is, is done when the tail is
 * through, and coming up is the same path the other way. Laid on the
 * planet's curve, a point keeps how far round it was and how high; a worm
 * lies along a small planet, its lowest point on it, from the side or from
 * above. Mid-dive, its head is under and its tail on the ground; buried,
 * all of it is under, its back as deep as asked. The ground over it:
 * nothing while nothing is under; buried, raised as high as asked along
 * its curve, nothing far off; deeper, lower and wider; a hair over the
 * planet's ground, in its material and its shades. Under the ground, no
 * phase takes it in; on it, one does.
 */

const { pathAt, lunge, Dive } = await import('../apps/3d/play/dive.js');
const { bendPoint, bendNormal } = await import('../apps/3d/play/bend.js');
const { Dune, sunkOf, OVER, TURNED } = await import('../apps/3d/play/dune.js');
const { Worm } = await import('../apps/3d/play/worm.js');
const { Planet, patchAt } = await import('../apps/3d/play/planet.js');
const { Phasing } = await import('../apps/3d/play/phasing.js');
const { walkerAt, step, frameOf } = await import('../apps/3d/play/walker.js');
const { heightOver } = await import('../apps/3d/play/follow.js');
const { Scene, Vector3, Matrix4 } = await import('../core/libs/three/three.core.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const R = 24;

/** Every point of a worm's body, its height over a planet of `radius`. */
function heightsOf(worm, radius) {
  const P = worm.mesh.geometry.getAttribute('position'), x = new Vector3(), out = [];
  for (let i = 0; i < P.count; i++) out.push(heightOver(x.fromBufferAttribute(P, i).applyMatrix4(worm.mesh.matrix), radius));
  return out;
}
const lowOf = h => h.reduce((a, b) => Math.min(a, b), Infinity), highOf = h => h.reduce((a, b) => Math.max(a, b), -Infinity);

// ── The dive's path ─────────────────────────────────────────────────────────

{
  const path = { span: 4, leap: 0.8, drop: 2 };
  ok('a dive leaves the ground level', [pathAt(0, path)[0], near(pathAt(1e-6, path)[1], 0, 1e-3)], [0, true]);
  let peak = -Infinity, at = 0, entry = 0;
  for (let i = 1; i <= 4000; i++) {
    const u = (i * 4) / 4000, [y, dy] = pathAt(u, path);
    if (y > peak) { peak = y; at = u; }
    if (!entry && y < 0 && pathAt(u - 0.001, path)[0] >= 0) entry = dy;
  }
  ok('…leaps as high as asked, falling from its peak', near(peak, 0.8, 1e-3) && near(at, 1.2, 0.01), true);
  ok('…goes into the ground steeply', entry < -1, true);
  ok('…and levels its drop under', [pathAt(4, path)[0], near(pathAt(4 - 1e-6, path)[1], 0, 1e-3), pathAt(9, path)[0]], [-2, true, -2]);
  let worst = 0, kink = 0, last = 0;
  for (let i = 1; i <= 4000; i++) {
    const u = (i * 4) / 4000, [, dy] = pathAt(u, path);
    const slope = (pathAt(u + 1e-5, path)[0] - pathAt(u - 1e-5, path)[0]) / 2e-5;
    worst = Math.max(worst, Math.abs(slope - dy));
    kink = Math.max(kink, Math.abs(dy - last));
    last = dy;
  }
  ok('…its slope its height\'s, and nowhere a kink', worst < 1e-3 && kink < 0.02, true);
  ok('a dive carries a body through its path and itself, in its time', lunge(4, 1), 8);
}

// ── A dive played ───────────────────────────────────────────────────────────

{
  const dive = new Dive(), path = { span: 4, leap: 0.8, drop: 2 };
  ok('on the ground, level', dive.heightAt(3, path), [0, 0]);
  ok('a dive begins where its head is', [dive.toggle(10, 2), dive.state, dive.from], [true, 'diving', 12]);
  ok('…behind its head, still on the ground', dive.heightAt(11.9, path)[0], 0);
  ok('…past its path, its drop under', dive.heightAt(16.5, path)[0], -2);
  ok('…not begun again on its way', dive.toggle(11, 2), false);
  ok('…its tail not through yet, diving still', dive.advance(17.9, -2, 4), 'diving');
  ok('…through, buried', dive.advance(18, -2, 4), 'buried');
  ok('buried, all of it under', [dive.heightAt(0, path)[0], dive.heightAt(99, path)[0]], [-2, -2]);
  dive.toggle(30, 2);
  ok('up again from where its head is', [dive.state, dive.from], ['rising', 32]);
  ok('…the same path the other way: its head up first, its tail under', dive.heightAt(35.9, path)[0] > dive.heightAt(32.1, path)[0]
     && dive.heightAt(31, path)[0] === -2, true);
  let leap = -Infinity;
  for (let u = 0; u <= 4; u += 0.001) leap = Math.max(leap, dive.heightAt(32 + u, path)[0]);
  ok('…its leap on the way out', near(leap, 0.8, 1e-3), true);
  ok('…through, on the ground', dive.advance(38, -2, 4), 'surface');
  ok('still, it is laid by the same', [dive.keyAt(5), dive.keyAt(6)], ['surface', 'surface']);
}

// ── The planet's curve ──────────────────────────────────────────────────────

{
  const o = [0, 0, 0];
  ok('where the walker stands, nothing moves', bendPoint(0, 0.5, 0, R, o), [0, 0.5, 0]);
  bendPoint(3, 0, 4, R, o);
  const c = [o[0], o[1] + R, o[2]];
  ok('a point on the tangent, laid on the ground', near(Math.hypot(...c), R, 1e-9), true);
  ok('…as far round as it was along the tangent, the same way', near(R * Math.acos(c[1] / R), 5, 1e-9) && near(o[2] / o[0], 4 / 3, 1e-9), true);
  bendPoint(3, 0.7, 4, R, o);
  ok('…as high over it as it was', near(Math.hypot(o[0], o[1] + R, o[2]), R + 0.7, 1e-9), true);
  ok('on no planet, the tangent itself', bendPoint(3, 0.7, 4, Infinity, o), [3, 0.7, 4]);
  const n = bendNormal(3, 4, R, [0, 1, 0], [0, 0, 0]);
  bendPoint(3, 0, 4, R, o);
  ok('the tangent\'s up, there the planet\'s', near(n[0], o[0] / R, 1e-9) && near(n[1], (o[1] + R) / R, 1e-9) && near(n[2], o[2] / R, 1e-9), true);
  ok('…a direction its length kept', near(Math.hypot(...bendNormal(3, 4, R, [0.6, 0, 0.8], [0, 0, 0])), 1, 1e-9), true);
}

// ── The worm laid ───────────────────────────────────────────────────────────

for (const [radius, seen] of [[24, 'side'], [6, 'side'], [6, 'above']]) {
  const worm = new Worm().shape({ body: {}, seen, wave: 0.5 }), w = walkerAt(radius);
  step(w, { move: 1 }, 1, { radius, speed: 2.5, turnRate: 0 });
  worm.pose(w.walked, { radius });
  worm.place(frameOf(w), w.p);
  ok(`on a planet of ${radius}, seen from ${seen === 'side' ? 'the side' : 'above'}: its lowest point on the ground`,
     near(lowOf(heightsOf(worm, radius)), 0, 1e-4), true);
}

{
  const worm = new Worm().shape({ body: {}, wave: 0.5 }), w = walkerAt(R), dive = new Dive(), long = worm.front - worm.back;
  const rings = () => [...worm.spine].sort((a, b) => a[0] - b[0]);
  ok('its spine: each ring\'s middle and girth', worm.pose(0, { radius: R }) && worm.spine.length === 40 && worm.spine.every(r => r[3] > 0.05), true);
  dive.toggle(0, worm.front);
  step(w, { move: 1 }, 1, { radius: R, speed: 0.9 * long, turnRate: 0 });
  worm.pose(w.walked, { radius: R, dive, leap: 0.8, depth: 0.1 });
  const mid = rings();
  ok('mid-dive: its head under the ground, its tail on it', mid.at(-1)[1] < 0 && mid[0][1] > 0, true);
  step(w, { move: 1 }, 1, { radius: R, speed: 1.1 * long + 0.01, turnRate: 0 });
  ok('through, buried', dive.advance(w.walked, worm.back, long), 'buried');
  worm.pose(w.walked, { radius: R, dive, leap: 0.8, depth: 0.1 });
  worm.place(frameOf(w), w.p);
  ok('…all of it under, its back as deep as asked — its wave its own', near(highOf(heightsOf(worm, R)), -0.1, 0.04), true);
  ok('…laid again only as it moves', worm.pose(w.walked, { radius: R, dive, leap: 0.8, depth: 0.1 }), false);
  worm.pose(0, { radius: R, dive, leap: 0.8, depth: 0.1 });
  ok('…every ring\'s back as deep: an arched body swims level', worm.spine.every(r => near(r[4], -0.1, 1e-4)), true);
}

// ── The ground over it ──────────────────────────────────────────────────────

{
  const planet = new Planet().build({ radius: R, things: 0, seed: 1, ground: '#7fae6b', sky: '#cfe3f1' });
  const worm = new Worm().shape({ body: {}, wave: 0.5 }), w = walkerAt(R), dive = new Dive(), dune = new Dune(), frame = frameOf(w);
  const lay = depth => { worm.pose(0, { radius: R, dive, depth }); return dune.lay(worm.spine, frame, w.p, planet, { ridge: 0.35, spread: 0.45 }); };
  lay(0.1);
  ok('a ring resting on the ground is not under it, one its height down is', [sunkOf(0.6, 0), sunkOf(-0.1, -0.7), sunkOf(0.3, -0.3)], [0, 1, 0.5]);
  ok('on the ground, the ground is not raised', [dune.mesh.visible, dune.height, dune.sunk < 1e-4], [false, 0, true]);
  dive.state = 'buried';
  lay(0.1);
  ok('buried: all of it under, the ground raised', [dune.mesh.visible, near(dune.sunk, 1)], [true, true]);
  ok('…as high as asked, less the sand over its back', dune.height > 0.25 && dune.height <= 0.35, true);
  ok('…in the ground\'s own material: its colour the reality\'s', dune.mesh.material === planet.ground.material, true);
  // Along its curve: across it, the ground highest where its rings are — the shallow ones, at their two ways out.
  const shallow = worm.spine.filter(r => r[4] > -0.6).sort((a, b) => a[2] - b[2]);
  const crest = f => { let best = 0, at = 0; for (let r = -3; r <= 3; r += 0.01) { const h = dune.heightAt(f, r); if (h > best) { best = h; at = r; } } return at; };
  const [left, right] = [shallow[0], shallow.at(-1)];
  ok('…along its curve: its crest where its rings are', Math.abs(crest(left[0]) - left[2]) < 0.15 && Math.abs(crest(right[0]) - right[2]) < 0.15
     && right[2] - left[2] > 0.3, true);
  const [f0, f1, r0, r1] = dune.covers;
  ok('…and nothing far off', Math.max(dune.heightAt(f0, r0), dune.heightAt(f1, r1), dune.heightAt(f0, r1)) < 1e-3, true);
  const P = dune.mesh.geometry.getAttribute('position'), C = dune.mesh.geometry.getAttribute('color'), x = new Vector3();
  const m = new Matrix4().makeBasis(frame.forward, frame.up, frame.right).setPosition(w.p);
  let low = Infinity;
  for (let i = 0; i < P.count; i++) low = Math.min(low, heightOver(x.fromBufferAttribute(P, i).applyMatrix4(m), R));
  ok('…a hair over the planet\'s ground, its edges too', near(low, OVER, 1e-4), true);
  x.fromBufferAttribute(P, 0).applyMatrix4(m).normalize();
  ok('…in its shades', near(C.getX(0), 0.8 + 0.35 * patchAt(planet.waves, x), 1e-5), true);
  let top = 0;
  for (let i = 1; i < dune.heights.length; i++) if (dune.heights[i] > dune.heights[top]) top = i;
  x.fromBufferAttribute(P, top).applyMatrix4(m).normalize();
  ok('…darker along its crest: the earth turned', near(C.getX(top), (0.8 + 0.35 * patchAt(planet.waves, x)) * (1 - TURNED), 1e-5), true);
  const before = { top: dune.height, ratio: dune.heightAt(right[0], right[2] + 0.8) / dune.height };
  lay(1);
  ok('deeper, lower', dune.height < before.top, true);
  ok('…and wider', dune.heightAt(right[0], right[2] + 0.8) / dune.height > before.ratio, true);
  dive.state = 'surface';
  lay(0.1);
  ok('up again, the ground let down', [dune.mesh.visible, dune.height], [false, 0]);
  dune.dispose();
  planet.dispose();
}

// ── Under the ground, no phase ──────────────────────────────────────────────

{
  const phasing = new Phasing(new Scene());
  const wa = walkerAt(R), wb = walkerAt(R);
  step(wb, { move: 1 }, 1, { radius: R, speed: 3, turnRate: 0 });
  phasing.add(new Worm().shape({ body: {} }), wa, { ground: '#7fae6b', sky: '#cfe3f1' });
  phasing.add(new Worm().shape({ body: {} }), wb, { ground: '#5d4f86', sky: '#1f1b3a' });
  const dive = phasing.walked.dive;
  dive.state = 'buried';
  ok('under the ground in its radius, no phase takes it in', phasing.within(4), -1);
  dive.state = 'rising';
  ok('…nor on its way up', phasing.within(4), -1);
  dive.state = 'surface';
  ok('…on the ground, one does', phasing.within(4), 1);
  phasing.dispose();
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
