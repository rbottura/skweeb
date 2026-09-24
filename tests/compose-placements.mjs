/**
 * tests/compose-placements.mjs — run with: node tests/compose-placements.mjs
 *
 * Covers apps/compose/placements.js: the list of what is on a page. Its
 * promises are about order and about time — bottom first, the page as long
 * as its longest loop, a still there throughout — and about loads that
 * finish in the wrong order: the newest ask wins, an entry taken off the
 * page never comes back through a load that was still running, and a handle
 * nobody holds is disposed. Objects here are stand-ins, opened when a test
 * says so.
 */

const { Placements } = await import('../apps/compose/placements.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(58), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

/** A stand-in for what core/rebuild.js hands back: it counts what it is asked. */
function fake(id, { length = 1, fps = 0, w = 100, h = 50, bounds = null } = {}) {
  const handle = {
    id, length, fps, loop: true, width: w, height: h, missing: [],
    bounds: bounds || { x: 0, y: 0, w, h },
    asked: [], disposed: false,
    frame(i) { handle.asked.push(i); return { id, i }; },
    dispose() { handle.disposed = true; },
  };
  return handle;
}

/** Loads that wait until a test lets them finish, in whatever order it likes. */
function gate(objects) {
  const waiting = [];
  const load = ref => new Promise((resolve, reject) => waiting.push({ ref, resolve, reject }));
  const finish = async ref => {
    const i = waiting.findIndex(w => w.ref === ref);
    const [w] = waiting.splice(i, 1);
    if (objects[ref]) w.resolve({ object: { id: ref, title: 'the ' + ref, type: objects[ref].type }, handle: objects[ref].make(), thumb: null });
    else w.reject(new Error('no object ' + ref));
    await new Promise(r => setTimeout(r, 0));
  };
  return { load, finish, waiting };
}

const block = (ref, x = 0) => ({ ref, version: 'latest', transform: { x, y: 0, scale: 1, rot: 0 }, at: 0, length: null });
const objects = {
  still: { type: 'still', make: () => fake('still') },
  pad:   { type: 'sequence', make: () => fake('pad', { length: 273, fps: 60, w: 1920, h: 945,
                                                        bounds: { x: 54, y: 67, w: 1812, h: 811 } }) },
  ckt:   { type: 'sequence', make: () => fake('ckt', { length: 180, fps: 30 }) },
};

// -- order, size, and the page's length ---------------------------------------
{
  const g = gate(objects);
  let changes = 0;
  const said = [];
  const list = new Placements({ load: g.load, onChange: () => changes++, say: t => said.push(t) });
  const a = list.add(block('still'));
  const b = list.add(block('pad'));
  const c = list.add(block('ckt'));
  ok('added on top: bottom first, as the page draws', list.items.map(p => p.block.ref), ['still', 'pad', 'ckt']);
  ok('an entry not yet open draws nothing', list.layers(0, 60), []);
  ok('and the page is one frame', list.frames(60), 1);
  await g.finish('ckt'); await g.finish('still'); await g.finish('pad');
  ok('each opens whatever order its object arrives in', [a, b, c].map(p => p.title), ['the still', 'the pad', 'the ckt']);
  ok('its size is its ink', b.size, { width: 1812, height: 811 });
  ok('something moves', list.moving, true);
  ok('the page lasts its longest loop: 180 at 30 fps is 360 at 60', list.frames(60), 360);
  ok('at 30 fps, 180 frames: 273 at 60 is only 137', list.frames(30), 180);
  ok('what the page draws, bottom first', list.layers(0, 60).map(l => l.image.id), ['still', 'pad', 'ckt']);
  ok('at page tick 300 each shows its own tick',
     list.layers(300, 60).map(l => l.image.i), [0, 300 % 273, 150]);
  ok('a still is there at every tick', list.layers(359, 60)[0].image, { id: 'still', i: 0 });
  list.layers(300, 60);
  const asked = c.handle.asked.length;
  list.layers(300, 60); list.layers(301, 60);   // 301 is still the 30 fps loop's tick 150
  ok('a tick is asked for once, however often it is drawn', c.handle.asked.length, asked);
  ok('the blocks are the recipe\'s place list', list.blocks().map(b => b.ref), ['still', 'pad', 'ckt']);
  ok('every change was heard', changes > 0, true);
  ok('nothing needed saying', said, []);
}

// -- edits, and loads that finish in the wrong order -------------------------
{
  const g = gate(objects);
  const said = [];
  const list = new Placements({ load: g.load, say: t => said.push(t) });
  const p = list.add(block('still'));
  await g.finish('still');
  const first = p.handle;
  list.update(p, block('still', 250));
  ok('a transform edited keeps its object open', p.handle === first && g.waiting.length === 0, true);
  ok('and the block is the edit', p.block.transform.x, 250);

  list.update(p, block('pad'));
  ok('another object: the old one is let go at once', first.disposed, true);
  list.update(p, block('ckt'));
  await g.finish('ckt');
  await g.finish('pad');                       // the older ask, arriving last
  ok('the newest ask wins', p.handle.id, 'ckt');
  ok('the late one is not kept', p.title, 'the ckt');

  const q = list.add(block('pad'));
  list.remove(q);
  await g.finish('pad');
  ok('taken off the page before it opened: gone', list.items.includes(q), false);
  ok('and its object disposed, not left open', q.handle, null);

  const r = list.add(block('nothing'));
  const warn = console.warn;
  console.warn = () => {};                     // the failure is expected; its warning is not news
  await g.finish('nothing');
  console.warn = warn;
  ok('an object that will not open says so', r.error, 'no object nothing');
  ok('in the bar', said.some(t => t.includes('could not open nothing')), true);
  ok('and the page draws the rest', list.layers(0, 60).map(l => l.image.id), ['ckt']);
  const s = p.handle;
  list.remove(p);
  ok('taken off, its object is disposed', s.disposed, true);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
