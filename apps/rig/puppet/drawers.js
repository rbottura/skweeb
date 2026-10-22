/**
 * drawers.js — the puppet's drawers that are not parameters: the camera,
 * on or off and which; where straight is; what each stroke is; and sending
 * the puppet to OBS.
 *
 * The camera is this machine's, never the puppet's — a device id means
 * nothing on another — so it is chosen and switched here and not in the
 * schema; so is straight, the head as the author holds it now (head.js).
 * Switched off, it is let go, for OBS to take. The Parts drawer shows each
 * stroke in its guides' colour with the part found for it, and a choice
 * that tells it otherwise: what is told is the schema's `parts`, a word a
 * stroke (roles.js). Sent, the puppet is saved as a smart object, and the
 * page in OBS that holds it follows every send (main.js).
 */

import { HUES }  from '../guides.js';
import { ROLES } from './roles.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

const button = (text, title, onClick) => {
  const b = el('button', 'nb-btn', text);
  b.type = 'button';
  if (title) b.title = title;
  b.addEventListener('click', onClick);
  return b;
};

/**
 * @param {object} panel   the puppet's ParamPanel
 * @param {object} on
 * @param {(deviceId: string) => void} on.camera   another camera chosen
 * @param {(wanted: boolean) => void} on.switch    the camera switched on or off
 * @param {() => void} on.send                     the puppet sent to OBS: saved, its next version
 * @param {() => string} on.address                the address for OBS
 * @param {(text: string) => void} on.say
 * @param {() => void} on.guide                    the guide to OBS, opened
 * @param {() => void} on.straight                 the head as it is now is straight
 * @param {(stroke: number, role: string) => void} on.tell   a stroke told what it is, '' for found
 */
export function buildDrawers(panel, on) {
  const cam = panel.addDrawer({ id: 'camera', title: 'Camera', before: 'eyes' });
  const power = button('camera on', 'Let go of the camera, for OBS to take — and take it again', () => on.switch(power.getAttribute('aria-pressed') !== 'true'));
  power.setAttribute('aria-pressed', 'true');
  const pick = el('select', 'nb-select pp-select');
  pick.setAttribute('aria-label', 'camera');
  pick.addEventListener('change', () => on.camera(pick.value));
  cam.body.append(power, pick, el('p', 'pz-note', 'Off, the camera is let go, for OBS to take: a page waiting for it takes it as soon as it is free.'));

  const move = panel.drawer('move');
  move.body.prepend(button('I am straight now', null, on.straight),
    el('p', 'pz-note', 'Straight is learnt from your first second in front of the camera; C, or this, takes it again — sit as you sit, look at the screen.'));

  const parts = panel.drawer('parts');
  const rows = el('div', 'pz-parts');
  parts.body.prepend(rows, el('p', 'pz-note', 'Each stroke in its colour in the guides (B), the part found for it, and what to tell it instead: one body; an eye at the free end of each eyestalk; the rest limbs.'));

  const out = panel.drawer('obs');
  const send = button('Send to OBS', 'Saved in the vault as a smart object: the page in OBS that holds it follows every send [S]', on.send);
  send.classList.add('nb-btn--primary');
  const copy = button('Copy the address for OBS', null, async () => {
    const url = on.address();
    try {
      await navigator.clipboard.writeText(url);
      on.say('copied — paste it into a Browser source in OBS');
    } catch {
      window.prompt('The address for OBS:', url);
    }
  });
  const note = el('p', 'pz-note', '');
  out.body.append(send, copy, button('The guide: the puppet in OBS', null, on.guide), note);

  return {
    cameras(list, current) {
      pick.replaceChildren(...list.map(c => {
        const o = el('option', null, c.label);
        o.value = c.deviceId;
        o.selected = c.deviceId === current;
        return o;
      }));
      pick.disabled = list.length < 2;
    },

    /** The camera's switch, as it is. */
    switched(onNow) {
      power.setAttribute('aria-pressed', String(onNow));
      power.textContent = onNow ? 'camera on' : 'camera off';
    },

    /** Whether the puppet is saved, and how many changes OBS has not had. */
    sent(saved, unsent) {
      send.textContent = !saved ? 'Send to OBS' : unsent ? `Send to OBS · ${unsent} new` : 'Sent — OBS has it';
      send.disabled = saved && !unsent;
      note.textContent = saved
        ? 'OBS follows this puppet: its address is copied once, and every send reaches it. H shows the avatar alone; G opens the guide.'
        : 'Send it once, copy the address, paste it into OBS: from then on OBS follows every send. H shows the avatar alone; G opens the guide.';
    },

    /** A row a stroke: its colour, the part found, what it is told. */
    strokes(found, told) {
      rows.replaceChildren(...found.map((role, k) => {
        const row = el('label', 'pz-part');
        const swatch = el('span', 'pz-swatch');
        swatch.style.background = HUES[k % HUES.length];
        const choose = el('select', 'nb-select');
        choose.append(...['', ...ROLES].map(r => {
          const o = el('option', null, r ? r : `found: ${role}`);
          o.value = r;
          o.selected = (told[k] || '') === r;
          return o;
        }));
        choose.addEventListener('change', () => on.tell(k, choose.value));
        row.append(swatch, el('span', 'pz-part-name', `stroke ${k + 1}`), choose);
        return row;
      }));
      if (!found.length) rows.append(el('p', 'pz-note', 'A pose the rig saved keeps its own parts.'));
    },
  };
}
