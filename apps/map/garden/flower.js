/**
 * flower.js — a flower (M14): a drawing that keeps its marks, opened to be
 * drawn as it grows, changed by the gardener's treatment, and kept as the
 * next generation.
 *
 * A flower is any still that keeps its marks (core/stage/still.js
 * `hasMarks`): the gamepad's, or one the garden made. A generation is such a
 * still too, its recipe a gamepad still's — `canvas`, `frame`, `marks` — so
 * core draws it at any scale, compose places it, a map stands it, the rig
 * rigs it; and `garden`, what made it — `{ source, chain, seed, generation,
 * name }` — its source its parent. Its marks are the chain's work kept, so it
 * stands without its source and is the source of the next.
 */

import { stampsOf, drawStill, hasMarks, spriteKey } from '../../../core/stage/still.js';
import { familySprite, familySize } from '../../../core/sprites.js';
import { surface }       from '../../../core/surface.js';
import { Vault }         from '../../../core/vault.js';
import { thumbFromBlob } from '../../../core/thumb.js';
import { toPng }         from '../../../core/export.js';
import { applyChain }    from './modifiers.js';

/** A garden's flowers are the map's, as the things on a map are (../save.js). */
export const APP = { app: 'map', version: '1.0.0' };

const LONGEST = 4096;      // the longest side a generation's picture is drawn at: past it, its frame is scaled in
const PAD = 4;             // kept clear round a generation's ink, in its canvas's pixels

/** Whether an object is a flower: a still that keeps its marks. */
export const isFlower = o => !!o && o.type === 'still' && hasMarks(o.recipe);

/** The pictures marks are drawn with, each loaded once (core/sprites.js), and how many each family has. */
export class Sprites {
  constructor() {
    this.images = new Map();      // spriteKey → its picture
    this.sizes = new Map();       // familyId → how many images it has; 0, unknown
    this._asked = new Map();      // a spriteKey, or `#` and a family → what loads it
  }

  /** Every picture `marks` name, in — and the size of each family they draw from. */
  async need(marks) {
    const waits = new Set();
    for (const m of marks) {
      const key = spriteKey(m.familyId, m.spriteIndex), fam = '#' + m.familyId;
      if (!this._asked.has(key)) {
        this._asked.set(key, familySprite(m.familyId, m.spriteIndex).then(image => { if (image) this.images.set(key, image); }));
      }
      if (!this._asked.has(fam)) this._asked.set(fam, familySize(m.familyId).then(n => { this.sizes.set(m.familyId, n); }));
      waits.add(this._asked.get(key));
      waits.add(this._asked.get(fam));
    }
    await Promise.all(waits);
  }
}

/** The box round a drawing's stamps as drawn — each its picture's size, turned and scaled — in its canvas's pixels. */
export function inkOf(canvas, marks, images) {
  const { stamps } = stampsOf({ canvas, frame: null, marks });
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of stamps) {
    const image = images.get(s.key);
    if (!image) continue;
    const c = Math.abs(Math.cos(s.rotation)), n = Math.abs(Math.sin(s.rotation)), k = Math.abs(s.scale) / 2;
    const hw = (image.width * c + image.height * n) * k, hh = (image.width * n + image.height * c) * k;
    x0 = Math.min(x0, s.x - hw);
    x1 = Math.max(x1, s.x + hw);
    y0 = Math.min(y0, s.y - hh);
    y1 = Math.max(y1, s.y + hh);
  }
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

/**
 * A generation's drawing: its marks on a canvas that holds all their ink —
 * grown alike on opposite sides, so a pattern's mirror, round the canvas's
 * middle, stays where it was — framed round that ink as the gamepad frames a
 * still, its picture no longer than LONGEST, on no ground.
 *
 * @param {{w: number, h: number}} canvas   the source's
 * @param {object[]} marks                   the chain's
 * @param {Map} images                       what they are drawn with (Sprites)
 * @returns {{canvas: object, frame: object, marks: object[]}}
 */
