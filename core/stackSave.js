/**
 * stackSave.js — the live stack saved as a page: a composition of smart
 * objects (M11, brick 6; docs/smart-objects.md, *The live stack*).
 *
 * Every window in the stack is asked to save itself as a smart object
 * (core/live.js `ask`, core/smart.js) — with its own save, title and lineage,
 * this window's own included — and the page is compose's recipe, `{ page,
 * place }`: what they kept, and the vault objects the stack already held,
 * bottom first, each at its transform, with its opacity and blend. Its
 * picture is compose's replay of it (core/rebuild.js), and it is compose's to
 * reopen. Since it places smart objects it follows them: a window that saves
 * again is drawn again on it, wherever it is placed.
 */

import { Vault }         from './vault.js';
import { openFrames }    from './rebuild.js';
import { toPng }         from './export.js';
import { thumbFromBlob } from './thumb.js';

/** A block as compose keeps it: by reference, at its latest — or the state the stack kept it at (L1) — simply there, its blend when it has one. */
export const placed = (block, ref) => ({
  ref, version: !block.live && Number.isInteger(block.version) ? block.version : 'latest', transform: { ...block.transform }, at: 0, length: null,
  ...(block.opacity != null && block.opacity < 1 ? { opacity: block.opacity } : {}),
  ...(block.blend && block.blend !== 'normal' ? { blend: block.blend } : {}),
});

/**
 * @param {object} opts
 * @param {object} opts.live          this window, core/live.js's
 * @param {object} opts.stack         this browser's stack, core/stack.js's
 * @param {(text: string) => void} opts.say
 * @returns {Promise<object>}         the composition, saved
 */
export async function saveStack({ live, stack, say }) {
  const { page, place } = stack.get();
  if (!page || !place.length) throw new Error('nothing is stacked');

  // Each window in it saves itself — a smart object, so the page follows it — in its own window.
  const blocks = [];
  for (const block of place) {
    if (!block.live) {
      blocks.push(placed(block, block.ref));
      continue;
    }
    const w = block.live === live.id ? live.mine() : live.windows().find(x => x.id === block.live);
    say(`saving the ${w ? w.app : 'a'} window as a smart object…`);
    const ref = await live.ask(block.live, 'save', { smart: true });
    if (!ref) throw new Error(`the ${w ? w.app : ''} window kept nothing`);
    blocks.push(placed(block, ref));
  }

  // The page, as compose keeps one: its size the stack's, no ground, no bleed.
  say('drawing the page…');
  const recipe = { page: { format: 'custom', width: page.width, height: page.height, bleed: 0, scale: 1, fps: 30, ground: 'none' }, place: blocks };
  const envelope = { type: 'composition', origin: { app: 'compose', version: '1.0.0' }, recipe, render: { w: page.width, h: page.height } };
  const handle = await openFrames(envelope);
  try {
    const frame = handle.frame(0);
    const canvas = new OffscreenCanvas(frame.width, frame.height);
    canvas.getContext('2d').drawImage(frame, 0, 0);
    const blob = await toPng(canvas);
    const moves = handle.length > 1;
    return await Vault.save({
      type: 'composition',
      title: `the stack, ${blocks.length} layers`,
      tags: ['compose', 'stack'],
      origin: envelope.origin,
      recipe,
      parents: [...new Set(blocks.map(b => b.ref))],
      render: { blob, ext: 'png', w: canvas.width, h: canvas.height,
                ...(moves ? { frames: handle.length, fps: handle.fps || 30, loop: true } : {}) },
      thumb: await thumbFromBlob(blob),
    });
  } finally {
    if (handle.dispose) handle.dispose();
  }
}
