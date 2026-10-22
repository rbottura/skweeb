/**
 * keeping.js — the puppet kept in the vault, and followed: what makes the
 * page in OBS the puppet set up in the window.
 *
 * A puppet worn saves nothing until it is sent. Sent, it is a smart object
 * (docs/smart-objects.md): a `params` object — its values the recipe, the
 * recipe the object (docs/object-model.md) — its picture the avatar as worn
 * then, `origin.app` 'rig/puppet', so core finds its rebuild.js and reopens
 * it here. The first send makes it, and this window is bound to it
 * (core/vault.js `bind`); every send after is its next version. Its address
 * is then `?open=<id>` — the one OBS is given, once. A page opened on it
 * follows it: the server tells every page of the vault of a new version
 * (server/events.js), in OBS as in Chrome, and the page takes its values —
 * unless it sent that version itself. Before the first send, the values
 * are the address itself (address.js), as they always were.
 */

import { Vault }         from '../../../core/vault.js';
import { requested }     from '../../../core/reopen.js';
import { thumbFromBlob } from '../../../core/thumb.js';
import { toQuery }       from './address.js';

const APP = 'rig/puppet';
const toBlob = c => (c.convertToBlob ? c.convertToBlob({ type: 'image/png' }) : new Promise(r => c.toBlob(r, 'image/png')));

/**
 * @param {object} o
 * @param {object} o.params                  the puppet's
 * @param {(values: object) => void} o.follow   a newer version's values, from elsewhere
 */
export function makeKeeping({ params, follow }) {
  let id = null, version = 0, unsent = 0, sending = false;

  document.addEventListener('vault:updated', async e => {
    const said = e.detail || {};
    if (sending || !id || said.id !== id || !(said.version > version)) return;
    version = said.version;
    const { object } = await Vault.load(id);
    const inner = (await import('../../../core/smart.js')).unwrap(object);
    unsent = 0;
    follow(inner.recipe || {});
  });

  return {
    get id() { return id; },
    get unsent() { return unsent; },

    /** `?open=<id>`, when the page was opened on a kept puppet: its values; null when it was not. */
    async open() {
      const was = await requested(APP);
      if (!was) return null;
      id = new URLSearchParams(location.search).get('open');
      version = was.object.version || 1;
      return was.object.recipe || {};
    },

    /** A change the page made, not yet sent. */
    changed() { if (!params.restoring) unsent++; },

    /**
     * Sent: saved, the first time a smart object, then its next version.
     *
     * @param {OffscreenCanvas|HTMLCanvasElement} picture   the avatar as worn now
     * @param {string} title
     * @returns {Promise<?object>}  the envelope, or null with no vault
     */
    async send(picture, title) {
      if (!(await Vault.refresh())) return null;
      if (!Vault.bound) Vault.bind({ type: 'params' });
      const blob = await toBlob(picture);
      sending = true;                         // its own new version, heard here too, is not followed
      try {
        const object = await Vault.save({
          type: 'params',
          title: `${title} · worn`,
          tags: ['rig', 'puppet'],
          origin: { app: APP, version: '1.0.0' },
          seed: null,
          recipe: params.values,
          parents: params.consumedObjectIds(),
          render: { blob, ext: 'png', w: picture.width, h: picture.height },
          thumb: await thumbFromBlob(blob),
        });
        if (!object) return null;
        id = object.id;
        version = object.version || 1;
        unsent = 0;
        return object;
      } finally {
        sending = false;
      }
    },

    /** The page's address: the kept puppet's, or its values while it is not kept. */
    address(obs = false) {
      return id ? `?open=${encodeURIComponent(id)}${obs ? '&obs' : ''}` : toQuery(params, { obs });
    },
  };
}