export function fitted(canvas, marks, images) {
  const cw = canvas.w || 1, ch = canvas.h || 1;
  const ink = inkOf({ w: cw, h: ch }, marks, images) || { x: 0, y: 0, w: cw, h: ch };
  const mx = Math.ceil(Math.max(0, PAD - ink.x, ink.x + ink.w + PAD - cw));
  const my = Math.ceil(Math.max(0, PAD - ink.y, ink.y + ink.h + PAD - ch));
  const from = { x: Math.floor(ink.x - PAD) + mx, y: Math.floor(ink.y - PAD) + my,
                 w: Math.ceil(ink.w + 2 * PAD), h: Math.ceil(ink.h + 2 * PAD) };
  const k = Math.min(1, LONGEST / Math.max(from.w, from.h));
  const w = Math.max(1, Math.round(from.w * k)), h = Math.max(1, Math.round(from.h * k));
  return {
    canvas: { w: cw + 2 * mx, h: ch + 2 * my, background: 'none' },
    frame: { from, to: { x: 0, y: 0, w, h }, w, h },
    marks: mx || my ? marks.map(m => ({ ...m, x: m.x + mx, y: m.y + my })) : marks,
  };
}

/** A flower opened to be drawn: its stamps where its recipe places them, its picture's size, its marks' count. */
export function bloomOf(recipe) {
  const still = stampsOf(recipe);
  return { still, marks: recipe.marks.length, width: still.width, height: still.height };
}

/**
 * A flower `count` marks grown, drawn into `canvas` — the stamps of its first
 * `count` marks, in their order — at `view` canvas pixels per picture pixel,
 * on no ground: in the garden a flower stands on the earth.
 */
export function drawGrown(canvas, bloom, images, count, view) {
  const all = bloom.still.stamps;
  const stamps = count >= bloom.marks ? all : all.filter(s => s.mark < count);
  drawStill(canvas.getContext('2d'), { ...bloom.still, ground: null, stamps }, images, view);
}

/**
 * What the treatment makes of a flower: its marks through the chain, fitted
 * on a canvas that holds their ink — every picture they name loaded first.
 * Null when nothing is left of it.
 *
 * @param {object} source    the flower's envelope
 * @param {object[]} chain   `[{ id, params, on }]` (modifiers.js)
 * @param {number} seed
 * @param {Sprites} sprites
 */
export async function nextOf(source, chain, seed, sprites) {
  const recipe = source.recipe;
  await sprites.need(recipe.marks);            // the families' sizes, before an image's number counts on them
  const marks = applyChain(recipe.marks, chain, { seed, sizes: sprites.sizes });
  if (!marks.length) return null;
  await sprites.need(marks);
  return fitted(recipe.canvas || {}, marks, sprites.images);
}

/** A generation's name: the first flower's title, and how many generations from it. */
export function generationOf(source) {
  const was = (source.recipe && source.recipe.garden) || null;
  return { generation: ((was && was.generation) || 0) + 1, name: (was && was.name) || source.title || 'a flower' };
}

/**
 * The next generation into the vault: its picture drawn from its marks at its
 * own size, its source its parent, what made it in its recipe.
 *
 * @returns {Promise<?object>}  the envelope — null with no vault, downloaded instead
 */
export async function saveGeneration({ source, drawing, chain, seed, images }) {
  const still = stampsOf(drawing);
  const canvas = surface(still.width, still.height);
  drawStill(canvas.getContext('2d'), still, images, 1);
  const blob = await toPng(canvas);
  const { generation, name } = generationOf(source);
  return Vault.save({
    type: 'still',
    title: `${name} · g${generation}`,
    tags: ['garden', 'flower'],
    origin: APP,
    seed,
    recipe: { ...drawing, garden: { source: source.id, chain, seed, generation, name } },
    parents: [source.id],
    render: { blob, ext: 'png', w: canvas.width, h: canvas.height, density: 1 },
    thumb: await thumbFromBlob(blob),
  });
}
