/**
 * ParamPanel.js
 * Gamepad-navigable parameter panel, opened with Start.
 *
 * Laid out as a carousel: each section in SECTIONS below is an independent
 * column, the active one sits centred at full size and opacity, and its
 * neighbours sit back a little on either side. Adding a control means adding
 * one entry to SECTIONS — nothing indexes rows by hand.
 *
 * L1 / R1          → previous / next column
 * D-pad Up/Down    → select a row inside the active column
 * D-pad Left/Right → adjust. On toggles, ← is off and → is on rather than
 *                    both flipping, so auto-repeat cannot stutter the state.
 * A                → run an action row, or flip Record
 *
 * Recording lives here because it belongs to the brush: you arm it, draw, and
 * disarm. What happens to the recording afterwards — playing it, stacking it,
 * filtering it — belongs to the timeline, which is where those controls went.
 * Start / B        → close
 */

import { InputManager, MODE } from '../core/inputManager.js';
import { params }             from '../sketch/gamepadSketch.js';
import { PATTERNS, PATTERN_LABELS } from '../core/joyImage.js';
import { SequenceRecorder }   from '../../../core/stage/recorder.js';

/** Numeric controls, keyed by the field they drive on `params`. */
const SLIDERS = {
  moveSpeed:   { label: 'Move Speed',   icon: '⚡',  min: 1,     max: 50,   step: 1,     format: v => `${v} px/f` },
  rotateSpeed: { label: 'Rotate Speed', icon: '↻',  min: 0.005, max: 0.2,  step: 0.005, format: v => v.toFixed(3) },
  scaleSpeed:  { label: 'Scale Speed',  icon: '⤢',  min: 0.001, max: 0.05, step: 0.001, format: v => v.toFixed(3) },
  refOpacity:  { label: 'Ref Opacity',  icon: '👁️', min: 0,     max: 1,    step: 0.1,   format: v => `${Math.round(v * 100)}%` },
};

/**
 * The panel, top to bottom. A section with no label renders as a bare row
 * with no heading above it.
 */
const SECTIONS = [
  { label: 'Canvas', rows: [
    { kind: 'action', key: 'clearCanvas', label: 'Clear Canvas', icon: '⌫', color: '#ff2079' },
  ]},

  { label: 'Brush', rows: [
    { kind: 'slider', key: 'moveSpeed' },
    { kind: 'slider', key: 'rotateSpeed' },
    { kind: 'slider', key: 'scaleSpeed' },
  ]},

  { label: 'Reference', rows: [
    { kind: 'action', key: 'loadReference', label: 'Load Reference', icon: '🖼️', color: '#00f5ff' },
    { kind: 'slider', key: 'refOpacity' },
  ]},

  { label: 'Pattern', rows: [
    { kind: 'pattern' },
  ]},

  // Arming the recorder only. A finished recording becomes a layer on the
  // timeline by itself, and everything you would then do to it lives there.
  { label: 'Sequences', id: 'sequences', rows: [
    { kind: 'record' },
  ]},
];

/**
 * Column the panel opens on. Deliberately not Canvas — landing with A poised
 * over Clear Canvas is a bad way to greet someone.
 */
const DEFAULT_COLUMN = 1;

/** How many recorded sequences to list before collapsing into a count. */
const MAX_LISTED_SEQUENCES = 4;

