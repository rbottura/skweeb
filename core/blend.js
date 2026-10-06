/**
 * blend.js — how a placement meets what is under it (docs/smart-objects.md,
 * *Placement*: `blend`).
 *
 * The names are CSS's, and one spec — W3C Compositing and Blending — defines
 * them for CSS's `mix-blend-mode` and canvas's `globalCompositeOperation`
 * alike: so a window shows a layer with CSS as a save draws it on a canvas.
 * Canvas spells two of them its own way: normal is `source-over`, and
 * plus-lighter — light added, a glow's — is `lighter`.
 */

/** Every blend a placement may have; `normal` is the one a block leaves out. */
export const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn',
  'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity', 'plus-lighter'];

/** Its name in a panel. */
export const BLEND_LABELS = { 'plus-lighter': 'add' };

/** A blend as canvas's `globalCompositeOperation` takes it; anything unknown, normal. */
export function compositeOf(blend) {
  if (blend === 'plus-lighter') return 'lighter';
  return BLENDS.includes(blend) && blend !== 'normal' ? blend : 'source-over';
}

/** A blend as CSS's `mix-blend-mode` takes it; anything unknown, normal. */
export const cssBlendOf = blend => (BLENDS.includes(blend) ? blend : 'normal');
