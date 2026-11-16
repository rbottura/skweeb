/**
 * params-copy.js — values copied from one card and pasted onto another (S15d).
 *
 * The author, 2026-11-16: "copier les paramètres depuis un objet sur un autre
 * si compatible, soit paramètres individuels, une section entière ou tous les
 * paramètres" — and then: "il faut copier toutes les valeurs même par défaut,
 * comme on ne sait pas si les valeurs de l'objet qui reçoit sont également
 * déjà modifiées ou pas, mais il faut avoir des niveaux de copies et des
 * niveaux de collages … ctrl clic ou autre puis coller les paramètres de
 * 'positions', ou raccourci clavier avec prompt de confirmation par Entrée et
 * rapide animation".
 *
 * Three levels, by where the hand is on a card: a row — its one value; a
 * section — every value of its rows, those hidden by a `when` too; the card's
 * head — every value it has. Each value as it is, a default too.
 *
 *   Ctrl click, or a right click, on a card: a menu — copy at each level from
 *   there, and paste what is held, where this card has it.
 *   Ctrl C over a card: copy at the level under the hand.
 *   Ctrl V: what is held, onto the card under the hand or else the chosen
 *   one — asked first, Enter to paste, Escape not to.
 *
 * Pasted where the receiving card has the key with the same type, coerced by
 * its schema (core/params.js); one step, Ctrl Z takes it back (core/steps.js
 * `around`); its rows flash. What is held is this page's, for the session:
 * never a recipe's, never the vault's.
 *
 * Core/Cards.js makes each card copyable (`copyable`); its listeners held by
 * the app mounted (core/scope.js), installed again by the next. DOM and params; core/cards.css draws `.pc-*`.
 */

import { around } from './steps.js';
import { held as holding, listen } from './scope.js';

const owners = new WeakMap();      // a card's element → { params, name }
let held = null;                   // { level, label, from, values: {key: value}, types: {key: type} }
let installed = false;
let hover = null;                  // what the hand is over
let floating = null;               // the menu or the prompt open, and how to close it

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;     // never innerHTML: names may be the user's
  return node;
};

/** A card's values made copyable: its element, its params, and how it is named now. */
export function copyable(card, params, name) {
  owners.set(card, { params, name });
  install();
}

/** The card a node is in — its nearest, a modifier's inside a shape's — with its owner, or null. */
function cardOf(node) {
  const card = node && node.closest && node.closest('.pp-card');
  return card && owners.has(card) ? { card, ...owners.get(card) } : null;
}

const mine = (card, node) => node.closest('.pp-card') === card;
const titleOf = dr => dr.querySelector(':scope > .dr-head > span')?.textContent.trim() || 'section';

/** What can be copied from where the hand is: the row, its section, the card — the finest first. */
function levelsAt(node) {
  const at = cardOf(node);
  if (!at) return null;
  const { card, params } = at;
  const out = [];
  const row = node.closest('.pp-row[data-key]');
  if (row && mine(card, row) && params.keys.includes(row.dataset.key)) {
    out.push({ level: 'row', label: row.querySelector('.pp-name')?.textContent.trim() || row.dataset.key, keys: [row.dataset.key] });
  }
  const dr = node.closest('.dr');
  if (dr && mine(card, dr)) {
    const keys = [...dr.querySelectorAll('.pp-row[data-key]')].filter(r => mine(card, r)).map(r => r.dataset.key).filter(k => params.keys.includes(k));
    if (keys.length) out.push({ level: 'section', label: titleOf(dr), keys: [...new Set(keys)] });
  }
  out.push({ level: 'all', label: 'every value', keys: params.keys.slice() });
  return { ...at, levels: out };
}

/** The finest level under the hand: a row's, a section's head or body, the card's head. */
function finest(node, at) {
  const onHead = node.closest('.pp-head') && mine(at.card, node.closest('.pp-head'));
  return onHead ? at.levels[at.levels.length - 1] : at.levels[0];
}

function copy(at, level) {
  const values = {}, types = {};
  for (const k of level.keys) { values[k] = structuredClone(at.params.get(k)); types[k] = at.params.spec(k).type; }
  held = { level: level.level, label: level.label, from: at.name(), values, types };
  say(at.card, `Copied ${level.level === 'all' ? 'every value' : level.label} of ${held.from} — ${count(level.keys.length)}`);
}

const count = n => `${n} value${n === 1 ? '' : 's'}`;

/** What of the held values the card takes: its keys of the same type. */
function fits(params) {
  if (!held) return {};
  const out = {};
  for (const [k, v] of Object.entries(held.values)) {
    if (params.keys.includes(k) && params.spec(k).type === held.types[k]) out[k] = v;
  }
  return out;
}

const heldLabel = () => (held.level === 'all' ? `every value of ${held.from}` : `${held.label} of ${held.from}`);

function paste(at) {
  const values = fits(at.params);
  const keys = Object.keys(values);
  if (!keys.length) return say(at.card, `Nothing of ${heldLabel()} fits ${at.name()}`);
  around(at.params, () => at.params.set(values));      // one step
  flash(at.card, keys);
  say(at.card, `Pasted ${heldLabel()} onto ${at.name()} — ${count(keys.length)}`);
}

