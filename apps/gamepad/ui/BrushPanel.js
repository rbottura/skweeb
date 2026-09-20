/**
 * BrushPanel.js
 * Gamepad-navigable brush selector HUD panel.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  ◀ FAMILY (3 / 10)  Garamond — Blue ▶                   │
 *   │  ┌────┐ ┌────┐ ┌════╗ ┌────┐ ┌────┐  ← sprite row      │
 *   │  │    │ │    │ ║ ██ ║ │    │ │    │                      │
 *   │  └────┘ └────┘ ╚════╝ └────┘ └────┘                      │
 *   │  [L1] close   [A] confirm                                │
 *   └──────────────────────────────────────────────────────────┘
 *
 * D-pad Up/Down    → navigate families
 * D-pad Left/Right → navigate sprites within family
 * A / Enter        → confirm & close
 * B / Escape       → cancel & close
 */

import * as BrushRegistry from '../core/brushRegistry.js';
import { InputManager, MODE } from '../core/inputManager.js';

const VISIBLE_SPRITES = 7; // how many sprites show at once in the row

export class BrushPanel {
  constructor() {
    this._el = null;
    this._familyRow = null;
    this._spriteRow = null;
    this._previewEl = null;
    this._familyLabel = null;
    this._spriteLabel = null;

    this._familyIndex = 0;
    this._spriteIndex = 0;
    this._visible = false;

    this._build();
    this._wireEvents();
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  show(familyIndex, spriteIndex) {
    this._familyIndex = familyIndex;
    this._spriteIndex = spriteIndex;
    this._visible = true;
    this._el.classList.add('hud-panel--visible');
    this._refresh();
    InputManager.setMode(MODE.BRUSH_PANEL);
  }

  hide() {
    this._visible = false;
    this._el.classList.remove('hud-panel--visible');
    InputManager.setMode(MODE.DRAW);
  }

  toggle(familyIndex, spriteIndex) {
    this._visible ? this.hide() : this.show(familyIndex, spriteIndex);
  }

  get familyIndex() { return this._familyIndex; }
  get spriteIndex()  { return this._spriteIndex; }

  // ── Build DOM ────────────────────────────────────────────────────────────────

  _build() {
    this._el = document.createElement('div');
    this._el.className = 'hud-panel hud-panel--brush';
    this._el.setAttribute('aria-label', 'Brush Selector');
    this._el.innerHTML = `
      <div class="hud-panel__header">
        <span class="hud-hint">L1</span>
        <span class="hud-panel__title">BRUSH</span>
        <span class="hud-hint">A = confirm</span>
      </div>

      <div class="brush-panel__family-nav">
        <button class="brush-nav-arrow" id="bp-fam-prev" aria-label="Previous family">◀</button>
        <div class="brush-panel__family-info">
          <span class="brush-panel__family-label" id="bp-fam-label">—</span>
          <span class="brush-panel__family-count" id="bp-fam-count">0 / 0</span>
        </div>
        <button class="brush-nav-arrow" id="bp-fam-next" aria-label="Next family">▶</button>
      </div>

      <div class="brush-panel__sprite-row" id="bp-sprite-row" role="listbox"></div>

      <div class="brush-panel__preview-row">
        <div class="brush-panel__preview-wrap">
          <img class="brush-panel__preview-img" id="bp-preview" alt="Brush preview" />
        </div>
        <div class="brush-panel__sprite-info">
          <span id="bp-sprite-label">—</span>
        </div>
      </div>

      <div class="hud-panel__footer">
        <span class="hud-hint hud-hint--dpad">⬆⬇ family &nbsp;·&nbsp; ⬅➡ sprite</span>
      </div>
    `;

    this._familyLabel = this._el.querySelector('#bp-fam-label');
    this._familyCount = this._el.querySelector('#bp-fam-count');
    this._spriteRow   = this._el.querySelector('#bp-sprite-row');
    this._previewEl   = this._el.querySelector('#bp-preview');
    this._spriteLabel = this._el.querySelector('#bp-sprite-label');

    this._el.querySelector('#bp-fam-prev').addEventListener('click', () => this._navigate('up'));
    this._el.querySelector('#bp-fam-next').addEventListener('click', () => this._navigate('down'));

    document.body.appendChild(this._el);
  }

  // ── Events ───────────────────────────────────────────────────────────────────

  _wireEvents() {
    // Gamepad navigation relayed by InputManager
    InputManager.on('panelNav', ({ panel, dir }) => {
      if (panel !== 'brush' || !this._visible) return;
      this._navigate(dir);
    });

    InputManager.on('panelConfirm', ({ panel }) => {
      if (panel !== 'brush' || !this._visible) return;
      this._confirm();
    });

    InputManager.on('closePanel', ({ panel }) => {
      if (panel !== 'brush' && !this._visible) return;
      this.hide();
    });

    // Toggled from outside (sketch.js CustomEvent)
    document.addEventListener('ui:toggleBrushPanel', () => {
      if (!BrushRegistry.isLoaded()) return;
      // Import current indices from sketch module lazily
      import('../sketch/gamepadSketch.js').then(m => {
        this.toggle(m.familyIndex, m.spriteIndex);
      });
    });

    // Mouse click on a sprite tile
    this._spriteRow.addEventListener('click', e => {
      const tile = e.target.closest('.bp-sprite-tile');
      if (!tile) return;
      const i = parseInt(tile.dataset.index, 10);
      this._spriteIndex = i;
      this._refresh();
    });
    this._spriteRow.addEventListener('dblclick', e => {
      const tile = e.target.closest('.bp-sprite-tile');
      if (tile) this._confirm();
    });
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  _navigate(dir) {
    const famCount = BrushRegistry.familyCount();
    const sprCount = BrushRegistry.spriteCountByIndex(this._familyIndex);

    switch (dir) {
      case 'up':
        this._familyIndex = _wrap(this._familyIndex - 1, famCount);
        this._spriteIndex = 0;
        break;
      case 'down':
        this._familyIndex = _wrap(this._familyIndex + 1, famCount);
        this._spriteIndex = 0;
        break;
      case 'left':
        this._spriteIndex = _wrap(this._spriteIndex - 1, sprCount);
        break;
      case 'right':
        this._spriteIndex = _wrap(this._spriteIndex + 1, sprCount);
        break;
    }
    this._refresh();
  }

  _confirm() {
    // Dispatch so App can update the sketch
    document.dispatchEvent(new CustomEvent('brushpanel:confirm', {
      detail: { familyIndex: this._familyIndex, spriteIndex: this._spriteIndex }
    }));
    this.hide();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  _refresh() {
    const meta = BrushRegistry.familyMetaByIndex(this._familyIndex);
    if (!meta) return;

    // Family header
    this._familyLabel.textContent = meta.label;
    this._familyLabel.style.color = meta.color;
    this._familyCount.textContent =
      `${this._familyIndex + 1} / ${BrushRegistry.familyCount()}`;

    // Sprite row — show a window of VISIBLE_SPRITES around current index
    this._spriteRow.innerHTML = '';
    const total  = meta.count;
    const half   = Math.floor(VISIBLE_SPRITES / 2);
    const start  = Math.max(0, Math.min(this._spriteIndex - half, total - VISIBLE_SPRITES));
    const end    = Math.min(total, start + VISIBLE_SPRITES);

    for (let i = start; i < end; i++) {
      const url  = BrushRegistry.getSpriteUrlByIndex(this._familyIndex, i);
      const tile = document.createElement('div');
      tile.className = 'bp-sprite-tile';
      tile.dataset.index = i;
      if (i === this._spriteIndex) tile.classList.add('bp-sprite-tile--active');

      const img = document.createElement('img');
      img.src = url;
      img.alt = `Sprite ${i}`;
      img.loading = 'lazy';
      tile.appendChild(img);
      this._spriteRow.appendChild(tile);
    }

    // Large preview
    const previewUrl = BrushRegistry.getSpriteUrlByIndex(this._familyIndex, this._spriteIndex);
    this._previewEl.src = previewUrl;
    this._spriteLabel.textContent =
      `#${this._spriteIndex + 1} of ${total}`;
  }
}

function _wrap(val, len) {
  return ((val % len) + len) % len;
}
