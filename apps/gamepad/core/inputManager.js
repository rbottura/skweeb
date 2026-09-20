/**
 * inputManager.js
 * Unified input dispatcher for the GamepadDraw app.
 *
 * MODES
 *   'draw'        — default, brush moves and stamps
 *   'brushPanel'  — D-pad navigates brush families / sprites
 *   'paramPanel'  — D-pad adjusts parameters
 *   'gallery'     — D-pad navigates saved images
 *
 * GAMEPAD BUTTON MAP (standard layout)
 *   0  A/Cross       → stamp (draw) / confirm (panel)
 *   1  B/Circle      → undo last stamp (draw) / close panel
 *   2  X/Square      → scale −
 *   3  Y/Triangle    → scale +
 *   4  L1            → toggle Brush Panel / (param) previous column
 *   5  R1            → (param) next column / (gallery) load image to canvas
 *   6  L2 (axis)     → rotate CCW
 *   7  R2 (axis)     → rotate CW
 *   8  Select/Back   → toggle Gallery
 *   9  Start         → toggle Param Panel / (gallery) save canvas
 *  10  L3            → reset brush to canvas centre
 *  11  R3            → cycle stamp pattern
 *  12  D-pad Up      → family prev (draw) / navigate up (panel)
 *  13  D-pad Down    → family next (draw) / navigate down (panel)
 *  14  D-pad Left    → sprite prev (draw) / navigate left (panel)
 *  15  D-pad Right   → sprite next (draw) / navigate right (panel)
 *
 * AXES
 *   0  Left stick X  → brush X movement
 *   1  Left stick Y  → brush Y movement
 */

// ─── Mode ─────────────────────────────────────────────────────────────────────

export const MODE = {
  DRAW:         'draw',
  BRUSH_PANEL:  'brushPanel',
  PARAM_PANEL:  'paramPanel',
  GALLERY:      'gallery',
};

// ─── Singleton state ───────────────────────────────────────────────────────────

let _mode = MODE.DRAW;
const _listeners = {};       // action → [fn, ...]
const _prevButtons = [];     // debounce: was button down last frame?

let _drawBlockUntilAUp = false; // prevents 'A' bleed-through after closing a panel

// Axis dead-zone
const DEAD_ZONE = 0.12;

// Panel navigation repeat-rate
const NAV_INITIAL_DELAY = 400; // ms before auto-repeat kicks in
const NAV_REPEAT_RATE   = 120; // ms between auto-repeats
const _navHeld = {};           // buttonIndex → { since, lastFire }

// ─── Public API ───────────────────────────────────────────────────────────────

