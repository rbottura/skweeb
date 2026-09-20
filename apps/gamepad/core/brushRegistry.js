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
let _selected      = [];          // family meta objects chosen by the user
let _sprites       = new Map();   // familyId → p5.Image[]
let _loaded        = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the manifest from the server.
 * @returns {Promise<Object>} the full manifest JSON
 */
export async function loadManifest() {
  if (_manifest) return _manifest;
  const res = await fetch('brush-manifest.json');
  if (!res.ok) throw new Error(`Failed to load brush-manifest.json: ${res.status}`);
  _manifest = await res.json();
  return _manifest;
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
    for (const file of fam.files) {
      imgs.push(p.loadImage(`${fam.path}/${file}`));
    }
    _sprites.set(fam.id, imgs);
  }
  // p5 preload tracks async calls automatically; mark as loaded at draw-time
  // (we can't synchronously know when all loadImage calls resolved here)
  _loaded = true;
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
  return `${fam.path}/${fam.files[fileIndex]}`;
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
