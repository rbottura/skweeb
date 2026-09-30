/**
 * main.js — the map editor, assembled. M8: a map on a grid, a room first.
 *
 * The map's panel on the left, the map between (docs/roadmap.md, M8). It
 * opens on an empty grid; tiles painted from a tileset, things placed on
 * it and a save come brick by brick (STATUS.md). Drawn at the size the
 * viewer shows (core/view.js); the grid is a guide over it — G, or its
 * switch — and never in anything saved.
 *
 * Opens with no vault (rule 7).
 */

import { mapParams, MAP_GROUPS } from './params.js';
import { mapSize }    from './grid.js';
import { drawMap }    from './draw.js';
import { drawGrid }   from './guides.js';
import { ParamPanel } from '../../core/ParamPanel.js';
import { VaultPanel } from '../../core/VaultPanel.js';
import { Bar }        from '../../core/Bar.js';
import { Vault }      from '../../core/vault.js';
import { viewFactor } from '../../core/view.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const gridBtn = document.getElementById('grid');

let map, bar;
let gridOn = remembered();     // the grid over the preview: the viewer's, not the map's

function boot() {
  bar = new Bar({ app: 'map', mount: document.querySelector('.app'), keys: 'G grid · V vault' });
  map = mapParams();
  new ParamPanel(map, { title: 'map', mount: document.getElementById('map-side'), groups: MAP_GROUPS });
  map.on(() => draw());
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  gridBtn.addEventListener('click', () => showGrid(!gridOn));
  showGrid(gridOn);
  wireKeys();
  draw();
}

// ── The grid's switch ────────────────────────────────────────────────────────

/** How the viewer looks, not what the map is: not a param, remembered in this browser. */
function showGrid(on) {
  gridOn = on;
  gridBtn.setAttribute('aria-pressed', String(on));
  try { localStorage.setItem('skweeb.map.grid', on ? '1' : '0'); } catch { /* private mode: forgotten */ }
  draw();
}

function remembered() {
  try { return localStorage.getItem('skweeb.map.grid') !== '0'; } catch { return true; }
}

// ── Drawing ──────────────────────────────────────────────────────────────────

let pending = false;

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  const m = map.values;
  const size = mapSize(m);
  const view = viewFactor(canvas, size, 1);
  const w = Math.max(1, Math.round(size.width * view)), h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  drawMap(ctx, m, view);
  if (gridOn) drawGrid(ctx, m, view, canvas.width / Math.max(1, canvas.getBoundingClientRect().width));
  bar.output({ width: size.width, height: size.height, scale: 1 });
  bar.say(`${m.cols} × ${m.rows} tiles of ${m.tile} px`);
}

// ── Keys, the vault ──────────────────────────────────────────────────────────

function wireKeys() {
  const vault = new VaultPanel();
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 'g' || e.key === 'G') showGrid(!gridOn);
  });
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

try {
  boot();
} catch (err) {
  console.error('[map] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
}
