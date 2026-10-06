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
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = function versionRoute({ objectsDir, readEnvelope, safeId, readBody, sendJson, decodeAsset, rebuildIndex, maxUpload }) {
  return async function apiVersion(req, res, id) {
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
    const render = decodeAsset(payload.render, 'render');
    if (render.error) return sendJson(res, 400, { error: render.error });
    let thumb = null;
    if (payload.thumb) {
      thumb = decodeAsset(payload.thumb, 'thumb');
      if (thumb.error) return sendJson(res, 400, { error: thumb.error });
    }

    // What it was, kept as it was.
    const dir = path.join(objectsDir, safe);
    const was = envelope.version || 1;
    const versions = path.join(dir, 'versions');
    fs.mkdirSync(versions, { recursive: true });
    const oldRender = envelope.render && envelope.render.file;
    const keptRender = oldRender ? `v${was}${path.extname(oldRender)}` : null;
    if (oldRender && fs.existsSync(path.join(dir, oldRender))) fs.copyFileSync(path.join(dir, oldRender), path.join(versions, keptRender));
    fs.writeFileSync(path.join(versions, `v${was}.json`), JSON.stringify({
      version: was, created: envelope.updated || envelope.created,
      title: envelope.title, recipe: envelope.recipe, seed: envelope.seed,
      parents: envelope.parents, refs: envelope.refs,
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
      updated: new Date().toISOString(),
    });
    // Written aside and moved into place: a crash mid-write must not leave an object.json that no longer parses.
    const file = path.join(dir, 'object.json');
    fs.writeFileSync(file + '.tmp', JSON.stringify(envelope, null, 1));
    fs.renameSync(file + '.tmp', file);
    rebuildIndex({ updated: { id: safe, version: envelope.version } });
    sendJson(res, 200, { status: 'updated', object: envelope });
  };
};
