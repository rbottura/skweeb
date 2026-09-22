/**
 * app.js — GamepadDraw bootstrap (ES module entry point)
 *
 * Load order (guaranteed by index.html):
 *   1. libs/p5.min.js        (global)
 *   2. p5.joystick.js        (global, extends p5)
 *   3. this file             (module)
 */

import * as BrushRegistry from '../../core/registry.js';
import { InputManager, MODE } from './core/inputManager.js';
import { ImageStore }          from './core/imageStore.js';
import { BrushPanel }          from './ui/BrushPanel.js';
import { ParamPanel }          from './ui/ParamPanel.js';
import { GalleryPanel }        from './ui/GalleryPanel.js';
import { TimelinePanel }       from './ui/TimelinePanel.js';
import { VaultPanel }          from '../../core/VaultPanel.js';
import { createSketch,
         setFamilyIndex, setSpriteIndex, setPatternIndex,
         familyIndex, spriteIndex, patternIndex }
       from './sketch/gamepadSketch.js';

import { BrushSelector }       from './ui/BrushSelector.js';

/** Built during boot; the keyboard handler at the bottom reaches it. */
let vaultPanel = null;

// Saving also writes a vault object, with the recipe attached.
import './core/vaultBridge.js';

// ── Boot sequence ────────────────────────────────────────────────────────────

async function boot() {
  try {
    // 1. Load manifest
    const manifest = await BrushRegistry.loadManifest();

    // 1b. Find out which of its families are actually on this machine. The
    //     heavy ones are gitignored by decision, so a clone has two of eleven
    //     and the rest would 404 once per sprite — 517 times — and then draw
    //     nothing when you cycled onto them. One HEAD each, before anything
    //     is offered.
    await BrushRegistry.probeFamilies();
    const missing = BrushRegistry.unavailableManifestFamilies();
    if (missing.length) {
      console.warn(`[registry] ${missing.length} sprite families are in the manifest `
        + `but not on this machine, and are not offered: `
        + missing.map(f => f.id).join(', '));
    }

    // 2. Prompt user to select libraries — only from what can actually draw.
    const selector = new BrushSelector({
      ...manifest,
      families: BrushRegistry.availableManifestFamilies(),
    });
    const selectedIds = await selector.prompt();

    // 3. Configure registry
    BrushRegistry.setSelectedFamilies(selectedIds);

    // 4. Start sketch
    const container = document.getElementById('sketch-container');
    const sketchInstance = createSketch(container);

    // 5. Create UI panels
    const brushPanel   = new BrushPanel();
    const paramPanel   = new ParamPanel();
    const galleryPanel = new GalleryPanel();

    // Built after the sketch, so its getStage()/getTransport() have something
    // to return. It stays hidden until the first recording lands.
    const timelinePanel = new TimelinePanel();

    // The read side of the vault. Unlike the GALLERY panel, which shows this
    // browser's scratchpad, this one shows what is on disk with its recipes.
    vaultPanel = new VaultPanel();

    // 6. Restore previously saved images from IndexedDB
    await ImageStore.ready;

    // 7. Setup status bar
    _buildStatusBar();
    setTimeout(_updateStatusBar, 100);

  } catch (err) {
    console.error('Failed to boot GamepadDraw:', err);
    document.body.innerHTML = `<div style="color:red;padding:20px;font-family:monospace">Fatal Error: ${err.message}</div>`;
  }
}

boot();

// ── Wire cross-module events ─────────────────────────────────────────────────

// BrushPanel confirmed → apply to sketch
document.addEventListener('brushpanel:confirm', e => {
  const { familyIndex: fi, spriteIndex: si } = e.detail;
  setFamilyIndex(fi);
  setSpriteIndex(si);
  _updateStatusBar();
});

// ParamPanel changed pattern → apply to sketch
document.addEventListener('parampanel:patternChange', e => {
  setPatternIndex(e.detail.patternIndex);
  _updateStatusBar();
});

// Sketch brush changed (via D-pad in draw mode) → sync status bar
document.addEventListener('sketch:brushChanged', e => {
  _updateStatusBar();
});

document.addEventListener('sketch:patternChanged', () => {
  _updateStatusBar();
});

// ── Status bar (always-visible HUD strip at bottom-left) ─────────────────────

function _updateStatusBar() {
  const fam  = BrushRegistry.familyMetaByIndex(familyIndex);
  if (!fam) return;

  const patternLabel = document.getElementById('sb-pattern');
  const familyLabel  = document.getElementById('sb-family');
  const spriteLabel  = document.getElementById('sb-sprite');
  const modeLabel    = document.getElementById('sb-mode');
  const countLabel   = document.getElementById('sb-count');

  if (familyLabel) { familyLabel.textContent = fam.label; familyLabel.style.color = fam.color; }
  if (spriteLabel) spriteLabel.textContent = `#${spriteIndex + 1}`;
  if (countLabel)  countLabel.textContent  = `${ImageStore.count} saved`;
}

