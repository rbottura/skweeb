/**
 * wear.js — what the puppet wears: a drawing rigged as the rig rigs it,
 * where its eyes and its mouth go, and where its bones and stamps are at a
 * frame, the head's turns added.
 *
 * A pose or a loop the rig saved is worn as saved — its bones, its pose,
 * its waves playing. A gamepad drawing is rigged with the rig's own code
 * and defaults, but read the puppet's way (roles.js): the body is found or
 * told, not taken to be the first stroke, each stroke read from the end it
 * hangs by, the body hung first; and its strokes cut shorter than the rig
 * cuts them (`longest`), so the body bends along its length and a stalk
 * curls as it swings (sway.js). The live turns are added to the pose's and
 * the waves' before the bones are posed, so a loop still plays under the
 * head. A crawl moves its body its own way, and is worn without them.
 */

import { openDrawing, framesOf, isPose, openPathFrom, centreOf, placesOf, inkOf } from '../frames.js';
import { drawingOf, hasMarks } from '../drawing.js';
import { proposeBones, posed } from '../bones.js';
import { withParts, guessParts } from '../parts.js';
import { bind, placeOf }       from '../skin.js';
import { turnsAt, riseAt }     from '../motion.js';
import { crawls }              from '../crawl.js';
import { rigParams }           from '../params.js';
import { eyeTips, faceOf }     from './tips.js';
import { limbsOf }             from './sway.js';
import { rolesOf, partsFor }   from './roles.js';

/**
 * A gamepad drawing rigged the puppet's way: its roles found or told, its
 * strokes read from the body out, its bones `longest` px at most.
 *
 * @returns {{recipe: object, drawing: object, roles: object}}  recipe as a rig's: { rig, bones, turns, waves }
 */
export function rigged(object, images, { longest = 70, told = [] } = {}) {
  const rig = { ...rigParams().values, drawing: object.id, longest };
  const roles = rolesOf(drawingOf(object.recipe, { jump: rig.jump }), images, told);
  const drawing = drawingOf(object.recipe, { jump: rig.jump, reverse: roles.reverse });
  const raw = proposeBones(drawing, { corner: rig.corner, longest, order: roles.order });
  const bones = withParts(raw, partsFor(roles.roles, guessParts(raw)));
  return { recipe: { rig, bones, turns: [], waves: [] }, drawing, roles };
}

/** A drawing's frames as framesOf gives a rig's: one, at rest — read as the puppet reads it. */
function stillFrames(drawing, bones, binds, images) {
  const placesAt = () => placesOf(drawing, bones, binds, []);
  return { drawing, loop: false, length: 1, fps: 0, path: null, placesAt, ink: () => inkOf(drawing, placesAt(), images) };
}

/**
 * @param {object} object   a vault envelope: a gamepad still, or a rig's pose or loop
 * @param {object} [opts]   { longest, told }
 * @returns {Promise<object>}  { title, recipe, drawing, images, bones, binds, frames, tips, face, limbs, roles, ink, body, moves, missing }
 */
export async function wear(object, opts = {}) {
  let recipe, drawing, frames, roles = null, opened;
  if (isPose(object.recipe)) {
    recipe = { ...object.recipe, bones: withParts(object.recipe.bones) };
    opened = await openDrawing(recipe.rig.drawing);
    frames = framesOf(recipe, opened, await openPathFrom(recipe.rig, centreOf(drawingOf(opened.recipe, { jump: recipe.rig.jump }))));
    drawing = frames.drawing;
  } else {
    if (!hasMarks(object.recipe)) throw new Error(`${object.title || object.id} has no marks to rig`);
    opened = await openDrawing(object.id);
    ({ recipe, drawing, roles } = rigged(object, opened.images, opts));
  }
  const bones = recipe.bones, binds = bind(drawing, bones, { bend: recipe.rig.bend });
  frames = frames || stillFrames(drawing, bones, binds, opened.images);
  const root = bones.find(b => b.parent == null);
  return {
    title: object.title || object.id,
    recipe, drawing, bones, binds, frames, roles,
    images: opened.images,
    tips: eyeTips(drawing, bones),
    face: faceOf(drawing, bones),
    limbs: limbsOf(bones),
    ink: recipe.box || frames.ink(),
    body: root ? drawing.strokes[root.stroke].path.length : 0,
    moves: !crawls(recipe.rig),
    missing: opened.missing,
  };
}

/**
 * The bones posed at frame `tick` of what is worn: the pose's turns, the
 * waves' and the head's, and the rise and the lift — or null while it
 * crawls, which moves the stamps along a spine and no bone (../crawl.js).
 *
 * @param {object} worn
 * @param {number} tick
 * @param {?{turns: ArrayLike<number>, lift: number}} [live]
 * @returns {?Array<{x, y, a}>}  ../bones.js `posed`
 */
export function bonesAt(worn, tick, live = null) {
  if (!worn.moves) return null;
  const { recipe, frames, bones } = worn;
  const base = frames.loop ? turnsAt(bones, recipe.turns, recipe.waves || [], tick, frames.length) : recipe.turns;
  const turns = bones.map(b => (base[b.id] || 0) + ((live && live.turns[b.id]) || 0));
  return posed(bones, turns, riseAt(recipe.rig, tick, frames.length) + ((live && live.lift) || 0));
}

/**
 * Where every stamp is at frame `tick` of what is worn, the head's turns
 * and lift added — or as the rig draws it, with none or while it crawls.
 *
 * @param {object} worn
 * @param {number} tick
 * @param {?{turns: ArrayLike<number>, lift: number}} [live]
 * @param {?Array<{x, y, a}>} [at]   the bones posed already, bonesAt's
 */
export function placesAt(worn, tick, live = null, at = null) {
  if (!live || !worn.moves) return worn.frames.placesAt(tick);
  const posedNow = at || bonesAt(worn, tick, live);
  return worn.drawing.stamps.map((s, i) => placeOf(s, worn.binds[i], worn.bones, posedNow));
}
