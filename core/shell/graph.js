/**
 * graph.js — <skw-graph>, an object's states as a graph over the whole page
 * (S7a, 2026-11-03; docs/scene.md), as the bench found it: see-through, a 2D
 * space panned and zoomed, each state a node with its picture, wired to its
 * parent — a merge to both — v1 at the bottom and the newest at the top.
 *
 * H opens it on the smart object the page holds (core/shell/bindings.js):
 *
 *   hovered   the page draws that state, where all of the app's recipe is its
 *             params (core/steps.js `watched`, core/param-history.js
 *             `partOf`) — particles, fractals, the 3D app's view; held Shift,
 *             it does not. Anywhere else the node's picture says it.
 *   clicked   the page goes back to that state: in place, the same way, a
 *             step Ctrl Z takes back — or, for an app whose recipe is more
 *             than its params, reopened at it (`?open=…@v3`). The page then
 *             holds it, so its next save is a branch from there.
 *
 * Dragged, it pans; the wheel zooms about the pointer; Escape or H closes it.
 * A Lit component in the page's DOM, drawn by core/shell/shell.css.
 */

import { LitElement, html, svg, nothing } from '../libs/lit/lit-all.min.js';
import { Vault } from '../vault.js';
import { watched, settle, around } from '../steps.js';
import { partOf } from '../param-history.js';

import { layout, W, H } from './layout.js';

/** A recipe the page's params hold all of: each part of it some watched params'. */
function laid(recipe) {
  if (!recipe || typeof recipe !== 'object') return null;
  const parts = watched().map(p => [p, partOf(recipe, p.keys)]).filter(([, part]) => part);
  const covered = new Set(parts.map(([, part]) => part));
  const all = covered.has(recipe) || Object.entries(recipe).every(([k, v]) => k === 'tick' || covered.has(v));
  return all && parts.length ? parts : null;
}

