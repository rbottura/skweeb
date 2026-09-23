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
 * Folders: objects that share a `folder:<name>` tag collapse into one card —
 * how ckt keeps a session's dot-sets from flooding the grid. A folder is a
 * view, not a place: every object still lives at objects/<id>/, so no link
 * changes. See docs/object-model.md, *Tags that group*.
 *
 * Reads nothing but core/vault.js — no p5, no gamepad. The detail view is
 * built by vault-detail.js; its stylesheet reads core/theme.css's tokens.
 */

/** The folder a row is filed in, from its `folder:` tag, or null. */
export const folderOf = row => {
  const tag = (row.tags || []).find(t => typeof t === 'string' && t.startsWith('folder:'));
  return tag ? tag.slice('folder:'.length) : null;
};

import { Vault }       from './vault.js';
import { paintDetail } from './vault-detail.js';
import { reopenUrl }   from './reopen.js';

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
   * @param {string[]} [opts.accepts]  several types, as a param's `accepts` has
   * @param {(row:object)=>void} [opts.onPick]   makes the cards a picker
   * @param {string} [opts.pickLabel]
   */
  constructor(opts = {}) {
    this._filter    = opts.filter || {};
    // Vault.list() filters on one type because index.json is a flat list and
    // that is the cheap query. A param declares `accepts: [...]`, so the
    // several-types case is narrowed here instead.
    this._accepts   = Array.isArray(opts.accepts) && opts.accepts.length
      ? opts.accepts.slice() : null;
    this._onPick    = opts.onPick || null;
    this._pickLabel = opts.pickLabel || 'Use this';

    this._rows    = [];
    this._type    = null;      // the chip that is on, null being "all"
    this._open    = false;
    this._current = null;      // id showing in the drawer
    this._cards   = new Map(); // id -> card element, for the highlight
    this._openFolders = new Set();

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
    const rows = await Vault.list(this._filter);
    this._rows = this._accepts ? rows.filter(r => this._accepts.includes(r.type)) : rows;
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

    // Rows come newest first, so a folder sits where its newest member would.
    const grid = el('div', 'vp-grid');
    const folders = new Map();
    for (const row of shown) {
      const name = folderOf(row);
      if (!name) { grid.append(this._cardFor(row)); continue; }
      if (!folders.has(name)) {
        folders.set(name, []);
        grid.append(this._folder(name, folders.get(name)));
      }
      folders.get(name).push(row);
    }
    for (const [name, rows] of folders) this._folderNote(name, rows.length);
    this._body.append(grid);
  }

  _cardFor(row) {
    const card = this._card(row);
    this._cards.set(row.id, card);
    return this._onPick ? this._pickable(row, card) : card;
  }

  /**
   * A picker's card carries its own Use button, shown while it is the chosen
   * one: the choice is made where the eye already is, not at the foot of the
   * detail across the panel. A double click uses it outright.
   */
  _pickable(row, card) {
    const cell = el('div', 'vp-cell');
    const use = el('button', 'vp-btn vp-btn--primary vp-use', this._pickLabel);
    use.type = 'button';
    use.addEventListener('click', () => this._use(row.id));
    card.addEventListener('dblclick', () => this._use(row.id));
    cell.append(card, use);
    return cell;
  }

  /** Hand the chosen object to whoever asked, and get out of the way. */
  async _use(id) {
    const o = this._loaded && this._loaded.id === id ? this._loaded : (await Vault.load(id)).object;
    this._onPick(o);
    this.hide();
  }

  /**
   * One folder: a head that opens it, and its cards, built the first time it
   * opens. Toggled in place, so opening a folder does not lose the scroll.
   */
  _folder(name, rows) {
    const box = el('div', 'vp-folder');
    const head = el('button', 'vp-folder-head');
    head.type = 'button';
    const count = el('span', 'vp-folder-count', '');
    head.append(el('span', 'vp-folder-name', name), count);
    box.append(head);
    box.dataset.folder = name;

    let inner = null;
    const fill = () => {
      if (inner) return;
      inner = el('div', 'vp-grid');
      for (const row of rows) inner.append(this._cardFor(row));
      box.append(inner);
    };
    const set = open => {
      box.classList.toggle('vp-folder--open', open);
      if (open) { fill(); this._openFolders.add(name); } else this._openFolders.delete(name);
      if (inner) inner.hidden = !open;
    };
    head.addEventListener('click', () => set(!box.classList.contains('vp-folder--open')));
    // rows is still filling when this runs; open it on the next tick if it was open
    if (this._openFolders.has(name)) queueMicrotask(() => set(true));
    return box;
  }

  _folderNote(name, n) {
    for (const box of this._body.querySelectorAll('.vp-folder')) {
      if (box.dataset.folder === name) box.querySelector('.vp-folder-count').textContent = n;
    }
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

  /** A viewer holds a player and a buffer; leaving one running leaks both. */
  _disposeViewer() {
    if (this._viewer) this._viewer.dispose();
    this._viewer = null;
  }

  async _openDetail(id) {
    this._disposeViewer();
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
    const reopen = await reopenUrl(loaded.object);
    if (this._current !== id) return;

    this._loaded = loaded.object;
    this._paintDetail(loaded.object, { render: loaded.url, thumb: loaded.thumbUrl, reopen });
    this._markCurrent();
  }

  _closeDetail() {
    this._disposeViewer();
    this._current = null;
    this._detail.classList.remove('vp-detail--open');
    this._markCurrent();
  }

  _paintDetail(o, urls) {
    this._detailTitle.textContent = o.type.toUpperCase();
    paintDetail(this._detailBody, o, urls, {
      open: id => this._openDetail(id),
      playing: viewer => { this._disposeViewer(); this._viewer = viewer; },
      pick: this._onPick ? picked => this._use(picked.id) : null,
      pickLabel: this._pickLabel,
    });
  }
}
