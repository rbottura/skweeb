#!/usr/bin/env node
/**
 * scripts/vendor-mediapipe.mjs — MediaPipe's face landmarker into
 * core/libs/mediapipe/, one version, on this machine.
 *
 *   node scripts/vendor-mediapipe.mjs           # the version pinned below
 *   node scripts/vendor-mediapipe.mjs 1.1.1     # an upgrade, made on purpose
 *
 * The rig's puppet (apps/rig/puppet/) reads the author's face from the
 * camera with MediaPipe's Face Landmarker: 478 points a frame, in the page,
 * on the GPU where there is one. Like three it is a copy, never fetched at
 * runtime (rule 7) — but most of it is binary, the WASM 11.8 MB and the
 * model 3.8 MB, so git keeps only the README.md this writes (rule 6) and
 * each machine runs this once, as the heavy sprite families are copied in
 * by hand. The puppet says so when they are not there.
 *
 * What it copies: from npm through jsDelivr, `@mediapipe/tasks-vision` —
 * its ES module bundle, and the SIMD WASM with its loader (every browser
 * the suite runs in has SIMD; the build without is 11 MB more for none of
 * them); from Google's model bucket, `face_landmarker.task` — three models
 * in one bundle, a face detector, Face Mesh V2 and Blendshape V2. All
 * Apache-2.0: the package says so in its package.json, which is checked
 * here, and the three model cards each say "Licensed under Apache License,
 * Version 2.0" (read 2026-10-21). LICENSE is the licence's own text.
 */

import fs     from 'node:fs';
import path   from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'core', 'libs', 'mediapipe');

/** The version the puppet reads faces with. Changing it is an upgrade: run the checks. */
const PINNED = '1.0.1';

/** From the package, as `<its path>`: the bundle imports nothing; the loader fetches the WASM beside it. */
const FILES = ['vision_bundle.mjs', 'wasm/vision_wasm_internal.js', 'wasm/vision_wasm_internal.wasm'];

/** The model, versioned apart from the package: float16, its first version. */
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/** The model cards, each read for its licence. */
const CARDS = [
  'https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf',
  'https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf',
  'https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf',
];

const LICENCE = 'https://www.apache.org/licenses/LICENSE-2.0.txt';

const version = process.argv[2] || PINNED;
const cdn = file => `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${version}/${file}`;

async function fetched(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

/** The local date: a session past midnight is the day its author is living. */
const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const size = bytes => (bytes > 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`);

async function main() {
  const pkg = JSON.parse((await fetched(cdn('package.json'))).toString('utf8'));
  if (pkg.license !== 'Apache-2.0') throw new Error(`@mediapipe/tasks-vision ${version} says its licence is ${pkg.license} — stopping (rule 5)`);

  const rows = [];
  const keep = (file, from, buf) => {
    const to = path.join(OUT, file);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, buf);
    rows.push({ file, from, bytes: buf.length, sha: sha(buf) });
  };
  for (const file of FILES) keep(file, `npm:@mediapipe/tasks-vision@${version}/${file}`, await fetched(cdn(file)));
  keep('face_landmarker.task', MODEL.replace('https://storage.googleapis.com/', ''), await fetched(MODEL));
  fs.writeFileSync(path.join(OUT, 'LICENSE'), await fetched(LICENCE));

  const table = rows.map(r => `| \`${r.file}\` | \`${r.from}\` | ${size(r.bytes)} | \`${r.sha.slice(0, 16)}…\` |`).join('\n');
  const cards = CARDS.map(u => `- ${decodeURIComponent(u.split('/').pop())}: <${u}>`).join('\n');
  fs.writeFileSync(path.join(OUT, 'README.md'), `# MediaPipe tasks-vision ${version} — the face landmarker

The rig's puppet reads the author's face with it (\`apps/rig/puppet/face.js\`),
copied by \`node scripts/vendor-mediapipe.mjs\` on ${today()}.

**Git keeps this file only** (rule 6): the WASM and the model are binaries,
${size(rows.reduce((n, r) => n + r.bytes, 0))} together, and \`.gitignore\` keeps the folder out but for this
README. Each machine runs the script once; with nothing here the puppet opens
and says so (rule 7). One version, never fetched at runtime.

| file | from | size | sha256 |
|---|---|---|---|
${table}

**Licence: Apache-2.0**, all of it — \`LICENSE\` beside these. The package
says so in its \`package.json\` (checked by the script); the model bundle is
three models, and each one's card says "Licensed under Apache License,
Version 2.0" (read 2026-10-21):

${cards}

An upgrade is the script with the version it wants, then
\`node scripts/check-puppet.mjs\` and the author's own face in front of it.
`);

  for (const r of rows) console.log(`${r.file.padEnd(32)} ${size(r.bytes).padStart(8)}  ${r.sha.slice(0, 16)}`);
  console.log(`@mediapipe/tasks-vision ${version} and the face landmarker → ${path.relative(ROOT, OUT)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err.message); process.exit(1); });
}
