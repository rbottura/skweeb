/**
 * finds.js — the items lying on the planet's ground (M16m, docs/worm.md):
 * each a card of its picture standing where `strew` put it (items.js),
 * turned to the eye, rising and falling a little, a warm ring at its foot so
 * it reads as a thing to take. Walked into, taken: its card gone, the item
 * what is left of it.
 *
 * Pure but for its pictures, loaded by what it is given (`load`): Node runs
 * it (tests/3d-items.mjs).
 */

import { Group, Mesh, PlaneGeometry, TorusGeometry, MeshBasicMaterial, DoubleSide, Vector3 } from '../../../core/libs/three/three.core.js';

const Z = new Vector3(0, 0, 1);
/** The ring at a find's foot: the colour of a mouth found in the heart. */
const RING = '#ffd36b';

/** A card of `item`'s picture, `size` across — `load(url)`'s, or plain: what stands for it on the ground, along the appendage, in the matrix. */
export function cardOf(item, size, load = null) {
  const map = load && item.picture ? load(item.picture) : null;
  return new Mesh(new PlaneGeometry(size, size),
    new MeshBasicMaterial({ map, color: map ? '#ffffff' : '#e8d9b0', transparent: true, alphaTest: 0.15, side: DoubleSide }));
}

export class Finds {
  constructor() {
    this.group = new Group();
    this.lying = [];           // { item, up, card, ring, phase }
    this.seconds = 0;
    this.radius = 0;
    this.size = 1;
  }

  /** `strewn` laid on a planet `radius` round, each card as big as the worm's `size` asks, its picture `load(url)`'s — or plain. */
  lay(strewn, { radius, size = 1 }, load = null) {
    this.dispose();
    this.radius = radius;
    this.size = size;
    strewn.forEach(({ item, up }, i) => {
      const card = cardOf(item, 1.5 * size, load);
      const ring = new Mesh(new TorusGeometry(0.6 * size, 0.05 * size, 6, 32), new MeshBasicMaterial({ color: RING }));
      ring.position.copy(up).multiplyScalar(radius + 0.03 * size);
      ring.quaternion.setFromUnitVectors(Z, up);
      this.group.add(card, ring);
      this.lying.push({ item, up: up.clone(), card, ring, phase: i * 1.7 });
    });
    return this.update(0);
  }

  /** `dt` on: each card rising and falling where it lies, turned to `eye` when there is one. */
  update(dt, eye = null) {
    this.seconds += dt;
    for (const l of this.lying) {
      l.card.position.copy(l.up).multiplyScalar(this.radius + (1.05 + 0.1 * Math.sin(2 * this.seconds + l.phase)) * this.size);
      l.card.up.copy(l.up);
      if (eye) l.card.lookAt(eye);
    }
    return this;
  }

  /** The item lying within `reach` of `p` — the nearest — taken off the ground; or null. */
  take(p, reach) {
    let best = -1, d = reach;
    this.lying.forEach((l, i) => {
      const at = l.up.clone().multiplyScalar(this.radius).distanceTo(p);
      if (at < d) { d = at; best = i; }
    });
    return best < 0 ? null : this.pick(best);
  }

  /** Find `i` taken off the ground: its card gone; what it was. */
  pick(i) {
    const l = this.lying.splice(i, 1)[0];
    if (!l) return null;
    for (const m of [l.card, l.ring]) {
      this.group.remove(m);
      m.geometry.dispose();
      if (m.material.map) m.material.map.dispose();
      m.material.dispose();
    }
    return l.item;
  }

  dispose() { while (this.lying.length) this.pick(0); }
}
