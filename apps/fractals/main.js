/**
 * main.js — fractals, assembled. M7, brick 1: the Mandelbrot set and its
 * Julia sets, on the GPU, moved by hand.
 *
 * One schema (params.js), one pass (fractal.js), one core/gpu runner: the
 * pass carried in a chain entry of its own, run over a blank picture of the
 * size wanted. The preview is drawn at the size the viewer shows
 * (core/view.js); *Download the picture* draws it again at the format's
 * size times its scale — the same function of the same params, so exact.
 * Drag to pan, the wheel to zoom about the pointer (pointer.js).
 *
 * Opens with no vault (rule 7), and with no WebGPU says why, as filter does:
 * the panel works, and nothing is drawn.
 */

import { fractalParams, GROUPS } from './params.js';
import { FRACTAL } from './fractal.js';
import { wirePointer }    from './pointer.js';
import { ParamPanel }     from '../../core/ParamPanel.js';
import { VaultPanel }     from '../../core/VaultPanel.js';
import { Bar }            from '../../core/Bar.js';
import { Vault }          from '../../core/vault.js';
import { applyFrameEdit } from '../../core/frame.js';
import { viewFactor }     from '../../core/view.js';
import { toPng, download } from '../../core/export.js';
import { surface }        from '../../core/surface.js';
import { createRunner }   from '../../core/gpu/runner.js';
import { whyNoGpu }       from '../../core/gpu/device.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

/** Past this zoom a 32-bit float cannot tell neighbouring pixels apart (fractal.js, *The plane*). */
const DEEPEST = 5e4;

let params, bar, runner = null, failing = '';
let blank = null;                  // the picture the pass writes over: only its size matters
let busy = false;

const chainOf = values => [{ filter: FRACTAL, params: values }];

async function boot() {
  bar = new Bar({ app: 'fractals', mount: document.querySelector('.app'),
                  keys: 'drag pan · wheel zoom · V vault' });
  params = fractalParams();
  const panel = new ParamPanel(params, { title: 'fractal', mount: document.getElementById('side'), groups: GROUPS });

  const exp = panel.addDrawer({ id: 'export', title: 'Export' });
  const actions = document.createElement('div');
  actions.className = 'pp-actions';
  const png = document.createElement('button');
  png.type = 'button';
  png.className = 'nb-btn nb-btn--wide nb-btn--primary';
  png.textContent = 'Download the picture (PNG)';
  png.addEventListener('click', downloadPicture);
  actions.append(png);
  exp.body.append(actions);

  params.on(key => { applyFrameEdit(params, key); draw(); });
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  wirePointer({ canvas, params });
  wireKeys();

  runner = await createRunner();
  if (!runner) {
    bar.announce(`no fractals here — ${whyNoGpu()}`);
    return;
  }
  try {
    await runner.prepare(chainOf(params.values));
  } catch (err) {
    failing = err.message;
    bar.announce(err.message);
  }
  draw();
}

// ── Drawing ──────────────────────────────────────────────────────────────────

let pending = false;

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

/** The fractal at `w` × `h` pixels: the runner's picture, good until its next run. */
function render(values, w, h) {
  if (!blank || blank.width !== w || blank.height !== h) {
    blank = surface(w, h);
    blank.getContext('2d');       // a canvas the GPU copies from must have had a context
  }
  return runner.run(blank, chainOf(values));
}

function paint() {
  const v = params.values;
  const size = { width: v.width, height: v.height };
  const view = viewFactor(canvas, size, v.scale);
  const w = Math.max(1, Math.round(size.width * view));
  const h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  bar.output({ width: Math.round(v.width * v.scale), height: Math.round(v.height * v.scale), scale: v.scale, format: v.format });
  if (!runner || failing) {
    ctx.clearRect(0, 0, w, h);
    return;
  }
  ctx.drawImage(render(v, w, h), 0, 0);
  bar.say(describe(v));
}

/** The bar's line: which set, where, how deep — and when 32 bits have run out. */
function describe(v) {
  const where = `${v.cx.toPrecision(8)}, ${v.cy.toPrecision(8)}`;
  const set = v.kind === 'julia' ? `julia of ${v.jx.toPrecision(4)}, ${v.jy.toPrecision(4)}` : 'mandelbrot';
  const deep = v.zoom > DEEPEST ? ' · past 32-bit precision: the picture blocks up' : '';
  return `${set} · ${v.zoom < 10 ? v.zoom.toFixed(2) : Math.round(v.zoom).toLocaleString('en')}× at ${where} · ${v.iterations} iterations${deep}`;
}

// ── Leaving ──────────────────────────────────────────────────────────────────

/**
 * The picture at the format's size times its scale, as a PNG: drawn again,
 * not the preview enlarged — a fractal is a function of its params, so a
 * bigger picture has more of it in it.
 */
async function downloadPicture() {
  if (busy) return;
  if (!runner) return bar.announce(`no WebGPU here — ${whyNoGpu()}`);
  busy = true;
  try {
    const v = params.values;
    const w = Math.round(v.width * v.scale), h = Math.round(v.height * v.scale);
    bar.say(`drawing ${w} × ${h}…`);
    const picture = render(v, w, h);
    const out = surface(w, h);
    out.getContext('2d').drawImage(picture, 0, 0);
    download(await toPng(out), `fractal_${v.kind}_${w}x${h}.png`);
    bar.announce(`downloaded ${w} × ${h} px`);
  } catch (err) {
    console.error('[fractals] download failed:', err);
    bar.announce('download failed: ' + err.message);
  } finally {
    busy = false;
    draw();
  }
}

// ── Keys ─────────────────────────────────────────────────────────────────────

function wireKeys() {
  const vault = new VaultPanel();
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
  });
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

boot().catch(err => {
  console.error('[fractals] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
});
