#!/usr/bin/env node
/**
 * scripts/generate-gallery.js
 *
 * Scans gamepad/gallery/images/ and writes gamepad/gallery/manifest.json —
 * the index the published gallery page reads.
 *
 * Run it directly to rebuild the manifest after dropping files in by hand:
 *   node scripts/generate-gallery.js
 *
 * scripts/dev-server.js also requires buildManifest() from here, so publishing
 * from inside the app and rebuilding by hand produce an identical manifest.
 *
 * Titles and dates are inferred from the filename produced by the app
 * (`<label>_<YYYY-MM-DD-HH-MM-SS>.png`), and any entry already present in the
 * manifest keeps its hand-edited `title` / `note`, so you can annotate freely
 * and re-run this script without losing your edits.
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const GALLERY_DIR = path.join(__dirname, '..', 'gamepad', 'gallery');
const IMAGES_DIR  = path.join(GALLERY_DIR, 'images');
const OUTPUT_FILE = path.join(GALLERY_DIR, 'manifest.json');
const IMAGE_EXTS  = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

/** Content hash — the identity used to detect an image that is already published. */
function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** Every image currently on disk, with its content hash. */
function listImages() {
  if (!fs.existsSync(IMAGES_DIR)) return [];
  return fs.readdirSync(IMAGES_DIR, { withFileTypes: true })
    .filter(e => e.isFile() && IMAGE_EXTS.has(path.extname(e.name).toLowerCase()))
    .map(e => e.name)
    .sort()
    .map(file => ({ file, sha256: sha256File(path.join(IMAGES_DIR, file)) }));
}

/**
 * `garamondi-garam-blue_2026-09-15-14-32-07.png`
 *   → { title: 'Garamondi Garam Blue', date: '2026-09-15' }
 */
function parseName(file) {
  const base  = path.basename(file, path.extname(file));
  const match = base.match(/^(.*)_(\d{4}-\d{2}-\d{2})-\d{2}-\d{2}-\d{2}$/);
  const slug  = match ? match[1] : base;

  const title = slug
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase()) || 'Untitled';

  return { title, date: match ? match[2] : null };
}

/** Rebuild manifest.json from the contents of images/. Returns the manifest. */
function buildManifest() {
  if (!fs.existsSync(IMAGES_DIR)) {
    throw new Error(`Missing directory: ${IMAGES_DIR}`);
  }

  const previous = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const json = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      for (const item of json.images ?? []) previous[item.file] = item;
    } catch (err) {
      console.warn('Could not parse existing manifest, starting fresh:', err.message);
    }
  }

  const images = listImages()
    .map(({ file, sha256 }) => {
      const prev = previous[file] ?? {};
      const stat = fs.statSync(path.join(IMAGES_DIR, file));
      const { title, date } = parseName(file);

      return {
        file,
        title: prev.title ?? title,
        date:  prev.date  ?? date ?? stat.mtime.toISOString().slice(0, 10),
        note:  prev.note  ?? '',
        bytes: stat.size,
        sha256,
      };
    })
    // Newest first — that's the order the page renders in.
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.file < b.file ? 1 : -1));

  const manifest = { generated: new Date().toISOString(), count: images.length, images };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (require.main === module) {
  try {
    const manifest = buildManifest();
    console.log(`Wrote ${path.relative(process.cwd(), OUTPUT_FILE)} — ${manifest.count} image(s).`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = {
  buildManifest, listImages, sha256File, parseName,
  GALLERY_DIR, IMAGES_DIR, OUTPUT_FILE, IMAGE_EXTS,
};
