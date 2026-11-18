/**
 * hands.js — what the player's hands say (M16a): a move and a turn, each −1
 * to 1; and a dive (M16c), Space or the pad's first button, once a press. ZQSD on an AZERTY, WASD on a QWERTY — the same keys by their place
 * (`event.code`, core/keys.js) — the arrows, and a gamepad's left stick or
 * its cross. Ahead and back move; left and right turn — the camera behind
 * stays behind, so left is always the worm's left.
 *
 * Its keys are the player's own while it is mounted (core/keys.js `own`),
 * so core's left hand — S, D — leaves them alone; never in a field, nor
 * with Ctrl (`bare`). Held keys let go of when the window loses the focus.
 *
 * Aimed, in the heart (M16o): the right button held on the canvas, E
 * pressed once — again to stop — or the pad's left trigger held; the
 * pointer's moves meanwhile, locked to the canvas where the browser lets
 * it; the pad's right stick. A left click, aimed, goes.
 */

import { bare, own } from '../../../core/keys.js';

const AHEAD = ['KeyW', 'ArrowUp'], BACK = ['KeyS', 'ArrowDown'], LEFT = ['KeyA', 'ArrowLeft'], RIGHT = ['KeyD', 'ArrowRight'];
const DIVE = 'Space', AIM = 'KeyE';
const CODES = new Set([...AHEAD, ...BACK, ...LEFT, ...RIGHT]);

/** A stick's dead zone: what a resting stick reads is no move. */
const DEAD = 0.2;
const live = x => (Math.abs(x) < DEAD ? 0 : (x - Math.sign(x) * DEAD) / (1 - DEAD));
const clamp = x => Math.max(-1, Math.min(1, x));

export class Hands {
  /** Listening for as long as `scope` is open (core/scope.js). */
  constructor(scope, canvas = null) {
    this.held = new Set();
    this.button = false;        // the right button held on the canvas
    this.toggled = false;       // E pressed: aimed until it is again
    this.trigger = false;       // the pad's left trigger, as last read
    this.looked = [0, 0];       // the pointer's moves while aimed, not read yet
    this.clicks = 0;            // left clicks while aimed, not read yet
    this.frozen = false;        // the phase holds the worm: its hands say nothing (M16b)
    this.dives = 0;             // presses not read yet
    this.pad = false;           // the pad's first button, as last read
    own(...CODES, DIVE, AIM);
    scope.listen(document, 'keydown', e => {
      if (e.code === DIVE && bare(e)) { if (!e.repeat) this.dives++; e.preventDefault(); return; }
      if (e.code === AIM && bare(e)) { if (!e.repeat) this.toggled = !this.toggled; e.preventDefault(); return; }
      if (!CODES.has(e.code) || !bare(e)) return;
      this.held.add(e.code);
      e.preventDefault();
    });
    scope.listen(document, 'keyup', e => { this.held.delete(e.code); });
    scope.listen(window, 'blur', () => { this.held.clear(); this.button = false; });
    if (!canvas) return;
    scope.listen(canvas, 'contextmenu', e => e.preventDefault());
    scope.listen(canvas, 'mousedown', e => {
      if (e.button === 2) {
        this.button = true;
        try { const p = canvas.requestPointerLock && canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* not here */ }
      } else if (e.button === 0 && this.aiming) this.clicks++;
    });
    scope.listen(document, 'mouseup', e => {
      if (e.button !== 2) return;
      this.button = false;
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    });
    scope.listen(document, 'mousemove', e => {
      if (!this.aiming) return;
      this.looked[0] += e.movementX || 0;
      this.looked[1] += e.movementY || 0;
    });
  }

  /** Aimed now: the right button held, E pressed, or the pad's left trigger. */
  get aiming() { return this.button || this.toggled || this.trigger; }

  /**
   * `{ move, turn, dive, aim, look, stick, go }`, now: the keys held, and the first gamepad there; `dive` once a
   * press; aimed, the pointer's pixels since, the right stick, a click.
   */
  read() {
    let dive = this.dives > 0;
    const look = this.looked, go = this.clicks > 0;
    this.dives = 0;
    this.looked = [0, 0];
    this.clicks = 0;
    const pad = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    const pressed = i => (pad && pad.buttons[i] && pad.buttons[i].pressed ? 1 : 0);
    if (pressed(0) && !this.pad) dive = true;
    this.pad = !!pressed(0);
    this.trigger = !!(pad && pad.buttons[6] && (pad.buttons[6].pressed || pad.buttons[6].value > 0.5));
    if (this.frozen) return { move: 0, turn: 0, dive: false, aim: false, look: [0, 0], stick: [0, 0], go: false };
    const any = list => list.some(c => this.held.has(c)) ? 1 : 0;
    let move = any(AHEAD) - any(BACK), turn = any(RIGHT) - any(LEFT);
    if (pad) {
      move += -live(pad.axes[1] || 0) + pressed(12) - pressed(13);
      turn += live(pad.axes[0] || 0) + pressed(15) - pressed(14);
    }
    const stick = pad ? [live(pad.axes[2] || 0), live(pad.axes[3] || 0)] : [0, 0];
    return { move: clamp(move), turn: clamp(turn), dive, aim: this.aiming, look, stick, go };
  }
}
