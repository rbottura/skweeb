/**
 * stack.js — the live stack: one composition per browser that its windows
 * share (M11; docs/smart-objects.md, *The live stack*).
 *
 * `{ page, place }`, as a composition's recipe is: a page, and its blocks
 * bottom first — each a window by `live` or a vault object by `ref`, with
 * its `transform` and, when they are not 1 and normal, its `opacity` and
 * `blend` (core/blend.js). Every window keeps a copy. A change is the whole
 * stack again, with a count one past the one it changed; the highest count
 * wins, a tie going to the window whose id sorts last — so every window ends
 * on the same stack, whoever changed it, in whatever order the changes
 * crossed. A window opening asks for it.
 *
 * A window that goes takes its block with it: every window hears it go
 * (core/live.js) and stops showing it at once, and the next change leaves it
 * out. A copy that still holds it — a window that missed the going — shows
 * it to nobody, for no window by that id is here.
 *
 * Its own channel, beside live.js's: the windows are one thing, what they
 * stack another.
 */

import { held } from './scope.js';

export const STACK_CHANNEL = 'skweeb-stack';

const EMPTY = { page: null, place: [], n: 0, by: '' };

/** Whether stack `a` is newer than `b`: a higher count, or the same count by a later id. */
const newer = (a, b) => a.n > b.n || (a.n === b.n && a.by > b.by);

/** A block as it is kept: its transform whole, opacity and blend only when they say something. */
function tidy(block) {
  const t = block.transform || {};
  const out = {
    ...(block.live ? { live: block.live } : { ref: block.ref }),
    transform: { x: t.x || 0, y: t.y || 0, scale: t.scale > 0 ? t.scale : 1, rot: t.rot || 0 },
  };
  if (block.opacity != null && block.opacity < 1) out.opacity = Math.max(0, block.opacity);
  if (block.blend && block.blend !== 'normal') out.blend = block.blend;
  if (!block.live && Number.isInteger(block.version) && block.version > 0) out.version = block.version;   // kept at a state (L1)
  return out;
}

/**
 * Share this browser's stack.
 *
 * @param {object} live                   this window, core/live.js's
 * @param {object} [opts]
 * @param {?BroadcastChannel} [opts.channel] one of its own — a test's; null where there is none
 * @returns {object}
 */
export function joinStack(live, { channel } = {}) {
  const ch = channel !== undefined ? channel
    : typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(STACK_CHANNEL) : null;
  let stack = EMPTY;
  const listeners = new Set();
  let left = false;              // gone from the windows: nothing more sent
  const post = message => { if (ch && !left) ch.postMessage(message); };

  /** Whether a block is here: a vault object always; a window while it is open. */
  const here = block => !block.live || block.live === live.id || live.windows().some(w => w.id === block.live);
  const view = () => ({ page: stack.page && { ...stack.page }, place: stack.place.filter(here).map(b => tidy(b)) });
  const tell = () => { const v = view(); for (const fn of listeners) fn(v); };

  /** Make a change to a copy of what is shown, and send it: the next count, by this window. */
  function change(edit) {
    const next = view();
    edit(next);
    stack = { page: next.page, place: next.place.map(tidy), n: stack.n + 1, by: live.id };
    post({ kind: 'stack', stack });
    tell();
  }

  if (ch) {
    ch.onmessage = ({ data: m }) => {
      if (!m) return;
      if (m.kind === 'stack' && m.stack && newer(m.stack, stack)) {
        stack = m.stack;
        tell();
      } else if (m.kind === 'ask' && stack.n > 0) {
        post({ kind: 'stack', stack });
      }
    };
    post({ kind: 'ask' });
  }
  const stop = live.on(e => { if (e.kind === 'go' && stack.place.some(b => b.live === e.window.id)) tell(); });

  /** Where a window's block is, or -1. */
  const indexOf = id => view().place.findIndex(b => b.live === id);

  const shared = {
    /** The stack as it stands: `{ page, place }`, a block only while what it names is here. */
    get: view,
    /** The index of a window's block in it, or -1. */
    indexOf,
    /**
     * A block on top, or several in one change, bottom first. The first sets
     * the page: `size`, its own — what the stack is placed on until something
     * says otherwise.
     */
    add(blocks, size = null) {
      change(s => {
        if (!s.page && size) s.page = { width: Math.round(size.width), height: Math.round(size.height) };
        s.place.push(...[].concat(blocks));
      });
    },
    /** Take block `i` off. */
    remove(i) { change(s => { s.place.splice(i, 1); }); },
    /** Move block `i` to `j`: up the stack is towards the end. */
    move(i, j) {
      change(s => {
        const [b] = s.place.splice(i, 1);
        s.place.splice(Math.max(0, Math.min(s.place.length, j)), 0, b);
      });
    },
    /** Set block `i`'s fields: `{ transform, opacity, blend }`, a part of them. */
    set(i, fields) {
      change(s => {
        const b = s.place[i];
        if (!b) return;
        if (fields.transform) b.transform = { ...b.transform, ...fields.transform };
        if ('opacity' in fields) b.opacity = fields.opacity;
        if ('blend' in fields) b.blend = fields.blend;
        // A smart object's layer kept at a state — `version` a number — or following its latest, none (L1).
        if ('version' in fields) { if (Number.isInteger(fields.version) && fields.version > 0) b.version = fields.version; else delete b.version; }
      });
    },
    /** Hear the stack change. Returns what stops it. */
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Leave the stack: nothing more sent or heard. Twice is once. */
    leave() {
      if (left) return;
      left = true;
      unheld();
      stop();
      listeners.clear();
      if (ch && !channel) ch.close();
      else if (ch) ch.onmessage = null;
    },
  };
  let unheld = () => {};
  unheld = held(() => shared.leave());   // its app unmounted: its channel closed, as its window's is (core/scope.js, S9)
  return shared;
}
