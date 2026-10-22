/**
 * roles.js — what each stroke of a drawing is to the puppet, found or told:
 * the body, an eyestalk, or a limb — and how the drawing is read so the rig
 * hangs it from the body.
 *
 * The rig takes a drawing's first stroke for its body, and hangs every
 * other chain from its first mark (../STATUS.md, *Known*): drawn eyes first,
 * an eye was the body, the mouth went on it and no stalk was found. The
 * puppet asks for no order. Its body is the stroke drawn widest — a bust is
 * drawn with a bigger brush than its stalks — and, among strokes as wide,
 * the longest; its top is its higher end, where the face is. Every other
 * stroke hangs by its end nearer the body, and is an eyestalk when it hangs
 * from the body's upper half and points on up, as stalks do; a limb
 * otherwise. Any of it may be told instead (`told`, the Parts drawer): a
 * role a stroke, or none for found. The drawing is then read again with the
 * strokes that run the wrong way reversed and the body hung first
 * (../drawing.js `reverse`, ../bones.js `order`). Pure.
 */

export const ROLES = ['body', 'eye', 'limb'];

const RAD = Math.PI / 180;
const UPPER = 0.5;            // how far up the body, base to top, an eyestalk hangs at least
const ON_UP = 60 * RAD;       // how far from the body's way up an eyestalk may point

/** A stroke's mean drawn width: its stamps' sprites at their scales — their scales, with no sprites. */
function widthOf(drawing, images, stroke) {
  let sum = 0;
  for (const i of stroke.stamps) {
    const s = drawing.stamps[i], image = images && images.get(s.key);
    sum += Math.abs(s.scale) * (image ? image.width : 1);
  }
  return stroke.stamps.length ? sum / stroke.stamps.length : 0;
}

/** Where a point is held by a line of points: how far from it, and how far along it, 0 at its first, 1 at its last. */
export function along(line, p) {
  let best = { d: Math.hypot(p.x - line[0].x, p.y - line[0].y), s: 0 }, run = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], ex = b.x - a.x, ey = b.y - a.y, span = ex * ex + ey * ey, len = Math.sqrt(span);
    const t = span ? Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / span)) : 0;
    const d = Math.hypot(p.x - (a.x + ex * t), p.y - (a.y + ey * t));
    if (d < best.d) best = { d, s: run + len * t };
    run += len;
  }
  return { d: best.d, t: run ? best.s / run : 0 };
}

/**
 * @param {object} drawing     ../drawing.js `drawingOf`, as drawn
 * @param {?Map} images        the sprites, by key, for the strokes' widths
 * @param {string[]} [told]    a role a stroke, '' where it is found
 * @returns {{roles: string[], found: string[], reverse: number[], order: number[], body: ?number}}
 */
export function rolesOf(drawing, images, told = []) {
  const strokes = drawing.strokes, n = strokes.length;
  if (!n) return { roles: [], found: [], reverse: [], order: [], body: null };
  let body = told.findIndex(r => r === 'body');
  if (body < 0 || body >= n) {
    const widths = strokes.map(s => widthOf(drawing, images, s));
    body = 0;
    strokes.forEach((s, k) => {
      const w = widths[k], b = widths[body];
      if (w > b * 1.05 || (w >= b * 0.95 && s.path.length > strokes[body].path.length)) body = k;
    });
  }
  const own = strokes[body].stamps.map(i => drawing.stamps[i]);
  const downward = own[0].y < own[own.length - 1].y;              // drawn from its top: read it from its base
  const line = downward ? own.slice().reverse() : own;
  const base = line[0], top = line[line.length - 1];
  const up = Math.atan2(top.y - base.y, top.x - base.x);
  const reverse = downward ? [body] : [], found = [];
  strokes.forEach((s, k) => {
    if (k === body) { found[k] = 'body'; return; }
    const a = drawing.stamps[s.stamps[0]], z = drawing.stamps[s.stamps[s.stamps.length - 1]];
    const ha = along(line, a), hz = along(line, z), fromLast = hz.d < ha.d;
    if (fromLast) reverse.push(k);
    const root = fromLast ? z : a, tip = fromLast ? a : z, hung = fromLast ? hz : ha;
    const way = Math.atan2(tip.y - root.y, tip.x - root.x), off = Math.abs(Math.atan2(Math.sin(way - up), Math.cos(way - up)));
    found[k] = hung.t >= UPPER && off <= ON_UP ? 'eye' : 'limb';
  });
  const roles = found.map((r, k) => (k !== body && (told[k] === 'eye' || told[k] === 'limb') ? told[k] : r));
  return { roles, found, reverse: reverse.sort((x, y) => x - y), order: [body, ...strokes.map((_, k) => k).filter(k => k !== body)], body };
}

/**
 * The part the rig names each stroke's bones, from the roles: the body;
 * an eyestalk `head`, which is what takes an eye (tips.js); a limb what the
 * rig guessed (../parts.js), never `head`.
 *
 * @param {string[]} roles
 * @param {Object<number, string>} guessed   ../parts.js `guessParts`, by stroke
 * @returns {Object<number, string>}
 */
export function partsFor(roles, guessed) {
  const out = {};
  roles.forEach((r, k) => {
    out[k] = r === 'body' ? 'body' : r === 'eye' ? 'head' : (guessed[k] && guessed[k] !== 'head' && guessed[k] !== 'body' ? guessed[k] : 'none');
  });
  return out;
}

/** The roles told, from the address's words: one a stroke, comma between, empty where found. */
export const toldOf = text => (text ? String(text).split(',').map(w => (ROLES.includes(w.trim()) ? w.trim() : '')) : []);

/** …and back: the found ones at the end left off. */
export function toldText(told) {
  const out = told.map(r => (ROLES.includes(r) ? r : ''));
  while (out.length && !out[out.length - 1]) out.pop();
  return out.join(',');
}
