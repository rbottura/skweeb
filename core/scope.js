/**
 * scope.js — what a mounted app holds, let go of when it is unmounted (S9,
 * 2026-11-04; docs/scene.md, *The scene*).
 *
 * Every app is a module since S9: `mount(host)` builds it in a host, and
 * `unmount()` takes it out again, so a scene can put another in its place.
 * What an app builds inside its host goes with the host's nodes; what it
 * holds outside them does not — a listener on the document, a channel to the
 * other windows, a clock's frame, an observer, an app's pie on A. So a
 * mount opens a scope, and whatever core makes while it is open says how it
 * is let go of — `held(stop)`; `close()` runs every stop, the newest first.
 *
 * A scope stays open from the mount to the unmount, not only while the
 * mount's code runs: a picker made on a click an hour later belongs to the
 * app as much as its panels at boot. Scopes stack, so one opened inside
 * another — a test's — gives the outer one back when it closes. With no
 * scope open — a page that never mounts, a test, the shell installed once a
 * page — `held` keeps nothing, and a thing lives as long as the page.
 *
 * No DOM at import.
 */

const open = [];               // the scopes open, the newest last: `held` gives to it

/** The scope `held` gives to now, or null. */
export const current = () => open[open.length - 1] || null;

/**
 * A scope, open: from now on what core holds is let go of when it closes.
 *
 * @param {string} [name]  whose — the app's, for the console
 * @returns {{ name: string, hold: (stop: () => void) => () => void,
 *             listen: (target: EventTarget, type: string, fn: Function, opts?: any) => void,
 *             close: () => void, readonly closed: boolean, readonly size: number }}
 */
export function openScope(name = '') {
  const scope = bag(name);
  open.push(scope);
  return scope;
}

/**
 * The same, never open: a thing's own stops, kept together and let go of
 * at once by its own `remove` — `held` never gives to it.
 */
export function bag(name = '') {
  const stops = [];
  let closed = false;
  const scope = {
    name,
    /** Something to let go of when the scope closes; at once, if it is closed already. */
    hold(stop) {
      if (closed) { run(stop); return stop; }
      stops.push(stop);
      return stop;
    },
    /** A listener, taken off when the scope closes. */
    listen(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      scope.hold(() => target.removeEventListener(type, fn, opts));
    },
    /** Every stop, the newest first; the scope out of the open ones. Twice is once. */
    close() {
      if (closed) return;
      closed = true;
      const at = open.lastIndexOf(scope);
      if (at >= 0) open.splice(at, 1);
      while (stops.length) run(stops.pop());
    },
    get closed() { return closed; },
    get size() { return stops.length; },
  };
  return scope;

  function run(stop) {
    try { stop(); } catch (err) { console.error(`[${name || 'scope'}] a stop failed:`, err); }
  }
}

/** Let go of this when the app open now is unmounted; nothing kept with none open. */
export function held(stop) {
  const scope = current();
  return scope ? scope.hold(stop) : stop;
}

/** A listener the app open now holds: taken off at its unmount, or kept for good with none open. */
export function listen(target, type, fn, opts) {
  const scope = current();
  if (scope) scope.listen(target, type, fn, opts);
  else target.addEventListener(type, fn, opts);
}
