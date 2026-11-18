/**
 * gamepadSketch.js
 * The page's canvas, the ink and the cursor, drawn on 2D contexts once a
 * frame — p5's until C6b (docs/gamepad.md); all else is core/'s modules.
 * createSketch(container) → the page's canvas.
 */

import * as BrushRegistry from '../../../core/registry.js';
import { JoyImage, PATTERNS }    from '../core/joyImage.js';
import { InputManager, MODE }    from '../core/inputManager.js';
import { ImageStore }            from '../core/imageStore.js';
import { SequenceRecorder }      from '../../../core/stage/recorder.js';
import { SequencePlayer }        from '../../../core/stage/player.js';
import { createClip }            from '../../../core/stage/clip.js';
import { SequenceStage }         from '../../../core/stage/stage.js';
import { SequenceTransport }     from '../../../core/stage/transport.js';
import * as StillFrame           from '../core/stillFrame.js';
import { viewNow, drawPageEdge } from './viewFit.js';
import { Surface, picture }   from './surface.js';

export { setViewInset } from './viewFit.js';

/** Movement speed (px/frame at full stick deflection). Tweakable from ParamPanel. */
export const params = {
  moveSpeed:      10,
  rotateSpeed:    0.045,
  scaleSpeed:     0.006,
  scaleMin:       0.05,
  scaleMax:       8,
  refOpacity:     0.5,

  /**
   * How a saved still is framed. Same vocabulary as core/frame.js, which grid
   * takes as a full parameter group — the gamepad gets the two that matter
   * until its params move onto core/params.js and it can have the rest.
   *
   * `content` is the default because a gamepad drawing is a few marks on a
   * canvas the size of your window, and saving the window was saving mostly
   * nothing: a 1920x945 still holding a drawing 996x822 across. Set `source`
   * to get the old behaviour back.
   */
  frameFormat:    'content',
  frameBleed:     0,

  /** Under a saved still: 'none' (transparent, the default since 2026-09-23) or 'white'. */
  saveGround:     'none',
};

/** Opacity of the live brush cursor drawn over the ink layer. */
const GHOST_ALPHA = 180 / 255;

/** Quiet period after the last resize event before the buffers are rebuilt. */
const RESIZE_DEBOUNCE_MS = 150;

/** Round the page while it is fitted above the timeline: the theme's ground. */
const PAGE_GROUND = '#f4efe3';

// ─── State shared with UI panels (via App) ────────────────────────────────────
export let familyIndex = 0;
export let spriteIndex = 0;
export let patternIndex = 0;

export function setFamilyIndex(i) { familyIndex = i; _syncBrush(); }
export function setSpriteIndex(i) { spriteIndex = i; _syncBrush(); }
export function setPatternIndex(i) { patternIndex = i; _syncBrush(); }

// ─── The page's surfaces ──────────────────────────────────────────────────────
let _view;        // Surface — the page's canvas, the window's size
let _ink;         // Surface — the permanent ink layer, the same size
let _joyImg;      // JoyImage cursor
let _rotVal = 0;
let _scaleVal = 1;
let _referenceImg = null;
let _baseImage = null;   // url of an image loaded under the ink, or null
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
  return _ink?.canvas ?? null;
}

/** The ink, as a save and a print frame it (core/stillFrame.js). */
export const getInk = () => _ink ?? null;

/** The screen's pixel density: the page's canvas and the ink hold that many pixels a unit. */
const density = () => window.devicePixelRatio || 1;

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * The page's canvas in `container`, the ink beside it, the cursor on it, and a
 * frame clock drawing them: p5's canvas, graphics and draw loop until C6b
 * (docs/gamepad.md). app.js decoded the chosen families before it called this
 * (core/registry.js `loadSelected`), so every sprite is an image here.
 *
 * @returns {HTMLCanvasElement} the page's canvas
 */
