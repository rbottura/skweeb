/**
 * cycles.js — no page that comes to hold itself (L3, 2026-11-06;
 * docs/smart-objects.md, *Versions*).
 *
 * A smart object places others by reference — `refs`, what it still depends
 * on — and they may place others: a page holding a page. Saved again with
 * refs that lead back to it — A holding B holding A — it would hold itself,
 * and drawing it would never end. So its next state is refused, here before
 * it is sent (core/vault.js `save`) and by the server too
 * (server/versions.js, the same walk written for Node's require), with the
 * chain named. A new object cannot close one: nothing yet holds its id. A
 * state named — `skw_…@v3` — is walked as the object it names.
 *
 * Pure: no DOM, no fetch (tests/smart.mjs).
 */

/** An id without the state it may name: `skw_…@v3` is `skw_…`. */
const bare = id => String(id).split('@')[0];

/**
 * The chain by which `id`, holding `refs`, would come to hold itself — `[A, B, A]` — or null.
 *
 * @param {string} id          the smart object saved again
 * @param {string[]} refs      what its next state holds
 * @param {(id: string) => ?string[]} refsOf   what an object holds now — its index row's `refs`
 * @returns {?string[]}
 */
export function cycleOf(id, refs, refsOf) {
  const seen = new Set();
  const walk = (at, chain) => {
    const here = bare(at);
    if (here === id) return [...chain, here];
    if (seen.has(here)) return null;
    seen.add(here);
    for (const next of refsOf(here) || []) {
      const found = walk(next, [...chain, here]);
      if (found) return found;
    }
    return null;
  };
  for (const r of refs || []) {
    const found = walk(r, [id]);
    if (found) return found;
  }
  return null;
}

/** The chain in words, for a refusal: "A → B → A", titles where they are known. */
export const chainSaid = (chain, titleOf = id => id) => chain.map(id => titleOf(id) || id).join(' → ');
