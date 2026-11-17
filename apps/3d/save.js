/**
 * save.js — what leaves the 3D app: a model into the vault, or its picture.
 *
 * A model saves as a `model` (docs/object-model.md): its recipe the panel's
 * values and its shapes, nothing else — never a vertex — and its render a
 * PNG of it from its own camera, drawn by frames.js at the format's size
 * times its scale, the code the replay runs, so the saved picture is the
 * replay's frame. `parents` are whatever the params name, read by
 * `consumedObjectIds()`: none yet, since a shape is made from nothing.
 *
 * A model on a turntable (motion.js) saves as its loop, a `sequence` — what
 * moves is, compose's rule — the same recipe, its picture the frame on
 * screen; every frame of it downloads as numbered PNGs for frames-to-video.
 */

import { readPalettes, palettesIn } from './palettes.js';
import { readEmitters, emittersIn } from './emitters.js';
import { readDrawn, drawnIn } from './drawn.js';
import { openModel }     from './frames.js';
import { Model }         from './scene.js';
import { glbOf, objOf } from './meshfile.js';
import { loopOf }        from './motion.js';
import { Vault }         from '../../core/vault.js';
import { thumbFromBlob } from '../../core/thumb.js';
import { toPng, download, runFrames, zipStore, frameName, crc32 } from '../../core/export.js';
import { SHAPES }        from './shapes.js';
import { layeredPng, openLayers, closeLayers, drawSide } from '../../core/layers-draw.js';
import { layersOf, holderOf, formatOf, across } from '../../core/layers.js';

export const APP = { app: '3d', version: '1.0.0' };

/** What it is, in words: its shapes, counted — "box, sphere ×2, torus". */
export function titleOf(shapes) {
  const counts = new Map();
  for (const s of shapes || []) {
    if (!s || s.on === false || !SHAPES[s.id]) continue;
    counts.set(s.id, (counts.get(s.id) || 0) + 1);
  }
  if (!counts.size) return 'an empty model';
  return [...counts].map(([id, n]) => SHAPES[id].label + (n > 1 ? ` ×${n}` : '')).join(', ');
}

/**
 * Save the model as it stands — on a turntable, its loop, the frame on screen its picture.
 *
 * @param {object} args  { params, shapes, renderer, tick } — `shapes` as the cards hold them, `tick` the frame on screen
 * @returns {Promise<?object>}   the envelope, or null when there is no vault
 */
export async function saveModel({ params, shapes, renderer, tick = 0 }) {
  return saveRecipe({ ...params.values, shapes }, { renderer, tick, parents: params.consumedObjectIds() });
}

/**
 * A recipe of the 3D app's drawn and saved: a `model`, or its loop a `sequence` — the app's S, its project's next
 * state; or, `state` false, an object of its own, a side of it (sides.js, P6).
 *
 * @param {object} recipe
 * @param {object} o   { renderer, tick, parents, state, title, tags } — `title` and `tags` over what it would say
 * @returns {Promise<?object>}
 */
export async function saveRecipe(recipe, { renderer, tick = 0, parents = [], state = true, title = null, tags = [] }) {
  const shapes = recipe.shapes || [];
  await readPalettes(recipe);                          // drawn in the vault's palettes its shapes name, as they are seen
  await readEmitters(recipe);                          // its clouds born on the objects they name (emitters.js)
  await readDrawn(recipe);                             // its bodies swept from the drawings they name (drawn.js)
  const frames = openModel(recipe, { renderer });
  try {
    const loop = frames.length > 1;           // it moves: a sequence — closing, or an evolution played once
    const shown = frames.frame(loop ? tick % frames.length : 0);
    const blob = await toPng(shown);
    const kinds = [...new Set(shapes.filter(s => s.on !== false && SHAPES[s.id]).map(s => s.id))];
    const how = loopOf(recipe);               // turning, or its shapes swinging (motion.js, P2)
    return await Vault.save({
      type: loop ? 'sequence' : 'model',
      state,                              // S: the project's next state, its smart object's (S6b, core/vault.js)
      title: title || titleOf(shapes) + (loop ? ` · ${how.evolves ? 'evolving' : how.turns ? 'turning' : 'swinging'} ×${frames.length}` : ''),
      tags: ['3d', ...kinds, ...(loop ? [...(frames.loop ? ['loop'] : []), ...(how.turns ? ['turntable'] : []), ...(how.swings ? ['swing'] : []),
        ...(how.evolves ? ['evolving'] : [])] : []), ...tags],
      origin: APP,
      seed: null,
      recipe,
      // …and the palettes its shapes are drawn in, the objects its clouds are born on
      parents: [...new Set([...parents, ...palettesIn(recipe), ...emittersIn(recipe), ...drawnIn(recipe)])],
      render: { blob, ext: 'png', w: shown.width, h: shown.height,
                ...(loop ? { frames: frames.length, fps: frames.fps, loop: frames.loop } : {}) },
      thumb: await thumbFromBlob(blob),
    });
  } finally {
    frames.dispose();
  }
}

/** The picture at the format's size times its scale, as a PNG — the frame on screen: drawn again, not the preview enlarged. */
export async function downloadPicture({ params, shapes, renderer, tick = 0 }) {
  const recipe = { ...params.values, shapes };
  await readPalettes(recipe);
  await readEmitters(recipe);
  await readDrawn(recipe);
  const frames = openModel(recipe, { renderer });
  try {
    const shown = frames.frame(frames.length > 1 ? tick % frames.length : 0);
    download(await layeredPng(await toPng(shown), recipe), `model_${shown.width}x${shown.height}.png`);   // its layers round it (L13)
    return { width: shown.width, height: shown.height };
  } finally {
    frames.dispose();
  }
}

