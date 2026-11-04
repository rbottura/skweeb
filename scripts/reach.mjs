#!/usr/bin/env node
/**
 * scripts/reach.mjs — what a change reaches: the pages that load a file, and
 * so the browser checks that open them (C10, 2026-11-04).
 *
 *   node scripts/reach.mjs --since main     the checks the branch's changes reach, and why
 *
 * A page is an HTML file git lists — an app's index.html, the GPU kit's
 * check page — and it loads what it imports, all the way down: a module's
 * `import … from`, `export … from` and `import()` of a string, a
 * stylesheet's `@import`, a page's `<script src>`, `<link href>` and inline
 * imports. So a file reaches the pages whose imports, followed, come to it.
 * One door the imports do not show: core loads any app's `rebuild.js` by an
 * object's app (core/rebuild.js, reopen.js, fields.js), wherever the vault
 * panel can show an object — every page. So what an app's rebuild.js comes
 * to reaches every page.
 *
 * A check opens the pages its source names — `/apps/<app>/`,
 * `/scripts/<page>.html`; one that opens apps from a table of its own —
 * check-print, check-mount — or that names none, opens every page. Its own
 * file reaches it; the kit every check stands on (check-kit.mjs, chrome.mjs)
 * reaches them all. So do the server, the vendored libraries, the assets, a
 * file gone, and a file of no kind known: their reach is not read here.
 * The docs, the tests and the other scripts reach none.
 *
 * What changed is git's: the branch since it left `--since`, and the working
 * tree's changes to what git knows — a new file counts once `git add -N`
 * has told it, as rule 4's lines do. The files are git's list too (rule 3),
 * read as they stand; nothing walks the disk.
 */

import { execFileSync } from 'node:child_process';
import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const posix = path.posix;

/** Checks that open apps from a table of their own: every page is theirs. */
export const EVERY_PAGE = new Set(['print', 'mount']);

