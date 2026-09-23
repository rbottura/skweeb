/**
 * tests/frame.mjs — run with: node tests/frame.mjs
 *
 * Covers core/formats.js, core/frame.js and core/trim.js: the geometry of what
 * rectangle an object occupies. All three are pure on purpose — no canvas, no
 * DOM — which is what lets the awkward cases be written down here instead of
 * being found later in a render that is subtly off-centre.
 */

const Formats = await import('../core/formats.js');
const Frame   = await import('../core/frame.js');
const Trim    = await import('../core/trim.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(52), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};
const near = (label, got, want, slop = 0.5) => {
  const pass = Math.abs(got - want) <= slop;
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(52), got.toFixed(1),
    pass ? '' : '  expected ~' + want);
};

// -- formats -----------------------------------------------------------------

ok('every format yields a ratio',
   Formats.FORMATS.every(f => Formats.ratioOf(f) !== null), true);
ok('ids are unique',
   new Set(Formats.ids()).size, Formats.FORMATS.length);
ok('a px format is its own ratio', Formats.ratioOf('ig-portrait'), [1080, 1350]);
ok('an mm format is too', Formats.ratioOf('a3'), [297, 420]);
ok('a ratio format has no exact size', Formats.pixelsOf('4-5'), null);
ok('unknown ids do not throw', Formats.ratioOf('nope'), null);

// A3 at 300dpi is the number a print shop asks for.
ok('A3 at 300dpi', Formats.pixelsAtDpi('a3', 300), [3508, 4961]);
near('and back again', Formats.dpiOf('a3', 3508, 4961).min, 300);
ok('dpi does not apply to a screen format', Formats.dpiOf('16-9', 1920, 1080), null);

// Both axes are reported, because a drifted canvas has two answers.
{
  const d = Formats.dpiOf('a4', 2480, 1754);   // A4 width at 300, height far short
  near('a squashed canvas reports its worst axis', d.min, 150, 1);
}

// -- resolveFrame ------------------------------------------------------------

const source = { width: 1920, height: 945 };
const content = { x: 540, y: 78, w: 996, h: 822 };

{
  const f = Frame.resolveFrame({ format: 'content', bleed: 0, zoom: 1 }, content, source);
  ok('content: the canvas is the ink', [f.width, f.height], [996, 822]);
  ok('and the ink fills it', f.to, { x: 0, y: 0, w: 996, h: 822 });
  ok('read from where the ink is', f.from, content);
}

{
  const f = Frame.resolveFrame({ format: 'content', bleed: 40, zoom: 1 }, content, source);
  ok('bleed grows the canvas on all four sides', [f.width, f.height], [1076, 902]);
  ok('and centres the ink in it', [f.to.x, f.to.y], [40, 40]);
}

{
  const f = Frame.resolveFrame({ format: 'source', bleed: 0, zoom: 1 }, content, source);
  ok('source: the canvas is the whole drawing surface',
     [f.width, f.height], [1920, 945]);
  ok('the ink keeps its size, centred', [f.to.w, f.to.h], [996, 822]);
}

{
  const f = Frame.resolveFrame({ format: 'custom', width: 1200, height: 1200, bleed: 0, zoom: 1 },
                               content, source);
  ok('a fixed canvas is exactly that', [f.width, f.height], [1200, 1200]);
  ok('content sits at 1:1, centred', f.to, { x: 102, y: 189, w: 996, h: 822 });
}

// The rule the whole design rests on: content is never fitted, so a canvas
// smaller than its content crops it and says so with a negative offset.
{
  const f = Frame.resolveFrame({ format: 'custom', width: 400, height: 400, bleed: 0, zoom: 1 },
                               content, source);
  ok('a small canvas crops rather than shrinking', [f.to.w, f.to.h], [996, 822]);
  ok('overflow shows as a negative offset', [f.to.x, f.to.y], [-298, -211]);
}

{
  const f = Frame.resolveFrame({ format: 'custom', width: 1200, height: 1200, bleed: 0, zoom: 0.5 },
                               content, source);
  ok('zoom scales the content, not the canvas',
     [f.width, f.height, f.to.w, f.to.h], [1200, 1200, 498, 411]);
  ok('and it stays centred', [f.to.x, f.to.y], [351, 395]);
}

{
  const f = Frame.resolveFrame({ format: 'custom', width: 1080, height: 1350, bleed: 0, zoom: 1 },
                               null, source);
  ok('no content rect falls back to the whole source', f.from,
     { x: 0, y: 0, w: 1920, h: 945 });
}

// -- the chain ---------------------------------------------------------------
//
// A stand-in for Params with the two methods applyFrameEdit uses. The real one
// is covered by tests/params.mjs; what matters here is the arithmetic.

const fakeParams = init => {
  const v = { ...init };
  return {
    get: k => v[k],
    set(keyOrValues, maybe) {
      const incoming = typeof keyOrValues === 'string' ? { [keyOrValues]: maybe } : keyOrValues;
      let n = 0;
      for (const [k, val] of Object.entries(incoming)) {
        if (v[k] === val) continue;
        v[k] = val;
        n++;
      }
      return n;
    },
    all: () => v,
  };
};

