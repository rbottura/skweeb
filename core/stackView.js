/**
 * stackView.js — the live stack drawn round a window's own canvas (M11,
 * brick 3; docs/smart-objects.md, *The live stack*).
 *
 * The layers under this window's own go on one canvas behind its canvas,
 * composited there with their blends (core/blend.js); each layer over it on
 * a canvas of its own in front; and its own canvas is given its block's
 * opacity and blend by CSS — `opacity` and `mix-blend-mode`, which composite
 * as canvas does — so the browser lays the stack together as a save will.
 * All of it in this window's frame: its own block's placement undone, so the
 * app's canvas stays where it was and all it does with a pointer still
 * lands. Its stage holds them, isolated, so a blend meets the stack and not
 * the page round it. A window not in the stack is as it was.
 *
 * Every other layer is drawn by core/rebuild.js — a window's from its
 * envelope, a vault object from the vault — as a draft, at its own pixels; a
 * loop at the wall clock's frame, so every window shows it at the same frame
 * with no word passed between them. A layer still opening keeps its last
 * picture until the new one is ready.
 */

import { openFrames } from './rebuild.js';
import { Vault }      from './vault.js';
import { placementMatrix, multiply, invert } from './place.js';
import { compositeOf, cssBlendOf } from './blend.js';
import { held }       from './scope.js';

/** The frame a loop shows now, by the wall clock: the same in every window. */
export const tickNow = (length, fps, now = Date.now()) => (length > 1 ? Math.floor((now / 1000) * (fps || 30)) % length : 0);

/** A handle's own size, as a page places it: its ink's box, which its frames fill. */
const sizeOf = handle => {
  const b = handle.bounds;
  return b && b.w > 0 && b.h > 0 ? { width: b.w, height: b.h } : { width: handle.width, height: handle.height };
};

const layerCanvas = z => {
  const c = document.createElement('canvas');
  c.className = 'stack-layer';
  Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: String(z) });
  return c;
};

/**
 * Draw the stack round this window's canvas.
 *
 * @param {object} opts
 * @param {object} opts.live      this window, core/live.js's
 * @param {object} opts.stack     this browser's stack, core/stack.js's
 * @param {() => ?HTMLCanvasElement} opts.canvas   the app's own canvas, in its stage
 * @returns {{dispose: () => void}}
 */
