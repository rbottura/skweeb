/**
 * motion.js — bones that move by themselves: a wave each, and what it
 * passes down its chain.
 *
 * A bone's wave turns it about its joint, back and forth: *swing* degrees
 * either way, *cycles* whole times a loop, starting at its *phase*. Whole
 * cycles make every loop close — frame `length` is frame 0, to the bit, as
 * the cycle is counted in whole frames before any sine is taken. A wave may
 * *follow* down its chain: each bone below it in the same stroke turns the
 * same way, a *lag* of phase later a step, so a stalk follows its base and
 * its tip comes last — follow-through, without physics: a function of the
 * frame alone, as particles are (docs/roadmap.md, M9).
 *
 * The waves add to the pose: the turns given by hand are where a bone swings
 * about. Pure: numbers in, numbers out.
 */

const RAD = Math.PI / 180;

/** A wave that does not move — none, or no swing. */
export const isStill = wave => !wave || !wave.swing;

/** A wave's turn at a frame of a loop `length` frames long, radians. */
export function waveAt(wave, frame, length) {
  if (isStill(wave) || !(length > 0)) return 0;
  const cycles = Math.max(1, Math.round(wave.cycles || 1));
  const step = ((cycles * Math.round(frame)) % length + length) % length;   // whole frames: frame `length` is frame 0
  return wave.swing * RAD * Math.sin((2 * Math.PI * step) / length + (wave.phase || 0) * RAD);
}

/** The bones below one in its chain — its stroke's — nearest first. */
export function chainBelow(bones, bone) {
  return bones.filter(b => b.stroke === bone.stroke && b.from > bone.from).sort((a, b) => a.from - b.from);
}

/**
 * Every bone's turn at a frame: the pose's, its own wave's, and the waves
 * that follow down to it from above in its chain, each a step later.
 *
 * @param {object[]} bones
 * @param {number[]} pose       turns by bone id, radians; missing is 0
 * @param {Array<?object>} waves   by bone id: { swing, cycles, phase, follow, lag } — degrees — or null
 * @param {number} frame
 * @param {number} length       frames a loop
 * @returns {number[]}          by bone id
 */
export function turnsAt(bones, pose, waves, frame, length) {
  const out = bones.map(b => pose[b.id] || 0);
  for (const b of bones) {
    const wave = waves[b.id];
    if (isStill(wave)) continue;
    out[b.id] += waveAt(wave, frame, length);
    if (!wave.follow) continue;
    chainBelow(bones, b).forEach((c, j) => {
      out[c.id] += waveAt({ ...wave, phase: (wave.phase || 0) - (j + 1) * (wave.lag || 0) }, frame, length);
    });
  }
  return out;
}

/** Whether anything moves: a wave with a swing on a bone that is there. */
export const moves = (bones, waves) => bones.some(b => !isStill(waves[b.id]));
