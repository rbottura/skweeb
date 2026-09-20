/**
 * BrushSelector.js
 * Full-screen splash UI shown on app load.
 * Reads brush-manifest.json and lets the user pick which families to load.
 *
 * Usage:
 *   const selector = new BrushSelector(manifest);
 *   const selectedIds = await selector.prompt();  // resolves when user clicks Launch
 *   // selectedIds → string[]
 */

export class BrushSelector {
  /**
   * @param {Object} manifest  — parsed brush-manifest.json
   */
  constructor(manifest) {
    this._manifest  = manifest;
    this._families  = manifest.families;
    // One family by default. Selecting every library decodes over a gigabyte
    // of bitmaps before the canvas appears — the point of this screen is to
    // opt in to the weight, so the default has to be the cheap one.
    this._selected  = new Set(this._families.slice(0, 1).map(f => f.id));
    this._resolve   = null;
    this._el        = null;
    this._cards     = [];
    this._focusIdx  = 0;   // keyboard/gamepad navigation
    this._gpPoll    = null;
  }

  /**
   * Mount the selector and wait for user confirmation.
   * @returns {Promise<string[]>} resolved with array of selected family IDs
   */
  prompt() {
    return new Promise(resolve => {
      this._resolve = resolve;
      this._build();
      this._wireKeyboard();
      this._wireGamepad();
    });
  }

  // ── Build DOM ──────────────────────────────────────────────────────────────

  _build() {
    this._el = document.createElement('div');
    this._el.id = 'brush-selector';
    this._el.innerHTML = `
      <div class="bsel-bg"></div>
      <div class="bsel-inner">
        <header class="bsel-header">
          <div class="bsel-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="12" stroke="#00f5ff" stroke-width="1.5"/>
              <path d="M8 20 Q14 8 20 20" stroke="#00f5ff" stroke-width="1.5" fill="none"/>
              <circle cx="14" cy="13" r="2" fill="#ff2079"/>
            </svg>
            GamepadDraw
          </div>
          <h1 class="bsel-title">Select Brush Libraries</h1>
          <p class="bsel-sub">${this._families.length} libraries found — choose which to load</p>
        </header>

        <div class="bsel-toolbar">
          <button class="bsel-toolbar-btn" id="bsel-all">Select All</button>
          <button class="bsel-toolbar-btn" id="bsel-none">Clear All</button>
        </div>

        <div class="bsel-grid" id="bsel-grid" role="listbox" aria-label="Brush libraries"></div>

        <footer class="bsel-footer">
          <div class="bsel-hint">
            <kbd>click</kbd> toggle &nbsp;·&nbsp;
            <kbd>↑↓←→</kbd> navigate &nbsp;·&nbsp;
            <kbd>Space</kbd> toggle &nbsp;·&nbsp;
            <kbd>Enter</kbd> launch
          </div>
          <button class="bsel-launch-btn" id="bsel-launch" disabled>
            <span id="bsel-launch-label">Select at least one library</span>
          </button>
        </footer>
      </div>
    `;

    document.body.appendChild(this._el);

    // Toolbar
    this._el.querySelector('#bsel-all').addEventListener('click', () => this._selectAll());
    this._el.querySelector('#bsel-none').addEventListener('click', () => this._clearAll());

    // Launch button
    const launchBtn = this._el.querySelector('#bsel-launch');
    launchBtn.addEventListener('click', () => this._launch());

    // Build cards
    const grid = this._el.querySelector('#bsel-grid');
    this._families.forEach((fam, i) => {
      const card = this._makeCard(fam, i);
      grid.appendChild(card);
      this._cards.push(card);
    });

    this._refreshAll();
  }

  _makeCard(fam, index) {
    const card = document.createElement('div');
    card.className = 'bsel-card';
    card.setAttribute('role', 'option');
    card.setAttribute('aria-label', fam.label);
    card.dataset.id = fam.id;
    card.dataset.index = index;

    const previewUrl = `${fam.path}/${fam.preview}`;

    card.innerHTML = `
      <div class="bsel-card__check">
        <svg class="bsel-checkmark" viewBox="0 0 20 20" fill="none">
          <path d="M4 10l4 4 8-8" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="bsel-card__preview">
        <img src="${previewUrl}" alt="" loading="lazy" draggable="false" />
      </div>
      <div class="bsel-card__info">
        <span class="bsel-card__name">${_shortLabel(fam.label)}</span>
        <span class="bsel-card__count">${fam.count} images</span>
      </div>
    `;

    card.addEventListener('click', () => {
      this._toggle(fam.id);
      this._focusIdx = index;
      this._refreshAll();
    });

    return card;
  }

