/**
 * drawers.js — what the gamepad puts in core's panel besides its settings,
 * and over its page: the Drawing drawer (C6c), the Families drawer (C6d) and
 * the pad's notices. Its listeners are its mount's (core/scope.js `listen`):
 * they go when it is unmounted.
 */

import * as BrushRegistry from '../../../core/registry.js';
import { SequenceRecorder } from '../../../core/stage/recorder.js';
import { listen, held } from '../../../core/scope.js';
import { familyIndex } from '../sketch/gamepadSketch.js';

const button = (label, title, run) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nb-btn nb-btn--wide';
  b.textContent = label;
  b.title = title;
  b.addEventListener('click', run);
  return b;
};
const tell = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

/**
 * What is not a setting (C6c): the recording — Start on the pad — said as it
 * goes, the canvas cleared, a picture put under the ink to draw over. What
 * the carousel of ui/ParamPanel.js held besides its settings.
 */
export function drawingDrawer(panel) {
  const drawer = panel.addDrawer({ id: 'drawing', title: 'Drawing', before: 'brush' });
  const record = button('● record', 'record a sequence, and stop — Start on the pad', () => tell('gamepad:record'));
  const status = Object.assign(document.createElement('p'), { className: 'pp-note gp-recording' });
  const file = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', hidden: true });
  file.addEventListener('change', e => {
    const picked = e.target.files[0];
    if (picked) tell('gamepad:reference', { url: URL.createObjectURL(picked) });
    e.target.value = '';      // so the same file can be picked again
  });
  drawer.body.append(record, status,
    button('clear the canvas', 'every mark off the canvas — C', () => tell('gamepad:clear')),
    button('a reference under the ink…', "a picture to draw over, at the Canvas drawer's opacity", () => file.click()), file);

  const show = () => {
    const on = SequenceRecorder.recording, n = SequenceRecorder.count;
    record.textContent = on ? '■ stop recording' : '● record';
    record.classList.toggle('nb-btn--primary', on);
    status.textContent = on ? `● recording · ${SequenceRecorder.liveCount} marks`
      : n ? `${n} sequence${n > 1 ? 's' : ''} — on the timeline, T` : 'nothing recorded yet';
  };
  for (const name of ['sequence:started', 'sequence:captured', 'sequence:stopped', 'sequence:discarded', 'sequence:removed', 'sequence:cleared']) {
    listen(document, name, show);
  }
  show();
}

/**
 * The families (C6d): every one the D-pad steps through — the manifest's on
 * this disk, the vault's sets offered as brushes — the one drawn with marked,
 * a click drawing with another. A family is decoded the first time it is
 * drawn with (core/registry.js), so offering all of them costs nothing; the
 * splash that chose which to decode is gone.
 */
export function familiesDrawer(panel, pick) {
  const drawer = panel.addDrawer({ id: 'families', title: 'Families', before: 'brush', open: false });
  const list = Object.assign(document.createElement('div'), { className: 'gp-families' });
  const items = BrushRegistry.allFamilyMetas().map((fam, i) => {
    const b = button(`${fam.label} · ${BrushRegistry.spriteCount(fam.id)}`, fam.fromVault ? 'a set from the vault' : fam.id, () => { pick(i); mark(); });
    b.classList.add('gp-family');
    return b;
  });
  list.append(...items);
  drawer.body.append(list);
  const mark = () => items.forEach((b, i) => b.classList.toggle('nb-btn--primary', i === familyIndex));
  for (const name of ['sketch:brushChanged', 'brushpanel:confirm']) listen(document, name, () => queueMicrotask(mark));
  mark();
  return { mark };
}

/**
 * The pad, said: a notice while none is seen — a browser hides one already
 * plugged in until a button is pressed — and a flash as one comes and goes.
 * Back: what the sketch calls when its poll finds a pad.
 */
export function padNotice(root) {
  const banner = root.querySelector('#gp-nopad'), indicator = root.querySelector('#gamepad-indicator');
  let seen = false, dismissed = false, timer = 0;
  const sync = () => banner.classList.toggle('gp-nopad--visible', !seen && !dismissed);
  root.querySelector('#gp-nopad-close').addEventListener('click', () => { dismissed = true; sync(); });
  const flash = (text, color, border, ms) => {
    indicator.textContent = text;
    indicator.style.color = color;
    indicator.style.borderColor = border;
    indicator.classList.add('gamepad-indicator--active');
    clearTimeout(timer);
    timer = setTimeout(() => indicator.classList.remove('gamepad-indicator--active'), ms);
  };
  held(() => clearTimeout(timer));
  listen(window, 'gamepadconnected', () => {
    seen = true;
    sync();
    flash('Gamepad connected', '#aaff00', 'rgba(170,255,0,0.4)', 3000);
  });
  listen(window, 'gamepaddisconnected', () => flash('Gamepad disconnected', '#ff2079', 'rgba(255,32,121,0.4)', 2000));
  sync();
  // Once a pad has been seen the flash takes over reporting, so the banner never
  // returns on a disconnect midway.
  return () => {
    if (seen) return;
    seen = true;
    sync();
  };
}
