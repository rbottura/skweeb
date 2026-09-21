/**
 * VaultPanel.js — the window onto the objects on disk.
 *
 * The vault had a write path and no read path: objects went in and sat there.
 * This is `Vault.list()` with something in front of it.
 *
 * It lives in core/ rather than in an app because every app needs the same
 * window, and because at M2 this markup is the object picker that a param of
 * `type: "object"` renders — pass `onPick` and the cards become selectable.
 * That is the whole reason cross-app loading is nearly free: see
 * docs/core-api.md, params.js.
 *
 * Two tiers of read, matching the two tiers of storage:
 *   the grid comes from index.json alone, so it stays fast with thousands
 *   of objects and never opens a folder;
 *   the detail drawer calls Vault.load(), which opens exactly one.
 *
 * Reads nothing but core/vault.js — no p5, no gamepad, no HUD. Its stylesheet
 * falls back to its own colours when an app supplies no --hud-* tokens.
 */

import { Vault } from './vault.js';

/** Files inside an object folder are served straight from the vault. */
const fileUrl = (id, file) => '/vault/objects/' + id + '/' + file;

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;   // never innerHTML: titles are user data
  return node;
};

export class VaultPanel {
  /**
   * @param {object} [opts]
   * @param {{type?:string, app?:string, tag?:string}} [opts.filter]  fixed filter
   * @param {(row:object)=>void} [opts.onPick]   makes the cards a picker
   * @param {string} [opts.pickLabel]
   */
  constructor(opts = {}) {
    this._filter    = opts.filter || {};
    this._onPick    = opts.onPick || null;
    this._pickLabel = opts.pickLabel || 'Use this';

    this._rows    = [];
    this._type    = null;      // the chip that is on, null being "all"
    this._open    = false;
    this._current = null;      // id showing in the drawer
    this._cards   = new Map(); // id -> card element, for the highlight

    this._build();

    // A save while the panel is open should appear without being asked for.
    const live = () => { if (this._open) this.refresh(); };
    document.addEventListener('vault:saved', live);
    document.addEventListener('vault:duplicate', live);

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !this._open) return;
      if (this._current) this._closeDetail(); else this.hide();
    });
  }

  // ── Visibility ─────────────────────────────────────────────────────────────

  show()   { this._open = true;  this._root.classList.add('vp--visible'); this.refresh(); }
  hide()   { this._open = false; this._root.classList.remove('vp--visible'); this._closeDetail(); }
  toggle() { this._open ? this.hide() : this.show(); }

  get isOpen() { return this._open; }

  // ── Data ───────────────────────────────────────────────────────────────────

  /** Ask the server again, then repaint. */
  async refresh() {
    await Vault.refresh();
    this._rows = await Vault.list(this._filter);
    this._paint();
  }

  // ── Chrome ─────────────────────────────────────────────────────────────────

  _build() {
    this._root = el('div', 'vp');
    this._root.setAttribute('role', 'dialog');
    this._root.setAttribute('aria-label', 'Vault');

    const head = el('div', 'vp-head');
    head.append(el('span', 'vp-title', 'VAULT'));
    this._count = el('span', 'vp-count', '');
    head.append(this._count);

    this._filters = el('div', 'vp-filters');
    head.append(this._filters, el('span', 'vp-spacer'));

    const reload = el('button', 'vp-btn', '⟳');
    reload.title = 'Read the vault again';
    reload.addEventListener('click', () => this.refresh());

    const close = el('button', 'vp-btn', '✕');
    close.title = 'Close (Esc)';
    close.addEventListener('click', () => this.hide());

    head.append(reload, close);

    this._body = el('div', 'vp-body');
    this._root.append(head, this._body, this._buildDetail());
    document.body.append(this._root);
  }

  _buildDetail() {
    this._detail = el('aside', 'vp-detail');

    const head = el('div', 'vp-detail-head');
    this._detailTitle = el('span', 'vp-title', '');
    const back = el('button', 'vp-btn', '✕');
    back.title = 'Close this object';
    back.addEventListener('click', () => this._closeDetail());
    head.append(this._detailTitle, el('span', 'vp-spacer'), back);

    this._detailBody = el('div', 'vp-detail-body');
    this._detail.append(head, this._detailBody);
    return this._detail;
  }

  // ── The grid ───────────────────────────────────────────────────────────────

  _paint() {
    this._body.replaceChildren();
    this._cards = new Map();
    this._paintFilters();

    if (!Vault.available) return this._notice(
      'No vault here.',
      'This page is being served without the write API, so there is nothing to read. Start it with ',
      'node server.js');

    const shown = this._rows.filter(r => !this._type || r.type === this._type);

    if (!shown.length) return this._notice(
      this._type ? 'Nothing of that type yet.' : 'The vault is empty.',
      this._type
        ? 'Every object is still here — only this filter is hiding them.'
        : 'Draw something and save it, or record a sequence and export it from the timeline.');

    this._count.textContent = shown.length === this._rows.length
      ? shown.length + ' objects'
      : shown.length + ' of ' + this._rows.length;

    const grid = el('div', 'vp-grid');
    for (const row of shown) {
      const card = this._card(row);
      this._cards.set(row.id, card);
      grid.append(card);
    }
    this._body.append(grid);
  }

  /** Move the highlight without rebuilding the grid, which would lose scroll. */
  _markCurrent() {
    if (!this._cards) return;
    for (const [id, card] of this._cards) {
      card.classList.toggle('vp-card--on', id === this._current);
    }
  }

  _paintFilters() {
    this._filters.replaceChildren();
    const types = [...new Set(this._rows.map(r => r.type))].sort();
    if (types.length < 2) return;            // one type is not a choice

    const chip = (label, type) => {
      const b = el('button', 'vp-chip' + (this._type === type ? ' vp-chip--on' : ''), label);
      b.addEventListener('click', () => { this._type = type; this._paint(); });
      return b;
    };
    this._filters.append(chip('all', null));
    for (const t of types) this._filters.append(chip(t, t));
  }

  _card(row) {
    const card = el('button', 'vp-card' + (row.id === this._current ? ' vp-card--on' : ''));
    card.type = 'button';

    const img = el('img', 'vp-thumb');
    img.loading = 'lazy';
    img.alt = '';
    if (row.thumb) img.src = fileUrl(row.id, row.thumb);
    card.append(img);

    const meta = el('div', 'vp-meta');
    meta.append(el('div', 'vp-name', row.title || row.id));

    const sub = el('div', 'vp-sub');
    sub.append(el('span', 'vp-type', row.type));
    const facts = [];
    if (row.render && row.render.w) facts.push(row.render.w + '×' + row.render.h);
    if (row.render && row.render.frames > 1) facts.push(row.render.frames + 'f');
    if (facts.length) sub.append(document.createTextNode(' · ' + facts.join(' · ')));
    meta.append(sub);

    card.append(meta);
    card.addEventListener('click', () => this._openDetail(row.id));
    return card;
  }

  _notice(strongText, bodyText, code) {
    const n = el('div', 'vp-notice');
    n.append(el('strong', null, strongText), document.createTextNode(bodyText));
    if (code) n.append(el('code', null, code));
    this._body.append(n);
    this._count.textContent = '';
  }

  // ── The drawer ─────────────────────────────────────────────────────────────

  async _openDetail(id) {
    this._current = id;
    this._markCurrent();
    this._detail.classList.add('vp-detail--open');
    this._detailBody.replaceChildren(el('div', 'vp-sub', 'reading…'));

    let loaded;
    try {
      loaded = await Vault.load(id);
    } catch (err) {
      this._detailBody.replaceChildren(el('div', 'vp-sub', String(err.message || err)));
      return;
    }
    if (this._current !== id) return;         // clicked away while loading

    this._paintDetail(loaded.object, loaded.url);
    this._markCurrent();
  }

  _closeDetail() {
    this._current = null;
    this._detail.classList.remove('vp-detail--open');
    this._markCurrent();
  }

  _paintDetail(o, renderUrl) {
    this._detailTitle.textContent = o.type.toUpperCase();
    const body = this._detailBody;
    body.replaceChildren();

    const preview = el('img', 'vp-preview');
    preview.alt = o.title || o.id;
    preview.src = renderUrl;
    body.append(preview);

    body.append(el('div', 'vp-name', o.title || '(untitled)'));

    const r = o.render || {};
    const facts = [
      ['id', o.id],
      ['made by', o.origin ? o.origin.app + ' ' + o.origin.version : '—'],
      ['created', new Date(o.created).toLocaleString()],
      ['size', r.w ? r.w + ' × ' + r.h + (r.density > 1 ? '  @' + r.density + '×' : '') : '—'],
    ];
    if (r.frames > 1) facts.push(['frames', r.frames + (r.fps ? ' @ ' + r.fps + 'fps' : '') + (r.loop ? ', loops' : '')]);
    facts.push(['file', r.file + '  ' + kb(r.bytes)]);
    facts.push(['seed', o.seed == null ? 'null — nothing random in it' : String(o.seed)]);
    if (o.tags && o.tags.length) facts.push(['tags', o.tags.join(', ')]);
    body.append(table(facts));

    // Lineage. parents is frozen history, refs is a live dependency — the
    // difference matters enough that the panel names it rather than merging.
    if ((o.parents && o.parents.length) || (o.refs && o.refs.length)) {
      body.append(el('div', 'vp-section', 'Lineage'));
      const lin = el('div', 'vp-lineage');
      for (const p of o.parents || []) lin.append(this._idLink('made from ', p));
      for (const f of o.refs || [])    lin.append(this._idLink('depends on ', f));
      body.append(lin);
    }

    body.append(el('div', 'vp-section', o.recipe ? 'Recipe' : 'No recipe'));
    if (o.recipe) {
      body.append(el('pre', 'vp-json', JSON.stringify(o.recipe, null, 1)));
    } else {
      const why = el('div', 'vp-sub vp-leaf');
      why.textContent = 'A leaf: this one cannot redraw itself. Correct when something '
                      + 'came from outside — an image loaded under the ink.';
      body.append(why);
    }

    body.append(this._actions(o, renderUrl));
  }

  _idLink(prefix, id) {
    const line = el('div');
    line.append(document.createTextNode(prefix));
    const a = el('a', null, id);
    a.addEventListener('click', () => this._openDetail(id));
    line.append(a);
    return line;
  }

  _actions(o, renderUrl) {
    const row = el('div', 'vp-actions');

    const open = el('button', 'vp-btn', 'Open render ↗');
    open.addEventListener('click', () => window.open(renderUrl, '_blank', 'noopener'));

    const save = el('button', 'vp-btn', 'Download');
    save.addEventListener('click', () => {
      const a = el('a');
      a.href = renderUrl;
      a.download = (o.title || o.id).replace(/[^a-z0-9]+/gi, '-').toLowerCase()
                 + '.' + ext((o.render || {}).file || 'png');
      a.click();
    });

    const copy = el('button', 'vp-btn', 'Copy id');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(o.id);
        copy.textContent = 'Copied';
        setTimeout(() => { copy.textContent = 'Copy id'; }, 1200);
      } catch { copy.textContent = o.id; }
    });

    row.append(open, save, copy);

    if (this._onPick) {
      const pick = el('button', 'vp-btn', this._pickLabel);
      pick.addEventListener('click', () => { this._onPick(o); this.hide(); });
      row.append(pick);
    }
    return row;
  }
}

// ── Small helpers ────────────────────────────────────────────────────────────

function table(rows) {
  const t = el('table', 'vp-facts');
  for (const [key, value] of rows) {
    const tr = el('tr');
    tr.append(el('th', null, key), el('td', null, value));
    t.append(tr);
  }
  return t;
}

const ext = file => String(file).split('.').pop();

function kb(bytes) {
  if (!bytes) return '';
  return bytes < 1024 * 1024
    ? Math.round(bytes / 1024) + ' KB'
    : (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
