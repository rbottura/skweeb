/**
 * main.js — the vault, an app (S9b, 2026-11-04; docs/scene.md, *Planned,
 * 2026-11-04*): every object full screen — the vault panel's grid, folders,
 * kin and detail docked over the page, not over another app — and the one
 * whose detail is open drawn large beside it, played if it moves, as compose
 * would draw it (core/rebuild.js `openFrames`). The author's ask: "une app
 * vault pour une consultation full screen du vault"; in *cluster*, the app
 * that is open when nothing else is.
 *
 * It makes nothing: a consultation, so no recipe, no rebuild.js, no S.
 * `?open=<id>` draws that object as it opens. With no vault it opens and says
 * so (rule 7). A module (core/mount.js): `mount(host)` and `unmount()`, its
 * page mounting it on itself. In a scene that has a vault of its own beside
 * the viewer — cluster's, given as `vault` (S9c) — it builds none: it draws
 * what that one opens (`chosen`). Nothing happens at import.
 */

import { VaultPanel } from '../../core/VaultPanel.js';
import { Bar }        from '../../core/Bar.js';
import { Transport }  from '../../core/Transport.js';
import { Playhead }   from '../../core/playback.js';
import { Vault }      from '../../core/vault.js';
import { openFrames } from '../../core/rebuild.js';
import { viewFactor } from '../../core/view.js';
import { appModule, leftBehind } from '../../core/mount.js';

/** The vault on the left, as wide as it needs; the object chosen in the viewer, its player under it. */
const MARKUP = `
  <main class="app-main">
    <section class="vault-side" id="vault-side" aria-label="the vault"></section>
    <section class="viewer" aria-label="the object chosen">
      <div class="viewer-stage"><canvas id="stage" width="480" height="300"></canvas></div>
      <div class="vault-player" id="player" hidden></div>
    </section>
  </main>`;

const app = appModule('vault', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start,
  keep: () => (shown ? { id: shown.id } : null) });      // the object drawn, given back as it was left

/** The vault in `host`, every object in it — one drawn if the page asks for it (core/mount.js). */
export const mount = (host, given) => app.mount(host, given);
/** The vault out of its host, everything it held let go of: its panel, the object drawn, its clock. */
export const unmount = () => app.unmount();
const mounted = () => !!app.scope;

/** An object a scene's vault opened (cluster's, S9c): drawn here, as one this app's own panel opened. */
export function chosen(object, { url } = {}) {
  if (mounted() && object) show(object, url);
}

// One app mounted at a time: its state, made again by each mount (`start`).
let root, canvas, ctx, clock, bar, transport, player, handle, shown, asked, pending;

function start(host, mine, given = {}) {
  root = host;
  canvas = root.querySelector('#stage');
  ctx = canvas.getContext('2d');
  player = root.querySelector('#player');
  handle = shown = null;     // the object drawn, as frames (core/rebuild.js), and its envelope
  asked = 0;                 // the latest asked for; an older answer is dropped
  pending = false;           // a paint asked for, not yet made
  // The clock plays what moves at its own rate. Stopped, and the frames let go of, at the unmount.
  clock = new Playhead({
    onShow: tick => { if (transport) transport.show(tick); draw(); },
    onState: () => { if (transport) transport.state(); },
  });
  mine.hold(() => clock.dispose());
  mine.hold(() => { if (handle) handle.dispose(); handle = null; });

  bar = new Bar({ app: 'vault', mount: root, keys: 'click an object: drawn here · space play · , . frame', acts: false });
  transport = new Transport({ clock, mount: player, busy: () => false });
  // Its detail the facts only, narrower over the grid — the picture is the viewer's (the author's C, 2026-11-05).
  // A scene with a vault of its own beside the viewer (cluster's): none here, the scene's tells `chosen`.
  if (!given.vault) new VaultPanel({ mount: root.querySelector('#vault-side'), detailPicture: false, onDetail: (object, { url }) => show(object, url) });

  const sized = new ResizeObserver(() => draw());
  sized.observe(canvas.parentElement);
  mine.hold(() => sized.disconnect());
  mine.listen(document, 'keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (!handle || handle.length < 2) return;
    if (e.key === ' ') { e.preventDefault(); clock.toggle(); }
    if (e.key === ',') { clock.pause(); clock.step(-1); }
    if (e.key === '.') { clock.pause(); clock.step(1); }
  });

  Vault.refresh().then(ok => {
    if (!mounted()) return;
    bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault');
    bar.say(ok ? 'an object chosen opens its detail, and is drawn here' : 'no vault here — start  node server.js');
    // The object the address asks for — or, asked nothing, the one drawn when the vault was last taken out (core/mount.js).
    const left = !location.search && leftBehind('vault');
    const id = new URLSearchParams(location.search).get('open') || (left ? left.state.id : null);
    if (ok && id) Vault.load(id).then(got => show(got.object, got.url), err => bar.announce(`could not open ${id}: ${err.message}`));
  });
  draw();
}

/** An object drawn in the viewer: its frames, the clock fitted to them, played if they move. */
async function show(object, url) {
  const ask = ++asked;
  bar.say(`opening ${object.title || object.id}…`);
  try {
    const next = await openFrames(object, { url, draft: true });
    if (ask !== asked || !mounted()) return next.dispose();
    if (handle) handle.dispose();
    handle = next;
    shown = object;
    clock.configure({ length: Math.max(1, handle.length), fps: handle.fps || 30, loop: true });
    transport.configure();
    player.hidden = handle.length < 2;
    if (handle.length > 1) clock.play(); else { clock.pause(); clock.show(0); }
    draw();
  } catch (err) {
    if (ask === asked && mounted()) bar.announce(`could not draw ${object.id}: ${err.message}`);
  }
}

// ── Drawing ──────────────────────────────────────────────────────────────────

function draw() {
  if (pending || !mounted()) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  if (!mounted()) return;
  if (!handle) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const size = { width: handle.width, height: handle.height };
  const view = viewFactor(canvas, size, 1);
  const w = Math.max(1, Math.round(size.width * view)), h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(handle.frame(Math.min(clock.tick, handle.length - 1)), 0, 0, w, h);
  bar.output({ width: handle.width, height: handle.height });
  bar.say(`${shown.title || shown.id} · ${shown.type}` + (handle.length > 1 ? ` · frame ${clock.tick + 1} of ${handle.length}` : ''));
}
