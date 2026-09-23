/**
 * fonts.js — the faces stage one can set type in.
 *
 * v2 offered whatever the browser had — "Garamond", "Tahoma", "Impact" — plus
 * six files of its own. Neither survives here. A system font name is a
 * different face on every machine, so a recipe naming one does not re-render;
 * and v2's own files are the six docs/fonts.md pulled for having no licence.
 *
 * So the faces are assets/fonts/, listed by the generated manifest (rule 3)
 * with each file's licence read out of the file itself (rule 5), and loaded
 * with the FontFace API — the browser's own loader, no p5 involved, and it
 * works in a worker. Cormorant Garamond stands in for v2's default Garamond.
 */

const MANIFEST = '/assets/font-manifest.json';

let _manifest = null;
const _faces = new Map();          // id → Promise<string|null>, the family name to set

/** The manifest, once. An empty list rather than a throw: stage one can still cut images. */
export async function fontManifest() {
  if (_manifest) return _manifest;
  try {
    const res = await fetch(MANIFEST, { cache: 'no-store' });
    _manifest = res.ok ? await res.json() : { fonts: [] };
  } catch {
    _manifest = { fonts: [] };
  }
  return _manifest;
}

/**
 * Load one face and return the family name to put in `ctx.font`.
 *
 * Registered under its manifest id rather than its own family name, so two
 * files that both call themselves "Space Mono" stay two faces.
 *
 * @returns {Promise<?string>} null when the face will not load
 */
export function loadFace(id) {
  if (_faces.has(id)) return _faces.get(id);

  const pending = (async () => {
    const entry = (await fontManifest()).fonts.find(f => f.id === id);
    if (!entry) return null;
    try {
      const family = 'ckt-' + id;
      const face = new FontFace(family, `url(/${entry.file})`);
      await face.load();
      (typeof document !== 'undefined' ? document.fonts : self.fonts).add(face);
      return family;
    } catch (err) {
      console.warn('[ckt] face would not load:', id, err);
      return null;
    }
  })();

  _faces.set(id, pending);
  return pending;
}