export function createSketch(container) {
  const canvas = document.createElement('canvas');
  container.append(canvas);
  _view = new Surface(window.innerWidth, window.innerHeight, density(), canvas);
  _ink  = new Surface(_view.width, _view.height, _view.density);

  _joyImg = new JoyImage(
    _view.width  / 2,
    _view.height / 2,
    1,
    BrushRegistry.getSprite(BrushRegistry.familyIdByIndex(familyIndex), spriteIndex),
    _ink.ctx,
    _view.width,
    _view.height
  );

  // Every stamp path funnels through JoyImage.stamp(), so one hook here
  // catches marks from the gamepad and the keyboard alike.
  _joyImg.onStamp = _recordStamp;
  SequenceRecorder.resetBuffer(_view.width, _view.height);

  _stage     = new SequenceStage();
  _transport = new SequenceTransport(_stage);

  _wireInputs();
  _wireKeys();

  // Resize. Debounced: the event fires about once a frame while a window
  // is dragged, and every pass rebuilds two full-screen buffers.
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuildBuffers, RESIZE_DEBOUNCE_MS);
  });

  // parampanel:clearCanvas → wipe the overlay
  document.addEventListener('parampanel:clearCanvas', _clearOverlay);

  // gallery:saveCanvas → the gallery's Save button. The gamepad path goes
  // through InputManager's 'saveImage' action, wired in _wireInputs.
  document.addEventListener('gallery:saveCanvas', _saveImage);

  // parampanel:toggleSequence → arm / disarm the recorder. The sketch owns
  // this because the sequence records the canvas size it was made at.
  document.addEventListener('parampanel:toggleSequence', () => {
    SequenceRecorder.toggle(_view.width, _view.height);
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
  document.addEventListener('parampanel:referenceLoaded', async e => {
    const img = await picture(e.detail.url);
    if (img) _referenceImg = img;
  });

  // Load back saved image to canvas
  document.addEventListener('gallery:loadToCanvas', async e => {
    const img = await picture(e.detail.url);
    if (!img) return;
    // Clear current overlay and draw the loaded image
    _ink.clear();
    _ink.ctx.drawImage(img, 0, 0);
    // Marks no longer describe the canvas: there are pixels under them now.
    SequenceRecorder.resetBuffer(_view.width, _view.height);
    _baseImage = e.detail.url;
  });

  // The frame clock: drawn, then the pad read, as p5's draw() did.
  let last = performance.now();
  const tick = now => {
    const dt = Math.max(0, now - last);
    last = now;
    draw(dt);
    const gp = _getActiveGamepad();
    if (gp) InputManager.update(gp, dt);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return canvas;
}

/** The page and the ink at the window's size again, the ink kept. */
function rebuildBuffers() {
  _view.resize(window.innerWidth, window.innerHeight, density());
  const previous = _ink;
  _ink = new Surface(_view.width, _view.height, _view.density);
  _ink.ctx.drawImage(previous.canvas, 0, 0, previous.width, previous.height);
  previous.dispose();
  _joyImg.setTarget(_ink.ctx, _view.width, _view.height);
}

/** One frame, `dt` ms after the last: the whole page, fitted above the timeline when it is open (viewFit.js). */
function draw(dt) {
  const { ctx, width, height } = _view.begin();
  const view = viewNow(width, height, dt);
  ctx.fillStyle = view ? PAGE_GROUND : '#ffffff';      // round the page, or the page itself
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  if (view) {
    ctx.translate(view.x, view.y);
    ctx.scale(view.k, view.k);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  drawPage(ctx, dt);
  if (view) drawPageEdge(ctx, width, height);
  ctx.restore();
}

/** Everything on the page, in page coordinates. */
function drawPage(ctx, dt) {
  // Playback takes over the view rather than stacking on it: the ink layer
  // already holds these same marks, so drawing both reads as a mess.
  if (_stageActive && _stage?.layers.length) {
    if (_transport.playing) _transport.advance(dt);
    _stage.draw(ctx, _view.width, _view.height);
    return;
  }

  // The reference image behind the ink, contained, at its opacity.
  if (_referenceImg && params.refOpacity > 0) {
    const s = Math.min(_view.width / _referenceImg.width, _view.height / _referenceImg.height);
    const dw = _referenceImg.width * s, dh = _referenceImg.height * s;
    ctx.save();
    ctx.globalAlpha = params.refOpacity;
    ctx.drawImage(_referenceImg, (_view.width - dw) / 2, (_view.height - dh) / 2, dw, dh);
    ctx.restore();
  }

  // The permanent ink layer, at its own size.
  ctx.drawImage(_ink.canvas, 0, 0, _ink.width, _ink.height);

  // The live brush cursor (ghost / preview), semi-transparent.
  if (_joyImg && BrushRegistry.isLoaded()) {
    ctx.save();
    ctx.globalAlpha = GHOST_ALPHA;
    _joyImg.show(ctx);
    ctx.restore();
  }
}

/**
 * The keyboard, a fallback without a pad — p5's keyPressed until C6b: a key
 * held fires once, as there; a key typed in a field is that field's.
 */
function _wireKeys() {
  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'Enter' || e.key === ' ') _joyImg?.stamp();
    if (e.key === 'c' || e.key === 'C')     _clearOverlay();
    if (e.key === 'z' || e.key === 'Z')     _clearOverlay();
    if (e.key === 's' || e.key === 'S')     _saveImage();
    if (e.key === 'g' || e.key === 'G')     params.saveGround = params.saveGround === 'white' ? 'none' : 'white';
    if (e.key === 'p' || e.key === 'P')     _joyImg?.nextPattern();
  });
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
    if (!_joyImg || !_view) return;
    _joyImg.x = _view.width  / 2;
    _joyImg.y = _view.height / 2;
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
// than captured once: both are built by createSketch(), once the sprites are
// decoded — after every module that reads them is imported.
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
  if (!seq || !_view || !_stage || !_transport) return null;

  // At the screen's density, as the canvas it is drawn on.
  const player = new SequencePlayer({ density: _view.density }).load(createClip(seq));
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
 * Cost is quadratic, and the screen's pixel density multiplies it on top, so
 * 4x on a HiDPI display is nearer 64x the memory of 1x on a plain one.
 */
export function setLayerDensity(layer, density) {
  const clip = layer?.player?.clip;
  if (!clip || !_transport) return;
  // Above the screen's own density, which the player keeps (core/stage/player.js).
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
 * identity JoyImage does not carry. Always buffered — recording only decides
 * which range of the buffer becomes a sequence.
 * @param {JoyImage} joy
 */
function _recordStamp(joy) {
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
  if (!_ink) return;
  _ink.clear();
  // The buffered marks described what was on the ink layer. It is gone, so
  // they describe nothing now.
  SequenceRecorder.resetBuffer(_view.width, _view.height);
  _baseImage = null;
}

/**
 * Whether the ink layer is made of marks alone.
 *
 * Load an image onto the canvas and it is not: the pixels underneath came from
 * somewhere the buffer knows nothing about, so a replay of the marks would not
 * reproduce what is on screen. A still saved in that state is a leaf, and says
 * so by carrying no recipe rather than a recipe that lies.
 */
export function canvasIsReproducible() { return _baseImage === null; }

/** The url an image was loaded from, while one underlies the ink layer. */
export function baseImageUrl() { return _baseImage; }

function _saveImage() {
  if (!_ink) return;

  // The frame used is remembered by stillFrame.js, not here: vaultBridge needs
  // it for the recipe, and it is save state rather than sketch state.
  const { canvas } = StillFrame.composite(_ink, params);

  ImageStore.save(canvas, BrushRegistry.familyMetaByIndex(familyIndex)?.label)
            .catch(err => console.error('[sketch] Save failed:', err));
}

function _getActiveGamepad() {
  const gps = navigator.getGamepads?.() ?? [];
  for (const gp of gps) { if (gp) return gp; }
  return null;
}

function _wrap(val, len) {
  return ((val % len) + len) % len;
}
