/**
 * TimelinePanel.js
 * The stage as a stack of layers, with a drawer of parameters under each.
 *
 * Mouse-driven, unlike the gamepad panels: reordering by dragging and reaching
 * straight for one layer's filter are pointer gestures, and forcing them onto a
 * D-pad would make both worse. The brush keeps working while this is open, so
 * the timeline never takes the input mode.
 *
 * TOP ROW IS THE TOP LAYER
 * ──────────────────────────────────────────────────────────────────────────────
 * `stage.layers` is in draw order, so index 0 is painted first and ends up at
 * the *bottom*. Every editing timeline shows the opposite, so the rows here are
 * reversed and `_stageIndex` is the only place that conversion lives.
 *
 * Reading the stage rather than mirroring it: the layer objects are the state,
 * and this panel edits them through the sketch's exported helpers. There is no
 * second copy of the settings to drift out of step.
 */

import {
  getStage, getTransport, isStageActive,
  dropLayer, moveLayer, reshapeLayer, setLayerSpeed, setLayerPhase, setLayerDensity,
  playStage, pauseStage, stopStage, setViewInset,
} from '../sketch/gamepadSketch.js';

import { WINDOW_RULES, RULE_NAMES, BAND_STEPS, bandWidth } from '../../../core/stage/clip.js';
import { FILTER_PRESETS, BLEND_MODES, layerScale } from '../../../core/stage/stage.js';
import { SPEED_MULTIPLIERS, tickRateAt } from '../../../core/stage/transport.js';
import { SequenceRecorder } from '../../../core/stage/recorder.js';
import { exportLayerToVault } from '../core/exportSequence.js';

/** Phase steps offered, as fractions of a loop. */
const PHASE_STEPS = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];

/**
 * Buffer pixels per sequence pixel. Discrete rather than a slider because each
 * change rebuilds the buffer, and dragging a range would rebuild it at every
 * step on the way. The cost is quadratic, so the drawer prints the resulting
 * size beside each option.
 */
const DENSITY_STEPS = [0.25, 0.5, 1, 1.5, 2, 3, 4];

const DEG = 180 / Math.PI;
const mb  = bytes => `${(bytes / 1048576).toFixed(1)} MB`;

export class TimelinePanel {
  constructor() {
    this._el       = null;
    this._rowsEl   = null;
    this._visible  = false;
    this._expanded = new Set();   // layer objects whose drawer is open
    this._dragFrom = null;        // UI row index being dragged
    this._fills    = new Map();   // layer → its playhead element
    this._samples  = new Map();   // layer → its sampling readout element
    this._raf      = 0;
    this._lastCount = 0;

    this._build();
    this._wire();
    this.refresh();

    // The page is fitted above whatever height this stands at (viewFit.js),
    // and a row's drawer opening changes that height.
    new ResizeObserver(() => this._inset()).observe(this._el);
  }

  _inset() { setViewInset(this._visible ? this._el.offsetHeight : 0); }

  // ── Public ──────────────────────────────────────────────────────────────────

  show() {
    this._visible = true;
    this._el.classList.add('tl--visible');
    document.body.classList.add('tl-open');   // the status strip steps aside
    this.refresh();
    this._inset();
    this._startTicking();
  }

  hide() {
    this._visible = false;
    this._el.classList.remove('tl--visible');
    document.body.classList.remove('tl-open');
    this._inset();
    this._stopTicking();
  }
  toggle() { this._visible ? this.hide() : this.show(); }

  /** Rebuild the rows from the stage. Cheap enough: a handful of layers. */
  refresh() {
    const stage = getStage();
    if (!stage) return;

    this._renderTransport();
    this._rowsEl.innerHTML = '';
    this._fills.clear();
    this._samples.clear();

    if (stage.layers.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tl-empty';
      empty.textContent = SequenceRecorder.count === 0
        ? 'Record a sequence and it lands here as a layer.'
        : 'No layers on the stage.';
      this._rowsEl.appendChild(empty);
      return;
    }

    // Reversed: the top row is the top layer.
    [...stage.layers].reverse().forEach((layer, uiIndex) => {
      this._rowsEl.appendChild(this._makeRow(layer, uiIndex));
    });
  }

