/**
 * sign.js — what shows over the map when a sign is used: its picture, as
 * large as the window allows, a loop playing by its own clock, and its
 * words under it. A click anywhere, or Escape, puts it away.
 *
 * The picture is any object, opened as everything in the suite is
 * (core/rebuild.js `openFrames`): a poster from grid, a fractal loop for the
 * PC's screen. A small one is shown at most four times its own size.
 */

import { Vault }      from '../../../core/vault.js';
import { openFrames } from '../../../core/rebuild.js';
import { Playhead }   from '../../../core/playback.js';

const MOST = 4;   // a small picture shown at most this many times its own size

export class Sign {
  /** @param {HTMLElement} root   the overlay: a `.play-sign-picture` canvas and a `.play-sign-says` */
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector('.play-sign-picture');
    this.ctx = this.canvas.getContext('2d');
    this.says = root.querySelector('.play-sign-says');
    this.handle = null;
    this.asked = 0;
    this.clock = new Playhead({ onShow: t => this._draw(t) });
    root.addEventListener('click', () => this.close());
  }

  get isOpen() { return !this.root.hidden; }

  /** @param {{picture: ?string, says: string}} sign   maps.js `signOf` */
  async show({ picture, says }) {
    this.close();
    const ask = ++this.asked;
    this.root.hidden = false;
    this.says.textContent = says;
    this.says.hidden = !says;
    this.canvas.hidden = !picture;
    if (!picture) return;
    try {
      const { object, url } = await Vault.load(picture);
      const handle = await openFrames(object, { url, draft: true });
      if (ask !== this.asked) return void (handle.dispose && handle.dispose());
      this.handle = handle;
      this._fit();
      this.clock.configure({ length: handle.length, fps: handle.fps || 30, loop: true });
      this._draw(0);
      if (handle.length > 1 && handle.fps > 0) this.clock.play();
    } catch (err) {
      if (ask !== this.asked) return;
      this.canvas.hidden = true;
      console.warn('[play] the sign\'s picture did not open:', err);
      if (!says) {
        this.says.textContent = 'What this shows would not open.';
        this.says.hidden = false;
      }
    }
  }

  close() {
    this.asked++;
    this.clock.pause();
    if (this.handle && this.handle.dispose) this.handle.dispose();
    this.handle = null;
    this.root.hidden = true;
  }

  /** The picture's canvas: as large as the card allows, at most MOST times its own size. */
  _fit() {
    const { width, height } = this.handle;
    const room = { w: Math.min(innerWidth * 0.92, 720) - 32, h: innerHeight * 0.65 };
    const k = Math.min(room.w / width, room.h / height, MOST);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${Math.round(width * k)}px`;
    this.canvas.style.height = `${Math.round(height * k)}px`;
    this.canvas.width = Math.max(1, Math.round(width * k * dpr));
    this.canvas.height = Math.max(1, Math.round(height * k * dpr));
  }

  _draw(t) {
    if (!this.handle) return;
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.imageSmoothingQuality = 'high';
    this.handle.drawInto(this.ctx, t, width, height);
  }
}
