#!/usr/bin/env node
/**
 * scripts/checks.mjs — the browser checks, several at a time; the gate in
 * one command (C10, 2026-11-04, the author's ask: "il y a t-il un moyen
 * d'accélérer le processus de check ?").
 *
 *   node scripts/checks.mjs                      every browser check
 *   node scripts/checks.mjs --since main         those the branch's changes reach (scripts/reach.mjs)
 *   node scripts/checks.mjs --gate --since main  the gate: the unit tests, rule 4's lines, then those
 *   node scripts/checks.mjs mount print          these, by name
 *     --jobs N      at a time; a third of the cores by default, one to four
 *     --no-again    a check that fails among others is not run again alone
 *
 * A check stands alone already — its own server on its own copy of the
 * vault, its own Chrome and profile (check-kit.mjs) — so several run at
 * once, the longest first, as long as each took here the last time. Under
 * the load of the others a check may fail for time and not for code: one
 * that fails among others is run again alone once they are done — passing
 * alone, it failed for the load, and says so; failing alone, it is red. The
 * verdict is the run alone's.
 *
 * Each check's whole output is kept in a folder of the OS's temp, named at
 * the end, and what each took in a file there, for the next run's order.
 * CHROME_FLAGS reaches every check as before. Ctrl C takes every check down,
 * its Chrome and its server with it. The unit tests run one after another:
 * all of them take seconds.
 */

import { spawn, spawnSync } from 'node:child_process';
import fs   from 'node:fs';
import os   from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserChecks, reachedSince } from './reach.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIMES = path.join(os.tmpdir(), 'skweeb-check-times.json');
const TIMEOUT_MS = 20 * 60 * 1000;       // a check stuck: taken down, red

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const named = args.filter((a, i) => !a.startsWith('--') && !['--since', '--jobs'].includes(args[i - 1]));
const jobs = Math.max(1, Number(option('--jobs')) || Math.min(4, Math.max(1, Math.floor(os.cpus().length / 3))));

const clock = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const running = new Set();

/** A child and everything it started — its Chrome, its server: on Windows a kill takes only the one. */
function takeDown(child) {
  if (child.exitCode != null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}
process.on('SIGINT', () => { for (const c of running) takeDown(c); process.exit(130); });

/** One script run to its end: its exit, its output kept, its oks and fails counted. */
function run(file, log) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [file], { cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    running.add(child);
    const out = log ? fs.createWriteStream(log) : null;
    let text = '', late = false;
    const take = chunk => { text += chunk; if (out) out.write(chunk); };
    child.stdout.setEncoding('utf8');        // a letter split between two chunks stays one
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    const timer = setTimeout(() => { late = true; takeDown(child); }, TIMEOUT_MS);
    child.on('close', code => {
      clearTimeout(timer);
      running.delete(child);
      if (out) out.end();
      const lines = text.split('\n');
      const fails = lines.filter(l => l.startsWith('FAIL '));
      resolve({ code, ms: Date.now() - t0, late, fails, oks: lines.filter(l => l.startsWith('ok ')).length,
                green: code === 0 && !fails.length && !late, text });
    });
  });
}

/** At most `n` at once, in the order given; `done` hears each as it ends. */
async function pool(items, n, start, done) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) { const it = queue.shift(); done(it, await start(it)); }
  }));
}

const lastTimes = () => { try { return JSON.parse(fs.readFileSync(TIMES, 'utf8')); } catch { return {}; } };
const keepTimes = took => { try { fs.writeFileSync(TIMES, JSON.stringify({ ...lastTimes(), ...took }, null, 1)); } catch { /* the order only */ } };

/** What a check's first lines of failure say, and where the rest is. */
const failed = (r, log) => [...r.fails.slice(0, 4), ...(r.fails.length > 4 ? [`… ${r.fails.length - 4} more`] : []),
  ...(r.late ? ['taken down: no end after ' + clock(TIMEOUT_MS)] : []),
  ...(!r.fails.length && !r.late ? [r.text.trim().split('\n').slice(-3).join('\n')] : []), `→ ${log}`];

// ── The gate's first two: the unit tests, rule 4 ─────────────────────────────

