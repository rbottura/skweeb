/**
 * main.js — the gamepad, assembled: a module since C6d (docs/gamepad.md),
 * `mount(host)` and `unmount()` (core/mount.js), so cluster mounts it in its
 * strip and the 3D player's heart can (M16n); index.html mounts it on
 * itself, and it runs alone as ever (rule 7). Nothing happens at import.
 *
 * Its settings are a schema (params.js) in core's panel beside the viewer,
 * with a drawer for what is not a setting and one for the families; core's
 * bar under the page says the brush (C6c). The families are every one on
 * this disk and every vault set offered as brushes, each decoded the first
 * time it is drawn with (core/registry.js `loadFamilies`) — the splash that
 * chose which to decode is gone. No p5 (C6b): the sketch draws on its own
 * canvas, core's stage replays what it records. The pad's controls are a
 * guide, H (docs/guides/gamepad.md).
 *
 * What it holds outside its nodes — the document's listeners, the pad's,
 * its frame clock, the keys it keeps from core — goes with its scope
 * (core/scope.js `listen`, `held`), so a scene mounts it again as new.
 */

import * as BrushRegistry from '../../core/registry.js';
import { InputManager }        from './core/inputManager.js';
import { ImageStore }          from './core/imageStore.js';
import { wireVault }           from './core/vaultBridge.js';
import { BrushPanel }          from './ui/BrushPanel.js';
import { GalleryPanel }        from './ui/GalleryPanel.js';
import { TimelinePanel }       from './ui/TimelinePanel.js';
import { PrintBox }            from './ui/PrintBox.js';
import { drawingDrawer, familiesDrawer, padNotice } from './ui/drawers.js';
import { VaultPanel }          from '../../core/VaultPanel.js';
import { joinLive, savedBy }   from '../../core/live.js';
import { Vault, isTrashed }    from '../../core/vault.js';
import { offers }              from '../../core/uses.js';
import { ParamPanel }          from '../../core/ParamPanel.js';
import { Bar }                 from '../../core/Bar.js';
import { Guide }               from '../../core/Guide.js';
import { applyFrameEdit }      from '../../core/frame.js';
import { bare, own }           from '../../core/keys.js';
import { listen }              from '../../core/scope.js';
import { appModule }           from '../../core/mount.js';
import { requested, openedLine } from '../../core/reopen.js';
import { SequenceRecorder }    from '../../core/stage/recorder.js';
import { gamepadParams, GROUPS } from './params.js';
import { recipeNow }           from './core/vaultBridge.js';
import * as StillFrame         from './core/stillFrame.js';
import * as Sketch             from './sketch/gamepadSketch.js';
import { createSketch, restamp, setFamilyIndex, setSpriteIndex, familyIndex, spriteIndex }
       from './sketch/gamepadSketch.js';

/** The viewer, its stage the page; the panel beside it; the pad's notices over it. Core's bar under all. */
const MARKUP = `
  <main class="app-main">
    <section class="viewer" aria-label="drawing">
      <div class="viewer-stage" id="sketch-container"></div>
    </section>
    <div class="app-side" id="side"></div>
  </main>
  <div class="gamepad-indicator" id="gamepad-indicator">Gamepad connected</div>
  <div class="gp-nopad" id="gp-nopad" role="status">
    <span class="gp-nopad__text">No gamepad detected &mdash; connect one and press any button</span>
    <a class="gp-nopad__link" href="gallery/" target="_blank" rel="noopener">Browse gallery &#8599;</a>
    <button class="gp-nopad__close" id="gp-nopad-close" type="button" aria-label="Dismiss notice">&#10005;</button>
  </div>`;

/** The family drawn with first: the one git keeps, `brushes`, when it is here. */
const FIRST_FAMILY = 'brushes';

const app = appModule('gamepad', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start, keep });

/** The gamepad in `host`, started (core/mount.js). */
export const mount = (host, given) => app.mount(host, given);
/** The gamepad out of its host, everything it held let go of: its listeners, the pad's, its clock, its keys. */
export const unmount = () => app.unmount();

// One gamepad mounted at a time: what its keys and its bar reach, made again by each mount.
let vaultPanel = null, printBox = null, bar = null, guide = null;

