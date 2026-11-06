/**
 * walk.js — what can be walked on a map, and where its avatar starts. Pure
 * arithmetic on a recipe, so tests/map-walk.mjs holds it without a page and
 * the player, later, asks the same questions the editor shows.
 *
 * Pokémon's rule: whether a cell can be walked is kept apart from the tile
 * drawn there. A map's `walls` is a flag a cell, row after row, beside its
 * `cells`; a recipe without one — saved before walls — is walkable all over.
 * A thing made *solid* blocks the cells under its feet: its own, and on its
 * row those its width covers more than half of — one cell at a width of one
 * or two, three at three or four — so a wide table stops the avatar along its
 * length, and nothing it rises over above.
 *
 * The spawn is where the avatar appears on the map, and the way it faces: a
 * thing whose event is `spawn`, the first one if there were more; the middle
 * cell, facing down, on a map with none.
 *
 * A warp names a map, not an object: the latest map of that name, so a map
 * saved again is still where its doors lead. Through one, the avatar arrives
 * on that map's warp back — the first whose `to` names the map it left, as
 * Pokémon pairs its doors — or at its spawn when there is none. Arriving on
 * a warp is not stepping onto it: only a step from another cell goes through.
 *
 * The avatar's steps (P4): the cell ahead, what answers there for E, the
 * warp a step goes through, and the shortest way to a cell a tap names —
 * through no warp but the one it ends on.
 */

/** The ways the avatar can face, the first its default. */
export const FACES = ['down', 'up', 'left', 'right'];

/**
 * The cells a solid thing's feet stand on, as `{ col, row }` — none for a
 * thing that is not solid.
 *
 * @param {{col: number, row: number, width?: number, solid?: boolean}} block
 */
export function blockedBy(block) {
  if (!block || !block.solid) return [];
  const reach = Math.max(0, Math.ceil((block.width > 0 ? block.width : 1) / 2) - 1);
  const out = [];
  for (let col = block.col - reach; col <= block.col + reach; col++) out.push({ col, row: block.row });
  return out;
}

/**
 * Every cell of a map, walkable (true) or not, row after row — a wall on it,
 * or a solid thing's feet.
 *
 * @param {{map: object, walls?: number[], place?: object[]}} recipe
 * @returns {boolean[]}
 */
export function walkGrid(recipe) {
  const { cols, rows } = recipe.map;
  const walls = recipe.walls || [];
  const out = Array.from({ length: cols * rows }, (_, i) => !walls[i]);
  for (const block of recipe.place || []) {
    for (const { col, row } of blockedBy(block)) {
      if (col >= 0 && row >= 0 && col < cols && row < rows) out[row * cols + col] = false;
    }
  }
  return out;
}

/**
 * Whether the avatar can stand on a cell: on the map, no wall there, no solid
 * thing's feet. One cell asked, as the avatar asks before each step.
 */
export function walkable(recipe, col, row) {
  const { cols, rows } = recipe.map;
  if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || row < 0 || col >= cols || row >= rows) return false;
  if ((recipe.walls || [])[row * cols + col]) return false;
  return !(recipe.place || []).some(b => blockedBy(b).some(c => c.col === col && c.row === row));
}

/**
 * Where the avatar appears, and which way it faces.
 *
 * @returns {{col: number, row: number, face: string, from: ?number}}  `from`
 *          the index in `place` of the thing that says so, null for none
 */
export function spawnOf(recipe) {
  const { cols, rows } = recipe.map;
  const place = recipe.place || [];
  const at = place.findIndex(b => b && b.event === 'spawn');
  if (at < 0) return { col: Math.floor(cols / 2), row: Math.floor(rows / 2), face: FACES[0], from: null };
  const b = place[at];
  const within = (n, most) => Math.min(Math.max(0, Math.round(n) || 0), most);
  return { col: within(b.col, cols - 1), row: within(b.row, rows - 1),
           face: FACES.includes(b.face) ? b.face : FACES[0], from: at };
}

