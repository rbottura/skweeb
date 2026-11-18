/**
 * tests/3d-heart.mjs — run with: node tests/3d-heart.mjs
 *
 * Covers the planet's heart and its ways in (docs/worm.md, the heart):
 * apps/3d/play/access.js, section.js, heart.js, places.js, and walker.js
 * inside a sphere, on three.js's core. The promises — six ways in, two by
 * two opposite, each square to the other four, the start far from all;
 * three cuts, each square to an axis and through four ways at its screen's
 * four sides, the north up where it is in one; a way gone into heading
 * along a cut, that cut. A cut holds a body in its tunnels and its heart.
 * Inside a sphere, a walker's up is its middle and it stays on its wall. In
 * a cut, the worm goes as the hands say, held in its tunnel, its back up as
 * it faces; down into the heart, it floats under that way's mouth, off the
 * wall, between it and the matrix (orbit.js, M16o), the camera out behind
 * it looking at the matrix, the worm low in the field; moved round, at its
 * distance, no pole stopping it, its head where it goes, its back up as it
 * faces; aimed, its gaze where the camera looked, turned by the pointer;
 * on a mouth, that mouth found and lit; a click, back in a cut at its
 * heart end; up it, out on the ground beside that way's hole, facing away,
 * its wave as it was shaped. The matrix in the heart: one of each thing the ground
 * grows floating in it, drifting slowly, never out of it; none where the
 * ground grows nothing.
 */