async function start(root, mine) {
  vaultPanel = printBox = bar = guide = null;
  // The pad's listeners are the panels' and the sketch's: each mount's own.
  InputManager.reset();
  mine.hold(() => InputManager.reset());

  // 1. The families: the manifest's on this disk, the vault's sets offered as brushes — all of them stepped through by
  //    the D-pad, each decoded the first time it is drawn with. The first one decoded before anything draws.
  await BrushRegistry.loadManifest(new URL('./brush-manifest.json', import.meta.url).href);
  await BrushRegistry.probeFamilies();
  const missing = BrushRegistry.unavailableManifestFamilies();
  if (missing.length) {
    console.warn(`[registry] ${missing.length} sprite families are in the manifest `
      + `but not on this machine, and are not offered: ` + missing.map(f => f.id).join(', '));
  }
  await registerVaultFamilies();
  if (mine.closed) return;
  BrushRegistry.setSelectedFamilies(BrushRegistry.availableManifestFamilies().map(f => f.id));
  const first = Math.max(0, BrushRegistry.allFamilyMetas().findIndex(f => f.id === FIRST_FAMILY));
  await BrushRegistry.loadFamilies([BrushRegistry.familyIdByIndex(first)].filter(Boolean));
  if (mine.closed) return;

  // 2. The page: core's bar under it and its panel beside the viewer, the settings a schema (params.js); then the
  //    sketch, in the viewer.
  const params = gamepadParams();
  bar = new Bar({ app: 'gamepad', mount: root, acts: false,
                  keys: 'stick moves · A stamps · Start records · L1 brushes · T timeline · V vault · E print · H the controls' });
  const panel = new ParamPanel(params, { title: 'gamepad', mount: root.querySelector('#side'), groups: GROUPS });
  drawingDrawer(panel);
  familiesDrawer(panel, i => { setFamilyIndex(i); setSpriteIndex(0); say(); });
  params.on(key => applyFrameEdit(params, key));
  const shown = guide = new Guide({ url: new URL('../../docs/guides/gamepad.md', import.meta.url).href, title: "the gamepad's controls" });
  mine.hold(() => shown.dispose());
  createSketch(root.querySelector('#sketch-container'), params, { family: first, onPad: padNotice(root) });

  // 3. Its own panels, over the page.
  new BrushPanel();
  new GalleryPanel();
  // Built after the sketch, so its getStage()/getTransport() have something
  // to return. It stays hidden until the first recording lands.
  new TimelinePanel();
  // The read side of the vault. Unlike the GALLERY panel, which shows this
  // browser's scratchpad, this one shows what is on disk with its recipes.
  vaultPanel = new VaultPanel();
  // The drawing at a sheet's size: drawn again from its marks, a tile at a time.
  const print = printBox = new PrintBox();
  // A window of the stack (core/live.js): the drawing on the canvas, as its print has it.
  const live = joinLive({ app: 'gamepad', layer: () => print.printing.object() });
  live.answer('save', ({ smart }) => {
    if (smart && !Vault.bound) Vault.bind({});      // for what will hold it: a smart object (core/smart.js)
    return savedBy(() => document.dispatchEvent(new CustomEvent('gallery:saveCanvas')));
  });
  // What the gamepad saves goes to the vault too, with its recipe.
  wireVault();
  wireEvents();
  wireKeys();

  // 4. What it was doing, when a scene mounts it again, or a still the address opens; the saves of this browser, from
  //    IndexedDB; then the bar says the brush.
  await openRequested(params);
  await ImageStore.ready;
  if (mine.closed) return;
  say();
}

/**
 * What the gamepad was doing when a scene took it out (core/mount.js), or an
 * object of its own `?open=` names (rebuild.js `reopens`): a still — its
 * settings, its brush, its marks stamped again on the ink
 * (sketch/gamepadSketch.js `restamp`) — or a loop, a layer of the timeline
 * again with the treatment it was saved with (C6e).
 */
async function openRequested(params) {
  try {
    const opened = await requested('gamepad');
    if (!opened || !app.scope) return;
    const recipe = opened.object.recipe || {};
    if (opened.object.type === 'sequence' && recipe.sequence) {
      await BrushRegistry.loadFamilies(recipe.sequence.events.map(e => e.familyId).filter(Boolean));
      if (!app.scope) return;
      SequenceRecorder.adopt(recipe.sequence, recipe.clip);
      if (bar) bar.announce(`${openedLine(opened)} · on the timeline`);
      return;
    }
    if (recipe.params) params.restore(recipe.params);
    const marks = await restamp(recipe);
    if (bar) bar.announce(openedLine(opened) + (marks ? ` · ${marks} marks` : ''));
  } catch (err) {
    if (bar) bar.announce('could not open it: ' + err.message);
  }
}

