/**
 * rulers.js — the viewer's rulers and guides, as the bench found them (S8,
 * 2026-11-03; docs/scene.md): Photoshop's, in the picture's own pixels.
 *
 *   <skw-rulers>     in `.viewer-stage`, over its padding — never over the
 *                    picture: a ruler on top and one on the left, the
 *                    picture's span lit on each, the pointer's place marked.
 *                    A guide is drawn out of a ruler — the top one gives a
 *                    level guide, the left an upright one. Its line over the
 *                    picture takes no press — the picture is the app's, its
 *                    handles, its brush — so a guide is held by its grip in
 *                    the ruler it crosses, and gone dragged back into the one
 *                    it came out of. The magnet's lines while it pulls. On a size its guides were not laid on,
 *                    the offer to lay them here, in % or in px.
 *   <skw-viewtools>  at the end of `.viewer-head`: the rulers and the magnet,
 *                    on or off, and this size's guides cleared.
 *
 * Lit components in the page's DOM, with no canvas of their own: whatever
 * finds the app's canvas in the stage (core/StackPanel.js) never finds
 * these. The numbers are core/shell/guides.js's; core/Bar.js puts both in.
 */

import { LitElement, html, svg, nothing } from '../libs/lit/lit-all.min.js';
import * as G from './guides.js';

const RULER = 18;          // the stage's padding (theme.css): the rulers are that wide
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const NUMBERED = 56;       // screen pixels between two numbered ticks, at least

const icon = body => html`<svg class="vt-ic" viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;
const ICONS = {
  rulers: icon(svg`<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"><path d="M2.5 10.5 10.5 2.5l3 3-8 8z"/><path d="M5 8l1.2 1.2M7 6l1.2 1.2M9 4l1.2 1.2"/></g>`),
  magnet: icon(svg`<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M4 2.5v5.5a4 4 0 0 0 8 0V2.5"/><path d="M4 5h2.5M9.5 5H12"/><path d="M6.5 2.5V8a1.5 1.5 0 0 0 3 0V2.5"/></g>`),
};

class SkwRulers extends LitElement {
  createRenderRoot() { return this; }

  constructor() {
    super();
    this._g = null;            // the last measure: the stage, where the picture sits in it, its zoom
    this._drag = null;         // { i, axis, el } while a guide is held
    this._onMove = e => this._move(e);
    this._onUp = e => this._drop(e);
    this._hover = e => this._cursor(e);
    this._leave = () => this.classList.remove('rl-in');
  }

  connectedCallback() {
    super.connectedCallback();
    this._stage = this.parentElement;
    this._off = G.on('change', () => this.requestUpdate());
    this._seen = null;
    this._ro = new ResizeObserver(() => this.requestUpdate());
    this._ro.observe(this._stage);
    this._stage.addEventListener('pointermove', this._hover, { passive: true });
    this._stage.addEventListener('pointerleave', this._leave);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._off();
    this._ro.disconnect();
    this._stage.removeEventListener('pointermove', this._hover);
    this._stage.removeEventListener('pointerleave', this._leave);
  }

  /** The app's canvas, where the stage shows it, and how many screen pixels one of the picture's makes. */
  _measure() {
    const st = G.state();
    const c = this._stage.querySelector('canvas:not(.stack-layer)');
    if (c !== this._seen) {
      if (this._seen) this._ro.unobserve(this._seen);
      if (c) this._ro.observe(c);
      this._seen = c;
    }
    if (!st.doc || !c) return null;
    const sr = this._stage.getBoundingClientRect(), cr = c.getBoundingClientRect();
    if (cr.width < 2 || cr.height < 2) return null;
    const g = { W: sr.width, H: sr.height, x0: cr.left - sr.left, y0: cr.top - sr.top,
                zx: cr.width / st.doc.w, zy: cr.height / st.doc.h };
    G.setZoom((g.zx + g.zy) / 2);
    return g;
  }

