/**
 * layers-view.js — an object's layers seen round the app's canvas while it is
 * worked on (core/layers.js, L13): each on a canvas of its own laid on the
 * canvas's box — the ones behind just under it, the ones in front just over
 * it — given its opacity and blend by CSS, `opacity` and `mix-blend-mode`,
 * which composite as a save's canvas does, so the browser lays them together
 * as the saved picture will be. In its stage, isolated, a blend meets the
 * picture and not the page; under the windows' stack's layers, which are a
 * window's whole (core/stackView.js).
 *
 * Drawn again when the values change, when the canvas is laid again — a
 * resize, a zoom, a pan (core/viewzoom.js) — when a smart object it holds
 * takes a version, and, while a layer moves, at the app's frame. An app with
 * no layers keeps its page untouched; one that draws its own — particles —
 * never has one of these (core/StackPanel.js `layered`).
 */

import { openedLayers, drawLayer, laidOn } from './layers-draw.js';
import { layersOf, formatOf, across } from './layers.js';
import { onZoom }  from './viewzoom.js';
import { held }    from './scope.js';

/**
 * @param {object} opts
 * @param {object} opts.params          the app's: its layers under `key`, its format beside them
 * @param {string} opts.key
 * @param {() => ?HTMLCanvasElement} opts.canvas   the app's own, in its stage
 * @param {?{tick: number}} [opts.clock]          the app's: a moving layer at its frame
 * @param {() => Promise<?{width, height}>} [opts.own]   the picture's own size, for an app with no format
 * @param {() => ?{x, y, w, h}} [opts.frame]   where on its canvas the picture is, in the canvas's pixels — for an
 *                                    app whose canvas shows more than it saves: the rig's room round its drawing
 * @returns {{redraw: () => void, dispose: () => void}}
 */
