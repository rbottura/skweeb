/**
 * tests/3d-items.mjs — run with: node tests/3d-items.mjs
 *
 * Covers what the worm finds and carries (docs/worm.md, M16m):
 * apps/3d/play/items.js and finds.js, on three.js's core. The promises — an
 * item has a nature and is what it is: the vault's legacy brushes, by their
 * rows, or seventeen of the gamepad's own with no vault. Where they lie is
 * the seed's — the same seed the same brushes in the same places, another
 * another — never near what is to be kept clear, nor near one another; as
 * many as asked, no more than there are. Laid, a card and a ring each;
 * walked near, the nearest taken, its card gone; out of reach, none. What
 * the worm carries holds them in the order found, knows what it holds, and
 * gives one up.
 */

const { NATURES, LEGACY, itemOf, brushesOf, strew, Inventory } = await import('../apps/3d/play/items.js');
const { Finds } = await import('../apps/3d/play/finds.js');
const { Vector3 } = await import('../core/libs/three/three.core.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

// ── An item ─────────────────────────────────────────────────────────────────

const rows = [
  { id: 'gam_1', title: 'brushes 55', type: 'shape', tags: [LEGACY], render: { file: 'render.png' }, thumb: 'thumb.webp' },
  { id: 'gam_2', title: 'brushes 56', type: 'shape', tags: [LEGACY], render: { file: 'render.png' } },
  { id: 'gam_3', title: 'no picture', type: 'shape', tags: [LEGACY] },
];
{
  const vaulted = brushesOf(rows);
  ok('a brush: its nature, what it is, its picture, a small one', [vaulted.length, vaulted[0]], [2, { nature: 'brush', id: 'gam_1',
    title: 'brushes 55', picture: '/vault/objects/gam_1/render.png', thumb: '/vault/objects/gam_1/thumb.webp' }]);
  ok('…its small picture its picture when it has none', vaulted[1].thumb, '/vault/objects/gam_2/render.png');
  const own = brushesOf([]);
  ok('no vault: seventeen of the gamepad\'s own brushes', [own.length, own.every(b => b.nature === 'brush' && !b.id),
    /gamepad_sprites\/brushes\/sprite\(1\)\.png$/.test(own[0].picture)], [17, true, true]);
  ok('a brush is for drawing with', typeof NATURES.brush, 'string');
  ok('an item of no vault object', itemOf('brush', { title: 'x', picture: 'p.png' }), { nature: 'brush', id: null, title: 'x', picture: 'p.png', thumb: 'p.png' });
}

// ── Where they lie ──────────────────────────────────────────────────────────

const brushes = brushesOf([]);
const avoid = [new Vector3(0, 1, 0), new Vector3(1, 0, 0), new Vector3(0, 0, -1)];
{
  const a = strew(brushes, 5, 7, { avoid, clear: 0.3 }), b = strew(brushes, 5, 7, { avoid, clear: 0.3 }), c = strew(brushes, 5, 8, { avoid, clear: 0.3 });
  const key = list => list.map(x => x.item.title + x.up.toArray().map(n => n.toFixed(6)).join()).join('|');
  ok('as many as asked, each a way up', [a.length, a.every(x => Math.abs(x.up.length() - 1) < 1e-9)], [5, true]);
  ok('the same seed: the same brushes in the same places; another, another', [key(a) === key(b), key(a) === key(c)], [true, false]);
  ok('none near what is kept clear, nor near one another', a.every((x, i) => avoid.every(d => x.up.angleTo(d) > 0.3)
    && a.every((y, j) => i === j || x.up.angleTo(y.up) > 0.3)), true);
  ok('no more than there are; none asked, none', [strew(brushes.slice(0, 2), 5, 7).length, strew(brushes, 0, 7).length], [2, 0]);
}

// ── On the ground, taken, carried ───────────────────────────────────────────

{
  const R = 24, strewn = strew(brushes, 3, 1, { avoid, clear: 0.3 }), finds = new Finds().lay(strewn, { radius: R, size: 1 });
  ok('laid: a card and a ring each, on the ground', [finds.group.children.length, finds.lying.every(l => Math.abs(l.ring.position.length() - R) < 0.1)],
     [6, true]);
  finds.update(0.5, new Vector3(0, 40, 0));
  ok('…each card standing over where it lies', finds.lying.every(l => l.card.position.clone().normalize().angleTo(l.up) < 1e-9
    && l.card.position.length() > R + 0.4), true);
  const at = strewn[1].up.clone().multiplyScalar(R), far = strewn[1].up.clone().applyAxisAngle(new Vector3(1, 0, 0).cross(strewn[1].up).normalize(), 2 / R).multiplyScalar(R);
  ok('out of reach: none taken', [finds.take(far, 0.6), finds.lying.length], [null, 3]);
  const got = finds.take(at.clone().add(new Vector3(0.1, 0, 0)), 0.6);
  ok('walked near: the nearest taken, its card gone', [got && got.title, finds.lying.length, finds.group.children.length], [strewn[1].item.title, 2, 4]);
  const bag = new Inventory().add(got).add(null).add(finds.take(strewn[0].up.clone().multiplyScalar(R), 0.6));
  ok('carried, in the order found, nothing for nothing', [bag.count, bag.items.map(i => i.title)], [2, [strewn[1].item.title, strewn[0].item.title]]);
  ok('…it knows what it holds', [bag.has(got), bag.has(strewn[2].item), bag.has({ ...got })], [true, false, true]);
  ok('…and gives one up', [bag.take(0).title, bag.count, bag.take(5)], [strewn[1].item.title, 1, null]);
  finds.dispose();
  ok('let go of: nothing on the ground', [finds.lying.length, finds.group.children.length], [0, 0]);
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