document.addEventListener('imagestore:saved',   _updateStatusBar);
document.addEventListener('imagestore:removed', _updateStatusBar);
document.addEventListener('imagestore:cleared',  _updateStatusBar);
document.addEventListener('imagestore:hydrated', _updateStatusBar);

// ── Keyboard shortcuts overlay (help) ────────────────────────────────────────
document.addEventListener('keydown', e => {
  // A select or slider in the timeline drawer has the keyboard; a plain letter
  // there is someone typing, not a shortcut.
  const t = e.target;
  if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;

  if (e.key === 'h' || e.key === 'H') _toggleHelp();
  if (e.key === 't' || e.key === 'T') {
    document.dispatchEvent(new CustomEvent('ui:toggleTimeline'));
  }
  if (e.key === 'v' || e.key === 'V') vaultPanel?.toggle();
});

function _buildStatusBar() {
  const bar = document.createElement('div');
  bar.id = 'status-bar';
  bar.className = 'status-bar';
  bar.innerHTML = `
    <span class="sb-item" id="sb-family">—</span>
    <span class="sb-sep">·</span>
    <span class="sb-item sb-dim" id="sb-sprite">—</span>
    <span class="sb-sep">·</span>
    <span class="sb-item sb-dim" id="sb-count">0 saved</span>
    <span class="sb-sep">·</span>
    <span class="sb-item sb-dim" id="sb-vault">vault…</span>
    <span class="sb-spacer"></span>
    <a class="sb-item sb-link" href="gallery/" target="_blank" rel="noopener">Gallery &#8599;</a>
    <span class="sb-sep">·</span>
    <span class="sb-item sb-dim">V = vault &nbsp;·&nbsp; T = timeline &nbsp;·&nbsp; H = help</span>
  `;
  document.body.appendChild(bar);

  // The count was already here; clicking it is the discoverable way in.
  const vaultField = bar.querySelector('#sb-vault');
  vaultField.style.cursor = 'pointer';
  vaultField.title = 'Open the vault [V]';
  vaultField.addEventListener('click', () => vaultPanel?.toggle());

  return bar;
}

function _toggleHelp() {
  const existing = document.getElementById('help-overlay');
  if (existing) { existing.remove(); return; }

  const ov = document.createElement('div');
  ov.id = 'help-overlay';
  ov.className = 'help-overlay';
  ov.innerHTML = `
    <div class="help-card">
      <h2>GamepadDraw — Controls</h2>
      <table class="help-table">
        <thead><tr><th>Gamepad</th><th>Keyboard</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td>Left Stick</td><td>—</td><td>Move brush</td></tr>
          <tr><td>A / Cross</td><td>Space / Enter</td><td>Stamp brush</td></tr>
          <tr><td>B / Circle</td><td>Z</td><td>Undo / Close panel</td></tr>
          <tr><td>L2 / R2</td><td>—</td><td>Rotate CCW / CW</td></tr>
          <tr><td>X / Square</td><td>—</td><td>Scale down</td></tr>
          <tr><td>Y / Triangle</td><td>—</td><td>Scale up</td></tr>
          <tr><td>D-pad ⬆⬇</td><td>—</td><td>Previous / Next family</td></tr>
          <tr><td>D-pad ⬅➡</td><td>—</td><td>Previous / Next sprite</td></tr>
          <tr><td>L1</td><td>—</td><td>Open Brush Panel</td></tr>
          <tr><td>Start</td><td>—</td><td>Open / close Parameters</td></tr>
          <tr><td>R3</td><td>P</td><td>Cycle pattern mode</td></tr>
          <tr><td>L3</td><td>—</td><td>Reset brush to centre</td></tr>
          <tr><td>Select</td><td>—</td><td>Open Gallery</td></tr>
          <tr><td>—</td><td>T</td><td>Open / close Timeline</td></tr>
          <tr><td>—</td><td>V</td><td>Open / close the Vault</td></tr>
        </tbody>
      </table>
      <h3>In the Timeline</h3>
      <p class="help-note">
        Stop recording and the sequence lands here as a layer. Drag&nbsp;⠿ to restack
        (order is blend order), ◉ shows or hides, S shows that one only
        (⇧-click to add more), ▸ opens its speed, window, filter, blend, opacity
        and phase. ▶ plays the stack over the canvas; ■ gives the canvas back.
      </p>
      <h3>In the Gallery</h3>
      <table class="help-table">
        <thead><tr><th>Gamepad</th><th>Keyboard</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td>Start</td><td>S</td><td>Save canvas here</td></tr>
          <tr><td>R1</td><td>—</td><td>Load image to canvas</td></tr>
          <tr><td>X / Square</td><td>—</td><td>Download image</td></tr>
          <tr><td>Y / Triangle</td><td>—</td><td>Delete image</td></tr>
        </tbody>
      </table>
      <p class="help-close-hint">Press H or click to close</p>
    </div>
  `;
  ov.addEventListener('click', () => ov.remove());
  document.body.appendChild(ov);
}
