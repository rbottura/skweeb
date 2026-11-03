#!/usr/bin/env node
/**
 * scripts/vendor-lit.mjs — Lit into core/libs/lit/, one version.
 *
 *   node scripts/vendor-lit.mjs           # the version pinned below
 *   node scripts/vendor-lit.mjs 3.4.0     # an upgrade, made on purpose
 *
 * The suite's components — the shell the bench found, its pies, its graphs —
 * are custom elements written with Lit: the author's call, 2026-11-03
 * (docs/decisions.md, rule 8). Lit is standards, no build: its one-file
 * bundle, `lit-all.min.js`, is an ES module a page imports as it is, with its
 * directives (repeat, classMap, ref, live…). Like three.js it is a copy in
 * the repo, never fetched at run time: every app runs alone (rule 7).
 *
 * The components render into the page's own DOM — `createRenderRoot()`
 * returns the element — so theme.css draws them and the checks find their
 * classes; no shadow DOM.
 *
 * What it copies: the bundle from github.com/lit/dist through jsDelivr, and
 * the licence from the npm package. README.md beside them says what is
 * there, from where, and each file's sha256.
 */

import fs     from 'node:fs';
import path   from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'core', 'libs', 'lit');

/** The version the suite's components are written with. Changing it is an upgrade: run every check. */
const PINNED = '3.3.3';

const version = process.argv[2] || PINNED;
const FILES = [
  { name: 'lit-all.min.js', url: `https://cdn.jsdelivr.net/gh/lit/dist@${version}/all/lit-all.min.js` },
  { name: 'LICENSE', url: `https://cdn.jsdelivr.net/npm/lit@${version}/LICENSE` },
];

fs.mkdirSync(OUT, { recursive: true });
const rows = [];
for (const f of FILES) {
  const res = await fetch(f.url);
  if (!res.ok) throw new Error(`${f.url}: ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(OUT, f.name), bytes);
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  rows.push(`| \`${f.name}\` | ${bytes.length} | ${f.url} | \`${sha}\` |`);
  console.log(`${f.name}  ${bytes.length} bytes  ${sha.slice(0, 16)}…`);
}

fs.writeFileSync(path.join(OUT, 'README.md'), `# Lit ${version}

The suite's components are custom elements written with Lit (docs/decisions.md,
2026-11-03; CLAUDE.md, rule 8). One version, copied here by
\`scripts/vendor-lit.mjs\`, never fetched at run time. BSD-3-Clause, Google LLC —
\`LICENSE\`, and the bundle's own header.

    import { LitElement, html, css } from '../../core/libs/lit/lit-all.min.js';

A component renders into the page's DOM (\`createRenderRoot() { return this; }\`):
theme.css draws it, and the checks find its classes.

| file | bytes | from | sha256 |
|---|---|---|---|
${rows.join('\n')}
`);
console.log('core/libs/lit/ is Lit', version);
