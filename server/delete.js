/**
 * server/delete.js — the one way an object leaves the vault.
 *
 *   POST /api/vault/delete    <- { ids: [id], dependents?: 'delete' | 'detach', dry? }
 *        -> 200 { status: 'deleted', deleted: [id], detached: [id] }
 *        -> 409 { status: 'dependents', dependents: [row], chain: [row] }
 *        -> 200 { status: 'plan', dependents, chain }     with dry: true, and nothing done
 *
 *   a row is { id, type, title, on: [the ids it names], loses: { members?,
 *   placements?, recipe?, all? } } — what cutting it loose would take from
 *   it; `all` when a set or a page would be left with nothing in it.
 *
 * Only what is already in the trash can go (docs/object-model.md, *Trash*): a
 * delete is always the second step, never a slip.
 *
 * An object is *named by* another when the other lists it in `parents` or
 * `refs`, or its recipe holds its id anywhere — a set's members, a
 * composition's placements, grid's source. Ids are distinctive enough
 * (`<app>_<ms>_<rand>`) that a scan of the recipe is exact.
 *
 * When something outside the request names what is going, the server asks
 * first (409) and says who. The answer is one of two:
 *
 *   delete — the chain goes too: everything that names a deleted object,
 *            and everything that names those, all the way down.
 *   detach — they stay, cut loose (below).
 *
 * Cutting loose is the one edit an ordinary object ever receives besides its
 * tags, because the alternative — a new object for each — would orphan every
 * recipe that names *it*, and so on down the chain. What is cut:
 *
 *   `parents` and `refs` lose the ids;
 *   a set's `recipe.members` and a composition's `recipe.place` lose the
 *   members and placements that were them — it stays a set, a page;
 *   a recipe that still names one after that cannot be replayed at all, so it
 *   is set aside and `recipe` becomes null: the object is its render now, a
 *   loop becomes its poster (core/rebuild.js reads no recipe as a picture).
 *
 * Every cut is written down in the object's `detached` list, with the recipe
 * it set aside, so nothing but the deleted object itself is lost.
 */

const fs   = require('fs');
const path = require('path');

const TRASH = 'trash';
const ID = /"([a-z0-9]{1,8}_[0-9]{9,16}_[a-z0-9]{4,12})"/g;

/** Every id an object names: its lineage, and any id inside its recipe. */
function namedBy(o) {
  const out = new Set([...(o.parents || []), ...(o.refs || [])]);
  if (o.recipe != null) for (const m of JSON.stringify(o.recipe).matchAll(ID)) out.add(m[1]);
  return out;
}


/**
 * @param {object} kit  what server.js owns: the objects dir, and its helpers
 */
module.exports = function deleteRoute({ objectsDir, allObjects, rebuildIndex, safeId, readBody, sendJson }) {

  /**
   * Cut an object loose from ids that are going, in memory; see the header.
   * @returns {object} the entry for its `detached` list
   */
  function cutLoose(o, cut) {
    const entry = { at: new Date().toISOString(), ids: [...cut] };
    o.parents = (o.parents || []).filter(id => !cut.has(id));
    o.refs = (o.refs || []).filter(id => !cut.has(id));

    const r = o.recipe;
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      const kept = { ...r };
      if (Array.isArray(r.members)) {
        kept.members = r.members.filter(m => !cut.has(m));
        if (kept.members.length < r.members.length) entry.members = r.members.length - kept.members.length;
      }
      if (Array.isArray(r.place)) {
        kept.place = r.place.filter(b => !(b && cut.has(b.ref)));
        if (kept.place.length < r.place.length) entry.placements = r.place.length - kept.place.length;
      }
      o.recipe = kept;
    }
    if (o.recipe != null && [...namedBy({ recipe: o.recipe })].some(id => cut.has(id))) {
      delete entry.members;          // nothing is left to have lost them from
      delete entry.placements;
      entry.recipe = r;              // as it was, before anything above was cut
      o.recipe = null;
    }
    o.detached = [...(o.detached || []), entry];
    return entry;
  }

  function write(o) {
    const file = path.join(objectsDir, o.id, 'object.json');
    fs.writeFileSync(file + '.tmp', JSON.stringify(o, null, 1));
    fs.renameSync(file + '.tmp', file);
  }

  /** A dependent as the asking side shows it: who, and what it would lose. */
  function rowOf(o, cut) {
    const kept = structuredClone(o);
    const { members, placements, recipe } = cutLoose(kept, cut);
    const all = !!(members && !kept.recipe.members.length) || !!(placements && !kept.recipe.place.length);
    return { id: o.id, type: o.type, title: o.title, on: [...cut],
      loses: { ...(members ? { members } : {}), ...(placements ? { placements } : {}),
        ...(recipe ? { recipe: true } : {}), ...(all ? { all } : {}) } };
  }

  return async function apiDelete(req, res) {
    let body;
    try {
      body = JSON.parse((await readBody(req, 256 * 1024)).toString('utf8'));
    } catch (err) {
      return sendJson(res, err.code === 413 ? 413 : 400, { error: err.message });
    }
    const ids = body && Array.isArray(body.ids) ? [...new Set(body.ids.map(String))] : null;
    const mode = body && body.dependents;
    if (!ids || !ids.length || ids.some(id => !safeId(id))) {
      return sendJson(res, 400, { error: '{ ids: [id], dependents?: "delete" | "detach" }' });
    }
    if (mode !== undefined && mode !== 'delete' && mode !== 'detach') {
      return sendJson(res, 400, { error: 'dependents is "delete" or "detach"' });
    }

    const all = allObjects();
    const byId = new Map(all.map(o => [o.id, o]));
    const missing = ids.filter(id => !byId.has(id));
    if (missing.length) return sendJson(res, 404, { error: 'no such object', ids: missing });
    const loose = ids.filter(id => !(byId.get(id).tags || []).includes(TRASH));
    if (loose.length) return sendJson(res, 409, { error: 'only what is in the trash can be deleted', ids: loose });

    const names = new Map(all.map(o => [o.id, namedBy(o)]));
    const going = new Set(ids);
    const cutFor = (o, set) => new Set([...names.get(o.id)].filter(id => set.has(id)));

    // Who names what is going, directly — and the whole chain below them.
    const direct = all.filter(o => !going.has(o.id) && cutFor(o, going).size);
    const chain = new Set(going);
    for (let grew = true; grew;) {
      grew = false;
      for (const o of all) {
        if (!chain.has(o.id) && cutFor(o, chain).size) { chain.add(o.id); grew = true; }
      }
    }

    if (body.dry || (direct.length && !mode)) {
      return sendJson(res, body.dry ? 200 : 409, {
        status: body.dry ? 'plan' : 'dependents',
        dependents: direct.map(o => rowOf(o, cutFor(o, going))),
        chain: all.filter(o => chain.has(o.id) && !going.has(o.id)).map(o => rowOf(o, cutFor(o, chain))),
      });
    }

    const victims = mode === 'delete' ? [...chain] : ids;
    const detached = [];
    if (mode === 'detach') for (const o of direct) { cutLoose(o, cutFor(o, going)); write(o); detached.push(o.id); }
    for (const id of victims) {
      fs.rmSync(path.join(objectsDir, id), { recursive: true, force: true, maxRetries: 3 });
    }
    rebuildIndex();
    sendJson(res, 200, { status: 'deleted', deleted: victims, detached });
  };
};