  // ── Build ───────────────────────────────────────────────────────────────────

  _build() {
    this._el = document.createElement('section');
    this._el.className = 'tl';
    this._el.innerHTML = `
      <header class="tl-head">
        <div class="tl-transport">
          <button class="tl-btn tl-btn--play"  id="tl-play"  type="button" title="Play / Pause">▶</button>
          <button class="tl-btn tl-btn--stop"  id="tl-stop"  type="button" title="Stop and return to the canvas">■</button>
        </div>
        <div class="tl-clock" id="tl-clock">—</div>
        <div class="tl-title">Timeline</div>
        <div class="tl-warn" id="tl-warn"></div>
        <button class="tl-btn tl-btn--close" id="tl-close" type="button" title="Close (T)">✕</button>
      </header>
      <div class="tl-rows" id="tl-rows"></div>
      <footer class="tl-foot">
        <span class="tl-hint">⠿ drag to restack · ◉ solo (⇧ adds) · ▸ parameters · T closes</span>
      </footer>
    `;
    this._rowsEl = this._el.querySelector('#tl-rows');
    this._clock  = this._el.querySelector('#tl-clock');
    this._warn   = this._el.querySelector('#tl-warn');
    this._playBtn = this._el.querySelector('#tl-play');

    this._el.querySelector('#tl-play').addEventListener('click', () => {
      const tr = getTransport();
      if (tr?.playing) pauseStage(); else playStage();
    });
    this._el.querySelector('#tl-stop').addEventListener('click', () => stopStage());
    this._el.querySelector('#tl-close').addEventListener('click', () => this.hide());

    document.body.appendChild(this._el);
  }

  _wire() {
    // The stage is the authority; every change to it comes back through here.
    document.addEventListener('stage:changed', e => {
      const count = e.detail.layerCount;
      // The first layer of a session opens the timeline by itself — you have
      // just made something and this is where it now lives.
      if (count > 0 && this._lastCount === 0 && !this._visible) this.show();
      this._lastCount = count;

      this._warn.textContent = e.detail.missingFamilies.length
        ? `⚠ not loaded: ${e.detail.missingFamilies.join(', ')}`
        : '';
      this.refresh();
      if (this._visible) this._startTicking();
    });

    document.addEventListener('ui:toggleTimeline', () => this.toggle());
  }

  // ── Rows ────────────────────────────────────────────────────────────────────

  /** UI row index → index into stage.layers, which runs the other way. */
  _stageIndex(uiIndex) {
    return getStage().layers.length - 1 - uiIndex;
  }

