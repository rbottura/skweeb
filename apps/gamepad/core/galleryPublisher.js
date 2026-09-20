/**
 * galleryPublisher.js
 * Publishes session images into the on-disk gallery served by
 * scripts/dev-server.js. Without that server (plain `npx serve`) the API is
 * absent, `available` stays false and the panel hides its publish controls.
 *
 * An image's identity is the SHA-256 of its PNG bytes, so the same drawing is
 * never published twice no matter what it is named. The server checks this too
 * — this copy only exists so the panel can mark thumbnails before you click.
 */

const API = 'api/gallery';

const _hashes = new Map();   // entry.id -> sha256
let _published = new Set();  // sha256 already in the gallery
let _available = false;

export const GalleryPublisher = {
  /** True when a dev server with the write API answered the last refresh(). */
  get available() { return _available; },

  get publishedCount() { return _published.size; },

  /** Ask the server which images it already has. Safe to call repeatedly. */
  async refresh() {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { images } = await res.json();
      _published = new Set(images.map(i => i.sha256));
      _available = true;
    } catch {
      _published = new Set();
      _available = false;
    }
    return _available;
  },

  /**
   * SHA-256 of an entry's bytes, memoised. Returns null where crypto.subtle is
   * unavailable (a non-secure origin) — the server still dedupes in that case.
   */
  async hashOf(entry) {
    if (_hashes.has(entry.id)) return _hashes.get(entry.id);
    if (!crypto?.subtle) return null;

    const digest = await crypto.subtle.digest('SHA-256', await entry.blob.arrayBuffer());
    const hex = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    _hashes.set(entry.id, hex);
    return hex;
  },

  /** Whether this entry is already in the gallery. Null means "cannot tell". */
  async isPublished(entry) {
    const hash = await this.hashOf(entry);
    return hash === null ? null : _published.has(hash);
  },

  /**
   * Send one entry to the gallery.
   * @returns {Promise<{status:'added'|'duplicate'|'error', file?:string, error?:string}>}
   */
  async publish(entry, filename) {
    try {
      const hash = await this.hashOf(entry);
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          sha256: hash ?? undefined,
          data: await _toBase64(entry.blob),
        }),
      });
      const body = await res.json();
      if (!res.ok) return { status: 'error', error: body.error ?? `HTTP ${res.status}` };

      if (body.sha256) _published.add(body.sha256);
      return { status: body.status, file: body.file };
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  },
};

/** Chunked so a multi-megabyte PNG cannot blow the argument stack. */
async function _toBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
