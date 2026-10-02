/**
 * leaving.js — the ways out of the rig: into the vault, or a picture to
 * disk (save.js) — the clock held still while one draws, nothing else
 * started meanwhile, and what happened said on the bar.
 */

import { saveRig, downloadRig } from './save.js';
import { Vault } from '../../core/vault.js';

/**
 * @param {object} opts
 * @param {object} opts.bar              core's Bar
 * @param {object} opts.clock            the loop's Playhead
 * @param {() => ?object} opts.args      save.js's arguments as things are now, or null with no drawing
 * @returns {{save: () => Promise, download: () => Promise}}
 */
export function ways({ bar, clock, args }) {
  let busy = false;

  async function leave(action) {
    if (busy) return;
    const now = args();
    if (!now) return bar.announce('nothing to save: choose a drawing first');
    busy = true;
    const was = clock.playing;
    clock.pause();
    try {
      bar.announce(await action(now));
    } catch (err) {
      console.error('[rig] failed:', err);
      bar.announce('failed: ' + err.message);
    } finally {
      busy = false;
      if (was) clock.play();
      Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
    }
  }

  return {
    /** A pose or a loop into the vault. */
    save: () => leave(async now => {
      bar.say('saving…');
      const object = await saveRig(now);
      if (!object) return 'no vault — downloaded instead';
      return `saved ${object.id} — ${object.title}, ${object.render.w} × ${object.render.h} px`
        + (object.render.frames ? `, ${object.render.frames} frames at ${object.render.fps} fps` : '');
    }),
    /** The frame on screen as a PNG. */
    download: () => leave(async now => {
      const out = await downloadRig(now);
      return `downloaded ${out.width} × ${out.height} px`;
    }),
  };
}
