/**
 * vault.js — the client for the objects on disk.
 *
 * Everything the suite makes or eats goes through here. The envelope, the
 * fields and what they promise are specified in docs/object-model.md; this
 * file only moves them.
 *
 * `list()` reads index.json and nothing else, so the gallery stays fast with
 * thousands of objects. `load()` is the only call that opens a folder.
 *
 * When the server is absent — a plain static host, no node — `available` stays
 * false and `save()` falls back to a download. That fallback is required, not
 * optional: rule 7 in CLAUDE.md, every app runs alone.
 *
 * Emits on document:
 *   'vault:saved'    { id, type }
 *   'vault:duplicate'{ id, type }
 *   'vault:offline'  { filename }   — saved to disk by download instead
 *   'vault:retagged' { id, tags }   — an object's tags changed
 *   'vault:removed'  { id }         — an object left the vault for good
 *
 * The trash is a tag (docs/object-model.md, *Trash*): what carries it is
 * still on disk and still loads — a composition placing it still draws it —
 * but list() leaves it out, and so does anything offering objects to choose.
 * `Vault.index` keeps it, because a set looks its members up there.
 */

const API = '/api/vault';

export const TRASH = 'trash';
export const isTrashed = row => !!row && (row.tags || []).includes(TRASH);

let _available = false;
let _index = [];

export const Vault = {
  /** True when a server with the write API answered the last refresh(). */
  get available() { return _available; },

  /** Rows from the last refresh, newest first. No blobs, no recipes. */
  get index() { return _index; },

  /** Ask the server for the index. Safe to call repeatedly. */
  async refresh() {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const body = await res.json();
      _index = body.objects || [];
      _available = true;
    } catch {
      _index = [];
      _available = false;
    }
    return _available;
  },

  /**
   * Rows matching a filter, from the index alone — never the trash, unless
   * `trash: true` asks for the trash and nothing else.
   * @param {{type?:string, app?:string, tag?:string, trash?:boolean}} [filter]
   */
  async list(filter = {}) {
    if (!_available) await Vault.refresh();
    return _index.filter(row =>
      isTrashed(row) === !!filter.trash &&
      (!filter.type || row.type === filter.type) &&
      (!filter.app  || (row.origin && row.origin.app) === filter.app) &&
      (!filter.tag  || (row.tags || []).includes(filter.tag)));
  },

  /** One object, envelope and all. */
  async load(id) {
    const res = await fetch(API + '/' + encodeURIComponent(id), { cache: 'no-store' });
    if (!res.ok) throw new Error('vault: no object ' + id);
    const object = await res.json();
    return {
      object,
      url: '/vault/objects/' + object.id + '/' + object.render.file,
      thumbUrl: object.thumb ? '/vault/objects/' + object.id + '/' + object.thumb : null,
    };
  },

  /**
   * Write an object.
   *
   * @param {object} spec
   * @param {string} spec.type      one of the types in docs/object-model.md
   * @param {object} spec.render    { blob, ext, w, h, density?, frames?, fps?, loop? }
   * @param {object} [spec.thumb]   { blob, ext } — from core/thumb.js
   * @param {object} [spec.recipe]  null when the thing cannot be re-rendered
   * @param {number} [spec.seed]
   * @param {string[]} [spec.parents]  what it was made from
   * @param {string[]} [spec.refs]     what it still depends on
   * @returns {Promise<object|null>} the envelope, or null when offline
   */
  async save(spec) {
    const body = {
      type: spec.type,
      title: spec.title || '',
      note: spec.note || '',
      tags: spec.tags || [],
      origin: spec.origin,
      recipe: spec.recipe === undefined ? null : spec.recipe,
      seed: spec.seed,
      parents: spec.parents || [],
      refs: spec.refs || [],
      render: {
        ext: spec.render.ext,
        w: spec.render.w, h: spec.render.h,
        density: spec.render.density || 1,
        frames: spec.render.frames, fps: spec.render.fps, loop: !!spec.render.loop,
        data: await toBase64(spec.render.blob),
      },
      thumb: spec.thumb ? { ext: spec.thumb.ext, data: await toBase64(spec.thumb.blob) } : null,
    };

    let res;
    try {
      res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      _available = false;
      return offlineFallback(spec);
    }

    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || ('vault: HTTP ' + res.status));

    _available = true;
    const object = out.object;
    dispatch(out.status === 'duplicate' ? 'vault:duplicate' : 'vault:saved',
             { id: object.id, type: object.type });
    if (out.status !== 'duplicate') _index.unshift(object);
    return object;
  },

  /**
   * Change an object's tags — the one thing about it that may change after it
   * is saved (docs/object-model.md, *Tags change*). An edit, applied by the
   * server to the tags it has, so a stale page cannot erase another's.
   *
   * @param {string} id
   * @param {{add?: string[], remove?: string[]}} edit
   * @returns {Promise<object>} the envelope as it now is
   */
  async retag(id, { add = [], remove = [] } = {}) {
    const res = await fetch(API + '/' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ add, remove }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || ('vault: HTTP ' + res.status));
    const object = out.object;
    const row = _index.find(r => r.id === id);
    if (row) row.tags = object.tags;
    dispatch('vault:retagged', { id, tags: object.tags });
    return object;
  },

  /** Put objects in the trash: a tag, so nothing breaks and it can be undone. */
  async trash(ids) {
    for (const id of ids) await Vault.retag(id, { add: [TRASH] });
  },

  /** Take objects back out of the trash. */
  async restore(ids) {
    for (const id of ids) await Vault.retag(id, { remove: [TRASH] });
  },

  /**
   * Delete objects for good — only ones already in the trash. When something
   * else names them the server asks first, and this hands back its answer,
   * `{ status: 'dependents', dependents, chain }`: call again with
   * `dependents: 'delete'` to take the chain too, or 'detach' to cut those
   * objects loose and keep them (server/delete.js). `dry: true` asks the same
   * question and does nothing: `{ status: 'plan', dependents, chain }`.
   *
   * @param {string[]} ids
   * @param {{dependents?: 'delete'|'detach', dry?: boolean}} [opts]
   * @returns {Promise<{status:string, deleted?:string[], detached?:string[], dependents?:object[], chain?:object[]}>}
   */
  async remove(ids, { dependents, dry = false } = {}) {
    const res = await fetch(API + '/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, dependents, dry }),
    });
    const out = await res.json().catch(() => ({}));
    if (out.status === 'dependents' || out.status === 'plan') return out;
    if (!res.ok) throw new Error(out.error || ('vault: HTTP ' + res.status));
    await Vault.refresh();
    for (const id of out.deleted) dispatch('vault:removed', { id });
    return out;
  },
};

// -- Helpers ------------------------------------------------------------------

/** Chunked, so a multi-megabyte render cannot blow the argument stack. */
async function toBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** No server: hand the file to the browser so the work is not lost. */
function offlineFallback(spec) {
  const name = (spec.title || spec.type || 'object')
    .trim().replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() || 'object';
  const filename = name + '_' + Date.now() + '.' + spec.render.ext;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(spec.render.blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  dispatch('vault:offline', { filename });
  return null;
}

function dispatch(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

Vault.refresh();
