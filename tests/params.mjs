/**
 * tests/params.mjs — run with: node tests/params.mjs
 *
 * params.js is the one module in core/ with no code to port, so it is the one
 * most likely to be wrong in a way nothing notices. Two of its promises are
 * load-bearing enough that the rest of the suite is built on them:
 *
 *   `values` IS the recipe — not something converted into one. If a value can
 *   come back from set() in a shape JSON would not survive, every object this
 *   app ever saves is subtly lossy.
 *
 *   `consumedObjectIds()` IS the lineage. An app is never supposed to assemble
 *   `parents` itself, so if this returns the wrong ids nothing downstream
 *   catches it — a wrong parent looks exactly like a right one until someone
 *   asks an object where it came from.
 *
 * The coercion checks are the migration story from docs/object-model.md: an
 * old recipe in a newer app is a migration, not a crash. Every one of them
 * feeds in something a recipe could plausibly hold and asserts it degrades to
 * something usable rather than throwing or poisoning the values.
 */

const { defineParams } = await import('../core/params.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(48), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

/** Grid's real schema, which is what this module was written against. */
const gridSchema = () => defineParams('grid', {
  source: { type: 'object', accepts: ['still', 'sequence'], label: 'image' },
  cell:   { type: 'range', min: 4, max: 64, step: 2, default: 12, label: 'cell size' },
  ramp:   { type: 'enum', options: ['gradients', 'tiles', 'stones'], default: 'gradients' },
  invert: { type: 'bool', default: false, bind: 'Y' },
  ink:    { type: 'color', default: '#ffffff' },
});

// ── Defaults ─────────────────────────────────────────────────────────────────

const p = gridSchema();
ok('defaults come from the schema', p.values,
   { source: null, cell: 12, ramp: 'gradients', invert: false, ink: '#ffffff' });
ok('an object param defaults to nothing chosen', p.get('source'), null);
ok('keys are the declared ones', p.keys, ['source', 'cell', 'ramp', 'invert', 'ink']);
ok('the app name is carried', p.app, 'grid');

// ── values is the recipe ─────────────────────────────────────────────────────

ok('values survives a JSON round trip',
   JSON.parse(JSON.stringify(p.values)), p.values);
const grabbed = p.values;
grabbed.cell = 999;
ok('values is a copy, not a handle', p.get('cell'), 12);

// ── set, and its coercions ───────────────────────────────────────────────────

p.set('cell', 20);
ok('a plain set works', p.get('cell'), 20);
ok('set reports how many changed', p.set('cell', 20), 0);
ok('setting many at once', p.set({ cell: 30, invert: true }), 2);

p.set('cell', 999);
ok('range clamps to max', p.get('cell'), 64);
p.set('cell', -5);
ok('range clamps to min', p.get('cell'), 4);
p.set('cell', 13);
ok('range snaps to step from min', p.get('cell'), 14);

{
  // min + k·step in floats: 0.005 + 23·0.005 is 0.12000000000000001, and that
  // went into recipes and onto readouts. Snapping rounds to the schema's own
  // precision.
  const f = defineParams('float', {
    size: { type: 'range', min: 0.005, max: 2, step: 0.005, default: 0.05 },
    zoom: { type: 'range', min: 0.05, max: 8, step: 0.05, default: 1 },
  });
  f.set({ size: 0.12, zoom: 0.15 });
  ok('a snapped float is the number you meant', [f.get('size'), f.get('zoom')], [0.12, 0.15]);
  f.set('size', 0.1234);
  ok('and still snaps to the step', f.get('size'), 0.125);
}
p.set('cell', 'nonsense');
ok('an unparseable number falls back', p.get('cell'), 12);
p.set('cell', '22');
ok('a numeric string is taken', p.get('cell'), 22);

p.set('ramp', 'tiles');
ok('enum takes a declared option', p.get('ramp'), 'tiles');
p.set('ramp', 'confetti');
ok('enum refuses an undeclared one', p.get('ramp'), 'gradients');

p.set('invert', 'yes');
ok('bool coerces', p.get('invert'), true);

p.set('source', 'gam_1789995415143_7cbce7');
ok('object takes an id', p.get('source'), 'gam_1789995415143_7cbce7');
p.set('source', { id: 'nope' });
ok('object refuses a non-id', p.get('source'), null);

ok('an unknown key is dropped, not thrown on', p.set('nonexistent', 1), 0);
ok('and does not appear in values', 'nonexistent' in p.values, false);

// ── restore ──────────────────────────────────────────────────────────────────
// The failure this guards: a restore that only assigns what the recipe
// mentions inherits everything else from whatever was loaded before it, so a
// piece comes back subtly wrong and only sometimes.

const q = gridSchema();
q.set({ cell: 40, invert: true, ramp: 'stones', source: 'grd_1700000000000_abc123' });
q.restore({ cell: 8 });
ok('restore applies what the recipe has', q.get('cell'), 8);
ok('restore resets what it does not', q.get('invert'), false);
ok('restore resets an enum too', q.get('ramp'), 'gradients');
ok('restore clears a stale source', q.get('source'), null);

const r = gridSchema();
r.set({ cell: 24, ramp: 'tiles', source: 'gam_1789995415143_7cbce7' });
const recipe = r.values;
const s = gridSchema();
s.restore(recipe);
ok('save then restore is identical', s.values, recipe);

// A recipe from a later version, carrying a key this build has never heard of.
const t = gridSchema();
t.restore({ cell: 16, threshold: 0.5, palette: ['#000'] });
ok('a future recipe loads anyway', t.get('cell'), 16);
ok('and its unknown keys are dropped', Object.keys(t.values).length, 5);

// ── consumedObjectIds — the lineage ──────────────────────────────────────────

const lin = defineParams('grid', {
  source:  { type: 'object', accepts: ['still'] },
  overlay: { type: 'object', accepts: ['still'] },
  cell:    { type: 'range', min: 1, max: 10, default: 4 },
});
ok('nothing chosen means no parents', lin.consumedObjectIds(), []);

lin.set('source', 'gam_1789995415143_7cbce7');
ok('a chosen object is a parent', lin.consumedObjectIds(), ['gam_1789995415143_7cbce7']);

lin.set('overlay', 'grd_1700000000000_abc123');
ok('every object param counts',
   lin.consumedObjectIds(), ['gam_1789995415143_7cbce7', 'grd_1700000000000_abc123']);

lin.set('overlay', 'gam_1789995415143_7cbce7');
ok('the same object twice is one parent',
   lin.consumedObjectIds(), ['gam_1789995415143_7cbce7']);

lin.set('source', null);
ok('clearing one drops it from lineage',
   lin.consumedObjectIds(), ['gam_1789995415143_7cbce7']);
// consumedObjectIds() returns ids, so `.includes(someNumber)` would pass
// whatever the code did. The real statement is that a schema declaring no
// object params has no lineage at all, however many values it holds.
const noObjects = defineParams('grid', {
  cell: { type: 'range', min: 1, max: 10, default: 4 },
  ink:  { type: 'color', default: '#fff' },
});
noObjects.set({ cell: 9, ink: '#abc' });
ok('a schema with no object params has no lineage', noObjects.consumedObjectIds(), []);

// ── Change notification ──────────────────────────────────────────────────────

const seen = [];
const u = gridSchema();
const off = u.on((key, value) => seen.push([key, value]));
u.set('cell', 20);
u.set('cell', 20);                       // no change, no event
u.set({ invert: true, ramp: 'tiles' });
ok('one event per real change', seen, [['cell', 20], ['invert', true], ['ramp', 'tiles']]);
off();
u.set('cell', 30);
ok('unsubscribe stops them', seen.length, 3);

// ── The schema is checked at declaration ─────────────────────────────────────

let threw = '';
try {
  defineParams('grid', { bad: { type: 'quaternion', default: 0 } });
} catch (err) { threw = err.message; }
ok('an undeclared widget type is refused at definition', /unknown type quaternion/.test(threw), true);

// ── The schema and the panel must agree ──────────────────────────────
// The bargain in ParamPanel.js is that a control is one schema entry and never
// bespoke HTML. That only holds while every declared type has a widget, and the
// failure is silent both ways: a type with no widget is a control that never
// draws, a widget with no type is dead code nothing can reach.
// Writing this check found `int` already declared and undrawable.

const { PARAM_TYPES }  = await import('../core/params.js');
const { WIDGET_TYPES } = await import('../core/ParamPanel.js');

ok('every declared type has a widget',
   PARAM_TYPES.filter(t => !WIDGET_TYPES.includes(t)), []);
ok('every widget has a declared type',
   WIDGET_TYPES.filter(t => !PARAM_TYPES.includes(t)), []);

// And one of each really defines, which comparing two lists would not show.
const every = defineParams('every', {
  a: { type: 'range', min: 0, max: 10, default: 5 },
  b: { type: 'int', min: 0, max: 10, default: 3 },
  c: { type: 'bool', default: true },
  d: { type: 'enum', options: ['x', 'y'], default: 'y' },
  e: { type: 'color', default: '#112233' },
  f: { type: 'color[]', default: ['#000', '#fff'] },
  g: { type: 'text', default: 'hello' },
  h: { type: 'object', accepts: ['still'] },
});
ok('a schema using every type defines cleanly', every.keys.length, PARAM_TYPES.length);
ok('and its values round trip', JSON.parse(JSON.stringify(every.values)), every.values);
every.set('b', 2.7);
ok('int rounds rather than snapping', every.get('b'), 3);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
