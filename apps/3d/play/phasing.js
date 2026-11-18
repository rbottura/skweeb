/**
 * phasing.js — the worms on the planet (M16b, docs/worm.md): one walked, the
 * others frozen in space-time — "un ver figé dans l'espace temps", each a
 * phase — and the passage from the walked one into a frozen one.
 *
 * A body is a worm, where it stands (a walker, walker.js) and its reality,
 * its ground and its sky: the planet wears the walked body's. A frozen body
 * is a shell, its wave held where it was, its radius breathing round it on
 * the ground (reach.js). Walked into a radius, the passage begins (phase.js):
 * the hands let go of, the camera to both bodies, the bridge of their morph
 * (bridge.js), the phase swung between them — whichever body it leaves a
 * shell, whichever it reaches filled — then held on the other while the
 * world turns to its reality. The other is walked from then on, and the one
 * left behind is a frozen phase in its turn: the way back. Not at once — the
 * walked body leaves every radius before one takes it in again.
 *
 * Each body dives on its own (dive.js, M16c): a phase is passed into on the
 * ground — under it, or on the way, the walked body is not taken in.
 */

import { Color } from '../../../core/libs/three/three.core.js';
import { passageAt } from './phase.js';
import { Bridge } from './bridge.js';
import { Reach } from './reach.js';
import { Dive } from './dive.js';

/** Past a radius by this much, the walked body may be taken in again. */
const AGAIN = 0.5;

export class Phasing {
  constructor(scene) {
    this.scene = scene;
    this.bodies = [];        // { worm, walker, reality: { ground, sky }, reach, dive }
    this.walking = 0;
    this.passage = null;     // { from, to, t, bridge, at } while one plays
    this.armed = true;
    this.seconds = 0;
  }

  /** A body on the planet: its worm, where it stands, its reality. Its index. */
  add(worm, walker, reality) {
    const reach = new Reach();
    this.scene.add(worm.mesh, reach.mesh);
    this.bodies.push({ worm, walker, reality, reach, dive: new Dive() });
    return this.bodies.length - 1;
  }

  /** The body walked now. */
  get walked() { return this.bodies[this.walking]; }

  /** The frozen body whose radius the walked one has come into, if it may be taken in — on the ground — or −1. */
  within(reach) {
    const me = this.walked.walker.p;
    let found = -1, clear = true;
    this.bodies.forEach((b, i) => {
      if (i === this.walking) return;
      const d = me.distanceTo(b.walker.p);
      if (d < reach && found < 0) found = i;
      if (d < reach + AGAIN) clear = false;
    });
    if (clear) this.armed = true;
    return this.armed && this.walked.dive.state === 'surface' ? found : -1;
  }

  /** The passage into body `to` begun, the bridge laid between the two as they stand. */
  begin(to, { ghosts = 7, spectral = '#a6e3ff', arch = 1.5 } = {}) {
    const from = this.walking;
    const bridge = new Bridge(this.bodies[from].worm, this.bodies[to].worm, { count: ghosts, colour: spectral, arch });
    this.scene.add(bridge.group);
    this.passage = { from, to, t: 0, bridge, at: passageAt(0) };
    return this.passage;
  }

  /** The passage `dt` further on: the shells and the bridge lit for its phase; bonded, the other is walked. */
  advance(dt, { swing, swings }) {
    const p = this.passage;
    p.t += dt;
    p.at = passageAt(p.t, { swing, swings });
    const { stage, phase, framed, fixed } = p.at;
    this.bodies[p.from].worm.setShell(phase);
    this.bodies[p.to].worm.setShell(1 - phase);
    p.bridge.light(phase, stage === 'fixed' ? 1 - fixed : framed);
    if (stage === 'bonded') {
      p.bridge.dispose();
      this.walking = p.to;
      this.armed = false;
      this.passage = null;
    }
    return p.at;
  }

  /** The reality the planet wears: the walked body's — on its way to the other's while a passage is held on it. */
  reality() {
    const now = this.walked.reality, p = this.passage;
    if (!p || p.at.stage !== 'fixed') return now;
    const to = this.bodies[p.to].reality, k = p.at.fixed;
    return { ground: '#' + new Color(now.ground).lerp(new Color(to.ground), k).getHexString(),
             sky: '#' + new Color(now.sky).lerp(new Color(to.sky), k).getHexString() };
  }

  /** Each frame: the frozen bodies' radii breathing, shells; the walked one's radius hidden, and every radius while a passage plays. */
  breathe(dt) {
    this.seconds += dt;
    this.bodies.forEach((b, i) => {
      const frozen = i !== this.walking;
      b.reach.breathe(this.seconds, frozen && !this.passage ? 1 : 0);
      if (!this.passage) b.worm.setShell(frozen ? 1 : 0);
    });
  }

  dispose() {
    if (this.passage) this.passage.bridge.dispose();
    for (const b of this.bodies) b.reach.dispose();
    this.bodies = [];
    this.passage = null;
  }
}
