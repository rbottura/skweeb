/**
 * tests/particles-model.mjs — run with: node tests/particles-model.mjs
 *
 * Covers apps/particles/model.js, M6's first brick: a particle is a function
 * of its slot and its age. The promises — a frame is the same however it is
 * reached, a loop closes exactly, a prewarmed stream is full from its first
 * frame, nothing is shown unborn or past its life, a seed is a picture — and
 * the closed-form motion against the schoolbook.
 */

const { particlesAt, prepare, motion, slot, duration, MAX_ALIVE } = await import('../apps/particles/model.js');
const { integrate, fieldOf, STEP } = await import('../apps/particles/forces.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
// Positions to a millionth of a pixel: a loop's second pass reaches the same
// age by a different sum, and floats round that sum a hair differently.
const round = ps => ps.map(p => [p.slot, +p.x.toFixed(6), +p.y.toFixed(6), +p.age.toFixed(6)]);

const torch = { seed: 7, rate: 80, period: 2, life: 1.2, lifeSpread: 0.4, speed: 180, spread: 50,
                gravity: -120, wind: 30, drag: 1.5 };

// ── A frame is the same however it is reached ───────────────────────────────

ok('the same time, the same particles', round(particlesAt(torch, 0.7)), round(particlesAt(torch, 0.7)));
const scrubbed = [1.9, 0.1, 0.7].map(t => particlesAt(torch, t));
ok('asked for in any order, the same', round(scrubbed[2]), round(particlesAt(torch, 0.7)));
const m = prepare(torch);
ok('a recipe prepared once draws what it draws unprepared', round(particlesAt(m, 1.3)), round(particlesAt(torch, 1.3)));
ok('a slot is what it drew, asked twice', slot(m, 12), slot(m, 12));

// ── A loop closes exactly ───────────────────────────────────────────────────

ok('slots per loop are rate × period', m.n, 160);
ok('slot k + n is slot k, one period on',
   [slot(m, 5 + m.n).slot, +(slot(m, 5 + m.n).born - slot(m, 5).born).toFixed(9)], [5, 2]);
for (const t of [0, 0.35, 1.999]) {
  ok(`t = ${t} and t + period are the same picture`, round(particlesAt(torch, t + 2)), round(particlesAt(torch, t)));
}
ok('and ten periods on', round(particlesAt(torch, 20.5)), round(particlesAt(torch, 0.5)));
ok('a stream lasts its period', duration(torch), 2);

// ── Prewarmed, full from the first frame; not, it starts empty ──────────────

const counts = ts => ts.map(t => particlesAt(torch, t).length);
const steady = counts([0, 0.5, 1, 1.5]);
ok('prewarmed, as many at 0 as later, near rate × life', steady.every(n => Math.abs(n - 96) < 20), true);
const cold = { ...torch, prewarm: false };
ok('not prewarmed, nothing before the first birth', particlesAt(cold, 0).length, 0);
ok('and fewer early than once it has run a life',
   particlesAt(cold, 0.3).length < particlesAt(cold, 1.8).length, true);
ok('once it has, the same as prewarmed', round(particlesAt(cold, 1.9)), round(particlesAt(torch, 1.9)));

// ── Alive: born, not past its life, oldest first ────────────────────────────

const now = particlesAt(torch, 1.1);
ok('none unborn, none past its life', now.every(p => p.age >= 0 && p.age < p.life), true);
ok('its life, 0 to 1', now.every(p => p.t >= 0 && p.t < 1), true);
ok('oldest first, so the newest draw on top', now.every((p, i) => !i || p.age <= now[i - 1].age), true);
ok('lives spread as asked', now.every(p => p.life >= 1.2 * 0.6 - 1e-9 && p.life <= 1.2 * 1.4 + 1e-9), true);
ok('a pick to choose a sprite with, in [0, 1)', now.every(p => p.pick >= 0 && p.pick < 1), true);

// ── A seed is a picture ─────────────────────────────────────────────────────

ok('another seed, another picture', JSON.stringify(round(particlesAt({ ...torch, seed: 8 }, 0.7)))
   === JSON.stringify(round(particlesAt(torch, 0.7))), false);
ok('a string seeds it too', round(particlesAt({ ...torch, seed: 'ptc_a' }, 0.7)),
   round(particlesAt({ ...torch, seed: 'ptc_a' }, 0.7)));

// ── A burst ─────────────────────────────────────────────────────────────────

const burst = { seed: 3, mode: 'burst', count: 50, life: 1, lifeSpread: 0.5, speed: 300, spread: 360, gravity: 400 };
ok('a burst: every one at zero', particlesAt(burst, 0).length, 50);
ok('all from the emitter', particlesAt(burst, 0).every(p => p.x === 0 && p.y === 0), true);
ok('fewer as they die', particlesAt(burst, 0.9).length < 50, true);
ok('over when the longest is', [particlesAt(burst, 1.5).length, duration(burst)], [0, 1.5]);
ok('nothing before it', particlesAt(burst, -0.1).length, 0);

// ── Motion, in closed form ──────────────────────────────────────────────────

const p0 = { x: 10, y: 20 }, v0 = { x: 30, y: -100 }, g = { x: 0, y: 300 };
const free = motion(p0, v0, g, 0, 2);
ok('no drag: p + v t + a t² / 2', [free.x, free.y, free.vx, free.vy], [70, 420, 30, 500]);
const nearly = motion(p0, v0, g, 1e-5, 2);
ok('a drag near nothing is nearly none', Math.abs(nearly.y - free.y) < 0.01, true);
const late = motion(p0, v0, g, 2, 30);
ok('drag holds it at the pull over the drag', [+late.vx.toFixed(6), +late.vy.toFixed(6)], [0, 150]);
const h = 1e-4, a1 = motion(p0, v0, g, 2, 0.5), a2 = motion(p0, v0, g, 2, 0.5 + h);
ok('its velocity is how its position changes', Math.abs((a2.y - a1.y) / h - a1.vy) < 0.1, true);
ok('and how it changes: a − k v', Math.abs((a2.vy - a1.vy) / h - (300 - 2 * a1.vy)) < 0.1, true);
ok('at age 0, where it left, as fast', motion(p0, v0, g, 2, 0), { x: 10, y: 20, vx: 30, vy: -100 });

// ── Direction: degrees clockwise from up ────────────────────────────────────

const aim = angle => particlesAt({ seed: 1, mode: 'burst', count: 1, spread: 0, speedSpread: 0, gravity: 0, drag: 0,
                                   speed: 100, angle, life: 2, lifeSpread: 0 }, 1)[0];
ok('0° goes up', [Math.round(aim(0).x), Math.round(aim(0).y)], [0, -100]);
ok('90° goes right', [Math.round(aim(90).x), Math.round(aim(90).y)], [100, 0]);

// ── A recipe that asks too much ─────────────────────────────────────────────

const flood = particlesAt({ rate: 100000, period: 1, life: 1, lifeSpread: 0 }, 0.5);
ok('never more than MAX_ALIVE', flood.length <= MAX_ALIVE, true);

// ── Turning: a start spread, a spin, or facing where it goes ────────────────

const still1 = { seed: 1, mode: 'burst', count: 1, spread: 0, speedSpread: 0, lifeSpread: 0, gravity: 0, drag: 0,
                 speed: 100, life: 4 };
ok('no turn and no spin: as it was drawn', particlesAt(still1, 1)[0].rot, 0);
const spun = { ...still1, spin: 90 };
ok('spin: degrees a second, clockwise', +particlesAt(spun, 2)[0].rot.toFixed(9), +Math.PI.toFixed(9));
const aligned = { ...still1, angle: 90, align: true };
ok('aligned, it faces where it goes', +particlesAt(aligned, 1)[0].rot.toFixed(9), +(Math.PI / 2).toFixed(9));
const falling = { ...still1, angle: 90, gravity: 400, align: true };
ok('and turns as it falls', particlesAt(falling, 2)[0].rot > particlesAt(falling, 0.5)[0].rot, true);
const spinning = { ...torch, turn: 360, spin: 180, spinSpread: 0.5 };
ok('a turning stream still closes its loop', particlesAt(spinning, 2.4).map(p => +p.rot.toFixed(6)),
   particlesAt(spinning, 0.4).map(p => +p.rot.toFixed(6)));
ok('and turning draws nothing it drew before differently', round(particlesAt(spinning, 0.9)), round(particlesAt(torch, 0.9)));

// ── Where it leaves from: a line, a disc, a ring ────────────────────────────

const born = shape => particlesAt({ seed: 4, mode: 'burst', count: 300, speed: 0, speedSpread: 0, gravity: 0, drag: 0,
                                    life: 1, lifeSpread: 0, x: 10, y: -20, extent: 50, ...shape }, 0);
const line = born({ shape: 'line', lineAngle: 90 });
ok('a line, turned 90°, stands upright on the emitter', line.every(p => Math.abs(p.x - 10) < 1e-9 && Math.abs(p.y + 20) <= 25 + 1e-9), true);
ok('and spans it', Math.max(...line.map(p => p.y)) - Math.min(...line.map(p => p.y)) > 45, true);
const disc = born({ shape: 'disc' });
const r = p => Math.hypot(p.x - 10, p.y + 20);
ok('a disc: all inside its radius', disc.every(p => r(p) <= 50 + 1e-9), true);
ok('filled evenly: about a quarter inside half the radius', Math.abs(disc.filter(p => r(p) < 25).length / 300 - 0.25) < 0.08, true);
ok('a ring: all on its edge', born({ shape: 'ring' }).every(p => Math.abs(r(p) - 50) < 1e-9), true);
const bloom = particlesAt({ seed: 4, mode: 'burst', count: 60, shape: 'ring', aim: 'outward', extent: 40, spread: 0,
                            speed: 100, speedSpread: 0, gravity: 0, drag: 0, life: 1, lifeSpread: 0 }, 0.5);
ok('aimed outward, every one leaves away from the centre', bloom.every(p => Math.abs(Math.hypot(p.x, p.y) - 90) < 1e-6), true);
ok('a point is where it was', born({ shape: 'point' }).every(p => p.x === 10 && p.y === -20), true);

// ── Fields: integrated from birth ───────────────────────────────────────────

const none = () => [0, 0];
const mm = { gravity: 300, wind: -40, drag: 1.5 };
const num = integrate({ x: 5, y: 5 }, { x: 60, y: -200 }, mm, none, 1.37);
const exact = motion({ x: 5, y: 5 }, { x: 60, y: -200 }, { x: -40, y: 300 }, 1.5, 1.37);
ok('with no field, the steps land where the formula does, to a hundredth of a pixel',
   Math.hypot(num.x - exact.x, num.y - exact.y) < 0.01, true);
ok('no field on, the formula places them', prepare({}).field, null);
const swirl = { ...torch, vortex: 400, attract: 150, noise: 300, noiseScale: 120, fx: 0, fy: -150 };
ok('a field on, the same time is the same picture', round(particlesAt(swirl, 0.8)), round(particlesAt(swirl, 0.8)));
ok('and still closes its loop', round(particlesAt(swirl, 2.8)), round(particlesAt(swirl, 0.8)));
ok('and moves them off the path the formula gives', JSON.stringify(round(particlesAt(swirl, 0.8)))
   === JSON.stringify(round(particlesAt(torch, 0.8))), false);
const still0 = { seed: 2, mode: 'burst', count: 1, speed: 0, speedSpread: 0, gravity: 0, drag: 0, life: 3, lifeSpread: 0,
                 x: 100, y: 0, fx: 0, fy: 0 };
ok('an attractor pulls towards its centre', Math.hypot(particlesAt({ ...still0, attract: 200 }, 0.5)[0].x, 0) < 100, true);
const turned = particlesAt({ ...still0, vortex: 300 }, 0.3)[0];
ok('a vortex turns it clockwise: right of centre, it goes down', turned.vy > 0 && turned.y > 0, true);
ok('its steps are 120 a second', STEP, 1 / 120);
ok('a field is null when nothing pulls', fieldOf(prepare({ vortex: 0, attract: 0, noise: 0 })), null);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
