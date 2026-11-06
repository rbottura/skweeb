/**
 * steering.js — the avatar walked (M8's fourth brick, P4): the keys by their
 * place, a pad's cross or stick, and a frame's step — what the player and
 * the garden (M14) walk with alike, moved out of play/main.js when the
 * garden needed it.
 *
 * ZQSD on an AZERTY is WASD's place (`event.code`), the arrows besides; a tap
 * of a key is a step however short, a key held walks on, the last pressed
 * leading. A pad's A is pressed once a press. No DOM of its own: the page
 * hands it its key events.
 */

import { faceTo } from './walk.js';

/** By where the key is, not what it prints: ZQSD on an AZERTY keyboard is WASD's place. */
export const WAYS = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };

export class Steering {
  constructor() {
    this.held = [];            // the ways whose keys are down, the last pressed last
    this.queued = null;        // a way pressed since the last step: a tap is a step, however short
    this.padA = false;         // the pad's A as it was, so a press is one
  }

  /** A key down: held and queued when it is a way. Whether it was. */
  press(e) {
    const way = WAYS[e.code];
    if (!way) return false;
    if (!this.held.includes(way)) this.held.push(way);
    if (!e.repeat) this.queued = way;
    return true;
  }

  /** A key up: its way no longer held. */
  release(e) {
    const i = this.held.indexOf(WAYS[e.code]);
    if (i >= 0) this.held.splice(i, 1);
  }

  /** Nothing held, nothing queued: a warp gone through, the page left. */
  clear() {
    this.held.length = 0;
    this.queued = null;
  }

  /** The first pad there is: its cross or its stick as a way, its A pressed now and not before. */
  pad() {
    const pad = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    if (!pad) return { way: null, use: false };
    const down = i => !!(pad.buttons[i] && pad.buttons[i].pressed);
    const a = down(0), use = a && !this.padA;
    this.padA = a;
    const [x = 0, y = 0] = pad.axes;
    const way = down(12) ? 'up' : down(13) ? 'down' : down(14) ? 'left' : down(15) ? 'right'
      : Math.max(Math.abs(x), Math.abs(y)) < 0.5 ? null : Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
    return { way, use };
  }

  /** The way to step now: a tap first, then the last key held, then the pad — the tap spent. */
  next(padWay = null) {
    const way = this.queued || this.held[this.held.length - 1] || padWay;
    this.queued = null;
    return way || null;
  }
}

/**
 * One frame of walking: the step under way moved on, then — standing — the
 * next taken: `wayNow()`'s, or the next cell of a tap's way. `arrive(cell)`,
 * when a step ends, may stop it there — a warp gone through.
 *
 * @returns {{ arrived: ?object, stopped: boolean, moved: boolean }}  `moved`: it is to be drawn again
 */
export function stride(avatar, recipe, now, wayNow, arrive = null) {
  const was = avatar.face;
  const arrived = avatar.advance(now);
  if (arrived && arrive && arrive(arrived)) return { arrived, stopped: true, moved: true };
  if (!avatar.walking) {
    const way = wayNow();
    let stepped = false;
    if (way) stepped = avatar.go(way, recipe, now);
    else if (avatar.path.length) {
      stepped = avatar.go(faceTo(avatar.at, avatar.path[0]), recipe, now);
      if (stepped) avatar.path.shift();
      else avatar.path = [];
    }
    if (!stepped) avatar.stand();
  }
  return { arrived, stopped: false, moved: avatar.walking || !!arrived || avatar.face !== was };
}
