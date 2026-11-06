/**
 * modifiers.js — the garden's genome (M14): a flower's marks changed by an
 * ordered chain of modifiers. The author's brief is
 * docs/iterations-modifications.md.
 *
 * A flower is a drawing made in the gamepad and kept as its marks — `{ t, x,
 * y, rotation, scale, familyId, spriteIndex, pattern }` each (core/stage/
 * recorder.js) — so a modifier acts on what was drawn, never on its pixels:
 * the image changed every four marks, the first half grown, the petals
 * copied round the middle. The chain's order matters: a mirror before a turn
 * is not a turn before a mirror. Each modifier acts on the marks its parts
 * choose — the drawing's order cut into `parts` equal parts, `which` naming
 * those taken, "1 3" the first and third of four — and leaves the rest.
 *
 * The order marks were drawn in is the order they overlap in and the order
 * a flower grows in (growth.js), each coming at its `t`: so *growth order*
 * changes what grows first and what lies on top, and *growth pace* how it
 * comes — the hand's rhythm kept, or evened out.
 *
 * Pure: marks in, new marks out, the source's never touched; every draw from
 * the chain's seed and the modifier's place in the chain (core/rng.js), so a
 * generation saved is a generation drawn again. No DOM.
 */

import { makeRng, seedFrom } from '../../../core/rng.js';
import { PATTERNS, PATTERN_LABELS } from '../../../core/stamp.js';

const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

/** The rows every modifier acting on parts has: the order cut in how many, and which are taken. */
const PARTS = {
  parts: { type: 'int', min: 1, max: 12, default: 1, label: 'parts' },
  which: { type: 'text', default: '', label: 'which, e.g. 1 3', when: { parts: { not: 1 } } },
};

/**
 * What it turns round: the middle of the whole flower, or the drawing's first
 * or last mark — its heart, drawn first, and petals copied round it.
 */
const ROUND = {
  round: { type: 'enum', options: ['middle', 'first', 'last'], default: 'middle', label: 'round',
           labels: { middle: 'the middle', first: 'the first mark drawn', last: 'the last mark drawn' } },
};

/**
 * The parts `which` names, of `parts`: "1 3", "2-4", "odd", "even" — null
 * for every one, when it names none. A number past `parts` names nothing.
 */
export function partsTaken(which, parts) {
  const text = String(which == null ? '' : which).trim().toLowerCase();
  if (!text || text === 'all') return null;
  const taken = new Set();
  for (const bit of text.split(/[\s,;]+/)) {
    const range = /^(\d+)[-–](\d+)$/.exec(bit);
    if (range) {
      for (let k = Number(range[1]); k <= Number(range[2]); k++) if (k >= 1 && k <= parts) taken.add(k);
    } else if (bit === 'odd' || bit === 'even') {
      for (let k = bit === 'odd' ? 1 : 2; k <= parts; k += 2) taken.add(k);
    } else {
      const k = Number(bit);
      if (Number.isInteger(k) && k >= 1 && k <= parts) taken.add(k);
    }
  }
  return taken;
}

/** The marks a modifier acts on, by index in the drawing's order: those in the parts it takes. */
export function chosen(n, { parts = 1, which = '' } = {}) {
  const k = Math.max(1, Math.round(parts) || 1);
  const taken = k > 1 ? partsTaken(which, k) : null;
  const out = [];
  for (let i = 0; i < n; i++) if (!taken || taken.has(Math.min(k - 1, Math.floor((i * k) / n)) + 1)) out.push(i);
  return out;
}

/** The middle of where marks are: of the box round their places. */
export function middleOf(marks) {
  if (!marks.length) return { x: 0, y: 0 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const m of marks) {
    if (m.x < x0) x0 = m.x;
    if (m.x > x1) x1 = m.x;
    if (m.y < y0) y0 = m.y;
    if (m.y > y1) y1 = m.y;
  }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}

/** An image's number kept within its family when its size is known, else only never below 0. */
const wrap = (v, size) => (size > 0 ? ((Math.round(v) % size) + size) % size : Math.max(0, Math.round(v)));

/** Where a modifier turns round: the flower's middle, or its first or last mark. */
function centreOf(p, marks, middle) {
  const m = p.round === 'first' ? marks[0] : p.round === 'last' ? marks[marks.length - 1] : null;
  return m ? { x: m.x, y: m.y } : middle;
}

