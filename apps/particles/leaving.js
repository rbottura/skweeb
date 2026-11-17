/**
 * leaving.js — the ways out of particles: the loop, or the frame on screen
 * as a still, into the vault; a sprite sheet or every frame to disk
 * (save.js); a print — the player held still while one draws, nothing else
 * started meanwhile, and what happened said on the bar. As the rig's
 * (apps/rig/leaving.js).
 */

import { saveParticles, downloadFrames, downloadSheet, downloadSvg } from './save.js';

/** What an SVG held, said: its dots, its pictures, and what a vector could not hold (core/svg-canvas.js). */
const vectorsSaid = out => `downloaded ${out.file} — `
  + ([out.dots ? `${out.dots.toLocaleString('en')} dots as circles` : '', out.pictures ? `${out.pictures.toLocaleString('en')} pictures placed` : '']
    .filter(Boolean).join(', ') || 'nothing drawn')
  + (out.frames > 1 ? ` over ${out.frames} frames` : '') + (out.left.length ? ` — not in it: ${out.left.join(', ')}` : '');

/**
 * @param {object} opts
 * @param {object} opts.bar               core's Bar
 * @param {object} opts.clock             the picture's Playhead
 * @param {() => object} opts.args        save.js's arguments as things are now: the panels, and what they name, loaded
 * @param {() => boolean} opts.loading    whether any of that is still on its way in
 * @param {() => void} opts.after         once one is done, however it went: the vault read again, the picture drawn
 * @returns {{ save: (o?: {still?: boolean}) => Promise, sheet: () => Promise, frames: () => Promise, svg: () => Promise, svgFrames: () => Promise,
 *             leave: (action: () => Promise<string>) => Promise, busy: () => boolean }}
 */
export function ways({ bar, clock, args, loading, after }) {
  let busy = false;

  /** One way out for all three: the player held still, nothing else started meanwhile. */
  async function leave(action) {
    if (busy) return;
    if (loading()) return bar.announce('what it is drawn with is still loading — a moment');
    busy = true;
    clock.pause();
    try {
      bar.announce(await action());
    } catch (err) {
      console.error('[particles] failed:', err);
      bar.announce('failed: ' + err.message);
    } finally {
      busy = false;
      after();
    }
  }

  return {
    leave,
    /** A save or a download is drawing: nothing else starts. */
    busy: () => busy,

    /** The loop, or the frame on screen as a still, into the vault. */
    save: ({ still = false } = {}) => leave(async () => {
      bar.say('saving…');
      const tick = clock.tick;
      const object = await saveParticles({ ...args(), tick, still });
      if (!object) return 'no vault — downloaded instead';
      return still ? `saved ${object.id} — frame ${tick + 1}, a still`
        : `saved ${object.id} — ${object.render.frames} frames at ${object.render.fps} fps, its picture frame ${tick + 1}`;
    }),

    /** The loop as a sprite sheet and its JSON, cropped to where the particles reach. */
    sheet: () => leave(async () => {
      const out = await downloadSheet({ ...args(), onStatus: t => bar.say(t) });
      return `downloaded ${out.name} — ${out.frames} frames of ${out.box.w} × ${out.box.h} on a `
        + `${out.width} × ${out.height} sheet, and its JSON`;
    }),

    /** The frame on screen as vectors, an SVG (G11); or every frame so, zipped with its rate. */
    svg: () => leave(async () => vectorsSaid(await downloadSvg({ ...args(), tick: clock.tick }))),
    svgFrames: () => leave(async () => vectorsSaid(await downloadSvg({ ...args(), every: true, onStatus: t => bar.say(t) }))),

    /** Every frame, zipped with its rate. */
    frames: () => leave(async () => {
      const out = await downloadFrames({ ...args(), onStatus: t => bar.say(t) });
      return `downloaded ${out.frames} frames at ${out.fps} fps, ${out.width} × ${out.height} px — `
        + 'node scripts/frames-to-video.mjs makes the video';
    }),
  };
}
