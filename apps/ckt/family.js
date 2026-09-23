/**
 * family.js — ckt → gamepad: brush family. M3's link.
 *
 * `gamepad_sprites/GaramondI/Garam_blue` is 58 PNGs named 0.png to 57.png:
 * the 58 glyphs of the `garam` dataset, each drawn with a sprite on every dot,
 * cut out, and dropped into the gamepad as a folder. It was run by hand once
 * and frozen, with no record of how. This runs that chain and keeps the
 * record: every glyph of the dataset stage two is drawing, rendered with the
 * recipe on screen, becomes a `shape`, and the shapes in order become a `set`
 * — which the gamepad already turns into a brush family (core/registry.js,
 * `familyFromSet`).
 *
 * ── What changes per member, and what does not ──────────────────────────────
 *
 * Each member's recipe is the recipe on screen with four keys set: its
 * `glyph`, the `tick` on screen, `ground: 'none'`, and `format: 'content'`. A brush is ink on nothing, cropped to the ink — a glyph on an
 * opaque rectangle would stamp as a rectangle. Everything else — sprite, size,
 * tether, where the attractor is at the frame you are looking at — is what you
 * chose, so the family looks like the glyph on screen, in every letter. And
 * each member can re-render itself, because its recipe is complete.
 *
 * Order is the contract. A recorded gamepad mark names its sprite by number,
 * so members are saved and listed in glyph order and nothing reorders them.
 *
 * With no vault it is still the chain, just the old ending: a zip of 0.png to
 * N.png, the shape of the hand-made folders, to drop into gamepad_sprites/.
 */

import { centre }       from './motion.js';
import { framing, renderFrame } from './render.js';
import { glyphOf }      from './datasets.js';
import { APP }          from './save.js';
import { Vault }        from '../../core/vault.js';
import { thumbFromBlob, thumbFromCanvas } from '../../core/thumb.js';
import { toPng, zipStore, download } from '../../core/export.js';
import { contactSheet } from '../../core/sheet.js';

/**
 * One glyph as a brush: the recipe on screen, cut out, at the frame on screen.
 * `tick` makes it a still — see save.js — so it replays as exactly this and
 * `ink` crops it to this frame's dots.
 */
export function memberRecipe(recipe, glyph, tick) {
  return { ...recipe, glyph, tick: Math.round(tick), ground: 'none', format: 'content' };
}

/**
 * Render every glyph and save them as a family.
 *
 * @param {object} args
 * @param {object} args.params         stage two's Params
 * @param {number[][][]} args.data     the dataset on screen
 * @param {?CanvasImageSource} args.mark
 * @param {number} args.tick           the frame on screen — every member is drawn at it
 * @param {string} args.name           what to call the family
 * @param {boolean} [args.leaf]        the dataset is in memory only: no recipe can name it
 * @param {(text:string)=>void} [args.onStatus]
 * @returns {Promise<{set: ?object, members: number}>}
 */
export async function emitFamily({ params, data, mark, tick, name, leaf = false,
                                   onStatus = () => {} }) {
  const base = params.values;
  const parents = params.consumedObjectIds();
  const online = await Vault.refresh();

  const blobs = [];
  const members = [];

  for (let g = 0; g < data.length; g++) {
    const recipe = memberRecipe(base, g, tick);
    const world = { width: recipe.width, height: recipe.height };
    const anchors = centre(glyphOf(data, g), world);
    const frame = framing(recipe, anchors, mark);
    const { canvas } = renderFrame({ recipe, anchors, mark, tick: recipe.tick, frame });
    const blob = await toPng(canvas);
    blobs.push(blob);

    if (online) {
      const object = await Vault.save({
        type: 'shape',
        title: `${name} ${g}`,
        // Filed in a folder named for the family: 58 brushes are one entry
        // in the vault panel, and the set beside them is the thing to open.
        tags: ['ckt', 'brush', name, 'folder:' + name],
        origin: APP,
        seed: null,
        recipe: leaf ? null : recipe,
        parents,
        render: { blob, ext: 'png', w: canvas.width, h: canvas.height, density: frame.sx },
        thumb: await thumbFromBlob(blob),
      });
      members.push(object.id);
    }
    onStatus(`brush ${g + 1}/${data.length}…`);
  }

  if (!online) {
    const entries = await Promise.all(blobs.map(async (b, i) => ({
      name: `${name}/${i}.png`, bytes: new Uint8Array(await b.arrayBuffer()),
    })));
    download(zipStore(entries), `${name}.zip`);
    return { set: null, members: blobs.length };
  }

  onStatus('saving the set…');
  const bitmaps = await Promise.all(blobs.map(b => createImageBitmap(b)));
  const sheet = contactSheet(bitmaps);
  for (const b of bitmaps) if (b.close) b.close();
  const sheetBlob = await toPng(sheet);

  const set = await Vault.save({
    type: 'set',
    title: name,
    tags: ['ckt', 'brush-family'],
    origin: APP,
    seed: null,
    recipe: { members, role: 'brush-family' },
    parents,
    render: { blob: sheetBlob, ext: 'png', w: sheet.width, h: sheet.height },
    thumb: await thumbFromCanvas(sheet),
  });

  return { set, members: members.length };
}
