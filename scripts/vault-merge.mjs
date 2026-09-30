#!/usr/bin/env node
/**
 * scripts/vault-merge.mjs — one vault's objects, into another.
 *
 *   node scripts/vault-merge.mjs <from> [--into ~/skweeb-vault] [--dry]
 *
 * The suite keeps one vault, on the laptop that travels between the work PC
 * and the home tower; the pages on both save into it over the tailnet. What
 * each machine saved into its own `vault/` before that is brought over once,
 * with this. `<from>` is a vault folder, or its `objects/` folder.
 *
 * An id is `<app>_<ms>_<rand6>`, minted by the machine that saved it, so two
 * vaults never mint the same one: merging is copying the folders the target
 * has not got. Nothing in the target is ever overwritten or removed.
 *
 * Copied whole, `cache/` aside (docs/object-model.md: disposable), into a
 * hidden folder first and renamed into place, so a server running on the
 * target never reads half an object. Its index.json is rebuilt from disk by
 * the server on its next write or start — so restart it afterwards.
 *
 * Reported, not resolved:
 *   - the same id on both sides with a different object.json — tags retagged
 *     on one side, say. The target's is kept.
 *   - a twin: same render bytes and recipe under another id. On one vault
 *     that would have been a duplicate; both are kept, since other objects
 *     may name either id.
 *   - a parent or ref that neither vault has.
 */

import fs   from 'node:fs';
import os   from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const DRY  = argv.includes('--dry');
const from = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--into');
if (!from) {
  console.error('usage: node scripts/vault-merge.mjs <from> [--into ~/skweeb-vault] [--dry]');
  process.exit(2);
}

const home = p => p.replace(/^~(?=$|\/)/, os.homedir());
const objectsOf = dir => {
  const d = path.resolve(home(dir));
  return fs.existsSync(path.join(d, 'objects')) ? path.join(d, 'objects') : d;
};
const SRC = objectsOf(from);
const DST = objectsOf(argOf('--into', '~/skweeb-vault'));
if (!fs.existsSync(SRC)) { console.error('no such vault: ' + SRC); process.exit(2); }
if (path.resolve(SRC) === path.resolve(DST)) { console.error('a vault into itself'); process.exit(2); }

// Same rule as server.js safeId: an id is one folder name and nothing else.
const ID = /^[a-z0-9]{1,8}_[0-9]{9,16}_[a-z0-9]{4,12}$/;

/** id -> { raw, env } for every readable object folder in a vault. */
function read(dir) {
  const out = new Map();
  if (!fs.existsSync(dir)) return out;
  for (const id of fs.readdirSync(dir)) {
    if (!ID.test(id)) continue;
    try {
      const raw = fs.readFileSync(path.join(dir, id, 'object.json'), 'utf8');
      out.set(id, { raw, env: JSON.parse(raw) });
    } catch { /* not an object: skipped, and said so below */ }
  }
  return out;
}

// Keys sorted, so a recipe compares by content, as the server's dedup does.
const stable = v => v === null || typeof v !== 'object' ? JSON.stringify(v)
  : Array.isArray(v) ? '[' + v.map(stable).join(',') + ']'
  : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
const twinKey = e => (e.render && e.render.sha256) + '|' + stable(e.recipe === undefined ? null : e.recipe);

const src = read(SRC), dst = read(DST);
const skippedDirs = fs.readdirSync(SRC).filter(n => !src.has(n));
const byContent = new Map([...dst].map(([id, o]) => [twinKey(o.env), id]));

const copied = [], same = [], differ = [], twins = [];
for (const [id, o] of src) {
  const there = dst.get(id);
  if (there) { (there.raw === o.raw ? same : differ).push(id); continue; }
  const twin = byContent.get(twinKey(o.env));
  if (twin) twins.push([id, twin]);
  copied.push(id);
  if (DRY) continue;
  const tmp = path.join(DST, '.incoming-' + id);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.cpSync(path.join(SRC, id), tmp, {
    recursive: true,
    filter: p => path.relative(path.join(SRC, id), p).split(path.sep)[0] !== 'cache',
  });
  fs.renameSync(tmp, path.join(DST, id));
}

const known = new Set([...dst.keys(), ...copied]);
const missing = [];
for (const id of copied) {
  const e = src.get(id).env;
  for (const n of [...(e.parents || []), ...(e.refs || [])]) {
    const bare = String(n).split('@')[0];   // a flattened parent names `skw_…@v4`
    if (!known.has(bare)) missing.push([id, n]);
  }
}

const list = (label, rows) => {
  console.log(label.padEnd(38) + rows.length);
  for (const r of rows.slice(0, 20)) console.log('    ' + (Array.isArray(r) ? r.join('  ->  ') : r));
  if (rows.length > 20) console.log('    … and ' + (rows.length - 20) + ' more');
};
console.log((DRY ? 'DRY RUN — nothing written\n' : '') + 'from  ' + SRC + '\ninto  ' + DST + '\n');
list(DRY ? 'would copy' : 'copied', copied);
console.log('already there, identical'.padEnd(38) + same.length);
list('already there, differs (kept)', differ);
list('twins under another id (both kept)', twins);
list('names what neither vault has', missing);
if (skippedDirs.length) list('not an object, skipped', skippedDirs);
if (copied.length && !DRY) {
  console.log('\nThe index is rebuilt when the server next starts:  systemctl --user restart skweeb-vault');
}
