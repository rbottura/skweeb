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

/**
 * Where a family's files actually live.
 *
 * Two forms. A manifest family is a path plus an ordered file list, resolved
 * against where the manifest was found. A family whose sprites are vault
 * objects carries `urls` instead — that is how a `set` made in ckt becomes a
 * brush family in the gamepad, which is M3's link.
 *
 * The alternative was for the vault to hand the registry a fake manifest with
 * invented paths. One shape translated into another is better than a lie
 * about where files are.
 */
function fileUrl(fam, fileIndex) {
  if (fam.urls) return fam.urls[fileIndex] || '';
  return `${_base}${fam.path}/${fam.files[fileIndex]}`;
}

/** Either form knows how many sprites it has. */
const fileCount = fam => (fam.urls ? fam.urls.length : (fam.files ? fam.files.length : 0));

/** Return all family entries from the manifest (for the selector UI). */
export function allManifestFamilies() {
  return _manifest?.families ?? [];
}

// ─── Availability ─────────────────────────────────────────────────────────────

/**
 * Which families are actually on this machine.
 *
 * The manifest is the contract and stays the contract — rule 3, nothing walks
 * a directory. But a manifest describes the *project*, and a checkout may hold
 * less of it than the project has: the heavy sprite families are gitignored by
 * decision (CLAUDE.md rule 6), so a clone boots with two of eleven and the
 * other nine 404 once per sprite, 517 times, before drawing nothing.
 *
 * So the manifest is still believed about what exists and asked about what is
 * present. One HEAD per family instead of one GET per sprite, cached, and the
 * answer is a fact about this machine rather than a correction to the file.
 *
 * This is also the path a published object hits when it names families the
 * viewer has never had, which is the first thing `gallery/` will need.
 */
const _available = new Map();   // familyId → bool

/**
 * Probe every family in the manifest, or the ones named.
 *
 * @param {string[]} [ids]  default: all of them
 * @returns {Promise<Map<string, boolean>>}
 */
export async function probeFamilies(ids) {
  const families = (_manifest?.families ?? [])
    .filter(f => !ids || ids.includes(f.id))
    .filter(f => !_available.has(f.id));

  await Promise.all(families.map(async fam => {
    if (!fileCount(fam)) { _available.set(fam.id, false); return; }
    try {
      const res = await fetch(fileUrl(fam, 0), { method: 'HEAD' });
      _available.set(fam.id, res.ok);
    } catch {
      _available.set(fam.id, false);
    }
  }));

  return _available;
}

/** Unprobed counts as present: never hide a family because nobody asked yet. */
export function isFamilyAvailable(id) {
  return _available.get(id) !== false;
}

/** The families a picker should offer. */
export function availableManifestFamilies() {
  return allManifestFamilies().filter(f => isFamilyAvailable(f.id));
}

/** The ones that are named but not here, for a readout that says so. */
export function unavailableManifestFamilies() {
  return allManifestFamilies().filter(f => !isFamilyAvailable(f.id));
}

/**
 * Add a family the manifest does not contain.
 *
 * **This is the consumer half of M3's link, `ckt → gamepad: brush family`.**
 * ckt emits a `set` — an ordered list of glyph objects — and this is how one
 * becomes something the gamepad can draw with, without the vault having to
 * invent a manifest or the manifest having to know the vault exists.
 *
 * Registered families are available by definition: their sprites are vault
 * renders, which exist because something just saved them.
 *
 * @param {{id, label, urls: string[]}} fam
 */
export function registerFamily(fam) {
  if (!_manifest) _manifest = { families: [] };
  if (!fam || !fam.id || !fam.urls || !fam.urls.length) return null;

  const existing = _manifest.families.findIndex(f => f.id === fam.id);

  // count AFTER the spread, derived from the urls. The other order let a
  // stale count on the incoming object outlive the list it described, so
  // re-emitting a family with more glyphs kept the old number.
  const entry = { ...fam, count: fam.urls.length };

  if (existing >= 0) _manifest.families[existing] = entry;
  else _manifest.families.push(entry);

  _available.set(fam.id, true);
  return entry;
}

/**
 * A vault `set` as a registry family.
 *
 * The translation between the two shapes, and it lives here rather than in
 * ckt because both halves are core's: a set is an ordered member list in the
 * object model, a family is an ordered sprite list in the registry, and order
 * is the contract in both. A recorded mark refers to a sprite by number, so a
 * set whose members reorder redraws old work wrongly.
 *
 * @param {object} setObject  a vault envelope of type `set`
 */
export function familyFromSet(setObject) {
  const members = (setObject && setObject.recipe && setObject.recipe.members) || [];
  if (!members.length) return null;

  const sheet = setObject.render && setObject.render.file;
  return {
    id: setObject.id,
    label: setObject.title || setObject.id,
    count: members.length,
    urls: members.map(id => `/vault/objects/${id}/render.png`),
    // The set's own render is its contact sheet — the picker's card image.
    preview: sheet ? `/vault/objects/${setObject.id}/${sheet}` : null,
    fromVault: true,
  };
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
    for (let i = 0; i < fileCount(fam); i++) {
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
  // Probe first, so a family that is not on this machine costs one HEAD rather
  // than one failed GET per sprite. Garam_blue alone is 58 of them.
  await probeFamilies(_selected.map(f => f.id));

  for (const fam of _selected) {
    if (!isFamilyAvailable(fam.id)) {
      // Nulls, not an empty array, and not a missing key: a mark records the
      // sprite index it used, so the array has to stay the right length or a
      // later index would silently resolve to a different brush.
      _sprites.set(fam.id, Array.from({ length: fileCount(fam) }, () => null));
      continue;
    }

    _sprites.set(fam.id, await Promise.all(
      Array.from({ length: fileCount(fam) }, (_, i) => new Promise(resolve => {
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
  if (!fam || fileIndex < 0 || fileIndex >= fileCount(fam)) return '';
  return fileUrl(fam, fileIndex);
}

/** Get URL using the family's index position in _selected (for legacy callers). */
export function getSpriteUrlByIndex(familyIndex, fileIndex) {
  const fam = _selected[familyIndex];
  if (!fam) return '';
  return getSpriteUrl(fam.id, fileIndex);
}

export function familyCount()            { return _selected.length; }
/**
 * How many sprites a family has: loaded, else selected, else the manifest.
 *
 * The manifest fallback matters for a family that has been registered but not
 * yet chosen — a picker asking how big it is would otherwise be told zero,
 * which is why BrushSelector had grown its own lookup into `_manifest` to work
 * around this.
 */
export function spriteCount(familyId) {
  return _sprites.get(familyId)?.length
      ?? _selected.find(f => f.id === familyId)?.count
      ?? _manifest?.families.find(f => f.id === familyId)?.count
      ?? 0;
}
export function spriteCountByIndex(i)    { return _selected[i] ? spriteCount(_selected[i].id) : 0; }
export function familyMeta(familyId)     { return _selected.find(f => f.id === familyId) ?? null; }
export function familyMetaByIndex(i)     { return _selected[i] ?? null; }
export function allFamilyMetas()         { return _selected; }
export function familyIdByIndex(i)       { return _selected[i]?.id ?? null; }
