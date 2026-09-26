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
 * changes. The card and its strip are vault-folder.js.
 *
 * Ctrl- or shift-click selects a card, or a folder's every card, for the
 * trash — a view of its own, where they are restored or deleted for good. Not
 * in a picker, which is choosing, not tidying. The bar is vault-trash.js.
 *
 * Reads nothing but core/vault.js — no p5, no gamepad. The detail view is
 * vault-detail.js, a card vault-card.js; the stylesheet reads theme.css.
 */

import { Vault, isTrashed } from './vault.js';
import { paintBar, deleteFlow } from './vault-trash.js';
import { paintDetail } from './vault-detail.js';
import { folder, folderOf } from './vault-folder.js';
export { folderOf };
import { reopenUrl, placeUrl } from './reopen.js';
import { byUse, offerNote, switchOn } from './vault-offer.js';
import { objectCard, pickableCell, fileUrl } from './vault-card.js';

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
   * @param {string} [opts.use]  only sets offered to this use (core/uses.js)
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
    this._offeredTo = opts.use || null;
    this._showAll   = false;     // the use filter set aside (vault-offer.js)
    this._unoffered = [];
    this._onPick    = opts.onPick || null;
    this._pickLabel = opts.pickLabel || 'Use this';

    this._rows    = [];
    this._type    = null;      // the chip that is on, null being "all"
    this._open    = false;
    this._current = null;      // id showing in the drawer
    this._cards   = new Map(); // id -> card element, for the highlight
    this._openFolders = new Set();
    this._inTrash  = false;     // showing the trash instead of the vault
    this._selected = new Set(); // ids, for the bar (vault-trash.js)
    this._tiles    = [];        // [folder tile, its ids], for the highlight
    this._busy     = false;     // moving many: one repaint at the end, not one each

    this._build();

    // A save while the panel is open should appear without being asked for.
    const live = () => { if (this._open && !this._busy) this.refresh(); };
    document.addEventListener('vault:saved', live);
    document.addEventListener('vault:duplicate', live);
    // A retag can move an object into a folder, or out of what a picker offers.
    document.addEventListener('vault:retagged', live);

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !this._open) return;
      if (this._current) this._closeDetail();
      else if (this._selected.size) this._select(null);
      else this.hide();
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
    const ours = rows => rows.filter(r => !this._accepts || this._accepts.includes(r.type));
    const rows = ours(await Vault.list(this._filter));
    const trashed = ours(await Vault.list({ ...this._filter, trash: true }));
    this._trashBtn.textContent = 'trash' + (trashed.length ? ' ' + trashed.length : '');
    if (this._inTrash) {
      this._unoffered = [];
      this._rows = trashed;
    } else {
      // A use filter narrows sets only, and says what it left out (vault-offer.js).
      const { kept, left } = await byUse(rows, this._offeredTo);
      this._unoffered = left;
      this._rows = this._showAll ? rows : kept;
    }
    const here = new Set(this._rows.map(r => r.id));
    for (const id of this._selected) if (!here.has(id)) this._selected.delete(id);
    this._paint();
  }

  // ── Chrome ─────────────────────────────────────────────────────────────────

  _build() {
    this._root = el('div', 'vp');
    this._root.setAttribute('role', 'dialog');
    this._root.setAttribute('aria-label', 'Vault');

    const head = el('div', 'vp-head');
    this._title = el('span', 'vp-title', 'VAULT');
    head.append(this._title);
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

    this._trashBtn = el('button', 'vp-chip vp-trash', 'trash');
    this._trashBtn.title = 'What was put away — restore it, or delete it for good';
    this._trashBtn.hidden = !!this._onPick;
    this._trashBtn.addEventListener('click', () => {
      this._inTrash = !this._inTrash;
      this._trashBtn.classList.toggle('vp-chip--on', this._inTrash);
      this._title.textContent = this._inTrash ? 'TRASH' : 'VAULT';
      this._selected.clear();
      this._closeDetail();
      this.refresh();
    });

    head.append(this._trashBtn, reload, close);

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
    this._tiles = [];
    this._paintFilters();

    if (!Vault.available) return this._notice(
      'No vault here.',
      'This page is being served without the write API, so there is nothing to read. Start it with ',
      'node server.js');

    const shown = this._rows.filter(r => !this._type || r.type === this._type);
    this._shown = shown;
    this._bar = el('div', 'vp-bar');
    this._body.append(this._bar);
    this._paintBar();
    if (this._unoffered.length) this._body.append(offerNote({
      use: this._offeredTo, left: this._unoffered, showAll: this._showAll,
      onToggle: () => { this._showAll = !this._showAll; this.refresh(); },
    }));

    if (!shown.length) return this._notice(
      this._inTrash ? 'The trash is empty.'
        : this._type ? 'Nothing of that type yet.'
        : this._offeredTo ? 'Nothing here is offered for this yet.' : 'The vault is empty.',
      this._inTrash ? ' Ctrl-click objects in the vault to select them, then move them here.'
        : this._type ? 'Every object is still here — only this filter is hiding them.'
        : this._offeredTo ? ' A set is offered in its detail, under Offered as — V opens the vault.'
        : 'Draw something and save it, or record a sequence and export it from the timeline.');

    this._count.textContent = shown.length === this._rows.length
      ? shown.length + ' objects'
      : shown.length + ' of ' + this._rows.length;

    // Rows come newest first, so a folder sits where its newest member would.
    const order = [];
    const folders = new Map();
    for (const row of shown) {
      const name = folderOf(row);
      if (!name) { order.push(row); continue; }
      if (!folders.has(name)) { folders.set(name, []); order.push(name); }
      folders.get(name).push(row);
    }

    const grid = el('div', 'vp-grid vp-grid--top');
    for (const item of order) {
      if (typeof item !== 'string') { grid.append(this._cardFor(item)); continue; }
      const rows = folders.get(item);
      const [tile, strip] = folder({
        name: item,
        rows,
        open: this._openFolders.has(item),
        thumb: row => row.thumb ? fileUrl(row.id, row.thumb) : null,
        card: row => this._cardFor(row),
        onToggle: on => on ? this._openFolders.add(item) : this._openFolders.delete(item),
        select: e => this._modClick(e, rows.map(r => r.id)),
      });
      this._tiles.push([tile, rows.map(r => r.id)]);
      grid.append(tile, strip);
    }
    this._body.append(grid);
  }

  _cardFor(row) {
    const card = objectCard(row, { on: row.id === this._current,
      onClick: e => this._modClick(e, [row.id]) || this._openDetail(row.id) });
    card.classList.toggle('vp-card--picked', this._selected.has(row.id));
    this._cards.set(row.id, card);
    return this._onPick ? pickableCell(card, this._pickLabel, () => this._use(row.id)) : card;
  }

  // ── Selection and the trash ────────────────────────────────────────────────

  /** Ctrl- or shift-click: select these ids, or unselect them. True when it was one. */
  _modClick(e, ids) {
    if (this._onPick || !(e.ctrlKey || e.metaKey || e.shiftKey)) return false;
    const all = ids.every(id => this._selected.has(id));
    for (const id of ids) if (all) this._selected.delete(id); else this._selected.add(id);
    this._select(this._selected);
    return true;
  }

  /** Set the selection — null clears it — and show it without a repaint. */
  _select(ids) {
    if (ids !== this._selected) this._selected = new Set(ids || []);
    this._markCurrent();
    this._paintBar();
  }

  _paintBar() {
    if (!this._bar) return;
    paintBar(this._bar, {
      selected: this._selected.size, inTrash: this._inTrash, shown: this._shown.length,
      act: a => a === 'all' ? this._select(this._shown.map(r => r.id))
        : a === 'none' ? this._select(null) : this._bin(a, [...this._selected]),
    });
  }

  /** Trash, restore or delete for good — then one repaint, however many moved. */
  async _bin(action, ids) {
    this._busy = true;
    let failed = null;
    try {
      if (action === 'trash') await Vault.trash(ids);
      else if (action === 'restore') await Vault.restore(ids);
      else if (!(await deleteFlow(this._root, ids))) return;
    } catch (err) {
      failed = err;
    } finally {
      this._busy = false;
    }
    if (!failed) for (const id of ids) this._selected.delete(id);
    if (!failed && ids.includes(this._current)) this._closeDetail();
    await this.refresh();
    if (failed) this._count.textContent = 'could not: ' + failed.message;
  }

  /**
   * Hand the chosen object to whoever asked, and get out of the way. A set
   * picked from past the use filter is switched on for that use: using it as
   * one is offering it as one.
   */
  async _use(id) {
    const o = this._loaded && this._loaded.id === id ? this._loaded : (await Vault.load(id)).object;
    o.tags = await switchOn(o, this._offeredTo);
    this._onPick(o);
    this.hide();
  }

  /** Move the highlight without rebuilding the grid, which would lose scroll. */
  _markCurrent() {
    if (!this._cards) return;
    for (const [id, card] of this._cards) {
      card.classList.toggle('vp-card--on', id === this._current);
      card.classList.toggle('vp-card--picked', this._selected.has(id));
    }
    for (const [tile, ids] of this._tiles) {
      tile.classList.toggle('vp-card--picked', ids.every(id => this._selected.has(id)));
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
    const [reopen, place] = await Promise.all([reopenUrl(loaded.object), placeUrl(loaded.object)]);
    if (this._current !== id) return;

    this._loaded = loaded.object;
    this._paintDetail(loaded.object, { render: loaded.url, thumb: loaded.thumbUrl, reopen, place });
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
      bin: this._onPick ? null : action => this._bin(action, [o.id]),
      trashed: isTrashed(o),
    });
  }
}
