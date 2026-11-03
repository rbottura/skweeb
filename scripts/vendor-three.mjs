#!/usr/bin/env node
/**
 * scripts/vendor-three.mjs — three.js into core/libs/three/, one version.
 *
 *   node scripts/vendor-three.mjs            # the version pinned below
 *   node scripts/vendor-three.mjs 0.187.0    # an upgrade, made on purpose
 *
 * The 3D app (apps/3d/) draws with three.js's WebGPU renderer, on the page's
 * one GPU device (core/gpu/device.js) — the author's call, 2026-10-06
 * (docs/decisions-2026-10-06-to-20.md). Like p5 it is a copy in the repo, never fetched at
 * runtime: every app runs alone (rule 7), and three releases once a month,
 * each free to change what a recipe draws. An upgrade is this script, then
 * `node scripts/check-3d.mjs`.
 *
 * What it copies, from npm through jsDelivr: the WebGPU build — three.webgpu.js
 * and the three.core.js it imports — its licence, and the add-ons in ADDONS,
 * from examples/jsm/. An add-on imports three by a bare name, 'three' or
 * 'three/webgpu', which a browser resolves only through an import map, and
 * every page that might replay a model would need one; so those imports are
 * rewritten to the build's path, and each add-on gets a licence line at its
 * head (rule 5). README.md beside them says what is there, from where, and
 * each file's sha256.
 */

import fs     from 'node:fs';
import path   from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'core', 'libs', 'three');

/** The version the suite draws with. Changing it is an upgrade: run the checks. */
const PINNED = '0.186.1';

/** The build: three.webgpu.js imports './three.core.js', so the two travel together. */
const BUILD = ['three.core.js', 'three.webgpu.js'];

/** Add-ons from examples/jsm/, as `<folder>/<file>`: the handles on a chosen shape (apps/3d/handles.js). */
const ADDONS = ['controls/TransformControls.js'];

const version = process.argv[2] || PINNED;
const cdn = file => `https://cdn.jsdelivr.net/npm/three@${version}/${file}`;

async function fetchText(file) {
  const res = await fetch(cdn(file));
  if (!res.ok) throw new Error(`${cdn(file)}: ${res.status} ${res.statusText}`);
  return res.text();
}

/** An add-on's bare imports, pointed at the build from where the add-on sits. */
export function rewriteImports(source, depth) {
  const up = '../'.repeat(depth);
  return source
    .replace(/from\s+(['"])three(\/webgpu)?\1/g, `from '${up}three.webgpu.js'`)
    .replace(/from\s+(['"])three\/tsl\1/g, `from '${up}three.tsl.js'`)
    .replace(/from\s+(['"])three\/addons\/([^'"]+)\1/g, `from '${up}addons/$2'`);
}

/** The local date: a session past midnight is the day its author is living. */
const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const sha = text => crypto.createHash('sha256').update(text).digest('hex');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const rows = [];

  for (const file of BUILD) {
    const text = await fetchText('build/' + file);
    if (!/SPDX-License-Identifier:\s*MIT/.test(text.slice(0, 400))) throw new Error(`${file} carries no MIT header — stopping (rule 5)`);
    fs.writeFileSync(path.join(OUT, file), text);
    rows.push({ file, from: 'build/' + file, bytes: Buffer.byteLength(text), sha: sha(text) });
  }

  const licence = await fetchText('LICENSE');
  fs.writeFileSync(path.join(OUT, 'LICENSE'), licence);

  for (const addon of ADDONS) {
    const from = 'examples/jsm/' + addon;
    const head = `// three.js ${version}, ${from} — MIT, Copyright 2010-2026 Three.js Authors (LICENSE beside the build).\n`
      + '// Bare imports rewritten to the build by scripts/vendor-three.mjs.\n';
    const text = head + rewriteImports(await fetchText(from), addon.split('/').length);
    const to = path.join(OUT, 'addons', addon);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, text);
    rows.push({ file: 'addons/' + addon, from, bytes: Buffer.byteLength(text), sha: sha(text) });
  }

  const table = rows.map(r => `| \`${r.file}\` | \`${r.from}\` | ${(r.bytes / 1024).toFixed(0)} KB | \`${r.sha.slice(0, 16)}…\` |`).join('\n');
  fs.writeFileSync(path.join(OUT, 'README.md'), `# three.js ${version}

The 3D app's renderer (\`apps/3d/\`, M10), copied from npm through jsDelivr by
\`node scripts/vendor-three.mjs\` on ${today()}. MIT — \`LICENSE\`; the build's
files carry the licence in their heads, an add-on in its first line (rule 5).

One version, never fetched at runtime (rule 7). An upgrade is the script with
the version it wants, then \`node scripts/check-3d.mjs\`: three releases monthly
and may change what a recipe draws.

| file | from | size | sha256 |
|---|---|---|---|
${table}

Only \`apps/3d/\` imports these. \`three.webgpu.js\` is the WebGPU renderer and
everything \`three.core.js\` has; geometry and scenes can import
\`three.core.js\` alone, which Node runs too (\`tests/3d-*.mjs\`).
`);

  for (const r of rows) console.log(`${r.file.padEnd(28)} ${(r.bytes / 1024).toFixed(0).padStart(6)} KB  ${r.sha.slice(0, 16)}`);
  console.log(`three ${version} → ${path.relative(ROOT, OUT)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err.message); process.exit(1); });
}
