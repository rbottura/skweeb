/**
 * preview.js — what the preview adds to a page, and how large it draws it.
 *
 * None of it is ever in a render: the trim line inside the bleed, the chosen
 * placement's outline and the paint rate in the bar. How large the page is
 * drawn — at the size the viewer shows it — is core/view.js's.
 */

import { placementMatrix, onPage } from './page.js';

/** Where the sheet ends inside its bleed. */
export function trimLine(ctx, size, view) {
  if (!size.bleed) return;
  ctx.save();
  ctx.strokeStyle = '#111111';
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(Math.round(size.bleed * view) + 0.5, Math.round(size.bleed * view) + 0.5,
                 Math.round((size.width - size.bleed * 2) * view), Math.round((size.height - size.bleed * 2) * view));
  ctx.restore();
}

/**
 * The chosen placement's frame: which one the panel edits. A light line
 * under a dashed dark one, so it reads on any ground.
 *
 * @param {?object} entry   the chosen placement (placements.js)
 * @param {object} page     the page's values
 */
export function outline(ctx, entry, page, view) {
  if (!entry || !entry.size) return;
  const { width: w, height: h } = entry.size;
  const m = placementMatrix(entry.block.transform, entry.size, page);
  ctx.save();
  ctx.beginPath();
  [[0, 0], [w, 0], [w, h], [0, h]].forEach((corner, i) => {
    const [x, y] = onPage(m, corner);
    if (i) ctx.lineTo(x * view, y * view);
    else ctx.moveTo(x * view, y * view);
  });
  ctx.closePath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fffdf6';
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#111111';
  ctx.stroke();
  ctx.restore();
}

/**
 * The paint rate, measured: pages painted in the last second while playing,
 * given to the bar — so a slow page is a number on the machine that has it.
 */
export class PaintRate {
  constructor(bar) { this.bar = bar; this.span = null; }

  /** One page painted, while playing. */
  count() {
    const now = performance.now();
    if (!this.span) this.span = { since: now, n: 0 };
    this.span.n++;
    const took = now - this.span.since;
    if (took >= 1000) {
      this.bar.rate((this.span.n * 1000) / took);
      this.span = { since: now, n: 0 };
    }
  }

  /** Stopped: no rate to show. */
  stop() { this.span = null; this.bar.rate(null); }
}
