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
 *   'vault:changed'  { count, at }  — the index was rewritten, by anyone, on
 *                                     any machine on this vault; read it again
 *   'vault:updated'  { id, version } — a smart object took a new version, here or
 *                                     anywhere: what places it draws it again
 *
 * A page may be bound into a smart object (`bind`, core/smart.js): its saves
 * of the kind it binds are that object, saved again — its next version.
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
let _events = null;
let _bound = null;     // the smart object this page's saves bind into: { id, type, version } — the state it holds
let _heard = '';       // the last new version said, so one is said once

/** A smart object's new version, said once on the page however it is heard. */
function updated(detail) {
  const key = detail.id + '@' + detail.version;
  if (key === _heard) return;
  _heard = key;
  document.dispatchEvent(new CustomEvent('vault:updated', { detail }));
}

/**
 * Hear about changes made anywhere — another tab, another machine on the same
 * vault. Opened once, when a server first answers; EventSource reconnects on
 * its own. Only a nudge: whoever cares reads the index again.
 */
function listen() {
  if (_events || typeof EventSource === 'undefined') return;
  _events = new EventSource(API + '/events');
  _events.addEventListener('changed', e => {
    let detail = {};
    try { detail = JSON.parse(e.data); } catch {}
    document.dispatchEvent(new CustomEvent('vault:changed', { detail }));
    if (detail.updated) updated(detail.updated);
  });
}

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
      listen();
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
      (!filter.type || row.type === filter.type || (row.type === 'skw' && row.binds === filter.type)) &&
      (!filter.app  || (row.origin && row.origin.app) === filter.app) &&
      (!filter.tag  || (row.tags || []).includes(filter.tag)));
  },

  /** The smart object this page edits, if any: `{ id, type }` — id null until its first save. */
  get bound() { return _bound; },

  /**
   * Bind this page's saves into a smart object — `{ id, type }` to edit one,
   * `{}` for a new one made by the next save — or `null` to save ordinary
   * objects again. Only a save of the kind it binds: a look saved in filter
   * stays a look.
   */
  bind(bound) { _bound = bound ? { id: bound.id || null, type: bound.type || null, version: bound.version || null, strict: !!bound.strict } : null; },

  /** A smart object's states, a tree by their parents (S6, server/versions.js): [{ version, parent, parent2, created, title, url }]. */
  async states(id) {
    const res = await fetch(API + '/' + encodeURIComponent(id) + '/states', { cache: 'no-store' });
    if (!res.ok) throw new Error('vault: ' + id + ' has no states');
    return (await res.json()).states;
  },

  /** What a smart object was at version `n` (server/versions.js): kept, as it was. */
  async version(id, n) {
    const res = await fetch('/vault/objects/' + encodeURIComponent(id) + '/versions/v' + n + '.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('vault: ' + id + ' has no version ' + n);
    return res.json();
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
    // A project's own save — the app's S, `state: true` — is the next state of its smart object, its first
    // S making it (S6b, the author's 2026-11-03). Bound, a save of its kind is that object saved again
    // (core/smart.js); `state: false` — a frame as a still, a look — never is.
    // Bound by its first S, a page is strict: nothing but an S is a state of it — not a picture brought in.
    if (spec.state === true && !_bound) _bound = { id: null, type: spec.type, version: null, strict: true };
    const smart = spec.state === true ? !!_bound
      : !!_bound && !_bound.strict && spec.state !== false && (!_bound.type || _bound.type === spec.type);
    const recipe = spec.recipe === undefined ? null : spec.recipe;
    // A frozen object made from the state a page holds names that state: `skw_…@v3`.
    const parents = [...(spec.parents || []), ...(spec.state === false && _bound && _bound.id && _bound.version ? [`${_bound.id}@v${_bound.version}`] : [])];
    const body = {
      type: smart ? 'skw' : spec.type,
      title: spec.title || '',
      note: spec.note || '',
      tags: spec.tags || [],
      origin: spec.origin,
      recipe: smart ? { kind: 'bound', app: spec.origin && spec.origin.app, type: spec.type, recipe, seed: spec.seed ?? null } : recipe,
      seed: spec.seed,
      parents,
      // What a smart object places, it depends on: one among its parents is a ref too.
      refs: [...new Set([...(spec.refs || []), ...parents.filter(id => String(id).startsWith('skw_') && !String(id).includes('@v'))])],   // a state named is pinned: no ref
      // Saved from the state this page holds — an older one, a branch — and, for a merge, the one it took in.
      parent: smart && _bound.id && _bound.version ? _bound.version : undefined,
      parent2: smart && _bound.id && spec.parent2 ? spec.parent2 : undefined,
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
      const again = smart && _bound.id;
      res = await fetch(again ? API + '/' + encodeURIComponent(_bound.id) : API, {
        method: again ? 'PUT' : 'POST',
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
    if (smart) _bound = { id: object.id, type: spec.type, version: object.version || 1, strict: !!(_bound && _bound.strict) };
    dispatch(out.status === 'duplicate' ? 'vault:duplicate' : 'vault:saved',
             { id: object.id, type: object.type });
    if (out.status === 'updated') {
      _index = _index.map(row => (row.id === object.id ? { ...row, version: object.version, render: object.render } : row));
      updated({ id: object.id, version: object.version });
    } else if (out.status !== 'duplicate') {
      _index.unshift(object);
    }
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
