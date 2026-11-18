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
 */

import { bare, own } from '../../../core/keys.js';

const AHEAD = ['KeyW', 'ArrowUp'], BACK = ['KeyS', 'ArrowDown'], LEFT = ['KeyA', 'ArrowLeft'], RIGHT = ['KeyD', 'ArrowRight'];
const DIVE = 'Space';
const CODES = new Set([...AHEAD, ...BACK, ...LEFT, ...RIGHT]);

/** A stick's dead zone: what a resting stick reads is no move. */
const DEAD = 0.2;
const live = x => (Math.abs(x) < DEAD ? 0 : (x - Math.sign(x) * DEAD) / (1 - DEAD));
const clamp = x => Math.max(-1, Math.min(1, x));

export class Hands {
  /** Listening for as long as `scope` is open (core/scope.js). */
  constructor(scope) {
    this.held = new Set();
    this.frozen = false;        // the phase holds the worm: its hands say nothing (M16b)
    this.dives = 0;             // presses not read yet
    this.pad = false;           // the pad's first button, as last read
    own(...CODES, DIVE);
    scope.listen(document, 'keydown', e => {
      if (e.code === DIVE && bare(e)) { if (!e.repeat) this.dives++; e.preventDefault(); return; }
      if (!CODES.has(e.code) || !bare(e)) return;
      this.held.add(e.code);
      e.preventDefault();
    });
    scope.listen(document, 'keyup', e => { this.held.delete(e.code); });
    scope.listen(window, 'blur', () => this.held.clear());
  }

  /** `{ move, turn, dive }`, now: the keys held, and the first gamepad there; `dive` once a press. */
  read() {
    let dive = this.dives > 0;
    this.dives = 0;
    const pad = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    const pressed = i => (pad && pad.buttons[i] && pad.buttons[i].pressed ? 1 : 0);
    if (pressed(0) && !this.pad) dive = true;
    this.pad = !!pressed(0);
    if (this.frozen) return { move: 0, turn: 0, dive: false };
    const any = list => list.some(c => this.held.has(c)) ? 1 : 0;
    let move = any(AHEAD) - any(BACK), turn = any(RIGHT) - any(LEFT);
    if (pad) {
      move += -live(pad.axes[1] || 0) + pressed(12) - pressed(13);
      turn += live(pad.axes[0] || 0) + pressed(15) - pressed(14);
    }
    return { move: clamp(move), turn: clamp(turn), dive };
  }
}