export function layersView({ params, key, canvas: find, clock = null, own = async () => null, frame = () => null }) {
  let raf = 0, ticked = -1, size = null;
  const opened = openedLayers({ draft: true, onOpened: () => schedule() });
  let stage = null, mine = null, was = null;
  const shown = [];                 // [{ canvas, o }]: one a layer, in the stage

  /** The app's canvas and its stage ready to hold them — only once there are layers. */
  function mount() {
    const c = find();
    if (!c || !c.parentElement) return false;
    if (c === mine && c.parentElement === stage) return true;
    unmount();
    mine = c;
    stage = c.parentElement;
    was = { stage: { position: stage.style.position, isolation: stage.style.isolation },
            own: { position: mine.style.position, zIndex: mine.style.zIndex } };
    if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
    stage.style.isolation = 'isolate';
    stage.classList.add('layered');      // the checkerboard under the picture's canvas, not on it (core/theme.css)
    if (getComputedStyle(mine).position === 'static') mine.style.position = 'relative';
    if (!mine.style.zIndex) mine.style.zIndex = '1';
    if (sized) { sized.observe(stage); sized.observe(mine); }
    return true;
  }

  /** The page as it was: the canvases gone, the styles given back where they are still this file's. */
  function unmount() {
    for (const s of shown) s.canvas.remove();
    shown.length = 0;
    if (!mine) return;
    stage.classList.remove('layered');
    if (stage.style.isolation === 'isolate' && !stage.classList.contains('stacked')) stage.style.isolation = was.stage.isolation;
    if (!stage.classList.contains('stacked')) {
      if (stage.style.position === 'relative') stage.style.position = was.stage.position;
      if (mine.style.zIndex === '1') mine.style.zIndex = was.own.zIndex;
      if (mine.style.position === 'relative') mine.style.position = was.own.position;
    }
    if (sized) sized.disconnect();
    stage = mine = was = null;
  }

  /**
   * A canvas for each layer, in the stage beside the app's, one z-index with
   * it so their order is the page's: the ones behind bottom first before it,
   * the ones in front bottom first after it — moved only when out of order.
   */
  function lay(list) {
    while (shown.length > list.length) shown.pop().canvas.remove();
    list.forEach((o, k) => {
      if (!shown[k]) {
        const c = document.createElement('canvas');
        c.className = 'obj-layer';
        Object.assign(c.style, { position: 'absolute', pointerEvents: 'none', zIndex: '1' });
        shown[k] = { canvas: c, o: null };
      }
      shown[k].o = o;
    });
    const behind = shown.filter(x => x.o.layer.at === 'behind').map(x => x.canvas);
    const front = shown.filter(x => x.o.layer.at !== 'behind').map(x => x.canvas);
    const want = [...behind, mine, ...front];
    const ordered = want.every((n, i) => n.parentElement === stage
      && (i === 0 || (want[i - 1].compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING)));
    if (ordered) return;
    for (const c of behind) stage.insertBefore(c, mine);
    let after = mine.nextSibling;
    for (const c of front) { stage.insertBefore(c, after); after = c.nextSibling; }
  }

  function draw() {
    raf = 0;
    const layers = laidOn(params.values[key], opened.list);           // its rows as they are now: a change moves it, reopening nothing
    // Nothing to lay them on — no picture yet, filter with no source, the rig with no drawing: none shown.
    const fmt = formatOf(params.values, size);
    if (!layers.length || !fmt || !mount()) return unmount();
    const r = mine.getBoundingClientRect(), s = stage.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return unmount();
    // The picture's box on the screen: the canvas's, or the part of it the app says it saves.
    const f = frame(), kx = r.width / Math.max(1, mine.width), ky = r.height / Math.max(1, mine.height);
    const a = f && f.w > 0 && f.h > 0 ? { left: r.left + f.x * kx, top: r.top + f.y * ky, width: f.w * kx, height: f.h * ky } : r;
    lay(layers);
    const dpr = devicePixelRatio || 1;
    const box = { x: a.left - s.left - stage.clientLeft, y: a.top - s.top - stage.clientTop, w: a.width, h: a.height };
    const tick = clock ? Math.round(clock.tick || 0) : 0;
    let moving = false;
    for (const { canvas, o } of shown) {
      Object.assign(canvas.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px`,
        opacity: String(Math.max(0, Math.min(1, o.layer.opacity ?? 1))), mixBlendMode: o.layer.blend && o.layer.blend !== 'normal' ? o.layer.blend : '' });
      const W = Math.max(1, Math.round(box.w * dpr)), H = Math.max(1, Math.round(box.h * dpr));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      drawLayer(ctx, o, fmt, W / across(fmt), tick, { blended: false });
      if (o.handle.length > 1) moving = true;
    }
    ticked = tick;
    if (moving) follow();
  }

  /** While a layer moves: drawn again when the app's frame does. */
  function follow() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (clock && Math.round(clock.tick || 0) !== ticked) draw();
      else follow();
    });
  }

  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
    // An app with no format of its own — filter, the map, the rig: its picture's own size, which its source sets, asked again.
    if (!formatOf(params.values)) own().then(s => {
      if (!s || (size && s.width === size.width && s.height === size.height)) return;
      size = s;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    }, () => {});
  }

  const sized = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => schedule()) : null;
  const heard = () => { opened.want(layersOf({ [key]: params.values[key] })); schedule(); };
  const offParams = params.on(k => { if (k === key || k === 'width' || k === 'height' || k === 'bleed' || k === 'scale' || k === 'format') heard(); });
  const offZoom = onZoom(() => schedule());
  // A smart object held as a layer took a version: opened again, at its latest (core/smart.js).
  const stale = ({ detail }) => { if (opened.list.some(o => o.layer.ref === detail.id)) { opened.stale(); heard(); } };
  document.addEventListener('vault:updated', stale);
  heard();

  const view = {
    redraw: schedule,
    dispose() {
      unheld();
      offParams();
      offZoom();
      document.removeEventListener('vault:updated', stale);
      cancelAnimationFrame(raf);
      unmount();
      opened.close();
    },
  };
  let unheld = () => {};
  unheld = held(() => view.dispose());     // its app unmounted (core/scope.js, S9)
  return view;
}
