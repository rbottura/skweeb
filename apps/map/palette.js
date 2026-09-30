/**
 * palette.js — the tiles to paint with: a tileset's members, a button each,
 * and the eraser. Which is chosen is the editor's, not the map's, and is
 * never saved.
 */

const SIDE = 40;

export class Palette {
  /**
   * @param {HTMLElement} mount           where the palette goes: the Tiles drawer
   * @param {() => void} onChange         a tile was chosen
   */
  constructor(mount, onChange) {
    this._onChange = onChange;
    this._chosen = null;
    this._note = document.createElement('p');
    this._note.className = 'mp-note';
    this._grid = document.createElement('div');
    this._grid.className = 'mp-palette';
    mount.append(this._grid, this._note);
    this.show(null);
  }

  /** The index of the tile chosen, -1 for the eraser, null with no tileset. */
  get chosen() { return this._chosen; }

  /**
   * The tileset's images, or null for none.
   * @param {?Array<CanvasImageSource>} images
   * @param {string} [title]
   */
  show(images, title = '') {
    this._grid.replaceChildren();
    this._buttons = [];
    if (!images || !images.length) {
      this._chosen = null;
      this._note.textContent = 'Choose a tileset: its members are the tiles.';
      return;
    }
    images.forEach((img, i) => {
      const b = this._button(`tile ${i + 1}`, i);
      const c = document.createElement('canvas');
      c.width = c.height = SIDE;
      const k = Math.min(SIDE / img.width, SIDE / img.height);
      c.getContext('2d').drawImage(img, (SIDE - img.width * k) / 2, (SIDE - img.height * k) / 2, img.width * k, img.height * k);
      b.append(c);
    });
    const erase = this._button('the eraser: empties a cell', -1);
    erase.classList.add('mp-tile--erase');
    erase.textContent = '∅';
    this._note.textContent = `${title}: ${images.length} tile${images.length === 1 ? '' : 's'}. Press and drag to paint.`;
    this.choose(this._chosen != null && this._chosen < images.length ? this._chosen : 0);
  }

  /** @param {number} i   a tile's index, or -1 for the eraser */
  choose(i) {
    this._chosen = i;
    for (const b of this._buttons) b.classList.toggle('mp-tile--on', Number(b.dataset.tile) === i);
    this._onChange();
  }

  _button(title, i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mp-tile';
    b.title = title;
    b.dataset.tile = String(i);
    b.addEventListener('click', () => this.choose(i));
    this._grid.append(b);
    this._buttons.push(b);
    return b;
  }
}
