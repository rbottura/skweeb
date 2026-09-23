/**
 * tests/registry.mjs — run with: node tests/registry.mjs
 *
 * Which sprite families are actually on this machine, and what happens to the
 * ones that are not.
 *
 * The manifest is the contract and stays it — nothing walks a directory. But a
 * manifest describes the project, and a checkout may hold less of it: the
 * heavy families are gitignored by decision, so a clone has two of eleven. The
 * behaviour under test is that the difference is discovered once, cheaply, and
 * does not reach the drawing code.
 *
 * `fetch` is stubbed rather than served. registry.js uses the global, so the
 * whole probe path runs here with no server and no p5 — and stubbing is also
 * the only way to assert the thing that matters most, which is *how many
 * requests* it makes.
 */

const MANIFEST = {
  families: [
    { id: 'brushes', path: 'sprites/brushes', count: 3, files: ['a.png', 'b.png', 'c.png'] },
    { id: 'timbre',  path: 'sprites/timbre',  count: 2, files: ['a.png', 'b.png'] },
    { id: 'gone',    path: 'sprites/gone',    count: 4, files: ['0.png', '1.png', '2.png', '3.png'] },
    { id: 'empty',   path: 'sprites/empty',   count: 0, files: [] },
  ],
};

const HERE = new Set(['sprites/brushes', 'sprites/timbre']);

let requests = [];

globalThis.fetch = async (url, opts = {}) => {
  requests.push({ url, method: opts.method || 'GET' });

  if (url.endsWith('brush-manifest.json')) {
    return { ok: true, status: 200, json: async () => structuredClone(MANIFEST) };
  }
  const present = [...HERE].some(dir => url.includes(dir));
  return { ok: present, status: present ? 200 : 404 };
};

const R = await import('../core/registry.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(52), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};
const ids = list => list.map(f => f.id);

// -- Before probing, everything is offered -----------------------------------
//
// Unprobed must not mean unavailable. A picker that ran before the probe
// resolved would otherwise show an empty list and look like a broken install.

await R.loadManifest('/apps/gamepad/brush-manifest.json');
ok('the manifest is believed about what exists', R.allManifestFamilies().length, 4);
ok('and nothing is hidden before it is asked about',
   ids(R.availableManifestFamilies()), ['brushes', 'timbre', 'gone', 'empty']);
ok('an unprobed family is available', R.isFamilyAvailable('gone'), true);

// -- The probe ---------------------------------------------------------------

requests = [];
await R.probeFamilies();

ok('present families are available', ids(R.availableManifestFamilies()), ['brushes', 'timbre']);
ok('absent ones are named, not silently dropped',
   ids(R.unavailableManifestFamilies()), ['gone', 'empty']);
ok('a family with no files at all is unavailable', R.isFamilyAvailable('empty'), false);

// The whole point: one request per family, not one per sprite. Garam_blue is
// 58 sprites; nine missing families were 517 failed GETs before this.
ok('one request per family', requests.length, 3);          // `empty` needs none
ok('and they are HEADs', [...new Set(requests.map(r => r.method))], ['HEAD']);
ok('it asks for the first file only',
   requests.every(r => /\/(a|0)\.png$/.test(r.url)), true);

// Cached: a second probe is free, so a picker may call it whenever it likes.
requests = [];
await R.probeFamilies();
ok('a second probe makes no requests', requests.length, 0);

// -- What reaches the drawing code -------------------------------------------

const fakeP5 = {
  loadImage(url, onLoad, onErr) {
    if ([...HERE].some(dir => url.includes(dir))) onLoad({ url });
    else onErr(new Error('404'));
  },
};

R.setSelectedFamilies(['brushes', 'gone']);
requests = [];
await R.loadSelected(fakeP5);

ok('a present family loads its sprites', R.spriteCount('brushes'), 3);
ok('and they are really there', R.getSprite('brushes', 1).url.endsWith('b.png'), true);

// Nulls, and the right NUMBER of them. A mark records the sprite index it
// used, so a short array would let index 3 resolve to a different brush --
// which is worse than drawing nothing, because it looks like it worked.
ok('a missing family keeps its length', R.spriteCount('gone'), 4);
ok('as nulls', R.getSprite('gone', 2), null);
ok('including past the end', R.getSprite('gone', 99), null);

// And it fired no image loads for the family it knew was absent.
ok('no doomed loads for an absent family',
   requests.filter(r => r.url.includes('sprites/gone')).length, 0);

// -- A vault set as a brush family -------------------------------------------
//
// M3's link, ckt -> gamepad: brush family. ckt emits a `set` — an ordered list
// of glyph objects — and the gamepad draws with it. Order is the contract in
// both shapes: a recorded mark refers to a sprite by NUMBER, so a set whose
// members reorder redraws old work wrongly.

{
  const setObject = {
    id: 'ckt_1790000000000_aaa111',
    type: 'set',
    title: 'cormorantgaramond-bold · 3 glyphs',
    recipe: { members: ['ckt_x_a', 'ckt_x_b', 'ckt_x_c'] },
  };

  const fam = R.familyFromSet(setObject);
  ok('a set becomes a family', fam.id, setObject.id);
  ok('members become urls, in order', fam.urls,
     ['/vault/objects/ckt_x_a/render.png',
      '/vault/objects/ckt_x_b/render.png',
      '/vault/objects/ckt_x_c/render.png']);
  ok('and it knows its count', fam.count, 3);

  // A member copied from a JPEG family is render.jpg: the index says so.
  const rows = [{ id: 'ckt_x_b', render: { file: 'render.jpg' } }];
  ok('a member is found by its own file when the index knows it',
     R.familyFromSet(setObject, rows).urls[1], '/vault/objects/ckt_x_b/render.jpg');
  ok('and render.png when it does not', R.familyFromSet(setObject, rows).urls[0], '/vault/objects/ckt_x_a/render.png');
  ok('a set with no members is not a family', R.familyFromSet({ recipe: {} }), null);
  ok('nor is nothing at all', R.familyFromSet(null), null);

  R.registerFamily(fam);
  ok('a registered family is offered',
     ids(R.availableManifestFamilies()).includes(setObject.id), true);
  ok('and is available without probing — its sprites just got written',
     R.isFamilyAvailable(setObject.id), true);

  // Registering twice replaces rather than duplicates: re-emitting a family
  // under the same id should update it, not give the picker two of them.
  R.registerFamily({ ...fam, urls: [...fam.urls, '/vault/objects/ckt_x_d/render.png'] });
  ok('re-registering replaces',
     R.allManifestFamilies().filter(f => f.id === setObject.id).length, 1);
  ok('with the new members', R.spriteCount(setObject.id), 4);
}

// It has to be selectable and loadable by the ordinary paths, or it is a
// family in name only.
{
  const id = 'ckt_1790000000000_aaa111';
  R.setSelectedFamilies([id]);
  ok('a vault family can be selected', ids(R.allFamilyMetas()), [id]);

  const seen = [];
  await R.loadSelected({
    loadImage(url, onLoad) { seen.push(url); onLoad({ url }); },
  });

  ok('it loads from the vault, not from a manifest path',
     seen[0], '/vault/objects/ckt_x_a/render.png');
  ok('all of its members', seen.length, 4);
  ok('and the sprites come back by index',
     R.getSprite(id, 2).url, '/vault/objects/ckt_x_c/render.png');
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
