/**
 * exportSequence.js
 * Turn a layer on the stage into a sequence object in the vault.
 *
 * A fresh SequencePlayer is built for the export rather than reusing the one
 * on screen: the export runs at its own scale, and stepping the live player
 * would move the composition under the user.
 *
 * The frame loop is the one the player was written for. reset() renders tick
 * zero, step() advances and renders — so frame zero is captured before the
 * first step, not after it.
 *
 * Which frame is kept as the still is a real decision, not a detail — see
 * representativeTick(). It is not the last one.
 */

import { SequencePlayer } from '../../../core/stage/player.js';
import { representativeTick } from '../../../core/stage/clip.js';
import { p5Instance }     from '../sketch/gamepadSketch.js';
import { captureFrames, zipStore, frameName, download } from '../../../core/export.js';
import { Vault }          from '../../../core/vault.js';
import { thumbFromBlob }  from '../../../core/thumb.js';

const APP = { app: 'gamepad', version: '1.0.0' };

/**
 * @param {object} layer      a stage layer
 * @param {object} [opts]
 * @param {number} [opts.scale=1]        1 is screen, raise it for print
 * @param {number} [opts.fps=30]
 * @param {boolean} [opts.keepFrames]    also hand back a zip of the frames
 * @param {(done:number,total:number)=>void} [opts.onProgress]
 * @returns {Promise<{object:?object, frames:number}>}
 */
export async function exportLayerToVault(layer, opts = {}) {
  const { scale = 1, fps = 30, keepFrames = false, onProgress } = opts;

  const clip = layer && layer.player && layer.player.clip;
  if (!clip) throw new Error('export: that layer has no clip');

  const player = new SequencePlayer(p5Instance());
  try {
    player.load(clip, { renderScale: scale });
    player.reset();

    const count = player.length;
    if (!count) throw new Error('export: the clip is empty');

    const frames = await captureFrames({
      count,
      draw: i => {
        if (i > 0) player.step();
        return player.buffer.canvas;
      },
      onProgress,
    });

    const still = frames[Math.min(representativeTick(clip), frames.length - 1)];
    const thumb = await thumbFromBlob(still);
    const buf   = player.buffer;

    const object = await Vault.save({
      type:  'sequence',
      title: titleFor(clip),
      tags:  ['gamepad', 'loop'],
      origin: APP,
      seed:  null,
      recipe: {
        // The treatment and the recording it treats, inlined — a clip is cheap
        // plain data and survives a round trip through JSON by design.
        clip: {
          overrides: clip.overrides,
          timing:    clip.timing,
          window:    clip.window,
        },
        sequence: {
          w: clip.sequence.w,
          h: clip.sequence.h,
          events: clip.sequence.events,
        },
        bounds: player.bounds,
        scale,
      },
      render: {
        blob: still, ext: 'png',
        w: buf.width, h: buf.height, density: scale,
        frames: count, fps, loop: !!clip.timing.loop,
      },
      thumb,
    });

    if (keepFrames) {
      const entries = [];
      for (let i = 0; i < frames.length; i++) {
        entries.push({
          name: frameName(i, frames.length),
          bytes: new Uint8Array(await frames[i].arrayBuffer()),
        });
      }
      download(zipStore(entries), (object ? object.id : 'sequence') + '_frames.zip');
    }

    return { object, frames: count };
  } finally {
    player.dispose();
  }
}

function titleFor(clip) {
  const rule = clip.window && clip.window.rule ? clip.window.rule : 'loop';
  const n = clip.sequence.events.length;
  return rule + ' ' + n + ' marks';
}
