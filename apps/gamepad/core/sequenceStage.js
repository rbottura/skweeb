/**
 * sequenceStage.js
 * Where clips are placed and drawn. One stage per display surface.
 *
 * WHY PLACEMENT LIVES HERE AND NOT ON THE CLIP
 * ──────────────────────────────────────────────────────────────────────────────
 * It is tempting to bake a clip's position, rotation and scale into its buffer,
 * applying them per mark as it renders. Two independent arguments say not to,
 * and they happen to agree:
 *
 *   Cost.    Inside the buffer, rescaling re-renders every visible mark and
 *            clips against the buffer's edge. Here it is a different image()
 *            call — free, and it cannot clip.
 *   Meaning. A clip is a *treatment* of a recording. Where it sits on this
 *            particular surface is not part of that treatment, and the same
 *            clip may well appear twice on one stage at two positions — which
 *            a field on the clip cannot express.
 *
 * The one thing that stays inside the buffer is `overrides.scaleMul`, which
 * changes mark size *relative to mark spacing*. That alters what the drawing
 * is, not where it is.
 *
 * LAYERS
 * ──────────────────────────────────────────────────────────────────────────────
 * A layer is the shared record of one clip's presence on this stage. The stage
 * owns the list and the render fields; SequenceTransport reads the same objects
 * and owns the time fields (`rate`, `playing`, `pause`, `frozenAt`). Pixels
 * here, clock there, one record between them.
 *
 * Neither this class nor the transport disposes a player — whoever built it
 * owns it. p5 retains every Graphics until it is removed, so that ownership
 * has to stay somewhere visible.
 *
 * FILTERS AND BLENDING GO ON THE CONTEXT, NOT THE BUFFER
 * ───────────────────────────────────────────────────────────────────────────────
 * p5's `g.filter(BLUR, 3)` is destructive to the buffer, so it would have to
 * re-run over the whole thing on every tick and would fight the append fast
 * path directly. A filter set on the drawing context composes with the buffer
 * instead and costs nothing per tick. The same reasoning already rules out
 * `tint()` elsewhere in this project.
 *
 * Blend modes are the bigger prize. Stacking with alpha only occludes;
 * `multiply` and `screen` make clips *interact*, which is the difference
 * between four drawings on one screen and one composition. That is also why
 * layers default to `fit: 'contain'` — overlapping is the point.
 *
 * push() maps to drawingContext.save(), which captures filter, composite
 * operation and alpha, so pop() restores all three and no layer can leak its
 * look onto the next.
 */

/** Ready-made `ctx.filter` strings. Values are CSS filter syntax. */
export const FILTER_PRESETS = [
  { label: 'None',     value: 'none' },
  { label: 'Blur',     value: 'blur(3px)' },
  { label: 'Soft',     value: 'blur(1px) contrast(1.15)' },
  { label: 'Bloom',    value: 'blur(2px) brightness(1.35) contrast(0.85)' },
  { label: 'Mono',     value: 'grayscale(1) contrast(1.4)' },
  { label: 'Invert',   value: 'invert(1)' },
  { label: 'Warm',     value: 'sepia(0.5) saturate(1.6)' },
  { label: 'Hue 90',   value: 'hue-rotate(90deg) saturate(1.3)' },
  { label: 'Hue 180',  value: 'hue-rotate(180deg)' },
];

/** Canvas composite operations worth reaching for. */
export const BLEND_MODES = [
  { label: 'Normal',     value: 'source-over' },
  { label: 'Multiply',   value: 'multiply' },
  { label: 'Screen',     value: 'screen' },
  { label: 'Overlay',    value: 'overlay' },
  { label: 'Darken',     value: 'darken' },
  { label: 'Lighten',    value: 'lighten' },
  { label: 'Difference', value: 'difference' },
  { label: 'Exclusion',  value: 'exclusion' },
];

/**
 * Where a layer sits on the surface.
 *
 *   x, y     offset from the surface CENTRE, as a fraction of its width and
 *            height. 0 centres; 0.25 is a quarter of the way to the right
 *            edge. Fractions rather than pixels so a composition survives a
 *            resize — the same reason `fit` exists at all. Absolute placement
 *            is still one division away: x = (px - w / 2) / w.
 *   rotation radians, about that point
 *   scale    a plain multiplier in both fit modes
 *   mirrorX  flip horizontally about the centre
 *   fit      'contain' sizes the sequence to the surface first and `scale`
 *            then multiplies that — what a full-screen playback wants, and it
 *            survives a resize with no bookkeeping because the stage recomputes
 *            it every frame. null uses `scale` alone, in sequence pixels.
 */
const LAYOUT_DEFAULTS = { x: 0, y: 0, rotation: 0, scale: 1, mirrorX: false, fit: null };

/**
 * The scale a layer is actually drawn at, on a surface of this size.
 *
 * Exported because it answers a question the buffer cannot: how many buffer
 * pixels land on one screen pixel. That ratio is `renderScale / layerScale`,
 * and it is the whole story of when raising a layer's density is worth
 * anything — above 1:1 there is nothing left to resolve.
 */
