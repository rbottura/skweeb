/**
 * merge.js — two states, one merged into the other (S7b, 2026-11-03;
 * core/shell/graph.js), as git merges, in the author's words: "en gardant la
 * priorité des valeurs sans conflit de la branche qui reçoit". Their base is
 * the nearest state both came from; what only the arriving one changed since
 * is taken, what only the receiving one changed is kept, and where both did,
 * a conflict keeps the receiving one's value until the arriving one's is
 * picked. Saved, a merge is a state with both as its parents (`parent2`).
 * Pure: tests/merge.mjs.
 */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Every state `v` came from, itself included, by parents and merges' second. */
export function ancestors(states, v) {
  const by = new Map(states.map(s => [s.version, s]));
  const out = new Set(), todo = [v];
  while (todo.length) {
    const x = todo.pop();
    if (x == null || out.has(x)) continue;
    out.add(x);
    const s = by.get(x);
    if (s) todo.push(s.parent, s.parent2);
  }
  return out;
}

/** The nearest state both came from: the latest of those they share. */
export function mergeBase(states, a, b) {
  const A = ancestors(states, a);
  let best = null;
  for (const x of ancestors(states, b)) if (A.has(x) && (best == null || x > best)) best = x;
  return best;
}

/**
 * What a merge does, value by value, for the parts of the page's recipe —
 * each `{ id, keys, recv, inc, base }`, the values a params has in the
 * receiving state, the arriving one and their base.
 *
 * @returns {Array<{ id, key, recv, inc, kind: 'incoming' | 'receiving' | 'both', take: boolean }>}
 *   only the values the two states differ in; `take` the arriving one's
 */
export function plan(parts) {
  const rows = [];
  for (const { id, keys, recv, inc, base } of parts) {
    for (const key of keys) {
      const r = recv[key], i = inc[key], b = base ? base[key] : undefined;
      if (same(r, i)) continue;
      const rc = !same(r, b), ic = !same(i, b);
      const kind = rc && ic ? 'both' : ic ? 'incoming' : 'receiving';
      rows.push({ id, key, recv: r, inc: i, kind, take: kind === 'incoming' });
    }
  }
  return rows;
}

/** A part's values merged: the receiving state's, with what is taken from the arriving one. */
export function merged(recv, rows, id) {
  const out = { ...recv };
  for (const r of rows) if (r.id === id && r.take) out[r.key] = r.inc;
  return out;
}
