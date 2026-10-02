/**
 * drawers.js — the rig's buttons, in the drawers of its panel: back to rest
 * in the Pose drawer; the presets at the head of the Motion drawer — a walk,
 * a waddle, an idle, or still again (presets.js); saving and downloading in
 * the Export drawer. What each does is main.js's to say.
 */

import { PRESETS } from './presets.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

function button(label, onClick, { primary = false, wide = false, title = '' } = {}) {
  const b = el('button', 'nb-btn' + (wide ? ' nb-btn--wide' : '') + (primary ? ' nb-btn--primary' : ''), label);
  b.type = 'button';
  if (title) b.title = title;
  b.addEventListener('click', onClick);
  return b;
}

/**
 * @param {object} panel   the rig's ParamPanel
 * @param {object} does    { rest, preset(name), still, save, download }
 */
export function buildDrawers(panel, does) {
  const pose = panel.addDrawer({ id: 'pose', title: 'Pose', before: 'motion' });
  pose.body.append(button('Back to rest  [R]', does.rest, { wide: true }));

  const motion = panel.drawer('motion').body;
  const presets = el('div', 'rg-presets');
  for (const [name, p] of Object.entries(PRESETS)) {
    presets.append(button(p.label, () => does.preset(name), { title: 'Waves set by part — the legs, the arms, the head — and a rise: edit them after' }));
  }
  presets.append(button('Still', does.still, { title: 'Every wave and the rise taken off' }));
  motion.prepend(el('p', 'rg-note', 'A preset sets the waves by each chain\'s part — choose a bone to see or change its chain\'s.'), presets);

  const exp = panel.addDrawer({ id: 'export', title: 'Export' });
  const actions = el('div', 'pp-actions');
  actions.append(button('Save to the vault  [S]', does.save, { primary: true, wide: true }),
                 button('Download the frame (PNG)', does.download, { wide: true }));
  exp.body.append(actions);
}
