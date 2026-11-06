/**
 * hand.js — the flower in hand (M14): a member of the set the garden plants
 * from, by its number — 1 its first — the set's members read once a set.
 */

import { Vault } from '../../../core/vault.js';

export class Hand {
  constructor() {
    this.id = null;            // the set read
    this.members = [];         // its members' ids, in its order
  }

  /** Flower `n` of the set `id`, by its id — or null: no set, or none so numbered. */
  async flower(id, n) {
    if (!id) return null;
    if (this.id !== id) {
      let members = [];
      try {
        const { object } = await Vault.load(id);
        members = (object.recipe && object.recipe.members) || [];
      } catch {
        members = [];
      }
      this.id = id;
      this.members = members;
    }
    return this.members[n - 1] || null;
  }
}