export function layerScale(layer, surfaceW, surfaceH) {
  const lo  = layer.layout;
  const seq = layer.player?.clip?.sequence;
  if (!seq) return lo.scale;

  const fit = lo.fit === 'contain'
    ? Math.min(surfaceW / seq.w, surfaceH / seq.h)
    : 1;
  return lo.scale * fit;
}

export class SequenceStage {
  constructor() {
    this.layers = [];
  }

  /**
   * Put a player on the stage.
   * @param {SequencePlayer} player
   * @param {Object} [opts]
   * @param {string} [opts.name]    what the timeline calls it
   * @param {Object} [opts.layout]  see LAYOUT_DEFAULTS
   * @param {string} [opts.filter]  a `ctx.filter` string, e.g. 'blur(3px)'
   * @param {string} [opts.blend]   a canvas composite operation
   * @param {number} [opts.alpha]   0..1
   * @param {Object} [opts.rate]    { ratio, offset } against the master clock
   * @param {string} [opts.pause]   'hard' resyncs on resume, 'soft' keeps phase
   * @returns {Object} the layer — mutate it freely
   */
  add(player, opts = {}) {
    const layer = {
      player,
      name:     opts.name ?? `Layer ${this.layers.length + 1}`,
      layout:   { ...LAYOUT_DEFAULTS, ...opts.layout },
      filter:   opts.filter ?? 'none',
      blend:    opts.blend  ?? 'source-over',
      alpha:    opts.alpha  ?? 1,
      visible:  opts.visible !== false,
      solo:     opts.solo === true,

      // Read and written by SequenceTransport. `phase` is the stagger the user
      // chose, as a fraction of the loop; `offset` is that in ticks; `anchor`
      // is the transport's own bookkeeping — see its notes.
      rate:     { ratio: 1, phase: 0, offset: 0, anchor: 0, ...opts.rate },
      playing:  opts.playing !== false,
      pause:    opts.pause ?? 'hard',
      frozenAt: null,
    };
    this.layers.push(layer);
    return layer;
  }

  layerOf(player) {
    return this.layers.find(l => l.player === player) ?? null;
  }

  /** Drop a layer. The player is not disposed — whoever built it owns it. */
  remove(player) {
    const i = this.layers.findIndex(l => l.player === player);
    if (i >= 0) this.layers.splice(i, 1);
  }

  /** Drop every layer. Players are not disposed. */
  clear() {
    this.layers.length = 0;
  }

  /**
   * Move a layer in the stack.
   *
   * Draw order *is* stacking order, and once blend modes are in play that is
   * not a cosmetic detail — `multiply` beneath a layer reads nothing like
   * `multiply` above it. So this is a real edit to the composition, not a
   * tidy-up of a list.
   *
   * @param {number} from  current index
   * @param {number} to    index it should end up at
   */
  move(from, to) {
    const n = this.layers.length;
    if (from === to || from < 0 || from >= n || to < 0 || to >= n) return;
    const [layer] = this.layers.splice(from, 1);
    this.layers.splice(to, 0, layer);
  }

  /** True while any layer is soloed, so the rest are held back. */
  get soloed() {
    return this.layers.some(l => l.solo);
  }

  /**
   * Blit every visible layer.
   * @param {p5} p  the surface — and the same instance the players were built
   *        with, because a p5.Graphics belongs to whoever created it.
   */
  draw(p) {
    // Solo beats visibility, the way it does in an editing timeline: the point
    // of soloing one layer is to see it *now* without first having to record
    // what every other layer's eye was set to and put it all back after.
    const soloed = this.soloed;

    for (const layer of this.layers) {
      if (soloed ? !layer.solo : !layer.visible) continue;

      const buf = layer.player.buffer;
      const b   = layer.player.bounds;
      const seq = layer.player.clip?.sequence;
      if (!buf || !b || !seq) continue;

      const lo  = layer.layout;
      const s   = layerScale(layer, p.width, p.height);
      const cx  = p.width  / 2 + lo.x * p.width;
      const cy  = p.height / 2 + lo.y * p.height;

      p.push();

      // After push(), because that is a drawingContext.save() — pop() puts all
      // three back, so a layer cannot leak its look onto the next one.
      const ctx = p.drawingContext;
      if (ctx) {
        ctx.filter = layer.filter;
        ctx.globalCompositeOperation = layer.blend;
        ctx.globalAlpha = layer.alpha;
      }

      p.translate(cx, cy);
      p.rotate(lo.rotation);
      p.scale(lo.mirrorX ? -s : s, s);
      p.translate(-seq.w / 2, -seq.h / 2);   // now in sequence coordinates

      // The buffer covers `bounds` and may be at a higher resolution than the
      // rect it stands for, so drawing it at that rect's size resolves both at
      // once. Marks hanging off the sequence's edge spill outside it, which is
      // the whole reason bounds are published rather than assumed.
      p.imageMode(p.CORNER);
      p.image(buf, b.x, b.y, b.w, b.h);
      p.pop();
    }
  }
}
