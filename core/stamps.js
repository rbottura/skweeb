/**
 * stamps.js — a mark drawn once at the size and angle it will appear at.
 *
 * ckt's renderer's speed (apps/ckt/render.js, *Why it is fast*), moved into
 * core when particles needed it too: a sprite is drawn ONCE
 * at the size and angle a frame shows it, and that stamp is then blitted to
 * every dot untransformed. Stamps are cached by quantised size and angle, and
 * shrunk from the nearest halving of the sprite so a 360px image reaches a 12px
 * dot cleanly. The preview's own exception, freshStamp, draws one stamp a
 * frame at the exact angle instead.
 *
 * A stamp is `{ canvas, cx, cy, w, h }`: its picture is the top-left `w` × `h`
 * of `canvas`, centred on (`cx`, `cy`).
 */

import { surface } from './surface.js';

const TAU = Math.PI * 2;

const _mips = new WeakMap();       // image → [its halvings, largest first]
const _stamps = new Map();         // key → { canvas, cx, cy, w, h }
const STAMP_CAP = 2048;

/** The smallest halving of an image still at least twice `px` wide — clean to shrink from. */
export function mipFor(image, px) {
  let levels = _mips.get(image);
  if (!levels) _mips.set(image, levels = [image]);
  let i = 0;
  while (true) {
    const cur = levels[i];
    if (cur.width / 2 < px * 2 || cur.width < 4) return cur;
    if (!levels[i + 1]) {
      const next = surface(Math.ceil(cur.width / 2), Math.ceil(cur.height / 2));
      const c = next.getContext('2d');
      c.imageSmoothingQuality = 'high';
      c.drawImage(cur, 0, 0, next.width, next.height);
      levels.push(next);
    }
    i++;
  }
}

let _ids = 0;
const _imageIds = new WeakMap();
const idOf = image => {
  if (!_imageIds.has(image)) _imageIds.set(image, ++_ids);
  return _imageIds.get(image);
};

/**
 * A mark at `px` wide, turned `angle`, centred on (cx, cy) of its canvas.
 * Keys are quantised — a quarter pixel, a bucket of angle — so a pulse or a
 * face cache stays bounded; the cache forgets its oldest past a cap.
 */
export function stampFor(mark, color, px, angle, buckets) {
  const size = Math.max(0.25, Math.round(px * 4) / 4);
  const b = mark ? ((Math.round((angle / TAU) * buckets) % buckets) + buckets) % buckets : 0;
  const key = (mark ? 'm' + idOf(mark) : 'd' + color) + '|' + size + '|' + b + '/' + buckets;
  let stamp = _stamps.get(key);
  if (stamp) return stamp;

  if (!mark) {
    const d = Math.max(1, Math.ceil(size) + 2);
    const canvas = surface(d, d);
    const c = canvas.getContext('2d');
    c.fillStyle = color;
    c.beginPath();
    c.arc(d / 2, d / 2, size / 2, 0, TAU);
    c.fill();
    stamp = { canvas, cx: d / 2, cy: d / 2, w: d, h: d };
  } else {
    // The rotated sprite's own box, not the square round its diagonal: a
    // stamp is blitted a thousand times, and every padded pixel is filled.
    const w = size, h = size * (mark.height / mark.width);
    const t = (b / buckets) * TAU;
    const cw = Math.max(1, Math.ceil(Math.abs(w * Math.cos(t)) + Math.abs(h * Math.sin(t))) + 2);
    const ch = Math.max(1, Math.ceil(Math.abs(w * Math.sin(t)) + Math.abs(h * Math.cos(t))) + 2);
    const canvas = surface(cw, ch);
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.translate(cw / 2, ch / 2);
    c.rotate(t);
    c.drawImage(mipFor(mark, w), -w / 2, -h / 2, w, h);
    stamp = { canvas, cx: cw / 2, cy: ch / 2, w: cw, h: ch };
  }

  if (_stamps.size >= STAMP_CAP) _stamps.delete(_stamps.keys().next().value);
  _stamps.set(key, stamp);
  return stamp;
}

let _fresh = null;

/**
 * The preview's stamp for sprites that all turn alike: drawn again each frame
 * at the exact angle, into one reused canvas — a stamp's region is its top
 * left `w` × `h`. The cache's buckets were 4° in the preview, so a turn at 2°
 * a frame moved the sprites every other frame: the stutter. One stamp a frame
 * is nothing to draw, and the cache cannot hold a continuous turn. Saves keep
 * the cache's quarter degree, so what was saved re-renders as it was.
 */
export function freshStamp(mark, px, angle) {
  const w = Math.max(0.25, px), h = w * (mark.height / mark.width);
  const cw = Math.max(1, Math.ceil(Math.abs(w * Math.cos(angle)) + Math.abs(h * Math.sin(angle))) + 2);
  const ch = Math.max(1, Math.ceil(Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle))) + 2);
  if (!_fresh || _fresh.width < cw || _fresh.height < ch) {
    _fresh = surface(Math.max(cw, _fresh ? _fresh.width : 0), Math.max(ch, _fresh ? _fresh.height : 0));
  }
  const c = _fresh.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cw, ch);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.translate(cw / 2, ch / 2);
  c.rotate(angle);
  c.drawImage(mipFor(mark, w), -w / 2, -h / 2, w, h);
  c.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas: _fresh, cx: cw / 2, cy: ch / 2, w: cw, h: ch };
}

/** A stamp, its own region only, centred on (x, y). */
export function blit(ctx, stamp, x, y) {
  ctx.drawImage(stamp.canvas, 0, 0, stamp.w, stamp.h, x - stamp.cx, y - stamp.cy, stamp.w, stamp.h);
}