/** A mark turned `a` round a point, its own turn with it. */
const turned = (m, c, a) => {
  const dx = m.x - c.x, dy = m.y - c.y, cos = Math.cos(a), sin = Math.sin(a);
  return { ...m, x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos, rotation: m.rotation + a };
};

/** Each mark of `pick`, then what `copies` makes of it: copies kept beside their mark, so they grow together. */
function withCopies(marks, pick, copies) {
  const set = new Set(pick), out = [];
  marks.forEach((m, i) => {
    out.push(m);
    if (set.has(i)) out.push(...copies(m));
  });
  return out;
}

/**
 * The modifiers, by id: what the menu calls each, its schema — a card is
 * drawn from it (core/Cards.js, rule 1) — and what it does, `apply(marks, p,
 * { pick, rng, sizes, middle })`: `pick` the indices it acts on, `middle` the
 * whole flower's. A new modifier is one entry; a new draw in one goes at the
 * end of its draws, or every saved flower grows differently.
 */
export const KINDS = {
  image: {
    label: 'image',
    params: {
      how:   { type: 'enum', options: ['every', 'one', 'shift', 'random'], default: 'every', label: 'how',
               labels: { every: 'changed every n marks', one: 'one image', shift: 'shifted', random: 'at random' } },
      image: { type: 'int', min: 0, max: 999, default: 0, label: 'from image', when: { how: ['every', 'one', 'random'] } },
      every: { type: 'int', min: 1, max: 99, default: 4, label: 'every', unit: 'marks', when: { how: 'every' } },
      among: { type: 'int', min: 1, max: 99, default: 2, label: 'among', unit: 'images', when: { how: ['every', 'random'] } },
      by:    { type: 'int', min: -99, max: 99, default: 1, label: 'by', when: { how: 'shift' } },
      ...PARTS,
    },
    apply(marks, p, { pick, rng, sizes }) {
      pick.forEach((i, k) => {
        const m = marks[i], size = sizes.get(m.familyId) || 0;
        if (p.how === 'one') m.spriteIndex = wrap(p.image, size);
        else if (p.how === 'shift') m.spriteIndex = wrap(m.spriteIndex + p.by, size);
        else if (p.how === 'random') m.spriteIndex = wrap(p.image + rng.int(Math.max(1, p.among)), size);
        else m.spriteIndex = wrap(p.image + (Math.floor(k / Math.max(1, p.every)) % Math.max(1, p.among)), size);
      });
      return marks;
    },
  },

  size: {
    label: 'size',
    params: {
      how:    { type: 'enum', options: ['times', 'add', 'ramp', 'random'], default: 'times', label: 'how',
                labels: { times: 'times', add: 'plus', ramp: 'more and more along the order', random: 'at random' } },
      times:  { type: 'range', min: 0.05, max: 8, step: 'any', log: true, default: 2, label: '×', when: { how: ['times', 'ramp'] } },
      add:    { type: 'range', min: -2, max: 2, step: 0.05, default: 0.1, label: '+', when: { how: 'add' } },
      spread: { type: 'range', min: 0, max: 1, step: 0.01, default: 0.3, label: '±', when: { how: 'random' } },
      ...PARTS,
    },
    apply(marks, p, { pick, rng }) {
      const n = pick.length;
      pick.forEach((i, k) => {
        const m = marks[i], u = n > 1 ? k / (n - 1) : 1;
        if (p.how === 'add') m.scale += p.add;
        else if (p.how === 'ramp') m.scale *= 1 + (p.times - 1) * u;
        else if (p.how === 'random') m.scale *= 1 + (rng() * 2 - 1) * p.spread;
        else m.scale *= p.times;
        m.scale = Math.max(0.01, m.scale);
      });
      return marks;
    },
  },

  turn: {
    label: 'turn',
    params: {
      how:     { type: 'enum', options: ['add', 'ramp', 'random'], default: 'ramp', label: 'how',
                 labels: { add: 'by', ramp: 'more and more along the order', random: 'at random' } },
      degrees: { type: 'range', min: -720, max: 720, step: 1, default: 90, label: 'degrees', unit: '°' },
      ...PARTS,
    },
    apply(marks, p, { pick, rng }) {
      const n = pick.length;
      pick.forEach((i, k) => {
        const u = n > 1 ? k / (n - 1) : 1;
        const d = p.how === 'add' ? p.degrees : p.how === 'random' ? (rng() * 2 - 1) * p.degrees : p.degrees * u;
        marks[i].rotation += d * RAD;
      });
      return marks;
    },
  },

  place: {
    label: 'position',
    params: {
      how:     { type: 'enum', options: ['spread', 'move', 'jitter', 'turn'], default: 'spread', label: 'how',
                 labels: { spread: 'spread from the middle', move: 'moved', jitter: 'shaken', turn: 'turned round' } },
      times:   { type: 'range', min: 0, max: 4, step: 'any', default: 1.25, label: '×', when: { how: 'spread' } },
      dx:      { type: 'range', min: -2000, max: 2000, step: 1, default: 0, label: 'x', unit: 'px', when: { how: 'move' } },
      dy:      { type: 'range', min: -2000, max: 2000, step: 1, default: 0, label: 'y', unit: 'px', when: { how: 'move' } },
      by:      { type: 'range', min: 0, max: 400, step: 1, default: 12, label: '±', unit: 'px', when: { how: 'jitter' } },
      degrees: { type: 'range', min: -360, max: 360, step: 1, default: 45, label: 'degrees', unit: '°', when: { how: 'turn' } },
      ...ROUND,
      ...PARTS,
    },
    apply(marks, p, { pick, rng, middle }) {
      const c = centreOf(p, marks, middle), a = (p.degrees || 0) * RAD;
      for (const i of pick) {
        const m = marks[i];
        if (p.how === 'move') { m.x += p.dx; m.y += p.dy; }
        else if (p.how === 'jitter') { m.x += (rng() * 2 - 1) * p.by; m.y += (rng() * 2 - 1) * p.by; }
        else if (p.how === 'turn') marks[i] = turned(m, c, a);
        else { m.x = c.x + (m.x - c.x) * p.times; m.y = c.y + (m.y - c.y) * p.times; }
      }
      return marks;
    },
  },

  /**
   * A mirror round the flower's middle. Its sprites are not turned over —
   * a mark has no field for that; core/stamp.js turns over only a pattern's
   * copies, round the canvas's middle (*brush symmetry*, below) — so a
   * round brush mirrors exactly, a letter keeps its hand.
   */
  mirror: {
    label: 'mirror',
    params: {
      axis: { type: 'enum', options: ['x', 'y'], default: 'x', label: 'axis', labels: { x: 'left ↔ right', y: 'top ↕ bottom' } },
      how:  { type: 'enum', options: ['copy', 'flip'], default: 'copy', label: 'how', labels: { copy: 'a mirrored copy', flip: 'turned over' } },
      ...ROUND,
      ...PARTS,
    },
    apply(marks, p, { pick, middle }) {
      const c = centreOf(p, marks, middle);
      const mirrored = m => (p.axis === 'y' ? { ...m, y: 2 * c.y - m.y, rotation: -m.rotation }
        : { ...m, x: 2 * c.x - m.x, rotation: -m.rotation });
      if (p.how === 'flip') {
        for (const i of pick) marks[i] = mirrored(marks[i]);
        return marks;
      }
      return withCopies(marks, pick, m => [mirrored(m)]);
    },
  },

  around: {
    label: 'copies around',
    params: {
      count: { type: 'int', min: 2, max: 36, default: 5, label: 'in all' },
      ...ROUND,
      ...PARTS,
    },
    apply(marks, p, { pick, middle }) {
      const n = Math.max(2, p.count), c = centreOf(p, marks, middle);
      return withCopies(marks, pick, m => Array.from({ length: n - 1 }, (_, k) => turned(m, c, ((k + 1) * TAU) / n)));
    },
  },

  thin: {
    label: 'thin out',
    params: {
      how:   { type: 'enum', options: ['every', 'random'], default: 'every', label: 'keep', labels: { every: 'one in n', random: 'at random' } },
      every: { type: 'int', min: 2, max: 64, default: 2, label: 'one in', when: { how: 'every' } },
      keep:  { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'kept', when: { how: 'random' } },
      ...PARTS,
    },
    apply(marks, p, { pick, rng }) {
      const dropped = new Set();
      pick.forEach((i, k) => {
        const kept = p.how === 'random' ? rng() < p.keep : k % Math.max(2, p.every) === 0;
        if (!kept) dropped.add(i);
      });
      return marks.filter((m, i) => !dropped.has(i));
    },
  },

  /** The gamepad's own symmetry, a mark's `pattern` (core/stamp.js): round the canvas's middle, its sprites turned over. */
  symmetry: {
    label: 'brush symmetry',
    params: {
      pattern: { type: 'enum', options: PATTERNS, default: 'mirror-x', label: 'pattern', labels: PATTERN_LABELS },
      ...PARTS,
    },
    apply(marks, p, { pick }) {
      for (const i of pick) marks[i].pattern = PATTERNS.includes(p.pattern) ? p.pattern : 'single';
      return marks;
    },
  },

  /** What grows first and what lies on top: the marks taken trade places, each place keeping its time. */
  order: {
    label: 'growth order',
    params: {
      how: { type: 'enum', options: ['shuffle', 'reverse', 'outward', 'inward'], default: 'shuffle', label: 'how',
             labels: { shuffle: 'shuffled', reverse: 'reversed', outward: 'from the middle out', inward: 'from the edge in' } },
      ...PARTS,
    },
    apply(marks, p, { pick, rng, middle }) {
      const moved = pick.map(i => marks[i]);
      if (p.how === 'reverse') moved.reverse();
      else if (p.how === 'shuffle') {
        for (let i = moved.length - 1; i > 0; i--) {
          const j = rng.int(i + 1);
          [moved[i], moved[j]] = [moved[j], moved[i]];
        }
      } else {
        const d = m => Math.hypot(m.x - middle.x, m.y - middle.y);
        moved.sort((a, b) => (p.how === 'outward' ? d(a) - d(b) : d(b) - d(a)));
      }
      const out = marks.slice();
      pick.forEach((i, k) => { out[i] = { ...moved[k], t: marks[i].t }; });
      return out;
    },
  },

  /** How the whole flower comes as it grows: the hand's rhythm evened out, or quickening, or slowing. */
  pace: {
    label: 'growth pace',
    params: {
      how: { type: 'enum', options: ['even', 'faster', 'slower'], default: 'even', label: 'how',
             labels: { even: 'even', faster: 'speeding up', slower: 'slowing down' } },
    },
    apply(marks, p) {
      const n = marks.length;
      if (n < 2) return marks;
      const t0 = Number(marks[0].t) || 0;
      const span = Math.max((Number(marks[n - 1].t) || 0) - t0, n * 16);
      marks.forEach((m, i) => {
        const u = i / (n - 1);
        m.t = t0 + span * (p.how === 'faster' ? Math.sqrt(u) : p.how === 'slower' ? u * u : u);
      });
      return marks;
    },
  },
};

