/**
 * tests/vault-sync.mjs — run with: node tests/vault-sync.mjs
 *
 * Covers scripts/vault-sync.mjs's pack and take, with this machine's own tar
 * and no tailnet. The promises — a vault packed is a .tgz; taken into
 * another, the objects that one had not got are copied in, whole; its own
 * stay; one on both sides that differs is kept as it was; a dry take writes
 * nothing; a file holding no vault is refused, and nothing is left behind in
 * the temporary folder.
 */

import fs   from 'node:fs';
import os   from 'node:os';
import path from 'node:path';
import { spawnSync }     from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'vault-sync.mjs');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-sync-test-'));
/** An object folder: its envelope, and a render's bytes. */
const object = (vault, id, title) => {
  const dir = path.join(root, vault, 'objects', id);
  fs.mkdirSync(path.join(dir, 'versions'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'object.json'), JSON.stringify({ id, title, parents: [] }));
  fs.writeFileSync(path.join(dir, 'render.png'), Buffer.from([137, 80, 78, 71, title.length]));
  fs.writeFileSync(path.join(dir, 'versions', 'v1.json'), '{}');
};
object('tower', 'gam_1700000000001_aaaaaa', 'a still');
object('tower', 'vau_1700000000002_bbbbbb', 'a set, the tower\'s');
object('laptop', 'vau_1700000000002_bbbbbb', 'a set, the laptop\'s');
object('laptop', 'map_1700000000003_cccccc', 'a map');

const sync = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
const ids = vault => fs.readdirSync(path.join(root, vault, 'objects')).sort();
const title = (vault, id) => JSON.parse(fs.readFileSync(path.join(root, vault, 'objects', id, 'object.json'), 'utf8')).title;
const temps = () => fs.readdirSync(os.tmpdir()).filter(n => n.startsWith('skweeb-vault-take-')).length;

const before = temps();
const tgz = path.join(root, 'tower.tgz');
const packed = sync('pack', tgz, '--vault', path.join(root, 'tower'));
ok('packed: a .tgz of the vault', [packed.status, fs.existsSync(tgz) && fs.statSync(tgz).size > 100], [0, true]);

const dry = sync('take', tgz, '--vault', path.join(root, 'laptop'), '--dry');
ok('a dry take: said, nothing written', [dry.status, /would copy\s+1/.test(dry.stdout), ids('laptop')],
  [0, true, ['map_1700000000003_cccccc', 'vau_1700000000002_bbbbbb']]);

const took = sync('take', tgz, '--vault', path.join(root, 'laptop'));
ok('taken: the object it had not got copied in, its own kept', [took.status, ids('laptop')],
  [0, ['gam_1700000000001_aaaaaa', 'map_1700000000003_cccccc', 'vau_1700000000002_bbbbbb']]);
ok('…whole: its render, its versions', fs.readdirSync(path.join(root, 'laptop', 'objects', 'gam_1700000000001_aaaaaa')).sort(),
  ['object.json', 'render.png', 'versions']);
ok('…one on both sides that differs: kept as it was, and said', [title('laptop', 'vau_1700000000002_bbbbbb'), /differs \(kept\)\s+1/.test(took.stdout)],
  ['a set, the laptop\'s', true]);

fs.writeFileSync(path.join(root, 'nothing.txt'), 'no vault');
const empty = path.join(root, 'empty.tgz');
spawnSync(process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar',
  ['-czf', empty, '-C', root, 'nothing.txt']);
const refused = sync('take', empty, '--vault', path.join(root, 'laptop'));
ok('a file holding no vault: refused, and said why', [refused.status, /holds no vault/.test(refused.stderr)], [1, true]);
ok('…and nothing left in the temporary folder', temps(), before);

fs.rmSync(root, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
