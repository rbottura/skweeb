/**
 * viewtools.js — the viewer's tools, at the end of its head in every app, as
 * the bench has them (S14a, 2026-11-12, the author's ask: "il manque dans le
 * vtools du viewer le bouton fmtQuick, le bouton de zoom, de graph, de guides
 * et de background"):
 *
 *   the zoom      Fit and how near, its menu Fit, 25 % to 200 %; Ctrl and the
 *                 wheel, the middle button or Space and a drag (core/viewzoom.js)
 *   the states    H's graph over the page, once the object has a state
 *   the rulers    and the magnet, and this size's guides cleared (S8)
 *   the guides    the app's own over its picture — particles' handles, the
 *                 map's — where it has them (core/shell/bindings.js, Z's tap)
 *   the ground    its colour or none, as G gives it
 *
 * Each is there only where it means something: no zoom on a stage that lays
 * its picture otherwise, no guides in an app with none, no ground with no
 * ground. Moved out of rulers.js, which keeps the rulers over the stage.
 */

import { LitElement, html, svg, nothing } from '../libs/lit/lit-all.min.js';
import * as G from './guides.js';
import { viewOverlay, onOverlay, toggleOverlay, hasGround, groundOn, toggleGround } from './bindings.js';
import { zoomOf, onZoom, fit, zoomTo, STEPS } from '../viewzoom.js';
import { Vault } from '../vault.js';

const icon = body => html`<svg class="vt-ic" viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;
const ICONS = {
  states: icon(svg`<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="4.5" cy="3.5" r="1.6"/><circle cx="4.5" cy="12.5" r="1.6"/><circle cx="11.5" cy="6" r="1.6"/><path d="M4.5 5.1v5.8M11.5 7.6c0 2.4-2.5 2.9-7 3.4"/></g>`),
  rulers: icon(svg`<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"><path d="M2.5 10.5 10.5 2.5l3 3-8 8z"/><path d="M5 8l1.2 1.2M7 6l1.2 1.2M9 4l1.2 1.2"/></g>`),
  magnet: icon(svg`<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M4 2.5v5.5a4 4 0 0 0 8 0V2.5"/><path d="M4 5h2.5M9.5 5H12"/><path d="M6.5 2.5V8a1.5 1.5 0 0 0 3 0V2.5"/></g>`),
  guides: icon(svg`<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3"/></g>`),
  ground: icon(svg`<rect x="2.5" y="2.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 2.5H8V8H2.5zM8 8h5.5v5.5H8z" fill="currentColor" opacity=".55"/>`),
};

/**
 * What can change a tool's state from outside it: a save binding the object, a value set by hand or by key —
 * heard as they begin, and the tools drawn again once they are done: a click's own handler runs after it.
 */
const HEARD = ['vault:saved', 'vault:updated', 'vault:changed', 'params:changed', 'click', 'keyup', 'change'];

