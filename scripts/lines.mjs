#!/usr/bin/env node
/**
 * scripts/lines.mjs — rule 4 as a command: one concept per file, and how
 * long a file may grow.
 *
 *   node scripts/lines.mjs
 *
 * 400 lines is where a file is looked at, not where it is cut: past it, a
 * file is split along a seam it already has, or kept whole with its reason
 * written below, in `KEPT`. Past 600 it splits, whatever the reason. The
 * docs every session reads stay under 400: they cost every session its
 * context. The gamepad's four are known, and named apart, until it stands
 * on core's kit (C6 in `docs/plan.md`). Eased from a hard cap of 400 on
 * 2026-10-22, the author's call (`docs/decisions.md`).
 *
 * The files are git's own list (`git ls-files`), never a walk of the disk
 * (rule 3), less what is vendored — `core/libs/`, an app's `libs/` — and
 * less data: a manifest is generated, not read. A failure ends it with 1,
 * so the gate a branch passes before it lands can run it
 * (`docs/workflow.md`, *The gate*). A file new on the branch counts once
 * git knows it: `git add -N` it first.
 */

import { execFileSync } from 'node:child_process';
import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOOK = 400, SPLIT = 600;
const TEXT = /\.(js|mjs|css|html|md|cs|ps1|lua|cmd)$/;
const VENDORED = /^(core\/libs\/|apps\/[^/]+\/libs\/)/;

/** Read at the start of every session: under 400, no reason taken. */
const EVERY_SESSION = new Set(['CLAUDE.md', 'STATUS.md', 'docs/plan.md']);

/** Past 400 and kept whole, each with why: one line, the seam it does not have. */
const KEPT = new Map([
  ['scripts/check-3d.mjs', 'one model followed from the opening to its save: split, the save would build the model again'],
  ['apps/grid/main.js', 'one job, the params, their assets and one canvas kept in step (its head): every part reads the source, the tiles and the clock — split, the halves would share them'],
  ['core/VaultPanel.js', "one panel's state read by all it does — the chips, the grid, the detail; its parts are out already (vault-*.js): what is left would share `this`"],
]);

/** Past the cap and known: the gamepad's own panels and sketch, until C6 ports them. */
const LEGACY = new Set([
  'apps/gamepad/ui/hud.css',
  'apps/gamepad/sketch/gamepadSketch.js',
  'apps/gamepad/ui/TimelinePanel.js',
  'apps/gamepad/ui/ParamPanel.js',
]);

/** Its lines as an editor counts them; a file git lists but the disk has lost is none. */
const linesOf = file => {
  try {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    return text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  } catch {
    return 0;
  }
};

const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0').filter(f => TEXT.test(f) && !VENDORED.test(f));
const long = files.map(f => [linesOf(f), f]).filter(([n]) => n > LOOK).sort((a, b) => b[0] - a[0]);

const legacy = [], kept = [], faults = [];
for (const [n, f] of long) {
  if (LEGACY.has(f)) legacy.push(`${f} ${n}`);
  else if (EVERY_SESSION.has(f)) faults.push(`read by every session, past ${LOOK}: ${f} ${n} — cut it to what the next session needs`);
  else if (n > SPLIT) faults.push(`past ${SPLIT}: ${f} ${n} — it splits, along a seam it has`);
  else if (KEPT.has(f)) kept.push(`${f} ${n} — ${KEPT.get(f)}`);
  else faults.push(`past ${LOOK} with no reason: ${f} ${n} — split it along a seam it has, or say why in KEPT`);
}
const stale = [...KEPT.keys()].filter(f => linesOf(f) <= LOOK);

if (legacy.length) console.log(`known, until C6: ${legacy.join(' · ')}`);
for (const k of kept) console.log(`past ${LOOK}, kept whole: ${k}`);
for (const f of stale) console.log(`no longer past ${LOOK}, its reason can go from KEPT: ${f}`);
for (const f of faults) console.log(f);
console.log(faults.length ? `\n${faults.length} to look at` : 'every file within rule 4');
process.exit(faults.length ? 1 : 0);
