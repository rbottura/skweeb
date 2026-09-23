/**
 * params-dots.js — stage one's parameters, and so a `dataset`'s recipe.
 *
 * v2's first layer, control for control — its text panel, its generator tab,
 * its image tab, its grid panel — in drawers (GROUPS below), each showing only
 * for the input it belongs to. The ranges are v2's slider ranges. Where a
 * default differs from v2 it says so, and why.
 */

import { defineParams } from '../../core/params.js';

/** The dots panel's drawers, top to bottom. */
export const GROUPS = {
  input:  { label: 'Input', open: true },
  type:   { label: 'Type', open: true },
  range:  { label: 'Glyph range', open: true },
  image:  { label: 'Image', open: true },
  grid:   { label: 'White grid', open: true },
  canvas: { label: 'Canvas', open: false },
};

/**
 * @param {{fonts: Array<{id, label}>}} fontManifest
 */
export function dotsParams(fontManifest) {
  const fonts = (fontManifest.fonts || []).map(f => f.id);
  const fontLabels = Object.fromEntries((fontManifest.fonts || []).map(f => [f.id, f.label]));
  const typed = { input: ['text', 'glyphs'] };

  return defineParams('ckt-dots', {
    /**
     * What gets cut. v2's three tabs: WORD, DATASET, IMAGE.
     * `text` is one entry; `glyphs` is one entry per character; see dots.js.
     */
    input: {
      type: 'enum', options: ['text', 'glyphs', 'image'], default: 'text',
      display: 'chips', label: 'input', group: 'input',
    },

    // ── Type — v2's text panel ─────────────────────────────────────────────

    /** v2's text box: several lines, each `leading` below the last. */
    text: { type: 'text', default: 'ckt', label: 'text', multiline: true, group: 'type', when: { input: 'text' } },

    /** The faces in assets/fonts/. v2's default was the system's Garamond. */
    font: {
      type: 'enum', options: fonts.length ? fonts : ['none'],
      default: fonts.find(id => id.startsWith('cormorant')) || fonts[0] || 'none',
      label: 'face', labels: fontLabels, group: 'type', when: typed,
    },

    style: {
      type: 'enum', options: ['normal', 'italic', 'bold', 'bold italic'], default: 'normal',
      display: 'chips', label: 'style', group: 'type', when: typed,
    },

    /** v2's `fs`, 20–750. Its script started at 250, whatever its slider showed. */
    size: { type: 'int', min: 20, max: 750, default: 250, label: 'size', group: 'type', when: typed },

    /**
     * v2's `lh`, between the baselines of typed lines. Its script started at
     * 50, which stacks 250px lines into one another; one line per line is the
     * default here, and 50 is a drag away.
     */
    leading: { type: 'int', min: 20, max: 650, default: 250, label: 'leading', group: 'type', when: { input: 'text' } },

    /** v2's `mt`: the first baseline sits at size − size/4 + this. */
    top: { type: 'int', min: 0, max: 500, default: 250, label: 'margin top', group: 'type', when: typed },

    // ── Glyphs — v2's dataset generator ────────────────────────────────────

    /**
     * Character codes, `from` included, `to` not, as v2's genText() looped.
     * v2 opened at 50–60; 65–123 is A to z, 58 glyphs — the size of `garam`,
     * `peace`, and the Garam_blue family made from one of them. The range
     * stops at the end of Cyrillic because a slider across all of Unicode
     * cannot land on 65; the typed box beside it can land anywhere in range.
     */
    from: { type: 'int', min: 32, max: 1327, default: 65, label: 'from (code)', group: 'range', when: { input: 'glyphs' } },
    to:   { type: 'int', min: 33, max: 1328, default: 123, label: 'to (code)', group: 'range', when: { input: 'glyphs' } },

    // ── Image — v2's image tab ─────────────────────────────────────────────

    /** A still or shape from the vault. Choosing one is the whole of the lineage. */
    image: { type: 'object', accepts: ['still', 'shape'], label: 'image', group: 'image', when: { input: 'image' } },

    imageScale: {
      type: 'range', min: 0.01, max: 5, step: 0.01, default: 1, label: 'image size',
      group: 'image', when: { input: 'image' },
    },

    /**
     * Offset from the canvas centre. v2 measured from the window's corner and
     * opened at 250,250 turned 90°; from the centre, 0,0 unturned is the image
     * where you would expect it.
     */
    imageX: { type: 'int', min: -2000, max: 2000, default: 0, label: 'image x', group: 'image', when: { input: 'image' } },
    imageY: { type: 'int', min: -2000, max: 2000, default: 0, label: 'image y', group: 'image', when: { input: 'image' } },
    imageRotation: {
      type: 'int', min: 0, max: 360, default: 0, label: 'image rotation',
      group: 'image', when: { input: 'image' },
    },

    // ── The grid — v2's grid panel, and the whole trick ────────────────────

    grid: { type: 'bool', default: true, label: 'white grid', group: 'grid' },

    /**
     * White line width and the ink left between lines — so dot size and dot
     * pitch together. v2's sliders showed 4 and 4; its script started at 3.
     * 4 and 4 is what its own screenshots were made with.
     */
    line:  { type: 'int', min: 1, max: 20, default: 4, label: 'line', group: 'grid', when: { grid: true } },
    space: { type: 'int', min: 1, max: 20, default: 4, label: 'space', group: 'grid', when: { grid: true } },

    /**
     * v2's last version added this and opened at 45°. The nine shipped
     * datasets were cut square — their nearest neighbours are straight across
     * and straight down — so square is the default here.
     */
    rotation: { type: 'int', min: 0, max: 180, default: 0, label: 'grid rotation', group: 'grid', when: { grid: true } },

    // ── The canvas ─────────────────────────────────────────────────────────

    /** v2 cut whatever size the browser window was. 1920x1080 is that window. */
    width:  { type: 'int', min: 64, max: 8192, default: 1920, label: 'canvas width', group: 'canvas' },
    height: { type: 'int', min: 64, max: 8192, default: 1080, label: 'canvas height', group: 'canvas' },

    /** Blobs smaller than this are not dots. 1 keeps everything v2 kept. */
    minBlob: { type: 'int', min: 1, max: 400, default: 1, label: 'min blob', group: 'canvas' },
  });
}
