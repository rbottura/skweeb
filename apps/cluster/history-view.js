/**
 * history-view.js — cluster's History (S9f; the bench's side view): the
 * session's steps in the app mounted — what each changed, the one the page
 * is at, a click going back or on to one (core/steps.js) — and the states of
 * the object it holds, newest first, the one it is at marked, a click going
 * back to one as the graph's does (core/shell/graph.js `backTo`); and the
 * graph itself, H.
 *
 * No DOM at import.
 */

import { list, go, onSteps } from '../../core/steps.js';
import { Vault } from '../../core/vault.js';
import { backTo, toggleGraph } from '../../core/shell/graph.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/** How long ago, in a few characters. */
const ago = iso => {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  return s < 60 ? 'now' : s < 3600 ? Math.round(s / 60) + ' min' : s < 86400 ? Math.round(s / 3600) + ' h' : Math.round(s / 86400) + ' d';
};

/**
 * @param {HTMLElement} root
 * @param {object} o
 * @param {() => boolean} o.shown   whether the view is the one shown: painted only then
 * @returns {{ paint: () => void }}
 */
export function historyView(root, { shown }) {
  const steps = el('ol', 'ch-list');
  const states = el('ol', 'ch-list');
  const graph = el('button', 'ch-graph', 'The states as a graph');
  graph.type = 'button';
  graph.append(el('kbd', null, 'H'));
  graph.addEventListener('click', () => toggleGraph());
  root.append(el('div', 'ch-head', 'steps · this session'), steps, el('div', 'ch-head', 'states · the object'), states, graph);

  let queued = false;
  onSteps(() => {
    if (!shown() || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; paintSteps(); });
  });
  document.addEventListener('vault:saved', () => { if (shown()) paintStates(); });

  function paintSteps() {
    const all = list(), at = all.filter(s => !s.ahead).length - 1;
    const rows = [{ label: 'as it opened', i: -1 }, ...all.map((s, i) => ({ label: s.label, i }))];
    steps.replaceChildren(...rows.map(({ label, i }) => {
      const b = el('button', 'ch-step' + (i === at ? ' ch-step--now' : i > at ? ' ch-step--ahead' : ''));
      b.type = 'button';
      b.title = i === at ? 'where the page is' : i < at ? 'back to here — Ctrl Z' : 'on to here — Ctrl Y';
      b.append(el('span', null, label));
      b.addEventListener('click', () => go(i));
      const li = el('li');
      li.append(b);
      return li;
    }));
    steps.lastElementChild?.scrollIntoView?.({ block: 'nearest' });
  }

  async function paintStates() {
    const bound = Vault.bound;
    if (!bound || !bound.id) { states.replaceChildren(el('li', 'ch-none', 'nothing saved here yet — S saves its first state')); return; }
    let all;
    try { all = await Vault.states(bound.id); } catch (err) { states.replaceChildren(el('li', 'ch-none', err.message)); return; }
    if (Vault.bound !== bound && (!Vault.bound || Vault.bound.id !== bound.id)) return;     // another object since
    states.replaceChildren(...[...all].reverse().map(st => {
      const here = st.version === (Vault.bound.version || all[all.length - 1].version);
      const b = el('button', 'ch-state' + (here ? ' ch-state--here' : ''));
      b.type = 'button';
      b.title = here ? 'the state the page holds' : `back to v${st.version} — the next save a branch from it`;
      const pic = el('img');
      pic.alt = '';
      pic.loading = 'lazy';
      if (st.url) pic.src = st.url;
      const text = el('span', 'ch-what');
      text.append(el('b', null, 'v' + st.version), el('span', 'ch-when', ago(st.created)), ...(st.parent2 ? [el('span', 'ch-when', 'merge')] : []));
      b.append(pic, text, el('span', 'ch-here', here ? 'here' : ''));
      b.addEventListener('click', async () => { if (!here && await backTo(st.version)) paintStates(); });
      const li = el('li');
      li.append(b);
      return li;
    }));
  }

  return { paint() { paintSteps(); paintStates(); } };
}
