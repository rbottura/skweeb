/**
 * maker.js — the material maker: pick up to twelve sprites, see them dither,
 * save them as a material.
 *
 * A column that opens beside the viewer (grid's layout makes room for it), so
 * the dither stays in sight: every change to the tray is handed to the page
 * as the tiles to preview with, and closing hands back nothing — the material
 * in the recipe returns. Three drawers, top to bottom:
 *
 *   Pick           a shelf (shelves.js) and its sprites; a click puts one in
 *                  the tray or takes it out. A family on disk can also be
 *                  copied into the vault whole, as its legacy folder and set
 *   Light → dark   the tray (tray.js), measured on the ground the dither is on
 *                  (tone.js) and kept in that order until you move one
 *   Save           a name, and the set (material-save.js)
 *
 * Opened while a vault material is chosen, it starts from that material's
 * members in their order, and a material grid made can be saved over: *Save
 * changes* makes the new version and puts the old one away, since dithers made
 * with it still name it (material-save.js, *Editing*). *Save as a new
 * material* leaves it where it is.
 */

import { Drawer }       from '../../core/Drawer.js';
import { Vault }        from '../../core/vault.js';
import { roleOf }       from '../../core/uses.js';
import { Tray, CAP }    from './tray.js';
import { toneOf }       from './tone.js';
import { tileFromUrl }  from './materials.js';
import { shelves, itemsOf } from './shelves.js';
import { saveMaterial, copyFamily } from './material-save.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;   // titles are user data: never innerHTML
  return node;
};

export class Maker {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mount                  the column it lives in
   * @param {() => string} opts.ground                the ground the dither is on
   * @param {(tiles: ?CanvasImageSource[]) => void} opts.onTiles  the preview, or null
   * @param {(set: object) => void} opts.onSaved      a material was made
   * @param {(open: boolean) => void} opts.onToggle   make room for the column, or take it back
   * @param {(text: string) => void} opts.say         the bar
   */
  constructor({ mount, ground, onTiles, onSaved, onToggle, say }) {
    Object.assign(this, { mount, ground, onTiles, onSaved, onToggle, say });
    this.tray = new Tray();
    this.images = new Map();      // key → decoded tile
    this.cells = new Map();       // key → its button on the shelf on show
    this.shelfList = [];
    this.shelf = null;
    this.isOpen = false;
    this.saving = false;
    this.startedFrom = null;      // the material the tray began as
    this.editing = null;          // its envelope, when Save may replace it
  }

  /** @param {?string} from  a vault material to start from */
  async open(from = null) {
    if (!this.root) this.build();
    this.isOpen = true;
    this.mount.hidden = false;
    this.onToggle(true);
    // A tray in progress is kept — unless it began as another material.
    if (from && (!this.tray.items.length || (this.startedFrom && this.startedFrom !== from))) {
      await this.startFrom(from);
    }
    this.update();
    await this.loadShelves();
  }

  close() {
    this.isOpen = false;
    this.mount.hidden = true;
    this.onTiles(null);
    this.onToggle(false);
  }

  /** The ground changed: every tile reads differently now. */
  setGround() {
    if (!this.tray.items.length) return;
    this.tray.retone(item => toneOf(this.images.get(item.key), this.ground()));
    this.update();
  }

  // ── Building ─────────────────────────────────────────────────────────────

  build() {
    this.root = el('aside', 'pp pp--docked mk');
    this.root.setAttribute('aria-label', 'material maker');
    const head = el('div', 'pp-head');
    const close = el('button', 'pp-btn', '✕');
    close.type = 'button';
    close.title = 'Close the maker — the material in the recipe comes back';
    close.addEventListener('click', () => this.close());
    head.append(el('span', 'pp-title', 'material maker'), el('span', 'pp-spacer'), close);
    const body = el('div', 'pp-body');
    this.root.append(head, body);

    const pick = new Drawer({ title: 'Pick', open: true });
    this.shelfSelect = el('select', 'pp-select');
    this.shelfSelect.addEventListener('change', () => this.showShelf(this.shelfSelect.value));
    this.shelfGrid = el('div', 'mk-grid');
    this.copyBtn = button('Copy the family into the vault', () => this.copyShelf());
    this.copyBtn.title = 'Every sprite as a shape in a “legacy” folder, and the family as a set — offered as a material and to ckt';
    this.copyBtn.hidden = true;
    pick.body.append(this.shelfSelect, this.shelfGrid, this.copyBtn);

    this.trayDrawer = new Drawer({ title: 'Light → dark', open: true });
    this.trayEl = el('div', 'mk-tray');
    this.sortBtn = button('Sort by tone', () => { this.tray.resort(); this.update(); });
    const clear = button('Clear', () => { this.tray.clear(); this.update(); });
    this.orderNote = el('div', 'mk-note');
    const row = el('div', 'mk-row');
    row.append(this.sortBtn, clear);
    this.trayDrawer.body.append(this.trayEl, row, this.orderNote);

    const save = new Drawer({ title: 'Save', open: true });
    this.nameEl = el('input', 'pp-text');
    this.nameEl.placeholder = 'a name — or one is made up';
    this.saveBtn = button('Save the material', () => this.save(false), true);
    this.saveBtn.classList.add('nb-btn--wide');
    this.newBtn = button('Save as a new material', () => this.save(true));
    this.newBtn.classList.add('nb-btn--wide', 'mk-new');
    const note = el('div', 'mk-note',
      'Sprites from disk are copied into the vault once, in a “legacy” folder.');
    save.body.append(this.nameEl, this.saveBtn, this.newBtn, note);

    body.append(pick.root, this.trayDrawer.root, save.root);
    this.mount.replaceChildren(this.root);
  }