let red = 0;
if (flag('--gate')) {
  const tests = spawnSync('git', ['ls-files', '-z', 'tests/*.mjs'], { cwd: ROOT, encoding: 'utf8' }).stdout.split('\0').filter(Boolean);
  const t0 = Date.now();
  const broken = [];
  for (const t of tests) { const r = await run(t, null); if (!r.green) broken.push([t, r]); }
  console.log(`${broken.length ? 'FAIL' : 'ok  '}  the unit tests, ${tests.length} of them, in ${clock(Date.now() - t0)}`);
  for (const [t, r] of broken) console.log(`      ${t}\n` + r.text.trim().split('\n').slice(-4).map(l => '        ' + l).join('\n'));
  const lines = await run('scripts/lines.mjs', null);
  console.log(`${lines.green ? 'ok  ' : 'FAIL'}  rule 4's lines — ${lines.text.trim().split('\n').at(-1)}`);
  if (!lines.green) console.log(lines.text.trim().split('\n').filter(l => / no reason|past 600|over 400/.test(l)).map(l => '      ' + l).join('\n'));
  red += broken.length + (lines.green ? 0 : 1);
}

// ── Which checks ─────────────────────────────────────────────────────────────

const every = browserChecks();
let chosen = every;
if (named.length) {
  const unknown = named.filter(n => !every.some(c => c.name === n));
  if (unknown.length) { console.error(`no such check: ${unknown.join(', ')} — they are ${every.map(c => c.name).join(', ')}`); process.exit(2); }
  chosen = every.filter(c => named.includes(c.name));
} else if (option('--since')) {
  const since = option('--since');
  const { checks, changes } = reachedSince(since);
  chosen = every.filter(c => checks.has(c.name));
  console.log(`since ${since}: ${changes.length} changed, ${chosen.length} of ${every.length} checks reached`
    + (chosen.length ? ` — node scripts/reach.mjs --since ${since} says why` : ''));
}
if (!chosen.length) { console.log(red ? '\nred' : '\nnothing to check in a browser'); process.exit(red ? 1 : 0); }

// ── The checks, several at a time, the longest first ─────────────────────────

const times = lastTimes();
const size = c => { try { return fs.statSync(path.join(ROOT, c.file)).size; } catch { return 0; } };
// Never timed here: a check's length is guessed from its source's, so the long ones still go first.
const order = [...chosen].sort((a, b) => (times[b.name] ?? size(b) * 10) - (times[a.name] ?? size(a) * 10));
const logs = fs.mkdtempSync(path.join(os.tmpdir(), 'skweeb-checks-'));
const log = c => path.join(logs, c.name + '.log');
const t0 = Date.now();
const results = new Map();
const took = {};
console.log(`\n${chosen.length} browser check${chosen.length === 1 ? '' : 's'}, ${Math.min(jobs, chosen.length)} at a time, the longest first`);
await pool(order, jobs, c => run(c.file, log(c)), (c, r) => {
  results.set(c.name, r);
  took[c.name] = Math.round(r.ms);
  console.log(`  ${r.green ? 'ok  ' : 'FAIL'}  ${c.name.padEnd(18)} ${clock(r.ms).padStart(6)}   ${r.oks} ok${r.fails.length ? `, ${r.fails.length} failed` : ''}${r.late ? ', taken down' : ''}`);
});
const wall = Date.now() - t0;
const serial = [...results.values()].reduce((a, r) => a + r.ms, 0);     // what one after another would have taken

// Failed among the others: again, alone — the verdict is that run's.
const again = [...results].filter(([, r]) => !r.green).map(([name]) => chosen.find(c => c.name === name));
const verdict = new Map([...results].map(([name, r]) => [name, r.green ? 'green' : 'red']));
if (again.length && !flag('--no-again') && Math.min(jobs, chosen.length) > 1) {
  console.log(`\n${again.length} failed among the others — again, alone:`);
  for (const c of again) {
    const r = await run(c.file, log(c));
    took[c.name] = Math.round(r.ms);
    verdict.set(c.name, r.green ? 'load' : 'red');
    console.log(`  ${r.green ? 'ok  ' : 'FAIL'}  ${c.name.padEnd(18)} ${clock(r.ms).padStart(6)}   ${r.green ? 'green alone: it failed for the load' : 'red alone too'}`);
    if (!r.green) results.set(c.name, r);
  }
}
keepTimes(took);

// ── What it came to ──────────────────────────────────────────────────────────

const reds = [...verdict].filter(([, v]) => v === 'red').map(([n]) => n);
const loads = [...verdict].filter(([, v]) => v === 'load').map(([n]) => n);
for (const name of reds) console.log(`\nFAIL  ${name}\n` + failed(results.get(name), log({ name })).map(l => '      ' + l).join('\n'));
console.log(`\n${chosen.length} checks in ${clock(wall)}, ${clock(serial)} of work · `
  + (reds.length ? `${reds.length} red: ${reds.join(', ')}` : 'all green')
  + (loads.length ? ` · failed for the load, green alone: ${loads.join(', ')}` : '')
  + `\neach one's output: ${logs}`);
process.exit(reds.length || red ? 1 : 0);
