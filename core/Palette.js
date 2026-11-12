/**
 * Palette.js — every control and every act of the page, by name (S5, the
 * left hand; docs/scene.md). ² — the key a game's console sits on — or
 * Ctrl K opens it: type a part of a name, Enter.
 *
 * Nothing is declared for it. It reads the page as it stands: a control is a
 * panel's row (its `.pp-name`), found under its drawer's title; an act is a
 * drawer's button (an Export box's, a pose's). A row or an act added
 * tomorrow is found the day it exists. The viewer's tools, outside any
 * drawer, carry their words in `data-pal` — and where they are in
 * `data-pal-where`, the viewer when they say nothing: cluster's apps, its
 * strip (apps/cluster/). Enter on a control opens its drawer,
 * brings the row into view and puts the hand on it — a number's box selected
 * for typing; Enter on an act presses it.
 *
 * Installed once a page, by the first ParamPanel; DOM only, theme.css draws
 * `.pal`.
 */

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

let installed = false;
let open = null;          // { root, input, list, shown, hot }

/** Whether a key pressed on `t` is typed into it: a field takes its letters. */
export const typing = t => !!t && ((t.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'color'].includes(t.type))
  || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

/** ² or Ctrl K, anywhere but in a field — before an app's own keys hear it. */
export function installPalette() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('keydown', e => {
    if (open) return;
    const ctrlK = (e.ctrlKey || e.metaKey) && !e.altKey && (e.key || '').toLowerCase() === 'k';
    const tilde = e.code === 'Backquote' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(e.target);
    if (!ctrlK && !tilde) return;
    e.preventDefault();
    e.stopPropagation();
    show();
  }, true);
}

const titleOf = drawer => {
  const t = drawer && drawer.querySelector(':scope > .dr-head > span:not(.dr-note):not(.dr-mod)');
  return t ? t.textContent.trim() : '';
};

function valueOf(row) {
  const num = row.querySelector('.pp-num');
  if (num) return num.value;
  const select = row.querySelector('select');
  if (select && select.selectedIndex >= 0) return select.options[select.selectedIndex].textContent;
  const check = row.querySelector('input[type=checkbox]');
  if (check) return check.checked ? 'on' : 'off';
  const chip = row.querySelector('.pp-chip--on');
  if (chip) return chip.textContent;
  const value = row.querySelector('.pp-value');
  return value ? value.textContent : '';
}

function opened(drawer) {
  if (drawer && !drawer.classList.contains('dr--open')) drawer.querySelector(':scope > .dr-head').click();
}

/** The hand on a row: its drawer open, the row in view, its control taken. */
function reach(row) {
  const drawer = row.closest('.dr');
  opened(drawer);
  // A row seldom touched, folded away (core/param-rows.js): its fold opened first.
  if (row.classList.contains('pp-row--more') && drawer && !drawer.classList.contains('pp-more-open')) {
    drawer.querySelector(':scope > .dr-body > .pp-more')?.click();
  }
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  row.classList.add('pp-row--found');
  setTimeout(() => row.classList.remove('pp-row--found'), 1200);
  const take = row.querySelector('.pp-num, select, input[type=checkbox], .pp-chip--on, .pp-chip, button, input');
  if (!take) return;
  take.focus({ preventScroll: true });
  if (take.classList.contains('pp-num')) take.select();
}

/** What the page offers now: its rows that apply, its acts that can be pressed. */
function gather() {
  const out = [];
  for (const row of document.querySelectorAll('.pp-row')) {
    const drawer = row.closest('.dr');
    if (row.hidden || (drawer && drawer.hidden) || row.closest('.pal')) continue;
    const name = row.querySelector('.pp-name');
    if (!name || !name.textContent.trim()) continue;
    const where = titleOf(drawer) || (row.closest('.pp')?.querySelector('.pp-title')?.textContent || '');
    const unit = row.querySelector('.pp-unit');
    out.push({ label: `${where ? where + ' › ' : ''}${name.textContent.trim()}${unit ? ' ' + unit.textContent : ''}`, detail: valueOf(row), run: () => reach(row) });
  }
  for (const b of document.querySelectorAll('.dr-body .nb-btn')) {
    const drawer = b.closest('.dr');
    if (b.disabled || b.hidden || b.closest('[hidden]') || (drawer && drawer.hidden)) continue;
    const text = b.textContent.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    out.push({ label: text, detail: titleOf(drawer), act: true, run: () => { opened(drawer); b.click(); } });
  }
  // The viewer's tools and offers (core/shell/viewtools.js, core/shell/rulers.js), by the words they carry; a scene's apps (apps/cluster/).
  for (const b of document.querySelectorAll('[data-pal]')) {
    if (b.disabled || b.closest('[hidden]') || b.closest('.pal')) continue;
    out.push({ label: b.dataset.pal, detail: b.dataset.palWhere || 'Viewer', act: true, run: () => b.click() });
  }
  return out;
}

/** Open it from elsewhere — the title bar's search. */
export function openPalette() { if (!open) show(); }

function show() {
  const all = gather();
  const root = el('div', 'pal'), box = el('div', 'pal-box');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Every control and act, by name');
  const input = el('input', 'pal-input');
  input.type = 'text';
  input.placeholder = 'A control or an act, by name';
  input.setAttribute('aria-label', 'Search');
  const list = el('ul', 'pal-list');
  list.setAttribute('role', 'listbox');
  box.append(input, list);
  root.append(box);
  document.body.append(root);
  open = { root, input, list, shown: [], hot: 0 };

  const mark = () => [...list.children].forEach((li, i) => li.classList.toggle('pal-hot', i === open.hot));
  const run = i => { const it = open && open.shown[i]; hide(); if (it) it.run(); };
  const render = () => {
    const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    open.shown = all.filter(it => { const hay = `${it.label} ${it.detail}`.toLowerCase(); return words.every(w => hay.includes(w)); }).slice(0, 80);
    open.hot = Math.min(open.hot, Math.max(0, open.shown.length - 1));
    list.textContent = '';
    if (!open.shown.length) { list.append(el('li', 'pal-empty', 'Nothing by that name')); return; }
    open.shown.forEach((it, i) => {
      const li = el('li', it.act ? 'pal-act' : '');
      li.setAttribute('role', 'option');
      li.append(el('span', 'pal-name', it.label), el('span', 'pal-detail', it.detail || ''));
      li.addEventListener('pointermove', () => { if (open && open.hot !== i) { open.hot = i; mark(); } });
      li.addEventListener('click', () => run(i));
      list.append(li);
    });
    mark();
  };
  input.addEventListener('input', () => { open.hot = 0; render(); });
  input.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      open.hot = Math.max(0, Math.min(open.shown.length - 1, open.hot + (e.key === 'ArrowDown' ? 1 : -1)));
      mark();
      const li = list.children[open.hot];
      if (li) li.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') { e.preventDefault(); run(open.hot); }
    else if (e.key === 'Escape') { e.preventDefault(); hide(); }
  });
  root.addEventListener('pointerdown', e => { if (e.target === root) hide(); });
  render();
  input.focus();
}

function hide() {
  if (!open) return;
  open.root.remove();
  open = null;
}
