/**
 * rebuild.js — replay an object into frames.
 *
 * A `sequence` object's render is one PNG, and its frames are "a cache, not an
 * archive" (docs/object-model.md). So anything that wants the loop — a viewer
 * in the vault, grid dithering it frame by frame — has to rebuild it from the
 * recipe.
 *
 * That was not possible until the stage moved into `core/`, and it is the
 * reason the move happened. `docs/core-api.md` names this as the one exception
 * to `render()` touching nothing: an app asks the core to rebuild a parent, and
 * gets frames back.
 *
 * ── Two kinds of recipe, and why this dispatches ────────────────────────────
 *
 * A gamepad sequence carries its marks, and replaying it is the code below. A
 * grid sequence carries no marks at all: it holds grid's parameters and the id
 * of the loop it was dithered from. Replaying *that* means rebuilding its
 * parent and re-running the dither over every frame — the chain the object
 * model promised and nothing had ever walked.
 *
 * Core does not know how to dither and must not learn. So an object whose
 * recipe it does not recognise is handed to its own app: `/apps/<app>/rebuild.js`,
 * imported on demand, exporting `openObject()` and returning the same handle.
 * That is the same convention `manifestFor()` below already uses, and it means
 * a fourth app at M5 costs a file rather than an edit here.
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
import { layersOf }      from './layers.js';

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
 * Draw one rebuilt frame into a box, letterboxed.
 *
 * Exported because every handle needs it and the arithmetic is the kind that
 * two callers get wrong in two different ways. The subtlety it hides: a
 * rebuilt buffer may cover only *part* of the frame it belongs to — the
 * gamepad's is cropped to the marks — so a frame is a canvas plus the rect of
 * the frame that canvas occupies. Pass the whole frame as the box when the
 * canvas is the whole frame, as grid's is.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} canvas    the rebuilt buffer
 * @param {{x,y,w,h}} box               where that buffer sits in frame space
 * @param {{width,height}} frame        the frame's own coordinate space
 * @param {number} w                    the box to fit into
 * @param {number} h
 */
export function drawFrameInto(ctx, canvas, box, frame, w, h) {
  const fit = Math.min(w / frame.width, h / frame.height);
  const offsetX = (w - frame.width * fit) / 2;
  const offsetY = (h - frame.height * fit) / 2;
  ctx.drawImage(canvas,
    offsetX + box.x * fit,
    offsetY + box.y * fit,
    box.w * fit,
    box.h * fit);
}

/**
 * The size an object shows at: its ink. All of a still or a dither; of a
 * recording, the part of its canvas its marks ever reach — a gamepad loop's
 * canvas is the screen it was drawn on, mostly empty, and its render is
 * cropped to the ink, as `frame(i)` is. Shown at the canvas's size, the ink
 * would be stretched over it (the author, 2026-11-05: "la séquence se fait
 * stretch dans le viewer"). compose places by it; the vault app shows by it.
 *
 * @param {{width, height, bounds?: {w, h}}} handle   from `openFrames`
 * @returns {{width: number, height: number}}
 */
export function inkSize(handle) {
  const b = handle.bounds;
  return b && b.w > 0 && b.h > 0 ? { width: b.w, height: b.h } : { width: handle.width, height: handle.height };
}

/**
 * The maximum depth of a rebuild chain.
 *
 * A cycle cannot happen — a parent is always an object that already existed,
 * and objects are immutable — so this is not a cycle guard. It is there so a
 * chain that is somehow deeper than anyone intended fails saying what it was
 * doing, instead of as a stack overflow inside a dither.
 */
const MAX_DEPTH = 8;

/**
 * Replay any object into frames, whatever made it.
 *
 * @param {object} object      a vault envelope of type `sequence`
 * @param {object} [opts]
 * @param {string} [opts.manifestUrl]
 * @param {number} [opts.renderScale=1]  buffer pixels per sequence pixel
 * @param {number} [opts.scale]   pixels per pixel of the object's own size —
 *                               its render's — for an app to draw its frames at;
 *                               a recording of marks takes it as its renderScale
 * @param {boolean} [opts.draft]  a live preview's frames: the app that made the
 *                               object may take its faster, near-exact path, as
 *                               grid's growth does. Never for anything saved.
 * @param {number} [opts.depth=0]        how many rebuilds deep this already is
 * @returns {Promise<Rebuilt>}
 */
