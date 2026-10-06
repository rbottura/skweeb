/**
 * live.js — the windows of the suite open in this browser, and what each has
 * on screen (M11: docs/smart-objects.md, *The live stack*).
 *
 * One BroadcastChannel, which reaches every page of the suite open in this
 * browser and nothing else. A window says who it is — an id for as long as
 * its page is open, its app, its title — and its layer: the envelope a save
 * would write, made and never saved — the one its print draws
 * (core/PrintPanel.js), so with no id — or, where it has none, why.
 * Envelopes, never pixels: another window draws a layer with
 * core/rebuild.js, as it draws any object.
 *
 * Four words. `hello`: a window opened, or is making sure who is still here,
 * with its layer and the windows it knows. `here`: the answer, with the
 * answerer's layer when the asker has not got it yet. `layer`: a window's
 * changed. `bye`: its page is going. A layer is asked of its app twice a
 * second while another window is open — every two seconds alone, so its own
 * line stays true — and sent when it is not what was sent last; first once
 * the page has started, never in the middle of its boot. A tab that went without a `bye` — crashed, killed — is dropped once
 * it has missed three calls of `hello`. A window alone, or a browser with no
 * BroadcastChannel, is the app as it was (rule 7).
 */

export const CHANNEL = 'skweeb-live';

/** Calls of `hello` a window may miss before it is taken for gone. */
const MISSES = 3;

/** What a window has to say of what is on screen: the envelope as JSON, or why there is none. */
function said(made) {
  if (made && typeof made === 'object') {
    try {
      return { layer: JSON.stringify(made), why: '' };
    } catch (err) {
      return { layer: null, why: 'it cannot be said: ' + err.message };
    }
  }
  return { layer: null, why: typeof made === 'string' && made ? made : 'nothing on screen' };
}

const parse = text => (text ? JSON.parse(text) : null);

/**
 * A layer that moves, as a loop: what a save of it would write — its recipe
 * with no frame chosen, its render with its frames and rate — so that another
 * window plays it on its own clock, and a playing window's layer stays the
 * same from frame to frame. A still, or an app with no clock, as it is.
 *
 * @param {?object|string} made   what is on screen, as the app's print has it
 * @param {?{length: number, fps: number}} clock   the app's, core/playback.js's
 */
export function loopOf(made, clock) {
  if (!made || typeof made !== 'object' || !clock || !(clock.length > 1)) return made;
  const { tick, ...recipe } = made.recipe || {};
  return { ...made, type: made.type === 'still' ? 'sequence' : made.type, recipe,
           render: { ...made.render, frames: clock.length, fps: clock.fps || 30, loop: true } };
}

/** An id for as long as the page is open: who a window is, never part of anything drawn. */
function makeId() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID().slice(0, 8);
  return (Date.now() % 1e8).toString(36) + Math.floor(performance.now() * 1000).toString(36);
}

const pageTitle = () => (typeof document !== 'undefined' ? document.title : '');

/**
 * Join the windows of this browser.
 *
 * @param {object} opts
 * @param {string} opts.app
 * @param {() => (object|string|null|Promise<object|string|null>)} opts.layer
 *        what is on screen, as the envelope a save would write — or why there is none
 * @param {() => string} [opts.title]       the page's title
 * @param {?BroadcastChannel} [opts.channel] one of its own — a test's; null where there is none
 * @param {number} [opts.every=500]          ms between asking the app for its layer
 * @param {number} [opts.call=5000]          ms between calls of `hello`, while the page is seen
 * @returns {{id: string, app: string, windows: () => object[], mine: () => object,
 *            on: (fn: Function) => Function, changed: () => Promise<void>, leave: () => void}}
 */