class SkwGraph extends LitElement {
  static properties = { states: { state: true }, hot: { state: true }, note: { state: true } };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.states = null; this.hot = null; this.note = 'reading the states…';
    this.cam = { x: 0, y: 0, z: 1 };
    this._recipes = new Map();
    this._key = e => {
      if (e.key === 'Escape' || (!e.ctrlKey && !e.metaKey && !e.altKey && (e.code === 'KeyH' || e.key === 'h'))) {
        e.preventDefault(); e.stopImmediatePropagation(); this.close();
      }
      if (e.key === 'Shift') this._unpreview();
    };
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this._key, true);
    settle();                                           // a change still being made is a step before anything is shown
    this._load();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this._key, true);
    this._unpreview();
  }

  close() { this.remove(); }

  async _load() {
    const bound = Vault.bound;
    if (!bound || !bound.id) { this.note = 'nothing saved here yet — S saves its first state'; return; }
    try {
      this.states = await Vault.states(bound.id);
      this.note = '';
    } catch (err) { this.note = err.message; return; }
    await this.updateComplete;
    this._fit();
  }

  /** What state `n`'s recipe is, kept once read: a state never changes. */
  async _recipe(n) {
    const id = Vault.bound.id;
    if (!this._recipes.has(n)) {
      const now = this.states[this.states.length - 1].version;
      const at = n === now ? (await Vault.load(id)).object : await Vault.version(id, n);
      this._recipes.set(n, (at && at.recipe && at.recipe.recipe) || null);
    }
    return this._recipes.get(n);
  }

  /** The page draws state `n`, its own values kept to come back to. */
  async _preview(n, e) {
    if (e && e.shiftKey) return;
    const parts = laid(await this._recipe(n));
    if (!parts || this.hot !== n) return;
    if (!this._kept) this._kept = watched().map(p => [p, p.values]);
    for (const [p, part] of parts) p.restore(part);
  }

  _unpreview() {
    if (!this._kept) return;
    for (const [p, values] of this._kept) p.restore(values);
    this._kept = null;
  }

  /** Back to state `n`: in place as a step, or reopened at it. */
  async _go(n) {
    const recipe = await this._recipe(n);
    const parts = laid(recipe);
    const bound = Vault.bound;
    if (!parts) { location.search = `?open=${encodeURIComponent(bound.id)}@v${n}`; return; }
    this._unpreview();
    for (const [p, part] of parts) around(p, () => p.restore(part));
    Vault.bind({ id: bound.id, type: bound.type, version: n, strict: bound.strict });
    this.close();
  }

  _fit() {
    const box = this.querySelector('.gr-space');
    if (!box || !this.states) return;
    const pos = layout(this.states), xs = [...pos.values()].map(p => p.x), ys = [...pos.values()].map(p => p.y);
    const w = Math.max(...xs) + W, h = Math.max(...ys) + H;
    const z = Math.min(1, (innerWidth - 120) / w, (innerHeight - 160) / h);
    this.cam = { z, x: (innerWidth - w * z) / 2, y: Math.max(70, (innerHeight - h * z) / 2) };
    this.requestUpdate();
  }

  _down(e) {
    if (e.button !== 0 || e.target.closest('.gr-node')) return;
    const from = { x: e.clientX - this.cam.x, y: e.clientY - this.cam.y };
    const move = ev => { this.cam = { ...this.cam, x: ev.clientX - from.x, y: ev.clientY - from.y }; this.requestUpdate(); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  _wheel(e) {
    e.preventDefault();
    const z = Math.min(3, Math.max(0.2, this.cam.z * Math.exp(-e.deltaY * 0.0015)));
    const k = z / this.cam.z;
    this.cam = { z, x: e.clientX - (e.clientX - this.cam.x) * k, y: e.clientY - (e.clientY - this.cam.y) * k };
    this.requestUpdate();
  }

  render() {
    const st = this.states, bound = Vault.bound;
    const head = html`<div class="gr-head"><b>states</b><span>${st ? `${st.length} of ${bound.id}` : ''}</span>
      <span class="gr-hint">hover: the page draws it · click: back to it · drag: pan · wheel: zoom · Esc</span></div>`;
    if (!st) return html`<div class="gr" @pointerdown=${e => this._down(e)}>${head}<div class="gr-note">${this.note}</div></div>`;
    const pos = layout(st), now = st[st.length - 1].version;
    const wire = (a, b, dashed) => {
      const p = pos.get(a), q = pos.get(b);
      if (!p || !q) return nothing;
      const x1 = p.x + W / 2, y1 = p.y + H, x2 = q.x + W / 2, y2 = q.y;
      return svg`<path class=${dashed ? 'gr-wire gr-wire--merge' : 'gr-wire'} d=${`M${x1} ${y1} C${x1} ${y1 + 30} ${x2} ${y2 - 30} ${x2} ${y2}`}></path>`;
    };
    const w = Math.max(...[...pos.values()].map(p => p.x)) + W, h = Math.max(...[...pos.values()].map(p => p.y)) + H;
    return html`<div class="gr" @pointerdown=${e => this._down(e)} @wheel=${e => this._wheel(e)}>
      ${head}
      <div class="gr-space" style=${`transform: translate(${this.cam.x}px, ${this.cam.y}px) scale(${this.cam.z})`}>
        <svg class="gr-wires" width=${w} height=${h + 60} viewBox=${`0 0 ${w} ${h + 60}`}>
          ${st.map(s => [s.parent ? wire(s.version, s.parent, false) : nothing, s.parent2 ? wire(s.version, s.parent2, true) : nothing])}
        </svg>
        ${st.map(s => {
          const p = pos.get(s.version);
          const cls = `gr-node${s.version === bound.version ? ' gr-node--held' : ''}${s.version === this.hot ? ' gr-node--hot' : ''}`;
          return html`<button class=${cls} type="button" style=${`left:${p.x}px;top:${p.y}px`}
              @pointerenter=${e => { this.hot = s.version; this._preview(s.version, e); }}
              @pointerleave=${() => { if (this.hot === s.version) this.hot = null; this._unpreview(); }}
              @click=${() => this._go(s.version)}>
            ${s.url ? html`<img src=${s.url} alt="">` : html`<span class="gr-noimg"></span>`}
            <span class="gr-v">v${s.version}${s.version === now ? ' · latest' : ''}${s.version === bound.version ? ' · held' : ''}</span>
            <span class="gr-title">${s.title}</span>
          </button>`;
        })}
      </div>
    </div>`;
  }
}

if (!customElements.get('skw-graph')) customElements.define('skw-graph', SkwGraph);

/** H: open the graph over the page, or close it. */
export function toggleGraph() {
  const open = document.querySelector('skw-graph');
  if (open) { open.close(); return; }
  document.body.append(document.createElement('skw-graph'));
}

export { SkwGraph };