const { AXES, WAYS, PLANES, wayAt, planeFor, onCut, wayOn, holdIn, tunnelAt } = await import('../apps/3d/play/access.js');
const { Section } = await import('../apps/3d/play/section.js');
const { Heart } = await import('../apps/3d/play/heart.js');
const { heartOf, floatsAt, enterCut, tickCut, tickHeart, visit } = await import('../apps/3d/play/places.js');
const { Orbit, meet, LOOK } = await import('../apps/3d/play/orbit.js');
const { Planet, KINDS } = await import('../apps/3d/play/planet.js');
const { Matrix } = await import('../apps/3d/play/matrix.js');
const { Phasing } = await import('../apps/3d/play/phasing.js');
const { Worm, waveWayOf } = await import('../apps/3d/play/worm.js');
const { walkerAt, step, frameOf } = await import('../apps/3d/play/walker.js');
const { playParams } = await import('../apps/3d/play/params.js');
const { Scene, Vector3, PerspectiveCamera, Color } = await import('../core/libs/three/three.core.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const deg = (a, b) => (a.angleTo(b) * 180) / Math.PI;
const R = 24;

// ── The ways in ─────────────────────────────────────────────────────────────

{
  ok('six ways in, two by two opposite', [WAYS.length, [0, 2, 3].every(i => near(WAYS[i].dir.dot(WAYS[i + (i ? 2 : 1)].dir), -1))], [6, true]);
  ok('…each square to the other four', WAYS.every(a => WAYS.filter(b => near(Math.abs(a.dir.dot(b.dir)), 0, 1e-9)).length === 4), true);
  ok('…two the poles, four round the equator, a right angle apart', [WAYS[0].name, WAYS[1].name, WAYS.slice(2).map(w => Math.round(deg(w.dir, WAYS[0].dir)))],
     ['north', 'south', [90, 90, 90, 90]]);
  const start = walkerAt(R).p.clone().normalize();
  ok('the start far from all: as far as it can be from three', Math.round(Math.min(...WAYS.map(w => deg(w.dir, start))) * 10) / 10, 54.7);
  ok('three cuts, each square to its axis, seen the right way round', PLANES.every(c => near(c.x.dot(AXES[c.across]), 0, 1e-9)
     && near(c.y.dot(AXES[c.across]), 0, 1e-9) && near(c.x.clone().cross(c.y).dot(AXES[c.across]), 1, 1e-9)), true);
  const sides = c => WAYS.map((w, i) => i).filter(i => near(WAYS[i].dir.dot(AXES[c.across]), 0, 1e-9)).map(i => onCut(c, i).join()).sort();
  ok('…each through four ways, at its screen\'s four sides', PLANES.every(c => JSON.stringify(sides(c)) === JSON.stringify(['-1,0', '0,-1', '0,1', '1,0'])), true);
  ok('…the north up in the two through the poles', PLANES.filter(c => c.across).map(c => onCut(c, 0).join()), ['0,1', '0,1']);
  ok('…each way in two, and found again from its side', WAYS.every((w, i) => PLANES.filter(c => near(w.dir.dot(AXES[c.across]), 0, 1e-9)).length === 2
     && PLANES.every(c => !near(w.dir.dot(AXES[c.across]), 0, 1e-9) || wayOn(c, onCut(c, i)) === i)), true);
  ok('a way gone into heading along a cut: that cut', [planeFor(0, AXES[1]).across, planeFor(0, AXES[2]).across, planeFor(2, AXES[0]).across], [2, 1, 2]);
  const at = WAYS[2].dir.clone().multiplyScalar(R);
  ok('in a way\'s hole, that way; past its mouth, none', [wayAt(at, R, 1.6), wayAt(at.clone().applyAxisAngle(AXES[0], 2 / R), R, 1.6)], [2, -1]);
  const cut = { radius: R, heart: 9, play: 0.4 };
  ok('a cut holds a body in its tunnels and its heart', [holdIn(0.3, 15, cut), holdIn(-14, -0.2, cut), holdIn(3, 3, cut)], [[0.3, 15], [-14, -0.2], [3, 3]]);
  ok('…across a tunnel, at its play; past the ground, at it', [holdIn(1.5, 15, cut), holdIn(0, 30, cut)], [[0.4, 15], [0, 24]]);
  ok('…the tunnel it is in, toward its way', [tunnelAt(0.1, 15, cut), tunnelAt(-15, 0.2, cut), tunnelAt(2, 2, cut)], [[0, 1], [-1, 0], null]);
}

// ── Inside a sphere ─────────────────────────────────────────────────────────

{
  const w = { p: new Vector3(0, -9, 0), f: new Vector3(0, 0, -1), walked: 0, inside: true }, frame = frameOf(w);
  ok('inside a sphere, its up its middle', frame.up.toArray().map(x => Math.round(x)), [0, 1, 0]);
  step(w, { move: 1 }, 1, { radius: 9, speed: 2, turnRate: 1 });
  ok('…a step along its wall, on it, ahead', [near(w.p.length(), 9), w.p.z < 0, near(w.walked, 2)], [true, true, true]);
  step(w, { turn: 1 }, 0.5, { radius: 9, speed: 0, turnRate: 1 });
  ok('…turned right, to its right', w.f.dot(frame.right) > 0, true);
}

// ── A cut, and the heart ────────────────────────────────────────────────────

const worm = new Worm().shape({ body: {}, wave: 0.5 });
{
  const cut = new Section().build({ radius: R, heart: 9, width: 3.2 }, { ground: '#7fae6b', sky: '#cfe3f1' });
  ok('a cut: its earth, its strata, its ground, its tunnels, its heart, the matrix in it', cut.parts.length, 11);
  cut.enter(PLANES[2], [0, 1], { radius: R, heart: 9, long: 4 });
  ok('gone into from the ground: at the top of its tunnel, its head down', [cut.q[0], near(cut.q[1], R - 2.2), near(cut.heading, -Math.PI / 2)], [0, true, true]);
  const limits = { speed: 6, turnRate: 6, radius: R, heart: 9, play: 0.35 };
  const y0 = cut.q[1];
  cut.step({ y: -1 }, 0.5, limits);
  cut.step({ x: 1 }, 0.5, limits);
  ok('…down as the hands say, held in its tunnel', [near(cut.q[1], y0 - 3), near(cut.q[0], 0.35)], [true, true]);
  for (let i = 0; i < 40 && !cut.leaving({ ...limits, long: 4 }); i++) cut.step({ y: -1 }, 0.1, limits);
  ok('…down into the heart, by the way it came', cut.leaving({ ...limits, long: 4 }), { to: 'heart', at: [0, 1] });
  cut.enter(PLANES[2], [1, 0], { fromHeart: true, radius: R, heart: 9, long: 4 });
  ok('from the heart: at its tunnel\'s bottom, its head out, facing it', [near(cut.q[0], 11.3), near(cut.heading, 0), cut.face], [true, true, 1]);
  for (let i = 0; i < 80 && !cut.leaving({ ...limits, long: 4 }); i++) cut.step({ x: 1 }, 0.1, limits);
  ok('…along it to the ground, out by its way', cut.leaving({ ...limits, long: 4 }), { to: 'ground', at: [1, 0] });
  cut.step({ x: -1 }, 1, limits);
  cut.draw(worm);
  const m = cut.body.matrix.elements, X = new Vector3(m[0], m[1], m[2]), Y = new Vector3(m[4], m[5], m[6]), o = new Vector3(m[12], m[13], m[14]);
  const middle = o.clone().addScaledVector(X, cut.middle[0] / 1).addScaledVector(Y, cut.middle[1]);
  ok('turned back: its head along its way, its back still up', [cut.face, X.x * worm.toward < 0, Y.y > 0], [-1, true, true]);
  ok('…drawn flat where it is, its drawing\'s middle there', near(middle.x, cut.q[0], 1e-6) && near(middle.y, cut.q[1], 1e-6) && near(middle.z, 0, 1e-9), true);
  const heart = new Heart().build({ heart: 9, width: 3.2 }, { ground: '#7fae6b' });
  const mouths = heart.parts.filter(p => p.geometry.type === 'CircleGeometry');
  ok('the heart: a wall 9 round, a mouth at each way, facing its middle', [heart.wall.geometry.parameters.radius, mouths.length,
    mouths.every((h, i) => deg(h.position, WAYS[i].dir) < 1e-4 && new Vector3(0, 0, 1).applyQuaternion(h.quaternion).dot(WAYS[i].dir) < -0.999)], [9, 6, true]);
  cut.dispose();
  heart.dispose();
}

// ── Weightless ──────────────────────────────────────────────────────────────

{
  const round = v => v.toArray().map(x => Math.round(x) || 0);
  const o = new Orbit().set(new Vector3(0, 0, 1), new Vector3(0, 1, 0), 0), f = o.frame();
  ok('floating: the screen\'s right square to its up and to the eye', round(o.right), [1, 0, 0]);
  ok('…seen from its side: ahead to the right, its back up, its right the eye\'s way', [f.forward, f.up, f.right].map(round),
     [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  o.swim({ x: 1 }, 1, { radius: 5, speed: (5 * Math.PI) / 2, turnRate: 10 });
  ok('swum right a quarter round: there, the screen\'s up kept', [round(o.dir), round(o.up)], [[1, 0, 0], [0, 1, 0]]);
  for (let i = 0; i < 100; i++) o.swim({ y: 1 }, 0.1, { radius: 5, speed: 5, turnRate: 10 });
  ok('…up and over, three times round: no pole stops it, its up square to where it is', [near(o.dir.length(), 1),
    near(o.up.dot(o.dir), 0, 1e-9), near(o.up.length(), 1), o.frame().forward.dot(o.up) > 0.999], [true, true, true, true]);
  o.swim({ x: -1 }, 1, { radius: 5, speed: 1, turnRate: 10 });
  ok('…turned back left: its back still up', [o.face, o.frame().up.dot(o.up) > 0.999], [-1, true]);
  o.aim(o.dir.clone().negate(), o.up).turn(Math.PI / 2, 0);
  ok('aimed: its gaze turned to the right of where it looked', o.gaze.f.dot(o.dir.clone().negate().cross(o.up)) > 0.999, true);
  o.turn(0, 3);
  ok('…up, never past short of straight', near(o.gaze.pitch, (85 * Math.PI) / 180, 1e-9), true);
  const m = meet(new Vector3(1, 0, 0), new Vector3(0, 1, 0), 2);
  ok('a gaze meets the wall of the heart', [near(m.length(), 2), near(m.x, 1)], [true, true]);
}

// ── The ways between ────────────────────────────────────────────────────────

{
  const params = playParams(), v = params.values;
  const planet = new Planet().build(v), phasing = new Phasing(planet.scene);
  const s = { params, planet, phasing, section: new Section(), heart: new Heart(), orbit: new Orbit(), place: 'ground', aspect: 1.6,
              camera: new PerspectiveCamera(75, 1.6, 0.05, 2000), snap: true, aimed: -1 };
  phasing.add(worm, walkerAt(v.radius), { ground: v.ground, sky: v.sky });
  const me = phasing.walked, h = heartOf(v), long = worm.front - worm.back;
  ok('six holes in the ground, a rim round each', planet.holes.length, 12);
  visit(s, 0, { away: 4 });
  ok('set down by the north, facing it', [s.place, near(R * deg(me.walker.p, WAYS[0].dir) * Math.PI / 180, 4, 1e-6),
    me.walker.f.dot(WAYS[0].dir) > 0], ['ground', true, true]);
  enterCut(s, 0);
  ok('walked into it: in a cut through it, at its top, the wave in the drawing\'s plane', [s.place, onCut(s.section.plane, 0),
    worm.v.waveWay], ['cut', [0, 1], 'side']);
  for (let i = 0; i < 400 && s.place === 'cut'; i++) tickCut(s, 0.05, { move: -1, turn: 0 });
  const afloat = floatsAt(v), held = h.matrix * h.heart;
  ok('down its tunnel into the heart: floating under the north\'s mouth, off its wall, between it and the matrix', [s.place,
    near(me.walker.p.length(), afloat, 1e-6), deg(me.walker.p, WAYS[0].dir) < 1e-4, afloat > held && afloat < h.heart,
    worm.mesh.parent === s.heart.scene], ['heart', true, true, true, true]);
  tickHeart(s, 0.05, {});
  const eye = s.camera.position.clone(), ndc = me.walker.p.clone().project(s.camera);
  ok('…the camera out behind it, in the heart, looking at the matrix', [eye.length() > afloat, eye.length() < h.heart,
    deg(s.camera.getWorldDirection(new Vector3()), eye.clone().negate()) < 1e-3], [true, true, true]);
  ok('…the worm low in its field, the matrix in the middle of it', [ndc.y < -0.05 && ndc.y > -0.8, Math.abs(ndc.x) < 1e-6], [true, true]);
  const was = s.orbit.dir.clone(), walked = me.walker.walked;
  for (let i = 0; i < 40; i++) tickHeart(s, 0.05, { turn: 1 });
  ok('D held: round the matrix, to the right on the screen, at its distance, facing that way, waving', [deg(s.orbit.dir, was) > 10,
    near(me.walker.p.length(), afloat, 1e-6), me.walker.f.dot(s.orbit.right) > 0.9, me.walker.walked > walked + 1], [true, true, true, true]);
  for (let i = 0; i < 200; i++) tickHeart(s, 0.05, { move: 1 });
  ok('Z held: up and over, no pole stopping it, at its distance', [near(me.walker.p.length(), afloat, 1e-6),
    near(s.orbit.up.dot(s.orbit.dir), 0, 1e-9), s.place], [true, true, 'heart']);
  /** Aimed, and the gaze turned to the mouth the least turn away that is not straight up or down: its way. */
  const aimAtOne = () => {
    const ahead = s.camera.getWorldDirection(new Vector3());
    tickHeart(s, 0.05, { aim: true });
    const g = s.orbit.gaze, right = g.forward.clone().cross(g.up), from = ahead.angleTo(g.forward);
    const pick = WAYS.map((w, i) => {
      const t = w.dir.clone().multiplyScalar(h.heart).sub(me.walker.p).normalize();
      return { i, yaw: Math.atan2(t.dot(right), t.dot(g.forward)), pitch: Math.asin(t.dot(g.up)) };
    }).filter(c => Math.abs(c.pitch) < 1.3).sort((a, b) => Math.abs(a.yaw) - Math.abs(b.yaw))[0];
    tickHeart(s, 0.05, { aim: true, look: [pick.yaw / LOOK, -pick.pitch / LOOK] });
    return { way: pick.i, from };
  };
  let aimed = aimAtOne();
  ok('aimed: its gaze where the camera looked; the pointer moved onto a mouth, its way found, its rim lit',
     [aimed.from < 1e-3, s.aimed, s.heart.lit], [true, aimed.way, aimed.way]);
  tickHeart(s, 0.05, {});
  ok('…let go of: floating free again, no mouth found', [s.orbit.gaze, s.aimed, s.heart.lit], [null, -1, -1]);
  aimed = aimAtOne();
  tickHeart(s, 0.05, { aim: true, go: true });
  const at = onCut(s.section.plane, aimed.way);
  ok('aimed again, a click: in that way\'s cut, at its tunnel\'s bottom, its head out', [s.place, near(Math.hypot(...s.section.q), h.heart + 0.5 * long + 0.3, 1e-6),
    near(s.section.heading, Math.atan2(at[1], at[0]), 1e-9)], ['cut', true, true]);
  for (let i = 0; i < 400 && s.place === 'cut'; i++) tickCut(s, 0.05, { turn: at[0], move: at[1] });
  const off = me.walker.p.clone().normalize().sub(WAYS[aimed.way].dir);
  ok('…up it to the ground, beside its hole, facing away', [s.place, me.walker.inside, near(me.walker.p.length(), R),
    Math.round(R * deg(me.walker.p, WAYS[aimed.way].dir) * Math.PI / 180 * 100) / 100, me.walker.f.dot(off) > 0],
     ['ground', false, true, Math.round((h.width / 2 + 0.6 * long) * 100) / 100, true]);
  ok('…its body on the planet, its wave as it was shaped', [worm.mesh.parent === planet.scene, worm.v.waveWay === waveWayOf(worm.seen, worm.sway)], [true, true]);
  visit(s, 3, { heart: true, away: 3 });
  ok('set floating for a check: that far round from under its mouth', [s.place, near(afloat * deg(me.walker.p, WAYS[3].dir) * Math.PI / 180, 3, 1e-6)],
     ['heart', true]);
  phasing.dispose();
  planet.dispose();
}

// ── The matrix ──────────────────────────────────────────────────────────────

{
  const m = new Matrix().build({ radius: 3, colour: '#ffb347' }, KINDS, { ground: '#7fae6b' });
  ok('the matrix: a ball 3 round, one of each thing the ground grows in it', [m.ball.geometry.parameters.radius, m.items.length], [3, 2]);
  ok('…a tuft in the reality\'s ground, a stone in its own grey', [m.items[0].mesh.material.color.getHexString(),
    m.items[1].mesh.material.color.getHexString()], [new Color('#7fae6b').multiplyScalar(0.62).getHexString(), '9a9488']);
  const was = m.items.map(it => it.mesh.position.clone());
  m.update(1.5);
  const moved = m.items.map((it, i) => it.mesh.position.distanceTo(was[i]));
  ok('…drifting, slowly, never out of it', moved.every(d => d > 0.01 && d < 0.5) && m.items.every(it => it.mesh.position.length() < 0.6 * 3), true);
  ok('a ground growing nothing: nothing in it', [new Planet().build({ ...playParams().values, things: 0 }).present.length,
    new Matrix().build({ radius: 3 }, []).items.length], [0, 0]);
  const heart = new Heart().build({ heart: 9, width: 3.2, matrix: 0.3 }, { ground: '#7fae6b' }, KINDS);
  ok('the heart: its matrix at its middle, a share of it round', [near(heart.matrix.radius, 2.7), heart.matrix.group.parent === heart.scene], [true, true]);
  heart.dispose();
  m.dispose();
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
