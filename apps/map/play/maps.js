/**
 * maps.js — what the player asks of a map before it draws anything: which
 * things answer when used, what a sign shows, and which map a warp leads to.
 * Pure, so tests/map-play.mjs holds it without a page.
 *
 * A warp names a map, not an object (apps/map/walk.js): the latest map of
 * that name in the vault, so a room saved again is still where its doors
 * lead. A map's title is its name (save.js).
 */

/** Whether a thing answers when it is used: a sign shows, a warp leads away, an effect plays. */
export const answers = block => !!block && (block.event === 'sign' || block.event === 'warp' || block.event === 'effect');

/** What an effect plays, and where: the object, the cell it is centred on, how many tiles wide — or null for any other block. */
export const effectOf = block => (block && block.event === 'effect'
  ? { plays: block.plays || null, col: block.col, row: block.row, over: block.over > 0 ? block.over : 3 } : null);

const RATE = 24;    // frames a second, for what names no rate
const HELD = 0.5;   // seconds a single picture is held: a flash

/**
 * The frame an effect shows `ms` after it began, played once — or -1 when it
 * is over, and before it began. A loop is played once round as a life is; a
 * still, one frame, is held half a second.
 */
export function effectFrame(ms, fps, length) {
  const rate = fps > 0 ? fps : RATE, n = Math.max(1, Math.floor(length) || 1);
  if (!(ms >= 0)) return -1;
  if (n === 1) return ms < HELD * 1000 ? 0 : -1;
  const i = Math.floor((ms / 1000) * rate);
  return i < n ? i : -1;
}

/** Where an effect is drawn, in the map's pixels: centred on its cell, `over` tiles wide, its height its frames' shape. */
export function effectBox(effect, size, tile) {
  const w = effect.over * tile;
  const h = size && size.width > 0 && size.height > 0 ? (w * size.height) / size.width : w;
  return { x: (effect.col + 0.5) * tile - w / 2, y: (effect.row + 0.5) * tile - h / 2, w, h };
}

/**
 * What a sign shows: its picture — another object, or the thing itself — and
 * its words. A sign with neither picture nor object shows its words alone.
 *
 * @returns {{picture: ?string, says: string}}
 */
export const signOf = block => ({ picture: block.shows || block.ref || null, says: block.says || '' });

/**
 * The map of a name, its latest: the newest map in the vault's index so
 * called — or null when there is none.
 *
 * @param {Array<{id, type, title, created}>} index   the vault's index rows
 * @param {string} name
 */
export function latestMap(index, name) {
  let best = null;
  for (const row of index || []) {
    if (!row || row.type !== 'map' || row.title !== name) continue;
    if (!best || String(row.created) > String(best.created)) best = row;
  }
  return best;
}
