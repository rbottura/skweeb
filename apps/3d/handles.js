/**
 * handles.js — the chosen shape moved, turned and sized by hand, in the view.
 *
 * three's TransformControls (core/libs/three/addons/controls/, vendored by
 * scripts/vendor-three.mjs) on the chosen shape's mesh: arrows and squares
 * that move it along an axis or in a plane, rings that turn it, cubes that
 * stretch it along one of its own axes or, the middle one, size it whole.
 *
 * Its gizmo is a scene of its own, drawn over the model's picture as a guide
 * is (main.js) — never in the model's scene. So a save, which builds its own
 * scene (frames.js), never has it, and when the model lets a mesh go — a
 * shape hidden, taken out — the gizmo is not left holding it.
 *
 * A handle moves the mesh; what the mesh became goes back into the shape's
 * card (scene.js `placeOf`), and the scene is brought into step from the card
 * as from any other edit: the card stays what the recipe keeps. Only a
 * shape's place is ever written, so a bound the card has (`PLACE`) is a
 * bound the handles stop at.
 *
 * The controls are driven through their own pointer calls by pointer.js,
 * which owns the canvas's pointer — a press on a handle is the handle's,
 * never a turn of the view nor a pick — at the picture's points, -1 to 1
 * each way, y up, as three's are. They face the camera the picture was last
 * drawn with (`see`), so they are measured through what is on screen.
 *
 * three.core.js and the add-on, which reaches no GPU until it is drawn: Node
 * runs this (tests/3d-handles.mjs).
 */

import { Scene, PerspectiveCamera } from '../../core/libs/three/three.core.js';
import { TransformControls } from '../../core/libs/three/addons/controls/TransformControls.js';
import { PLACE } from './shapes.js';

/** The handles' modes by the words the app shows, and three's names for them. */
export const MODES = { move: 'translate', turn: 'rotate', size: 'scale' };

export class Handles {
  /**
   * @param {object} opts
   * @param {(mesh: object, how: {mode: string, axis: string}) => void} opts.onMove   a handle moved the mesh
   * @param {() => void} [opts.onChange]   how the handles look changed: one lit under the pointer, held, let go, another mode
   */
  constructor({ onMove, onChange = () => {} }) {
    this.scene = new Scene();
    // No element: pointer.js hands it the pointer. A camera until `see` gives the picture's.
    this.controls = new TransformControls(new PerspectiveCamera(), null);
    this.scene.add(this.controls.getHelper());
    for (const a of ['X', 'Y', 'Z']) {
      this.controls['min' + a] = PLACE[a.toLowerCase()].min;
      this.controls['max' + a] = PLACE[a.toLowerCase()].max;
    }
    this.controls.addEventListener('objectChange', () => {
      onMove(this.controls.object, { mode: this.controls.mode, axis: this.controls.axis });
    });
    // Not 'change': it comes with every camera `see` hands over, a frame each.
    for (const what of ['axis', 'dragging', 'mode']) this.controls.addEventListener(what + '-changed', () => onChange());
  }

  /**
   * Its app unmounted: the gizmo's geometries and materials let go of. Not
   * three's own `dispose`, which disconnects from an element — there is none
   * here, and it would throw.
   */
  dispose() {
    this.controls.detach();
    this.controls.getHelper().dispose();
  }

  /** On a mesh — the chosen shape's — or on none. */
  attach(mesh) {
    if (mesh) this.controls.attach(mesh);
    else if (this.controls.object) this.controls.detach();
  }

  /** The camera the picture is drawn with: the handles face it, and a pointer is measured through it. */
  see(camera) { this.controls.camera = camera; }

  /** On a shape, and so drawn. */
  get shown() { return this.controls.object !== undefined; }

  /** A handle under the pointer, or held. */
  get lit() { return this.controls.axis !== null; }

  /** A handle held: a press took it, and has not let go. */
  get held() { return this.controls.dragging; }

  /** `translate`, `rotate` or `scale` (MODES). */
  get mode() { return this.controls.mode; }
  set mode(mode) { this.controls.mode = mode; }

  /** The pointer over the picture: the handle under it lights. */
  hover([x, y]) { this.controls.pointerHover({ x, y, button: -1 }); }

  /** The pointer gone from the picture: nothing lit, unless a handle is held. */
  leave() { if (!this.held) this.controls.axis = null; }

  /** A press with the main button: true when it took hold of a handle. */
  press([x, y]) {
    // A mesh the model let go of since the last picture is held by nothing.
    if (!this.shown || !this.controls.object.parent) return false;
    const pointer = { x, y, button: 0 };
    this.controls.pointerHover(pointer);
    this.controls.pointerDown(pointer);
    return this.held;
  }

  /** The held handle dragged to a point. */
  drag([x, y]) { this.controls.pointerMove({ x, y, button: -1 }); }

  /** Let go. */
  release() { this.controls.pointerUp(null); }
}
