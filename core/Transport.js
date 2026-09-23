/**
 * Transport.js — the sequence player's controls.
 *
 * Play, pause, a scrub and a frame count, bound to a core/playback.js clock.
 * It owns no time and draws no frame: the clock says which tick, the app
 * draws it. Grid and ckt each wired these by hand before; now it is one piece
 * an app mounts in a drawer — usually one called "Sequence player".
 *
 * It is chrome, not a parameter: it says which frame you are looking at, and
 * says nothing about the artwork. A saved loop is every frame regardless.
 */

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

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
    this.play = el('button', 'nb-btn tp-play', '▶');
    this.play.type = 'button';
    this.play.title = 'Play / pause [space]';
    this.scrub = el('input', 'pp-range tp-scrub');
    this.scrub.type = 'range';
    this.scrub.min = 0;
    this.scrub.step = 1;
    this.count = el('span', 'tp-count');
    this.root.append(this.play, this.scrub, this.count);
    mount.append(this.root);

    this.play.addEventListener('click', () => { if (!busy()) clock.toggle(); });
    this.scrub.addEventListener('input', () => {
      if (busy()) { this.scrub.value = clock.tick; return; }
      clock.pause();
      clock.show(Number(this.scrub.value));
    });
    this.configure();
  }

  /** The loop changed length. */
  configure() {
    this.scrub.max = Math.max(0, this.clock.length - 1);
    this.show(this.clock.tick);
  }

  /** A tick is on screen. */
  show(tick) {
    this.scrub.value = tick;
    this.count.textContent = this.clock.length ? `${tick + 1} / ${this.clock.length}` : '—';
  }

  /** Playing or paused. */
  state() { this.play.textContent = this.clock.playing ? '❚❚' : '▶'; }
}