/**
 * What it is doing, for a scene to give back (core/mount.js): the still a
 * save would make of the canvas now — its marks, its brush, its settings —
 * or, with a picture under the ink and so no marks to draw it again from, its
 * settings alone.
 */
function keep() {
  const params = Sketch.getParams(), ink = Sketch.getInk();
  if (!params || !ink) return null;
  const recipe = recipeNow(Sketch, StillFrame.frameFor(ink, params.values)) || { params: params.values };
  return { type: 'still', recipe };
}

/**
 * Register every `set` in the vault as a brush family.
 *
 * The consumer half of M3's link. A set is an ordered list of glyph objects,
 * which is a brush family in a different shape — `familyFromSet()` does the
 * translation and `registerFamily()` makes it selectable. ckt does not have to
 * be installed, and the gamepad does not have to know ckt exists: it reads the
 * vault, and a set is a set.
 *
 * Failing softly on purpose. No vault, or a vault with nothing in it, is a
 * normal state — rule 7, every app runs alone — so this adds what it finds and
 * says nothing when it finds none.
 */
async function registerVaultFamilies() {
  try {
    if (!(await Vault.refresh())) return;

    // Not a set in the trash: what is there is offered to nothing (core/vault.js) — and the gamepad reopens no
    // recording, so none drawn with one needs it here; core replays those itself (C4).
    const sets = Vault.index.filter(row => row.type === 'set' && !isTrashed(row));
    if (!sets.length) return;

    let added = 0;
    for (const row of sets) {
      try {
        const { object } = await Vault.load(row.id);
        // Only the sets offered as brushes: a material, or a family switched off
        // in the vault, stays out of the picker (core/uses.js). Asked of the
        // envelope, which always has the role — a row may come from an index an
        // older server wrote.
        if (!offers(object, 'brushes')) continue;
        const fam = BrushRegistry.familyFromSet(object, Vault.index);
        if (fam && BrushRegistry.registerFamily(fam)) added++;
      } catch {
        // One unreadable set costs that set, not the boot.
      }
    }
    if (added) console.log(`[registry] ${added} brush famil${added === 1 ? 'y' : 'ies'} from the vault`);
  } catch (err) {
    console.warn('[registry] could not read vault sets:', err);
  }
}

// ── Wire cross-module events ─────────────────────────────────────────────────

function wireEvents() {
  // BrushPanel confirmed → apply to sketch
  listen(document, 'brushpanel:confirm', e => {
    const { familyIndex: fi, spriteIndex: si } = e.detail;
    setFamilyIndex(fi);
    setSpriteIndex(si);
    say();
  });
  // The brush stepped on the pad, a save made or gone: the bar says so.
  for (const name of ['sketch:brushChanged', 'imagestore:saved', 'imagestore:removed', 'imagestore:cleared', 'imagestore:hydrated']) {
    listen(document, name, () => say());
  }
}

/** The bar's line: the brush — its family, its sprite — and how many are saved here. */
function say() {
  const fam = BrushRegistry.familyMetaByIndex(familyIndex);
  if (bar && fam) bar.say(`${fam.label} · sprite ${spriteIndex + 1} · ${ImageStore.count} saved`);
}

// ── Keys ─────────────────────────────────────────────────────────────────────

function wireKeys() {
  // The print, the ground and the controls are the gamepad's letters, not core's
  // left hand (core/keys.js): E, G and H are kept while it is mounted.
  own('KeyE', 'KeyG', 'KeyH');
  listen(document, 'keydown', e => {
    // A select or slider in a drawer has the keyboard; a plain letter there is
    // someone typing, not a shortcut (core/keys.js `bare`).
    if (!bare(e)) return;
    if (e.key === 'h' || e.key === 'H') guide?.toggle();
    if (e.key === 't' || e.key === 'T') document.dispatchEvent(new CustomEvent('ui:toggleTimeline'));
    if (e.key === 'v' || e.key === 'V') vaultPanel?.toggle();
    if (e.key === 'e' || e.key === 'E') printBox?.toggle();
  });
}
