#!/usr/bin/env node
/**
 * scripts/generate-manifest.js
 *
 * Scans gamepad/gamepad_sprites/ and writes gamepad/brush-manifest.json.
 * Each leaf directory that contains image files becomes one brush "family".
 *
 * Run from project root:
 *   node scripts/generate-manifest.js
 */

const fs   = require('fs');
const path = require('path');

const SPRITES_ROOT  = path.join(__dirname, '..', 'gamepad', 'gamepad_sprites');
const OUTPUT_FILE   = path.join(__dirname, '..', 'gamepad', 'brush-manifest.json');
const IMAGE_EXTS    = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

// ─── Walk directory tree ──────────────────────────────────────────────────────

function walkDir(dir, relBase) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const imageFiles = entries
    .filter(e => e.isFile() && IMAGE_EXTS.has(path.extname(e.name).toLowerCase()))
    .map(e => e.name)
    .sort(naturalSort);

  const subDirs = entries.filter(e => e.isDirectory());

  const families = [];

  if (imageFiles.length > 0) {
    // This is a leaf folder with images → one family
    const relPath   = relBase;                          // e.g. "GaramondI/Garam_blue"
    const id        = relPath.replace(/[^a-zA-Z0-9]/g, '_'); // safe key
    const label     = relPath.replace(/\//g, ' / ');   // pretty label
    const browserPath = `gamepad_sprites/${relPath}`;  // relative to gamepad/ root

    families.push({
      id,
      label,
      path: browserPath,
      files: imageFiles,
      count: imageFiles.length,
      preview: imageFiles[0],
    });
  }

  // Recurse into subdirectories
  for (const sub of subDirs) {
    const subRel = relBase ? `${relBase}/${sub.name}` : sub.name;
    families.push(...walkDir(path.join(dir, sub.name), subRel));
  }

  return families;
}

// Natural sort so "sprite(2)" comes before "sprite(10)"
function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// ─── Generate ─────────────────────────────────────────────────────────────────

const families = walkDir(SPRITES_ROOT, '');

const manifest = {
  generated: new Date().toISOString(),
  spritesRoot: 'gamepad_sprites',   // relative to the served gamepad/ root
  families,
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));

console.log(`✓ brush-manifest.json written`);
console.log(`  ${families.length} families found:`);
families.forEach(f => console.log(`  · ${f.label.padEnd(35)} ${f.count} files`));
