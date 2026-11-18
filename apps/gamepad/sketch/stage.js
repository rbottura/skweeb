/**
 * stage.js — the recordings' stage, the timeline's (ui/TimelinePanel.js): a
 * layer for each recording, their clock, whether they have the page. Out of
 * gamepadSketch.js at the seam it had, its Playback section (C6d,
 * docs/gamepad.md), when the sketch passed 600 lines: the sketch draws the
 * page, this what plays over it.
 */

import { SequenceRecorder }      from '../../../core/stage/recorder.js';
import { SequencePlayer }        from '../../../core/stage/player.js';
import { createClip }            from '../../../core/stage/clip.js';
import { SequenceStage }         from '../../../core/stage/stage.js';
import { SequenceTransport }     from '../../../core/stage/transport.js';

let _stage;               // SequenceStage — owns the layers and places them
let _transport;           // SequenceTransport — owns the clock for every layer
let _density = () => 1;   // the page's pixel density: a layer's buffer as sharp as the canvas it is drawn on

/**
 * Whether the stage has taken over the view.
 *
 * Layers exist from the moment a recording finishes, but they must not seize
 * the canvas the moment they appear — that would make every recording hide the
 * drawing it came from. The timeline's Play turns this on and Stop turns it
 * off; Pause only halts the clock, leaving the frozen composition on screen.
 */
let _stageActive = false;

/** A stage and its clock, new: each mount's, its layers none yet. `density` reads the page's. */
export function makeStage({ density = () => 1 } = {}) {
  _stage = new SequenceStage();
  _transport = new SequenceTransport(_stage);
  _density = density;
  _stageActive = false;
}

/**
 * The stage on `ctx`, `dt` ms on, when it has the page — true then: the
 * sketch draws nothing else. Playback takes over the view rather than
 * stacking on it: the ink layer already holds these same marks, so drawing
 * both reads as a mess.
 */
export function drawStage(ctx, width, height, dt) {
  if (!_stageActive || !_stage?.layers.length) return false;
  if (_transport.playing) _transport.advance(dt);
  _stage.draw(ctx, width, height);
  return true;
}

// The stage and its clock, for the timeline. Read through the getters rather
// than captured once: both are built by makeStage(), from the sketch, once the
// sprites are decoded — after every module that reads them is imported.
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
 * @param {object} [clip]  its clip's overrides, timing and window — a loop reopened keeps its own
 * @returns {Object|null} the new layer
 */
export function addLayerForSequence(seq, name, clip = null) {
  if (!seq || !_stage || !_transport) return null;

  // At the screen's density, as the canvas it is drawn on; with the treatment
  // a loop reopened was saved with (C6e), the defaults otherwise.
  const player = new SequencePlayer({ density: _density() }).load(createClip(seq, clip || {}));
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
export function pruneOrphanLayers() {
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