export class ParamPanel {
  constructor() {
    this._el        = null;
    this._columns   = [];    // [{ label, rows, el }] — L1/R1 move between these
    this._rows      = [];    // every row, flat, each tagged with .col and .idx
    this._activeCol = DEFAULT_COLUMN;
    this._activeRow = 0;     // index *within* the active column
    this._visible   = false;

    this._patternIndex     = 0;
    this._renderedSeqCount = -1;   // forces the sequence list to build once


    this._build();
    this._wireEvents();
    this._refresh();
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  show(patternIndex = 0) {
    this._patternIndex = patternIndex;
    this._visible = true;
    this._el.classList.add('hud-panel--visible');
    this._refresh();
    InputManager.setMode(MODE.PARAM_PANEL);
  }

  hide() {
    this._visible = false;
    this._el.classList.remove('hud-panel--visible');
    InputManager.setMode(MODE.DRAW);
  }

  toggle(patternIndex) {
    this._visible ? this.hide() : this.show(patternIndex);
  }

  // ── Build DOM ────────────────────────────────────────────────────────────────

  _build() {
    this._el = document.createElement('div');
    this._el.className = 'hud-panel hud-panel--param';
    this._el.setAttribute('aria-label', 'Parameters');
    this._el.innerHTML = `
      <div class="param-head">
        <span class="hud-hint">Start</span>
        <span class="hud-panel__title">PARAMETERS</span>
        <span class="hud-hint">B = close</span>
      </div>
      <div class="param-carousel">
        <div class="param-track" id="pp-track"></div>
      </div>
      <div class="param-foot">
        <span class="hud-hint hud-hint--dpad">L1 R1 section &nbsp;·&nbsp; ⬆⬇ select &nbsp;·&nbsp; ⬅➡ adjust</span>
      </div>
      <input type="file" id="pp-file-input" accept="image/*" style="display:none" />
    `;

    this._track = this._el.querySelector('#pp-track');

    SECTIONS.forEach((section, colIndex) => {
      const col = document.createElement('div');
      col.className = 'param-column';

      const title = document.createElement('div');
      title.className = 'param-column__title';
      title.textContent = section.label;
      col.appendChild(title);

      // Clicking anywhere in an off-centre column brings it to the middle,
      // so the mouse can drive the carousel as well as L1/R1.
      col.addEventListener('click', () => {
        if (this._activeCol !== colIndex) {
          this._activeCol = colIndex;
          this._activeRow = 0;
          this._refresh();
        }
      });

      const rows = section.rows.map((def, rowIndex) => {
        const row = { ...def, col: colIndex, idx: rowIndex };
        row.el = this._makeRow(row);
        row.el.addEventListener('click', () => this._onRowClick(colIndex, rowIndex));
        col.appendChild(row.el);
        this._rows.push(row);
        return row;
      });

      // Sequence readout — display only, so not a navigable row.
      if (section.id === 'sequences') {
        this._seqStatus = document.createElement('div');
        this._seqStatus.className = 'param-seq-status';
        this._seqStatus.textContent = 'No sequences yet';
        this._seqList = document.createElement('ul');
        this._seqList.className = 'param-seq-list';
        col.append(this._seqStatus, this._seqList);
      }

      this._track.appendChild(col);
      this._columns.push({ label: section.label, rows, el: col });
    });

    this._fileInput = this._el.querySelector('#pp-file-input');
    this._fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      document.dispatchEvent(new CustomEvent('parampanel:referenceLoaded', { detail: { url } }));
      e.target.value = '';   // so the same file can be picked again
    });

