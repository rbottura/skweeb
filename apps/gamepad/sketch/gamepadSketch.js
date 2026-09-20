/**
 * gamepadSketch.js
 * Thin p5 instance that delegates all logic to core/ modules.
 * Exported as createSketch(container) → returns the p5 instance.
 */

import * as BrushRegistry from '../core/brushRegistry.js';
import { JoyImage, PATTERNS }    from '../core/joyImage.js';
import { InputManager, MODE }    from '../core/inputManager.js';
import { ImageStore }            from '../core/imageStore.js';
import { SequenceRecorder }      from '../core/sequenceRecorder.js';
import { SequencePlayer }        from '../core/sequencePlayer.js';
import { createClip }            from '../core/sequenceClip.js';
import { SequenceStage }         from '../core/sequenceStage.js';
import { SequenceTransport }     from '../core/sequenceTransport.js';

/** Movement speed (px/frame at full stick deflection). Tweakable from ParamPanel. */
export const params = {
  moveSpeed:      10,
  rotateSpeed:    0.045,
  scaleSpeed:     0.006,
  scaleMin:       0.05,
  scaleMax:       8,
  refOpacity:     0.5,
};

/** Opacity of the live brush cursor drawn over the ink layer. */
const GHOST_ALPHA = 180 / 255;

/** Quiet period after the last resize event before the buffers are rebuilt. */
const RESIZE_DEBOUNCE_MS = 150;

// ─── State shared with UI panels (via App) ────────────────────────────────────
export let familyIndex = 0;
export let spriteIndex = 0;
export let patternIndex = 0;

export function setFamilyIndex(i) { familyIndex = i; _syncBrush(); }
export function setSpriteIndex(i) { spriteIndex = i; _syncBrush(); }
export function setPatternIndex(i) { patternIndex = i; _syncBrush(); }

// ─── p5 refs ─────────────────────────────────────────────────────────────────
let _p5;          // the p5 instance
let _overlay;     // p5.Graphics — permanent ink layer
let _joyImg;      // JoyImage cursor
let _rotVal = 0;
let _scaleVal = 1;
let _referenceImg = null;
let _sk;                  // the p5 instance, for building players later
let _stage;               // SequenceStage — owns the layers and places them
let _transport;           // SequenceTransport — owns the clock for every layer

/**
 * Whether the stage has taken over the view.
 *
 * Layers exist from the moment a recording finishes, but they must not seize
 * the canvas the moment they appear — that would make every recording hide the
 * drawing it came from. The timeline's Play turns this on and Stop turns it
 * off; Pause only halts the clock, leaving the frozen composition on screen.
 */
let _stageActive = false;