{
  const p = fakeParams({ format: '1-1', width: 1200, height: 800, link: true, bleed: 0, zoom: 1 });
  Frame.applyFrameEdit(p, 'format', content);
  ok('picking a square grows the short side', [p.get('width'), p.get('height')], [1200, 1200]);
}

{
  const p = fakeParams({ format: '4-5', width: 1200, height: 800, link: true, bleed: 0, zoom: 1 });
  Frame.applyFrameEdit(p, 'format', content);
  ok('4:5 over a wide box grows the height', [p.get('width'), p.get('height')], [1200, 1500]);
}

{
  const p = fakeParams({ format: '16-9', width: 800, height: 1200, link: true, bleed: 0, zoom: 1 });
  Frame.applyFrameEdit(p, 'format', content);
  ok('16:9 over a tall box grows the width', [p.get('width'), p.get('height')], [2133, 1200]);
  ok('a format change never shrinks', p.get('height') >= 1200, true);
}

{
  const p = fakeParams({ format: '1-1', width: 500, height: 500, link: true, bleed: 0, zoom: 1 });
  Frame.applyFrameEdit(p, 'format', content);
  ok('an exact format ignores the box it replaces',
     [p.get('width'), p.get('height')], [500, 500]);
  p.set('format', 'ig-portrait');
  Frame.applyFrameEdit(p, 'format', content);
  ok('1080x1350 is 1080x1350', [p.get('width'), p.get('height')], [1080, 1350]);
}

{
  const p = fakeParams({ format: 'content', width: 100, height: 100, link: true, bleed: 20, zoom: 1 });
  Frame.applyFrameEdit(p, 'format', content);
  ok('content format writes the ink size plus bleed',
     [p.get('width'), p.get('height')], [1036, 862]);
}

{
  const p = fakeParams({ format: '1-1', width: 1000, height: 1000, link: true, bleed: 0, zoom: 1 });
  Frame.applyFrameEdit(p, 'width', content);
  ok('typing a width leaves the presets', p.get('format'), 'custom');
  ok('linked, the height holds the old ratio', p.get('height'), 1000);
}

{
  const p = fakeParams({ format: '16-9', width: 1600, height: 900, link: true, bleed: 0, zoom: 1 });
  p.set('width', 800);
  Frame.applyFrameEdit(p, 'width', content);
  ok('the chain follows the format that was in force', p.get('height'), 450);
}

{
  const p = fakeParams({ format: '16-9', width: 1600, height: 900, link: false, bleed: 0, zoom: 1 });
  p.set('width', 800);
  Frame.applyFrameEdit(p, 'width', content);
  ok('unlinked, the other dimension stays put', p.get('height'), 900);
  ok('but it is still custom now', p.get('format'), 'custom');
}

// -- trim --------------------------------------------------------------------

/** A w*h RGBA buffer with one opaque rect painted into it. */
const canvasWith = (w, h, rect, alpha = 255) => {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const p = (y * w + x) * 4;
      px[p] = 20; px[p + 1] = 30; px[p + 2] = 40; px[p + 3] = alpha;
    }
  }
  return px;
};

{
  const px = canvasWith(40, 30, { x: 5, y: 6, w: 10, h: 8 });
  ok('alphaBounds finds the ink', Trim.alphaBounds(px, 40, 30),
     { x: 5, y: 6, w: 10, h: 8 });
}

ok('an empty canvas trims to nothing',
   Trim.alphaBounds(new Uint8ClampedArray(40 * 30 * 4), 40, 30), { x: 0, y: 0, w: 0, h: 0 });

{
  // A single pixel is a rect of one, not of zero — an off-by-one here would
  // silently drop the last row and column of every crop.
  const px = canvasWith(10, 10, { x: 3, y: 4, w: 1, h: 1 });
  ok('one pixel is 1x1', Trim.alphaBounds(px, 10, 10), { x: 3, y: 4, w: 1, h: 1 });
}

{
  const px = canvasWith(10, 10, { x: 0, y: 0, w: 10, h: 10 });
  ok('a full canvas trims to itself', Trim.alphaBounds(px, 10, 10),
     { x: 0, y: 0, w: 10, h: 10 });
}

{
  const px = canvasWith(40, 30, { x: 5, y: 6, w: 10, h: 8 }, 3);
  ok('faint ink counts by default', Trim.alphaBounds(px, 40, 30).w, 10);
  ok('and not above the threshold',
     Trim.alphaBounds(px, 40, 30, { threshold: 8 }), { x: 0, y: 0, w: 0, h: 0 });
}

{
  // The region is the arithmetic bound from bounds.js; ink outside it is not
  // looked for, which is exactly the trade that makes the scan cheap.
  const px = canvasWith(40, 30, { x: 0, y: 0, w: 40, h: 30 });
  ok('a region limits the search',
     Trim.alphaBounds(px, 40, 30, { region: { x: 10, y: 10, w: 5, h: 5 } }),
     { x: 10, y: 10, w: 5, h: 5 });
  ok('and a region past the edge is clamped',
     Trim.alphaBounds(px, 40, 30, { region: { x: 35, y: 25, w: 100, h: 100 } }),
     { x: 35, y: 25, w: 5, h: 5 });
}

