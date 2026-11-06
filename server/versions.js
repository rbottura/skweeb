/**
 * server/versions.js — a smart object saved again (docs/smart-objects.md,
 * *Versions*).
 *
 *   PUT /api/vault/<id>   a `skw`'s next version:
 *                         { title?, note?, recipe, seed?, parents?, refs?, render, thumb? }
 *
 * A `skw` is the one object edited after the fact, and versions are how it
 * stays honest about it: what it was — its recipe, its seed, its lineage,
 * its render — goes to `versions/v<N>.json`, its picture beside it as
 * `versions/v<N>.<ext>`, and the object takes what it is now as version N + 1.
 * A placement pinned to N is a real promise: nothing in `versions/` changes
 * again. Anything not a `skw` is refused — an ordinary object never changes
 * but for its tags.
 *
 * The page hears which object, and which version (server/events.js): what
 * places it at `latest` draws it again.
 *
 * A next state whose refs lead back to it — a page holding a page holding it —
 * is refused, 409, the chain named (L3, 2026-11-06; core/cycles.js).
 * Since S6 (2026-11-03) the versions are a tree, as git's are: each state
 * names its `parent` — the version it was saved from, the one it is at by
 * default, an older one for a branch — and a merge its `parent2`, the
 * branch it took in (docs/smart-objects.md, *Versions*). A state kept from
 * before then has none, and reads as the line it was: N's parent is N - 1.
 *
 *   GET /api/vault/<id>/states   -> { id, version, states: [{ version, parent, parent2, created, title, url }] }
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * The chain by which `id`, holding `refs`, would come to hold itself — or null (L3). The same walk as
 * core/cycles.js `cycleOf`, written for require: its refs, and theirs, read off their envelopes.
 */
function cycleThrough(id, refs, readEnvelope, safeId) {
  const seen = new Set();
  const walk = (at, chain) => {
    const here = String(at).split('@')[0];
    if (here === id) return [...chain, here];
    if (seen.has(here)) return null;
    seen.add(here);
    const safe = safeId(here);
    const envelope = safe && readEnvelope(safe);
    for (const next of (envelope && envelope.refs) || []) {
      const found = walk(next, [...chain, here]);
      if (found) return found;
    }
    return null;
  };
  for (const r of refs) {
    const found = walk(r, [id]);
    if (found) return found;
  }
  return null;
}

/** A state's parent: its own, or — kept before S6 — the version before it. */
const parentOf = (n, v) => (v && Number.isInteger(v.parent) ? v.parent : n > 1 ? n - 1 : null);
const parent2Of = v => (v && Number.isInteger(v.parent2) ? v.parent2 : null);

