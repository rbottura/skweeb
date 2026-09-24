/**
 * tests/easing.mjs — run with: node tests/easing.mjs
 *
 * Covers core/easing.js. The promises every curve makes: it starts at 0 and
 * ends at 1 exactly, so a change lands where it was going; `out` is `in` run
 * backwards; `inOut` passes the middle at the middle. And the families that
 * should stay inside [0, 1] do, while back, elastic and bounce are allowed out.
 */

const { EASINGS, EASE_IDS, EASE_LABELS, BASIC, BASIC_LABELS, easing, easeParam } = await import('../core/easing.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(56), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const samples = Array.from({ length: 101 }, (_, i) => i / 100);

ok('thirty-one curves: linear and ten families three ways', EASE_IDS.length, 31);
ok('every curve starts at 0', EASE_IDS.filter(id => !near(EASINGS[id](0), 0)), []);
ok('every curve ends at 1', EASE_IDS.filter(id => !near(EASINGS[id](1), 1)), []);
ok('every in-out curve passes the middle at the middle',
   EASE_IDS.filter(id => id.startsWith('inOut') && !near(EASINGS[id](0.5), 0.5, 1e-6)), []);

const families = [...new Set(EASE_IDS.filter(id => id.startsWith('in') && !id.startsWith('inOut')).map(id => id.slice(2)))];
ok('out is in, run backwards', families.filter(f =>
   !samples.every(t => near(EASINGS['out' + f](t), 1 - EASINGS['in' + f](1 - t), 1e-9))), []);

const tame = ['Sine', 'Quad', 'Cubic', 'Quart', 'Quint', 'Expo', 'Circ'];
ok('the tame families never leave [0, 1] and never turn back', tame.flatMap(f => ['in', 'out', 'inOut'].map(w => w + f))
   .filter(id => !samples.every((t, i) => {
     const v = EASINGS[id](t);
     return v >= -1e-12 && v <= 1 + 1e-12 && (i === 0 || v >= EASINGS[id](samples[i - 1]) - 1e-12);
   })), []);
ok('out back overshoots its end', Math.max(...samples.map(EASINGS.outBack)) > 1, true);
ok('in back dips below its start', Math.min(...samples.map(EASINGS.inBack)) < 0, true);
ok('out elastic rings past 1', Math.max(...samples.map(EASINGS.outElastic)) > 1, true);
ok('out bounce stays inside and touches down', samples.every(t => EASINGS.outBounce(t) <= 1 + 1e-12), true);

const e = easing('outCubic');
ok('easing() clamps below 0 and above 1', [e(-3), e(7)], [0, 1]);
ok('an unknown name is linear, not an error', easing('fromTheFuture')(0.25), 0.25);
ok('labels read as words', [EASE_LABELS.linear, EASE_LABELS.outCubic, EASE_LABELS.inOutBack], ['linear', 'out cubic', 'in-out back']);

const spec = easeParam({ group: 'motion', default: 'outBack' });
ok('easeParam offers the basic six', [spec.type, spec.options, spec.default, spec.group],
   ['enum', ['linear', 'inCubic', 'outCubic', 'inOutCubic', 'outBack', 'outBounce'], 'outBack', 'motion']);
ok('in words', spec.options.map(id => spec.labels[id]), ['linear', 'ease in', 'ease out', 'ease in-out', 'overshoot', 'bounce']);
ok('every basic curve is a real one', BASIC.every(id => id in EASINGS && id in BASIC_LABELS), true);
ok('and all thirty-one when asked', easeParam({}, { all: true }).options.length, 31);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
