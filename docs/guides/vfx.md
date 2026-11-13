# A game's effects

How an effect in a game is made, and how to make one here. A section a
brick: what is below is what the suite can do today, and each next section
comes with the brick that makes it true (`docs/vfx.md` is the plan).

## 1. What an effect is

An explosion is not one thing. It is five or six **layers** drawn over each
other for half a second — a flash, fire, smoke, sparks, a ring — and each
layer is three things:

- a **carrier** — where it is, when, how big: most often a particle
  system's sprites;
- a **surface** — what each of those shows: a *shader*, a small function the
  GPU runs for every pixel — *where am I, when is it → which colour*;
- a **blend** — how it meets what is behind: *added* for light (fire,
  sparks, magic), laid *over* for matter (smoke, dust).

The shader app makes surfaces. Particles are the carrier; compose and an
object's layers are the blends.

## 2. A surface is a chain

A surface is computed, not drawn, from a handful of moves every effect
repeats. Here each move is a **row**, and the rows run top to bottom — each
one changing the picture the rows above it made:

1. a **noise** — a grey cloud, the raw matter of fire, smoke and water;
2. the noise **scrolled** in time — its *scroll* rows: tiles a loop;
3. a second noise **multiplied** over the first, scrolling at another pace
   — so the motion never repeats inside the loop;
4. a **mask** — a shape, light inside and dark out, giving it a form;
5. a **gradient map** — its greys looked up on colours, dark to light.

Fire, smoke and energy are those five in different amounts. Open a
**starter** and read it top to bottom: every row shows the picture *as it
stands there* — the grey noise, the two multiplied, masked, in colour.
Click a row's picture to see it large in the viewer; click it again for the
whole.

Try it: open *fire*, and switch its rows off one at a time, last first.
Then change one number in the first row — *cells across* — and watch every
picture under it follow.

## 3. Generators, and how a row meets what is under it

A **generator** is a row that makes a picture instead of changing one:
*noise*, *gradient*, *shape*. Each is a grey at every pixel, and its last
two values say how that grey meets the picture above it:

- **replace** — the grey alone, over everything: a chain's first row;
- **multiply** — what is under, darkened by it: two noises into one that
  never repeats, a gradient fading a fire upwards;
- **mask** — what is under kept where it is light, gone where it is dark:
  how a surface gets its shape, and its clear edge;
- **add**, **screen** — its light added: a glow, a hot core.

Every other row of the catalogue — brightness, blur, threshold, the gradient
map — is a filter, the same ones the filter app runs over a photograph.

## 4. Time: a loop that closes

The *Time* drawer says how many frames the loop has. A scroll is counted in
**tiles a loop**: 1 is the whole picture across once in the loop's length,
so the last frame leads into the first with no jump. Two rows scrolling 1
and 2 give a motion that looks free and still closes — which is what a game
wants: a loop of 48 frames it can play for ever.

A noise is drawn from the **seed**: the same seed, the same surface, on any
machine and at any size. Another seed is another fire.

## 5. Keeping it

**S** saves what is on screen into the vault: a loop as a loop, one frame
as a still — with its recipe, the chain and the seed, so it is drawn again
at any size rather than stretched, and printed at a sheet's size from the
*Export* drawer. Saved again, it is the same object's next state. From the
vault it opens back here, row for row; compose places it on a page, where
its blend is chosen — *add* for a fire.

## 6. A life, and the four moves that make an effect

A loop is for what lasts — a torch, a river. An explosion happens **once**:
in the *Time* drawer, *a life, once* plays the frames from a birth to a
death and stops. Four more rows are made for it:

- **dissolve** — the picture eaten away from its dark parts up. A pixel
  stays while it is brighter than a threshold, and the threshold climbs
  from *at birth* to *at death* over the life: holes open in the noise and
  grow until nothing is left. *Hot rim* colours the edge being eaten — a
  burning edge. This one row is most of what makes fire look like fire.
- **warp** — the picture read through a noise, every pixel taking its
  colour from a little way off. Scrolled, what is under seems to flow: the
  difference between a noise sliding and a flame licking.
- **polar** — the picture wound round a point: its width becomes the way
  round and its height the way out. A noise scrolling down becomes rings
  leaving a centre; *twist* makes it a vortex. Shockwaves, portals, spells.
- **glow** — what is bright, spread and added back as light: a core that
  burns the eye.

Open *a burst, dissolving* and step through it with **,** and **.** — then
look at the dissolve row's picture against the row above it: the same
surface, before and after the age has eaten it.

Why the threshold matters: it *is* the age. Drawn once at every age, the
frames are a flipbook — and a particle that shows the frame of its own age
dissolves on its own clock, each one a little out of step with the others.

## Next

Particles wearing a life, each showing the frame of its age; then an effect
of several layers, played in the suite's own game on a click.