  // ── Shelves ──────────────────────────────────────────────────────────────

  /** Read what there is again — a set saved since the last open is on the list. */
  async loadShelves() {
    this.shelfList = await shelves();
    const keep = this.shelf && this.shelfList.some(s => s.id === this.shelf.id) ? this.shelf.id : null;
    this.shelfSelect.replaceChildren();
    const groups = new Map();
    for (const shelf of this.shelfList) {
      if (!groups.has(shelf.group)) {
        const g = el('optgroup');
        g.label = shelf.group;
        groups.set(shelf.group, g);
        this.shelfSelect.append(g);
      }
      const o = el('option', null, shelf.label + (shelf.count ? `  (${shelf.count})` : ''));
      o.value = shelf.id;
      groups.get(shelf.group).append(o);
    }
    if (!this.shelfList.length) {
      this.shelfGrid.replaceChildren(el('div', 'pp-empty', 'no sprites on disk and no vault'));
      return;
    }
    const first = keep || this.shelfList[0].id;
    this.shelfSelect.value = first;
    await this.showShelf(first);
  }

  async showShelf(id) {
    this.shelf = this.shelfList.find(s => s.id === id) || null;
    this.cells.clear();
    this.shelfGrid.replaceChildren(el('div', 'pp-empty', 'reading…'));
    if (!this.shelf) return;
    const shelf = this.shelf;
    let items;
    try {
      items = await shelf.items();
    } catch (err) {
      this.shelfGrid.replaceChildren(el('div', 'pp-empty', 'could not read it: ' + err.message));
      return;
    }
    if (this.shelf !== shelf) return;             // another shelf was picked meanwhile
    this.shelfItems = items;
    this.copyBtn.hidden = !shelf.id.startsWith('disk:') || !items.length;
    this.copyBtn.textContent = `Copy all ${items.length} into the vault`;
    this.shelfGrid.replaceChildren();
    if (!items.length) this.shelfGrid.append(el('div', 'pp-empty', 'nothing in it'));
    for (const item of items) {
      const cell = el('button', 'mk-item');
      cell.type = 'button';
      cell.title = item.label;
      const img = el('img');
      img.loading = 'lazy';
      img.alt = '';
      img.src = item.thumb;
      cell.append(img);
      cell.addEventListener('click', () => this.toggle({ ...item, shelf: shelf.label }));
      this.cells.set(item.key, cell);
      this.shelfGrid.append(cell);
    }
    this.mark();
  }

  /** The disk family on show, whole, into the vault. */
  async copyShelf() {
    const shelf = this.shelf;
    if (!shelf || !shelf.id.startsWith('disk:') || this.copying) return;
    this.copying = true;
    this.copyBtn.disabled = true;
    try {
      const items = this.shelfItems;
      const images = (await Promise.all(items.map(i => tileFromUrl(i.url)))).filter(Boolean);
      const set = await copyFamily({
        family: shelf.id.slice('disk:'.length), items, images, onStatus: t => this.say(t),
      });
      this.say(`${set.title}: ${items.length} sprites in the vault, in the “legacy ${set.recipe.family}” folder`);
      await this.loadShelves();                   // the new set is a shelf now
    } catch (err) {
      console.error('[grid] family not copied:', err);
      this.say('the family was not copied: ' + err.message);
    } finally {
      this.copying = false;
      this.copyBtn.disabled = false;
    }
  }

  // ── The tray ─────────────────────────────────────────────────────────────

  /** In if it is out, out if it is in. */
  async toggle(item) {
    if (this.tray.has(item.key)) {
      this.tray.remove(item.key);
      return this.update();
    }
    if (this.tray.full) return this.say(`a material is ${CAP} tiles at most — take one out first`);
    const ok = await this.admit(item);
    if (!ok) return this.say(`${item.label} would not load`);
    this.update();
  }

  /** Decode, measure and add one. False when it will not load. */
  async admit(item) {
    const image = await tileFromUrl(item.url);
    if (!image) return false;
    this.images.set(item.key, image);
    return this.tray.add({ ...item, tone: toneOf(image, this.ground()) });
  }

