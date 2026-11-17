/**
 * svg-canvas.js — a picture drawn as vectors: a context that takes the calls
 * a Canvas 2D drawing makes and writes them down as SVG (G11, for BEC 2027 —
 * the author, 2026-11-17: "un export svg pour l'app de particules et de 3d …
 * comme on utilise que des points colorés … un pipeline d'export pour des
 * rendus qui seraient compatibles").
 *
 * An app's drawing path stays its one path: handed this in place of a
 * canvas's context, it draws as it always does, and what it drew is read back
 * as elements — a whole disc a `<circle>`, a rectangle a `<rect>`, any other
 * path a `<path>`, a picture an `<image>` kept once in `<defs>` and placed by
 * `<use>` however often it is drawn. So particles' dots leave as circles
 * where its PNG has them, drawn by draw.js; the 3D app's clouds, whose dots
 * it projects itself (apps/3d/vectors.js), through this same writer. What is
 * drawn wholly off the picture is not written.
 *
 * SVG 1.1 as the print tools read it — Illustrator, Inkscape, Affinity: a
 * colour `#rrggbb` and its opacity apart, never rgba(); `xlink:href`; a blend
 * CSS's `mix-blend-mode`, which browsers and Inkscape draw. With a paper
 * (`paperOf`, a format's millimetres) the SVG is that wide, its bleed in it;
 * else its pixels.
 *
 * What a vector cannot hold is said, never drawn wrong without a word: a clear
 * of part of the picture, a filter, a blend SVG has no name for — each in
 * `left`. What it has no way to draw — text, gradients, pixels read or put —
 * throws, naming it.
 *
 *   const ctx = svgCanvas(w, h, { mm: paperOf(format, width, height, bleed), title });
 *   draw(ctx);                                              // as onto a canvas's
 *   const { text, dots, shapes, pictures, outside, left } = ctx.svg();
 *
 * Pure but for a picture's bytes, which a page's canvas encodes
 * (`imageUrl`): Node runs the rest (tests/svg-canvas.mjs).
 */

import { byId } from './formats.js';

const TAU = Math.PI * 2;

/** A coordinate as written: to a hundredth of a pixel. A matrix's turn and scale keep six places. */
const num = x => { const r = Math.round(x * 100) / 100; return Object.is(r, -0) ? '0' : String(r); };
const fine = x => { const r = +x.toFixed(6); return Object.is(r, -0) ? '0' : String(r); };
const esc = s => String(s).replace(/[<>&"]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[ch]);

/**
 * A format's paper round a picture of `width` × `height` of its pixels and `bleed` more on every side, in mm —
 * core/formats.js `dpiOf`'s reading of it — or null, a format of pixels.
 *
 * @returns {?[number, number]}
 */
export function paperOf(format, width, height, bleed = 0) {
  const f = typeof format === 'string' ? byId(format) : format;
  if (!f || !f.mm || !(width > 0 && height > 0)) return null;
  const b = Math.max(0, bleed || 0);
  return [f.mm[0] * (width + 2 * b) / width, f.mm[1] * (height + 2 * b) / height];
}

/**
 * A CSS colour as SVG 1.1 has one: `#rrggbb`, and its opacity apart. A name passes as it is — SVG knows CSS's.
 *
 * @returns {{hex: string, alpha: number}}
 */
export function paintOf(style) {
  if (typeof style !== 'string') throw new Error('an SVG is not painted with a gradient or a pattern yet (core/svg-canvas.js)');
  const s = style.trim().toLowerCase();
  let m;
  if ((m = s.match(/^#([0-9a-f]{3,4})$/))) {
    const h = m[1];
    return { hex: '#' + [...h.slice(0, 3)].map(c => c + c).join(''), alpha: h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1 };
  }
  if ((m = s.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/))) return { hex: '#' + m[1], alpha: m[2] ? parseInt(m[2], 16) / 255 : 1 };
  if ((m = s.match(/^rgba?\(([^)]*)\)$/))) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    const channel = v => Math.max(0, Math.min(255, Math.round(v.endsWith('%') ? parseFloat(v) * 2.55 : parseFloat(v))));
    const a = p[3] == null ? 1 : p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
    return { hex: '#' + p.slice(0, 3).map(v => channel(v).toString(16).padStart(2, '0')).join(''), alpha: Math.max(0, Math.min(1, a)) };
  }
  if (s === 'transparent') return { hex: '#000000', alpha: 0 };
  return { hex: s, alpha: 1 };
}

/** Canvas's compositing as CSS's blend: `source-over` none; one SVG has no name for, undefined. */
const BLENDS = new Set(['multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light',
  'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity']);
const blendOf = op => (!op || op === 'source-over' ? null : op === 'lighter' ? 'plus-lighter' : BLENDS.has(op) ? op : undefined);

// A transform as setTransform takes it, [a b c d e f]: x' = a x + c y + e, y' = b x + d y + f.
const apply = (t, x, y) => [t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5]];
const times = (t, u) => [t[0] * u[0] + t[2] * u[1], t[1] * u[0] + t[3] * u[1], t[0] * u[2] + t[2] * u[3],
  t[1] * u[2] + t[3] * u[3], t[0] * u[4] + t[2] * u[5] + t[4], t[1] * u[4] + t[3] * u[5] + t[5]];
