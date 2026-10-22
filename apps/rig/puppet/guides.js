/**
 * guides.js — the puppet's guides, over it while it is set up, as the rig's
 * are over a drawing: the bones, drawn by the rig's own code (../guides.js),
 * moving as the head moves them; a dashed ring where each eye and the mouth
 * go, as large as they are worn; and beside them, what the camera sees, as
 * the page shows it, the boxes cut from it ringed — so *around the eye* and
 * *around the mouth* can be set by looking. B shows them; never in anything
 * saved, and never in OBS unless asked there.
 */

import { drawBones } from '../guides.js';

const RING = '#ffd60a', INK = '#111111';

/** A dashed ellipse, ink under yellow, so it reads on any colour. */
function ring(ctx, x, y, w, h, turn, dpp) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, 2 * Math.PI);
  ctx.setLineDash([5 * dpp, 4 * dpp]);
  ctx.lineWidth = 4 * dpp;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 2 * dpp;
  ctx.strokeStyle = RING;
  ctx.stroke();
  ctx.restore();
}

/** A stroke's number, in its colour, as the Parts drawer names it. */
function badge(ctx, x, y, text, hue, dpp) {
  const r = 9 * dpp;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = hue;
  ctx.fill();
  ctx.lineWidth = 2 * dpp;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(11 * dpp)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5 * dpp);
}

/**
 * The bones, each stroke's number, and where what is worn goes, over the
 * drawn puppet.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} o
 * @param {object[]} o.bones                at rest
 * @param {?Array<{x, y, a}>} o.at          posed (wear.js `bonesAt`) — null while it crawls: no bones then
 * @param {Array<{x, y, turn, width, height}>} o.spots   where each eye and the mouth go, cut or not
 * @param {Array<{x, y, text, hue}>} [o.labels]           each stroke's number, at its middle
 * @param {number} o.view
 * @param {{x, y}} o.room
 * @param {number} o.dpp                    canvas pixels per CSS pixel
 */
export function drawGuides(ctx, { bones, at, spots, labels = [], view, room, dpp }) {
  if (at) drawBones(ctx, bones, at, view, room, dpp);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const s of spots) ring(ctx, (s.x - room.x) * view, (s.y - room.y) * view, s.width * view, s.height * view, s.turn, dpp);
  for (const l of labels) badge(ctx, (l.x - room.x) * view, (l.y - room.y) * view, l.text, l.hue, dpp);
  ctx.restore();
}

/**
 * What the camera sees, as the page shows it — mirrored or not — with the
 * boxes cut from it ringed: the eyes', the mouth's.
 *
 * @param {HTMLCanvasElement} canvas   the little view, sized here to the camera's shape
 * @param {HTMLVideoElement} video
 * @param {Array<{x, y, size, aspect?, angle}>} boxes   in the camera's own pixels, unmirrored
 * @param {boolean} mirror
 */
export function drawCamera(canvas, video, boxes, mirror) {
  const W = video.videoWidth, H = video.videoHeight;
  if (!W || !H) return;
  const dpr = window.devicePixelRatio || 1, w = Math.round(canvas.clientWidth * dpr), h = Math.round((w * H) / W);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d'), k = w / W;
  ctx.setTransform(mirror ? -k : k, 0, 0, k, mirror ? w : 0, 0);
  ctx.drawImage(video, 0, 0);
  for (const b of boxes) {
    if (b) ring(ctx, b.x, b.y, b.size, b.size * (b.aspect || 1), b.angle, dpr / k);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