export async function openSequence(object, opts = {}) {
  const recipe = object && object.recipe;
  if (!recipe) throw new Error('rebuild: that object carries no recipe to replay');

  if ((opts.depth || 0) > MAX_DEPTH) {
    throw new Error('rebuild: chain deeper than ' + MAX_DEPTH + ' objects, stopping');
  }

  // Marks: this file replays them itself. Anything else belongs to its app.
  if (recipe.sequence && Array.isArray(recipe.sequence.events)) {
    return openMarks(object, { ...opts, renderScale: opts.renderScale || opts.scale || 1 });
  }
  return openViaApp(object, opts);
}

/** The render files a browser decodes into a picture. */
const PICTURE = /\.(png|webp|jpe?g|gif)$/i;

/**
 * Whether an object's frames are rebuilt from its recipe rather than read
 * off its render: a sequence, or anything whose render says it has more than
 * one frame — a composition that moves. core/vault-detail.js asks the same
 * question in one line of its own, to stay light.
 */
const replayed = object => !!object && !!object.recipe
  && (object.type === 'sequence' || (!!object.render && object.render.frames > 1));

/**
 * Any object as frames — what compose asks of everything it places.
 *
 * Anything with a recipe and more than one frame — a sequence, a composition
 * that moves — is replayed by its app, as above. Anything else whose render
 * is a picture — a still, a shape, a set's contact sheet, a loop saved as a
 * leaf — is that picture, a loop one frame long: its saved pixels. A render
 * that is data and not a picture, a dot-set's JSON, goes to its app as a
 * sequence does, since only the app knows what it looks like.
 *
 * ── At a scale ──────────────────────────────────────────────────────────────
 *
 * `scale` asks for frames at that many pixels per pixel of the object's own
 * size — its render's, which every handle reports as `width` and `height`
 * whatever it is asked. Print scale is where this matters (docs/roadmap.md,
 * M4): a picture stretched to 300 dpi is its pixels, blurred. So above 1 a
 * still is drawn again by its app when the app says it can — `redraws()` in
 * its rebuild.js, as `reopens()` is — and stays its pixels otherwise. A
 * gamepad still is core's own to draw again, from its marks (stage/still.js),
 * and so is one that comes with no picture at all — a drawing printed straight
 * off the gamepad's canvas. Every handle says what it did: `handle.scale` is the scale its frames are
 * really drawn at, 1 for a picture, and a caller that asked for more knows
 * what it will be stretching.
 *
 * @param {object} object   a vault envelope
 * @param {object} [opts]   as openSequence's, and `url`: where its render is
 * @returns {Promise<Rebuilt>}
 */
export async function openFrames(object, opts = {}) {
  // A smart object is the object it binds, drawn by its app (core/smart.js).
  if (object && object.type === 'skw') return (await import('./smart.js')).openSmart(object, opts);
  const file = object && object.render && object.render.file;
  const picture = !!file && PICTURE.test(file);
  if (replayed(object)) return openSequence(object, opts);
  if (opts.scale > 1 && object.recipe && await redrawn(object)) return openSequence(object, opts);
  if ((opts.scale > 1 || !picture) && isStillMarks(object)) return (await import('./stage/still.js')).openStill(object, opts);
  if (picture) return openPicture(object, opts.url);
  return openSequence(object, opts);
}

/**
 * A recording of marks: core's own to replay, so no app is asked about one —
 * the gamepad has no rebuild.js, and asking would be a 404 in every console.
 * The same test as core/reopen.js's, which asks the same question for links.
 */
const isMarks = recipe => !!recipe
  && (Array.isArray(recipe.marks) || !!(recipe.sequence && Array.isArray(recipe.sequence.events)));

