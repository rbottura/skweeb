/**
 * Guide.js — a page of the suite's guides, read inside an app: a markdown
 * file drawn on a sheet over the page, as the vault's panel is.
 *
 * The author's ask (docs/inbox.md, 2026-10-21): what needs another program —
 * OBS, for the rig's puppet — is written down in `docs/guides/` and read
 * where it is needed, in the app, not looked for elsewhere. The markdown is
 * the docs' own small part: headings, paragraphs, lists, fenced code, and
 * inline code, bold, italic and links; anything else shows as its text. The
 * file is fetched each time it is opened, so a guide edited is read as it
 * is now; with nothing serving it, the sheet says it could not be read.
 */

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Inline markdown, escaped first: code spans kept as written, then bold, italic, and links to the web or the suite. */
function inline(text) {
  return text.split(/(`[^`]+`)/g).map((part, i) => {
    if (i % 2) return '<code>' + esc(part.slice(1, -1)) + '</code>';
    return esc(part)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => (/^(https?:|\/|\.\.?\/|#)/.test(href)
        ? `<a href="${href}" target="_blank" rel="noopener">${label}</a>` : label));
  }).join('');
}

/**
 * The docs' small part of markdown, as HTML. A list item goes on over the
 * indented lines after it; a blank line ends a paragraph or a list.
 *
 * @param {string} source
 * @returns {string}
 */
export function markdown(source) {
  const out = [];
  let para = [], list = null, code = null;
  const flush = () => {
    if (para.length) out.push('<p>' + inline(para.join(' ')) + '</p>');
    if (list) out.push(`<${list.tag}>` + list.items.map(item => '<li>' + inline(item) + '</li>').join('') + `</${list.tag}>`);
    para = [];
    list = null;
  };
  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (code) {
      if (/^```/.test(line)) { out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); code = null; }
      else code.push(line);
      continue;
    }
    if (/^```/.test(line)) { flush(); code = []; continue; }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) { flush(); out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); continue; }
    const item = line.match(/^(?:([-*])|\d+\.)\s+(.*)$/);
    if (item) {
      const tag = item[1] ? 'ul' : 'ol';
      if (para.length || (list && list.tag !== tag)) flush();
      if (!list) list = { tag, items: [] };
      list.items.push(item[2]);
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    if (list && /^\s+\S/.test(line)) { list.items[list.items.length - 1] += ' ' + line.trim(); continue; }
    if (list) flush();
    para.push(line.trim());
  }
  if (code) out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>');
  flush();
  return out.join('\n');
}

export class Guide {
  /**
   * @param {object} opts
   * @param {string} opts.url       the markdown's address
   * @param {string} [opts.title]   the sheet's head
   */
  constructor({ url, title = 'guide' }) {
    this.url = url;
    this.root = el('div', 'nb-guide');
    this.root.hidden = true;
    const card = el('article', 'nb-guide-card');
    const head = el('div', 'nb-guide-head');
    const close = el('button', 'nb-btn', 'Close');
    close.type = 'button';
    close.addEventListener('click', () => this.hide());
    head.append(el('span', 'nb-guide-title', title), close);
    this.body = el('div', 'nb-guide-body');
    card.append(head, this.body);
    this.root.append(card);
    document.body.append(this.root);
    this.root.addEventListener('click', e => { if (e.target === this.root) this.hide(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && this.isOpen) this.hide(); });
  }

  get isOpen() { return !this.root.hidden; }

  async show() {
    this.root.hidden = false;
    this.body.textContent = 'reading…';
    try {
      const res = await fetch(this.url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      this.body.innerHTML = markdown(await res.text());
    } catch (err) {
      this.body.textContent = 'could not read the guide: ' + err.message;
    }
  }

  hide() { this.root.hidden = true; }
  toggle() { return this.isOpen ? this.hide() : this.show(); }
}
