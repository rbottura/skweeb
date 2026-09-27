/**
 * tests/noise.mjs — run with: node tests/noise.mjs
 *
 * Covers core/noise.js. The promises — `pcg` is WGSL's, bit for bit (held
 * against the same arithmetic in BigInt, which wraps as a u32 does and
 * nothing else); a seed is a field and another seed another; the noise is
 * smooth and zero on its lattice; its curl turns without gathering.
 */

const { pcg, randAt, noise2, noiseGrad2, curl2 } = await import('../core/noise.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(58), JSON.stringify(got).slice(0, 70),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 70));
};

// WGSL's pcg in BigInt: every product and sum taken mod 2^32, as u32 does.
const M = 0xffffffffn;
const pcgRef = n => {
  const s = (BigInt(n >>> 0) * 747796405n + 2891336453n) & M;
  const w = (((s >> ((s >> 28n) + 4n)) ^ s) * 277803737n) & M;
  return Number((w >> 22n) ^ w);
};
const inputs = [0, 1, 2, 255, 65535, 123456789, 0x7fffffff, 0x80000000, 0xdeadbeef, 0xffffffff];
ok('pcg is WGSL\'s, bit for bit', inputs.map(pcg), inputs.map(pcgRef));
let same = true;
for (let i = 0, n = 7; i < 2000; i++, n = pcgRef(n)) if (pcg(n) !== pcgRef(n)) same = false;
ok('and on two thousand more', same, true);
ok('randAt in [0, 1]', [...Array(200)].every((_, i) => { const r = randAt(i, -i, 99); return r >= 0 && r <= 1; }), true);
ok('the same cell, the same number', randAt(3, 4, 7), randAt(3, 4, 7));

ok('zero on every lattice point', [noise2(0, 0, 5), noise2(3, -2, 5), noise2(10, 7, 5)].map(v => Math.abs(v) < 1e-12), [true, true, true]);
ok('another seed, another field', noise2(0.37, 1.61, 1) === noise2(0.37, 1.61, 2), false);
const vals = [...Array(400)].map((_, i) => noise2(i * 0.173, i * 0.091, 11));
ok('within about ±1', vals.every(v => Math.abs(v) < 1.01), true);
ok('smooth: a small step, a small change', Math.abs(noise2(2.5, 1.5, 3) - noise2(2.5001, 1.5, 3)) < 1e-3, true);

// The slope is exact: against central differences of the value, anywhere.
const slopeOk = [[0.31, 0.77], [2.5, 1.5], [-3.2, 4.9], [7.01, -0.99]].every(([x, y]) => {
  const [, nx, ny] = noiseGrad2(x, y, 9), e = 1e-5;
  const fx = (noise2(x + e, y, 9) - noise2(x - e, y, 9)) / (2 * e);
  const fy = (noise2(x, y + e, 9) - noise2(x, y - e, 9)) / (2 * e);
  return Math.abs(nx - fx) < 1e-6 && Math.abs(ny - fy) < 1e-6;
});
ok('its slope is exact, against the value\'s differences', slopeOk, true);

// A curl has no divergence: what flows into a small box flows out.
const h = 1e-3;
const div = (x, y) => (curl2(x + h, y, 4)[0] - curl2(x - h, y, 4)[0]) / (2 * h)
                    + (curl2(x, y + h, 4)[1] - curl2(x, y - h, 4)[1]) / (2 * h);
ok('its curl does not gather: divergence near zero', [0.3, 1.7, 4.2].every(p => Math.abs(div(p, p * 0.6)) < 0.01), true);
ok('and it moves', Math.hypot(...curl2(0.4, 0.8, 4)) > 0.01, true);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