/** A still drawn with marks: a gamepad drawing, not an image under them (stage/still.js `hasMarks`). */
const isStillMarks = object => !!object && object.type === 'still' && !!object.recipe
  && Array.isArray(object.recipe.marks) && object.recipe.marks.length > 0;

/** Whether the app that made an object says it can draw it again at a scale. */
async function redrawn(object) {
  const app = object.origin && object.origin.app;
  if (!app || isMarks(object.recipe)) return false;
  try {
    const module = await import(/* @vite-ignore */ '/apps/' + app + '/rebuild.js');
    return typeof module.redraws === 'function' && !!module.redraws(object);
  } catch {
    return false;                      // no rebuild.js: the app draws nothing again
  }
}

/**
 * A render that is a picture, as a handle whose every tick is it. Exported for
 * an app's rebuild.js that cannot replay here — a GPU object on a machine
 * without WebGPU shows as its saved render (docs/core-api.md, *gpu/*).
 */
export async function openPicture(object, url) {
  const res = await fetch(url || '/vault/objects/' + object.id + '/' + object.render.file);
  if (!res.ok) throw new Error(`rebuild: the render of ${object.id} did not load (HTTP ${res.status})`);
  const bitmap = await createImageBitmap(await res.blob());
  const box = { x: 0, y: 0, w: bitmap.width, h: bitmap.height };

  return {
    length: 1,
    fps: 0,
    loop: false,
    width: bitmap.width,
    height: bitmap.height,
    bounds: box,
    missing: [],
    scale: 1,                          // its pixels, whatever was asked
    frame() { return bitmap; },
    drawInto(ctx, i, w, h) { drawFrameInto(ctx, bitmap, box, this, w, h); },
    dispose() { if (bitmap.close) bitmap.close(); },
  };
}

/**
 * Hand an object to the app that made it.
 *
 * The failure worth a clear message is the ordinary one: the object was made
 * by an app this checkout does not have, which is what will happen the first
 * time a published object opens somewhere else.
 */
async function openViaApp(object, opts) {
  const app = object.origin && object.origin.app;
  if (!app) throw new Error('rebuild: that object does not say which app made it');

  let module;
  try {
    module = await import(/* @vite-ignore */ '/apps/' + app + '/rebuild.js');
  } catch (err) {
    throw new Error(`rebuild: nothing here knows how to replay a "${app}" object — `
      + `/apps/${app}/rebuild.js did not load (${err.message})`);
  }

  if (typeof module.openObject !== 'function') {
    throw new Error(`rebuild: /apps/${app}/rebuild.js does not export openObject()`);
  }

  const depth = (opts.depth || 0) + 1;
  const handle = await module.openObject(object, { ...opts, depth });
  // Its layers laid round its frames, in front and behind (core/layers-draw.js, L13) — unless its app drew them.
  if (!layersOf(object.recipe).length || handle.layered) return handle;
  return (await import('./layers-draw.js')).withLayers(handle, object.recipe, { draft: !!opts.draft, depth });
}

/** A recording of marks, replayed through the stage. */
async function openMarks(object, { manifestUrl, renderScale = 1 } = {}) {
  const recipe = object.recipe;
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

    /** The scale the buffer is drawn at — the marks again, never stretched. */
    scale: renderScale,

    /**
     * The buffer at tick `i`. Reused — draw or read it before the next call.
     */
    frame(i) {
      player.walkTo(i);
      return player.buffer.canvas;
    },

    /**
     * Draw tick `i` into a context, fitted to `w`x`h` as the sequence's own
     * frame rather than as the buffer's. The buffer is sized to the marks, not
     * to the canvas they were drawn on, so putting it at 0,0 would silently
     * shift and rescale the whole loop — which is what `bounds` is for.
     */
    drawInto(ctx, i, w, h) {
      drawFrameInto(ctx, this.frame(i), player.bounds, this, w, h);
    },

    dispose() { player.dispose(); },
  };
}
