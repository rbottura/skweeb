/**
 * Transport.js — the sequence player's controls, as After Effects' preview.
 *
 * First frame, back, play, on, last; a timecode in the accent and the frame
 * count; under them the loop as a ruler to scrub, a tick for each frame where
 * they fit (S3, 2026-11-03 — docs/scene.md). Bound to a core/playback.js
 * clock: it owns no time and draws no frame, the clock says which tick and
 * the app draws it. Grid and ckt each wired these by hand before; now it is
 * one piece an app mounts in a drawer, usually one called "Sequence player".
 *
 * It is chrome, not a parameter: it says which frame you are looking at, and
 * says nothing about the artwork. A saved loop is every frame regardless.
 *
 * The checks hold it by `.tp-scrub` and `.tp-count`: both stay as they were.
 */

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/* Small glyphs of our own, in the button's colour. */
const path = d => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
const GLYPH = {
  first: path('M3 3h1.6v10H3zM13 3.6v8.8L8.6 8zM8.6 3.6v8.8L4.2 8z'),
  back: path('M3.4 3h1.6v10H3.4zM12 3.6v8.8L5.4 8z'),
  play: path('M4.5 3v10l8.5-5z'),
  pause: path('M4.5 3.5h2.5v9H4.5zM9 3.5h2.5v9H9z'),
  on: path('M11 3h1.6v10H11zM4 3.6v8.8L10.6 8z'),
  last: path('M11.4 3H13v10h-1.6zM3 3.6v8.8L7.4 8zM7.4 3.6v8.8L11.8 8z'),
};

/** A tick's time as After Effects writes it: hours, minutes, seconds, frames. */
export function timecode(tick, fps) {
  const rate = Math.max(1, Math.round(fps || 1)), s = Math.floor(tick / rate), f = tick % rate;
  const two = n => String(n).padStart(2, '0');
  return `${Math.floor(s / 3600)}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}:${two(f)}`;
}

export class Transport {
  /**
   * @param {object} opts
   * @param {object} opts.clock          a Playhead
   * @param {HTMLElement} opts.mount
   * @param {() => boolean} [opts.busy]  true while an export runs: hands off
   */
  constructor({ clock, mount, busy = () => false }) {
    this.clock = clock;
    this.root = el('div', 'tp');
    const row = el('div', 'tp-row');
    const button = (cls, title, glyph, act) => {
      const b = el('button', 'tp-btn ' + cls);
      b.type = 'button';
      b.title = title;
      b.setAttribute('aria-label', title);
      b.innerHTML = GLYPH[glyph];
      b.addEventListener('click', () => { if (!busy()) act(); });
      return b;
    };
    const stop = () => clock.pause();
    this.first = button('tp-first', 'First frame', 'first', () => { stop(); clock.show(0); });
    this.back = button('tp-back', 'The frame before', 'back', () => { stop(); clock.step(-1); });
    this.play = button('nb-btn tp-play', 'Play / pause [space]', 'play', () => clock.toggle());
    this.on = button('tp-on', 'The frame after', 'on', () => { stop(); clock.step(1); });
    this.last = button('tp-last', 'Last frame', 'last', () => { stop(); clock.show(clock.length - 1); });
    this.time = el('span', 'tp-time');
    this.count = el('span', 'tp-count');
    row.append(this.first, this.back, this.play, this.on, this.last, this.time, this.count);

    this.scrub = el('input', 'pp-range tp-scrub');
    this.scrub.type = 'range';
    this.scrub.min = 0;
    this.scrub.step = 1;
    this.scrub.setAttribute('aria-label', 'The frame on screen');
    this.root.append(row, this.scrub);
    mount.append(this.root);

    this.scrub.addEventListener('input', () => {
      if (busy()) { this.scrub.value = clock.tick; return; }
      clock.pause();
      clock.show(Number(this.scrub.value));
    });
    this.configure();
  }

  /** The loop changed length: its ruler is ticked again, a frame a tick where they fit. */
  configure() {
    const n = this.clock.length;
    this.scrub.max = Math.max(0, n - 1);
    const every = [1, 2, 5, 10, 15, 30, 60, 120, 300].find(k => (n - 1) / k <= 72) || 600;
    this.scrub.style.setProperty('--tp-step', n > 1 ? `${(100 * every) / (n - 1)}%` : '100%');
    this.show(this.clock.tick);
  }

  /** A tick is on screen. */
  show(tick) {
    const n = this.clock.length;
    this.scrub.value = tick;
    this.count.textContent = n ? `${tick + 1} / ${n}` : '—';
    this.time.textContent = n ? timecode(tick, this.clock.fps) : '';
  }

  /** Playing or paused. */
  state() {
    const on = this.clock.playing;
    this.play.innerHTML = on ? GLYPH.pause : GLYPH.play;
    this.play.classList.toggle('tp-playing', on);
  }
}