    document.body.appendChild(this._el);
  }

  /** Build the element for one row, stashing whatever _refresh will update. */
  _makeRow(row) {
    const el = document.createElement('div');

    switch (row.kind) {
      case 'action': {
        el.className = 'param-row param-action-row';
        el.style.setProperty('--action-color', row.color);
        el.innerHTML = `
          <span class="param-row__icon"  style="color:${row.color}">${row.icon}</span>
          <span class="param-row__label" style="color:${row.color}">${row.label}</span>
          <span class="param-row__value" style="color:${row.color};font-size:10px">A = confirm</span>
        `;
        return el;
      }

      case 'slider': {
        const def = SLIDERS[row.key];
        el.className = 'param-row';
        el.innerHTML = `
          <span class="param-row__icon">${def.icon}</span>
          <span class="param-row__label">${def.label}</span>
          <div class="param-row__bar-wrap"><div class="param-row__bar"></div></div>
          <span class="param-row__value">—</span>
        `;
        row.bar = el.querySelector('.param-row__bar');
        row.val = el.querySelector('.param-row__value');
        return el;
      }

      case 'pattern': {
        el.className = 'param-pattern-row';
        el.innerHTML = `
          <span class="param-row__icon">◈</span>
          <span class="param-row__label">Mode</span>
          <div class="param-pattern-options"></div>
        `;
        const wrap = el.querySelector('.param-pattern-options');
        row.buttons = PATTERNS.map((p, i) => {
          const btn = document.createElement('button');
          btn.className = 'pattern-btn';
          btn.innerHTML = PATTERN_LABELS[p];
          btn.addEventListener('click', e => {
            e.stopPropagation();
            this._activeCol = row.col;
            this._activeRow = row.idx;
            this._patternIndex = i;
            this._applyPattern();
            this._refresh();
          });
          wrap.appendChild(btn);
          return btn;
        });
        return el;
      }

      case 'record': {
        el.className = 'param-row param-sequence-row';
        el.innerHTML = `
          <span class="param-row__icon">⏺</span>
          <span class="param-row__label">Record Sequence</span>
          <span class="param-seq-switch">OFF</span>
        `;
        row.icon   = el.querySelector('.param-row__icon');
        row.switch = el.querySelector('.param-seq-switch');
        return el;
      }

      default: {
        el.className = 'param-row';
        el.innerHTML = `<span class="param-row__label">${row.kind}</span>`;
        return el;
      }
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────────

  _wireEvents() {
    InputManager.on('panelNav', ({ panel, dir }) => {
      if (panel !== 'param' || !this._visible) return;
      this._navigate(dir);
    });

    InputManager.on('closePanel', ({ panel }) => {
      if (panel !== 'param' && !this._visible) return;
      this.hide();
    });

    InputManager.on('panelConfirm', ({ panel }) => {
      if (panel !== 'param' || !this._visible) return;
      this._confirm();
      this._refresh();
    });

    InputManager.on('panelSection', ({ panel, dir }) => {
      if (panel !== 'param' || !this._visible) return;
      this._activeCol = _wrap(this._activeCol + dir, this._columns.length);
      this._activeRow = 0;
      this._refresh();
    });

    document.addEventListener('ui:toggleParamPanel', () => {
      import('../sketch/gamepadSketch.js').then(m => this.toggle(m.patternIndex));
    });

    // Reflect pattern changes from the sketch (gamepad shortcut R3)
    document.addEventListener('sketch:patternChanged', e => {
      this._patternIndex = e.detail.patternIndex;
      this._refresh();
    });

    // Recorder state. 'sequence:captured' can fire once per frame while
    // painting, so only touch the DOM when the panel is actually on screen.
    for (const name of ['sequence:started', 'sequence:captured', 'sequence:stopped',
                        'sequence:discarded', 'sequence:removed', 'sequence:cleared']) {
      document.addEventListener(name, () => {
        if (this._visible) this._refreshSequence();
      });
    }

  }

  _onRowClick(colIndex, rowIndex) {
    // A click inside an off-centre column only brings it to the middle; you
    // have to be looking at a column before you can fire anything in it.
    const wasActive = this._activeCol === colIndex;
    this._activeCol = colIndex;
    this._activeRow = rowIndex;

    // Sliders and the pattern row carry their own affordances; clicking the
    // row body should only move the selection.
    const kind = this._columns[colIndex].rows[rowIndex].kind;
    if (wasActive && kind !== 'slider' && kind !== 'pattern') this._confirm();

    this._refresh();
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  /** The row the cursor is on: active row of the active column. */
  get _current() {
    return this._columns[this._activeCol].rows[this._activeRow];
  }

  _navigate(dir) {
    const n = this._columns[this._activeCol].rows.length;
    switch (dir) {
      case 'up':    this._activeRow = _wrap(this._activeRow - 1, n); break;
      case 'down':  this._activeRow = _wrap(this._activeRow + 1, n); break;
      case 'left':  this._adjust(-1); break;
      case 'right': this._adjust(1);  break;
    }
    this._refresh();
  }

  /** A, or a click on a row with no inline control of its own. */
  _confirm() {
    const row = this._current;
    switch (row.kind) {
      case 'action': return this._executeAction(row.key);
      case 'record': return this._toggleSequence();
    }
  }

  _adjust(dir) {
    const row = this._current;

    switch (row.kind) {
      case 'slider': {
        const def    = SLIDERS[row.key];
        const newVal = Math.min(def.max, Math.max(def.min, params[row.key] + dir * def.step));
        params[row.key] = Math.round(newVal / def.step) * def.step;
        return;
      }

      case 'pattern':
        this._patternIndex = _wrap(this._patternIndex + dir, PATTERNS.length);
        return this._applyPattern();

      // A toggle: direction sets the state rather than flipping it, so D-pad
      // auto-repeat cannot switch it several times a second.
      case 'record':
        if ((dir > 0) !== SequenceRecorder.recording) this._toggleSequence();
        return;
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  _executeAction(key) {
    if (key === 'clearCanvas')        document.dispatchEvent(new CustomEvent('parampanel:clearCanvas'));
    else if (key === 'loadReference') this._fileInput.click();
  }

  _applyPattern() {
    document.dispatchEvent(new CustomEvent('parampanel:patternChange', {
      detail: { patternIndex: this._patternIndex },
    }));
  }

  /**
   * The sketch owns the recorder, because a sequence stores the canvas size it
   * was made at. It answers with the 'sequence:*' events this panel reads.
   */
  _toggleSequence() {
    document.dispatchEvent(new CustomEvent('parampanel:toggleSequence'));
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  _refresh() {
    this._columns.forEach((col, i) => {
      col.el.classList.toggle('param-column--active', i === this._activeCol);
    });
    // The track slides by whole columns; the CSS does the centring.
    this._track.style.setProperty('--active', this._activeCol);

    this._rows.forEach(row => {
      row.el.classList.toggle('param-row--active',
        row.col === this._activeCol && row.idx === this._activeRow);

      if (row.kind === 'slider') {
        const def = SLIDERS[row.key];
        const pct = ((params[row.key] - def.min) / (def.max - def.min)) * 100;
        row.bar.style.width = `${Math.max(2, pct)}%`;
        row.val.textContent = def.format(params[row.key]);
      } else if (row.kind === 'pattern') {
        row.buttons.forEach((btn, b) =>
          btn.classList.toggle('pattern-btn--active', b === this._patternIndex));
      }
    });

    this._refreshSequence();
  }

  // ── Sequences area ───────────────────────────────────────────────────────────

  _refreshSequence() {
    const recording = SequenceRecorder.recording;
    const stored    = SequenceRecorder.count;

    const rec = this._rows.find(r => r.kind === 'record');
    rec.el.classList.toggle('param-sequence-row--armed', recording);
    rec.switch.textContent = recording ? 'ON' : 'OFF';

    // Status line
    if (recording) {
      const n = SequenceRecorder.liveCount;
      this._seqStatus.textContent = `● REC · ${n} ${n === 1 ? 'mark' : 'marks'}`;
    } else if (stored === 0) {
      this._seqStatus.textContent = 'No sequences yet';
    } else {
      this._seqStatus.textContent = `${stored} sequence${stored !== 1 ? 's' : ''}`;
    }
    this._seqStatus.classList.toggle('param-seq-status--rec', recording);

    // The list only changes when a sequence lands, not on every mark.
    if (this._renderedSeqCount !== stored) {
      this._renderedSeqCount = stored;
      this._renderSequenceList();
    }
  }

  _renderSequenceList() {
    const all    = SequenceRecorder.all;
    const shown  = all.slice(-MAX_LISTED_SEQUENCES);
    const hidden = all.length - shown.length;

    this._seqList.innerHTML = '';

    shown.forEach((seq, i) => {
      const li = document.createElement('li');
      li.className = 'param-seq-item';
      li.innerHTML = `
        <span class="param-seq-item__n"></span>
        <span class="param-seq-item__marks"></span>
        <span class="param-seq-item__dur"></span>
      `;
      li.querySelector('.param-seq-item__n').textContent     = `#${hidden + i + 1}`;
      li.querySelector('.param-seq-item__marks').textContent = `${seq.events.length} marks`;
      li.querySelector('.param-seq-item__dur').textContent   = _clock(SequenceRecorder.durationOf(seq));
      this._seqList.appendChild(li);
    });

    if (hidden > 0) {
      const li = document.createElement('li');
      li.className = 'param-seq-item param-seq-item--more';
      li.textContent = `+${hidden} earlier`;
      this._seqList.appendChild(li);
    }
  }
}

function _wrap(val, len) {
  return ((val % len) + len) % len;
}

/** ms → m:ss */
function _clock(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
