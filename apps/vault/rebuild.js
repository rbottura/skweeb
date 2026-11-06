/**
 * rebuild.js — the vault app's answers to core (core/rebuild.js, core/reopen.js).
 *
 * The vault app makes nothing but what is made of objects, by hand, for
 * every app (docs/workshop.md): a palette (V1). A palette is a picture — its
 * swatches' strip — so it is drawn as itself and never again at a scale; it
 * reopens here, where its detail edits its colours. Without this file, a
 * palette's link asked for it, and every console said 404.
 */

/** A palette reopens in the vault app: `/apps/vault/?open=<id>`. */
export const reopens = object => !!object && object.type === 'palette';

/** Nothing is drawn again at a scale: a palette is its picture. */
export const redraws = () => false;
