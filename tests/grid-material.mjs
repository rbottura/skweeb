/**
 * tests/grid-material.mjs — run with: node tests/grid-material.mjs
 *
 * The material maker's arithmetic, with no canvas: how dark a tile reads on a
 * ground (tone.js), where a tile sits in its cell, the tray that keeps up to
 * twelve in order (tray.js), and the envelopes a legacy sprite and family get
 * in the vault (core/legacy.js) — which must dedup, and must stay out of the
 * gamepad's picker. And where paintField puts a tile at a sprite size, read off
 * a context that only records.
 */

const { toneOfPixels, groundRgb, fitInCell } = await import('../apps/grid/tone.js');
const { Tray, CAP } = await import('../apps/grid/tray.js');
const { legacyShape, legacySet } = await import('../core/legacy.js');
const { offers } = await import('../core/uses.js');
const { paintField } = await import('../apps/grid/grid.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(58), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};
const near = (a, b) => Math.abs(a - b) < 1e-9;

/** n pixels of one RGBA. */
const px = (n, rgba) => Array.from({ length: n }, () => rgba).flat();

// -- Tone --------------------------------------------------------------------

ok('ground: #rrggbb', groundRgb('#ff8000'), [255, 128, 0]);
ok('ground: none reads as paper', groundRgb('none'), [255, 255, 255]);
ok('an opaque white tile is 1', near(toneOfPixels(px(4, [255, 255, 255, 255]), '#000000'), 1), true);
ok('an opaque black tile is 0', near(toneOfPixels(px(4, [0, 0, 0, 255]), '#ffffff'), 0), true);
ok('a transparent tile is its ground', near(toneOfPixels(px(4, [0, 0, 0, 0]), '#ffffff'), 1), true);

// Half the cell black ink, half nothing: on white it is mid, on black it is black.
const halfInk = [...px(2, [0, 0, 0, 255]), ...px(2, [0, 0, 0, 0])];
ok('black ink on half a white cell reads 0.5', near(toneOfPixels(halfInk, '#ffffff'), 0.5), true);
ok('the same ink on a black ground reads 0', near(toneOfPixels(halfInk, '#000000'), 0), true);
ok('half-alpha white on black is half grey',
   Math.round(toneOfPixels(px(4, [255, 255, 255, 128]), '#000000') * 100), 50);

// -- A tile in its cell --------------------------------------------------------

ok('a square tile fills the cell exactly', fitInCell(500, 500), { x: 0, y: 0, w: 1, h: 1 });
ok('a wide one keeps its shape, centred', fitInCell(200, 100), { x: 0, y: 0.25, w: 1, h: 0.5 });
ok('a tall one likewise', fitInCell(100, 400), { x: 0.375, y: 0, w: 0.25, h: 1 });
ok('no size fills the cell', fitInCell(0, 0), { x: 0, y: 0, w: 1, h: 1 });

// -- Sprite size: where a tile is drawn -----------------------------------------

{
  /** Every drawImage, as [x, y, w, h] — the context does nothing else. */
  const paint = (tiles, size, indices = [0, 1, 0, 1]) => {
    const calls = [];
    const ctx = { drawImage: (img, x, y, w, h) => calls.push([x, y, w, h]) };
    paintField(ctx, { indices: Int16Array.from(indices), cols: 2, rows: 2, cell: 10, tiles,
                      offsetX: 3, offsetY: 5, ...(size === undefined ? {} : { size }) });
    return calls;
  };
  const square = { width: 500, height: 500 };
  const wide = { width: 363, height: 167 };     // odd fractions, as a real sprite's are
  // What paintField drew before sprite size existed — the replay promise.
  const before = (tiles, indices = [0, 1, 0, 1]) => indices.map((index, i) => {
    const f = fitInCell(tiles[index].width, tiles[index].height);
    const col = i % 2, row = Math.floor(i / 2);
    return [3 + (col + f.x) * 10, 5 + (row + f.y) * 10, f.w * 10, f.h * 10];
  });

  ok('sprite size 1 draws exactly what it drew before', paint([square, wide], 1), before([square, wide]));
  ok('and so does no sprite size at all', paint([square, wide]), before([square, wide]));
  ok('size 2: a square tile twice the cell, on its centre',
     paint([square], 2, [0])[0], [3 - 5, 5 - 5, 20, 20]);
  ok('size 0.5: half the cell, on its centre', paint([square], 0.5, [0])[0], [3 + 2.5, 5 + 2.5, 5, 5]);
  const [x, y, w, h] = paint([wide], 3, [0])[0];
  const f = fitInCell(363, 167);
  ok('a wide tile keeps its shape at any size', Math.abs(w / h - 363 / 167) < 1e-9, true);
  ok('and its centre stays the cell\'s',
     [Math.abs(x + w / 2 - (3 + 5)) < 1e-9, Math.abs(y + h / 2 - (5 + 5)) < 1e-9, Math.abs(w - f.w * 30) < 1e-9], [true, true, true]);
  ok('a nonsense size is 1', paint([square], -2, [0]), before([square], [0]));
}

// -- The tray ------------------------------------------------------------------

{
  const t = new Tray();
  const item = (key, tone) => ({ key, label: key, tone });
  t.add(item('mid', 0.5));
  t.add(item('dark', 0.1));
  t.add(item('light', 0.9));
  ok('the tray keeps light to dark', t.items.map(i => i.key), ['light', 'mid', 'dark']);
  ok('a second copy is refused', t.add(item('mid', 0.5)), false);

  t.move('dark', -1);
  ok('a hand move reorders', t.items.map(i => i.key), ['light', 'dark', 'mid']);
  ok('and turns the sort off', t.auto, false);
  t.add(item('white', 1));
  ok('an addition then goes on the end', t.items.map(i => i.key), ['light', 'dark', 'mid', 'white']);
  ok('a move off the end is refused', t.move('white', 1), false);

  t.resort();
  ok('Sort puts it back by tone, and on', [t.items.map(i => i.key), t.auto],
     [['white', 'light', 'mid', 'dark'], true]);

  // A new ground: black ink reads darker still, white brighter — here, flip them.
  t.retone(i => 1 - i.tone);
  ok('new tones re-sort while the sort is on', t.items.map(i => i.key), ['dark', 'mid', 'light', 'white']);

  ok('remove', [t.remove('mid'), t.items.length], [true, 3]);
  for (let i = 0; i < 20; i++) t.add(item('x' + i, i / 20));
  ok(`it holds ${CAP} at most`, [t.items.length, t.full], [CAP, true]);
  t.clear();
  ok('clear empties it and turns the sort on', [t.items.length, t.auto], [0, true]);
}

{
  const t = new Tray();
  t.add({ key: 'a', tone: 0.5 });
  t.add({ key: 'b', tone: 0.5 });
  t.add({ key: 'c', tone: 0.5 });
  ok('equal tones keep the order they came in', t.items.map(i => i.key), ['a', 'b', 'c']);
}

// -- Legacy sprites in the vault -----------------------------------------------

{
  const a = legacyShape('brushes', 7);
  ok('a legacy sprite is a shape', a.type, 'shape');
  ok('titled by its place in the family', a.title, 'brushes 7');
  ok('filed in its family\'s legacy folder', a.tags.includes('folder:legacy brushes'), true);
  ok('a leaf: nothing can redraw it', [a.recipe, a.seed], [null, null]);
  // Dedup is bytes AND recipe: every copy must carry the same recipe to be one object.
  ok('every copy carries the same recipe', JSON.stringify(legacyShape('brushes', 7).recipe), JSON.stringify(a.recipe));

  const s = { ...legacySet('brushes', ['m1', 'm2']), type: 'set' };
  ok('a legacy family keeps the D-pad order', s.recipe.members, ['m1', 'm2']);
  ok('is offered as a material', offers(s, 'material'), true);
  ok('and as sprites', offers(s, 'sprites'), true);
  ok('but not to the gamepad, which has the family already', offers(s, 'brushes'), false);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
