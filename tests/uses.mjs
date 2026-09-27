/**
 * tests/uses.mjs — run with: node tests/uses.mjs
 *
 * Covers core/uses.js: which uses a set is offered to, and the tag edit that
 * changes it. The rule that is easy to get wrong is the default — a set nobody
 * has switched follows its role, and switching everything off must not bring
 * that default back.
 */

const { USES, usesOf, offers, retagFor, hasUseTags, roleOf, carriedUses, retireFor } = await import('../core/uses.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(56), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

const sorted = set => [...set].sort();

/** Apply an edit the way server.js does. */
const apply = (o, { add, remove }) => {
  const tags = (o.tags || []).filter(t => !remove.includes(t));
  for (const t of add) if (!tags.includes(t)) tags.push(t);
  return { ...o, tags };
};

// -- The catalogue ------------------------------------------------------------

ok('every use has an id, an app and a label',
  USES.every(u => u.id && u.app && u.label), true);
ok('ids are unique', new Set(USES.map(u => u.id)).size, USES.length);

// -- Defaults: a set nobody has switched follows its role ----------------------

const family = { type: 'set', tags: ['ckt', 'brush-family'], recipe: { members: ['a'], role: 'brush-family' } };
const material = { type: 'set', tags: ['grid'], recipe: { members: ['a'], role: 'material' } };

// A brush family is sprites already: particles take one by default too (M6's link).
ok('a brush family is offered as brushes, particle sprites and fractal copies', sorted(usesOf(family)), ['brushes', 'copies', 'particles']);
ok('a material is not offered as particle sprites until switched on', offers(material, 'particles'), false);
ok('a material is offered as a material', sorted(usesOf(material)), ['material']);
ok('and not as brushes', offers(material, 'brushes'), false);
ok('a set with no role is offered nowhere', sorted(usesOf({ type: 'set', tags: [] })), []);

// An index row withholds the recipe; the server copies the role onto it.
const row = { type: 'set', tags: [], role: 'brush-family' };
ok('a row carries its role on its own', roleOf(row), 'brush-family');
ok('a row is offered by that role', offers(row, 'brushes'), true);
ok('nothing but a set is offered', sorted(usesOf({ type: 'still', tags: ['use:brushes'] })), []);

// -- Tags, once there, are the whole answer ------------------------------------

const tagged = { ...family, tags: ['ckt', 'use:material', 'use:sprites'] };
ok('tags override the role', sorted(usesOf(tagged)), ['material', 'sprites']);
ok('so the family is out of the gamepad', offers(tagged, 'brushes'), false);
ok('use:none is offered nowhere', sorted(usesOf({ ...family, tags: ['use:none'] })), []);
ok('an unknown use is kept', offers({ type: 'set', tags: ['use:compose'] }, 'compose'), true);
ok('hasUseTags sees them', [hasUseTags(family), hasUseTags(tagged)], [false, true]);

// -- The edit ----------------------------------------------------------------

{
  // First switch on an untouched family: the default becomes explicit.
  const edit = retagFor(family, new Set(['brushes', 'material']));
  ok('first switch writes every use it keeps', edit, { add: ['use:brushes', 'use:material'], remove: [] });
  const after = apply(family, edit);
  ok('other tags are untouched', after.tags.slice(0, 2), ['ckt', 'brush-family']);
  ok('and it now says so', sorted(usesOf(after)), ['brushes', 'material']);

  // Everything off must not fall back to the role.
  const off = apply(after, retagFor(after, new Set()));
  ok('all off is use:none', off.tags.filter(t => t.startsWith('use:')), ['use:none']);
  ok('and stays off', sorted(usesOf(off)), []);

  // And back on from none.
  const on = apply(off, retagFor(off, new Set(['sprites'])));
  ok('on again drops use:none', on.tags.filter(t => t.startsWith('use:')), ['use:sprites']);
}

{
  const keeps = { type: 'set', tags: ['use:compose', 'use:brushes'] };
  const want = usesOf(keeps);
  want.delete('brushes');
  const after = apply(keeps, retagFor(keeps, want));
  ok('an unknown use survives an edit of the others', after.tags, ['use:compose']);
}

ok('an edit that changes nothing is empty', retagFor(tagged, usesOf(tagged)), { add: [], remove: [] });

// -- A new version, and the one it replaces -----------------------------------

ok('a new version carries the switches', carriedUses(tagged), ['use:material', 'use:sprites']);
ok('none carried when none were set — the role decides again', carriedUses(material), []);
{
  const old = { ...material, tags: ['grid', 'material', 'use:material', 'use:brushes'] };
  const put = apply(old, retireFor(old, 'earlier materials'));
  ok('a replaced set is offered nowhere', sorted(usesOf(put)), []);
  ok('and filed away', put.tags.includes('folder:earlier materials'), true);
  ok('its other tags stay', put.tags.slice(0, 2), ['grid', 'material']);
  const untouched = apply(material, retireFor(material, 'earlier materials'));
  ok('an untouched one is put away too, not back to its role', sorted(usesOf(untouched)), []);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
