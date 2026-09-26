/**
 * tests/delete.mjs — run with: node tests/delete.mjs
 *
 * The trash and the one way out of the vault (server/delete.js). Like
 * tests/vault.mjs it brings its own server on a throwaway vault, and never
 * touches yours.
 *
 * The vault it builds is small and has every kind of edge a delete must see:
 *
 *   A still ─┬─ member of S (a set, with B)
 *            ├─ placed on P (a composition, with C)
 *            └─ source of Q (a grid sequence) ── placed on R (a composition)
 *   D still, named by nothing
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
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(56), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

// ── A real PNG, a different one each call, so nothing dedups ────────────────

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

let shade = 0;
function png() {
  const w = 2, h = 2, ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(h * (1 + w * 4), ++shade);
  for (let y = 0; y < h; y++) raw[y * (1 + w * 4)] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ── A server on a throwaway vault ────────────────────────────────────────────

const freePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});

const vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skweeb-delete-'));
const port = await freePort();
const BASE = 'http://127.0.0.1:' + port;
const child = spawn(process.execPath, [path.join(ROOT, 'server.js'), '--port', String(port), '--vault', vaultDir],
  { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = '';
child.stderr.on('data', d => { stderr += d; });

const realObjects = path.join(ROOT, 'vault', 'objects');
const realBefore = fs.existsSync(realObjects) ? fs.readdirSync(realObjects).length : -1;

const call = async (method, url, body) => {
  const res = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { code: res.status, out: await res.json().catch(() => ({})) };
};
const make = async (type, title, { recipe = null, parents = [], app = 'grid' } = {}) =>
  (await call('POST', '/api/vault', { type, title, origin: { app, version: '1' }, recipe, parents,
    render: { ext: 'png', w: 2, h: 2, data: png().toString('base64') } })).out.object.id;
const get = async id => (await call('GET', '/api/vault/' + id)).out;
const trash = id => call('PATCH', '/api/vault/' + id, { add: ['trash'] });
const del = body => call('POST', '/api/vault/delete', body);
const gone = id => !fs.existsSync(path.join(vaultDir, 'objects', id));
const listed = async id => (await call('GET', '/api/vault')).out.objects.some(r => r.id === id);

try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(BASE + '/api/vault')).ok) break; } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 100));
    if (i === 99) throw new Error('server never answered' + (stderr ? '\n' + stderr : ''));
  }

  const A = await make('still', 'A');
  const B = await make('still', 'B');
  const C = await make('shape', 'C');
  const D = await make('still', 'D');
  const S = await make('set', 'S', { recipe: { members: [A, B], role: 'material' } });
  const P = await make('composition', 'P', { app: 'compose', parents: [A, C],
    recipe: { page: { format: 'a4' }, place: [{ ref: A, at: 0 }, { ref: C, at: 0 }] } });
  const Q = await make('sequence', 'Q', { parents: [A], recipe: { source: A, cell: 8 } });
  const R = await make('composition', 'R', { app: 'compose', parents: [Q],
    recipe: { page: { format: 'a4' }, place: [{ ref: Q, at: 0 }] } });

  // ── What is refused ────────────────────────────────────────────────────────
  ok('no ids is a 400', (await del({})).code, 400);
  ok('an id that is not one is a 400', (await del({ ids: ['../x'] })).code, 400);
  ok('an unknown dependents answer is a 400', (await del({ ids: [A], dependents: 'maybe' })).code, 400);
  ok('an object that is not there is a 404', (await del({ ids: ['gri_1234567890123_abcdef'] })).code, 404);
  const loose = await del({ ids: [A] });
  ok('only the trash can be deleted', [loose.code, loose.out.ids], [409, [A]]);
  ok('and A is still there', gone(A), false);
  ok('GET on the delete route is refused', (await call('GET', '/api/vault/delete')).code, 405);

  // ── The question, asked dry ────────────────────────────────────────────────
  await trash(A);
  const plan = await del({ ids: [A], dry: true });
  ok('a dry run answers with the plan', [plan.code, plan.out.status], [200, 'plan']);
  const byId = Object.fromEntries(plan.out.dependents.map(d => [d.title, d]));
  ok('who is made from A, directly', Object.keys(byId).sort(), ['P', 'Q', 'S']);
  ok('the chain goes on through Q to R', plan.out.chain.map(d => d.title).sort(), ['P', 'Q', 'R', 'S']);
  ok('S would lose a member', byId.S.loses, { members: 1 });
  ok('P would lose a placement', byId.P.loses, { placements: 1 });
  ok('Q would lose its recipe', byId.Q.loses, { recipe: true });
  ok('and the dry run did nothing', [gone(A), (await get(S)).recipe.members.length], [false, 2]);

  await trash(B);
  const both = await del({ ids: [A, B], dry: true });
  ok('a set left with nothing says so', both.out.dependents.find(d => d.title === 'S').loses, { members: 2, all: true });
  await call('PATCH', '/api/vault/' + B, { remove: ['trash'] });

  const asked = await del({ ids: [A] });
  ok('without an answer it asks', [asked.code, asked.out.status], [409, 'dependents']);

  // ── Cut loose ──────────────────────────────────────────────────────────────
  const cut = await del({ ids: [A], dependents: 'detach' });
  ok('detach deletes A alone', [cut.code, cut.out.deleted], [200, [A]]);
  ok('and cuts loose who named it', cut.out.detached.sort(), [S, P, Q].sort());
  ok('A has left the disk', gone(A), true);
  ok('and the index', await listed(A), false);

  const s = await get(S);
  ok('S is a set still, without A', s.recipe.members, [B]);
  ok('S says what it lost', [s.detached.length, s.detached[0].ids, s.detached[0].members], [1, [A], 1]);
  const p = await get(P);
  ok('P is a page still, without A', p.recipe.place.map(b => b.ref), [C]);
  ok('P made from C alone now', p.parents, [C]);
  ok('P says it lost a placement', p.detached[0].placements, 1);
  const q = await get(Q);
  ok('Q could not keep a recipe naming A', q.recipe, null);
  ok('Q keeps it set aside', q.detached[0].recipe, { source: A, cell: 8 });
  ok('Q made from nothing now', q.parents, []);
  ok('R is untouched: Q is still there', (await get(R)).parents, [Q]);

  // ── The chain goes too ─────────────────────────────────────────────────────
  await trash(C);
  const chain = await del({ ids: [C], dependents: 'delete' });
  ok('delete takes C and the page placing it', chain.out.deleted.sort(), [C, P].sort());
  ok('both have left the disk', [gone(C), gone(P)], [true, true]);
  ok('B, on a set of its own, stays', gone(B), false);

  await trash(Q);
  const deep = await del({ ids: [Q], dependents: 'delete' });
  ok('all the way down: Q and R', deep.out.deleted.sort(), [Q, R].sort());

  // ── Nothing to ask ─────────────────────────────────────────────────────────
  await trash(D);
  const plain = await del({ ids: [D] });
  ok('D, named by nothing, goes without a question', [plain.code, plain.out.deleted], [200, [D]]);
  const again = await call('POST', '/api/vault', { type: 'still', title: 'A', origin: { app: 'grid', version: '1' },
    render: { ext: 'png', w: 2, h: 2, data: png().toString('base64') } });
  ok('the vault still saves after', again.out.status, 'created');

  const realAfter = fs.existsSync(realObjects) ? fs.readdirSync(realObjects).length : -1;
  ok('your own vault was not touched', realAfter, realBefore);
} finally {
  child.kill();
  fs.rmSync(vaultDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