export function stackView({ live, stack, canvas: find }) {
  const drawn = new Map();       // a block's key → { text, handle, size, pending }
  const overs = [];
  let stage = null, under = null, own = null, raf = 0;
  let was = null;                // the styles this changed, to give them back

  /**
   * The app's canvas, and round it its stage, made ready to hold the layers —
   * only once this window is in the stack: until then its page is untouched.
   */
  function mount() {
    const c = find();
    if (!c || !c.parentElement) return false;
    if (c === own && c.parentElement === stage) return true;
    unmount();
    own = c;
    stage = c.parentElement;
    was = { stage: { position: stage.style.position, isolation: stage.style.isolation },
            own: { position: own.style.position, zIndex: own.style.zIndex, opacity: own.style.opacity, mixBlendMode: own.style.mixBlendMode } };
    if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
    stage.style.isolation = 'isolate';
    stage.classList.add('stacked');      // the checkerboard under all of it (core/theme.css)
    if (getComputedStyle(own).position === 'static') own.style.position = 'relative';
    own.style.zIndex = '1';
    under = layerCanvas(0);
    stage.insertBefore(under, own);
    if (sized) { sized.observe(stage); sized.observe(own); }
    return true;
  }

  /** Nothing of the stack shown: the page as it was, its styles given back and the layers' canvases gone. */
  function unmount() {
    if (!own) return;
    Object.assign(stage.style, was.stage);
    stage.classList.remove('stacked');
    Object.assign(own.style, was.own);
    if (under) under.remove();
    for (const c of overs) c.remove();
    overs.length = 0;
    if (sized) sized.disconnect();
    stage = under = own = was = null;
  }
  const clear = unmount;

  /** A block's frames: opened once for what it is now, the last kept while the next opens. */
  function framesOf(block) {
    const key = block.live || 'ref:' + block.ref;
    let text = block.ref;
    if (block.live) {
      const w = live.windows().find(x => x.id === block.live);
      if (!w || !w.layer) return null;
      text = w.text;
    }
    const entry = drawn.get(key) || { text: null, handle: null, size: null, pending: null };
    drawn.set(key, entry);
    if (entry.text !== text && entry.pending !== text) {
      entry.pending = text;
      const opening = block.live
        ? openFrames(JSON.parse(text), { draft: true })
        : Vault.load(block.ref).then(({ object, url }) => { entry.refs = object.refs || []; return openFrames(object, { url, draft: true }); });
      opening.then(handle => {
        if (entry.pending !== text) { if (handle.dispose) handle.dispose(); return; }
        if (entry.handle && entry.handle.dispose) entry.handle.dispose();
        Object.assign(entry, { text, handle, size: sizeOf(handle), pending: null });
        schedule();
      }, err => {
        if (entry.pending === text) entry.pending = null;
        entry.text = text;              // tried: not tried again until it changes
        console.warn('[stack] could not draw a layer:', err.message);
      });
    }
    return entry.handle ? entry : null;
  }

  /** One block onto a context in the stage's pixels; true when it moves. */
  function paint(ctx, block, pageToStage, page, dpr, blended) {
    const entry = framesOf(block);
    if (!entry) return false;
    const { handle, size } = entry;
    let frame;
    try {
      frame = handle.frame(tickNow(handle.length, handle.fps));
    } catch (err) {
      console.warn('[stack] a layer did not draw:', err.message);
      return false;
    }
    const m = multiply(pageToStage, placementMatrix(block.transform, size, page));
    ctx.setTransform(m[0] * dpr, m[1] * dpr, m[2] * dpr, m[3] * dpr, m[4] * dpr, m[5] * dpr);
    ctx.globalAlpha = blended ? (block.opacity ?? 1) : 1;
    ctx.globalCompositeOperation = blended ? compositeOf(block.blend) : 'source-over';
    ctx.drawImage(frame, 0, 0, size.width, size.height);
    return handle.length > 1;
  }

  function draw() {
    raf = 0;
    const { page, place } = stack.get();
    const i = place.findIndex(b => b.live === live.id);
    const mine = live.mine().layer;
    const r = mine && mine.render;
    if (i < 0 || !page || !(r && r.w > 0 && r.h > 0) || !mount()) return clear();

    // The stage's pixels, and where in them the app shows its own frame.
    const dpr = devicePixelRatio || 1;
    const W = Math.max(1, Math.round(stage.clientWidth * dpr)), H = Math.max(1, Math.round(stage.clientHeight * dpr));
    const a = own.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const box = { x: a.left - s.left - stage.clientLeft, y: a.top - s.top - stage.clientTop, w: a.width, h: a.height };
    // A point of the page → this window's own pixels (its placement undone) → the stage, where its canvas shows them.
    const toBox = [box.w / r.w, 0, 0, box.h / r.h, box.x, box.y];
    const pageToStage = multiply(toBox, invert(placementMatrix(place[i].transform, { width: r.w, height: r.h }, page)));

    own.style.opacity = String(place[i].opacity ?? 1);
    own.style.mixBlendMode = cssBlendOf(place[i].blend);
    let moving = false;

    if (under.width !== W || under.height !== H) { under.width = W; under.height = H; }
    const u = under.getContext('2d');
    u.setTransform(1, 0, 0, 1, 0, 0);
    u.globalAlpha = 1;
    u.globalCompositeOperation = 'source-over';
    u.clearRect(0, 0, W, H);
    for (let k = 0; k < i; k++) moving = paint(u, place[k], pageToStage, page, dpr, true) || moving;

    const above = place.slice(i + 1);
    while (overs.length < above.length) overs.push(stage.appendChild(layerCanvas(2 + overs.length)));
    overs.forEach((c, k) => {
      c.hidden = k >= above.length;
      if (c.hidden) return;
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      c.style.opacity = String(above[k].opacity ?? 1);
      c.style.mixBlendMode = cssBlendOf(above[k].blend);
      const ctx = c.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      moving = paint(ctx, above[k], pageToStage, page, dpr, false) || moving;
    });

    // What is no longer on the stack lets its frames go.
    const keys = new Set(place.map(b => b.live || 'ref:' + b.ref));
    for (const [key, entry] of drawn) {
      if (keys.has(key)) continue;
      if (entry.handle && entry.handle.dispose) entry.handle.dispose();
      drawn.delete(key);
    }
    if (moving) schedule();
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(draw); }

  // A smart object took a new version: a layer that is it, or holds it, opened again (core/smart.js).
  const stale = ({ detail }) => {
    for (const [key, entry] of drawn) {
      if (key === 'ref:' + detail.id || (entry.refs || []).includes(detail.id)) entry.text = null;
    }
    schedule();
  };
  document.addEventListener('vault:updated', stale);
  const stops = [stack.on(schedule), live.on(schedule), () => document.removeEventListener('vault:updated', stale)];
  const sized = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
  schedule();

  const view = {
    /** Draw again now — after the app's own canvas changed size, say. */
    redraw: schedule,
    dispose() {
      for (const stop of stops) stop();
      cancelAnimationFrame(raf);
      unmount();
      for (const entry of drawn.values()) if (entry.handle && entry.handle.dispose) entry.handle.dispose();
      drawn.clear();
    },
  };
  held(() => view.dispose());           // its app unmounted (core/scope.js, S9)
  return view;
}
