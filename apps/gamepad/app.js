/**
 * app.js — GamepadDraw bootstrap (ES module entry point)
 *
 * The page's one script. No p5 and no global since C6b (docs/gamepad.md):
 * the sketch draws on its own canvas, core's stage replays what it records.
 * Since C6c its settings are a schema (params.js) in core's panel beside the
 * viewer, a drawer for what is not a setting; core's bar under the page says
 * the brush; the pad's controls are a guide, H (docs/guides/gamepad.md).
 */

import * as BrushRegistry from '../../core/registry.js';
import { ImageStore }          from './core/imageStore.js';
import { BrushPanel }          from './ui/BrushPanel.js';
import { GalleryPanel }        from './ui/GalleryPanel.js';
import { TimelinePanel }       from './ui/TimelinePanel.js';
import { VaultPanel }          from '../../core/VaultPanel.js';
import { PrintBox }            from './ui/PrintBox.js';
import { joinLive, savedBy }   from '../../core/live.js';
import { Vault, isTrashed }    from '../../core/vault.js';
import { offers }              from '../../core/uses.js';
import { ParamPanel }          from '../../core/ParamPanel.js';
import { Bar }                 from '../../core/Bar.js';
import { Guide }               from '../../core/Guide.js';
import { applyFrameEdit }      from '../../core/frame.js';
import { bare, own }           from '../../core/keys.js';
import { SequenceRecorder }    from '../../core/stage/recorder.js';
import { gamepadParams, GROUPS } from './params.js';
import { createSketch, setFamilyIndex, setSpriteIndex, familyIndex, spriteIndex }
       from './sketch/gamepadSketch.js';

import { BrushSelector }       from './ui/BrushSelector.js';

/** Built during boot; the keyboard handler at the bottom reaches them. */
let vaultPanel = null;
let printBox = null;
let bar = null;
let guide = null;

// Saving also writes a vault object, with the recipe attached.
import './core/vaultBridge.js';

// ── Boot sequence ────────────────────────────────────────────────────────────

