/**
 * stage-motion.js — stage two on screen.
 *
 * v2's second layer: one glyph's dots, a sprite on each, turning — and, when
 * you switch it on, leaning towards an attractor on its path. ↑ ↓ step the
 * glyph as they did in v2; ← → step the dot-set, this session's first, then
 * the legacy nine; with the attractor at a `point`, dragging on the canvas puts
 * it down — v2's mouse mode made into something a recipe keeps.
 *
 * Loading is the only slow thing, and it happens only for the keys that need
 * it: a dataset when the set changes, anchors when the glyph or window does, a
 * sprite when the mark does. Everything else redraws from what is there, and
 * the preview draws straight into the viewer's canvas (render.js, draft).
 */

import { centre, loopFrames } from './motion.js';
import { framing, renderFrame } from './render.js';
import { datasetFor, glyphOf, remember } from './datasets.js';
import { markFor }      from './sprites.js';
import { saveStill, saveLoop, APP } from './save.js';
import { emitFamily }   from './family.js';
import { Session, setOrder } from './sessions.js';
import { Playhead }     from '../../core/playback.js';
import { Transport }    from '../../core/Transport.js';
import { applyFrameEdit } from '../../core/frame.js';
import { PrintPanel }   from '../../core/PrintPanel.js';

const DATA   = new Set(['dataset', 'made']);
const ANCHOR = new Set(['dataset', 'made', 'glyph', 'width', 'height']);
const MARK   = new Set(['mark', 'shape', 'family', 'sprite']);
const CLOCK  = new Set(['speed', 'fps']);
const wrap = (i, n) => ((i % n) + n) % n;