  /**
   * A material's members, in its own order: the hand order is kept. One grid
   * made can be saved over; any other set is only a start.
   */
  async startFrom(id) {
    try {
      const { object } = await Vault.load(id);
      const items = itemsOf(object);
      this.tray.clear();
      this.tray.auto = false;
      for (const item of items.slice(0, CAP)) await this.admit({ ...item, shelf: object.title || 'the material' });
      this.startedFrom = id;
      this.editing = editable(object) ? object : null;
      this.nameEl.value = this.editing ? object.title : '';
      const more = items.length > CAP ? ` — the first ${CAP} of its ${items.length}` : '';
      this.say(this.editing
        ? `editing “${object.title}” — save changes, or save it as a new material`
        : `starting from “${object.title}”${more}; it is not a grid material, so this makes a new one`);
    } catch (err) {
      this.say('could not read that material: ' + err.message);
    }
  }

  /** The shelf's picked sprites lit, the tray drawn, the preview handed over. */
  update() {
    const items = this.tray.items;
    const n = items.length;
    this.mark();

    const ground = this.ground();
    this.trayEl.replaceChildren();
    if (!n) this.trayEl.append(el('div', 'pp-empty', 'pick sprites above — they line up here, light to dark'));
    items.forEach((item, i) => this.trayEl.append(this.slot(item, i, n, ground)));

    this.trayDrawer.note(`${n} / ${CAP}`);
    this.sortBtn.disabled = this.tray.auto || n < 2;
    this.orderNote.textContent = n < 2 ? ''
      : this.tray.auto ? `in order of how light each reads on ${ground === 'none' ? 'paper' : ground}`
      : 'your order — Sort by tone puts it back';
    this.saveBtn.disabled = n < 2 || this.saving;
    this.saveBtn.textContent = this.saving ? 'saving…'
      : this.editing ? `Save changes to “${this.editing.title}”` : 'Save the material';
    this.newBtn.hidden = !this.editing;
    this.newBtn.disabled = n < 2 || this.saving;
    if (this.isOpen) this.onTiles(n ? items.map(t => this.images.get(t.key)) : null);
  }

  mark() {
    for (const [key, cell] of this.cells) cell.classList.toggle('mk-item--on', this.tray.has(key));
  }

  slot(item, i, n, ground) {
    const s = el('div', 'mk-slot' + (ground === 'none' ? ' mk-slot--none' : ''));
    if (ground !== 'none') s.style.background = ground;
    const tone = Math.round(item.tone * 100);
    s.title = `${i + 1}. ${item.label} — reads ${tone} of 100 on this ground`;
    const img = el('img');
    img.alt = item.label;
    img.src = item.thumb;
    const bar = el('div', 'mk-slot-bar');
    const nudge = (label, title, by, off) => {
      const b = el('button', null, label);
      b.type = 'button';
      b.title = title;
      b.disabled = off;
      b.addEventListener('click', () => {
        if (by) this.tray.move(item.key, by); else this.tray.remove(item.key);
        this.update();
      });
      return b;
    };
    bar.append(nudge('‹', 'lighter', -1, i === 0), nudge('×', 'take it out', 0, false),
               nudge('›', 'darker', 1, i === n - 1));
    s.append(el('span', 'mk-order', String(i + 1)), el('span', 'mk-tone', String(tone)), img, bar);
    return s;
  }

  // ── Saving ───────────────────────────────────────────────────────────────

  /** What to call it when nobody said: the shelf it all came from. */
  defaultName() {
    const from = new Set(this.tray.items.map(i => i.shelf));
    return from.size === 1 ? `${[...from][0]} material` : 'mixed material';
  }

  /** @param {boolean} asNew  leave the material being edited where it is */
  async save(asNew) {
    const items = this.tray.items.slice();
    if (items.length < 2 || this.saving) return;
    const replaces = asNew ? null : this.editing;
    this.saving = true;
    this.update();
    try {
      const { set, unchanged, retired } = await saveMaterial({
        items, images: items.map(i => this.images.get(i.key)),
        title: this.nameEl.value.trim() || this.defaultName(),
        ground: this.ground(), replaces, onStatus: t => this.say(t),
      });
      if (unchanged) return this.say(`nothing changed — “${set.title}” is already exactly this`);
      this.tray.clear();
      this.nameEl.value = '';
      this.startedFrom = null;
      this.editing = null;
      this.saving = false;
      this.onSaved(set, { replaced: replaces, retired });
    } catch (err) {
      console.error('[grid] material not saved:', err);
      this.say('the material was not saved: ' + err.message);
    } finally {
      this.saving = false;
      this.update();
    }
  }
}

/** A material grid made — the only kind `Save changes` may replace. */
const editable = o => o.type === 'set' && roleOf(o) === 'material' && !!o.origin && o.origin.app === 'grid';

function button(label, onClick, primary = false) {
  const b = el('button', 'nb-btn' + (primary ? ' nb-btn--primary' : ''), label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
