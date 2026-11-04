/**
 * scope.js — what a mounted app holds, let go of when it is unmounted (S9,
 * 2026-11-04; docs/scene.md, *The scene*).
 *
 * Every app is a module since S9: `mount(host)` builds it in a host, and
 * `unmount()` takes it out again, so a scene can put another in its place.
 * What an app builds inside its host goes with the host's nodes; what it
 * holds outside them does not — a listener on the document, a channel to the
 * other windows, an app's pie on A, a key it keeps from core. So a mount
 * opens a scope, and whatever core makes while it is open says how it is let
 * go of — `held(stop)`; `close()` runs every stop, the newest first.
 *
 * A scope stays open from the mount to the unmount, not only while the
 * mount's code runs: a picker made on a click an hour later belongs to the
 * app as much as its panels at boot. So a page alone — mounted on itself —
 * keeps its scope open as long as it lives, and what ends before the app
 * does must take itself out: `held` gives back a `release`, which a thing
 * calls when it is let go of another way — a panel removed, a channel left
 * — so the scope never keeps what is gone. A clock is not held: an app
 * holds its own, the one that plays — a viewer's clock goes with its viewer.
 *
 * Scopes stack, so one opened inside another — a test's — gives the outer
 * one back when it closes. With no scope open — a page that never mounts,
 * a test, the shell installed once a page — `held` keeps nothing, and a
 * thing lives as long as the page.
 *
 * No DOM at import.
 */

const open = [];               // the scopes open, the newest last: `held` gives to it
const none = () => {};

/** The scope `held` gives to now, or null. */
export const current = () => open[open.length - 1] || null;

/**
 * A scope, open: from now on what core holds is let go of when it closes.
 *
 * @param {string} [name]  whose — the app's, for the console
 * @returns {Scope}
 */
export function openScope(name = '') {
  const scope = bag(name);
  open.push(scope);
  return scope;
}

/**
 * @typedef {object} Scope
 * @property {string} name
 * @property {(stop: () => void) => () => void} hold   a stop, and back what takes it out unrun
 * @property {(target: EventTarget, type: string, fn: Function, opts?: any) => () => void} listen
 * @property {() => void} close
 * @property {boolean} closed
 * @property {number} size    the stops still held
 */

/**
 * The same, never open: a thing's own stops, kept together and let go of
 * at once by its own `remove` — `held` never gives to it.
 *
 * @returns {Scope}
 */
export function bag(name = '') {
  const stops = new Set();     // { stop }: its own, so one function held twice is two
  let closed = false;
  const scope = {
    name,
    /** Something to let go of when the scope closes — at once, if it is closed already. */
    hold(stop) {
      if (closed) { run(stop); return none; }
      const entry = { stop };
      stops.add(entry);
      return () => { stops.delete(entry); };
    },
    /** A listener, taken off when the scope closes; back, what takes it off now. */
    listen(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      const off = () => target.removeEventListener(type, fn, opts);
      const release = scope.hold(off);
      return () => { release(); off(); };
    },
    /**
     * Every stop, the newest first; the scope out of the open ones. Twice is
     * once. A stop released while others run — a panel taking its picker
     * with it — is not run again.
     */
    close() {
      if (closed) return;
      closed = true;
      const at = open.lastIndexOf(scope);
      if (at >= 0) open.splice(at, 1);
      for (const entry of [...stops].reverse()) {
        if (stops.delete(entry)) run(entry.stop);
      }
    },
    get closed() { return closed; },
    get size() { return stops.size; },
  };
  return scope;

  function run(stop) {
    try { stop(); } catch (err) { console.error(`[${name || 'scope'}] a stop failed:`, err); }
  }
}

/**
 * Let go of this when the app open now is unmounted — nothing kept with none
 * open. Back, its `release`: called when the thing ends another way.
 */
export function held(stop) {
  const scope = current();
  return scope ? scope.hold(stop) : none;
}

/** A listener the app open now holds: taken off at its unmount, or kept for good with none open. Back, what takes it off now. */
export function listen(target, type, fn, opts) {
  const scope = current();
  if (scope) return scope.listen(target, type, fn, opts);
  target.addEventListener(type, fn, opts);
  return () => target.removeEventListener(type, fn, opts);
}