export function joinLive({ app, layer, title = pageTitle, channel, every = 500, call = 5000 }) {
  const ch = channel !== undefined ? channel
    : typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
  let id = makeId();             // a page brought back from the cache comes back as a new window
  let away = false;              // a `bye` said: nothing more is sent until the page is back
  const left = new Set();        // windows that said `bye`: a message of theirs still on its way is not a return
  const others = new Map();      // id → { id, app, title, layer, why, missed }
  const listeners = new Set();
  let now = said(null);          // what is on screen, as last asked
  let sent = null;               // …as last sent: only a change is sent again
  let looking = null;

  const post = message => { if (ch && !away) ch.postMessage({ id, app, title: title(), ...message }); };
  const tell = (kind, window) => { for (const fn of listeners) fn({ kind, window }); };
  const copy = w => ({ id: w.id, app: w.app, title: w.title, layer: w.layer, why: w.why, text: w.text });

  /** Ask the app what is on screen; send it when it changed, or when `always`. */
  function look(always = false) {
    looking = looking || (async () => {
      let made;
      try {
        made = await layer();
      } catch (err) {
        made = 'it could not say: ' + err.message;
      }
      const was = now;
      now = said(made);
      if (always || now.layer !== was.layer || now.why !== was.why) tell('mine', mine());
      if (now.layer !== (sent && sent.layer) || now.why !== (sent && sent.why)) {
        sent = now;
        post({ kind: 'layer', layer: now.layer, why: now.why });
      }
    })().finally(() => { looking = null; });
    return looking;
  }

  /** A window heard from: come, or changed. */
  function heard(m) {
    const known = others.get(m.id);
    const w = known || { id: m.id, layer: null, why: '', text: null };
    Object.assign(w, { app: m.app, title: m.title, missed: 0 });
    // A layer comes with every `hello`: only one that differs from what is held is news.
    const changed = 'layer' in m && m.layer !== undefined && (m.layer !== w.text || (m.why || '') !== w.why);
    if (changed) {
      w.text = m.layer;
      w.layer = parse(m.layer);
      w.why = m.why || '';
    }
    if (!known) {
      others.set(m.id, w);
      tell('come', copy(w));
    } else if (changed) {
      tell('layer', copy(w));
    }
  }

  function gone(wid) {
    const w = others.get(wid);
    if (!w) return;
    others.delete(wid);
    tell('go', copy(w));
  }

  /** Who is here: a `hello` to every window, and whoever has missed too many, gone. */
  function hello() {
    for (const w of [...others.values()]) if (++w.missed > MISSES) gone(w.id);
    post({ kind: 'hello', layer: now.layer, why: now.why, known: [...others.keys()] });
  }

  if (ch) {
    ch.onmessage = ({ data: m }) => {
      if (!m || m.id === id || left.has(m.id)) return;
      if (m.kind === 'bye') {
        left.add(m.id);
        return gone(m.id);
      }
      heard(m);
      if (m.kind === 'hello') {
        const has = Array.isArray(m.known) && m.known.includes(id);
        post({ kind: 'here', ...(has ? {} : { layer: now.layer, why: now.why }) });
      }
    };
  }

  const seen = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';
  let beat = 0;
  const asking = ch ? setInterval(() => { if (others.size || ++beat % 4 === 0) look(); }, every) : null;
  const calling = ch ? setInterval(() => { if (seen()) hello(); }, call) : null;
  const bye = () => { post({ kind: 'bye' }); away = true; };
  const back = () => { if (seen()) hello(); };
  const again = e => { if (e.persisted) { id = makeId(); away = false; sent = null; look(true).then(hello); } };
  if (ch && typeof addEventListener === 'function' && typeof document !== 'undefined') {
    addEventListener('pagehide', bye);
    addEventListener('pageshow', again);
    document.addEventListener('visibilitychange', back);
  }
  if (ch) setTimeout(() => look(true).then(hello), 0);

  function mine() {
    return { id, app, title: title(), layer: parse(now.layer), why: now.why, text: now.layer };
  }

  return {
    get id() { return id; },
    app,
    /** The other windows, in the order they came: their app, title, and layer or why there is none. */
    windows: () => [...others.values()].map(copy),
    /** This window, as the others have it. */
    mine,
    /** Hear windows: `{ kind: 'come' | 'layer' | 'go' | 'mine', window }`. Returns what stops it. */
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Say what is on screen now, rather than at the next half second. */
    changed: () => look(),
    /** Leave the windows: a `bye`, and nothing more sent or heard. */
    leave() {
      bye();
      clearInterval(asking);
      clearInterval(calling);
      if (typeof document !== 'undefined') {
        removeEventListener('pagehide', bye);
        removeEventListener('pageshow', again);
        document.removeEventListener('visibilitychange', back);
      }
      if (ch && !channel) ch.close();
      else if (ch) ch.onmessage = null;
      listeners.clear();
    },
  };
}