export function getOverlayCanvas() {
  return _overlay?.canvas ?? null;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createSketch(container) {
  _p5 = new p5(sketch => {
    let _cnv;

    // ── preload ───────────────────────────────────────────────────────────────
    sketch.preload = () => {
      BrushRegistry.preloadSelected(sketch);
    };

    // ── setup ─────────────────────────────────────────────────────────────────
    sketch.setup = () => {
      _cnv = sketch.createCanvas(window.innerWidth, window.innerHeight);
      sketch.pixelDensity(window.devicePixelRatio || 1);

      _overlay = sketch.createGraphics(sketch.width, sketch.height);
      _overlay.clear();

      _joyImg = new JoyImage(
        sketch.width  / 2,
        sketch.height / 2,
        1,
        BrushRegistry.getSprite(BrushRegistry.familyIdByIndex(familyIndex), spriteIndex),
        _overlay,
        sketch.width,
        sketch.height
      );

      // Every stamp path funnels through JoyImage.stamp(), so one hook here
      // catches marks from the gamepad, the keyboard and p5.joystick alike.
      _joyImg.onStamp = _recordStamp;

      _sk        = sketch;
      _stage     = new SequenceStage();
      _transport = new SequenceTransport(_stage);

      _wireInputs();
      _wireJoystick(sketch);

      // Resize. Debounced: the event fires about once a frame while a window
      // is dragged, and every pass rebuilds two full-screen buffers.
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(rebuildBuffers, RESIZE_DEBOUNCE_MS);
      });

      function rebuildBuffers() {
        sketch.resizeCanvas(window.innerWidth, window.innerHeight);

        const previous = _overlay;
        const next = sketch.createGraphics(sketch.width, sketch.height);
        next.clear();
        next.image(previous, 0, 0);

        _overlay = next;
        _joyImg.setTarget(_overlay, sketch.width, sketch.height);

        // p5.Graphics registers itself on the instance and appends its canvas
        // to the container, so the old buffer is retained for the life of the
        // page unless it is removed by hand.
        previous.remove();
      }
    };

    // ── draw ──────────────────────────────────────────────────────────────────
    sketch.draw = () => {
      sketch.background(255); // Solid white base

      // Playback takes over the view rather than stacking on it: the ink layer
      // already holds these same marks, so drawing both reads as a mess.
      if (_stageActive && _stage?.layers.length) {
        if (_transport.playing) _transport.advance(sketch.deltaTime);
        _stage.draw(sketch);

        const pad = _getActiveGamepad();
        if (pad) InputManager.update(pad, sketch.deltaTime);
        return;
      }

      // Draw reference image behind the overlay
      if (_referenceImg && params.refOpacity > 0) {
        sketch.push();
        // globalAlpha rather than tint(): p5 implements tint by clearing and
        // redrawing the image into an offscreen canvas on every image() call,
        // with no caching between frames. An all-255 tint is only an alpha
        // multiply, so setting it on the context is equivalent and free.
        sketch.drawingContext.globalAlpha = params.refOpacity;
        sketch.imageMode(sketch.CENTER);
        // "Contain" scaling
        const s = Math.min(sketch.width / _referenceImg.width, sketch.height / _referenceImg.height);
        const dw = _referenceImg.width * s;
        const dh = _referenceImg.height * s;
        sketch.image(_referenceImg, sketch.width / 2, sketch.height / 2, dw, dh);
        sketch.pop();
      }

      // Draw the permanent ink layer
      sketch.push();
      sketch.imageMode(sketch.CORNER);
      sketch.image(_overlay, 0, 0);
      sketch.pop();

      // Draw live brush cursor (ghost / preview)
      if (_joyImg && BrushRegistry.isLoaded()) {
        sketch.push();
        // Semi-transparent preview. show() draws once per stamp point, so with
        // tint() the offscreen re-render above ran up to four times a frame.
        // pop() restores globalAlpha, as it maps to drawingContext.restore().
        sketch.drawingContext.globalAlpha = GHOST_ALPHA;
        _joyImg.show(sketch);
        sketch.pop();
      }

      // Poll gamepad
      const gp = _getActiveGamepad();
      if (gp) InputManager.update(gp, sketch.deltaTime);
    };

    // ── key shortcuts (fallback without gamepad) ───────────────────────────────
    sketch.keyPressed = (e) => {
      if (e.key === 'Enter' || e.key === ' ') _joyImg?.stamp();
      if (e.key === 'c' || e.key === 'C')     _clearOverlay();
      if (e.key === 'z' || e.key === 'Z')     _clearOverlay();
      if (e.key === 's' || e.key === 'S')     _saveImage();
      if (e.key === 'p' || e.key === 'P')     _joyImg?.nextPattern();
    };

    // parampanel:clearCanvas → wipe the overlay
    document.addEventListener('parampanel:clearCanvas', _clearOverlay);

    // gallery:saveCanvas → the gallery's Save button. The gamepad path goes
    // through InputManager's 'saveImage' action, wired in _wireInputs.
    document.addEventListener('gallery:saveCanvas', _saveImage);

    // parampanel:toggleSequence → arm / disarm the recorder. The sketch owns
    // this because the sequence records the canvas size it was made at.
    document.addEventListener('parampanel:toggleSequence', () => {
      SequenceRecorder.toggle(sketch.width, sketch.height);
    });

    // A finished recording becomes a layer straight away. It is almost always
    // what you want to look at next, and if it is not, the timeline drops it in
    // one click — which is a better trade than making every keeper cost a
    // deliberate "add" that is easy to forget.
    document.addEventListener('sequence:stopped', e => {
      addLayerForSequence(e.detail.sequence, `Seq ${e.detail.index + 1}`);
    });

    // A sequence that is gone cannot back a layer.
    document.addEventListener('sequence:removed', _pruneOrphanLayers);
    document.addEventListener('sequence:cleared', _pruneOrphanLayers);

    // Load reference image
    document.addEventListener('parampanel:referenceLoaded', (e) => {
      sketch.loadImage(e.detail.url, (img) => {
        _referenceImg = img;
      });
    });

    // Load back saved image to canvas
    document.addEventListener('gallery:loadToCanvas', (e) => {
      sketch.loadImage(e.detail.url, (img) => {
        // Clear current overlay and draw the loaded image
        _overlay.clear();
        _overlay.imageMode(sketch.CORNER);
        _overlay.image(img, 0, 0);
      });
    });

  }, container);

  return _p5;
}

// ─── Input wiring ─────────────────────────────────────────────────────────────