export class MotionStage {
  /**
   * @param {object} opts
   * @param {object} opts.params       from motionParams()
   * @param {object} opts.panel        its ParamPanel, docked
   * @param {HTMLCanvasElement} opts.canvas  the viewer's canvas, shared
   * @param {object} opts.bar          core/Bar.js
   * @param {string[]} opts.legacy     the nine shipped dataset ids
   * @param {(action: () => Promise<?string>) => void} opts.run  the app's busy guard
   * @param {() => boolean} opts.busy
   */
  constructor({ params, panel, canvas, bar, legacy, run, busy }) {
    this.params = params;
    this.panel = panel;
    this.canvas = canvas;
    this.bar = bar;
    this.legacy = legacy;

    this.active = false;
    this.data = [];
    this.local = null;        // a session set with no vault behind it: drawable, not recordable
    this.anchors = new Float64Array(0);
    this.mark = null;
    this.frame = null;
    this.pending = false;
    this.loads = { data: 0, mark: 0 };   // newest request wins; older ones land nowhere

    // Smooth: while it plays, the preview is drawn at the screen's rate and
    // between the loop's frames (`at`), so a turn turns and does not step.
    // A save, a step and a pause all use the whole tick.
    this.at = 0;
    let shown = null;             // the player's count moves with whole ticks only
    this.clock = new Playhead({
      smooth: true,
      onShow: (tick, at) => {
        if (tick !== shown || !this.clock.playing) this.transport.show(shown = tick);
        this.at = at;
        // Playing, this is already an animation frame: paint in it, not the next.
        if (this.clock.playing) { if (this.active) this.paint(); }
        else this.draw();
      },
      onState: () => {
        this.transport.state();
        // A paused loop paints nothing, so the rate would sit on its last value.
        if (!this.clock.playing) { this.painted = null; this.bar.rate(null); }
      },
    });
    this.buildDrawers(run, busy);
    params.on(key => this.changed(key));

    // The preview is drawn at the size the viewer shows it; when that changes,
    // so does the canvas.
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      new ResizeObserver(() => { this.reframe(); this.draw(); }).observe(canvas.parentElement);
    }
  }

  /** The things in the motion panel that are not parameters. */
  buildDrawers(run, busy) {
    this.session = new Session({ mount: this.panel.drawer('sets').body, onPick: item => this.pickSession(item) });

    const holder = document.createElement('div');
    this.panel.drawer('player').body.prepend(holder);
    this.transport = new Transport({ clock: this.clock, mount: holder, busy });

    const exp = this.panel.addDrawer({ id: 'export', title: 'Export', before: 'ground' });
    const actions = document.createElement('div');
    actions.className = 'pp-actions';
    actions.append(
      button('Save this frame  [S]', () => run(() => this.saveStill()), true),
      button('Save the loop', () => run(() => this.saveLoop(false))),
      button('Save the loop + frames zip', () => run(() => this.saveLoop(true))),
      button('Emit a brush family', () => run(() => this.emit())),
    );
    exp.body.append(actions);
    // A print of the frame on screen, drawn again at the sheet's size a window at a time (core/PrintPanel.js).
    // A set held only in memory has no recipe to draw again: nothing to print until it is saved.
    this.printing = new PrintPanel({
      mount: exp.body, app: 'ckt', leave: run, say: text => this.bar.say(text), format: this.params.get('format'),
      tick: () => this.clock.tick,
      object: () => {
        if (!this.anchors.length || this.leaf) return null;
        const recipe = { ...this.params.values, tick: Math.round(this.clock.tick) };
        const f = framing(recipe, this.anchors, this.mark);
        return { type: 'still', origin: APP, recipe, render: { w: f.width, h: f.height } };
      },
    });
  }

  async init() {
    await this.loadData();
    this.loadAnchors();
    await this.loadMark();
    this.configureClock();
    this.reframe();
    this.markSession();
  }

  async changed(key) {
    // No content passed: a derived format must never rewrite the window, which
    // is what the attractor's paths are measured against.
    applyFrameEdit(this.params, key);
    if (key === 'format' && this.printing) this.printing.follow(this.params.get('format'));
    if (key === 'made' && this.params.get('made')) this.local = null;
    // A legacy chip means that set: whatever made set was drawn, it is not now.
    if (key === 'dataset' && this.params.get('made')) this.params.set('made', null);
    if (key === 'dataset' && this.local) this.local = null;
    if (DATA.has(key)) await this.loadData();
    if (ANCHOR.has(key)) this.loadAnchors();
    if (MARK.has(key)) await this.loadMark();
    if (CLOCK.has(key)) this.configureClock();
    if (DATA.has(key)) this.markSession();
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
      this.bar.announce('that dot-set would not load: ' + err.message);
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
    const frames = loopFrames(r);
    this.clock.configure({ length: frames, fps: r.fps, loop: true });
    this.transport.configure();
    this.panel.drawer('player').note(`${frames} frames · ${(frames / Math.max(1, r.fps)).toFixed(1)} s`);
    this.panel.drawer('rotation').note(`a loop is ${frames} frames`);
    if (was) this.clock.play();
  }

  /**
   * Two framings: `full`, what a save makes, and `frame`, the preview — the
   * same picture drawn at the size the viewer shows it, never larger than the
   * output. Live at screen size, full resolution only on export.
   */
  reframe() {
    const r = this.params.values;
    this.full = framing(r, this.anchors, this.mark);
    const view = this.viewFactor(this.full);
    this.frame = view < 1 ? framing(r, this.anchors, this.mark, view) : this.full;
    if (this.active) this.showOutput();
  }

  /** How much of the output the viewer can show, in device pixels — in steps, so a resize does not churn. */
  viewFactor(full) {
    const box = this.canvas.parentElement;
    if (!box || typeof getComputedStyle === 'undefined') return 1;
    const cs = getComputedStyle(box);
    const w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (!(w > 0) || !(h > 0)) return 1;
    const dpr = window.devicePixelRatio || 1;
    const fit = Math.min(1, (w * dpr) / full.width, (h * dpr) / full.height);
    return Math.min(1, Math.ceil(fit * 20) / 20);
  }

  /** The bar's size readout: what a save makes, not the preview. */
  showOutput() {
    if (!this.full) return;
    const r = this.params.values;
    this.bar.output({ width: this.full.width, height: this.full.height, scale: this.full.scale, format: r.format });
  }

  // ── Dot-sets ──────────────────────────────────────────────────────────────

  /** A set from stage one: into this session's list, and drawn. */
  adopt(made) {
    const entry = this.session.add({
      id: made.object ? made.object.id : null, title: made.title, data: made.data, thumb: made.thumb,
    });
    if (entry.id) remember(entry.id, entry.data);
    return this.pickSession(entry);
  }

  async pickSession(item) {
    if (!item) return;
    if (item.id) {
      this.local = null;
      if (this.params.get('made') === item.id) { this.markSession(); return; }
      this.params.set('made', item.id);
      return;
    }
    this.local = item;
    if (this.params.get('made')) this.params.set('made', null);
    await this.loadData();
    this.loadAnchors();
    this.reframe();
    this.markSession();
    this.draw();
  }

  /** Highlight what is drawn in the session list; a legacy set lights nothing there. */
  markSession() {
    const r = this.params.values;
    this.session.select(this.local ? this.local.key : (r.made || 'legacy:' + r.dataset));
    const n = this.session.items.length;
    this.panel.drawer('sets').note(n ? `${n} made` : '');
  }

  /** ← → : the next set, this session's first, then the legacy nine, round and round. */
  stepSet(by) {
    const order = setOrder(this.session, this.legacy);
    if (!order.length) return;
    const r = this.params.values;
    const current = this.local ? this.local.key : (r.made || 'legacy:' + r.dataset);
    const next = order[wrap(Math.max(0, order.indexOf(current)) + by, order.length)];
    if (next.startsWith('legacy:')) {
      this.local = null;
      this.params.set({ made: null, dataset: next.slice('legacy:'.length) });
      this.markSession();
    } else {
      this.pickSession(this.session.find(next));
    }
  }

  /** ↑ ↓ : v2's arrows — the next or previous glyph, round at either end. */
  step(by) {
    const n = Math.max(1, this.data.length);
    this.params.set('glyph', wrap(this.params.get('glyph') + by, n));
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  draw() {
    if (!this.active || this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => { this.pending = false; this.paint(); });
  }

  paint() {
    const recipe = this.params.values;
    const tick = this.clock.playing ? this.at : this.clock.tick;
    const out = renderFrame({
      recipe, anchors: this.anchors, mark: this.mark, tick, frame: this.frame,
      into: this.canvas, draft: true,
    });

    this.countFrame();

    const n = this.data.length;
    const glyph = n ? wrap(recipe.glyph, n) : 0;
    const from = this.local ? this.local.title : recipe.made ? 'made' : recipe.dataset;
    const missing = recipe.mark === 'sprite' && !this.mark ? ' · sprite missing, drawing dots' : '';
    this.bar.say(`${from} · glyph ${glyph + 1}/${n} · ${this.anchors.length / 2} dots`
      + ` · ${out.drawn} drawn${missing}`);
  }

  /**
   * The paint rate, measured: frames painted in the last second while the
   * loop plays, shown in the bar — so a slowdown is a number, on the machine
   * that has it, and not an impression.
   */
  countFrame() {
    const now = performance.now();
    if (!this.clock.playing) { this.painted = null; this.bar.rate(null); return; }
    if (!this.painted) this.painted = { since: now, n: 0 };
    this.painted.n++;
    const span = now - this.painted.since;
    if (span >= 1000) {
      this.bar.rate((this.painted.n * 1000) / span);
      this.painted = { since: now, n: 0 };
    }
  }

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

  /** A set held only in memory cannot be named by a recipe: saves from it are leaves. */
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
      params: this.params, anchors: this.anchors, mark: this.mark, frame: this.full,
      tick: this.clock.tick, keepFrames, leaf: this.leaf, onStatus: t => this.bar.say(t),
    });
    return object ? `saved ${object.id} — one turn, ${frames} frames` : `no vault — ${frames} frames downloaded`;
  }

  async emit() {
    this.clock.pause();
    const r = this.params.values;
    const from = this.local ? 'made' : r.made ? 'made' : r.dataset;
    const name = `${from}_${r.mark === 'dot' ? 'dots' : r.family + r.sprite}`;
    const { set, members } = await emitFamily({
      params: this.params, data: this.data, mark: this.mark, tick: this.clock.tick,
      name, leaf: this.leaf, onStatus: t => this.bar.say(t),
    });
    return set ? `emitted ${set.id} — ${members} brushes; the gamepad lists it as a family`
               : `no vault — ${members} brushes downloaded as ${name}.zip`;
  }
}

function button(label, onClick, primary = false) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nb-btn nb-btn--wide' + (primary ? ' nb-btn--primary' : '');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
