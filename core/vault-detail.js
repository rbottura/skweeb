/**
 * vault-detail.js — one object, opened: what it is, where it came from, what
 * made it, and what you can do with it.
 *
 * The right half of the vault panel, split out of VaultPanel.js when that file
 * reached the 400-line cap (rule 4). It builds DOM and holds no state: the
 * panel owns which object is open and any player running in it. The one write
 * it makes is a set's switches — where it is offered (core/uses.js).
 */

import { Vault } from './vault.js';
import { USES, usesOf, retagFor, hasUseTags } from './uses.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;   // never innerHTML: titles are user data
  return node;
};

/** The drawer an object opens in: a head with its type and a close, and a body to paint. */
export function detailDrawer(onClose) {
  const root = el('aside', 'vp-detail');
  const head = el('div', 'vp-detail-head');
  const title = el('span', 'vp-title', '');
  const back = el('button', 'vp-btn', '✕');
  back.title = 'Close this object';
  back.addEventListener('click', onClose);
  head.append(title, el('span', 'vp-spacer'), back);
  const body = el('div', 'vp-detail-body');
  root.append(head, body);
  return { root, title, body };
}

/** A render the browser can show as a picture. Anything else is data. */
const PICTURE = /^(png|jpe?g|webp|gif|avif|svg|bmp)$/i;

/**
 * Fill `body` with an object's detail.
 *
 * @param {HTMLElement} body
 * @param {object} o             the envelope
 * @param {{render:string, thumb:?string, reopen:?string, place:?string}} urls
 *   `reopen` is the link back into the app that made it, `place` the one
 *   onto a new compose page (core/reopen.js)
 * @param {object} hooks
 * @param {(id:string)=>void} hooks.open         open another object (lineage links)
 * @param {(viewer:object)=>void} hooks.playing  a player started; the panel disposes it later
 * @param {?(o:object)=>void} [hooks.pick]       present when the panel is a picker
 * @param {string} [hooks.pickLabel]
 * @param {?(action:string)=>void} [hooks.bin]   'trash' | 'restore' | 'delete'; absent in a picker
 * @param {boolean} [hooks.trashed]             it is in the trash
 * @param {boolean} [hooks.picture]             false: no picture — the page draws the object beside it
 */
export function paintDetail(body, o, urls, hooks) {
  body.replaceChildren();
  const r = o.render || {};

  // The picture, unless the page draws the object beside the detail — the
  // vault app's viewer (`hooks.picture` false): then the detail is its facts.
  if (hooks.picture !== false) paintPicture(body, o, urls, hooks);

  body.append(el('div', 'vp-name', o.title || '(untitled)'));

  const facts = [
    ['id', o.id],
    ['made by', o.origin ? o.origin.app + ' ' + o.origin.version : '—'],
    ['created', new Date(o.created).toLocaleString()],
    ['size', r.w ? r.w + ' × ' + r.h + (r.density > 1 ? '  @' + r.density + '×' : '') : '—'],
  ];
  if (r.frames > 1) facts.push(['frames', r.frames + (r.fps ? ' @ ' + r.fps + 'fps' : '') + (r.loop ? ', loops' : '')]);
  facts.push(['file', r.file + '  ' + kb(r.bytes)]);
  facts.push(['seed', o.seed == null ? 'null — nothing random in it' : String(o.seed)]);
  facts.push(['tags', (o.tags || []).join(', ') || '—']);
  body.append(table(facts));

  if (o.type === 'set') body.append(usesSection(o, tags => {
    const cell = body.querySelector('.vp-facts td[data-key="tags"]');
    if (cell) cell.textContent = tags.join(', ') || '—';
  }));

  // Lineage. parents is frozen history, refs a live dependency — the panel
  // names the difference rather than merging them.
  // An object cut loose from ones deleted since (server/delete.js) says so.
  const cuts = o.detached || [];
  if ((o.parents && o.parents.length) || (o.refs && o.refs.length) || cuts.length) {
    body.append(el('div', 'vp-section', 'Lineage'));
    const lin = el('div', 'vp-lineage');
    for (const p of o.parents || []) lin.append(idLink('made from ', p, hooks.open));
    for (const f of o.refs || [])    lin.append(idLink('depends on ', f, hooks.open));
    for (const c of cuts) lin.append(el('div', 'vp-leaf', cutLine(c)));
    body.append(lin);
  }

  body.append(el('div', 'vp-section', o.recipe ? 'Recipe' : 'No recipe'));
  if (o.recipe) {
    body.append(el('pre', 'vp-json', JSON.stringify(o.recipe, null, 1)));
  } else if (cuts.some(c => c.recipe)) {
    body.append(el('div', 'vp-sub vp-leaf',
      'Its recipe named an object that was deleted, so it is its picture now. '
      + 'The recipe is kept, set aside, in object.json under detached.'));
  } else {
    body.append(el('div', 'vp-sub vp-leaf',
      'A leaf: this one cannot redraw itself. Correct when something came from '
      + 'outside — an image loaded under the ink.'));
  }

  body.append(actions(o, urls, hooks));
}

/**
 * The detail's picture: the render when it is one, the thumbnail when the
 * render is data — a dot-set's dots as JSON, which an <img> shows as broken —
 * and, for a loop, a button that plays it, rebuilt from its recipe.
 */