  /** A pointer's place on the picture, along `axis`, in its pixels. */
  _at(e, axis) {
    const sr = this._stage.getBoundingClientRect(), g = this._g;
    return axis === 'x' ? (e.clientX - sr.left - g.x0) / g.zx : (e.clientY - sr.top - g.y0) / g.zy;
  }

  _cursor(e) {
    const sr = this._stage.getBoundingClientRect();
    this.style.setProperty('--rl-cx', `${e.clientX - sr.left}px`);
    this.style.setProperty('--rl-cy', `${e.clientY - sr.top}px`);
    this.classList.add('rl-in');
  }

  /** Out of a ruler, a new guide — `axis` its own, the ruler's other — held until it is let go. */
  _pull(e, axis) {
    if (e.button !== 0 || !this._g) return;
    e.preventDefault();
    const i = G.add(axis, this._at(e, axis));
    if (i < 0) return;
    this._hold(e, i, axis);
  }

  _grab(e, i, axis) {
    if (e.button !== 0 || !this._g) return;
    e.preventDefault();
    e.stopPropagation();
    this._hold(e, i, axis);
  }

  _hold(e, i, axis) {
    this._drag = { i, axis, el: e.currentTarget };
    e.currentTarget.setPointerCapture(e.pointerId);
    this._move(e);
  }

  _move(e) {
    const d = this._drag;
    if (!d || !this._g) return;
    G.drag(d.i, this._at(e, d.axis), e.ctrlKey || e.metaKey);
  }

  /** Let go: kept where it is — or gone, back into a ruler, or out of the stage, or far off the picture. */
  _drop(e) {
    const d = this._drag;
    if (!d) return;
    this._drag = null;
    const sr = this._stage.getBoundingClientRect(), doc = G.state().doc;
    const p = d.axis === 'x' ? e.clientX - sr.left : e.clientY - sr.top;
    const len = d.axis === 'x' ? sr.width : sr.height, L = d.axis === 'x' ? doc.w : doc.h;
    const g = G.guides()[d.i];
    if (!g || p < RULER || p > len || g.px < -L / 4 || g.px > L * 1.25) G.remove(d.i);
    G.commit();
  }

  /** One ruler: the picture's span, a tick every so many of its pixels, a number every few ticks. */
  _ruler(axis, g) {
    const doc = G.state().doc;
    const z = axis === 'x' ? g.zx : g.zy;
    const o = (axis === 'x' ? g.x0 : g.y0) - RULER;        // where 0 falls, in the ruler's own pixels
    const len = (axis === 'x' ? g.W : g.H) - RULER;
    const L = axis === 'x' ? doc.w : doc.h;
    const step = STEPS.find(v => v * z >= NUMBERED) || STEPS[STEPS.length - 1];
    const minor = step / (step % 5 === 0 ? 5 : 2);
    let d = '';
    const nums = [];
    for (let k = Math.ceil(-o / z / minor); o + k * minor * z <= len; k++) {
      const t = k * minor, p = Math.round(o + t * z) + 0.5;
      const big = Math.abs(t / step - Math.round(t / step)) < 1e-6, n = big ? 7 : 3;
      d += axis === 'x' ? `M${p} ${RULER - n}V${RULER}` : `M${RULER - n} ${p}H${RULER}`;
      if (big) nums.push([p, Math.round(t)]);
    }
    const a = Math.max(0, o), b = Math.min(len, o + L * z);
    const span = b <= a ? nothing : axis === 'x'
      ? svg`<rect class="rl-span" x=${a} y="0" width=${b - a} height=${RULER}></rect>`
      : svg`<rect class="rl-span" x="0" y=${a} width=${RULER} height=${b - a}></rect>`;
    const labels = nums.map(([p, n]) => axis === 'x'
      ? svg`<text x=${p + 3} y="9">${n}</text>`
      : svg`<text transform=${`translate(9 ${p - 3}) rotate(-90)`}>${n}</text>`);
    return html`<svg class="rl rl-${axis}" aria-label="A ruler: drag a guide out of it"
        @pointerdown=${e => this._pull(e, axis === 'x' ? 'y' : 'x')}
        @pointermove=${this._onMove} @pointerup=${this._onUp} @pointercancel=${this._onUp}
      >${span}<path class="rl-tick" d=${d}></path>${labels}</svg>`;
  }