{
  // Flattened onto white: alpha says nothing, so the ground colour has to.
  const px = new Uint8ClampedArray(20 * 20 * 4).fill(255);
  for (let y = 4; y < 9; y++) {
    for (let x = 2; x < 7; x++) {
      const p = (y * 20 + x) * 4;
      px[p] = 0; px[p + 1] = 0; px[p + 2] = 0; px[p + 3] = 255;
    }
  }
  ok('groundBounds finds ink on an opaque canvas',
     Trim.groundBounds(px, 20, 20, { ground: [255, 255, 255] }),
     { x: 2, y: 4, w: 5, h: 5 });
  ok('and nothing when it is all ground',
     Trim.groundBounds(new Uint8ClampedArray(20 * 20 * 4).fill(255), 20, 20,
       { ground: [255, 255, 255] }), { x: 0, y: 0, w: 0, h: 0 });
}

{
  const indices = new Int16Array(6 * 4).fill(-1);
  indices[1 * 6 + 2] = 0;
  indices[2 * 6 + 4] = 3;
  ok('indexBounds works in cells, reading no pixels',
     Trim.indexBounds(indices, 6, 4), { x: 2, y: 1, w: 3, h: 2 });
  ok('an all-empty field is nothing',
     Trim.indexBounds(new Int16Array(24).fill(-1), 6, 4), { x: 0, y: 0, w: 0, h: 0 });
}

// The union is what makes a loop trimmable at all: one canvas for every frame.
// a spans y 2..4 and x 2..4; b spans y 1..9 and x 8..9. So the union runs
// x 2..9 and y 1..9 — eight wide and nine tall, not ten.
ok('union covers both', Trim.union({ x: 2, y: 2, w: 3, h: 3 }, { x: 8, y: 1, w: 2, h: 9 }),
   { x: 2, y: 1, w: 8, h: 9 });
ok('union with nothing is the other one',
   Trim.union({ x: 0, y: 0, w: 0, h: 0 }, { x: 8, y: 1, w: 2, h: 9 }),
   { x: 8, y: 1, w: 2, h: 9 });
ok('union of nothings is nothing',
   Trim.union({ x: 0, y: 0, w: 0, h: 0 }, { x: 0, y: 0, w: 0, h: 0 }),
   { x: 0, y: 0, w: 0, h: 0 });
ok('a contained rect changes nothing',
   Trim.union({ x: 0, y: 0, w: 10, h: 10 }, { x: 2, y: 2, w: 3, h: 3 }),
   { x: 0, y: 0, w: 10, h: 10 });

ok('grow expands on every side', Trim.grow({ x: 5, y: 5, w: 10, h: 10 }, 3),
   { x: 2, y: 2, w: 16, h: 16 });

// -- zoom is the object, never the canvas ------------------------------------
//
// Decided 2026-09-23: `zoom` scales the content inside a canvas the format
// fixes, in every format. It used to grow a derived canvas too, which made it
// a second `scale`.

{
  const src = { width: 1920, height: 945 };
  const box = { x: 100, y: 50, w: 800, h: 400 };
  const ink = Frame.resolveFrame({ format: 'content', bleed: 0, zoom: 2 }, box, src);
  ok('ink: the canvas is the content, zoom or not', [ink.width, ink.height], [800, 400]);
  ok('ink: zoom 2 overflows it, centred', ink.to, { x: -400, y: -200, w: 1600, h: 800 });

  const whole = Frame.resolveFrame({ format: 'source', bleed: 0, zoom: 0.5 }, box, src);
  ok('canvas: the source size, zoom or not', [whole.width, whole.height], [1920, 945]);
  ok('canvas: zoom 0.5 shrinks the content inside', [whole.to.w, whole.to.h], [400, 200]);

  ok('the frame group carries scale, 0.25 to 4',
     [Frame.frameParams().scale.min, Frame.frameParams().scale.max], [0.25, 4]);
  ok('every frame param is in the format drawer',
     Object.values(Frame.frameParams()).every(spec => spec.group === 'format'), true);
}

// -- the chain, with a real Params -------------------------------------------
//
// Every app calls applyFrameEdit from a params.on listener, so every write it
// makes comes back into it. The stand-in above has no listeners and could not
// see what that did: picking a preset wrote its size and then flipped the
// format to `custom`, because the size arrived as "a dimension was typed".

{
  const { defineParams } = await import('../core/params.js');
  const p = defineParams('chain', { ...Frame.frameParams({ format: 'content' }) });
  p.on(key => Frame.applyFrameEdit(p, key, content));

  p.set('format', 'hd');
  ok('a picked preset stays picked', p.get('format'), 'hd');
  ok('and its size is written', [p.get('width'), p.get('height')], [1920, 1080]);

  p.set('format', 'a4');
  ok('a paper format stays picked too', p.get('format'), 'a4');

  p.set('width', 1000);
  ok('typing a width is still custom', p.get('format'), 'custom');
  ok('and the link still drags the height', p.get('height'), Math.round(1000 * 297 / 210));
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