export const InputManager = {
  get mode() { return _mode; },

  setMode(m) {
    if (m === MODE.DRAW && _mode !== MODE.DRAW) {
      _drawBlockUntilAUp = true;
    }
    _mode = m;
    _emit('modeChange', m);
  },

  /** Register a listener: InputManager.on('stamp', fn) */
  on(action, fn) {
    (_listeners[action] = _listeners[action] || []).push(fn);
    return () => InputManager.off(action, fn); // returns unsubscribe
  },

  off(action, fn) {
    if (_listeners[action])
      _listeners[action] = _listeners[action].filter(f => f !== fn);
  },

  /**
   * Call once per p5 draw() frame, passing the raw Gamepad object.
   * Also pass delta-time in ms for axis-based values.
   */
  update(gamepad, dt = 16) {
    if (!gamepad) return;
    const { buttons, axes } = gamepad;

    // ── Continuous axis input (always active in draw mode for movement) ──
    if (_mode === MODE.DRAW) {
      const ax = _deadZone(axes[0]);
      const ay = _deadZone(axes[1]);
      if (ax !== 0 || ay !== 0) _emit('move', { ax, ay });

      // ── Continuous stamp while A (button 0) is held ──
      const aPressed = buttons[0]?.pressed || (buttons[0]?.value ?? 0) > 0.5;
      if (_drawBlockUntilAUp && !aPressed) {
        _drawBlockUntilAUp = false;
      }
      if (aPressed && !_drawBlockUntilAUp) {
        _emit('stamp', {});
      }

      // ── L2 / R2 rotation ──
      // Some controllers report triggers as buttons[6/7].value (0..1),
      // others as axes[4] / axes[5] with -1..1 range (fully-released = -1).
      // We check both and take whichever is larger.
      const l2Btn  = buttons[6]?.value ?? 0;
      const r2Btn  = buttons[7]?.value ?? 0;
      // axes[4/5] = triggers on 6-axis controllers (PS4/PS5 via some browsers)
      const l2Axis = axes.length > 4 ? Math.max(0, (axes[4] + 1) / 2) : 0;
      const r2Axis = axes.length > 5 ? Math.max(0, (axes[5] + 1) / 2) : 0;
      const l2 = Math.max(l2Btn, l2Axis);
      const r2 = Math.max(r2Btn, r2Axis);
      if (l2 > 0.05) _emit('rotateLeft',  { value: l2 });
      if (r2 > 0.05) _emit('rotateRight', { value: r2 });

      // ── Right stick X (axes[2]) as rotation fallback ──
      // On standard 4-axis controllers, axes[2] = right stick X.
      // Only use it if L2/R2 aren't being pressed (avoids double-rotation).
      if (l2 < 0.05 && r2 < 0.05 && axes.length >= 3) {
        const rsX = _deadZone(axes[2]);
        if (rsX < 0) _emit('rotateLeft',  { value: Math.abs(rsX) });
        if (rsX > 0) _emit('rotateRight', { value: rsX });
      }

      // ── Scale: X/Square = down, Y/Triangle = up ──
      const x = buttons[2]?.value ?? 0;
      const y = buttons[3]?.value ?? 0;
      if (x > 0.05) _emit('scaleDown', { value: x });
      if (y > 0.05) _emit('scaleUp',   { value: y });
    }

    // ── Discrete button presses (edge detection) ──
    buttons.forEach((btn, i) => {
      const pressed = btn.pressed || btn.value > 0.5;
      const wasDown  = !!_prevButtons[i];

      if (pressed && !wasDown) {
        // Rising edge — fire once immediately
        _handleButtonDown(i);
        _navHeld[i] = { since: Date.now(), lastFire: Date.now() };
      }

      if (pressed && wasDown) {
        // Held — auto-repeat for navigation buttons
        const isNavBtn = [12, 13, 14, 15].includes(i);
        if (isNavBtn && _navHeld[i]) {
          const now = Date.now();
          const held = now - _navHeld[i].since;
          const sinceLastFire = now - _navHeld[i].lastFire;
          if (held > NAV_INITIAL_DELAY && sinceLastFire > NAV_REPEAT_RATE) {
            _handleButtonDown(i);
            _navHeld[i].lastFire = now;
          }
        }
      }

      if (!pressed && wasDown) {
        delete _navHeld[i];
      }

      _prevButtons[i] = pressed;
    });
  },
};

// ─── Internal ─────────────────────────────────────────────────────────────────

function _emit(action, data) {
  (_listeners[action] || []).forEach(fn => fn(data));
}

function _handleButtonDown(index) {
  switch (_mode) {
    case MODE.DRAW:         return _drawButton(index);
    case MODE.BRUSH_PANEL:  return _panelButton(index, 'brush');
    case MODE.PARAM_PANEL:  return _panelButton(index, 'param');
    case MODE.GALLERY:      return _panelButton(index, 'gallery');
  }
}

function _drawButton(i) {
  switch (i) {
    // No case 0: A is handled by the continuous-stamp branch in update(),
    // which fires on the press frame too. Emitting here as well stamped the
    // first frame of every press twice, and bypassed _drawBlockUntilAUp.
    case 1:  return _emit('undo',        {});
    case 4:  return _emit('toggleBrushPanel', {});
    case 8:  return _emit('toggleGallery',    {});
    case 9:  return _emit('toggleParamPanel', {});
    case 10: return _emit('resetPosition',    {});
    case 11: return _emit('nextPattern',      {});
    case 12: return _emit('familyPrev',  {});
    case 13: return _emit('familyNext',  {});
    case 14: return _emit('spritePrev',  {});
    case 15: return _emit('spriteNext',  {});
  }
}

function _panelButton(i, panel) {
  // Universal panel close
  if (i === 1) return _emit('closePanel', { panel });

  // Directional navigation → panel-specific nav event
  const dir = { 12: 'up', 13: 'down', 14: 'left', 15: 'right' }[i];
  if (dir) return _emit('panelNav', { panel, dir });

  // Confirm
  if (i === 0) return _emit('panelConfirm', { panel });

  // Param panel specific actions
  if (panel === 'param') {
    if (i === 4) return _emit('panelSection', { panel, dir: -1 }); // L1
    if (i === 5) return _emit('panelSection', { panel, dir:  1 }); // R1
    if (i === 9) return _emit('closePanel',   { panel });          // Start toggles
  }

  // Gallery specific actions
  if (panel === 'gallery') {
    if (i === 2) return _emit('galleryDownload', {}); // X
    if (i === 3) return _emit('galleryDelete', {});   // Y
    if (i === 5) return _emit('galleryLoad', {});     // R1
    if (i === 9) return _emit('saveImage', {});       // Start
  }
}

function _deadZone(v) {
  return Math.abs(v) < DEAD_ZONE ? 0 : Number(v.toFixed(2));
}