module.exports = function versionRoute({ objectsDir, readEnvelope, safeId, readBody, sendJson, decodeAsset, rebuildIndex, maxUpload }) {
  /** Every state of a smart object, from v1 to the one it is at: the tree, by each one's parents. */
  function states(res, id) {
    const safe = safeId(id);
    const envelope = safe && readEnvelope(safe);
    if (!envelope) return sendJson(res, 404, { error: 'no such object' });
    if (envelope.type !== 'skw') return sendJson(res, 409, { error: 'only a smart object has states' });
    const now = envelope.version || 1, out = [];
    for (let n = 1; n < now; n++) {
      let v = null;
      try { v = JSON.parse(fs.readFileSync(path.join(objectsDir, safe, 'versions', `v${n}.json`), 'utf8')); } catch { /* lost: its place kept */ }
      out.push({ version: n, parent: parentOf(n, v), parent2: parent2Of(v), created: v ? v.created : null, title: v ? v.title : '',
                 url: v && v.render && v.render.file ? `/vault/objects/${safe}/versions/${v.render.file}` : null });
    }
    out.push({ version: now, parent: parentOf(now, envelope), parent2: parent2Of(envelope), created: envelope.updated || envelope.created,
               title: envelope.title, url: envelope.render && envelope.render.file ? `/vault/objects/${safe}/${envelope.render.file}` : null });
    sendJson(res, 200, { id: safe, version: now, states: out });
  }

  return { states, put: async function apiVersion(req, res, id) {
    const safe = safeId(id);
    const envelope = safe && readEnvelope(safe);
    if (!envelope) return sendJson(res, 404, { error: 'no such object' });
    if (envelope.type !== 'skw') return sendJson(res, 409, { error: 'only a smart object takes a new version' });

    let payload;
    try {
      payload = JSON.parse((await readBody(req, maxUpload)).toString('utf8'));
    } catch (err) {
      return sendJson(res, err.code === 413 ? 413 : 400, { error: err.message });
    }
    // A next state that would come to hold itself — its refs, or theirs, back to it — is refused, the chain named (L3).
    const chain = cycleThrough(safe, Array.isArray(payload.refs) ? payload.refs.map(String) : envelope.refs || [], readEnvelope, safeId);
    if (chain) return sendJson(res, 409, { error: 'it would hold itself: ' + chain.join(' → '), chain });
    const render = decodeAsset(payload.render, 'render');
    if (render.error) return sendJson(res, 400, { error: render.error });
    let thumb = null;
    if (payload.thumb) {
      thumb = decodeAsset(payload.thumb, 'thumb');
      if (thumb.error) return sendJson(res, 400, { error: thumb.error });
    }

    // Saved from which state: the one it is at, unless the page says an older one — a branch.
    const was = envelope.version || 1;
    const parent = payload.parent == null ? was : Number(payload.parent);
    const parent2 = payload.parent2 == null ? null : Number(payload.parent2);
    if (!Number.isInteger(parent) || parent < 1 || parent > was) return sendJson(res, 400, { error: `parent: a version from 1 to ${was}` });
    if (parent2 != null && (!Number.isInteger(parent2) || parent2 < 1 || parent2 > was || parent2 === parent)) {
      return sendJson(res, 400, { error: `parent2: another version, from 1 to ${was}` });
    }

    // What it was, kept as it was.
    const dir = path.join(objectsDir, safe);
    const versions = path.join(dir, 'versions');
    fs.mkdirSync(versions, { recursive: true });
    const oldRender = envelope.render && envelope.render.file;
    const keptRender = oldRender ? `v${was}${path.extname(oldRender)}` : null;
    if (oldRender && fs.existsSync(path.join(dir, oldRender))) fs.copyFileSync(path.join(dir, oldRender), path.join(versions, keptRender));
    fs.writeFileSync(path.join(versions, `v${was}.json`), JSON.stringify({
      version: was, created: envelope.updated || envelope.created,
      title: envelope.title, recipe: envelope.recipe, seed: envelope.seed,
      parents: envelope.parents, refs: envelope.refs,
      parent: parentOf(was, envelope), parent2: parent2Of(envelope),
      render: { ...envelope.render, file: keptRender },
    }, null, 1));

    // What it is now.
    const renderFile = 'render' + render.ext;
    if (oldRender && oldRender !== renderFile) fs.rmSync(path.join(dir, oldRender), { force: true });
    fs.writeFileSync(path.join(dir, renderFile), render.bytes);
    if (thumb) fs.writeFileSync(path.join(dir, 'thumb' + thumb.ext), thumb.bytes);
    const r = payload.render;
    Object.assign(envelope, {
      title: payload.title == null ? envelope.title : String(payload.title),
      note: payload.note == null ? envelope.note : String(payload.note),
      recipe: payload.recipe === undefined ? envelope.recipe : payload.recipe,
      seed: payload.seed === undefined ? envelope.seed : payload.seed,
      parents: Array.isArray(payload.parents) ? payload.parents.map(String) : envelope.parents,
      refs: Array.isArray(payload.refs) ? payload.refs.map(String) : envelope.refs,
      render: {
        file: renderFile,
        w: r.w || null, h: r.h || null, density: r.density || 1,
        frames: r.frames || null, fps: r.fps || null, loop: !!r.loop,
        bytes: render.bytes.length, sha256: crypto.createHash('sha256').update(render.bytes).digest('hex'),
      },
      thumb: thumb ? 'thumb' + thumb.ext : envelope.thumb,
      version: was + 1,
      parent,
      updated: new Date().toISOString(),
    });
    if (parent2 == null) delete envelope.parent2; else envelope.parent2 = parent2;     // absent, not null, but for a merge
    // Written aside and moved into place: a crash mid-write must not leave an object.json that no longer parses.
    const file = path.join(dir, 'object.json');
    fs.writeFileSync(file + '.tmp', JSON.stringify(envelope, null, 1));
    fs.renameSync(file + '.tmp', file);
    rebuildIndex({ updated: { id: safe, version: envelope.version } });
    sendJson(res, 200, { status: 'updated', object: envelope });
  } };
};
