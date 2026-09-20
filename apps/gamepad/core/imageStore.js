/**
 * imageStore.js
 * Store for images captured from the drawing canvas, persisted in IndexedDB
 * so drawings survive a page reload.
 *
 * Records are kept as PNG Blobs (not data URLs) — blobs are ~33% smaller and
 * IndexedDB stores them natively. Each in-memory entry exposes an object URL
 * as `url`, usable anywhere a data URL was before (img.src, <a download>, p5).
 *
 * Each entry: { id, blob, url, label, timestamp, width, height }
 *
 * Emits DOM CustomEvents on the document so UI panels stay in sync:
 *   'imagestore:hydrated' — { detail: { count } }  (once, after load from disk)
 *   'imagestore:saved'    — { detail: { index, entry } }
 *   'imagestore:removed'  — { detail: { index } }
 *   'imagestore:cleared'  — {}
 */

const DB_NAME    = 'gamepaddraw';
const DB_VERSION = 1;
const STORE      = 'images';

const _images = [];

let _db        = null;   // IDBDatabase, or null when persistence is unavailable
let _readyProm = null;

export const ImageStore = {
  /** All saved entries (read-only view), oldest first. */
  get all() { return _images; },

  get count() { return _images.length; },

  /** True once the on-disk images have been loaded into memory. */
  get hydrated() { return _hydrated; },

  /** True when IndexedDB is usable — false means this session is memory-only. */
  get persistent() { return _db !== null; },

  /**
   * Open the database and load previously saved images.
   * Safe to call repeatedly; always returns the same promise.
   * @returns {Promise<number>} number of images restored
   */
  init() {
    if (!_readyProm) _readyProm = _boot();
    return _readyProm;
  },

  /** Resolves when the store is hydrated (alias of init()). */
  get ready() { return ImageStore.init(); },

  /**
   * Capture the current state of a canvas/p5.Graphics and save it.
   * @param {HTMLCanvasElement} canvas
   * @param {string} [label]
   * @returns {Promise<number>} index of the saved image
   */
  async save(canvas, label = '') {
    // Snapshot the bitmap immediately — the caller may dispose of the canvas
    // as soon as this returns, before the encode settles.
    const blobProm = _toBlob(canvas);
    const width    = canvas.width;
    const height   = canvas.height;

    const blob = await blobProm;
    const entry = {
      id:        `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      blob,
      url:       URL.createObjectURL(blob),
      label:     label || `Draw ${_images.length + 1}`,
      timestamp: Date.now(),
      width,
      height,
    };

    _images.push(entry);
    const index = _images.length - 1;

    await _put(entry);
    _dispatch('imagestore:saved', { index, entry });
    return index;
  },

  /** Get a single entry by index. */
  get(index) { return _images[index] ?? null; },

  /** Remove entry at index. */
  remove(index) {
    if (index < 0 || index >= _images.length) return;
    const [entry] = _images.splice(index, 1);
    URL.revokeObjectURL(entry.url);
    _delete(entry.id);
    _dispatch('imagestore:removed', { index });
  },

  /** Clear all saved images, on disk as well as in memory. */
  clear() {
    _images.forEach(e => URL.revokeObjectURL(e.url));
    _images.length = 0;
    _tx('readwrite', store => store.clear());
    _dispatch('imagestore:cleared', {});
  },

  /** Canonical file name for an entry, shared by download and gallery publish. */
  filename(entry) { return _filename(entry); },

  /**
   * Trigger a browser download for an entry.
   * @param {number} index
   */
  download(index) {
    const entry = _images[index];
    if (!entry) return;
    const a = document.createElement('a');
    a.href = entry.url;
    a.download = _filename(entry);
    a.click();
  },

  /** Download all images as individual files (sequential, ~200ms apart). */
  downloadAll() {
    _images.forEach((_, i) => {
      setTimeout(() => ImageStore.download(i), i * 200);
    });
  },
};

// ── Hydration ────────────────────────────────────────────────────────────────

let _hydrated = false;

async function _boot() {
  try {
    _db = await _openDb();
  } catch (err) {
    console.warn('[imageStore] IndexedDB unavailable — images will not persist.', err);
    _db = null;
  }

  if (_db) {
    try {
      const records = await _getAll();
      records
        .sort((a, b) => a.timestamp - b.timestamp)
        .forEach(rec => _images.push({ ...rec, url: URL.createObjectURL(rec.blob) }));
    } catch (err) {
      console.warn('[imageStore] Could not restore saved images.', err);
    }
  }

  _hydrated = true;
  _dispatch('imagestore:hydrated', { count: _images.length });
  return _images.length;
}

// ── IndexedDB plumbing ───────────────────────────────────────────────────────

function _openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no indexedDB'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('timestamp', 'timestamp');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
    req.onblocked = () => reject(new Error('indexedDB blocked'));
  });
}

/** Run one transaction against the image store; resolves when it commits. */
function _tx(mode, fn) {
  return new Promise((resolve, reject) => {
    if (!_db) return resolve(null);          // memory-only session: no-op
    let result;
    const tx = _db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    if (req) req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror    = () => reject(tx.error);
    tx.onabort    = () => reject(tx.error);
  });
}

async function _put(entry) {
  // Object URLs are per-session, so only the durable fields go to disk.
  const { id, blob, label, timestamp, width, height } = entry;
  try {
    await _tx('readwrite', store => store.put({ id, blob, label, timestamp, width, height }));
  } catch (err) {
    console.warn('[imageStore] Failed to persist image (quota?).', err);
  }
}

async function _delete(id) {
  try {
    await _tx('readwrite', store => store.delete(id));
  } catch (err) {
    console.warn('[imageStore] Failed to delete image.', err);
  }
}

function _getAll() {
  return _tx('readonly', store => store.getAll()).then(r => r ?? []);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _toBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'));
    }, 'image/png');
  });
}

function _filename(entry) {
  const stamp = new Date(entry.timestamp).toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const slug  = entry.label.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `${slug || 'draw'}_${stamp}.png`;
}

function _dispatch(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

// Start loading as soon as the module is imported.
ImageStore.init();
