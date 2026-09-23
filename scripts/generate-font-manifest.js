#!/usr/bin/env node
/**
 * scripts/generate-font-manifest.js
 *
 * Scans assets/fonts/ and writes assets/font-manifest.json.
 *
 * Rule 3: nothing walks a directory at runtime, and no agent should have to
 * either. Until now there was no font manifest at all — grid's port had to
 * reference Space Mono by a hand-written path, and the roadmap flagged that
 * the next app would need this. ckt is that app: its stage one sets type
 * before cutting it into dots, so the list of faces is a parameter, and a
 * parameter comes from data.
 *
 * ── The licence field is not decoration ─────────────────────────────────────
 *
 * Rule 5: no font enters the repo or the vault without a licence record in the
 * file itself. Six were pulled for this on 2026-09-21. So this reads the name
 * table out of each file rather than trusting a sidecar, and a face whose
 * licence cannot be read is written into the manifest with `licence: null` and
 * reported loudly — it is not silently dropped, because a missing entry looks
 * like a missing file and a null licence looks like the problem it is.
 *
 * ── Reading the name table ──────────────────────────────────────────────────
 *
 * Both OTF and TTF are OpenType containers: a 12-byte header, then a table
 * directory. `name` (id 13 licence, 14 licence URL, 1 family, 2 subfamily) is
 * all this needs, so it is about sixty lines rather than a font library. It
 * deliberately does not parse glyphs — the browser does that, with the
 * opentype.js already inside p5.
 *
 * Run from the project root:
 *   node scripts/generate-font-manifest.js
 */

const fs = require('fs');
const path = require('path');

const FONTS  = path.join(__dirname, '..', 'assets', 'fonts');
const OUTPUT = path.join(__dirname, '..', 'assets', 'font-manifest.json');
const FONT_EXT = new Set(['.otf', '.ttf', '.woff', '.woff2']);

// Name IDs worth having. https://learn.microsoft.com/typography/opentype/spec/name
const NAME_IDS = {
  1:  'family',
  2:  'subfamily',
  4:  'full',
  6:  'postscript',
  13: 'licence',
  14: 'licenceUrl',
};

/** Every name-table record in a font file, decoded. */
function readNames(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 12) return {};

  const tag = buf.readUInt32BE(0);
  // 0x00010000 TrueType, 'OTTO' CFF, 'true'/'ttcf' variants.
  if (tag !== 0x00010000 && tag !== 0x4f54544f && tag !== 0x74727565) return {};

  const numTables = buf.readUInt16BE(4);
  let nameOffset = 0;

  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (rec + 16 > buf.length) break;
    if (buf.toString('ascii', rec, rec + 4) === 'name') {
      nameOffset = buf.readUInt32BE(rec + 8);
      break;
    }
  }
  if (!nameOffset || nameOffset + 6 > buf.length) return {};

  const count = buf.readUInt16BE(nameOffset + 2);
  const stringBase = nameOffset + buf.readUInt16BE(nameOffset + 4);
  const out = {};

  for (let i = 0; i < count; i++) {
    const rec = nameOffset + 6 + i * 12;
    if (rec + 12 > buf.length) break;

    const platform = buf.readUInt16BE(rec);
    const nameId   = buf.readUInt16BE(rec + 6);
    const length   = buf.readUInt16BE(rec + 8);
    const offset   = buf.readUInt16BE(rec + 10);

    const key = NAME_IDS[nameId];
    if (!key || out[key]) continue;                   // first record wins

    const start = stringBase + offset;
    if (start + length > buf.length) continue;
    const slice = buf.subarray(start, start + length);

    // Platform 1 is Macintosh (single byte); 0 and 3 are UTF-16BE.
    out[key] = (platform === 1 ? slice.toString('latin1') : decodeUtf16be(slice))
      .replace(/\0/g, '').trim();
  }

  return out;
}

function decodeUtf16be(slice) {
  let s = '';
  for (let i = 0; i + 1 < slice.length; i += 2) {
    s += String.fromCharCode((slice[i] << 8) | slice[i + 1]);
  }
  return s;
}

/** A stable id from the filename: `SpaceMono-Regular.ttf` → `spacemono-regular`. */
const idOf = file => path.basename(file, path.extname(file)).toLowerCase();

function build() {
  if (!fs.existsSync(FONTS)) {
    console.error('no assets/fonts/ — nothing to do');
    process.exit(1);
  }

  const files = fs.readdirSync(FONTS)
    .filter(f => FONT_EXT.has(path.extname(f).toLowerCase()))
    .sort();

  const unlicensed = [];

  const fonts = files.map(file => {
    const names = readNames(path.join(FONTS, file));
    const licence = names.licence || null;
    if (!licence) unlicensed.push(file);

    return {
      id: idOf(file),
      file: `assets/fonts/${file}`,
      family: names.family || path.basename(file, path.extname(file)),
      subfamily: names.subfamily || 'Regular',
      label: [names.family, names.subfamily].filter(Boolean).join(' ')
             || path.basename(file, path.extname(file)),
      bytes: fs.statSync(path.join(FONTS, file)).size,

      // Rule 5. Kept as the font's own words rather than a verdict, so the
      // manifest can be audited against the files without re-running this.
      licence: licence ? licence.replace(/\s+/g, ' ').trim() : null,
      licenceUrl: names.licenceUrl || null,
    };
  });

  const manifest = {
    generated: new Date().toISOString(),
    note: 'Generated by scripts/generate-font-manifest.js — do not edit by hand.',
    fonts,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`assets/font-manifest.json — ${fonts.length} faces`);
  for (const f of fonts) {
    const mark = f.licence ? 'ok  ' : 'NO LICENCE';
    console.log(`  ${mark} ${f.id.padEnd(28)} ${f.label}`);
  }

  if (unlicensed.length) {
    console.error(`\n${unlicensed.length} face(s) carry no licence in the file itself: `
      + unlicensed.join(', '));
    console.error('Rule 5 in CLAUDE.md — see docs/fonts.md. They are in the manifest '
      + 'with licence: null rather than hidden.');
    process.exitCode = 2;
  }
}

build();