function _wireInputs() {
  InputManager.on('move', ({ ax, ay }) => {
    if (!_joyImg) return;
    _joyImg.x += ax * params.moveSpeed;
    _joyImg.y += ay * params.moveSpeed;
  });

  InputManager.on('rotateLeft',  ({ value }) => { _rotVal -= value * params.rotateSpeed; _joyImg.rotation = _rotVal; });
  InputManager.on('rotateRight', ({ value }) => { _rotVal += value * params.rotateSpeed; _joyImg.rotation = _rotVal; });

  InputManager.on('scaleDown', ({ value }) => {
    _scaleVal = Math.max(params.scaleMin, _scaleVal - value * params.scaleSpeed);
    _joyImg.scale = _scaleVal;
  });
  InputManager.on('scaleUp', ({ value }) => {
    _scaleVal = Math.min(params.scaleMax, _scaleVal + value * params.scaleSpeed);
    _joyImg.scale = _scaleVal;
  });

  InputManager.on('stamp',         () => _joyImg?.stamp());
  InputManager.on('undo',          () => { /* TODO: undo stack */ });
  InputManager.on('resetPosition', () => {
    if (!_joyImg || !_p5) return;
    _joyImg.x = _p5.width  / 2;
    _joyImg.y = _p5.height / 2;
  });
  InputManager.on('nextPattern',   () => {
    if (!_joyImg) return;
    _joyImg.nextPattern();
    patternIndex = PATTERNS.indexOf(_joyImg.pattern);
    document.dispatchEvent(new CustomEvent('sketch:patternChanged', { detail: { patternIndex } }));
  });

  InputManager.on('familyNext', () => _step('family',  1));
  InputManager.on('familyPrev', () => _step('family', -1));
  InputManager.on('spriteNext', () => _step('sprite',  1));
  InputManager.on('spritePrev', () => _step('sprite', -1));

  InputManager.on('saveImage',    _saveImage);
  InputManager.on('toggleBrushPanel', () => document.dispatchEvent(new CustomEvent('ui:toggleBrushPanel')));
  InputManager.on('toggleParamPanel', () => document.dispatchEvent(new CustomEvent('ui:toggleParamPanel')));
  InputManager.on('toggleGallery',    () => document.dispatchEvent(new CustomEvent('ui:toggleGallery')));
}

