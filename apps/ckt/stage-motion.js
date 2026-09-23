/**
 * stage-motion.js — stage two on screen.
 *
 * v2's second layer: one glyph's dots, a sprite on each, all leaning towards
 * an attractor that runs its path. The arrow keys step the glyph as they did
 * in v2; when the attractor is a `point`, dragging on the canvas puts it down,
 * which is v2's mouse mode made into something a recipe can keep.
 *
 * Loading is the only slow thing, and it happens only for the keys that need
 * it: a dataset when the dataset changes, anchors when the glyph or window
 * does, a sprite when the mark does. Everything else redraws from what is
 * already there, which is what keeps the controls live while it plays.
 */

import { centre }       from './motion.js';
import { framing, renderFrame } from './render.js';
import { datasetFor, glyphOf, remember } from './datasets.js';
import { markFor }      from './sprites.js';
import { saveStill, saveLoop } from './save.js';
import { emitFamily }   from './family.js';
import { Playhead }     from '../../core/playback.js';
import { applyFrameEdit } from '../../core/frame.js';

const DATA   = new Set(['dataset', 'made']);
const ANCHOR = new Set(['dataset', 'made', 'glyph', 'width', 'height']);
const MARK   = new Set(['mark', 'shape', 'family', 'sprite']);
const CLOCK  = new Set(['period', 'fps']);

export class MotionStage {
  /**
   * @param {object} opts
   * @param {object} opts.params   from motionParams()
   * @param {HTMLCanvasElement} opts.canvas
   * @param {(text:string)=>void} opts.say
   * @param {HTMLButtonElement} opts.playBtn
   * @param {HTMLInputElement} opts.scrub
   */
  constructor({ params, canvas, say, playBtn, scrub }) {
    this.params = params;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.say = say;
    this.scrub = scrub;

    this.active = false;
    this.data = [];
    this.local = null;        // a dataset made with no vault: drawable, not recordable
    this.anchors = new Float64Array(0);
    this.mark = null;
    this.frame = null;
    this.last = null;
    this.pending = false;
    this.loads = { data: 0, mark: 0 };   // newest request wins; older ones land nowhere

    this.clock = new Playhead({
      onShow: () => this.draw(),
      onState: () => { playBtn.textContent = this.clock.playing ? '❙❙' : '▶'; },
    });

    params.on(key => this.changed(key));
  }

  async init() {
    await this.loadData();
    this.loadAnchors();
    await this.loadMark();
    this.configureClock();
    this.reframe();
  }

  async changed(key) {
    // No content passed: a derived format must never rewrite the window, which
    // is what the attractor's paths are measured against.
    applyFrameEdit(this.params, key);
    if (key === 'made' && this.params.get('made')) this.local = null;
    if (DATA.has(key)) await this.loadData();
    if (ANCHOR.has(key)) this.loadAnchors();
    if (MARK.has(key)) await this.loadMark();
    if (CLOCK.has(key)) this.configureClock();
    this.reframe();
    this.draw();
  }

  async loadData() {
    const token = ++this.loads.data;
    if (this.local) { this.data = this.local.data; return; }
    try {
      const data = await datasetFor(this.params.values);
      if (token === this.loads.data) this.data = data;
    } catch (err) {
      console.warn('[ckt] dataset would not load:', err);
      if (token !== this.loads.data) return;
      this.data = [];
      this.say('that dataset would not load: ' + err.message);
    }
  }

  loadAnchors() {
    const r = this.params.values;
    this.anchors = centre(glyphOf(this.data, r.glyph), { width: r.width, height: r.height });
  }

  async loadMark() {
    const token = ++this.loads.mark;
    const mark = await markFor(this.params.values);
    if (token === this.loads.mark) this.mark = mark;
  }

  configureClock() {
    const r = this.params.values;
    const was = this.clock.playing;
    this.clock.configure({ length: Math.max(1, Math.round(r.period)), fps: r.fps, loop: true });
    this.scrub.max = Math.max(0, Math.round(r.period) - 1);
    if (was) this.clock.play();
  }

