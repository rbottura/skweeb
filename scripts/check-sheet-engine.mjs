#!/usr/bin/env node
/**
 * scripts/check-sheet-engine.mjs — a particles sprite sheet, loaded by a game engine.
 *
 *   node scripts/check-sheet-engine.mjs
 *
 * M6's *Done when* says "sprite sheets a game engine loads", and nothing else
 * checks the engine end of that. This builds the default torch's sheet with
 * the particles app's own code (frames.js, core/spritesheet.js) and hands the
 * PNG and its JSON to Phaser 3 — `load.aseprite`, which reads Aseprite's
 * array export, frame tags and durations — in the same headless Chrome, then
 * asks Phaser what it made of them: the frames, their size, the animation
 * the tag became, its length in time, and whether a sprite plays it.
 *
 * Phaser is fetched from jsDelivr into the check's page only: nothing is
 * installed, nothing enters the repo (rule 6, and no dependencies). With no
 * network the check says so and passes nothing, rather than failing.
 */

import { startCheck } from './check-kit.mjs';

const PHASER = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';

const c = await startCheck();
const { page } = c;

await c.go(c.base + '/apps/particles/');
await page.until(`(document.querySelector('.bar-say')?.textContent || '').includes('alive')`, { timeout: 20000 });

const loaded = await page.eval(`new Promise(resolve => {
  const s = document.createElement('script');
  s.src = ${JSON.stringify(PHASER)};
  s.onload = () => resolve(!!window.Phaser);
  s.onerror = () => resolve(false);
  document.head.append(s);
})`);
if (!loaded) {
  console.log('skipped: Phaser did not load from ' + PHASER + ' — no network?');
  await c.finish();
}

const got = await page.eval(`(async () => {
  const { emitParams, pictureParams } = await import('/apps/particles/params.js');
  const { openParticles } = await import('/apps/particles/frames.js');
  const { buildSheet } = await import('/core/spritesheet.js');

  // The app's defaults — the torch it opens on — on no ground, as its sheet is drawn.
  const recipe = { emit: emitParams().values, picture: { ...pictureParams().values, ground: 'none' } };
  const frames = openParticles(recipe, null);
  const name = 'torch';
  const { canvas, json } = await buildSheet({ count: frames.length, frame: i => frames.frame(i), fps: frames.fps, name, loop: frames.loop });
  const png = URL.createObjectURL(await canvas.convertToBlob({ type: 'image/png' }));
  const want = { frames: json.frames.length, w: json.frames[0].frame.w, h: json.frames[0].frame.h,
                 ms: json.frames.reduce((a, f) => a + f.duration, 0) };

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden';
  document.body.append(host);

  return await new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('Phaser did not create its scene in 20 s')), 20000);
    new Phaser.Game({
      type: Phaser.CANVAS, parent: host, width: 256, height: 512, transparent: true, banner: false,
      audio: { noAudio: true },
      scene: {
        preload() { this.load.aseprite(name, png, json); },
        create() {
          const tex = this.textures.get(name);
          const f0 = tex.get(name + ' 0');
          const anims = this.anims.createFromAseprite(name);
          const anim = anims[0];
          const sprite = this.add.sprite(128, 256, name).play({ key: anim.key, repeat: -1 });
          setTimeout(() => resolve({
            want,
            texture: tex.key !== '__MISSING',
            names: tex.getFrameNames().length,
            f0: f0 ? [f0.width, f0.height] : null,
            anims: anims.map(a => a.key),
            animFrames: anim.frames.length,
            ms: anim.frames.reduce((a, f) => a + (f.duration || 0), 0) || anim.duration,
            playing: sprite.anims.isPlaying,
            at: sprite.anims.currentFrame ? sprite.anims.currentFrame.index : 0,
          }), 600);
        },
      },
    });
  });
})()`);

const { want } = got;
c.ok('Phaser loads the sheet as a texture', got.texture, `Phaser ${await page.eval('Phaser.VERSION')}`);
c.ok('with every frame the JSON names', got.names === want.frames, `${got.names} of ${want.frames}`);
c.ok('each the size of the crop', JSON.stringify(got.f0) === JSON.stringify([want.w, want.h]), JSON.stringify(got.f0));
c.ok('the loop\'s tag becomes one animation', got.anims.length === 1 && got.anims[0] === 'torch', JSON.stringify(got.anims));
c.ok('of every frame', got.animFrames === want.frames, `${got.animFrames} frames`);
c.ok('lasting the loop, to the millisecond', got.ms === want.ms, `${got.ms} ms, the sheet says ${want.ms}`);
c.ok('and a sprite plays it', got.playing && got.at > 1, `at frame ${got.at} after 0.6 s`);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