async function boot() {
  try {
    // 1. Load manifest
    const manifest = await BrushRegistry.loadManifest();

    // 1b. Find out which of its families are actually on this machine. The
    //     heavy ones are gitignored by decision, so a clone has two of eleven
    //     and the rest would 404 once per sprite — 517 times — and then draw
    //     nothing when you cycled onto them. One HEAD each, before anything
    //     is offered.
    await BrushRegistry.probeFamilies();
    const missing = BrushRegistry.unavailableManifestFamilies();
    if (missing.length) {
      console.warn(`[registry] ${missing.length} sprite families are in the manifest `
        + `but not on this machine, and are not offered: `
        + missing.map(f => f.id).join(', '));
    }

    // 1c. Brush families made elsewhere in the suite. A `set` in the vault is
    //     an ordered list of glyph objects — ckt emits them — and this is the
    //     consumer half of M3's link, ckt -> gamepad: brush family. They are
    //     offered beside the ones on disk, because by the time you are picking
    //     a brush the difference does not matter.
    await registerVaultFamilies();

    // 2. Prompt user to select libraries — only from what can actually draw.
    const selector = new BrushSelector({
      ...manifest,
      families: BrushRegistry.availableManifestFamilies(),
    });
    const selectedIds = await selector.prompt();

    // 3. Configure registry, and decode what was chosen before anything draws with it.
    BrushRegistry.setSelectedFamilies(selectedIds);
    await BrushRegistry.loadSelected();

    // 4. The page: core's bar under it and its panel beside the viewer, the
    //    settings a schema (params.js); then the sketch, in the viewer.
    const params = gamepadParams();
    bar = new Bar({ app: 'gamepad', mount: document.querySelector('.app'), acts: false,
                    keys: 'stick moves · A stamps · Start records · L1 brushes · T timeline · V vault · E print · H the controls' });
    const panel = new ParamPanel(params, { title: 'gamepad', mount: document.getElementById('side'), groups: GROUPS });
    drawingDrawer(panel);
    params.on(key => applyFrameEdit(params, key));
    guide = new Guide({ url: new URL('../../docs/guides/gamepad.md', import.meta.url).href, title: "the gamepad's controls" });
    createSketch(document.getElementById('sketch-container'), params);

    // 5. Create UI panels
    new BrushPanel();
    new GalleryPanel();

    // Built after the sketch, so its getStage()/getTransport() have something
    // to return. It stays hidden until the first recording lands.
    new TimelinePanel();

    // The read side of the vault. Unlike the GALLERY panel, which shows this
    // browser's scratchpad, this one shows what is on disk with its recipes.
    vaultPanel = new VaultPanel();

    // The drawing at a sheet's size: drawn again from its marks, a tile at a time.
    printBox = new PrintBox();
    // A window of the stack (core/live.js): the drawing on the canvas, as its print has it.
    const live = joinLive({ app: 'gamepad', layer: () => printBox.printing.object() });
    live.answer('save', ({ smart }) => {
      if (smart && !Vault.bound) Vault.bind({});      // for what will hold it: a smart object (core/smart.js)
      return savedBy(() => document.dispatchEvent(new CustomEvent('gallery:saveCanvas')));
    });

    // 6. Restore previously saved images from IndexedDB
    await ImageStore.ready;

    // 7. The bar says the brush.
    say();

  } catch (err) {
    console.error('Failed to boot GamepadDraw:', err);
    document.body.innerHTML = `<div style="color:red;padding:20px;font-family:monospace">Fatal Error: ${err.message}</div>`;
  }
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

boot();

// ── Wire cross-module events ─────────────────────────────────────────────────

// BrushPanel confirmed → apply to sketch
document.addEventListener('brushpanel:confirm', e => {
  const { familyIndex: fi, spriteIndex: si } = e.detail;
  setFamilyIndex(fi);
  setSpriteIndex(si);
  say();
});

// The brush stepped on the pad, a save made or gone: the bar says so.
for (const name of ['sketch:brushChanged', 'imagestore:saved', 'imagestore:removed', 'imagestore:cleared', 'imagestore:hydrated']) {
  document.addEventListener(name, () => say());
}

/** The bar's line: the brush — its family in its colour's name, its sprite — and how many are saved here. */
function say() {
  const fam = BrushRegistry.familyMetaByIndex(familyIndex);
  if (bar && fam) bar.say(`${fam.label} · sprite ${spriteIndex + 1} · ${ImageStore.count} saved`);
}

/**
 * The drawer of what is not a setting (C6c): the recording — Start on the pad
 * — said as it goes, the canvas cleared, a picture put under the ink to draw
 * over. What ParamPanel.js's carousel held besides its settings.
 */
function drawingDrawer(panel) {
  const drawer = panel.addDrawer({ id: 'drawing', title: 'Drawing', before: 'brush' });
  const button = (label, title, run) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nb-btn nb-btn--wide';
    b.textContent = label;
    b.title = title;
    b.addEventListener('click', run);
    return b;
  };
  const tell = name => detail => document.dispatchEvent(new CustomEvent(name, { detail }));
  const record = button('● record', 'record a sequence, and stop — Start on the pad', () => tell('gamepad:record')());
  const status = Object.assign(document.createElement('p'), { className: 'pp-note gp-recording' });
  const file = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', hidden: true });
  file.addEventListener('change', e => {
    const picked = e.target.files[0];
    if (picked) tell('gamepad:reference')({ url: URL.createObjectURL(picked) });
    e.target.value = '';      // so the same file can be picked again
  });
  drawer.body.append(record, status,
    button('clear the canvas', 'every mark off the canvas — C', () => tell('gamepad:clear')()),
    button('a reference under the ink…', "a picture to draw over, at the Canvas drawer's opacity", () => file.click()), file);

  const show = () => {
    const on = SequenceRecorder.recording, n = SequenceRecorder.count;
    record.textContent = on ? '■ stop recording' : '● record';
    record.classList.toggle('nb-btn--primary', on);
    status.textContent = on ? `● recording · ${SequenceRecorder.liveCount} marks`
      : n ? `${n} sequence${n > 1 ? 's' : ''} — on the timeline, T` : 'nothing recorded yet';
  };
  for (const name of ['sequence:started', 'sequence:captured', 'sequence:stopped', 'sequence:discarded', 'sequence:removed', 'sequence:cleared']) {
    document.addEventListener(name, show);
  }
  show();
}

// ── Keys ─────────────────────────────────────────────────────────────────────

// The print, the ground and the controls are the gamepad's letters, not core's
// left hand (core/keys.js): E, G and H are kept.
own('KeyE', 'KeyG', 'KeyH');

document.addEventListener('keydown', e => {
  // A select or slider in a drawer has the keyboard; a plain letter there is
  // someone typing, not a shortcut (core/keys.js `bare`).
  if (!bare(e)) return;
  if (e.key === 'h' || e.key === 'H') guide?.toggle();
  if (e.key === 't' || e.key === 'T') {
    document.dispatchEvent(new CustomEvent('ui:toggleTimeline'));
  }
  if (e.key === 'v' || e.key === 'V') vaultPanel?.toggle();
  if (e.key === 'e' || e.key === 'E') printBox?.toggle();
});