  _makeRow(layer, uiIndex) {
    const row = document.createElement('div');
    row.className = 'tl-row';
    if (this._expanded.has(layer)) row.classList.add('tl-row--open');
    if (layer.solo) row.classList.add('tl-row--solo');
    if (!layer.visible) row.classList.add('tl-row--hidden');

    const seq    = layer.player.clip?.sequence;
    const marks  = seq?.events.length ?? 0;
    const length = layer.player.length;
    const secs   = (length / (layer.rate.ratio * getTransport().rate)).toFixed(1);

    row.innerHTML = `
      <div class="tl-strip">
        <span class="tl-grip" draggable="true" title="Drag to restack">⠿</span>
        <button class="tl-eye"  type="button" title="Show / hide">${layer.visible ? '◉' : '○'}</button>
        <button class="tl-solo" type="button" title="Show this one only (⇧ to add)">S</button>
        <span class="tl-name">${layer.name}</span>
        <span class="tl-meta">${marks} marks · ${length}t · ${secs}s</span>
        <div class="tl-track"><div class="tl-fill"></div></div>
        <button class="tl-chev"   type="button" title="Parameters">▸</button>
        <button class="tl-export" type="button" title="Export to the vault (⇧ also downloads the frames)">⤓</button>
        <button class="tl-trash"  type="button" title="Delete layer">✕</button>
      </div>
    `;

    row.querySelector('.tl-eye').addEventListener('click', () => {
      layer.visible = !layer.visible;
      this.refresh();
    });

    row.querySelector('.tl-solo').addEventListener('click', e => {
      const stage = getStage();
      if (e.shiftKey) {
        layer.solo = !layer.solo;                 // additive: build a subset
      } else {
        // "This one only": already the sole soloed layer, so the click means
        // put everything back rather than solo it a second time.
        const only = layer.solo && stage.layers.every(l => l === layer || !l.solo);
        for (const l of stage.layers) l.solo = false;
        layer.solo = !only;
      }
      this.refresh();
    });

    row.querySelector('.tl-export').addEventListener('click', async e => {
      const btn = e.currentTarget;
      if (btn.disabled) return;
      btn.disabled = true;
      btn.dataset.busy = '1';

      // Ticks per second as the transport is actually running this layer, so
      // the exported frame rate matches what is on screen.
      const fps = Math.max(1, Math.round(layer.rate.ratio * getTransport().rate));
      try {
        const { object, frames } = await exportLayerToVault(layer, {
          fps,
          keepFrames: e.shiftKey,
          onProgress: (done, total) => { btn.textContent = Math.round((done / total) * 100) + '%'; },
        });
        btn.textContent = object ? '✓' : '⤓';
        console.log('[export]', frames, 'frames', object ? '→ ' + object.id : '→ downloaded (no vault)');
      } catch (err) {
        btn.textContent = '!';
        console.error('[export] failed:', err);
      } finally {
        setTimeout(() => {
          btn.textContent = '⤓';
          delete btn.dataset.busy;
          btn.disabled = false;
        }, 1600);
      }
    });

    row.querySelector('.tl-chev').addEventListener('click', () => {
      if (this._expanded.has(layer)) this._expanded.delete(layer);
      else                           this._expanded.add(layer);
      this.refresh();
    });

    row.querySelector('.tl-trash').addEventListener('click', () => {
      this._expanded.delete(layer);
      dropLayer(layer);
    });

    this._wireDrag(row, uiIndex);

    // Kept here rather than on the layer: that object is the record the stage
    // and the transport share, and view state has no business in it.
    this._fills.set(layer, row.querySelector('.tl-fill'));

    if (this._expanded.has(layer)) row.appendChild(this._makeDrawer(layer));
    return row;
  }

  _wireDrag(row, uiIndex) {
    row.querySelector('.tl-grip').addEventListener('dragstart', e => {
      this._dragFrom = uiIndex;
      e.dataTransfer.effectAllowed = 'move';
      // Firefox will not start a drag without payload, even an unused one.
      e.dataTransfer.setData('text/plain', String(uiIndex));
      row.classList.add('tl-row--dragging');
    });

    row.querySelector('.tl-grip').addEventListener('dragend', () => {
      this._dragFrom = null;
      this.refresh();
    });

    row.addEventListener('dragover', e => {
      if (this._dragFrom === null || this._dragFrom === uiIndex) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      row.classList.add(this._dragFrom > uiIndex ? 'tl-row--over-top' : 'tl-row--over-bottom');
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('tl-row--over-top', 'tl-row--over-bottom');
    });

    row.addEventListener('drop', e => {
      e.preventDefault();
      row.classList.remove('tl-row--over-top', 'tl-row--over-bottom');
      if (this._dragFrom === null || this._dragFrom === uiIndex) return;
      moveLayer(this._stageIndex(this._dragFrom), this._stageIndex(uiIndex));
      this._dragFrom = null;
    });
  }

  // ── Drawer ──────────────────────────────────────────────────────────────────

