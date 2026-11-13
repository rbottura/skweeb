/**
 * starters.js — a few chains to open: each a row of data.
 *
 * A starter is what a recipe is — the loop's values and a chain — with a
 * name and a line on what it shows. Each is the same few moves in other
 * amounts (docs/vfx.md, *How a shader is made*): a noise, scrolled; a second
 * multiplied over it, scrolling at another pace, so the motion never
 * repeats inside the loop; a mask giving it a shape; a gradient map for its
 * colours. Written for skweeb from the technique, with the kit's own
 * filters — nothing here is code from elsewhere (rule 5).
 *
 * The last is a *life*, played once: a burst that a dissolve eats from its
 * dark parts up, birth to death (M15d) — what a particle will wear.
 */

const row = (id, params = {}) => ({ id, params, on: true });

export const STARTERS = [
  {
    id: 'fire',
    label: 'fire',
    about: 'two noises rising at two paces, multiplied; darker upwards; masked by a soft disc; coloured black to white through red',
    values: { time: 'loop', frames: 48, fps: 24, seed: 7 },
    chain: [
      row('noise', { cells: 4, octaves: 4, contrast: 1.6, scrollY: -1 }),
      row('noise', { cells: 6, octaves: 3, contrast: 1.8, variant: 1, scrollY: -2, blend: 'multiply' }),
      row('brightness', { amount: 0.22 }),
      row('gradient', { kind: 'along', angle: 90, blend: 'multiply' }),
      row('shape', { kind: 'disc', size: 0.95, soft: 0.85, y: 0.62, blend: 'mask' }),
      row('gradientmap', { colours: ['#000000', '#7a1200', '#ff5a00', '#ffd60a', '#fffdf6'] }),
    ],
  },
  {
    id: 'smoke',
    label: 'smoke',
    about: 'the same two noises, slower and softer, drifting sideways as they rise; a disc all soft; greys',
    values: { time: 'loop', frames: 96, fps: 24, seed: 3 },
    chain: [
      row('noise', { cells: 3, octaves: 5, rough: 0.55, contrast: 1.3, scrollY: -1 }),
      row('noise', { cells: 5, octaves: 3, contrast: 1.4, variant: 1, scrollX: 1, scrollY: -1, blend: 'multiply' }),
      row('brightness', { amount: 0.2 }),
      row('shape', { kind: 'disc', size: 1, soft: 1, blend: 'mask' }),
      row('gradientmap', { colours: ['#000000', '#3a3a3a', '#bdbdbd'] }),
    ],
  },
  {
    id: 'energy',
    label: 'energy',
    about: 'rays turning about the centre, a noise sliding through them, rings leaving it; masked by a ring; blues',
    values: { time: 'loop', frames: 48, fps: 24, seed: 11 },
    chain: [
      row('gradient', { kind: 'about', repeats: 6, mirror: true, scroll: 1 }),
      row('noise', { cells: 5, octaves: 3, contrast: 2, scrollX: 1, blend: 'multiply' }),
      row('gradient', { kind: 'round', repeats: 3, mirror: true, scroll: -1, blend: 'screen', amount: 0.5 }),
      row('shape', { kind: 'ring', size: 0.8, width: 0.45, soft: 0.6, blend: 'mask' }),
      row('gradientmap', { colours: ['#000010', '#1b3cff', '#4de1ff', '#ffffff'] }),
    ],
  },
  {
    id: 'burst',
    label: 'a burst, dissolving',
    about: 'a life, played once: a fire\'s two noises, warped, in a disc and in colour — then eaten away from its dark parts up, a hot rim at the edge, its core glowing',
    values: { time: 'life', frames: 32, fps: 24, seed: 5 },
    chain: [
      row('noise', { cells: 4, octaves: 4, contrast: 1.6, scrollY: -1 }),
      row('noise', { cells: 6, octaves: 3, contrast: 1.8, variant: 1, scrollY: -1, blend: 'multiply' }),
      row('brightness', { amount: 0.3 }),
      row('warp', { amount: 0.05, cells: 3, scrollY: -1 }),
      row('shape', { kind: 'disc', size: 0.9, soft: 0.7, blend: 'mask' }),
      row('gradientmap', { colours: ['#000000', '#7a1200', '#ff5a00', '#ffd60a', '#fffdf6'] }),
      row('dissolve', { ease: 'inCubic', soft: 0.05, rim: 0.1, colour: '#fff1b8' }),
      row('glow', { threshold: 0.55, radius: 10, strength: 0.8 }),
    ],
  },
];

/** What the app opens on: one noise, the first thing a surface is made of. */
export const FIRST = [row('noise')];
