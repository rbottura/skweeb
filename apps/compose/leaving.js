/**
 * leaving.js — the ways out of compose: the page into the vault, a PNG or
 * every frame to disk (save.js, export.js), a print. One way out for all of
 * them: the page and every placement as a snapshot — a drag meanwhile cannot
 * change what leaves — drawn again from exact frames at the page's scale
 * (render.js), the player held still and the Export box's buttons resting,
 * nothing else started meanwhile. A page with an object that would not open,
 * or one still opening, does not leave. As the rig's (apps/rig/leaving.js).
 */

import { saveComposition } from './save.js';
import { exportPng, exportFrames } from './export.js';

/** What prints from its own pixels, stretched, since no app can draw it again. */
const stretchedNote = titles => (titles.length ? ` · stretched from their pixels: ${titles.join(', ')}` : '');

/**
 * @param {object} opts
 * @param {object} opts.bar                       core's Bar
 * @param {object} opts.clock                     the page's Playhead
 * @param {() => object} opts.page                the page's params
 * @param {() => object} opts.placements          what is on the page (placements.js)
 * @param {() => HTMLButtonElement[]} opts.buttons  the Export box's, resting while one draws
 * @param {() => void} opts.after                 once one is done, however it went: the vault read again
 * @returns {{ save: () => Promise, png: () => Promise, frames: () => Promise,
 *             leave: (doing: string, action: (recipe: object) => Promise<string>) => Promise, busy: () => boolean }}
 */
export function ways({ bar, clock, page, placements, buttons, after }) {
  let busy = false;

  async function leave(doing, action) {
    if (busy) return;
    const placed = placements();
    if (!placed.length) return bar.announce(`nothing to ${doing} — place something first`);
    const lost = placed.items.find(p => p.error);
    if (lost) return bar.announce(`${lost.title} could not be opened — take it off the page to ${doing}`);
    if (placed.items.some(p => !p.handle)) return bar.announce(`still opening — ${doing} once everything is in`);

    busy = true;
    for (const b of buttons()) b.disabled = true;
    clock.pause();
    try {
      const recipe = JSON.parse(JSON.stringify({ page: page().values, place: placed.blocks() }));
      bar.announce(await action(recipe));
    } catch (err) {
      console.error(`[compose] ${doing} failed:`, err);
      bar.announce(`${doing} failed: ${err.message}`);
    } finally {
      busy = false;
      for (const b of buttons()) b.disabled = false;
      after();
    }
  }

  return {
    leave,
    /** A save or an export is drawing the page again: the player waits, nothing else starts. */
    busy: () => busy,

    /** The composition, into the vault (save.js), its render the tick on screen. */
    save: () => leave('save', async recipe => {
      bar.say('saving — every object drawn again, at its size…');
      const object = await saveComposition(recipe, { tick: clock.tick });
      return object ? `saved ${object.id} — ${object.title}` : 'no vault — the page is downloaded instead';
    }),

    /** The page at the tick on screen, at its scale, as a PNG (export.js). */
    png: () => leave('export', async recipe => {
      bar.say('drawing the page at its scale…');
      const out = await exportPng(recipe, { tick: clock.tick });
      return `downloaded ${out.width} × ${out.height} px` + stretchedNote(out.stretched);
    }),

    /** Every frame of a page that moves, zipped with its rate (export.js). */
    frames: () => leave('export', async recipe => {
      const out = await exportFrames(recipe, { onStatus: t => bar.say(t) });
      return `downloaded ${out.frames} frames at ${out.fps} fps, ${out.width} × ${out.height} px — `
        + 'node scripts/frames-to-video.mjs makes the video' + stretchedNote(out.stretched);
    }),
  };
}
