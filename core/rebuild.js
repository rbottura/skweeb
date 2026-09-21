/**
 * rebuild.js — replay an object into frames.
 *
 * A `sequence` object's render is one PNG, and its frames are "a cache, not an
 * archive" (docs/object-model.md). So anything that wants the loop — a viewer
 * in the vault, grid dithering it frame by frame — has to rebuild it from the
 * recipe, which carries every mark.
 *
 * That was not possible until the stage moved into `core/`, and it is the
 * reason the move happened. `docs/core-api.md` names this as the one exception
 * to `render()` touching nothing: an app asks the core to rebuild a parent, and
 * gets frames back.
 *
 * ── Why this owns a p5 ──────────────────────────────────────────────────────
 *
 * `SequencePlayer` draws into a `p5.Graphics`, so replaying needs a p5
 * instance. Grid has none and should not grow one to load a source. So this
 * file keeps exactly one, hidden, created the first time anything asks and
 * never again — it injects `core/libs/p5.min.js` if the page has not already
 * loaded it. An app stays unaware that p5 is involved at all.
 *
 * ── The frames are not copies ───────────────────────────────────────────────
 *
 * `frame(i)` returns the player's own buffer canvas, reused every call. Draw
 * it or read it before asking for the next one. A 1060-frame loop at 475x926
 * would be 1.8 GB of RGBA if this handed back copies, which is exactly why
 * the frames are a cache and not an archive in the first place.
 */

import * as Registry     from './registry.js';
import { createClip }    from './stage/clip.js';
import { SequencePlayer } from './stage/player.js';

const P5_URL = new URL('./libs/p5.min.js', import.meta.url).href;

// ── One hidden p5, lazily ────────────────────────────────────────────────────

let _scriptReady = null;
let _instance    = null;

function ensureP5Script() {
  if (typeof window !== 'undefined' && window.p5) return Promise.resolve(window.p5);
  if (_scriptReady) return _scriptReady;

  _scriptReady = new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = P5_URL;
    tag.onload  = () => resolve(window.p5);
    tag.onerror = () => reject(new Error('rebuild: could not load p5 from ' + P5_URL));
    document.head.append(tag);
  });
  return _scriptReady;
}

function ensureInstance() {
  if (_instance) return Promise.resolve(_instance);

  return ensureP5Script().then(p5 => new Promise(resolve => {
    const host = document.createElement('div');
    host.style.display = 'none';
    host.setAttribute('aria-hidden', 'true');
    document.body.append(host);

    new p5(p => {
      p.setup = () => {
        p.noCanvas();       // the player makes its own Graphics; this needs none
        p.noLoop();         // nothing here is driven by a clock
        _instance = p;
        resolve(p);
      };
    }, host);
  }));
}

// ── Opening a sequence ───────────────────────────────────────────────────────

/** Every family a recording refers to, including one an override points at. */
function familiesIn(recipe) {
  const ids = new Set();
  for (const event of recipe.sequence.events) if (event.familyId) ids.add(event.familyId);
  const override = recipe.clip && recipe.clip.overrides && recipe.clip.overrides.familyId;
  if (override) ids.add(override);
  return [...ids];
}

/**
 * Where to find the sprites a recording names.
 *
 * By convention an app's manifest sits beside its page, so the object's own
 * `origin.app` says where to look. Pass `manifestUrl` to override it — a
 * published object whose app is not installed is the case that will need it.
 */
function manifestFor(object) {
  const app = (object.origin && object.origin.app) || 'gamepad';
  return '/apps/' + app + '/brush-manifest.json';
}

/**
 * @param {object} object      a vault envelope of type `sequence`
 * @param {object} [opts]
 * @param {string} [opts.manifestUrl]
 * @param {number} [opts.renderScale=1]  buffer pixels per sequence pixel
 * @returns {Promise<Rebuilt>}
 */
export async function openSequence(object, { manifestUrl, renderScale = 1 } = {}) {
  const recipe = object && object.recipe;
  if (!recipe || !recipe.sequence || !Array.isArray(recipe.sequence.events)) {
    throw new Error('rebuild: that object carries no sequence to replay');
  }

  const p = await ensureInstance();

  await Registry.loadManifest(manifestUrl || manifestFor(object));
  Registry.setSelectedFamilies(familiesIn(recipe));
  await Registry.loadSelected(p);

  const clip = createClip(recipe.sequence, {
    overrides: recipe.clip && recipe.clip.overrides,
    timing:    recipe.clip && recipe.clip.timing,
    window:    recipe.clip && recipe.clip.window,
  });

  const player = new SequencePlayer(p);
  player.load(clip, { renderScale });
  player.reset();

  const render = object.render || {};

  return {
    /** Ticks in one complete loop. */
    length: player.length,

    /** What the object was exported at, so a viewer plays it as it was meant. */
    fps: render.fps || (clip.timing && clip.timing.ticksPerSecond) || 60,
    loop: render.loop !== false,

    /** The sequence's own coordinate space — the canvas it was drawn on. */
    width:  recipe.sequence.w,
    height: recipe.sequence.h,

    /** The rect of that space the buffer actually covers. */
    bounds: player.bounds,

    /** Families the registry could not resolve; their marks will not draw. */
    missing: player.missingFamilies,

    /**
     * The buffer at tick `i`. Reused — draw or read it before the next call.
     */
    frame(i) {
      player.walkTo(i);
      return player.buffer.canvas;
    },

    /**
     * Draw tick `i` into a context, fitted to `w`x`h` as the sequence's own
     * frame rather than as the buffer's.
     *
     * Worth having in one place: the buffer is sized to the marks, not to the
     * canvas they were drawn on, so putting it at 0,0 silently shifts and
     * rescales the whole loop. Every consumer would otherwise re-derive this,
     * and two of them would get it wrong differently.
     */
    drawInto(ctx, i, w, h) {
      const canvas = this.frame(i);
      const fit = Math.min(w / this.width, h / this.height);
      const offsetX = (w - this.width * fit) / 2;
      const offsetY = (h - this.height * fit) / 2;
      ctx.drawImage(
        canvas,
        offsetX + this.bounds.x * fit,
        offsetY + this.bounds.y * fit,
        this.bounds.w * fit,
        this.bounds.h * fit);
    },

    dispose() { player.dispose(); },
  };
}
