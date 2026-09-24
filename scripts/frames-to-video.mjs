#!/usr/bin/env node
/**
 * frames-to-video.mjs — a frame zip into a video file.
 *
 *   node scripts/frames-to-video.mjs <frames.zip | folder> [options]
 *
 *   --fps <n>        override the rate. Default: meta.json, else 30.
 *   --out <path>     output file. Default: beside the input, .mp4
 *   --format <name>  mp4 | webm | gif | prores. Default: mp4
 *   --scale <w:h>    ffmpeg scale filter, e.g. 1080:-1. Default: none
 *   --keep           leave the extracted frames on disk
 *   --dry            print the ffmpeg command and stop
 *
 * ── Why this is a script and not a feature ──────────────────────────────────
 *
 * A sequence object has no playable file: it is marks, or a recipe, and its
 * frames are a cache rebuilt on demand. Turning those into a video inside the
 * browser would mean a container writer — WebCodecs encodes frames but does
 * not mux them — which is several hundred lines of bit-packing to reimplement,
 * badly, something ffmpeg already does correctly with every codec.
 *
 * So the app's job ends at a numbered PNG zip, which is lossless and a good
 * thing to keep, and this converts it. Decided 2026-09-22; the muxer that was
 * open for three sessions is cancelled. See docs/decisions.md.
 *
 * ── Dependencies ────────────────────────────────────────────────────────────
 *
 * ffmpeg on PATH. That is all — the zip is read here, with node:zlib, rather
 * than shelled out to `tar`. That was the first implementation and it broke
 * immediately on Windows: Git Bash resolves `tar` to GNU tar, which reads an
 * archive path of `C:\Users\…` as a `host:path` remote spec and tries to
 * connect to a machine called C. Reading the zip directly is forty lines, has
 * no platform quirks, and matches how the rest of this repo treats
 * dependencies — core/export.js hand-writes the zip in the first place.
 */

import { spawnSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import {
  existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync,
  rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const FORMATS = {
  // yuv420p and the even-dimension pad are what make an h264 file play in
  // QuickTime, Premiere and every browser rather than only in VLC.
  mp4: {
    ext: '.mp4',
    args: ['-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p'],
    filters: ['pad=ceil(iw/2)*2:ceil(ih/2)*2'],
  },
  webm: {
    ext: '.webm',
    args: ['-c:v', 'libvpx-vp9', '-crf', '28', '-b:v', '0', '-pix_fmt', 'yuva420p'],
    filters: [],
  },
  // Keeps the alpha, which is the point of it — a gamepad loop is ink on
  // nothing, and flattening that onto black throws the cutout away.
  prores: {
    ext: '.mov',
    args: ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le'],
    filters: [],
  },
  gif: {
    ext: '.gif',
    args: [],
    filters: ['split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer'],
  },
};

// ── Arguments ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
if (!argv.length || argv.includes('--help') || argv.includes('-h')) usage(0);

const input = argv[0];
const opt = name => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? null : argv[i + 1];
};
const flag = name => argv.includes('--' + name);

const format = opt('format') || 'mp4';
if (!FORMATS[format]) fail(`unknown format "${format}". One of: ${Object.keys(FORMATS).join(', ')}`);
if (!existsSync(input)) fail(`no such file or folder: ${input}`);

// ── Frames ───────────────────────────────────────────────────────────────────

let framesDir = input;
let temp = null;

if (statSync(input).isFile()) {
  temp = mkdtempSync(path.join(tmpdir(), 'skweeb-frames-'));
  say(`extracting ${path.basename(input)}…`);
  unzip(readFileSync(path.resolve(input)), temp);
  framesDir = temp;
}

// A zip made by core/export.js holds frame_0000.png and up, and may hold a
// meta.json written beside them.
const pngs = readdirSync(framesDir).filter(f => f.toLowerCase().endsWith('.png')).sort();
if (!pngs.length) fail(`no PNGs in ${framesDir}`);

const meta = readMeta(framesDir);
const fps = Number(opt('fps')) || (meta && meta.fps) || 30;

// The numbering has to be described to ffmpeg exactly. Padding is derived from
// the files rather than assumed: core/export.js widens past 9999.
const stem = pngs[0].replace(/\d+\.png$/i, '');
const digits = (pngs[0].match(/(\d+)\.png$/i) || [, ''])[1].length;
if (!digits) fail(`frames are not numbered as expected: ${pngs[0]}`);

const outFile = opt('out') || defaultOut();

// ── ffmpeg ───────────────────────────────────────────────────────────────────

const spec = FORMATS[format];
const filters = [
  ...(opt('scale') ? [`scale=${opt('scale')}:flags=lanczos`] : []),
  ...spec.filters,
];

const args = [
  '-y',
  '-framerate', String(fps),
  '-start_number', String(parseInt(pngs[0].match(/(\d+)\.png$/i)[1], 10)),
  '-i', path.join(framesDir, `${stem}%0${digits}d.png`),
  ...(filters.length ? ['-vf', filters.join(',')] : []),
  ...spec.args,
  outFile,
];

say(`${pngs.length} frames at ${fps}fps → ${outFile}`);

if (flag('dry')) {
  console.log('\nffmpeg ' + args.map(quote).join(' '));
  cleanup();
  process.exit(0);
}

const ff = spawnSync('ffmpeg', args, { stdio: 'inherit' });
cleanup();

if (ff.error && ff.error.code === 'ENOENT') {
  fail('ffmpeg is not on PATH.\n'
     + '  macOS:   brew install ffmpeg\n'
     + '  Windows: winget install Gyan.FFmpeg\n'
     + '  Linux:   apt install ffmpeg');
}
if (ff.status !== 0) fail(`ffmpeg exited ${ff.status}`);

say(`done — ${outFile}`);

// ── Helpers ──────────────────────────────────────────────────────────────────

function readMeta(dir) {
  const file = path.join(dir, 'meta.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    say('meta.json is not readable; falling back to defaults');
    return null;
  }
}

/** Named after the object where there is one, so a file says where it came from. */
function defaultOut() {
  const base = statSync(input).isFile()
    ? path.basename(input).replace(/(_frames)?\.zip$/i, '')
    : path.basename(path.resolve(input));
  const dir = statSync(input).isFile() ? path.dirname(input) : path.dirname(path.resolve(input));
  return path.join(dir, ((meta && meta.id) || base) + FORMATS[format].ext);
}

/**
 * Extract a zip into a directory.
 *
 * Read through the central directory rather than by scanning for local
 * headers: the central directory is the authoritative index, and it is the
 * only one that is right when an entry carries a data descriptor. Stored and
 * deflated members are both handled, which between them is every zip anything
 * here produces — core/export.js writes stored — and almost every zip at all.
 *
 * Entry names are resolved against the destination and refused if they escape
 * it. A zip is an untrusted file format; `../../` in a member name is the
 * oldest trick there is, and a frame zip has no business writing outside the
 * folder it was asked to fill.
 */
function unzip(buf, dest) {
  const eocd = findEOCD(buf);
  if (eocd < 0) fail('not a zip file: no end-of-central-directory record');

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) fail(`bad central directory entry at ${p}`);

    const method   = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen  = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commLen  = buf.readUInt16LE(p + 32);
    const localAt  = buf.readUInt32LE(p + 42);
    const name     = buf.toString('utf8', p + 46, p + 46 + nameLen);

    p += 46 + nameLen + extraLen + commLen;

    if (name.endsWith('/')) continue;                       // a directory entry

    const out = path.resolve(dest, name);
    if (out !== dest && !out.startsWith(dest + path.sep)) {
      fail(`refusing to write outside the target folder: ${name}`);
    }

    // The local header repeats the name and may carry a different extra field,
    // so the data offset has to be read from it and not from the directory.
    const lNameLen  = buf.readUInt16LE(localAt + 26);
    const lExtraLen = buf.readUInt16LE(localAt + 28);
    const start = localAt + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);

    let bytes;
    if (method === 0)      bytes = raw;
    else if (method === 8) bytes = inflateRawSync(raw);
    else fail(`unsupported compression method ${method} for ${name}`);

    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, bytes);
  }
}

/**
 * The end-of-central-directory record, found by scanning back from the end.
 *
 * It is a variable-length record because of its trailing comment, so its
 * position cannot be computed — only searched for. The comment is at most
 * 65535 bytes, which bounds how far back to look.
 */
function findEOCD(buf) {
  const floor = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= floor; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}

function cleanup() {
  if (temp && !flag('keep')) rmSync(temp, { recursive: true, force: true });
  else if (temp) say(`frames kept at ${temp}`);
}

// Declarations, not `const` arrows: everything above runs at module top level,
// so an arrow assigned down here is still in its temporal dead zone when the
// --dry path reaches it.
function quote(s) { return /[\s%]/.test(s) ? `"${s}"` : s; }
function say(msg) { console.log('  ' + msg); }

function fail(msg) {
  console.error('\nframes-to-video: ' + msg + '\n');
  cleanup();
  process.exit(1);
}

function usage(code) {
  console.log(`
  frames-to-video — a skweeb frame zip into a video file

    node scripts/frames-to-video.mjs <frames.zip | folder> [options]

    --fps <n>        override the rate. Default: meta.json, else 30
    --out <path>     output file. Default: beside the input
    --format <name>  ${Object.keys(FORMATS).join(' | ')}. Default: mp4
    --scale <w:h>    e.g. 1080:-1
    --keep           leave the extracted frames on disk
    --dry            print the ffmpeg command and stop

  prores and webm keep alpha; mp4 and gif do not. A gamepad loop is ink on
  nothing, so mp4 will flatten it onto black.
`);
  process.exit(code);
}
