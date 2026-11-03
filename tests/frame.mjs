/**
 * tests/frame.mjs — run with: node tests/frame.mjs
 *
 * Covers core/formats.js and core/frame.js: the geometry of what rectangle an
 * object occupies; core/trim.js, the ink inside one, is tests/trim.mjs's. Both
 * are pure on purpose — no canvas, no
 * DOM — which is what lets the awkward cases be written down here instead of
 * being found later in a render that is subtly off-centre.
 */

const Formats = await import('../core/formats.js');
const Frame   = await import('../core/frame.js');

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
// A stand-in for Params with the methods applyFrameEdit uses; its starting
// values are its defaults. The real one is covered by tests/params.mjs and at
// the end of this file; what matters here is the arithmetic.

const fakeParams = init => {
  const v = { ...init };
  return {
    get: k => v[k],
    spec: k => ({ default: init[k] }),
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
  const p = fakeParams({ format: '16-9', width: 1600, height: 900, link: true, bleed: 0, zoom: 1 });
  p.set('width', 800);
  Frame.applyFrameEdit(p, 'width', content);
  ok('the chain follows the format that was in force', p.get('height'), 450);
  ok('and a ratio is still itself at any size', p.get('format'), '16-9');
}

{
  const p = fakeParams({ format: '16-9', width: 1600, height: 900, link: false, bleed: 0, zoom: 1 });
  p.set('width', 800);
  Frame.applyFrameEdit(p, 'width', content);
  ok('unlinked, the other dimension stays put', p.get('height'), 900);
  ok('but it is still custom now', p.get('format'), 'custom');
}

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
// As the apps have it: its own writes come back into it, and a typed value has
// landed before it hears it — the two things the stand-in hid. A picked preset
// flipped to `custom`; the link never moved the other side once it was custom.

const { defineParams } = await import('../core/params.js');
const chained = (ink = null) => {
  const p = defineParams('chain', { ...Frame.frameParams({ format: 'content' }) });
  p.on(key => Frame.applyFrameEdit(p, key, ink));
  return p;
};
const box = p => [p.get('width'), p.get('height')];

{
  const p = chained(content);              // the ink is 996 x 822
  p.set('zoom', 2);
  ok("the ink format's rows show the ink", box(p), [996, 822]);
  p.set('width', 1992);
  ok("and the link holds the ink's shape", box(p), [1992, 1644]);
  p.set('format', 'hd');
  ok('a picked preset stays picked', p.get('format'), 'hd');
  ok('and its size is written', box(p), [1920, 1080]);
  p.set('format', 'a4');
  ok('a paper format stays picked too', p.get('format'), 'a4');
  p.set('width', 2480);
  ok('and through a linked edit: a sheet at any size', p.get('format'), 'a4');
  near('so its dpi can be read off', Formats.dpiOf('a4', ...box(p)).min, 300);
}

{
  const p = chained();                     // 1080 x 1080, no ink known
  p.set('link', false);
  p.set('height', 720);                    // custom and unlinked: 1080 x 720
  p.set('link', true);                     // 3:2 is held from here
  p.set('width', 540);
  ok('custom and linked: a width drags the height', box(p), [540, 360]);
  p.set('height', 1440);
  ok('and a height drags the width', box(p), [2160, 1440]);
  // A slider's drag, down to almost nothing and back: the shape is held, not
  // read again off each rounded box.
  for (let w = 2160; w >= 3; w -= 7) p.set('width', w);
  for (let w = 3; w <= 1080; w += 3) p.set('width', w);
  ok('dragged down and back, it comes home exact', box(p), [1080, 720]);
}

{
  const p = chained();
  p.set('format', '16-9');
  p.set('width', 1000);
  ok('a ratio holds its exact shape', box(p), [1000, 563]);
  ok('and stays picked', p.get('format'), '16-9');
  p.set('format', 'hd');
  p.set('width', 1280);
  ok('an exact size typed over is custom', p.get('format'), 'custom');
  p.set('height', 1080);
  ok('holding the shape it had', box(p), [1920, 1080]);
}

{
  const p = chained();
  ok('the frame declares 1 to 4000', [Frame.frameParams().width.min, Frame.frameParams().width.max], [1, 4000]);
  p.set('width', 99999);
  ok('a side stops at the limit, the other with it', box(p), [4000, 4000]);
  p.set('height', -50);
  ok('and neither goes below 1', box(p), [1, 1]);
  p.set('link', false);
  p.set({ width: 1080, height: 1080 });
  p.set('link', true);
  p.set('format', '9-16');                 // 1080 x 1920
  p.set('width', 3000);                    // its height would be 5333
  ok('at the limit, the typed side gives way', box(p), [2250, 4000]);
  p.set('link', false);
  p.set('width', 4000);
  p.set('format', '16-9');
  ok('a format never grows a box past it', box(p), [4000, 2250]);
}

{
  // What `restoring` is for: only the width differs, just as a typed one would.
  const p = chained();
  p.set('link', false);
  p.set('width', 1200);
  p.set('link', true);
  p.restore({ format: 'custom', width: 1500, height: 1080, link: true });
  ok('a restore comes back as saved', box(p), [1500, 1080]);
  p.set('width', 750);
  ok('and the link then holds its shape', box(p), [750, 540]);
}

// Swapped, as the pair's button does it (core/param-rows.js): both at once, a set that stands —
// but a box no longer the shape its format names is custom.
{
  const p = chained();
  p.set('format', 'hd');
  p.set({ width: p.get('height'), height: p.get('width') });
  ok('swapped, the sides change places', box(p), [1080, 1920]);
  ok('and a format that named the other shape is custom now', p.get('format'), 'custom');
  p.set('format', 'a4');
  const [w, h] = box(p);
  p.set({ width: h, height: w });
  ok('a sheet turned on its side is custom too', [box(p), p.get('format')], [[h, w], 'custom']);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