/** Its scale when it keeps a circle round — moved, turned, scaled alike both ways, mirrored — else null. */
const roundScale = t => {
  const s = Math.hypot(t[0], t[1]), tol = 1e-6 * s;
  const keeps = (Math.abs(t[0] - t[3]) <= tol && Math.abs(t[1] + t[2]) <= tol) || (Math.abs(t[0] + t[3]) <= tol && Math.abs(t[1] - t[2]) <= tol);
  return keeps && s > 0 ? s : null;
};

/** The turn an arc makes, as canvas's `arc` reads its two angles and its way round. */
function sweepOf(a0, a1, ccw) {
  if (!ccw && a1 - a0 >= TAU) return TAU;
  if (ccw && a0 - a1 >= TAU) return -TAU;
  const s = (((a1 - a0) % TAU) + TAU) % TAU;
  return ccw ? (s === 0 ? 0 : s - TAU) : s;
}

/** A picture's bytes as a data URL, through a page's canvas — cut to `crop` when it is a part of it. */
function pictureUrl(image, crop) {
  if (!crop && typeof image.toDataURL === 'function') return image.toDataURL('image/png');
  const [sx, sy, sw, sh] = crop || [0, 0, image.naturalWidth || image.width, image.naturalHeight || image.height];
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw));
  c.height = Math.max(1, Math.round(sh));
  c.getContext('2d').drawImage(image, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

/** What a context's `save` keeps beside its transform. */
const KEPT = ['globalAlpha', 'globalCompositeOperation', 'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin',
  'miterLimit', 'imageSmoothingEnabled', 'imageSmoothingQuality', 'filter'];
/** What it has no way to draw as vectors, yet: called, they throw. */
const NOT_YET = ['fillText', 'strokeText', 'measureText', 'createLinearGradient', 'createRadialGradient', 'createConicGradient',
  'createPattern', 'getImageData', 'putImageData', 'createImageData', 'clip', 'arcTo', 'roundRect', 'isPointInPath'];

/**
 * @param {number} width              the picture's pixels: the SVG's viewBox
 * @param {number} height
 * @param {object} [o]
 * @param {?[number, number]} [o.mm]  its paper (`paperOf`), or its pixels
 * @param {string} [o.title]
 * @param {(image, crop: ?number[]) => string} [o.imageUrl]   a picture's bytes as a URL — a page's canvas's by default
 * @returns {object}   a context as Canvas 2D's, for what a drawing of discs, shapes and pictures calls; `svg()` what it drew
 */
export function svgCanvas(width, height, { mm = null, title = '', imageUrl = pictureUrl } = {}) {
  const body = [], defs = [], left = new Set(), images = new Map(), stack = [];
  const count = { dots: 0, shapes: 0, pictures: 0, outside: 0 };
  let t = [1, 0, 0, 1, 0, 0], dash = [];
  let d = [], pen = null, start = null, lone = null;     // the path, in the picture's pixels; its pen; one whole circle and nothing else

  const ctx = {
    canvas: { width, height },
    globalAlpha: 1, globalCompositeOperation: 'source-over', fillStyle: '#000000', strokeStyle: '#000000',
    lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, imageSmoothingEnabled: true, imageSmoothingQuality: 'low',
    filter: 'none',

    save() { stack.push([t, dash, ...KEPT.map(k => ctx[k])]); },
    restore() {
      const s = stack.pop();
      if (!s) return;
      [t, dash] = s;
      KEPT.forEach((k, i) => { ctx[k] = s[i + 2]; });
    },
    setTransform(a = 1, b = 0, c = 0, e = 1, f = 0, g = 0) {
      t = typeof a === 'object' ? [a.a, a.b, a.c, a.d, a.e, a.f] : [a, b, c, e, f, g];
    },
    resetTransform() { t = [1, 0, 0, 1, 0, 0]; },
    getTransform() { return typeof DOMMatrix === 'function' ? new DOMMatrix(t) : { a: t[0], b: t[1], c: t[2], d: t[3], e: t[4], f: t[5] }; },
    transform(a, b, c, e, f, g) { t = times(t, [a, b, c, e, f, g]); },
    translate(x, y) { t = times(t, [1, 0, 0, 1, x, y]); },
    rotate(a) { t = times(t, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); },
    scale(x, y) { t = times(t, [x, 0, 0, y, 0, 0]); },
    setLineDash(list) { dash = [...list]; },
    getLineDash() { return [...dash]; },

    beginPath() { d = []; pen = start = lone = null; },
    moveTo(x, y) { lone = null; pen = start = apply(t, x, y); d.push(`M${num(pen[0])} ${num(pen[1])}`); },
    lineTo(x, y) { lone = null; line(apply(t, x, y)); },
    closePath() { if (pen) { d.push('Z'); pen = start; } },
    rect(x, y, w, h) { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); },
    bezierCurveTo(x1, y1, x2, y2, x, y) {
      lone = null;
      if (!pen) ctx.moveTo(x1, y1);
      curve(apply(t, x1, y1), apply(t, x2, y2), apply(t, x, y));
    },
    quadraticCurveTo(qx, qy, x, y) {
      lone = null;
      if (!pen) ctx.moveTo(qx, qy);
      const q = apply(t, qx, qy), e = apply(t, x, y);
      curve([pen[0] + (2 / 3) * (q[0] - pen[0]), pen[1] + (2 / 3) * (q[1] - pen[1])], [e[0] + (2 / 3) * (q[0] - e[0]), e[1] + (2 / 3) * (q[1] - e[1])], e);
    },
    arc(x, y, r, a0, a1, ccw = false) { arcIn(t, x, y, r, a0, a1, ccw); },
    ellipse(x, y, rx, ry, turn, a0, a1, ccw = false) {
      const c = Math.cos(turn), s = Math.sin(turn);
      arcIn(rx === ry ? times(t, [c, s, -s, c, x, y]) : times(t, [c * rx, s * rx, -s * ry, c * ry, x, y]), 0, 0, rx === ry ? rx : 1, a0, a1, ccw);
    },

    fill(rule) {
      if (typeof rule === 'object') throw new Error('an SVG is not drawn from a Path2D yet (core/svg-canvas.js)');
      const paint = d.length && fillOf();
      if (!paint) return;
      if (lone) circle(lone, paint);
      else shape(`<path d="${d.join('')}" ${paint}${rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}`);
    },
    stroke() {
      const paint = d.length && strokeOf(scaleOf());
      if (!paint) return;
      if (lone) circle(lone, paint);
      else shape(`<path d="${d.join('')}" ${paint}`);
    },
    fillRect(x, y, w, h) { box(x, y, w, h, 'fill'); },
    strokeRect(x, y, w, h) { box(x, y, w, h, 'stroke'); },
    /** The whole picture cleared: nothing drawn before is kept. Part of it cannot be cut out of what is drawn: said. */
    clearRect(x, y, w, h) {
      const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => apply(t, px, py));
      const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
      if (Math.min(...xs) <= 0.5 && Math.min(...ys) <= 0.5 && Math.max(...xs) >= width - 0.5 && Math.max(...ys) >= height - 0.5) {
        body.length = 0;
        Object.assign(count, { dots: 0, shapes: 0, pictures: 0, outside: 0 });
      } else left.add('a clear of part of the picture');
    },

    drawImage(image, ...a) {
      const iw = image.naturalWidth || image.videoWidth || image.width, ih = image.naturalHeight || image.videoHeight || image.height;
      const crop = a.length >= 8 ? a.slice(0, 4) : null;
      const [dx, dy, dw = iw, dh = ih] = crop ? a.slice(4, 8) : a;
      const sw = crop ? crop[2] : iw, sh = crop ? crop[3] : ih;
      if (!(sw > 0 && sh > 0 && dw && dh) || !(ctx.globalAlpha > 0)) return;
      const m = times(t, [dw / sw, 0, 0, dh / sh, dx, dy]);
      const id = pictureOf(image, crop, sw, sh);
      body.push(`<use xlink:href="#${id}" transform="matrix(${m.slice(0, 4).map(fine).join(' ')} ${num(m[4])} ${num(m[5])})"`
        + `${opacity('opacity', ctx.globalAlpha)}${ctx.imageSmoothingEnabled ? '' : ' style="image-rendering:pixelated"'}${look()}/>`);
      count.pictures++;
    },

    /** What was drawn, as an SVG file's text, and what it holds. */
    svg() {
      const size = mm ? `width="${num(mm[0])}mm" height="${num(mm[1])}mm"` : `width="${num(width)}" height="${num(height)}"`;
      const text = ['<?xml version="1.0" encoding="UTF-8"?>',
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" ${size} viewBox="0 0 ${num(width)} ${num(height)}">`,
        ...(title ? [`<title>${esc(title)}</title>`] : []),
        ...(defs.length ? ['<defs>', ...defs, '</defs>'] : []),
        ...body, '</svg>', ''].join('\n');
      return { text, ...count, left: [...left] };
    },
  };
  for (const name of NOT_YET) ctx[name] = () => { throw new Error(`an SVG is not drawn with ${name}() yet (core/svg-canvas.js)`); };

  /** ` name="a"` when it is not whole. */
  function opacity(name, a) { return a < 1 ? ` ${name}="${fine(Math.min(1, a))}"` : ''; }
  /** How much the transform scales a length: a line's width, a dash. */
  function scaleOf() { return Math.sqrt(Math.abs(t[0] * t[3] - t[1] * t[2])); }
  /** The fill's paint, or null when nothing would show. */
  function fillOf() {
    const p = paintOf(ctx.fillStyle), a = p.alpha * ctx.globalAlpha;
    return a > 0 ? `fill="${p.hex}"${opacity('fill-opacity', a)}` : null;
  }
  /** The stroke's paint at scale `k`, or null when nothing would show. */
  function strokeOf(k) {
    const p = paintOf(ctx.strokeStyle), a = p.alpha * ctx.globalAlpha;
    if (a <= 0 || !(ctx.lineWidth > 0)) return null;
    return `fill="none" stroke="${p.hex}"${opacity('stroke-opacity', a)} stroke-width="${num(ctx.lineWidth * k)}"`
      + (ctx.lineCap !== 'butt' ? ` stroke-linecap="${ctx.lineCap}"` : '') + (ctx.lineJoin !== 'miter' ? ` stroke-linejoin="${ctx.lineJoin}"` : '')
      + (dash.length ? ` stroke-dasharray="${dash.map(v => num(v * k)).join(' ')}"` : '');
  }
  /** Its blend, and what SVG has no word for, said. */
  function look() {
    if (ctx.filter && ctx.filter !== 'none') left.add(`a filter (${ctx.filter})`);
    const blend = blendOf(ctx.globalCompositeOperation);
    if (blend === undefined) left.add(`the blend ${ctx.globalCompositeOperation}`);
    return blend ? ` style="mix-blend-mode:${blend}"` : '';
  }
  function line(p) {
    if (!pen) start = p;
    d.push(`${pen ? 'L' : 'M'}${num(p[0])} ${num(p[1])}`);
    pen = p;
  }
  function curve(c1, c2, e) {
    d.push(`C${[...c1, ...c2, ...e].map(num).join(' ')}`);
    pen = e;
  }
  /** An arc in the space `T` takes it to, as Béziers of a quarter turn at most — a whole one alone, a circle. */
  function arcIn(T, cx, cy, r, a0, a1, ccw) {
    const sweep = sweepOf(a0, a1, ccw), first = !d.length, k = roundScale(T);
    line(apply(T, cx + r * Math.cos(a0), cy + r * Math.sin(a0)));
    const n = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
    for (let i = 0; i < n && sweep; i++) {
      const p = a0 + (sweep * i) / n, q = a0 + (sweep * (i + 1)) / n, h = (4 / 3) * Math.tan((q - p) / 4);
      const P = [cx + r * Math.cos(p), cy + r * Math.sin(p)], Q = [cx + r * Math.cos(q), cy + r * Math.sin(q)];
      curve(apply(T, P[0] - h * r * Math.sin(p), P[1] + h * r * Math.cos(p)), apply(T, Q[0] + h * r * Math.sin(q), Q[1] - h * r * Math.cos(q)), apply(T, ...Q));
    }
    lone = first && Math.abs(sweep) >= TAU - 1e-9 && k ? { c: apply(T, cx, cy), r: Math.abs(r) * k } : null;
  }
  function circle({ c: [x, y], r }, paint) {
    if (x + r < 0 || y + r < 0 || x - r > width || y - r > height) { count.outside++; return; }
    body.push(`<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" ${paint}${look()}/>`);
    count.dots++;
  }
  function shape(open) { body.push(`${open}${look()}/>`); count.shapes++; }
  /** A rectangle filled or stroked: a `<rect>` while the transform keeps it square to the page, else a path. */
  function box(x, y, w, h, how) {
    const was = [d, pen, start, lone];
    d = []; pen = start = lone = null;
    if (t[1] === 0 && t[2] === 0) {
      const paint = how === 'fill' ? fillOf() : strokeOf(scaleOf());
      const [x0, y0] = apply(t, x, y), [x1, y1] = apply(t, x + w, y + h);
      if (paint) shape(`<rect x="${num(Math.min(x0, x1))}" y="${num(Math.min(y0, y1))}" width="${num(Math.abs(x1 - x0))}" height="${num(Math.abs(y1 - y0))}" ${paint}`);
    } else {
      ctx.rect(x, y, w, h);
      ctx[how]();
    }
    [d, pen, start, lone] = was;
  }
  /** A picture kept once in `<defs>`, as it is or cut: its id. */
  function pictureOf(image, crop, sw, sh) {
    let cuts = images.get(image);
    if (!cuts) images.set(image, cuts = new Map());
    const key = crop ? crop.join(',') : '';
    let id = cuts.get(key);
    if (!id) {
      id = `picture${defs.length + 1}`;
      cuts.set(key, id);
      defs.push(`<image id="${id}" width="${num(sw)}" height="${num(sh)}" preserveAspectRatio="none" xlink:href="${imageUrl(image, crop)}"/>`);
    }
    return id;
  }
  return ctx;
}
