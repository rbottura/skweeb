/**
 * leaving.js — the ways out of the 3D app: into the vault, a picture or
 * every frame of a turntable to disk (save.js), a print (core/PrintPanel.js),
 * a window of the stack (core/StackPanel.js) — the clock held still while
 * one draws, so the frame on screen is the one that leaves, nothing else
 * started meanwhile, what happened said on the bar.
 *
 * Split from main.js when the turntable took it past 400 lines, along the
 * seam the rig's has (apps/rig/leaving.js): what it reads of the app is
 * handed to it as functions, `now()` and `after()`, and it holds only its
 * own `busy`.
 */

import { saveModel, downloadPicture, downloadFrames, APP } from './save.js';
import { PrintPanel }  from '../../core/PrintPanel.js';
import { exportBox }   from '../../core/boxes/export.js';
import { stackDrawer } from '../../core/StackPanel.js';

/**
 * The Export drawer, its print, and the stack's window, built in `panel`.
 *
 * @param {object} panel           the app's ParamPanel
 * @param {object} o
 * @param {object} o.bar           core's Bar
 * @param {object} o.params        the app's values
 * @param {object} o.clock         the turntable's Playhead (motion.js)
 * @param {() => {shapes: object[], renderer: ?object, why: string}} o.now   what leaves as things are now —
 *                                 `why` nothing draws, when there is no renderer
 * @param {() => void} o.after     a way out ended: the vault's count, the picture again
 * @returns {{save: () => Promise, busy: () => boolean, frames: ?HTMLButtonElement}}
 */
export function ways(panel, { bar, params, clock, now, after }) {
  let busy = false;

  /** One way out: nothing else started, the clock held still, what happened said. */
  async function leave(action) {
    if (busy) return;
    const it = now();
    if (!it.renderer) return bar.announce('nothing draws here — ' + it.why);
    busy = true;
    clock.pause();
    try {
      bar.announce(await action({ params, shapes: it.shapes, renderer: it.renderer, tick: clock.tick }));
    } catch (err) {
      console.error('[3d] failed:', err);
      bar.announce('failed: ' + err.message);
    } finally {
      busy = false;
      after();
    }
  }

  /** The model as it stands into the vault — on a turntable, its loop (save.js). */
  const save = () => leave(async args => {
    bar.say('saving…');
    const object = await saveModel(args);
    if (!object) return 'no vault — downloaded instead';
    return `saved ${object.id} — ${object.title}`;
  });

  const box = exportBox(panel, {
    before: 'format',
    vault: { save },
    disk: {
      picture: () => leave(async args => {
        bar.say('drawing…');
        const out = await downloadPicture(args);
        return `downloaded ${out.width} × ${out.height} px`;
      }),
      // A turntable's every frame, for frames-to-video; hidden while nothing turns (main.js `fitClock`).
      frames: () => leave(async args => {
        const out = await downloadFrames({ ...args, onStatus: t => bar.say(t) });
        return `downloaded ${out.frames} frames at ${out.fps} fps — node scripts/frames-to-video.mjs makes the video`;
      }),
    },
  });

  // A print: the model as it stands — on a turntable, the frame on screen — drawn again at a sheet's size and a
  // dpi a window at a time (frames.js `window`), no preview, one file. Its rows are its own, never the recipe's;
  // a print format chosen in the Format drawer becomes its sheet.
  const printing = new PrintPanel({
    mount: box.drawer.body, app: '3d', leave, say: text => bar.say(text), format: params.values.format, tick: () => clock.tick,
    object: () => {
      const it = now();
      return it.renderer && {
        type: 'model', origin: APP, recipe: { ...params.values, shapes: it.shapes },
        render: { w: Math.round(params.values.width * params.values.scale), h: Math.round(params.values.height * params.values.scale) },
      };
    },
  });
  params.on(key => { if (key === 'format') printing.follow(params.values.format); });
  // A window of the stack (core/live.js): what is on screen, as its print has it.
  stackDrawer(panel, { app: '3d', layer: () => printing.object(), clock, save });

  return { save, busy: () => busy, frames: box.buttons.frames || null };
}
