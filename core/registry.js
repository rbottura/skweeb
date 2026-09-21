/**
 * brushRegistry.js  (manifest-driven version)
 *
 * All family/file knowledge comes from brush-manifest.json.
 * Only the families the user selects in the BrushSelector are loaded.
 *
 * Public API
 * ──────────────────────────────────────────────────────────────────────────────
 *  loadManifest()                 → Promise<manifest>
 *  preloadSelected(p, ids)        → call inside p5.preload()
 *  isLoaded()                     → bool
 *  getSprite(familyId, fileIndex) → p5.Image | null
 *  getSpriteUrl(familyId, idx)    → string  (usable as <img src>)
 *  familyCount()                  → number  (selected families only)
 *  spriteCount(familyId)          → number
 *  familyMeta(familyId)           → manifest family object | null
 *  allFamilyMetas()               → array of selected family meta objects
 */

// ─── Internal state ───────────────────────────────────────────────────────────

let _manifest      = null;        // full manifest JSON
let _manifestUrl   = null;        // which one, so a second URL is not ignored
let _base          = '';          // directory the manifest came from
let _selected      = [];          // family meta objects chosen by the user
let _sprites       = new Map();   // familyId → p5.Image[]
let _loaded        = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch a manifest.
 *
 * The URL is a parameter because this module is shared now. It used to fetch
 * `brush-manifest.json` with no path at all, which resolves against the *page*
 * — invisible while the only page was the gamepad's, and wrong the moment
 * anything else asks for the same sprites. Family paths inside the manifest
 * are relative to the manifest, so they are resolved against where it was
 * found rather than against whoever is asking.
 *
 * @param {string} [url]
 * @returns {Promise<Object>} the full manifest JSON
 */
export async function loadManifest(url = 'brush-manifest.json') {
  // Keyed by URL, not just "have we loaded one" — with a second app asking for
  // another app's sprites, returning the first manifest for every later call
  // would hand back the wrong families and look like a missing sprite.
  if (_manifest && _manifestUrl === url) return _manifest;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  _manifest = await res.json();
  _manifestUrl = url;
  _base = url.slice(0, url.lastIndexOf('/') + 1);
  return _manifest;
}

/** Where a family's files actually live, relative to the manifest. */
function fileUrl(fam, fileIndex) {
  return `${_base}${fam.path}/${fam.files[fileIndex]}`;
}

/** Return all family entries from the manifest (for the selector UI). */
export function allManifestFamilies() {
  return _manifest?.families ?? [];
}

/**
 * Set which families to load. Call BEFORE preloadSelected().
 * @param {string[]} ids  — family id strings (from manifest)
 */
export function setSelectedFamilies(ids) {
  if (!_manifest) throw new Error('Call loadManifest() first');
  const idSet = new Set(ids);
  _selected = _manifest.families.filter(f => idSet.has(f.id));
  _sprites  = new Map();
  _loaded   = false;
}

/**
 * Load all sprites for selected families. Call inside p5.preload().
 * @param {p5} p
 */
export function preloadSelected(p) {
  for (const fam of _selected) {
    const imgs = [];
    for (let i = 0; i < fam.files.length; i++) {
      imgs.push(p.loadImage(fileUrl(fam, i)));
    }
    _sprites.set(fam.id, imgs);
  }
  // p5 preload tracks async calls automatically; mark as loaded at draw-time
  // (we can't synchronously know when all loadImage calls resolved here)
  _loaded = true;
}

/**
 * Load the selected families and resolve when they are actually decoded.
 *
 * preloadSelected() above is the p5 `preload()` path: it fires loadImage and
 * lets p5's own preload counter do the waiting, which only works inside that
 * phase. Anything outside it — rebuilding a sequence in an app that is not
 * mid-setup — needs to know when the pixels are really there, so this uses
 * the callback form and awaits them.
 *
 * A sprite that fails to decode stays in the array as null rather than being
 * filtered out: the index is the sprite number a recorded mark refers to, and
 * closing the gap would silently draw the wrong brush.
 *
 * @param {p5} p
 */
export async function loadSelected(p) {
  for (const fam of _selected) {
    _sprites.set(fam.id, await Promise.all(
      fam.files.map((_, i) => new Promise(resolve => {
        p.loadImage(fileUrl(fam, i), img => resolve(img), () => resolve(null));
      }))));
  }
  _loaded = true;
  return _sprites;
}

export function isLoaded() { return _loaded; }

/** Get a loaded p5.Image. */
export function getSprite(familyId, fileIndex) {
  return _sprites.get(familyId)?.[fileIndex] ?? null;
}

/** Get the URL for an image (works before or after load — usable in <img>). */
export function getSpriteUrl(familyId, fileIndex) {
  const fam = _selected.find(f => f.id === familyId) ??
              _manifest?.families.find(f => f.id === familyId);
  if (!fam || fileIndex < 0 || fileIndex >= fam.files.length) return '';
  return fileUrl(fam, fileIndex);
}

/** Get URL using the family's index position in _selected (for legacy callers). */
export function getSpriteUrlByIndex(familyIndex, fileIndex) {
  const fam = _selected[familyIndex];
  if (!fam) return '';
  return getSpriteUrl(fam.id, fileIndex);
}

export function familyCount()            { return _selected.length; }
export function spriteCount(familyId)    { return _sprites.get(familyId)?.length ?? _selected.find(f => f.id === familyId)?.count ?? 0; }
export function spriteCountByIndex(i)    { return _selected[i] ? spriteCount(_selected[i].id) : 0; }
export function familyMeta(familyId)     { return _selected.find(f => f.id === familyId) ?? null; }
export function familyMetaByIndex(i)     { return _selected[i] ?? null; }
export function allFamilyMetas()         { return _selected; }
export function familyIdByIndex(i)       { return _selected[i]?.id ?? null; }