function _wireJoystick(sketch) {
  // p5.joystick integration — stamp on green button
  try {
    const joystick = sketch.createJoystick?.(false);
    if (joystick) {
      joystick.onButtonPressed(e => {
        if (e.name === 'buttonGreen') _joyImg?.stamp();
      });
    }
  } catch(_) {
    console.warn('p5.joystick not available, using raw Gamepad API only.');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _step(type, dir) {
  if (!_joyImg) return;
  if (type === 'family') {
    familyIndex = _wrap(familyIndex + dir, BrushRegistry.familyCount());
    spriteIndex = 0;
  } else {
    spriteIndex = _wrap(spriteIndex + dir, BrushRegistry.spriteCountByIndex(familyIndex));
  }
  _syncBrush();
  document.dispatchEvent(new CustomEvent('sketch:brushChanged', {
    detail: { familyIndex, spriteIndex }
  }));
}

// ─── Playback ────────────────────────────────────────────────────────────────

// The stage and its clock, for the timeline. Read through the getters rather
// than captured once: both are built in setup(), which p5 defers until preload
// has finished — well after the UI panels are constructed.
export const getStage      = () => _stage;
export const getTransport  = () => _transport;
export const isStageActive = () => _stageActive;

/**
 * Put a recording on the stage as a new layer, on top.
 *
 * Every layer gets fit:'contain', so they stack over the same rect rather than
 * sitting side by side. That is what makes the blend modes worth having — the
 * clips interact instead of merely sharing a window. The stage supports
 * absolute placement too, whenever that is the look wanted instead.
 *
 * @returns {Object|null} the new layer
 */
export function addLayerForSequence(seq, name) {
  if (!seq || !_sk || !_stage || !_transport) return null;

  const player = new SequencePlayer(_sk).load(createClip(seq));
  const layer  = _stage.add(player, { name, layout: { fit: 'contain' } });
  _transport.rewindLayer(layer);

  _announceStage();
  return layer;
}

export function dropLayer(layer) {
  if (!layer || !_stage) return;
  _stage.remove(layer.player);
  layer.player.dispose();     // the sketch built it, so the sketch frees it
  if (_stage.layers.length === 0) stopStage();
  else                            _announceStage();
}

export function moveLayer(from, to) {
  _stage?.move(from, to);
  _announceStage();
}

/**
 * Retune a layer's window rule or band width.
 *
 * No reload: bounds and the buffer depend on the recording and the overrides,
 * neither of which a rule touches. It only changes how many ticks the loop has
 * and which marks show at each one — so the playhead has to be re-placed, and
 * only this layer's.
 */
export function reshapeLayer(layer, { rule, widthSteps } = {}) {
  const clip = layer?.player?.clip;
  if (!clip || !_transport) return;

  const changed = (rule       !== undefined && rule       !== clip.window.rule)
               || (widthSteps !== undefined && widthSteps !== clip.window.widthSteps);
  if (rule       !== undefined) clip.window.rule       = rule;
  if (widthSteps !== undefined) clip.window.widthSteps = widthSteps;

  if (changed) _transport.rewindLayer(layer);   // also re-derives phase in ticks
}

export function setLayerSpeed(layer, multiplier) {
  if (!layer || !_transport) return;
  _transport.setRatio(layer, multiplier);
  // The transport's ratio is what drives playback now, but keep the clip's
  // declared rate true so a serialised clip still says how fast it should run.
  layer.player.clip.timing.ticksPerSecond = Math.round(multiplier * _transport.rate);
}

export const setLayerPhase = (layer, phase) => _transport?.setPhase(layer, phase);

/**
 * Re-render a layer's buffer at a different resolution.
 *
 * Buffer pixels per sequence pixel. Above 1 keeps a layer crisp when the stage
 * blows it up; below 1 is a deliberate coarseness. Unlike every other layer
 * control this one rebuilds the buffer — the size is fixed at `load()` — so it
 * belongs on a discrete control, not a slider somebody drags.
 *
 * Cost is quadratic, and p5 multiplies by the Graphics' own pixel density on
 * top, so 4x on a HiDPI display is nearer 64x the memory of 1x on a plain one.
 */
export function setLayerDensity(layer, density) {
  const clip = layer?.player?.clip;
  if (!clip || !_transport) return;
  layer.player.load(clip, { renderScale: density });
  _transport.rewindLayer(layer);
  _announceStage();
}

// ── Stage transport ───────────────────────────────────────────────────

export function playStage() {
  if (!_stage?.layers.length || !_transport) return;
  _stageActive = true;
  _transport.play();
  _announceStage();
}

/** Halt the clock but stay on the composition, frozen where it stands. */
export function pauseStage() {
  _transport?.pause();
  _announceStage();
}

/** Give the canvas back to the brush, and rewind. */
export function stopStage() {
  _stageActive = false;
  _transport?.pause();
  _transport?.rewind();
  _announceStage();
}

// ── Internal ────────────────────────────────────────────────────────────

/** Drop any layer whose recording has been deleted from under it. */
function _pruneOrphanLayers() {
  if (!_stage) return;
  const alive = new Set(SequenceRecorder.all);
  for (const layer of [..._stage.layers]) {
    if (!alive.has(layer.player.clip?.sequence)) dropLayer(layer);
  }
}

function _announceStage() {
  if (!_stage || !_transport) return;
  const missing = [...new Set(_stage.layers.flatMap(l => l.player.missingFamilies))];
  document.dispatchEvent(new CustomEvent('stage:changed', {
    detail: {
      active:          _stageActive,
      playing:         _transport.playing,
      layerCount:      _stage.layers.length,
      missingFamilies: missing,
    },
  }));
}

/**
 * Offer a just-drawn stamp to the sequence recorder, tagged with the brush
 * identity JoyImage does not carry. Ignored unless recording is armed.
 * @param {JoyImage} joy
 */
function _recordStamp(joy) {
  if (!SequenceRecorder.recording) return;
  SequenceRecorder.capture({
    x:           joy.x,
    y:           joy.y,
    rotation:    joy.rotation,
    scale:       joy.scale,
    pattern:     joy.pattern,
    familyId:    BrushRegistry.familyIdByIndex(familyIndex),
    spriteIndex,
  });
}

function _syncBrush() {
  if (!_joyImg) return;
  _joyImg.img     = BrushRegistry.getSprite(BrushRegistry.familyIdByIndex(familyIndex), spriteIndex);
  _joyImg.pattern = PATTERNS[patternIndex];
}

function _clearOverlay() {
  if (!_overlay || !_p5) return;
  _overlay.clear();
}

function _saveImage() {
  if (!_overlay || !_p5) return;
  // Create a temporary graphics with a white background so saved image isn't transparent
  const temp = _p5.createGraphics(_overlay.width, _overlay.height);
  temp.background(255);
  temp.image(_overlay, 0, 0);
  ImageStore.save(temp.canvas, BrushRegistry.familyMetaByIndex(familyIndex)?.label)
            .catch(err => console.error('[sketch] Save failed:', err));
  temp.remove();
}

function _getActiveGamepad() {
  const gps = navigator.getGamepads?.() ?? [];
  for (const gp of gps) { if (gp) return gp; }
  return null;
}

function _wrap(val, len) {
  return ((val % len) + len) % len;
}
