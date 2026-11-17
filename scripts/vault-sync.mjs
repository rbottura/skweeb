#!/usr/bin/env node
/**
 * scripts/vault-sync.mjs — two machines' vaults made one, over the tailnet.
 *
 *   node scripts/vault-sync.mjs send <machine>          # this vault, packed, sent to <machine> by Taildrop
 *   node scripts/vault-sync.mjs take [<file>] [--dry]   # the newest vault sent here, merged into this one
 *   node scripts/vault-sync.mjs pack [<file>]           # packed only — to carry some other way
 *   …  --vault <dir>     this machine's vault: ~/skweeb-vault if it is there, else the repo's vault/
 *
 * docs/guides/vault-share.md. Both ways is `send` on one machine and `take`
 * on the other, then the other way round. <machine> is a part of its name on
 * the tailnet — `tailscale status` lists them — so no machine's name is
 * written in the repo.
 *
 * The merging is scripts/vault-merge.mjs's: the objects this vault has not
 * got copied, nothing here overwritten or removed, an object on both sides
 * that differs kept and said. A pack is a .tgz of the vault's folder, made
 * and opened by the system's tar — on Windows its own tar.exe, as Git Bash's
 * would read a drive letter as a host. Taildrop is the tailnet's own
 * (`tailscale file`): Windows puts what it receives in Downloads; Linux keeps
 * it until `tailscale file get`, which wants root or the operator —
 * `sudo tailscale set --operator=$USER`, once. `take` asks for it, then looks
 * there and in Downloads. On the ThinkPad, the user service `skweeb-vault` is
 * restarted after a take: its index rebuilt, the new objects shown.
 */

import fs   from 'node:fs';
import os   from 'node:os';
import path from 'node:path';
import { spawnSync }     from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const DRY = argv.includes('--dry');
const [verb, what] = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--vault');

const home = p => p.replace(/^~(?=$|[\\/])/, os.homedir());
const isVault = dir => fs.existsSync(path.join(dir, 'objects'));
const VAULT = path.resolve(home(argOf('--vault',
  isVault(path.join(os.homedir(), 'skweeb-vault')) ? path.join(os.homedir(), 'skweeb-vault') : path.join(REPO, 'vault'))));
const TAR = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
const PREFIX = 'skweeb-vault-';
const ID = /^[a-z0-9]{1,8}_[0-9]{9,16}_[a-z0-9]{4,12}$/;      // scripts/vault-merge.mjs's, server.js's safeId

class Stop extends Error {}
const fail = text => { throw new Stop(text); };
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', ...opts });
const objectsIn = dir => (isVault(dir) ? fs.readdirSync(path.join(dir, 'objects')).filter(n => ID.test(n)).length : 0);
const mb = file => (fs.statSync(file).size / 1048576).toFixed(1) + ' MB';

/** This vault as a .tgz — its folder whole, under its own name. */
function pack(file) {
  if (!isVault(VAULT)) fail(`no vault at ${VAULT} — --vault <dir>`);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  const out = path.resolve(home(file || path.join(os.tmpdir(), `${PREFIX}${os.hostname().toLowerCase()}-${stamp}.tgz`)));
  const r = run(TAR, ['-czf', out, '-C', path.dirname(VAULT), path.basename(VAULT)], { stdio: 'inherit' });
  if (r.error || r.status !== 0) fail(`tar could not pack ${VAULT}${r.error ? ': ' + r.error.message : ''}`);
  console.log(`packed ${objectsIn(VAULT)} objects of ${VAULT}\n  -> ${out} (${mb(out)})`);
  return out;
}

/** The tailnet's machines, but this one. */
function peers() {
  const r = run('tailscale', ['status', '--json']);
  if (r.error) fail('no tailscale here: ' + r.error.message);
  try { return Object.values(JSON.parse(r.stdout).Peer || {}); } catch { return fail('tailscale status said nothing readable'); }
}

