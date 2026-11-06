/**
 * bec-palettes.js — BEC_2025's palettes, as its class.js writes them: its
 * identity's original first, then the two its source kept beside it, each
 * colour named as BEC named it (`BECcolorsId`). One place for the 3D app's
 * grid (grid.js) and the vault's import of BEC (apps/vault/bec-import.js,
 * M13b), which brings them in as palettes.
 */

/** What BEC called its five colours, in their order. */
export const NAMES = ['blue', 'red', 'green', 'yellow', 'black'];

export const PALETTES = {
  bec: ['#0073dc', '#e40514', '#00a773', '#ffd400', '#000000'],
  mix: ['#1a9eda', '#da214b', '#00a773', '#ffcb04', '#000000'],
  'grand paris sud': ['#1a9eda', '#da214b', '#21a654', '#ffcb04', '#000000'],
};
