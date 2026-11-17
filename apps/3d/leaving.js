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

import { saveModel, downloadPicture, downloadFrames, downloadMesh, downloadSvg, APP } from './save.js';
import { saveSides } from './sides.js';
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
 * @returns {{save: () => Promise, busy: () => boolean, frames: HTMLButtonElement[]}}   `frames` what a still model hides: every frame's
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

  /** What a mesh's file held, said: and a cloud too big to bake, left out. */
  const meshSaid = out => `downloaded ${out.file} — ${out.shapes} shape${out.shapes === 1 ? '' : 's'}, ${out.points.toLocaleString('en')} points`
    + (out.left.length ? ` — left out, too many points: ${out.left.join(', ')}` : '');

  /** What an SVG held, said (vectors.js): its dots, and what it left out — or that there was no cloud to draw. */
  const vectorsSaid = out => {
    if (out.none) return 'no cloud of dots in the model — an SVG draws a cloud\'s dots';
    const notes = [out.others ? `${out.others} shape${out.others === 1 ? '' : 's'} not dots left out` : '',
      out.lit ? 'a lit cloud drawn flat' : '', out.lined ? 'its outline not drawn' : '', ...out.left].filter(Boolean);
    return `downloaded ${out.file} — ${out.dots.toLocaleString('en')} dots as circles` + (out.frames > 1 ? ` over ${out.frames} frames` : '')
      + (notes.length ? ` — ${notes.join(', ')}` : '');
  };

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
      // The model as meshes (G5, meshfile.js): a glTF with its colours and skins, or an OBJ, its surfaces alone.
      glb: () => leave(async args => meshSaid(await downloadMesh(args, 'glb'))),
      obj: () => leave(async args => meshSaid(await downloadMesh(args, 'obj'))),
      // Its clouds as vectors (G11, vectors.js): the frame on screen an SVG, every dot a circle; a turntable's every frame so.
      svg: () => leave(async args => vectorsSaid(await downloadSvg(args))),
      svgFrames: () => leave(async args => vectorsSaid(await downloadSvg({ ...args, every: true, onStatus: t => bar.say(t) }))),
    },
    // The model from every side, a character for the map's avatar to wear (sides.js, P6).
    acts: [{ id: 'sides', label: 'Save it from every side — a character', run: () => leave(async args => {
      const { set, sides } = await saveSides({ ...args, onStatus: t => bar.say(t) });
      return `saved ${sides.length} sides and their character — ${set.id}`;
    }) }],
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

  return { save, busy: () => busy, frames: [box.buttons.frames, box.buttons.svgFrames].filter(Boolean) };
}
