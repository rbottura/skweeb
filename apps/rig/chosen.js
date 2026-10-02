/**
 * chosen.js — the bone whose handle was pressed last, and its wave's panel.
 *
 * The panel edits one bone's wave, as the map's thing panel edits one block
 * of its place: its values are the wave's own keys (params.js
 * `boneParams`), restored when a bone is chosen, handed back on every edit
 * — with its chain's part beside them, which the whole chain shares. With
 * no bone chosen the drawers hide and a line says how to choose.
 */

import { boneParams, BONE_GROUPS } from './params.js';
import { ParamPanel } from '../../core/ParamPanel.js';

export class ChosenBone {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mount                 the left-hand column
   * @param {(bone: number, values: object) => void} opts.onWave   a wave or a part edited: { part, ...wave }
   */
  constructor({ mount, onWave }) {
    this.bone = null;
    this.params = boneParams();
    this.panel = new ParamPanel(this.params, { title: 'bone', mount, groups: BONE_GROUPS });
    const about = this.panel.addDrawer({ id: 'about', title: 'Chosen', before: 'chain' });
    this.note = document.createElement('p');
    this.note.className = 'rg-note';
    about.body.append(this.note);
    this.params.on(() => {
      if (this.params.restoring || this.bone == null) return;
      onWave(this.bone, this.params.values);
    });
    this.show(null);
  }

  /**
   * @param {?number} bone     its id, or null for none
   * @param {?object} [wave]   its wave as it is, or none yet
   * @param {string} [label]   what to call it
   * @param {string} [part]    its chain's part
   */
  show(bone, wave = null, label = '', part = 'none') {
    this.bone = bone;
    if (bone != null) this.params.restore({ ...(wave || {}), part });
    this.panel.drawer('wave').hidden = bone == null;
    this.panel.drawer('chain').hidden = bone == null;
    this.note.textContent = bone == null
      ? 'Press a joint\'s handle to choose its bone: here it swings by itself.'
      : `${label}. A swing turns it back and forth about its joint; the chain can follow, each bone a lag later.`;
  }
}
