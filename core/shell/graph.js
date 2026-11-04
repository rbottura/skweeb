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
 *   Shift clicked, two of them   compared, value by value: one receives, one
 *             arrives, swapped by a button; merged (core/shell/merge.js), the
 *             page has the values as a step and its next save is a state with
 *             both as its parents (S7b).
 *   A over one   the apps that state reaches, by the suite's links
 *             (core/reopen.js): its own, compose's sheet, the rig for a
 *             drawing of marks — each opened in a tab of its own on that
 *             state, `@v3` (S7c).
 *
 * Dragged, it pans; the wheel zooms about the pointer; Escape or H closes it.
 * A Lit component in the page's DOM, drawn by core/shell/shell.css.
 */

import { LitElement, html, svg, nothing } from '../libs/lit/lit-all.min.js';
import { Vault } from '../vault.js';
import { watched, settle, around, tell } from '../steps.js';
import { mergeBase, plan, merged } from './merge.js';
import { innerOf } from '../smart.js';
import { reopenUrl, placeUrl, rigUrl } from '../reopen.js';
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
  static properties = { states: { state: true }, hot: { state: true }, note: { state: true }, picked: { state: true }, cmp: { state: true }, gates: { state: true } };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.states = null; this.hot = null; this.note = 'reading the states…'; this.picked = []; this.cmp = null; this.gates = null;
    this._at = { x: 0, y: 0 };
    this.cam = { x: 0, y: 0, z: 1 };
    this._recipes = new Map();
    this._key = e => {
      // A over a state: where it can go (S7c) — the graph's, not the app's pie.
      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.code === 'KeyQ' || (!e.code && e.key === 'a')) && this.hot != null) {
        e.preventDefault(); e.stopImmediatePropagation(); this._gate(this.hot); return;
      }
      if (e.key === 'Escape' && this.gates) { e.preventDefault(); e.stopImmediatePropagation(); this.gates = null; return; }
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

  // ── Where a state goes (S7c) ─────────────────────────────────────────────

  /** The apps state `n` reaches, by the suite's links, each on that state. */
  async _gate(n) {
    const id = Vault.bound.id;
    const { object } = await innerOf((await Vault.load(id)).object, { version: n });
    const it = { ...object, id };
    const at = url => url && `${url}@v${n}`;
    const own = at(await reopenUrl(it)), sheet = at(await placeUrl(it)), rig = await rigUrl(it);
    const app = it.origin && it.origin.app;
    this.gates = { n, x: this._at.x, y: this._at.y, items: [
      own && { label: `Open in ${app}`, url: own },
      sheet && { label: 'Place in compose', url: sheet },
      rig && { label: 'Rig this', url: rig },
    ].filter(Boolean) };
  }

  _gatesMenu() {
    const g = this.gates;
    if (!g) return nothing;
    return html`<div class="gr-gates" style=${`left:${g.x + 8}px;top:${g.y + 8}px`} role="menu">
      <div class="gr-gates-head">v${g.n} goes to</div>
      ${g.items.length ? g.items.map(i => html`<button class="tb-menu-item" type="button" role="menuitem" title=${i.url}
          @click=${() => { window.open(i.url, '_blank', 'noopener'); this.gates = null; }}>${i.label} ↗</button>`)
        : html`<div class="gr-cmp-note">nowhere the suite's links reach</div>`}
    </div>`;
  }

  // ── Compare and merge (S7b) ──────────────────────────────────────────────

  /** Shift click: a state picked, or let go; two picked, compared. */
  _pick(v) {
    const was = this.picked;
    this.picked = was.includes(v) ? was.filter(x => x !== v) : [...was, v].slice(-2);
    this.cmp = null;
    if (this.picked.length === 2) this._compare(...this.picked);
  }

  /** Two states side by side: the page's held one receives, if it is one of them. */
  async _compare(a, b, swap = false) {
    const held = Vault.bound.version;
    let [recv, inc] = b === held ? [b, a] : [a, b];
    if (swap) [recv, inc] = [inc, recv];
    const base = mergeBase(this.states, recv, inc);
    const [R, I, B] = await Promise.all([recv, inc, base].map(n => (n ? this._recipe(n) : null)));
    if (!laid(R) || !laid(I)) { this.cmp = { recv, inc, rows: [], note: 'compared by their pictures: this app keeps more than its params' }; return; }
    const parts = watched().map((p, id) => ({ id, params: p, keys: p.keys, recv: partOf(R, p.keys), inc: partOf(I, p.keys), base: B && partOf(B, p.keys) }))
      .filter(x => x.recv && x.inc);
    this.cmp = { recv, inc, base, parts, rows: plan(parts) };
  }

  _take(row, take) { row.take = take; this.cmp = { ...this.cmp }; }

  /** Merged: the values on the page as a step; its next save a state with both parents. */
  _merge() {
    const { recv, inc, parts, rows } = this.cmp, bound = Vault.bound;
    this._unpreview();
    for (const part of parts) around(part.params, () => part.params.restore(merged(part.recv, rows, part.id)));
    Vault.bind({ id: bound.id, type: bound.type, version: recv, strict: bound.strict });
    Vault.merging(inc);
    tell(`v${inc} merged into v${recv} — S saves it, a state with both`);
    this.close();
  }

  _panel() {
    const c = this.cmp;
    if (!c) return this.picked.length === 1 ? html`<div class="gr-cmp gr-cmp--wait">v${this.picked[0]} picked — Shift click another to compare</div>` : nothing;
    const label = row => { const p = c.parts && c.parts.find(x => x.id === row.id); return (p && p.params.spec(row.key) && p.params.spec(row.key).label) || row.key; };
    const val = v => (typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : v == null ? '—' : typeof v === 'object' ? '…' : String(v));
    return html`<div class="gr-cmp">
      <div class="gr-cmp-head"><b>v${c.recv}</b> receives · <b>v${c.inc}</b> arrives
        <button class="gr-cmp-swap" type="button" title="The other way round" @click=${() => this._compare(c.recv, c.inc, true)}>⇄</button></div>
      ${c.note ? html`<div class="gr-cmp-note">${c.note}</div>` : !c.rows.length ? html`<div class="gr-cmp-note">the same values</div>` : html`
        <div class="gr-cmp-rows">${c.rows.map(r => html`<div class=${`gr-cmp-row gr-cmp-row--${r.kind}`}>
          <span class="gr-cmp-name">${label(r)}</span>
          <button type="button" class=${r.take ? '' : 'on'} @click=${() => this._take(r, false)}>${val(r.recv)}</button>
          <button type="button" class=${r.take ? 'on' : ''} @click=${() => this._take(r, true)}>${val(r.inc)}</button>
        </div>`)}</div>
        <div class="gr-cmp-acts"><button class="nb-btn nb-btn--primary" type="button" @click=${() => this._merge()}>Merge into v${c.recv}</button>
          <button class="nb-btn" type="button" @click=${() => { this.picked = []; this.cmp = null; }}>Cancel</button></div>`}
    </div>`;
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
    if (e.button !== 0 || e.target.closest('.gr-node, .gr-cmp, .gr-gates')) return;
    this.gates = null;
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
      <span class="gr-hint">hover: the page draws it · click: back to it · Shift click two: compare · A: where it goes · drag: pan · wheel: zoom · Esc</span></div>`;
    if (!st) return html`<div class="gr" @pointerdown=${e => this._down(e)}>${head}<div class="gr-note">${this.note}</div></div>`;
    const pos = layout(st), now = st[st.length - 1].version;
    const wire = (a, b, dashed) => {
      const p = pos.get(a), q = pos.get(b);
      if (!p || !q) return nothing;
      const x1 = p.x + W / 2, y1 = p.y + H, x2 = q.x + W / 2, y2 = q.y;
      return svg`<path class=${dashed ? 'gr-wire gr-wire--merge' : 'gr-wire'} d=${`M${x1} ${y1} C${x1} ${y1 + 30} ${x2} ${y2 - 30} ${x2} ${y2}`}></path>`;
    };
    const w = Math.max(...[...pos.values()].map(p => p.x)) + W, h = Math.max(...[...pos.values()].map(p => p.y)) + H;
    return html`<div class="gr" @pointerdown=${e => this._down(e)} @wheel=${e => this._wheel(e)} @pointermove=${e => { this._at = { x: e.clientX, y: e.clientY }; }}>
      ${head}
      <div class="gr-space" style=${`transform: translate(${this.cam.x}px, ${this.cam.y}px) scale(${this.cam.z})`}>
        <svg class="gr-wires" width=${w} height=${h + 60} viewBox=${`0 0 ${w} ${h + 60}`}>
          ${st.map(s => [s.parent ? wire(s.version, s.parent, false) : nothing, s.parent2 ? wire(s.version, s.parent2, true) : nothing])}
        </svg>
        ${st.map(s => {
          const p = pos.get(s.version);
          const cls = `gr-node${s.version === bound.version ? ' gr-node--held' : ''}${s.version === this.hot ? ' gr-node--hot' : ''}${this.picked.includes(s.version) ? ' gr-node--picked' : ''}`;
          return html`<button class=${cls} type="button" style=${`left:${p.x}px;top:${p.y}px`}
              @pointerenter=${e => { this.hot = s.version; this._preview(s.version, e); }}
              @pointerleave=${() => { if (this.hot === s.version) this.hot = null; this._unpreview(); }}
              @click=${e => (e.shiftKey ? this._pick(s.version) : this._go(s.version))}>
            ${s.url ? html`<img src=${s.url} alt="">` : html`<span class="gr-noimg"></span>`}
            <span class="gr-v">v${s.version}${s.version === now ? ' · latest' : ''}${s.version === bound.version ? ' · held' : ''}</span>
            <span class="gr-title">${s.title}</span>
          </button>`;
        })}
      </div>
      ${this._panel()}${this._gatesMenu()}
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