/** The catalogue core/Cards.js draws its menu and its cards from. */
export const CATALOGUE = Object.fromEntries(Object.entries(KINDS).map(([id, k]) => [id, { id, label: k.label, params: k.params }]));

/** A modifier's values: its schema's defaults under what a recipe holds, so an older recipe lacks nothing. */
const valuesOf = (kind, given) => ({
  ...Object.fromEntries(Object.entries(kind.params).map(([key, spec]) => [key, spec.default])),
  ...(given || {}),
});

/**
 * A flower's marks through a chain — `[{ id, params, on }]`, as core/Cards.js
 * keeps a list — in its order, one switched off left out.
 *
 * @param {object[]} marks   the source's: never changed
 * @param {object[]} chain
 * @param {object} [opts]
 * @param {number|string} [opts.seed=0]            what every random draw comes from
 * @param {Map<string, number>} [opts.sizes]        how many images each family has, to keep a number within it
 * @returns {object[]} the new marks
 */
export function applyChain(marks, chain, { seed = 0, sizes = new Map() } = {}) {
  let out = (marks || []).map(m => ({ ...m }));
  (chain || []).forEach((entry, place) => {
    const kind = entry && entry.on !== false ? KINDS[entry.id] : null;
    if (!kind || !out.length) return;
    const p = valuesOf(kind, entry.params);
    out = kind.apply(out, p, {
      pick: chosen(out.length, p),
      rng: makeRng(seedFrom(`${seed}:${place}:${entry.id}`)),
      sizes,
      middle: middleOf(out),
    });
  });
  return out;
}