  _makeDrawer(layer) {
    const clip    = layer.player.clip;
    const lo      = layer.layout;
    const isSlide = clip.window.rule === 'slide';
    const marks   = clip.sequence.events.length;

    const drawer = document.createElement('div');
    drawer.className = 'tl-drawer';

    // Twelve controls is too many to read as one list, and they answer three
    // obvious questions: when does it move, where does it sit, how does it look.
    drawer.append(
      this._group('Timing',
        this._select('Speed', SPEED_MULTIPLIERS.map((m, i) => ({
          label: `${m}x · ${tickRateAt(i)}/s`, value: String(m),
        })), String(layer.rate.ratio), v => {
          setLayerSpeed(layer, Number(v));
          this.refresh();
        }),

        this._select('Window', RULE_NAMES.map(n => ({ label: WINDOW_RULES[n].label, value: n })),
          clip.window.rule, v => {
            reshapeLayer(layer, { rule: v });
            this.refresh();
          }),

        this._range('Band', 1, BAND_STEPS, 1, clip.window.widthSteps,
          v => {
            reshapeLayer(layer, { widthSteps: Number(v) });
            this.refresh();
          },
          // Only 'slide' reads the band width, so anywhere else it is inert
          // rather than hidden — the value is still worth seeing.
          { disabled: !isSlide,
            format: v => `${v}/${BAND_STEPS} · ${bandWidth(marks, { widthSteps: Number(v) })} marks` }),

        this._select('Phase', PHASE_STEPS.map(ph => ({
          label: ph === 0 ? 'in step' : `+${Math.round(ph * 100)}%`, value: String(ph),
        })), String(nearestPhase(layer.rate.phase)), v => {
          setLayerPhase(layer, Number(v));
          this.refresh();
        }),
      ),

      // Blit-time only. None of these touch the buffer, so they are free to
      // drag through and cannot clip the drawing against a buffer edge.
      this._group('Transform',
        this._range('X', -0.5, 0.5, 0.01, lo.x, v => { lo.x = Number(v); },
          { format: offsetLabel }),

        this._range('Y', -0.5, 0.5, 0.01, lo.y, v => { lo.y = Number(v); },
          { format: offsetLabel }),

        this._range('Scale', 0.1, 3, 0.05, lo.scale, v => { lo.scale = Number(v); },
          { format: v => `${Number(v).toFixed(2)}x` }),

        this._range('Rotate', -180, 180, 5, Math.round(lo.rotation * DEG),
          v => { lo.rotation = Number(v) / DEG; },
          { format: v => `${v}°` }),
      ),

      this._group('Look',
        this._select('Filter', FILTER_PRESETS.map(f => ({ label: f.label, value: f.value })),
          layer.filter, v => { layer.filter = v; }),

        this._select('Blend', BLEND_MODES.map(m => ({ label: m.label, value: m.value })),
          layer.blend, v => { layer.blend = v; }),

        this._range('Opacity', 0.1, 1, 0.05, layer.alpha,
          v => { layer.alpha = Number(v); },
          { format: v => `${Math.round(v * 100)}%` }),

        // The one control in here that rebuilds the buffer — so it is the one
        // that shows what the buffer would then weigh.
        this._select('Density', DENSITY_STEPS.map(d => ({
          label: `${d}x · ${mb(layer.player.byteSize * (d / layer.player.renderScale) ** 2)}`,
          value: String(d),
        })), String(layer.player.renderScale), v => {
          setLayerDensity(layer, Number(v));
          this.refresh();
        }),

        this._sampling(layer),
      ),
    );

    return drawer;
  }

  /**
   * How many buffer pixels land on one screen pixel, live.
   *
   * This is the readout that explains why raising Density on its own usually
   * changes nothing: at Scale 1 a layer is already drawn at about 1:1, so the
   * extra buffer pixels have nothing left to resolve. Density earns its keep
   * once Scale magnifies the buffer past 1:1 — and below 1:1 the coarseness is
   * the point. Reading the number beats guessing from the picture.
   */
  _sampling(layer) {
    const wrap = document.createElement('div');
    wrap.className = 'tl-ctl tl-ctl--readout';
    wrap.title = 'Buffer pixels per screen pixel = Density / (Scale x fit). '
               + 'Above 1 there is nothing more to resolve; below 1 the layer is magnified and softens.';
    wrap.innerHTML = '<span class="tl-ctl__label">Sampling</span>';

    const out = document.createElement('span');
    out.className = 'tl-ctl__out tl-ctl__out--wide';
    wrap.appendChild(out);

    this._samples.set(layer, out);
    this._paintSampling(layer, out);
    return wrap;
  }