/**
 * The model as meshes to disk (G5, meshfile.js): a binary glTF — its shapes, their colours, a drawn body's skin —
 * or an OBJ, its surfaces alone. At rest, every shape shown; what is read beside the values read first.
 *
 * @returns {Promise<{file: string, shapes: number, points: number, left: string[]}>}
 */
export async function downloadMesh({ params, shapes }, kind = 'glb') {
  const recipe = { ...params.values, shapes };
  await readPalettes(recipe);
  await readEmitters(recipe);
  await readDrawn(recipe);
  const model = new Model().update(recipe);
  try {
    const name = titleOf(shapes) || 'model';
    const file = name.replace(/[^\w\- ]+/g, ' ').trim().replace(/\s+/g, '-').slice(0, 60) || 'model';
    if (kind === 'obj') {
      const out = objOf(model, name);
      download(new Blob([out.text], { type: 'text/plain' }), `${file}.obj`);
      return { ...out, file: `${file}.obj` };
    }
    const out = await glbOf(model, { name, png: async picture => new Uint8Array(await (await toPng(picture)).arrayBuffer()) });
    download(new Blob([out.bytes], { type: 'model/gltf-binary' }), `${file}.glb`);
    return { ...out, file: `${file}.glb` };
  } finally {
    model.dispose();
  }
}

/**
 * The model as vectors (G11, vectors.js): the frame on screen an SVG, its clouds' dots circles where its PNG has
 * them, its layers round them as a save lays them — or, `every`, a turntable's every frame so, numbered, and its rate
 * in `meta.json`, zipped. A model with no cloud leaves nothing, and says so: `none`.
 *
 * @returns {Promise<object>}   { file, frames, dots, clouds, others, lit, lined, left } — or { none: true }
 */
export async function downloadSvg({ params, shapes, renderer, tick = 0, every = false, onStatus = () => {} }) {
  const recipe = { ...params.values, shapes };
  await readPalettes(recipe);
  await readEmitters(recipe);
  await readDrawn(recipe);
  const frames = openModel(recipe, { renderer });
  const opened = await openLayers(layersOf(recipe));
  try {
    const fmt = formatOf(holderOf(recipe), { width: frames.width, height: frames.height });
    const px = frames.width / across(fmt), title = titleOf(shapes);
    const svgAt = i => frames.svg(i, { title: `${title}${frames.length > 1 ? ` · frame ${i + 1}` : ''}`,
      behind: ctx => drawSide(ctx, opened, 'behind', fmt, px, i), front: ctx => drawSide(ctx, opened, 'front', fmt, px, i) });
    const stem = title.replace(/[^\w\- ]+/g, ' ').trim().replace(/\s+/g, '-').slice(0, 60) || 'model';
    const named = i => frameName(i, frames.length).replace(/\.png$/, '.svg');
    if (!every) {
      const i = frames.length > 1 ? tick % frames.length : 0;
      const out = svgAt(i);
      if (!out.clouds) return { none: true };
      const file = `${stem}${frames.length > 1 ? '_' + named(i) : '.svg'}`;
      download(new Blob([out.text], { type: 'image/svg+xml' }), file);
      return { ...out, file, frames: 1 };
    }
    const entries = [], sum = { dots: 0, clouds: 0, others: 0, lit: 0, lined: false, left: new Set() };
    await runFrames({
      count: frames.length,
      async frame(i) {
        const out = svgAt(i);
        const bytes = new TextEncoder().encode(out.text);
        entries.push({ name: named(i), blob: new Blob([bytes], { type: 'image/svg+xml' }), crc: crc32(bytes), size: bytes.length });
        sum.dots += out.dots;
        Object.assign(sum, { clouds: out.clouds, others: out.others, lit: out.lit, lined: out.lined });
        out.left.forEach(l => sum.left.add(l));
      },
      onProgress: (done, total) => onStatus(`writing ${done}/${total} frames…`),
    });
    if (!sum.clouds) return { none: true };
    entries.push({ name: 'meta.json', bytes: new TextEncoder().encode(JSON.stringify({
      app: APP.app, frames: frames.length, fps: frames.fps, loop: frames.loop, width: frames.width, height: frames.height, recipe,
    }, null, 1)) });
    const file = `${stem}_${frames.length}_frames_svg.zip`;
    download(zipStore(entries), file);
    return { ...sum, file, frames: frames.length, left: [...sum.left] };
  } finally {
    closeLayers(opened);
    frames.dispose();
  }
}

/** A frame's PNG as a zip entry by reference: its bytes counted once and let go. */
async function entry(name, canvas) {
  const blob = await toPng(canvas);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { name, blob, crc: crc32(bytes), size: bytes.length };
}

/** A turntable's every frame as numbered PNGs, and its rate in `meta.json`, for frames-to-video. */
export async function downloadFrames({ params, shapes, renderer, onStatus = () => {} }) {
  const recipe = { ...params.values, shapes };
  await readPalettes(recipe);
  await readEmitters(recipe);
  await readDrawn(recipe);
  const frames = openModel(recipe, { renderer });
  try {
    const entries = [];
    await runFrames({
      count: frames.length,
      async frame(i) { entries.push(await entry(frameName(i, frames.length), frames.frame(i))); },
      onProgress: (done, total) => onStatus(`drawing ${done}/${total} frames…`),
    });
    entries.push({ name: 'meta.json', bytes: new TextEncoder().encode(JSON.stringify({
      app: APP.app, frames: frames.length, fps: frames.fps, loop: frames.loop, width: frames.width, height: frames.height, recipe,
    }, null, 1)) });
    download(zipStore(entries), `model_${titleOf(shapes).replace(/\W+/g, '-')}_${frames.length}_frames.zip`);
    return { frames: frames.length, fps: frames.fps };
  } finally {
    frames.dispose();
  }
}
