/**
 * tests/gamepad.mjs — run with: node tests/gamepad.mjs
 *
 * The gamepad's settings as a schema (C6c, docs/gamepad.md): what was a
 * plain object and a carousel of its own is core's params, its defaults the
 * object's, its pattern core/stamp.js's — and a recipe from before, its
 * format named `frameFormat` and its bleed `frameBleed`, read under their
 * names now. Pure: no DOM.
 */

const { gamepadParams, GROUPS } = await import('../apps/gamepad/params.js');
const { PATTERNS } = await import('../core/stamp.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(58), JSON.stringify(got), pass ? '' : '  expected ' + JSON.stringify(want));
};

const params = gamepadParams();
const v = params.values;
ok('the pad\'s speeds and limits, as the plain object had them', [v.moveSpeed, v.rotateSpeed, v.scaleSpeed, v.scaleMin, v.scaleMax],
   [10, 0.045, 0.006, 0.05, 8]);
ok('…the reference\'s opacity, and a still saved on nothing', [v.refOpacity, v.saveGround], [0.5, 'none']);
ok('…its format core\'s, the ink\'s own by default, no bleed', [v.format, v.bleed], ['content', 0]);
ok('…no zoom and no scale: a still is the ink\'s own pixels', ['zoom' in v, 'scale' in v], [false, false]);
ok('the pattern: core/stamp.js\'s, the first by default', [params.spec('pattern').options, v.pattern], [PATTERNS, PATTERNS[0]]);
ok('every setting in a drawer the panel has, or core\'s format', params.keys.every(k => GROUPS[params.spec(k).group]), true);

params.restore({ moveSpeed: 22, frameFormat: 'source', frameBleed: 12, saveGround: 'white' });
ok('a recipe from before C6c: its format and bleed read under their names', [params.get('moveSpeed'), params.get('format'),
  params.get('bleed'), params.get('saveGround')], [22, 'source', 12, 'white']);
ok('…and today\'s left as it is', params.upgraded({ format: 'content', bleed: 3 }), { format: 'content', bleed: 3 });

params.set({ pattern: 'quad' });
ok('a pattern set is the recipe\'s', params.values.pattern, 'quad');

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