/** The rows pasted to, flashed; a section pasted into opened, so it is seen. */
function flash(card, keys) {
  card.classList.remove('pc-pasted');
  void card.offsetWidth;
  card.classList.add('pc-pasted');
  for (const k of keys) {
    const row = [...card.querySelectorAll(`.pp-row[data-key="${CSS.escape(k)}"]`)].find(r => mine(card, r));
    if (!row) continue;
    if (held.level === 'section') {
      const dr = row.closest('.dr');
      if (dr && !dr.classList.contains('dr--open')) dr.querySelector(':scope > .dr-head').click();
    }
    row.classList.remove('pc-row-pasted');
    void row.offsetWidth;
    row.classList.add('pc-row-pasted');
  }
  setTimeout(() => {
    card.classList.remove('pc-pasted');
    for (const r of card.querySelectorAll('.pc-row-pasted')) r.classList.remove('pc-row-pasted');
  }, 900);
}

// ── What floats: the menu, the prompt, what is said ─────────────────────────

function close() { if (floating) { floating.close(); floating = null; } }

function float(node, x, y) {
  close();
  document.body.append(node);
  // Within the window, measured once it is drawn: a long name widens it.
  node.style.left = `${Math.max(4, Math.min(x, innerWidth - node.offsetWidth - 6))}px`;
  node.style.top = `${Math.max(4, Math.min(y, innerHeight - node.offsetHeight - 6))}px`;
  const away = e => { if (!node.contains(e.target)) close(); };
  setTimeout(() => window.addEventListener('pointerdown', away, true));
  floating = { node, close: () => { node.remove(); window.removeEventListener('pointerdown', away, true); } };
}

function menu(at, node, x, y) {
  const box = el('div', 'pc-menu');
  box.setAttribute('role', 'menu');
  box.append(el('div', 'pc-menu-head', at.name()));
  for (const level of at.levels) {
    const words = level.level === 'all' ? `Copy every value (${level.keys.length})`
      : level.level === 'section' ? `Copy ${level.label} (${level.keys.length})` : `Copy ${level.label}`;
    box.append(item(words, () => copy(at, level)));
  }
  if (held) {
    const n = Object.keys(fits(at.params)).length;
    const b = item(`Paste ${heldLabel()} (${n} of ${Object.keys(held.values).length})`, () => paste(at));
    b.disabled = !n;
    box.append(el('div', 'pc-menu-sep'), b);
  }
  float(box, x, y);
}

function item(words, run) {
  const b = el('button', 'pc-menu-item', words);
  b.type = 'button';
  b.setAttribute('role', 'menuitem');
  b.addEventListener('click', () => { close(); run(); });
  return b;
}

/** Ctrl V's question, by the card it would paste onto: Enter pastes, Escape does not. */
function ask(at) {
  const n = Object.keys(fits(at.params)).length;
  const box = el('div', 'pc-prompt');
  box.setAttribute('role', 'alertdialog');
  box.append(el('span', null, n ? `Paste ${heldLabel()} onto ${at.name()} — ${count(n)}` : `Nothing of ${heldLabel()} fits ${at.name()}`),
    el('kbd', null, n ? 'Enter' : 'Esc'));
  const r = (at.card.querySelector('.pp-head') || at.card).getBoundingClientRect();
  float(box, r.left, r.top - 34);
  floating.paste = n ? () => paste(at) : null;
}

function say(card, text) {
  const box = el('div', 'pc-prompt pc-said', text);
  const r = (card.querySelector('.pp-head') || card).getBoundingClientRect();
  float(box, r.left, r.top - 34);
  const mineNow = floating;
  setTimeout(() => { if (floating === mineNow) close(); }, 1600);
}

// ── Once a page ─────────────────────────────────────────────────────────────

const typing = t => t && (t.isContentEditable || (t.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button'].includes(t.type)) || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');

/** The card Ctrl V pastes onto: the one under the hand, or the chosen one shown. */
function target() {
  const under = hover && cardOf(hover);
  if (under) return under;
  const chosen = [...document.querySelectorAll('.pp-card--chosen')].filter(c => c.offsetParent && owners.has(c));
  return chosen.length ? cardOf(chosen[chosen.length - 1]) : null;
}

function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  // Held by the app mounted now, as its listeners are: let go of at its unmount, installed again by the next card.
  holding(() => { installed = false; close(); hover = null; });      // what is held stays: an app back finds it
  listen(window, 'pointerover', e => { hover = e.target; }, { passive: true });
  const open = e => {
    const at = levelsAt(e.target);
    if (!at) return false;
    e.preventDefault();
    e.stopPropagation();
    menu(at, e.target, e.clientX, e.clientY);
    return true;
  };
  listen(window, 'contextmenu', open, true);
  listen(window, 'click', e => { if (e.ctrlKey && !e.altKey && !e.shiftKey) open(e); }, true);
  listen(window, 'keydown', e => {
    if (floating && floating.paste !== undefined) {           // the question asked
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const go = floating.paste; close(); if (go) go(); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    }
    if (floating && e.key === 'Escape') { e.stopPropagation(); close(); return; }     // the menu's Escape, not the app's
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || typing(e.target)) return;
    const k = (e.key || '').toLowerCase();
    if (k === 'c') {
      if (String(window.getSelection && window.getSelection()).length) return;      // text chosen: the browser's copy
      const at = hover && levelsAt(hover);
      if (!at) return;
      e.preventDefault();
      e.stopPropagation();          // Ctrl C is never C: no app's own key hears it (core/keys.js `bare`)
      copy(at, finest(hover, at));
    } else if (k === 'v' && held) {
      const at = target();
      if (!at) return;
      e.preventDefault();
      e.stopPropagation();          // nor V's vault
      ask(at);
    }
  }, true);
}
