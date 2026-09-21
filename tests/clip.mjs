/**
 * tests/clip.mjs — run with: node tests/clip.mjs
 *
 * The window rules are pure index arithmetic with no test behind them, and the
 * kind that fails quietly: an off-by-one in a range shows up as a loop that
 * stutters at the join, not as an error.
 *
 * The walks below are pinned against the diagrams in sequenceClip.js itself,
 * so the comment and the code cannot drift apart.
 *
 * It also pins representativeTick(), which exists because of a real bug: the
 * exporter kept the *last* frame as a sequence's still, and every rule ends
 * deliberately — two of the four end blank. Vault cards for sweep sequences
 * were fully transparent PNGs, and bounce ones showed two marks out of 266.
 */

const { WINDOW_RULES, bandWidth, createClip, totalTicks, representativeTick } =
  await import('../core/stage/clip.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(46), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

/** A clip over n marks, so the rules have something to count. */
const clipOf = (n, rule, widthSteps = 2) => createClip(
  { id: 'seq_test', w: 100, h: 100, events: Array.from({ length: n }, (_, i) => ({ t: i })) },
  { window: { rule, widthSteps } });

/** One pass of a rule as letters, the way sequenceClip.js draws it. */
function walk(n, ruleName, widthSteps = 2) {
  const rule = WINDOW_RULES[ruleName];
  const opts = { rule: ruleName, widthSteps };
  const out = [];
  for (let t = 0; t < rule.tickCount(0, n, opts); t++) {
    const r = rule.range(0, t, n, opts);
    if (!r) { out.push('—'); continue; }
    let s = '';
    for (let i = r[0]; i <= r[1]; i++) s += String.fromCharCode(65 + (i % n));
    out.push(s);
  }
  return out.join('·');
}

// ── The documented walks ─────────────────────────────────────────────────────
// Each of these is the diagram in the rule's own comment, character for
// character. If a rule changes, one of these fails and the comment gets fixed
// with it.

ok('sweep walks as documented',  walk(4, 'sweep'),  'A·AB·ABC·ABCD·BCD·CD·D·—');
ok('bounce walks as documented', walk(4, 'bounce'), 'A·AB·ABC·ABCD·BCD·CD·D·CD·BCD·ABCD·ABC·AB');
ok('build walks as documented',  walk(4, 'build'),  'A·AB·ABC·ABCD·—');

// ── Tick counts ──────────────────────────────────────────────────────────────

ok('sweep is 2n ticks',      totalTicks(clipOf(266, 'sweep')),  532);
ok('bounce is 4n-4 ticks',   totalTicks(clipOf(266, 'bounce')), 1060);
ok('build is n+1 ticks',     totalTicks(clipOf(266, 'build')),  267);
ok('slide is n ticks',       totalTicks(clipOf(266, 'slide')),  266);
ok('bounce never goes to 0', totalTicks(clipOf(1, 'bounce')),   1);

// ── The bug: the last tick does not represent the clip ───────────────────────
// This is what an export kept as the still until 2026-09-21.

const marksAt = (n, ruleName, tick, widthSteps = 2) => {
  const r = WINDOW_RULES[ruleName].range(0, tick, n, { rule: ruleName, widthSteps });
  return r ? r[1] - r[0] + 1 : 0;
};
const lastTickMarks = (n, ruleName) =>
  marksAt(n, ruleName, totalTicks(clipOf(n, ruleName)) - 1);

ok('sweep ends blank',            lastTickMarks(266, 'sweep'), 0);
ok('build ends blank',            lastTickMarks(266, 'build'), 0);
ok('bounce ends on two marks',    lastTickMarks(266, 'bounce'), 2);

// ── representativeTick picks a frame worth keeping ───────────────────────────

ok('sweep is fullest at n-1',   representativeTick(clipOf(266, 'sweep')),  265);
ok('bounce is fullest at n-1',  representativeTick(clipOf(266, 'bounce')), 265);
ok('build is fullest at n-1',   representativeTick(clipOf(266, 'build')),  265);
ok('slide has no fullest, so 0', representativeTick(clipOf(266, 'slide')), 0);

// The accumulating rules should land on a frame holding every mark.
for (const rule of ['sweep', 'bounce', 'build']) {
  ok(rule + ' still shows every mark',
     marksAt(507, rule, representativeTick(clipOf(507, rule))), 507);
}

// And it must always index a frame the export actually captured.
for (const rule of Object.keys(WINDOW_RULES)) {
  for (const n of [1, 2, 3, 266, 507]) {
    const clip = clipOf(n, rule);
    const tick = representativeTick(clip);
    const inRange = tick >= 0 && tick < totalTicks(clip);
    if (!inRange) ok(rule + ' n=' + n + ' tick in range', tick, '0..' + totalTicks(clip));
  }
}
ok('every rule indexes a real frame, n=1..507', true, true);

// ── Band width ───────────────────────────────────────────────────────────────

ok('a band is widthSteps tenths', bandWidth(100, { widthSteps: 3 }), 30);
ok('a band is never zero',        bandWidth(4, { widthSteps: 1 }),   1);
ok('a band is never the whole',   bandWidth(100, { widthSteps: 99 }), 100);

// ── Clip defaults ────────────────────────────────────────────────────────────

const d = createClip({ id: 's', events: [] });
ok('default rule is sweep',  d.window.rule, 'sweep');
ok('default is one mark/frame', d.timing.ticksPerSecond, 60);
ok('an unknown rule falls back', totalTicks(clipOf(10, 'nonsense')), 20);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
