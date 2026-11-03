/**
 * pie.js — <skw-pie>, a pie at the pointer, as the bench found it (S5b,
 * 2026-11-03; docs/scene.md): opened by a key held (core/keys.js), its
 * choices round it — the first at the top, then clockwise — the one the
 * pointer aims at lit, taken when the key is let go; a digit takes one by
 * its number. Nothing aimed — the pointer still at its middle — nothing is
 * taken. A Lit component in the page's DOM, drawn by core/shell/shell.css.
 */

import { LitElement, html } from '../libs/lit/lit-all.min.js';

const DEAD = 18;             // screen pixels round the middle where nothing is aimed at

class SkwPie extends LitElement {
  static properties = { x: { type: Number }, y: { type: Number }, title: { type: String },
    items: { attribute: false }, hot: { state: true } };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.x = 0; this.y = 0; this.title = ''; this.items = []; this.hot = -1;
  }

  /** How far from the middle the choices sit: further for more of them. */
  get radius() { return this.items.length > 6 ? 104 : 88; }

  /** Kept clear of the window's edges, so every choice can be read and aimed at. */
  get centre() {
    const r = this.radius + 70;
    return [Math.min(Math.max(this.x, r), innerWidth - r), Math.min(Math.max(this.y, r - 30), innerHeight - r + 30)];
  }

  /** The pointer at (px, py): the choice in its direction, or none near the middle. */
  aim(px, py) {
    const [cx, cy] = this.centre, n = this.items.length;
    const dx = px - cx, dy = py - cy;
    if (!n || Math.hypot(dx, dy) < DEAD) { this.hot = -1; return; }
    const a = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI);     // 0 at the top, clockwise
    this.hot = Math.round(a / ((2 * Math.PI) / n)) % n;
  }

  aimed() { return this.items[this.hot] || null; }

  take(i) { const it = this.items[i]; if (it) it.run(); }

  render() {
    const [cx, cy] = this.centre, n = this.items.length, r = this.radius;
    return html`<div class="pie" style=${`left:${cx}px;top:${cy}px`} role="menu" aria-label=${this.title}>
      <div class="pie-hub">${this.title}</div>
      ${this.items.map((it, i) => {
        const a = (i / n) * 2 * Math.PI;
        const style = `transform: translate(calc(${(Math.sin(a) * r).toFixed(1)}px - 50%), calc(${(-Math.cos(a) * r).toFixed(1)}px - 50%))`;
        return html`<div class=${`pie-item${i === this.hot ? ' pie-item--hot' : ''}${it.on ? ' pie-item--on' : ''}`} style=${style} role="menuitem">
          <kbd>${i + 1}</kbd><span>${it.label}</span></div>`;
      })}
    </div>`;
  }
}

if (!customElements.get('skw-pie')) customElements.define('skw-pie', SkwPie);

export { SkwPie };
