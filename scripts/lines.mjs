#!/usr/bin/env node
/**
 * scripts/lines.mjs — rule 4 as a command: every file git keeps that is code
 * or prose, past 400 lines.
 *
 *   node scripts/lines.mjs
 *
 * The files are git's own list (`git ls-files`), never a walk of the disk
 * (rule 3), less what is vendored — `core/libs/`, an app's `libs/` — and
 * less data: a manifest is generated, not read. The gamepad's four are known
 * and named apart until it stands on core's kit (C6 in `docs/plan.md`); any
 * other file past the cap fails, so the gate a branch passes before it lands
 * can run this (`docs/workflow.md`, *The gate*).
 */

import { execFileSync } from 'node:child_process';
import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAP = 400;
const TEXT = /\.(js|mjs|css|html|md|cs|ps1|lua|cmd)$/;
const VENDORED = /^(core\/libs\/|apps\/[^/]+\/libs\/)/;
/** Past the cap, and known: the gamepad's own panels and sketch, until C6 ports them. */
const KNOWN = new Set([
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
const past = files.map(f => [linesOf(f), f]).filter(([n]) => n > CAP).sort((a, b) => b[0] - a[0]);
const known = past.filter(([, f]) => KNOWN.has(f));
const unknown = past.filter(([, f]) => !KNOWN.has(f));

if (known.length) console.log(`known, until C6: ${known.map(([n, f]) => `${f} ${n}`).join(' · ')}`);
for (const [n, f] of unknown) console.log(`past the cap: ${f} ${n}`);
console.log(unknown.length ? `\n${unknown.length} past ${CAP} lines` : `no other file past ${CAP} lines`);
process.exit(unknown.length ? 1 : 0);
