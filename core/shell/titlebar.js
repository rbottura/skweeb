/**
 * titlebar.js — the title bar the bench found (S12, 2026-11-03; docs/scene.md):
 * the app, the search, Save and Export, above every app on core's kit.
 *
 * The first of the suite's components written with Lit (core/libs/lit/,
 * CLAUDE.md rule 8), rendering into the page's DOM so theme.css draws it.
 * It asks nothing of an app. Save presses the page's own save — its Export
 * box's (core/boxes/export.js) — and Export lists that box's acts, section
 * by section, and its print: an act the box gains is in the menu the day it
 * is in the box. core/Bar.js puts it at the head of the page.
 */

import { LitElement, html, nothing } from '../libs/lit/lit-all.min.js';
import { openPalette } from '../Palette.js';
import { actsOnPage, showPrint } from '../boxes/export.js';

class SkwTitlebar extends LitElement {
  static properties = { app: { type: String }, menu: { state: true } };

  createRenderRoot() { return this; }                 // the page's DOM: theme.css draws it, the checks find it

  constructor() {
    super();
    this.app = '';
    this.menu = null;
    this._away = e => { if (this.menu && !this.contains(e.target)) this.menu = null; };
    this._esc = e => { if (this.menu && e.key === 'Escape') { e.stopPropagation(); this.menu = null; } };
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('pointerdown', this._away, true);
    window.addEventListener('keydown', this._esc, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this._away, true);
    window.removeEventListener('keydown', this._esc, true);
  }

  /** The app's own save, as its Export box has it. */
  _save() {
    const b = document.querySelector('.pp-actions .nb-btn[data-act="save"]');
    if (b && !b.disabled) b.click();
  }

  /** The Export box as it stands: its sections and the acts that apply now. */
  _sections() { return actsOnPage(); }

  _run(button) { this.menu = null; button.click(); }

  /** The print, under the box: its drawer opened and brought into view. */
  _print() { this.menu = null; showPrint(); }

  render() {
    return html`
      <div class="tb-brand"><span class="tb-mark" aria-hidden="true"></span><span>skweeb</span><span class="tb-crumb">/</span><span class="tb-app">${this.app}</span></div>
      <button class="tb-search" type="button" title="Every control and act of the page, by name" @click=${() => openPalette()}>
        <span>Search controls and acts</span><kbd>²</kbd><kbd>Ctrl K</kbd>
      </button>
      <div class="tb-acts">
        <button class="nb-btn nb-btn--primary tb-save" type="button" title="The app's save, into the vault [S]" @click=${() => this._save()}>Save <kbd>S</kbd></button>
        <button class="nb-btn tb-export" type="button" aria-haspopup="menu" aria-expanded=${this.menu ? 'true' : 'false'}
                @click=${() => { this.menu = this.menu ? null : this._sections(); }}>Export ▾</button>
      </div>
      ${this.menu ? html`
        <div class="tb-menu" role="menu">
          ${this.menu.map(s => html`
            <div class="tb-menu-head">${s.title}</div>
            ${s.acts.map(a => html`<button class="tb-menu-item" type="button" role="menuitem" @click=${() => this._run(a.button)}>${a.label}</button>`)}`)}
          <div class="tb-menu-head">Print</div>
          <button class="tb-menu-item" type="button" role="menuitem" @click=${() => this._print()}>Print… a sheet, a dpi</button>
        </div>` : nothing}`;
  }
}

if (!customElements.get('skw-titlebar')) customElements.define('skw-titlebar', SkwTitlebar);

export { SkwTitlebar };