/** A machine of the tailnet by a part of its name: its name as Taildrop wants it. */
function machineOf(part) {
  const want = String(part).toLowerCase().replace(/:$/, '');
  const hits = peers().filter(p => String(p.HostName).toLowerCase().includes(want) || String(p.DNSName).toLowerCase().includes(want));
  if (!hits.length) fail(`no machine of the tailnet has "${part}" in its name — tailscale status lists them`);
  if (hits.length > 1) fail(`"${part}" names ${hits.length} machines (${hits.map(p => p.HostName).join(', ')}): say more of it`);
  if (!hits[0].Online) fail(`${hits[0].HostName} is asleep: wake it, then again`);
  return String(hits[0].DNSName).split('.')[0] || hits[0].HostName;
}

function send(part) {
  if (!part) fail('send it to which machine? A part of its name — tailscale status lists them');
  const machine = machineOf(part);
  const file = pack();
  try {
    console.log(`sending it to ${machine}…`);
    const r = run('tailscale', ['file', 'cp', file, machine + ':'], { stdio: 'inherit' });
    if (r.error || r.status !== 0) {
      fail(`tailscale could not send it to ${machine}` + (process.platform === 'linux' ? ' — refused here? once:  sudo tailscale set --operator=$USER' : ''));
    }
  } finally {
    fs.rmSync(file, { force: true });
  }
  console.log(`sent. On ${machine}, in the repo:  node scripts/vault-sync.mjs take`);
}

/** The newest pack sent here: what `tailscale file get` hands over, or Windows put in Downloads. */
function received() {
  const inbox = path.join(os.tmpdir(), 'skweeb-vault-inbox');
  fs.mkdirSync(inbox, { recursive: true });
  const r = run('tailscale', ['file', 'get', inbox]);
  if (process.platform === 'linux' && (r.error || r.status !== 0)) {
    console.log('tailscale keeps what was sent here for root or its operator — once:  sudo tailscale set --operator=$USER  then again');
  }
  const found = [inbox, path.join(os.homedir(), 'Downloads')]
    .flatMap(dir => (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter(n => n.startsWith(PREFIX) && n.endsWith('.tgz')).map(n => path.join(dir, n)))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return found[0] || null;
}

function take(file) {
  if (!isVault(VAULT)) fail(`no vault at ${VAULT} — --vault <dir>`);
  const tgz = file ? path.resolve(home(file)) : received();
  if (!tgz || !fs.existsSync(tgz)) {
    fail(file ? `no such file: ${file}` : `nothing sent here yet — on the other machine:  node scripts/vault-sync.mjs send ${os.hostname().toLowerCase()}`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skweeb-vault-take-'));
  try {
    const t = run(TAR, ['-xzf', tgz, '-C', dir], { stdio: 'inherit' });
    if (t.error || t.status !== 0) fail(`tar could not open ${tgz}`);
    const vaults = fs.readdirSync(dir).map(n => path.join(dir, n)).filter(isVault);
    if (vaults.length !== 1) fail(`${tgz} holds no vault`);
    console.log(`taking ${tgz} (${mb(tgz)}), ${objectsIn(vaults[0])} objects, into ${VAULT}\n`);
    const m = run(process.execPath, [path.join(REPO, 'scripts', 'vault-merge.mjs'), vaults[0], '--into', VAULT, ...(DRY ? ['--dry'] : [])],
      { stdio: 'inherit' });
    if (m.status !== 0) fail('the merge stopped');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  if (DRY) return;
  if (process.platform === 'linux' && run('systemctl', ['--user', 'is-active', '--quiet', 'skweeb-vault']).status === 0) {
    run('systemctl', ['--user', 'restart', 'skweeb-vault'], { stdio: 'inherit' });
    console.log('\nthe service skweeb-vault restarted: its index holds them');
  } else {
    console.log('\na server already running on this vault shows them once started again');
  }
}

try {
  if (verb === 'send') send(what);
  else if (verb === 'take') take(what);
  else if (verb === 'pack') pack(what);
  else {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(2, 8).map(l => l.replace(/^ \* ?/, '')).join('\n'));
    process.exit(verb ? 2 : 0);
  }
} catch (err) {
  if (!(err instanceof Stop)) throw err;
  console.error('vault-sync: ' + err.message);
  process.exit(1);
}
