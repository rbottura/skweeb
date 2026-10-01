/**
 * maps.js — what the player asks of a map before it draws anything: which
 * things answer when used, what a sign shows, and which map a warp leads to.
 * Pure, so tests/map-play.mjs holds it without a page.
 *
 * A warp names a map, not an object (apps/map/walk.js): the latest map of
 * that name in the vault, so a room saved again is still where its doors
 * lead. A map's title is its name (save.js).
 */

/** Whether a thing answers when it is used: a sign shows, a warp leads away. */
export const answers = block => !!block && (block.event === 'sign' || block.event === 'warp');

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
