/**
 * held.js — the last frame of the app going, held where it was until the
 * next app draws its first (S9c; docs/scene.md: "the canvas keeps the last
 * frame of the one going until the next draws its first, so the centre never
 * flashes empty").
 *
 * Each app keeps its own canvas, laid by the scene in one place — the
 * viewer's, the same for every app (style.css). So nothing of the canvas is
 * handed over and nothing asked of an app: as one is taken out, its frame is
 * copied onto a canvas of the scene's, over the spot it filled; the next
 * app's canvas is watched from the moment it is built, before the app starts
 * (core/mount.js `built`) — the first thing drawn on it, a clear included,
 * and the copy fades. One that never draws — a boot that failed — lets it go
 * after a few seconds.
 *
 * No DOM at import.
 */

const LONGEST_MS = 3000;    // a held frame outlives no app by more than this
const FADE_MS = 140;

/** What draws on a 2D canvas: the first of these called is the app's first frame. */
const DRAWS = ['clearRect', 'fillRect', 'drawImage', 'putImageData', 'fill', 'stroke', 'fillText'];

/** The canvas an app shows its picture on: its viewer's, the live stack's layers aside. */
export const stageOf = root => root && root.querySelector('.viewer-stage > canvas:not(.stack-layer)');

/**
 * @param {HTMLElement} scene   where the held frame is put: the scene's own element, never an app's
 * @returns {{ take: (root: ?HTMLElement) => void, watch: (root: HTMLElement) => void }}
 */
export function holdFrames(scene) {
  let copy = null;          // the frame held, on a canvas of the scene's

  /** The app going's frame, copied over where it is — before it is taken out. */
  function take(root) {
    if (copy) copy.remove();                 // one still held when another is taken: gone at once
    copy = null;
    const from = stageOf(root);
    const box = from && from.getBoundingClientRect();
    if (!box || box.width < 1 || box.height < 1 || !from.width || !from.height) return;
    const c = document.createElement('canvas');
    c.className = 'cl-held';
    c.width = from.width;
    c.height = from.height;
    try {
      c.getContext('2d').drawImage(from, 0, 0);
    } catch {
      return;                // nothing to copy: the centre is as it is
    }
    Object.assign(c.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' });
    scene.append(c);
    copy = c;
  }

  /** The next app's canvas, watched from its build: the held frame goes at its first drawing. */
  function watch(root) {
    if (!copy) return;
    const held = copy;
    const canvas = stageOf(root);
    let ctx = null;
    try { ctx = canvas && canvas.getContext('2d'); } catch { ctx = null; }
    let over = false, timer = null;
    const done = () => {
      if (over) return;
      over = true;
      if (ctx) for (const name of DRAWS) delete ctx[name];      // its own methods again, the prototype's
      clearTimeout(timer);
      fade(held);
    };
    if (ctx) {
      for (const name of DRAWS) {
        const draw = ctx[name];
        ctx[name] = function (...args) { done(); return draw.apply(this, args); };
      }
    }
    timer = setTimeout(done, ctx ? LONGEST_MS : 0);
  }

  function fade(c) {
    if (copy === c) copy = null;
    c.classList.add('cl-held--going');
    setTimeout(() => c.remove(), FADE_MS);
  }

  return { take, watch };
}