class SkwViewtools extends LitElement {
  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    const viewer = this.closest('.viewer');
    this._stage = viewer ? viewer.querySelector('.viewer-stage') : null;
    this._menu = false;
    this._again = () => this.requestUpdate();
    this._soon = () => { if (!this._later) this._later = setTimeout(() => { this._later = 0; this.requestUpdate(); }); };
    this._offs = [G.on('change', this._again), onOverlay(this._again), onZoom(s => { if (s === this._stage) this._again(); })];
    for (const t of HEARD) document.addEventListener(t, this._soon, true);
    this._away = e => { if (this._menu && !this.contains(e.target)) { this._menu = false; this._again(); } };
    document.addEventListener('pointerdown', this._away, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const off of this._offs) off();
    for (const t of HEARD) document.removeEventListener(t, this._soon, true);
    clearTimeout(this._later);
    this._later = 0;
    document.removeEventListener('pointerdown', this._away, true);
  }

  /** The zoom picked from its menu: Fit, or so many CSS pixels a picture pixel. */
  _zoom(step) {
    this._menu = false;
    if (step == null) fit(this._stage);
    else zoomTo(this._stage, step);
  }

  _zoomTool() {
    const z = zoomOf(this._stage);
    if (!z) return nothing;
    const now = (z.fit ? 'Fit · ' : '') + Math.round(z.z * 100) + '%';
    return html`<span class="vt-zoom">
      <button class="vt-btn vt-zoom-btn" type="button" aria-haspopup="menu" aria-expanded=${this._menu ? 'true' : 'false'}
              data-pal="Zoom the view" title="The view, closer or farther — Ctrl and the wheel; Space or the middle button and a drag move it"
              @click=${() => { this._menu = !this._menu; this._again(); }}>${now}</button>
      ${this._menu ? html`<div class="vt-menu" role="menu">
          <button class="vt-mi" type="button" role="menuitemradio" aria-checked=${z.fit ? 'true' : 'false'} @click=${() => this._zoom(null)}>Fit</button>
          ${STEPS.map(s => html`<button class="vt-mi" type="button" role="menuitemradio"
              aria-checked=${!z.fit && Math.abs(z.z - s) < 1e-3 ? 'true' : 'false'} @click=${() => this._zoom(s)}>${s * 100} %</button>`)}
          <p class="vt-note">Ctrl and the wheel · Space or the middle button, and a drag</p>
        </div>` : nothing}
    </span>`;
  }

  render() {
    const st = G.state(), n = G.guides().length;
    const overlay = viewOverlay(), bound = !!(Vault.bound && Vault.bound.id);
    return html`
      ${this._zoomTool()}
      <button class="vt-btn vt-states" type="button" ?disabled=${!bound} aria-label="States graph"
              data-pal="The object's states, as a graph over the page"
              title=${bound ? "The object's states, over the page (H)" : 'No state yet: S saves the first'}
              @click=${() => import('./graph.js').then(m => m.toggleGraph())}>${ICONS.states}</button>
      ${n ? html`<button class="vt-btn vt-clear" type="button" data-pal="Clear the guides"
          title=${`Clear the ${n} guide${n > 1 ? 's' : ''} of ${st.doc.w} × ${st.doc.h}`}
          @click=${() => G.clear()}>${n} guide${n > 1 ? 's' : ''} ✕</button>` : nothing}
      <button class="vt-btn vt-rulers" type="button" aria-pressed=${st.rulers ? 'true' : 'false'} aria-label="Rulers"
              data-pal="Rulers and guides, on or off" title="Rulers and guides — drag a guide out of a ruler"
              @click=${() => G.toggle('rulers')}>${ICONS.rulers}</button>
      <button class="vt-btn vt-magnet" type="button" aria-pressed=${st.magnet ? 'true' : 'false'} aria-label="Magnetism"
              data-pal="Magnetism, on or off" title="Magnetism: to the edges, the centre and the guides — Ctrl held, none"
              @click=${() => G.toggle('magnet')}>${ICONS.magnet}</button>
      ${overlay ? html`<button class="vt-btn vt-guides" type="button" aria-pressed=${overlay.on() ? 'true' : 'false'}
              aria-label="Guides" data-pal="The app's guides over its picture, on or off"
              title="What makes the picture, drawn over it — its handles too — on or off"
              @click=${() => toggleOverlay()}>${ICONS.guides}</button>` : nothing}
      ${hasGround() ? html`<button class="vt-btn vt-ground" type="button" aria-pressed=${groundOn() ? 'true' : 'false'}
              aria-label="Ground" data-pal="The ground, its colour or none" title="The ground: its colour, or none (G)"
              @click=${() => { toggleGround(); this._again(); }}>${ICONS.ground}</button>` : nothing}`;
  }
}

if (!customElements.get('skw-viewtools')) customElements.define('skw-viewtools', SkwViewtools);

export { SkwViewtools };