  _paintSampling(layer, out) {
    const drawn = layerScale(layer, window.innerWidth, window.innerHeight);
    const n     = drawn > 0 ? layer.player.renderScale / drawn : 0;
    const text  = n < 0.95 ? `${n.toFixed(2)}x · soft`
                : n < 1.6  ? `${n.toFixed(2)}x · matched`
                           : `${n.toFixed(1)}x · past 1:1`;
    if (out.textContent !== text) {
      out.textContent = text;
      out.classList.toggle('tl-ctl__out--warn', n < 0.95);
      out.classList.toggle('tl-ctl__out--idle', n >= 1.6);
    }
  }

  _group(title, ...controls) {
    const el = document.createElement('div');
    el.className = 'tl-group';
    el.innerHTML = `<span class="tl-group__title">${title}</span>`;
    el.append(...controls);
    return el;
  }

  _select(label, options, value, onChange) {
    const wrap = document.createElement('label');
    wrap.className = 'tl-ctl';
    wrap.innerHTML = `<span class="tl-ctl__label">${label}</span>`;

    const sel = document.createElement('select');
    sel.className = 'tl-ctl__input';
    for (const o of options) {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      sel.appendChild(opt);
    }
    sel.value = value;
    sel.addEventListener('change', () => onChange(sel.value));

    wrap.appendChild(sel);
    return wrap;
  }

  _range(label, min, max, step, value, onChange, { disabled = false, format } = {}) {
    const wrap = document.createElement('label');
    wrap.className = 'tl-ctl' + (disabled ? ' tl-ctl--inert' : '');
    wrap.innerHTML = `<span class="tl-ctl__label">${label}</span>`;

    const input = document.createElement('input');
    input.type  = 'range';
    input.className = 'tl-ctl__input tl-ctl__range';
    Object.assign(input, { min, max, step, value, disabled });

    const out = document.createElement('span');
    out.className = 'tl-ctl__out';
    out.textContent = format ? format(value) : value;

    input.addEventListener('input', () => {
      out.textContent = format ? format(input.value) : input.value;
      onChange(input.value);
    });

    wrap.append(input, out);
    return wrap;
  }

  // ── Playhead ────────────────────────────────────────────────────────────────

  /**
   * Move the playheads, and nothing else.
   *
   * Its own frame loop rather than a hook into the sketch's: this only runs
   * while the panel is on screen, and it writes one transform per layer, which
   * the compositor handles without a reflow. Rebuilding rows at 60fps would
   * not be anywhere near free.
   */
  _startTicking() {
    if (this._raf) return;
    const tick = () => {
      if (!this._visible) { this._raf = 0; return; }
      {
        for (const [layer, fill] of this._fills) {
          const len = layer.player.length || 1;
          fill.style.transform = `scaleX(${layer.player.position / len})`;
        }
        // Dragging Scale, or resizing the window, both move this. Recomputing
        // it here rather than from each handler keeps one path for all of them,
        // and the write only happens when the text actually changes.
        for (const [layer, out] of this._samples) this._paintSampling(layer, out);
      }
      this._renderClock();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _stopTicking() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  _renderTransport() {
    const tr = getTransport();
    this._playBtn.textContent = tr?.playing ? '❚❚' : '▶';
    this._el.classList.toggle('tl--live', isStageActive());
    this._renderClock();
  }

  _renderClock() {
    const tr = getTransport();
    if (!tr) return;
    const secs = (tr.tick / tr.rate);
    this._clock.textContent = `${secs.toFixed(1)}s · ${tr.tick}t`;
  }
}

/** Snap a stored phase onto the ladder the drawer offers. */
function nearestPhase(phase = 0) {
  return PHASE_STEPS.reduce((best, p) =>
    Math.abs(p - phase) < Math.abs(best - phase) ? p : best, PHASE_STEPS[0]);
}

/** An X/Y offset, where dead centre is worth saying out loud. */
function offsetLabel(v) {
  const n = Math.round(Number(v) * 100);
  return n === 0 ? 'centre' : `${n > 0 ? '+' : ''}${n}%`;
}
