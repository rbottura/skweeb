/**
 * bend.js — the tangent laid on the planet's curve (M16c, docs/worm.md): a
 * point of a walker's frame — ahead of where it stands, up, to its right,
 * on the ground's tangent plane — taken to the sphere, as far round it as
 * it was along the tangent, as high over it as it was over the tangent. So
 * a long worm lies along a small planet, its ends no longer lifted off it,
 * and the ground raised over a buried one lies on the ground (dune.js).
 *
 * The frame's axes are ahead, up, right: its origin on the ground where the
 * walker stands, the planet's middle `radius` under it.
 *
 * Pure: Node runs it (tests/3d-dune.mjs).
 */

/** Point (f, u, r) — ahead, up, right — laid on a sphere of `radius`: into `out`, in the same frame. */
export function bendPoint(f, u, r, radius, out) {
  const d = Math.hypot(f, r);
  if (!(radius < Infinity) || d < 1e-12) { out[0] = f; out[1] = u; out[2] = r; return out; }
  const turn = d / radius, k = ((radius + u) * Math.sin(turn)) / d;
  out[0] = f * k;
  out[1] = (radius + u) * Math.cos(turn) - radius;
  out[2] = r * k;
  return out;
}

/**
 * Direction `n` — ahead, up, right — at the point (f, ·, r) turned as the ground turns there, laid on the sphere:
 * into `out`. Its length kept; the curve's stretch over a thin body let go of.
 */
export function bendNormal(f, r, radius, n, out) {
  const d = Math.hypot(f, r);
  if (!(radius < Infinity) || d < 1e-12) { out[0] = n[0]; out[1] = n[1]; out[2] = n[2]; return out; }
  const turn = d / radius, c = Math.cos(turn), s = Math.sin(turn), af = f / d, ar = r / d;
  const up = n[1], away = n[0] * af + n[2] * ar, across = n[2] * af - n[0] * ar;
  out[0] = up * s * af + away * c * af - across * ar;
  out[1] = up * c - away * s;
  out[2] = up * s * ar + away * c * ar + across * af;
  return out;
}
