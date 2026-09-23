/**
 * vaultBridge.js
 * Sends what the gamepad saves to the vault on disk, with the recipe that made
 * it attached.
 *
 * Two tiers, deliberately. ImageStore stays what it always was — the in-browser
 * scratchpad, instant, private to this browser, gone if you clear site data.
 * The vault is the durable one: real files, a recipe, lineage, and something
 * another app can pick up. Saving writes both.
 *
 * On the seed: the envelope wants the integer every rng() was drawn from, and
 * this app has none. The gamepad draws exactly what you drew — the only
 * random() calls in it generate ids — so its renders already reproduce from
 * their recipe alone, and the seed is honestly null.
 *
 * On the recipe: settings alone do not make a drawing. A still carries the
 * marks that made it, taken from the recorder's buffer, which runs whether or
 * not a sequence is armed. Where the marks cannot account for the canvas —
 * an image was loaded underneath them — the object is a leaf and says so with
 * a null recipe rather than one that would render a different picture.
 */

import { Vault }         from '../../../core/vault.js';
import { thumbFromBlob } from '../../../core/thumb.js';
import * as BrushRegistry from '../../../core/registry.js';
import { ImageStore }       from './imageStore.js';
import * as StillFrame      from './stillFrame.js';
import { SequenceRecorder } from '../../../core/stage/recorder.js';

const APP = { app: 'gamepad', version: '1.0.0' };

/** Everything needed to draw this again, and nothing that is not. */
function recipeNow(sketch, entry) {
  if (!sketch.canvasIsReproducible()) return null;

  const family = BrushRegistry.familyMetaByIndex(sketch.familyIndex);
  const shot   = SequenceRecorder.snapshot();
  const frame  = StillFrame.lastFrame();

  return {
    /**
     * The surface the marks were drawn on — NOT the size of the render, which
     * since the still learned to crop is a window onto it. `entry.width` is
     * the cropped size, so it is no longer a usable fallback here.
     */
    canvas: {
      w: shot.w,
      h: shot.h,
      // What _saveImage() put under the ink: nothing, or white.
      background: sketch.params.saveGround === 'white' ? '#ffffff' : 'none',
    },

    /**
     * Which part of that canvas the render shows, and where it sits. Without
     * it a replay would redraw the whole canvas and believe it matched.
     */
    frame: frame ? { from: frame.from, to: frame.to, w: frame.width, h: frame.height } : null,
    brush: {
      familyId:     family ? family.id : null,
      familyIndex:  sketch.familyIndex,
      spriteIndex:  sketch.spriteIndex,
      patternIndex: sketch.patternIndex,
    },
    params: { ...sketch.params },
    marks: shot.events,
  };
}

document.addEventListener('imagestore:saved', async e => {
  const { entry } = e.detail;
  if (!entry || !entry.blob) return;

  try {
    // Imported here rather than at module scope: gamepadSketch builds its p5
    // instance on import, and this module is loaded before the sketch exists.
    const sketch = await import('../sketch/gamepadSketch.js');
    const thumb  = await thumbFromBlob(entry.blob);

    const recipe = recipeNow(sketch, entry);
    const object = await Vault.save({
      type:  'still',
      title: entry.label || 'Draw',
      tags:  recipe ? ['gamepad'] : ['gamepad', 'leaf'],
      origin: APP,
      recipe,
      seed:   null,
      render: { blob: entry.blob, ext: 'png', w: entry.width, h: entry.height, density: 1 },
      thumb,
    });

    if (object) {
      console.log('[vault] saved', object.id, object.type,
        recipe ? `- ${recipe.marks.length} marks` : '- leaf, no recipe (image loaded under the ink)');
    }
    else console.log('[vault] offline — downloaded instead');
  } catch (err) {
    console.warn('[vault] save failed, the scratchpad copy is unaffected:', err);
  }
});

document.addEventListener('vault:saved', () => _paint());
document.addEventListener('vault:duplicate', () => _paint());

/** One more field in the status bar, so the vault is visible while drawing. */
function _paint() {
  const el = document.getElementById('sb-vault');
  if (el) el.textContent = Vault.available ? `${Vault.index.length} in vault` : 'no vault';
}

Vault.refresh().then(_paint);

export { Vault, ImageStore };
