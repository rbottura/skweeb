/**
 * place.js — where a placement sits on a page (docs/smart-objects.md,
 * *Placement*: `transform`).
 *
 * A transform is in page pixels, before the page's scale. `x` and `y` put the
 * object's centre that far from the page's centre, `scale` multiplies the
 * object's own size, and `rot` turns it about its centre, in degrees,
 * clockwise. Centre and not corner, so that scaling or turning an object
 * leaves it where it is, and what was centred on a page stays centred when
 * the page changes size. A bleed grows the canvas round the sheet and moves
 * nothing: the centre is the sheet's.
 *
 * Moved out of compose's page.js on 2026-10-06, when the live stack needed it
 * in every window (core/stackView.js); compose's page.js hands it on.
 */

/** The canvas a page needs, in page pixels: the sheet, and its bleed on every side. */
export function pageSize(page) {
  const bleed = Math.max(0, Math.round(page.bleed || 0));
  return { width: page.width + bleed * 2, height: page.height + bleed * 2, bleed };
}

/**
 * Where an object's own pixels land on the page: a 2D matrix, canvas's
 * `[a, b, c, d, e, f]`.
 *
 * @param {{x, y, scale, rot}} transform
 * @param {{width, height}} size     the object's own size
 * @param {object} page              `{ width, height, bleed? }`
 */
export function placementMatrix(transform, size, page) {
  const { width, height } = pageSize(page);
  const turn = ((transform.rot || 0) * Math.PI) / 180;
  const cos = Math.cos(turn) * transform.scale;
  const sin = Math.sin(turn) * transform.scale;
  const ox = -size.width / 2;
  const oy = -size.height / 2;
  return [
    cos, sin, -sin, cos,
    width / 2 + transform.x + cos * ox - sin * oy,
    height / 2 + transform.y + sin * ox + cos * oy,
  ];
}

/** Where a point of the object lands on the page. */
export function onPage(matrix, [x, y]) {
  const [a, b, c, d, e, f] = matrix;
  return [a * x + c * y + e, b * x + d * y + f];
}

/** Where a point of the page falls in the object's own pixels: `onPage`, undone. */
export function offPage([a, b, c, d, e, f], [x, y]) {
  const det = a * d - b * c;
  if (!det) return [NaN, NaN];
  const u = x - e, v = y - f;
  return [(d * u - c * v) / det, (a * v - b * u) / det];
}

/** Two matrices as one: `m` after `n` — a point through `n`, then through `m`. */
export function multiply([a, b, c, d, e, f], [a2, b2, c2, d2, e2, f2]) {
  return [a * a2 + c * b2, b * a2 + d * b2, a * c2 + c * d2, b * c2 + d * d2, a * e2 + c * f2 + e, b * e2 + d * f2 + f];
}

/** A matrix undone. */
export function invert([a, b, c, d, e, f]) {
  const det = a * d - b * c;
  if (!det) return [1, 0, 0, 1, 0, 0];
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}
