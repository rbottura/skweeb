/**
 * flatten.js — a smart placement made ordinary (L2, 2026-11-06;
 * docs/plan.md, *L*): the way out when a chain gets too clever.
 *
 * The smart object a placement holds, at the state it is placed at — the one
 * it is kept at, or its latest — is saved as an object of its own kind: the
 * recipe and seed of that state, its picture of then, and `parents:
 * ["skw_…@vN"]` with no refs, so it follows nothing (core/vault.js leaves a
 * state named out of the refs; the vault's kin and its delete read it as the
 * object it names). The placement then points at it. Flattened again, the
 * vault hands the first back: the same bytes, the same recipe.
 */

import { Vault }         from '../../core/vault.js';
import { innerOf }       from '../../core/smart.js';
import { thumbFromBlob } from '../../core/thumb.js';

/** Whether a placement holds a smart object, to be flattened. */
export const flattens = block => !!block && String(block.ref || '').startsWith('skw_');

/**
 * The smart object a placement holds, at its state, saved as an ordinary object.
 *
 * @param {object} block   a placement's block: its `ref`, and `version` when it is kept at one
 * @returns {Promise<{object: object, version: number}>}   what it was flattened into, and from which state
 */
export async function flatten(block) {
  if (!flattens(block)) throw new Error('it holds no smart object');
  const { object: skw, url: latest } = await Vault.load(block.ref);
  const version = Number.isInteger(block.version) ? block.version : (skw.version || 1);
  const { object: inner, url } = await innerOf(skw, { version });
  const res = await fetch(url || latest);
  if (!res.ok) throw new Error(`its picture at version ${version} did not load`);
  const blob = await res.blob();
  const r = inner.render || {};
  const object = await Vault.save({
    type: inner.type,
    title: inner.title,
    note: `flattened from ${skw.id} at version ${version}`,
    tags: [...(skw.tags || []).filter(t => !String(t).startsWith('folder:')), 'flattened'],
    origin: inner.origin,
    recipe: inner.recipe,
    seed: inner.seed,
    parents: [`${skw.id}@v${version}`],
    render: { blob, ext: String(r.file || 'render.png').split('.').pop(), w: r.w, h: r.h,
              frames: r.frames, fps: r.fps, loop: !!r.loop },
    thumb: await thumbFromBlob(blob),
  });
  if (!object) throw new Error('no vault to flatten it into');
  return { object, version };
}
