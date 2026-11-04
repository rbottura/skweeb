/**
 * layout.js — where each state of a smart object sits in its graph (S7a;
 * core/shell/graph.js): its depth from v1 up — a merge one past the deeper of
 * its two parents — and a column per branch, a state taking its parent's
 * column unless another child took the place above it first. v1 at the
 * bottom, the newest at the top. Pure: no DOM, tests/graph-layout.mjs.
 */

export const W = 132, H = 150;
const GAP_X = 48, GAP_Y = 46;

/** Each state's place: its depth from v1 up, a column per branch. */
export function layout(states) {
  const at = new Map(), depth = new Map(), used = new Map();     // version → {col, row}; col → rows taken
  let cols = 0;
  for (const st of states) {
    const p = st.parent && at.get(st.parent);
    const d = p ? Math.max(depth.get(st.parent) + 1, st.parent2 ? (depth.get(st.parent2) || 0) + 1 : 0) : 0;
    depth.set(st.version, d);
    let col = p ? p.col : 0;
    if (p && (used.get(col) || new Set()).has(d)) col = cols;          // the place above its parent taken: a branch, a column of its own
    if (!p && at.size) col = cols;
    cols = Math.max(cols, col + 1);
    if (!used.has(col)) used.set(col, new Set());
    used.get(col).add(d);
    at.set(st.version, { col, row: d });
  }
  const rows = Math.max(0, ...[...depth.values()]);
  return new Map([...at].map(([v, { col, row }]) => [v, { x: col * (W + GAP_X), y: (rows - row) * (H + GAP_Y) }]));
}