  reframe() { this.frame = framing(this.params.values, this.anchors, this.mark); }

  /** A dataset from stage one: by id when the vault kept it, in memory when not. */
  async adopt(made) {
    if (made.object) {
      remember(made.object.id, made.data);
      this.local = null;
      this.params.set({ made: made.object.id, glyph: 0 });
    } else {
      this.local = { data: made.data, title: made.title };
      this.params.set({ made: null, glyph: 0 });
      await this.loadData();
      this.loadAnchors();
      this.reframe();
    }
  }

  /** v2's arrows: next or previous glyph, going round at either end. */
  step(by) {
    const n = Math.max(1, this.data.length);
    this.params.set('glyph', (((this.params.get('glyph') + by) % n) + n) % n);
  }

  draw() {
    if (!this.active || this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => { this.pending = false; this.paint(); });
  }

  paint() {
    const recipe = this.params.values;
    const tick = this.clock.tick;
    this.last = renderFrame({ recipe, anchors: this.anchors, mark: this.mark, tick, frame: this.frame });

    this.canvas.width = this.last.canvas.width;
    this.canvas.height = this.last.canvas.height;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.last.canvas, 0, 0);
    this.scrub.value = tick;

    const n = this.data.length;
    const glyph = n ? ((recipe.glyph % n) + n) % n : 0;
    const from = this.local ? this.local.title : recipe.made ? 'made' : recipe.dataset;
    const missing = recipe.mark === 'sprite' && !this.mark ? ' · sprite missing, drawing dots' : '';
    this.say(`${from} ${glyph + 1}/${n} · ${this.anchors.length / 2} dots · `
      + `frame ${tick + 1}/${Math.round(recipe.period)} · `
      + `${this.canvas.width}×${this.canvas.height}${missing}`);
  }

  // ── The attractor, by hand ────────────────────────────────────────────────

  /** Pointer to world, through the frame's own map. */
  pointAt(event) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = (event.clientX - rect.left) * (this.canvas.width / rect.width);
    const cy = (event.clientY - rect.top) * (this.canvas.height / rect.height);
    const f = this.frame;
    const r = this.params.values;
    return {
      pointX: Math.min(1, Math.max(0, (cx - f.ox) / f.sx / r.width)),
      pointY: Math.min(1, Math.max(0, (cy - f.oy) / f.sy / r.height)),
    };
  }

  // ── Saving ────────────────────────────────────────────────────────────────

  /** A dataset held only in memory cannot be named by a recipe: say so, save a leaf. */
  get leaf() { return !!this.local; }

  async saveStill() {
    if (!this.anchors.length) return 'nothing to save yet';
    const object = await saveStill({
      params: this.params, anchors: this.anchors, mark: this.mark,
      tick: this.clock.tick, leaf: this.leaf,
    });
    return object ? `saved ${object.id}` : 'no vault — downloaded instead';
  }

  async saveLoop(keepFrames) {
    this.clock.pause();
    const { object, frames } = await saveLoop({
      params: this.params, anchors: this.anchors, mark: this.mark, frame: this.frame,
      tick: this.clock.tick, keepFrames, leaf: this.leaf, onStatus: this.say,
    });
    return object ? `saved ${object.id} — ${frames} frames` : `no vault — ${frames} frames downloaded`;
  }

  async emit() {
    this.clock.pause();
    const r = this.params.values;
    const name = `${this.local ? 'made' : r.made ? 'made' : r.dataset}_${r.mark === 'dot' ? 'dots' : r.family + r.sprite}`;
    const { set, members } = await emitFamily({
      params: this.params, data: this.data, mark: this.mark, tick: this.clock.tick,
      name, leaf: this.leaf, onStatus: this.say,
    });
    return set ? `emitted ${set.id} — ${members} brushes; the gamepad lists it as a family`
               : `no vault — ${members} brushes downloaded as ${name}.zip`;
  }
}
