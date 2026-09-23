/**
 * sessions.js — the dot-sets made this visit.
 *
 * Decided 2026-09-23: every dot-set stage one makes is saved to the vault at
 * once — a few kilobytes of JSON — and filed in one folder per visit, so the
 * vault panel shows a session as one folder instead of a wall of datasets
 * (core/VaultPanel.js groups by the `folder:` tag). And the sets made this
 * visit stay listed here, one click from being drawn, with no trip to the
 * vault picker.
 *
 * A session is one visit: it starts when the page opens and is named by that
 * moment. With no vault the list still works — its sets live in memory and
 * anything drawn from them saves as a leaf.
 */

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

const pad = n => String(n).padStart(2, '0');

export class Session {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mount
   * @param {(item: object) => void} opts.onPick   a row was chosen
   * @param {Date} [opts.now]
   */
  constructor({ mount, onPick, now = new Date() }) {
    this.name = `ckt session ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} `
              + `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    this.items = [];
    this.current = null;
    this.onPick = onPick;

    this.root = el('div', 'ss');
    this.list = el('div', 'ss-list');
    this.empty = el('div', 'pp-empty', 'Sets you make in dots appear here.');
    this.root.append(this.empty, this.list);
    mount.prepend(this.root);
  }

  /** The vault tag that files a set in this session's folder. */
  get folderTag() { return 'folder:' + this.name; }

  /**
   * A set, just made. Its key is its vault id, or a local one without a vault.
   *
   * @param {{id: ?string, title: string, data: Array, thumb: ?string}} item
   */
  add(item) {
    const entry = { ...item, key: item.id || 'local:' + (this.items.length + 1) };
    this.items.push(entry);
    this.render();
    return entry;
  }

  /** Which one is being drawn — by vault id, or a local entry's key. */
  select(key) {
    this.current = key;
    for (const row of this.list.children) row.classList.toggle('ss-row--on', row.dataset.key === key);
  }

  find(key) { return this.items.find(i => i.key === key) || null; }

  render() {
    this.empty.hidden = this.items.length > 0;
    this.list.replaceChildren();
    for (const item of this.items) {
      const row = el('button', 'ss-row' + (item.key === this.current ? ' ss-row--on' : ''));
      row.type = 'button';
      row.dataset.key = item.key;
      const img = el('img', 'ss-thumb');
      img.alt = '';
      if (item.thumb) img.src = item.thumb;
      const meta = el('div', 'ss-meta');
      meta.append(el('div', 'ss-title', item.title),
                  el('div', 'ss-sub', `${item.data.length} glyph${item.data.length === 1 ? '' : 's'}`
                    + (item.id ? '' : ' · not saved')));
      row.append(img, meta);
      row.addEventListener('click', () => this.onPick(item));
      this.list.append(row);
    }
  }
}

/**
 * The order ← and → walk: this session's sets, then the legacy ones.
 *
 * @param {Session} session
 * @param {string[]} legacy   the shipped dataset ids
 * @returns {string[]}        keys: a session key, or 'legacy:<id>'
 */
export function setOrder(session, legacy) {
  return [...session.items.map(i => i.key), ...legacy.map(id => 'legacy:' + id)];
}