function paintPicture(body, o, urls, hooks) {
  const renderUrl = urls.render;
  const r = o.render || {};
  const picture = PICTURE.test(ext(r.file || '')) ? renderUrl : urls.thumb;
  let preview;
  if (picture) {
    preview = el('img', 'vp-preview');
    preview.alt = o.title || o.id;
    preview.src = picture;
  } else {
    preview = el('div', 'vp-sub', 'No picture of this one.');
  }
  body.append(preview);

  // A sequence's render is one frame of it — and so is a composition's that
  // moves (the same test as core/rebuild.js `replayed`). The loop has no
  // file, so playing it means rebuilding it from the recipe — imported only
  // when asked, since that is what can pull p5 into a page that may not want it.
  if (o.recipe && (o.type === 'sequence' || (o.render && o.render.frames > 1))) {
    const play = el('button', 'vp-btn', '▶ Play the loop');
    play.addEventListener('click', async () => {
      play.disabled = true;
      play.textContent = 'rebuilding…';
      try {
        const { SequenceViewer } = await import('./SequenceViewer.js');
        const viewer = new SequenceViewer(o);
        preview.replaceWith(viewer.node);
        play.remove();
        hooks.playing(viewer);
        await viewer.start();
      } catch (err) {
        play.disabled = false;
        play.textContent = '▶ Play the loop';
        console.error('[vault] could not rebuild', o.id, err);
      }
    });
    body.append(play);
  }
}

/**
 * Where a set is offered: one switch per use in core/uses.js. Flipping one
 * writes the set's `use:` tags; everything else about it stays as saved.
 */
function usesSection(o, onTags) {
  const box = el('div', 'vp-uses');
  box.append(el('div', 'vp-section', 'Offered as'));
  const note = el('div', 'vp-sub');
  const inputs = new Map();

  const sync = () => {
    const on = usesOf(o);
    for (const [id, input] of inputs) input.checked = on.has(id);
    note.textContent = hasUseTags(o)
      ? (on.size ? '' : 'offered nowhere — every app leaves it out')
      : 'as it was made' + (o.recipe && o.recipe.role ? ' (' + o.recipe.role + ')' : '')
        + ' — nothing switched yet';
  };

  for (const use of USES) {
    const row = el('label', 'vp-use-row');
    const input = el('input');
    input.type = 'checkbox';
    input.addEventListener('change', async () => {
      // Unknown ids in the tags ride along: a use a later app adds is kept.
      const want = new Set(usesOf(o));
      if (input.checked) want.add(use.id); else want.delete(use.id);
      for (const i of inputs.values()) i.disabled = true;
      try {
        const updated = await Vault.retag(o.id, retagFor(o, want));
        o.tags = updated.tags;
        onTags(o.tags);
      } catch (err) {
        note.textContent = 'could not change it: ' + err.message;
        input.checked = !input.checked;
        for (const i of inputs.values()) i.disabled = false;
        return;
      }
      for (const i of inputs.values()) i.disabled = false;
      sync();
    });
    inputs.set(use.id, input);
    row.append(input, el('span', null, use.label));
    box.append(row);
  }
  box.append(note);
  sync();
  return box;
}

/** One cut, in words: when, from how many, and what it cost. */
function cutLine(c) {
  const lost = [c.members && c.members + ' members', c.placements && c.placements + ' placements',
    c.recipe && 'its recipe'].filter(Boolean);
  return 'cut loose from ' + c.ids.length + ' deleted ' + (c.ids.length === 1 ? 'object' : 'objects')
    + ', ' + new Date(c.at).toLocaleDateString() + (lost.length ? ' — lost ' + lost.join(', ') : '');
}

function idLink(prefix, id, open) {
  const line = el('div');
  line.append(document.createTextNode(prefix));
  const a = el('a', null, id);
  a.addEventListener('click', () => open(id));
  line.append(a);
  return line;
}

function actions(o, urls, hooks) {
  const row = el('div', 'vp-actions');
  const renderUrl = urls.render;

  // Back into the app that made it, in a tab of its own, so whatever is open
  // here stays as it is. A picker's first action is its own, so this one is
  // only the primary when nothing is being picked.
  if (urls.reopen) {
    const reopen = el('button', 'vp-btn' + (hooks.pick ? '' : ' vp-btn--primary'),
      'Open in ' + o.origin.app + ' ↗');
    reopen.title = urls.reopen;
    reopen.addEventListener('click', () => window.open(urls.reopen, '_blank', 'noopener'));
    row.append(reopen);
  }

  // Onto a page of its own in compose: M4's link, `any → compose`. Not while
  // picking — a picker is already putting the object somewhere.
  if (urls.place && !hooks.pick) {
    const place = el('button', 'vp-btn', 'Place in compose ↗');
    place.title = urls.place;
    place.addEventListener('click', () => window.open(urls.place, '_blank', 'noopener'));
    row.append(place);
  }

  // Into the rig, its strokes as bones: M9's link, `gamepad → rig`.
  if (urls.rig && !hooks.pick) {
    const rig = el('button', 'vp-btn', 'Rig this ↗');
    rig.title = urls.rig;
    rig.addEventListener('click', () => window.open(urls.rig, '_blank', 'noopener'));
    row.append(rig);
  }

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

  if (hooks.pick) {
    const pick = el('button', 'vp-btn vp-btn--primary', hooks.pickLabel || 'Use this');
    pick.addEventListener('click', () => hooks.pick(o));
    row.append(pick);
  }

  // Put away, and from the trash back again or out for good (vault-trash.js).
  const bin = (label, action, cls = '') => {
    const b = el('button', 'vp-btn ' + cls, label);
    b.addEventListener('click', () => hooks.bin(action));
    row.append(b);
  };
  if (hooks.bin && !hooks.trashed) bin('Move to trash', 'trash');
  if (hooks.bin && hooks.trashed) { bin('Restore', 'restore'); bin('Delete for good…', 'delete', 'vp-btn--danger'); }
  return row;
}

function table(rows) {
  const t = el('table', 'vp-facts');
  for (const [key, value] of rows) {
    const tr = el('tr');
    const td = el('td', null, value);
    td.dataset.key = key;
    tr.append(el('th', null, key), td);
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
