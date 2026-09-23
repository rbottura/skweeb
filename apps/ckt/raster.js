/**
 * raster.js — stage one's first half: the picture the dots are cut from.
 *
 * v2's p5 sketch in `script.js`, redrawn every frame on a white canvas the
 * size of the window:
 *
 *     background(255)
 *     text | one character of a range | an image      in black
 *     the white grid, rotated about the canvas centre
 *
 * and then `p5_opencv.js` read that canvas. The grid is the whole trick: a
 * letter is one solid blob, and ruling white lines across it leaves one small
 * black cell per crossing — one dot each, once blobs.js has found them. So
 * line thickness and spacing are the dot size and the dot pitch, and they are
 * the parameters that decide how many dots a letter becomes.
 *
 * No p5 here, for the reason grid has none: everything v2 asked of p5 on this
 * canvas is Canvas 2D — fillText, drawImage, stroked lines — and a render that
 * holds no p5 instance can move to a worker.
 */

import { surface } from './surface.js';

const DEG = Math.PI / 180;

/** Canvas font-style words for each of v2's four text styles. */
export const STYLES = {
  normal: '',
  italic: 'italic',
  bold: 'bold',
  'bold italic': 'italic bold',
};

/**
 * The white grid as line segments, in canvas pixels.
 *
 * v2's geometry exactly: rotate about the canvas centre, then rule lines at
 * every multiple of `line + space` measured from the canvas's own origin, in
 * both directions. v2 over-drew by a fixed 450px so the rotated grid still
 * reached the corners; this covers the circle through the corners instead,
 * which is the same at any size.
 *
 * @param {number} w
 * @param {number} h
 * @param {{line:number, space:number, rotation:number}} grid  rotation in degrees
 * @returns {{weight:number, pitch:number, segments:number[][]}}  [x1, y1, x2, y2]
 */
export function gridLines(w, h, { line, space, rotation }) {
  const pitch = Math.max(1, line + space);
  const t = (rotation || 0) * DEG;
  const cos = Math.cos(t), sin = Math.sin(t);
  const cx = w / 2, cy = h / 2;
  const R = Math.hypot(w, h) / 2;

  // From the grid's own frame back to the canvas: rotate about the centre.
  const toCanvas = (x, y) => [
    cx + (x - cx) * cos - (y - cy) * sin,
    cy + (x - cx) * sin + (y - cy) * cos,
  ];

  const segments = [];
  const kMinY = Math.floor((cy - R) / pitch), kMaxY = Math.ceil((cy + R) / pitch);
  for (let k = kMinY; k <= kMaxY; k++) {
    segments.push([...toCanvas(cx - R, k * pitch), ...toCanvas(cx + R, k * pitch)]);
  }
  const kMinX = Math.floor((cx - R) / pitch), kMaxX = Math.ceil((cx + R) / pitch);
  for (let k = kMinX; k <= kMaxX; k++) {
    segments.push([...toCanvas(k * pitch, cy - R), ...toCanvas(k * pitch, cy + R)]);
  }

  return { weight: line, pitch, segments };
}

/** Rule the grid in white. One path, one stroke: overlaps of white on white cost nothing. */
export function drawGrid(ctx, w, h, grid) {
  const { weight, segments } = gridLines(w, h, grid);
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = weight;
  ctx.lineCap = 'round';                   // p5's default; the ends are off the canvas anyway
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of segments) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Set text as v2 did: centred on the canvas's middle column, first baseline at
 * `size − size/4 + top` — v2's own formula — and every further line
 * `leading` lower. v2 never wrapped: a line ends where you typed a return.
 *
 * @param {object} t  { text, family, style, size, leading, top }
 */
export function drawText(ctx, w, h, t) {
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${STYLES[t.style] || ''} ${t.size}px "${t.family}", serif`.trim();

  const first = t.size - t.size / 4 + t.top;
  String(t.text).split('\n').forEach((line, i) => {
    ctx.fillText(line, w / 2, first + i * t.leading);
  });
  ctx.restore();
}

/**
 * Place an image: its centre at the canvas centre plus an offset, turned and
 * scaled about its own centre. v2 scaled, then translated, then rotated, with
 * the offset measured from the window's corner; measuring from the middle
 * keeps an image put where it was when the canvas changes size.
 *
 * @param {object} p  { scale, x, y, rotation }
 */
export function drawImage(ctx, w, h, image, p) {
  const iw = image.width, ih = image.height;
  ctx.save();
  ctx.translate(w / 2 + (p.x || 0), h / 2 + (p.y || 0));
  ctx.rotate((p.rotation || 0) * DEG);
  ctx.scale(p.scale || 1, p.scale || 1);
  ctx.drawImage(image, -iw / 2, -ih / 2);
  ctx.restore();
}

/**
 * The whole picture for one entry of a dataset.
 *
 * @param {object} recipe   stage one's params.values
 * @param {object} deps
 * @param {string} [deps.family]  the loaded face, for text and glyphs
 * @param {CanvasImageSource} [deps.image]  for the image input
 * @param {?string} entry   the string to set: the text, or one character
 * @returns {OffscreenCanvas|HTMLCanvasElement}
 */
export function raster(recipe, deps, entry) {
  const w = recipe.width, h = recipe.height;
  const canvas = surface(w, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  if (recipe.input === 'image') {
    if (deps.image) drawImage(ctx, w, h, deps.image, {
      scale: recipe.imageScale, x: recipe.imageX, y: recipe.imageY, rotation: recipe.imageRotation,
    });
  } else if (entry != null && deps.family) {
    drawText(ctx, w, h, {
      text: entry, family: deps.family, style: recipe.style,
      size: recipe.size, leading: recipe.leading, top: recipe.top,
    });
  }

  if (recipe.grid) {
    drawGrid(ctx, w, h, { line: recipe.line, space: recipe.space, rotation: recipe.rotation });
  }

  return canvas;
}