  render() {
    const st = G.state();
    const g = this._g = this._measure();
    if (!g || !st.rulers) { this.classList.remove('rl-in'); return nothing; }
    const held = this._drag ? this._drag.i : -1;
    const away = G.elsewhere();
    return html`
      ${this._ruler('x', g)}${this._ruler('y', g)}
      <div class="rl-corner" aria-hidden="true"></div>
      <div class="rl-cur rl-cur-x"></div><div class="rl-cur rl-cur-y"></div>
      ${G.guides().map((d, i) => {
        const pos = d.axis === 'x' ? `left:${g.x0 + d.px * g.zx}px` : `top:${g.y0 + d.px * g.zy}px`;
        return html`<div class=${`gd gd-${d.axis}${i === held ? ' gd--held' : ''}`} style=${pos}></div>
          <div class=${`gd-grip gd-grip-${d.axis}`} style=${pos} title=${`${d.axis} ${d.px} px`}
            @pointerdown=${e => this._grab(e, i, d.axis)}
            @pointermove=${this._onMove} @pointerup=${this._onUp} @pointercancel=${this._onUp}></div>`;
      })}
      ${st.lines.map(l => html`<div class=${`gd-snap gd-snap-${l.axis}`} style=${l.axis === 'x'
          ? `left:${g.x0 + l.at * g.zx}px;top:${g.y0}px;height:${st.doc.h * g.zy}px`
          : `top:${g.y0 + l.at * g.zy}px;left:${g.x0}px;width:${st.doc.w * g.zx}px`}></div>`)}
      ${away ? html`<div class="gd-away">
          <span>${away.guides.length} guide${away.guides.length > 1 ? 's' : ''} of ${away.w} × ${away.h} — lay them here</span>
          <button class="gd-act" type="button" data-pal=${`Lay the guides of ${away.w} × ${away.h} here, in %`}
                  title="Scaled to this size" @click=${() => G.relay('pct')}>in %</button>
          <button class="gd-act" type="button" data-pal=${`Lay the guides of ${away.w} × ${away.h} here, in px`}
                  title="Pixel for pixel" @click=${() => G.relay('px')}>in px</button>
          <button class="gd-act" type="button" title="None on this size" aria-label="None on this size" @click=${() => G.clear()}>✕</button>
        </div>` : nothing}`;
  }
}

class SkwViewtools extends LitElement {
  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    this._off = G.on('change', () => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._off();
  }

  render() {
    const st = G.state(), n = G.guides().length;
    return html`
      ${n ? html`<button class="vt-btn vt-clear" type="button" data-pal="Clear the guides"
          title=${`Clear the ${n} guide${n > 1 ? 's' : ''} of ${st.doc.w} × ${st.doc.h}`}
          @click=${() => G.clear()}>${n} guide${n > 1 ? 's' : ''} ✕</button>` : nothing}
      <button class="vt-btn vt-rulers" type="button" aria-pressed=${st.rulers ? 'true' : 'false'} aria-label="Rulers"
              data-pal="Rulers and guides, on or off" title="Rulers and guides — drag a guide out of a ruler"
              @click=${() => G.toggle('rulers')}>${ICONS.rulers}</button>
      <button class="vt-btn vt-magnet" type="button" aria-pressed=${st.magnet ? 'true' : 'false'} aria-label="Magnetism"
              data-pal="Magnetism, on or off" title="Magnetism: to the edges, the centre and the guides — Ctrl held, none"
              @click=${() => G.toggle('magnet')}>${ICONS.magnet}</button>`;
  }
}

if (!customElements.get('skw-rulers')) customElements.define('skw-rulers', SkwRulers);
if (!customElements.get('skw-viewtools')) customElements.define('skw-viewtools', SkwViewtools);

export { SkwRulers, SkwViewtools };