/**
 * Where the avatar arrives on a map it came to through a warp from the map
 * named `from`: on the warp leading back, facing down, out of the door — or
 * at the spawn.
 *
 * @returns {{col: number, row: number, face: string, by: ?number}}  `by` the
 *          index in `place` of the warp it arrived on, null at the spawn
 */
export function arrival(recipe, from) {
  const place = recipe.place || [];
  const at = from ? place.findIndex(b => b && b.event === 'warp' && b.to === from) : -1;
  if (at < 0) {
    const { col, row, face } = spawnOf(recipe);
    return { col, row, face, by: null };
  }
  const { cols, rows } = recipe.map;
  const within = (n, most) => Math.min(Math.max(0, Math.round(n) || 0), most);
  return { col: within(place[at].col, cols - 1), row: within(place[at].row, rows - 1), face: FACES[0], by: at };
}

// ── The avatar's steps (M8's fourth brick, P4, 2026-11-06; play/avatar.js) ──

/** One step each way the avatar can face, as a column and a row. */
export const STEPS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

/** The cell one step from `at` the way it faces. */
export function ahead(at, face) {
  const [dx, dy] = STEPS[face] || STEPS.down;
  return { col: at.col + dx, row: at.row + dy };
}

/** The way one cell is from another: the larger of the two moves, a tie the column's. */
export function faceTo(from, to) {
  const dx = to.col - from.col, dy = to.row - from.row;
  return Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? 'up' : 'down') : (dx < 0 ? 'left' : 'right');
}

/** Whether a block stands on a cell: its feet there, its width covering it as a solid thing's would. */
const covers = (block, col, row) => blockedBy({ ...block, solid: true }).some(c => c.col === col && c.row === row);

/** What answers on a cell — a sign or a warp standing on it — or null: what E uses, faced. */
export function answeringAt(recipe, col, row) {
  return (recipe.place || []).find(b => b && (b.event === 'sign' || b.event === 'warp') && covers(b, col, row)) || null;
}

/** The warp on a cell — what a step onto it goes through — or null. */
export function warpAt(recipe, col, row) {
  return (recipe.place || []).find(b => b && b.event === 'warp' && covers(b, col, row)) || null;
}

/**
 * The shortest way from one cell to another over cells that can be walked:
 * the cells stepped on in turn, `to` the last — breadth first, the ways
 * tried in FACES' order, so it is always the same way. A warp is gone
 * through only at the end: one on the way would take the avatar elsewhere.
 *
 * @returns {?{col: number, row: number}[]}  empty when it is there already;
 *          null when `to` cannot be walked, or no way reaches it
 */
export function pathTo(recipe, from, to) {
  const { cols, rows } = recipe.map;
  if (!walkable(recipe, to.col, to.row)) return null;
  if (from.col === to.col && from.row === to.row) return [];
  const open = walkGrid(recipe);
  const goal = to.row * cols + to.col;
  const warps = new Set();
  for (const b of recipe.place || []) {
    if (b && b.event === 'warp') for (const c of blockedBy({ ...b, solid: true })) warps.add(c.row * cols + c.col);
  }
  const start = from.row * cols + from.col;
  const came = new Map([[start, -1]]);
  const queue = [start];
  for (let k = 0; k < queue.length; k++) {
    const at = queue[k], col = at % cols, row = Math.floor(at / cols);
    for (const face of FACES) {
      const [dx, dy] = STEPS[face];
      const c = col + dx, r = row + dy, next = r * cols + c;
      if (c < 0 || r < 0 || c >= cols || r >= rows || came.has(next) || !open[next] || (warps.has(next) && next !== goal)) continue;
      came.set(next, at);
      if (next === goal) {
        const way = [];
        for (let i = goal; i !== start; i = came.get(i)) way.unshift({ col: i % cols, row: Math.floor(i / cols) });
        return way;
      }
      queue.push(next);
    }
  }
  return null;
}
