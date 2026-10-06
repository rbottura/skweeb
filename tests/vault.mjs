/**
 * tests/vault.mjs — run with: node tests/vault.mjs
 *
 * The vault API is the one part of this project that had been "checked" three
 * times and tested zero: each session wrote the same round trip by hand in a
 * scratchpad, read the output, and threw it away — twice leaving test objects
 * sitting in the real vault. This is that check, kept.
 *
 * It is the only suite that needs a server, so it brings its own: a throwaway
 * vault in the OS temp directory, `server.js` spawned against it on a free
 * port, and both removed at the end. It never touches yours. That is what
 * `--vault` was added for.
 *
 * It covers the envelope round trip, the dedup rule (bytes AND recipe — the
 * one that is easy to get subtly wrong), the four rejections, and the URLs
 * core/VaultPanel.js builds, because a wrong path there is a silent wall of
 * broken images rather than an error.
 */

import { spawn }         from 'node:child_process';
import net               from 'node:net';
import fs                from 'node:fs';
import os                from 'node:os';
import path              from 'node:path';
import zlib              from 'node:zlib';
import { fileURLToPath } from 'node:url';

const { crc32 } = await import('../core/export.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(48), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

// ── A real PNG, built here ───────────────────────────────────────────────────
// Generated rather than checked in, so the bytes are deterministic (dedup
// tests mean nothing otherwise) and the suite depends on no asset at all.

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function png(w, h, [r, g, b, a] = [0, 0, 0, 255]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type 6 = RGBA
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const row = y * (1 + w * 4);
    raw[row] = 0;                              // filter: none
    for (let x = 0; x < w; x++) {
      const p = row + 1 + x * 4;
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b; raw[p + 3] = a;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Bring up a server on a throwaway vault ───────────────────────────────────

const freePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});

const vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skweeb-vault-'));
const port     = await freePort();
const BASE     = 'http://127.0.0.1:' + port;

const child = spawn(process.execPath,
  [path.join(ROOT, 'server.js'), '--port', String(port), '--vault', vaultDir],
  { stdio: ['ignore', 'ignore', 'pipe'] });

let stderr = '';
child.stderr.on('data', d => { stderr += d; });

async function waitForServer(deadlineMs = 10000) {
  const until = Date.now() + deadlineMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(BASE + '/api/vault');
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('server never answered on ' + port + (stderr ? '\n' + stderr : ''));
}

// Counted before anything is written, so the last check can prove this suite
// left the real vault exactly as it found it.
const realObjects = path.join(ROOT, 'vault', 'objects');
const realBefore = fs.existsSync(realObjects) ? fs.readdirSync(realObjects).length : -1;

const post = async body => {
  const res = await fetch(BASE + '/api/vault', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { code: res.status, out: await res.json().catch(() => ({})) };
};

const renderPng = png(4, 4, [10, 20, 30, 255]);
const thumbPng  = png(2, 2, [40, 50, 60, 255]);

/** The envelope the gamepad's exporter assembles for a sequence. */
const sequence = (overrides = {}) => ({
  type: 'sequence',
  title: 'sweep 214 marks',
  tags: ['gamepad', 'loop'],
  origin: { app: 'gamepad', version: '1.0.0' },
  recipe: {
    clip: { window: { rule: 'sweep', widthSteps: 2 }, timing: { ticksPerSecond: 60, loop: true } },
    sequence: { w: 1920, h: 1080, events: [{ t: 0, x: 1 }, { t: 1, x: 2 }] },
    scale: 1,
  },
  seed: null,
  render: { ext: 'png', w: 860, h: 980, density: 1, frames: 428, fps: 60, loop: true,
            data: renderPng.toString('base64') },
  thumb: { ext: 'png', data: thumbPng.toString('base64') },
  ...overrides,
});

try {
  await waitForServer();

  // ── --vault actually moved the vault ───────────────────────────────────────
  ok('the throwaway vault was created', fs.existsSync(path.join(vaultDir, 'objects')), true);

  // ── Create ─────────────────────────────────────────────────────────────────
  const a = await post(sequence());
  const o = a.out.object;
  ok('create answers 201', a.code, 201);
  ok('status is created', a.out.status, 'created');
  ok('id is <app3>_<ms>_<rand6>', /^[a-z0-9]{1,8}_[0-9]{9,16}_[a-z0-9]{4,12}$/.test(o.id), true);
  ok('type kept', o.type, 'sequence');
  ok('title kept', o.title, 'sweep 214 marks');
  ok('tags kept', o.tags, ['gamepad', 'loop']);
  ok('origin kept', o.origin.app, 'gamepad');
  ok('render.file named for its ext', o.render.file, 'render.png');
  ok('render w/h kept', [o.render.w, o.render.h], [860, 980]);
  ok('render.frames kept', o.render.frames, 428);
  ok('render.fps kept', o.render.fps, 60);
  ok('render.loop kept', o.render.loop, true);
  ok('render.bytes is the real length', o.render.bytes, renderPng.length);
  ok('render.sha256 is 64 hex', /^[0-9a-f]{64}$/.test(o.render.sha256), true);
  ok('thumb written', o.thumb, 'thumb.png');
  ok('recipe kept whole', o.recipe.clip.window.rule, 'sweep');
  ok('seed null survives as null', o.seed, null);
  ok('parents defaults to empty', o.parents, []);
  ok('refs defaults to empty', o.refs, []);
  ok('published starts false', o.published, false);
  ok('created is an ISO instant', Number.isFinite(Date.parse(o.created)), true);

  // It landed in the throwaway vault, not beside the repo.
  ok('object.json is on disk where --vault said',
     fs.existsSync(path.join(vaultDir, 'objects', o.id, 'object.json')), true);

  // ── Dedup: bytes AND recipe ────────────────────────────────────────────────
  const twin = await post(sequence());
  ok('same bytes and recipe dedups', twin.out.status, 'duplicate');
  ok('dedup answers 200, not 201', twin.code, 200);
  ok('dedup returns the first object', twin.out.object.id, o.id);

  // A title is not identity: "the same bytes twice is a no-op whatever it is
  // named" — docs/object-model.md, Identity and dedup.
  const renamed = await post(sequence({ title: 'a different name' }));
  ok('a new title still dedups', renamed.out.status, 'duplicate');

  // Same pixels, different recipe, is a different object that shares a sha.
  const other = sequence();
  other.recipe = { ...other.recipe, scale: 4 };
  const sharesSha = await post(other);
  ok('a different recipe is a new object', sharesSha.out.status, 'created');
  ok('two objects may share a sha256', sharesSha.out.object.render.sha256, o.render.sha256);
  ok('but never an id', sharesSha.out.object.id === o.id, false);

  // ── Rejections ─────────────────────────────────────────────────────────────
  ok('no type is refused', (await post(sequence({ type: undefined }))).code, 400);
  ok('no render is refused', (await post(sequence({ render: undefined }))).code, 400);

  const lying = sequence();
  lying.render = { ...lying.render, data: Buffer.from('this is not a png').toString('base64') };
  ok('bytes that are not a png are refused', (await post(lying)).code, 400);

  const badExt = sequence();
  badExt.render = { ...badExt.render, ext: 'exe' };
  ok('an unsupported extension is refused', (await post(badExt)).code, 400);

  const empty = sequence();
  empty.render = { ...empty.render, data: '' };
  ok('an empty render is refused', (await post(empty)).code, 400);

  const badThumb = sequence();
  badThumb.thumb = { ext: 'png', data: Buffer.from('nope').toString('base64') };
  ok('a thumb that is not a png is refused', (await post(badThumb)).code, 400);

  // ── Reading back ───────────────────────────────────────────────────────────
  const list = await (await fetch(BASE + '/api/vault')).json();
  const row  = list.objects.find(r => r.id === o.id);
  ok('count matches the rows', list.count, list.objects.length);
  // Two creates and four dedups got this far, and six rejections came between
  // them: a refused POST must not leave a folder behind.
  ok('rejections wrote nothing', list.count, 2);
  ok('the object is in the index', !!row, true);
  ok('newest first', list.objects[0].created >= list.objects[1].created, true);

  // The row is what a gallery card is drawn from — and deliberately not more.
  ok('row carries render.file', row.render.file, 'render.png');
  ok('row carries the frame count', row.render.frames, 428);
  ok('row withholds the recipe', 'recipe' in row, false);
  ok('row withholds fps', 'fps' in row.render, false);

  const full = await (await fetch(BASE + '/api/vault/' + o.id)).json();
  ok('the envelope has the recipe', full.recipe.sequence.events.length, 2);
  ok('the envelope has fps', full.render.fps, 60);
  ok('an unknown id is 404', (await fetch(BASE + '/api/vault/gam_1789999999999_ffffff')).status, 404);

  // An id is only ever one folder name. Encoded, or fetch would normalise it
  // away before it ever reached the server.
  ok('a traversal id is refused',
     (await fetch(BASE + '/api/vault/..%2f..%2fserver.js')).status, 404);
  ok('a malformed id is refused', (await fetch(BASE + '/api/vault/not-an-id')).status, 404);

  // ── The URLs core/VaultPanel.js builds ─────────────────────────────────────
  const renderUrl = '/vault/objects/' + o.id + '/' + o.render.file;
  const thumbUrl  = '/vault/objects/' + o.id + '/' + o.thumb;

  const served = Buffer.from(await (await fetch(BASE + renderUrl)).arrayBuffer());
  ok('the render is served', served.length > 0, true);
  ok('the render is byte-exact', served.equals(renderPng), true);
  ok('it is served as a png',
     (await fetch(BASE + renderUrl)).headers.get('content-type'), 'image/png');
  ok('the thumb is served', (await fetch(BASE + thumbUrl)).status, 200);

  // Those URLs must follow --vault, or an app pointed at a moved vault shows
  // a grid of broken images and nothing throws.
  ok('/vault/ follows --vault', served.equals(
     fs.readFileSync(path.join(vaultDir, 'objects', o.id, 'render.png'))), true);

  // Moving the vault must not have moved anything else.
  ok('the repo is still served from ROOT',
     (await fetch(BASE + '/core/VaultPanel.js')).status, 200);
  ok('a missing vault file is 404',
     (await fetch(BASE + '/vault/objects/' + o.id + '/nope.png')).status, 404);

  // ── Tags change, and nothing else does ─────────────────────────────────────
  const patch = async (id, body) => {
    const res = await fetch(BASE + '/api/vault/' + id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { code: res.status, out: await res.json().catch(() => ({})) };
  };
  const onDisk = id => JSON.parse(fs.readFileSync(path.join(vaultDir, 'objects', id, 'object.json'), 'utf8'));

  const added = await patch(o.id, { add: ['use:material', 'loop'] });
  ok('a tag edit answers 200', added.code, 200);
  ok('status is updated', added.out.status, 'updated');
  ok('an added tag is appended, a present one kept once', added.out.object.tags, ['gamepad', 'loop', 'use:material']);
  const removed = await patch(o.id, { remove: ['gamepad'] });
  ok('a removed tag goes, the rest keep their order', removed.out.object.tags, ['loop', 'use:material']);
  ok('the edit is on disk', onDisk(o.id).tags, ['loop', 'use:material']);
  ok('the recipe is untouched', onDisk(o.id).recipe, full.recipe);
  ok('the render is untouched', onDisk(o.id).render, full.render);
  const relisted = await (await fetch(BASE + '/api/vault')).json();
  ok('the index follows', relisted.objects.find(r => r.id === o.id).tags, ['loop', 'use:material']);

  ok('anything but tags is refused', (await patch(o.id, { title: 'x' })).code, 400);
  ok('a whole tag list is refused — it is an edit', (await patch(o.id, { tags: ['a'] })).code, 400);
  ok('an empty edit is refused', (await patch(o.id, {})).code, 400);
  ok('a tag that is not a string is refused', (await patch(o.id, { add: [7] })).code, 400);
  ok('add must be a list', (await patch(o.id, { add: 'use:x' })).code, 400);
  ok('refusals changed nothing', onDisk(o.id).tags, ['loop', 'use:material']);
  ok('an unknown object is 404', (await patch('gam_1789999999999_ffffff', { add: ['x'] })).code, 404);
  ok('a malformed id is 404', (await patch('..%2fnope', { add: ['x'] })).code, 404);
  ok('POST on an object is refused',
     (await fetch(BASE + '/api/vault/' + o.id, { method: 'POST' })).status, 405);

  // A set's row carries its role — rows withhold the recipe, and core/uses.js
  // needs the role to know where an untouched set is offered.
  const set = await post(sequence({
    type: 'set', title: 'a family', tags: ['brush-family'],
    recipe: { members: [o.id], role: 'brush-family' },
    render: { ext: 'png', w: 3, h: 3, data: png(3, 3).toString('base64') },
  }));
  const rows = (await (await fetch(BASE + '/api/vault')).json()).objects;
  ok('a set row carries its role', rows.find(r => r.id === set.out.object.id).role, 'brush-family');
  ok('other rows carry none', 'role' in rows.find(r => r.id === o.id), false);
  const roleless = await post(sequence({
    type: 'set', title: 'no role', recipe: { members: [o.id] },
    render: { ext: 'png', w: 5, h: 5, data: png(5, 5).toString('base64') },
  }));
  const rows2 = (await (await fetch(BASE + '/api/vault')).json()).objects;
  ok('a set with no role carries null — not an older index', rows2.find(r => r.id === roleless.out.object.id).role, null);

  // ── Smart objects: the one object saved again (server/versions.js) ─────────
  const bound = rate => ({ kind: 'bound', app: 'particles', type: 'sequence', recipe: { emit: { rate } }, seed: null });
  const smartPng = rgb => ({ ext: 'png', w: 6, h: 6, data: png(6, 6, rgb).toString('base64') });
  const made = await post(sequence({ type: 'skw', title: 'smoke', origin: { app: 'particles', version: '1.0.0' },
    recipe: bound(90), render: smartPng([1, 2, 3, 255]) }));
  const skw = made.out.object;
  ok('a smart object: its id says so, version 1', [made.code, skw.id.startsWith('skw_'), skw.version], [201, true, 1]);
  const put = async (id, body) => {
    const res = await fetch(BASE + '/api/vault/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { code: res.status, out: await res.json().catch(() => ({})) };
  };
  // The pages hear which object took a new version, and which version.
  const stream = await fetch(BASE + '/api/vault/events');
  const reader = stream.body.getReader();
  let heard = '';
  const hearing = (async () => {
    const end = Date.now() + 5000;
    while (Date.now() < end && !heard.includes('"updated"')) {
      const { value, done } = await reader.read();
      if (done) break;
      heard += Buffer.from(value).toString('utf8');
    }
  })();
  const again = await put(skw.id, { recipe: bound(151), render: smartPng([9, 8, 7, 255]) });
  ok('saved again: version 2, the recipe it has now', [again.code, again.out.object.version, again.out.object.recipe.recipe.emit.rate], [200, 2, 151]);
  await hearing;
  reader.cancel().catch(() => {});
  const said = (heard.match(/"updated":(\{[^}]*\})/) || [])[1];
  ok('…and the pages hear which, and its version', said && JSON.parse(said), { id: skw.id, version: 2 });
  const v1 = await (await fetch(BASE + '/vault/objects/' + skw.id + '/versions/v1.json')).json();
  ok('what it was is kept as version 1', [v1.version, v1.recipe.recipe.emit.rate, v1.title], [1, 90, 'smoke']);
  const then = await fetch(BASE + '/vault/objects/' + skw.id + '/versions/' + v1.render.file);
  ok('…with its picture of then beside it', [then.status, Buffer.from(await then.arrayBuffer()).equals(png(6, 6, [1, 2, 3, 255]))], [200, true]);
  const now = await fetch(BASE + '/vault/objects/' + skw.id + '/' + again.out.object.render.file);
  ok('its picture is the new one', Buffer.from(await now.arrayBuffer()).equals(png(6, 6, [9, 8, 7, 255])), true);
  const smartRow = (await (await fetch(BASE + '/api/vault')).json()).objects.find(r => r.id === skw.id);
  ok('its row says its version, without opening it', smartRow.version, 2);
  ok('an ordinary object takes no version', (await put(o.id, { recipe: {}, render: smartPng([0, 0, 0, 255]) })).code, 409);
  ok('nor does one that is not there', (await put('skw_1700000000000_abcdef', { render: smartPng([0, 0, 0, 255]) })).code, 404);

  // ── Method routing ─────────────────────────────────────────────────────────
  ok('PUT on the collection is refused',
     (await fetch(BASE + '/api/vault', { method: 'PUT' })).status, 405);
  ok('an unknown api path is 404', (await fetch(BASE + '/api/nothing')).status, 404);

  // ── And it left the real vault alone ───────────────────────────────────────
  const realAfter = fs.existsSync(realObjects) ? fs.readdirSync(realObjects).length : -1;
  ok('your own vault was not touched', realAfter, realBefore);

} finally {
  child.kill();
  fs.rmSync(vaultDir, { recursive: true, force: true });
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
