#!/usr/bin/env node
/**
 * scripts/generate-grid-manifest.js
 *
 * Scans apps/grid/materials/ and writes apps/grid/material-manifest.json.
 * Each subdirectory of images is one **ramp**: an ordered run of tiles from
 * light to dark, which is what grid maps a source image's luminance onto.
 *
 * Order is the whole point, and it is the thing a directory listing gets
 * wrong. `tile1, tile10, tile2` is the alphabetical order and it is not the
 * ramp — put the members in that order and the dither comes out scrambled in
 * a way that still looks like a texture, so nobody notices it is wrong. The
 * files carry unpadded numbers, so this sorts on the number.
 *
 * Run from the project root:
 *   node scripts/generate-grid-manifest.js
 */

const fs   = require('fs');
const path = require('path');

const MATERIALS = path.join(__dirname, '..', 'apps', 'grid', 'materials');
const OUTPUT    = path.join(__dirname, '..', 'apps', 'grid', 'material-manifest.json');
const IMAGE_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg']);

/** Trailing number in a filename, or -1 — `tile10` after `tile2`. */
function ordinal(name) {
  const m = /(\d+)(?=\D*$)/.exec(path.basename(name, path.extname(name)));
  return m ? parseInt(m[1], 10) : -1;
}

function rampsIn(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const files = fs.readdirSync(path.join(dir, entry.name))
        .filter(f => IMAGE_EXT.has(path.extname(f).toLowerCase()))
        .sort((a, b) => ordinal(a) - ordinal(b) || a.localeCompare(b));

      return {
        id: entry.name,
        label: entry.name.charAt(0).toUpperCase() + entry.name.slice(1),
        count: files.length,
        files: files.map(f => 'materials/' + entry.name + '/' + f),
      };
    })
    .filter(ramp => ramp.count > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
}

const ramps = rampsIn(MATERIALS);

if (!ramps.length) {
  console.error('no material ramps under ' + MATERIALS);
  console.error('grid needs at least one to boot. `trames` and `tiles` are committed.');
  process.exit(1);
}

fs.writeFileSync(OUTPUT, JSON.stringify({
  generated: new Date().toISOString(),
  ramps,
}, null, 1) + '\n');

console.log('wrote ' + path.relative(process.cwd(), OUTPUT));
for (const ramp of ramps) {
  console.log('  ' + ramp.id.padEnd(10) + ramp.count + ' steps   '
    + path.basename(ramp.files[0]) + ' … ' + path.basename(ramp.files[ramp.count - 1]));
}
