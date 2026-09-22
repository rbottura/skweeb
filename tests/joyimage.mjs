/**
 * tests/joyimage.mjs — run with: node tests/joyimage.mjs
 *
 * The brush cursor's pattern state, and the reason this file exists at all.
 *
 * `joyImage.js` re-exported PATTERNS from core/stamp.js with a bare
 * `export … from`, which forwards a name to importers without binding it
 * locally. Every use inside the module was therefore a ReferenceError — but
 * only once a JoyImage was constructed, which is to say only after a brush was
 * selected. The module itself loaded perfectly, so checking the import graph
 * (which the stage move did, across all 30 files) could not see it.
 *
 * That is the shape of the gap this test closes: constructing the thing is a
 * different question from importing it. JoyImage's constructor only assigns
 * fields, so asking it costs no p5 and no DOM.
 */

const { JoyImage, PATTERNS, PATTERN_LABELS } =
  await import('../apps/gamepad/core/joyImage.js');
const Stamp = await import('../core/stamp.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(50), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

// -- The re-export actually binds --------------------------------------------

ok('PATTERNS reaches importers', PATTERNS, Stamp.PATTERNS);
ok('so do the labels', Object.keys(PATTERN_LABELS), Object.keys(Stamp.PATTERN_LABELS));

// The regression itself: this threw ReferenceError before the import was added
// alongside the re-export.
const joy = new JoyImage(10, 20, 1, null, null, 400, 300);
ok('a new cursor starts on the first pattern', joy.pattern, PATTERNS[0]);
ok('which is single', joy.pattern, 'single');

// -- Cycling -----------------------------------------------------------------

{
  const j = new JoyImage(0, 0, 1, null, null, 100, 100);
  const walked = [j.pattern];
  for (let i = 0; i < PATTERNS.length; i++) {
    j.nextPattern();
    walked.push(j.pattern);
  }
  ok('nextPattern walks every pattern', walked.slice(0, -1), PATTERNS);
  ok('and wraps to the start', walked[walked.length - 1], PATTERNS[0]);
}

{
  const j = new JoyImage(0, 0, 1, null, null, 100, 100);
  j.setPattern('quad');
  ok('setPattern takes', j.pattern, 'quad');
  j.nextPattern();
  ok('and cycling continues from there', j.pattern, PATTERNS[0]);
}

// A pattern the list does not contain: indexOf gives -1, so the next one is
// index 0. Landing back on a valid pattern is the right recovery — the
// alternative is undefined, which would reach stampPoints and draw nothing.
{
  const j = new JoyImage(0, 0, 1, null, null, 100, 100);
  j.setPattern('not-a-pattern');
  j.nextPattern();
  ok('an unknown pattern recovers to a real one', j.pattern, PATTERNS[0]);
}

// -- The geometry is core's, not a second copy -------------------------------

{
  const j = new JoyImage(50, 60, 1, null, null, 400, 300);
  ok('points come from core/stamp.js',
     j._getStampPoints(),
     Stamp.stampPoints(50, 60, 0, 'single', 400, 300));

  j.setPattern('mirror-x');
  ok('and follow the pattern that is set',
     j._getStampPoints(),
     Stamp.stampPoints(50, 60, 0, 'mirror-x', 400, 300));
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