const CODE = /\.(m?js|css|html)$/;
const NOTHING = [/^docs\//, /\.md$/, /^tests\//, /^LICENSE$/, /^\.git/, /^scripts\/(?!check-|chrome\.mjs$).*\.(m?js|ps1|cs|cmd|lua)$/];
const ALL = [[/^scripts\/(check-kit|chrome)\.mjs$/, 'the kit every check stands on'], [/^server(\.js$|\/)/, 'the server'],
  [/^core\/libs\//, 'a vendored library'], [/^assets\//, "the suite's assets"]];

const JS = [
  /\bimport\s+(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"\n]+)['"]/g,      // import x from '…' · import '…'
  /\bexport\s+(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"]([^'"\n]+)['"]/g,
  /\bimport\(\s*(?:\/\*[\s\S]*?\*\/\s*)?['"]([^'"\n]+)['"]\s*\)/g,      // import('…'), a comment before it or not
];
const HTML = [/<script\b[^>]*\bsrc=["']([^"']+)["']/g, /<link\b[^>]*\bhref=["']([^"']+)["']/g];
const CSS = [/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)/g];

/** What one file imports, as written. */
function specifiers(file, text) {
  const kinds = file.endsWith('.css') ? CSS : file.endsWith('.html') ? [...HTML, ...JS] : JS;
  const out = [];
  for (const re of kinds) for (const m of text.matchAll(re)) out.push(m[1]);
  return out;
}

/** A specifier as a path from the repo's root, or null: a bare name, a URL, a folder. */
function resolve(from, spec) {
  const clean = spec.split(/[?#]/)[0];
  if (!clean || /^[a-z]+:/i.test(clean) || clean.endsWith('/')) return null;
  if (clean.startsWith('/')) return posix.normalize(clean.slice(1));
  if (clean.startsWith('./') || clean.startsWith('../')) return posix.normalize(posix.join(posix.dirname(from), clean));
  return null;
}

/**
 * Each file's imports, those git lists.
 *
 * @param {Map<string, ?string>} files  path → its text; null for a file that is not code
 * @returns {Map<string, Set<string>>}
 */
export function imports(files) {
  const edges = new Map();
  for (const [file, text] of files) {
    if (text == null || !CODE.test(file)) continue;
    const to = new Set();
    for (const spec of specifiers(file, text)) {
      const p = resolve(file, spec);
      if (p && p !== file && files.has(p)) to.add(p);
    }
    edges.set(file, to);
  }
  return edges;
}

/** Everything `start` loads, itself included. */
function closure(edges, start) {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) for (const next of edges.get(stack.pop()) || []) if (!seen.has(next)) { seen.add(next); stack.push(next); }
  return seen;
}

/** The pages a check's source names: `/apps/<app>/` by its longest part a page has, `/…/<page>.html`. */
function pagesNamed(source, pages) {
  const named = new Set();
  for (const m of source.matchAll(/\/apps\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)\//g)) {
    const parts = m[1].split('/');
    for (let n = parts.length; n > 0; n--) {
      const page = `apps/${parts.slice(0, n).join('/')}/index.html`;
      if (pages.has(page)) { named.add(page); break; }
    }
  }
  for (const m of source.matchAll(/\/((?:[a-z0-9-]+\/)*[a-z0-9-]+\.html)\b/g)) if (pages.has(m[1])) named.add(m[1]);
  return named;
}

/**
 * What the changes reach.
 *
 * @param {object} o
 * @param {Map<string, ?string>} o.files     every file git lists → its text (null if not code)
 * @param {{name: string, file: string, source: string}[]} o.checks  the browser checks
 * @param {string[]} o.changed               the paths that changed
 * @returns {{ checks: Map<string, string>, changes: {path: string, reach: string, why: string}[] }}
 *   each check reached → why; each change → 'all' | 'none' | the pages it reaches, and why
 */
export function reach({ files, checks, changed }) {
  const edges = imports(files);
  const pages = new Set([...files.keys()].filter(f => f.endsWith('.html') && !f.startsWith('core/libs/') && !f.startsWith('gallery/')));
  const loads = new Map([...pages].map(p => [p, closure(edges, p)]));
  const replayed = new Set();                    // what any app's rebuild.js comes to: every page's
  for (const f of files.keys()) if (/^apps\/[^/]+\/rebuild\.js$/.test(f)) for (const g of closure(edges, f)) replayed.add(g);
  const opens = new Map(checks.map(c => {
    const named = EVERY_PAGE.has(c.name) ? new Set() : pagesNamed(c.source, pages);
    return [c.name, named.size ? named : 'every'];
  }));

  const out = new Map();
  const take = (name, why) => { if (!out.has(name)) out.set(name, why); };
  const changes = [];
  for (const p of [...new Set(changed)].sort()) {
    const mine = checks.find(c => c.file === p);
    const all = ALL.find(([re]) => re.test(p));
    let reach, why;
    if (mine) { reach = mine.name; why = 'its own file'; take(mine.name, `${p}: its own file`); changes.push({ path: p, reach, why }); continue; }
    if (all) { reach = 'all'; why = all[1]; }
    else if (NOTHING.some(re => re.test(p))) { reach = 'none'; why = 'loaded by no page'; }
    else if (!files.has(p)) { reach = 'all'; why = 'gone: what loaded it is not known'; }
    else if (!CODE.test(p)) { reach = 'all'; why = 'a file of no kind known: fetched, maybe, by any page'; }
    else if (replayed.has(p)) { reach = 'all'; why = "an app's rebuild.js comes to it: every page can replay its objects"; }
    else {
      const hit = [...pages].filter(page => loads.get(page).has(p));
      reach = hit.length ? hit.join(' ') : 'none';
      why = hit.length ? 'loaded by ' + hit.map(h => h.replace(/\/index\.html$/, '').replace(/^apps\//, '')).join(', ') : 'loaded by no page';
      for (const c of checks) {
        const o = opens.get(c.name);
        const via = o === 'every' ? hit[0] : hit.find(h => o.has(h));
        if (via) take(c.name, `${p} → ${via.replace(/\/index\.html$/, '')}`);
      }
      changes.push({ path: p, reach, why });
      continue;
    }
    if (reach === 'all') for (const c of checks) take(c.name, `${p}: ${why}`);
    changes.push({ path: p, reach, why });
  }
  return { checks: out, changes };
}

// ── Git's side: the files, the checks, what changed ──────────────────────────

const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
const listed = (...patterns) => git(['ls-files', '-z', ...patterns]).split('\0').filter(Boolean);
const read = f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return null; } };

/** The browser checks git lists: `scripts/check-<name>.mjs`, the kit under them left out. */
export function browserChecks() {
  return listed('scripts/check-*.mjs').filter(f => !/check-kit\.mjs$/.test(f))
    .map(file => ({ name: path.basename(file, '.mjs').slice('check-'.length), file }));
}

/** The paths changed since `since` left the branch, and in the working tree, of what git knows. */
export function changedSince(since) {
  const lines = text => text.split('\n').map(s => s.trim()).filter(Boolean);
  return [...new Set([...lines(git(['diff', '--name-only', `${since}...HEAD`])), ...lines(git(['diff', '--name-only', 'HEAD']))])];
}

/** The checks the changes since `since` reach, read from this repo. */
export function reachedSince(since) {
  const files = new Map(listed().map(f => [f, CODE.test(f) && !f.startsWith('core/libs/') ? read(f) : null]));
  const checks = browserChecks().map(c => ({ ...c, source: read(c.file) || '' }));
  return { ...reach({ files, checks, changed: changedSince(since) }), all: checks.length };
}

/** Whether this file is the command run, not a module imported: a drive's letter may come in either case. */
export const ran = url => {
  const same = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
  return !!process.argv[1] && same(path.resolve(process.argv[1]), fileURLToPath(url));
};

if (ran(import.meta.url)) {
  const at = process.argv.indexOf('--since');
  const since = at > 0 ? process.argv[at + 1] : 'main';
  const { checks, changes, all } = reachedSince(since);
  console.log(`${changes.length} changed since ${since}, the working tree's with them:`);
  for (const c of changes) console.log(`  ${c.path.padEnd(44)} ${c.reach === 'all' ? 'every check' : c.reach === 'none' ? '—' : c.reach.replace(/\/index\.html/g, '')}  (${c.why})`);
  console.log(`\n${checks.size} of ${all} checks reached:`);
  for (const [name, why] of [...checks].sort()) console.log(`  ${name.padEnd(18)} ${why}`);
}