  // ── Selection logic ───────────────────────────────────────────────────────

  _toggle(id)    { this._selected.has(id) ? this._selected.delete(id) : this._selected.add(id); }
  _selectAll()   { this._families.forEach(f => this._selected.add(f.id)); this._refreshAll(); }
  _clearAll()    { this._selected.clear(); this._refreshAll(); }

  _launch() {
    if (this._selected.size === 0) return;
    clearInterval(this._gpPoll);
    document.removeEventListener('keydown', this._keyHandler);

    this._el.classList.add('bsel--launching');
    setTimeout(() => {
      this._el.remove();
      this._resolve([...this._selected]);
    }, 600);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _refreshAll() {
    this._cards.forEach((card, i) => {
      const id = this._families[i].id;
      card.classList.toggle('bsel-card--selected', this._selected.has(id));
      card.classList.toggle('bsel-card--focused',  i === this._focusIdx);
    });

    const count = this._selected.size;
    const totalImgs = [...this._selected].reduce((s, id) => {
      return s + (this._manifest.families.find(f => f.id === id)?.count ?? 0);
    }, 0);

    const launchBtn   = this._el.querySelector('#bsel-launch');
    const launchLabel = this._el.querySelector('#bsel-launch-label');
    launchBtn.disabled = count === 0;

    launchLabel.textContent = count === 0
      ? 'Select at least one library'
      : `Launch with ${count} librar${count > 1 ? 'ies' : 'y'} · ${totalImgs} images`;
  }

  // ── Keyboard navigation ───────────────────────────────────────────────────

  _wireKeyboard() {
    const cols = this._getGridCols();
    this._keyHandler = (e) => {
      const n = this._families.length;
      switch (e.key) {
        case 'ArrowRight': this._focusIdx = (this._focusIdx + 1) % n; break;
        case 'ArrowLeft':  this._focusIdx = (this._focusIdx - 1 + n) % n; break;
        case 'ArrowDown':  this._focusIdx = Math.min(n - 1, this._focusIdx + cols); break;
        case 'ArrowUp':    this._focusIdx = Math.max(0, this._focusIdx - cols); break;
        case ' ':          e.preventDefault(); this._toggle(this._families[this._focusIdx].id); break;
        case 'Enter':      this._launch(); return;
        case 'a': case 'A': this._selectAll(); return;
        default: return;
      }
      this._refreshAll();
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  _wireGamepad() {
    const POLL_MS = 80;
    const _prev = {};
    const _pressed = (gp, i) => {
      const cur = gp.buttons[i]?.pressed ?? false;
      const was = !!_prev[i];
      _prev[i] = cur;
      return cur && !was;
    };

    this._gpPoll = setInterval(() => {
      const gp = (navigator.getGamepads?.() ?? []).find(Boolean);
      if (!gp) return;
      const n    = this._families.length;
      const cols = this._getGridCols();

      if (_pressed(gp, 15)) this._focusIdx = (this._focusIdx + 1) % n;           // right
      if (_pressed(gp, 14)) this._focusIdx = (this._focusIdx - 1 + n) % n;       // left
      if (_pressed(gp, 13)) this._focusIdx = Math.min(n-1, this._focusIdx+cols);  // down
      if (_pressed(gp, 12)) this._focusIdx = Math.max(0, this._focusIdx-cols);    // up
      if (_pressed(gp, 0))  this._toggle(this._families[this._focusIdx].id);      // A = toggle
      if (_pressed(gp, 9))  this._launch();                                        // Start = launch
      if (_pressed(gp, 3))  this._selectAll();                                     // Y = all
      if (_pressed(gp, 1))  this._clearAll();                                      // B = none

      this._refreshAll();
    }, POLL_MS);
  }

  _getGridCols() {
    const grid  = this._el?.querySelector('#bsel-grid');
    const card  = this._cards[0];
    if (!grid || !card) return 3;
    return Math.round(grid.offsetWidth / card.offsetWidth) || 3;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _shortLabel(label) {
  // "GaramondI / Garam_blue" → "Garam blue" (keep last segment, prettify)
  const parts = label.split(' / ');
  return parts[parts.length - 1].replace(/_/g, ' ');
}
