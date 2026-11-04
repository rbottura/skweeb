/**
 * main.js — the puppet: a drawing rigged as the rig rigs it, worn — the
 * author's own eyes, cut from the camera, at the tips of its eyestalks,
 * the author's mouth on its face, and the drawing moving as the head moves.
 *
 *   /apps/rig/puppet/?drawing=<id>        a gamepad drawing, its parts found (roles.js) or told
 *   /apps/rig/puppet/?open=<id>           a puppet kept, sent from this page — and followed
 *   …&obs                                 nothing on the page but the avatar, for OBS
 *
 * What is worn is opened by wear.js and drawn by the rig's own code. The
 * camera and what is read in it — the eyes, the mouth, the head — are
 * seeing.js's. Once a frame of the screen, the head moves the bones on
 * springs (sway.js), the eyes and the mouth are cut from the camera's
 * picture (crop.js) and laid on the stalks' tips and the face (tips.js,
 * draw.js). With no face, or the camera off, the drawing goes back to rest
 * and its own eyes and mouth show.
 *
 * A puppet worn is a performance: what it does live never enters a recipe
 * (docs/roadmap.md, M8). Its values are its address until it is sent; sent
 * (S), it is kept in the vault, and the page in OBS that holds it follows
 * every send (keeping.js). B shows the guides — the bones as the rig draws
 * them, each stroke's number, where the eyes and the mouth go, and what the
 * camera sees (guides.js); H shows the avatar alone; C takes straight
 * again; G opens the guide to OBS (docs/guides/obs.md). With no vault, no
 * camera or no MediaPipe it opens and says which (rule 7).
 */

import { puppetParams, GROUPS } from './params.js';
import { fromQuery }            from './address.js';
import { makeSeeing }           from './seeing.js';
import { makeKeeping }          from './keeping.js';
import { ASPECT }               from './mouth.js';
import { targetsOf, springsFor, reachOfSway } from './sway.js';
import { cutBox }               from './crop.js';
import { tipsAt, faceAt }       from './tips.js';
import { toldOf, toldText }     from './roles.js';
import { wear, placesAt, bonesAt } from './wear.js';
import { drawPuppet, roomOf }   from './draw.js';
import { drawGuides, drawCamera } from './guides.js';
import { buildDrawers }         from './drawers.js';
import { HUES }                 from '../guides.js';
import { ParamPanel }           from '../../../core/ParamPanel.js';
import { VaultPanel }           from '../../../core/VaultPanel.js';
import { Guide }                from '../../../core/Guide.js';
import { Playhead }             from '../../../core/playback.js';
import { Bar }                  from '../../../core/Bar.js';
import { Vault }                from '../../../core/vault.js';
import { viewFactor }           from '../../../core/view.js';
import { surface }              from '../../../core/surface.js';
import { own }                  from '../../../core/keys.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const video = document.getElementById('camera');
const trouble = document.getElementById('trouble');
const seenView = document.getElementById('seen');
const guidesBtn = document.getElementById('guides');
const MOST = 3;                 // canvas pixels per drawing pixel at most: drawn from its marks, sharp at any

let params, bar = null, drawers = null, guide = null, seeing = null, keeping = null;
let obs = new URLSearchParams(location.search).has('obs');
let worn = null;                // what is worn (wear.js), its room beside it
let springs = null;             // sway.js, a spring a bone of what is worn
let cuts = [], mouthCut = null; // an eye's cut each, and the mouth's, cut again every frame (crop.js)
let last = null;                // the frame on screen: its places and what it wears, for a send's picture
let asked = 0;                  // the latest drawing asked for; an older answer is dropped
let lastPaint = 0;              // the screen's last frame, ms: the springs' step
let view = 1;
let guides = false;             // the guides over the puppet (B)

/** What the page says: one line a concern, the troubles in OBS too. */
const state = { wear: { text: '' }, camera: { text: 'asking for the camera…' }, face: { text: 'starting MediaPipe…' } };

/** The loop a saved rig plays, if it moves. */
const clock = new Playhead({ onShow: () => {} });

async function boot() {
  params = puppetParams();
  bar = new Bar({ app: 'puppet', mount: document.querySelector('.app'), keys: 'S send to OBS · B guides · H alone · C straight · G guide · V vault' });
  own('KeyG', 'KeyH');                // G the puppet's guide, H alone — not core's ground and states (core/keys.js)
  keeping = makeKeeping({ params, follow: values => {
    params.restore(values);
    drawers.sent(true, 0);
    bar.announce('followed the puppet as it was sent');
  } });
  let kept = null;
  try { kept = await keeping.open(); } catch (err) { bar.announce('could not open it: ' + err.message); }
  params.restore(kept || fromQuery(params, location.search));
  seeing = makeSeeing({ video, params, tell, listed: (list, current) => drawers.cameras(list, current), switched: on => drawers.switched(on) });
  guide = new Guide({ url: new URL('../../../docs/guides/obs.md', import.meta.url).href, title: 'the puppet in OBS' });
  const panel = new ParamPanel(params, { title: 'puppet', mount: document.getElementById('side'), groups: GROUPS });
  drawers = buildDrawers(panel, {
    camera: id => seeing.start(id), switch: on => seeing.setWanted(on), send,
    address: () => location.origin + location.pathname + keeping.address(true),
    say: text => bar.announce(text), guide: () => guide.show(), straight: straightNow, tell: tellStroke,
  });
  drawers.sent(!!keeping.id, 0);
  params.on(key => {
    keeping.changed();
    drawers.sent(!!keeping.id, keeping.unsent);
    writeAddress();
    if (key === 'drawing' || key === 'longest' || key === 'parts') return load();
    if (key === 'steady') seeing.tune(params.get('steady'));
    if (key === 'mirror' || key === 'level' || key === 'around') seeing.forget('eyes');
    if (key === 'mirror' || key === 'level' || key === 'mouthAround') seeing.forget('mouth');
    if (['eyeSize', 'sway', 'nod', 'mouth', 'mouthSize', 'mouthLower'].includes(key) && worn) fitRoom();
  });
  guidesBtn.addEventListener('click', () => showGuides(!guides));
  window.addEventListener('pagehide', () => seeing.stop());
  wireKeys();
  showAlone(obs);
  load();
  seeing.start();
  seeing.startFace();
  requestAnimationFrame(frame);
}

function writeAddress() {
  history.replaceState(null, '', location.pathname + keeping.address(obs));
}

// ── What is worn ────────────────────────────────────────────────────────────

async function load() {
  const ask = ++asked;
  worn = null;
  springs = null;
  const id = params.get('drawing');
  if (!(await Vault.refresh())) return tell('wear', 'no vault — the puppet wears a drawing from it: start  node server.js', true);
  bar.vault(`${Vault.index.length} in vault`);
  if (!id) return tell('wear', 'choose a drawing to wear: a gamepad drawing with a body and two eyestalks', true);
  tell('wear', 'opening…');
  try {
    const { object } = await Vault.load(id);
    const next = await wear(object, { longest: params.get('longest'), told: toldOf(params.get('parts')) });
    if (ask !== asked) return;
    worn = next;
    springs = springsFor(worn.bones, worn.limbs);
    fitRoom();
    drawers.strokes(worn.roles ? worn.roles.found : [], toldOf(params.get('parts')));
    clock.configure({ length: worn.frames.length, fps: worn.frames.fps || 30, loop: true });
    if (worn.frames.loop) clock.play(); else clock.pause();
    const n = worn.tips.length, missing = worn.missing ? ` · ${worn.missing} sprites missing: their family is not on this disk` : '';
    tell('wear', n ? `${worn.title} · ${n === 1 ? 'one eyestalk' : n + ' eyestalks'} · ${worn.bones.length} bones${missing}`
      : `${worn.title} has no eyestalks — tell one stroke an eye in Parts${missing}`, !n);
  } catch (err) {
    if (ask !== asked) return;
    tell('wear', 'could not wear it: ' + err.message, true);
  }
}

/** A stroke told what it is — '' for found — and the drawing rigged again. */
function tellStroke(stroke, role) {
  const told = toldOf(params.get('parts'));
  while (told.length <= stroke) told.push('');
  told[stroke] = role;
  params.set('parts', toldText(told));
}

/** The room the drawing is drawn in: its ink, an eye's reach past its tips, the mouth's past the face, and as far as the head may move it. */
function fitRoom() {
  const rest = placesAt(worn, 0), tips = tipsAt(worn.drawing, worn.tips, rest, worn.images);
  const moves = worn.moves ? reachOfSway(params.values, Math.max(worn.ink.w, worn.ink.h)) : 0;
  const face = worn.face && params.get('mouth') ? faceAt(worn.drawing, worn.face, rest, worn.images) : null;
  const past = face ? Math.max(0, params.get('mouthSize') / 2 + Math.abs(params.get('mouthLower')) - 0.5) * face.width : 0;
  worn.room = roomOf(worn.ink, tips, params.get('eyeSize'), moves, past);
}

function straightNow() {
  bar.announce(seeing.straightNow() ? 'straight: as your head is now' : 'straight is taken from your face, once it is seen');
}

// ── Sending ─────────────────────────────────────────────────────────────────

/** The avatar as worn now, at its own pixels: a send's picture. */
function pictureNow() {
  const room = worn.room, out = surface(room.width, room.height), ground = params.get('ground');
  drawPuppet(out.getContext('2d'), { drawing: worn.drawing, places: last.places, images: worn.images, view: 1, room,
                                     ground: ground === 'none' ? null : ground, wears: last.wears });
  return out;
}

async function send() {
  if (!worn || !last) return bar.announce('nothing worn to send yet');
  const first = !keeping.id;
  try {
    const object = await keeping.send(pictureNow(), worn.title);
    if (!object) return bar.announce('no vault: OBS follows a puppet kept in the vault — start  node server.js');
    writeAddress();
    drawers.sent(true, 0);
    bar.announce(first ? 'sent — copy the address for OBS once: from now on OBS follows every send'
      : `sent — OBS has it, version ${object.version || 1}`);
  } catch (err) {
    bar.announce('could not send it: ' + err.message);
  }
}

// ── Drawing ─────────────────────────────────────────────────────────────────

function frame(now) {
  requestAnimationFrame(frame);
  seeing.tick(now);
  const dt = lastPaint ? (now - lastPaint) / 1000 : 0;
  lastPaint = now;
  paint(dt);
}

function paint(dt) {
  if (!worn) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const room = worn.room;
  view = viewFactor(canvas, room, MOST);
  const w = Math.max(1, Math.round(room.width * view)), h = Math.max(1, Math.round(room.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const target = targetsOf(worn.bones, worn.limbs, seeing.pose, params.values, worn.body);
  const live = { turns: springs.step(target.turns, dt, { wobble: params.get('wobble') }), lift: target.lift };
  const tick = worn.frames.loop ? clock.tick : 0, at = bonesAt(worn, tick, live);
  const places = placesAt(worn, tick, live, at);
  const spots = spotsAt(places);
  const soft = params.get('soft');
  const cut = (spot, box, into) => cutBox(into, video, box, { side: Math.min(1024, spot.width * view), soft });
  // An eye cut once, however many stalks wear it: at the size of the largest.
  const eyeCuts = seeing.eyes ? seeing.eyes.map((box, i) => {
    const widest = spots.filter(s => s.eye === i).sort((a, b) => b.width - a.width)[0];
    return widest ? (cuts[i] = cut(widest, box, cuts[i])) : null;
  }) : [];
  const mouthSpot = spots.find(s => s.mouth);
  if (seeing.mouth && mouthSpot) mouthCut = cut(mouthSpot, seeing.mouth, mouthCut);
  const wears = spots.map(s => ({ ...s, cut: s.mouth ? (seeing.mouth ? mouthCut : null) : eyeCuts[s.eye] || null }));
  const ground = params.get('ground');
  drawPuppet(ctx, { drawing: worn.drawing, places, images: worn.images, view, room, ground: ground === 'none' ? null : ground, wears });
  last = { places, wears };
  if (guides) {
    const dpp = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
    drawGuides(ctx, { bones: worn.bones, at, spots, labels: labelsAt(places), view, room, dpp });
    drawCamera(seenView, video, seeing.camera ? seeing.seen : [], params.get('mirror'));
  }
}

/** Where each eye and the mouth go this frame, as large as they are worn: the stalks' tips, the face. */
function spotsAt(places) {
  const eyeSize = params.get('eyeSize');
  const spots = tipsAt(worn.drawing, worn.tips, places, worn.images)
    .map(t => ({ ...t, width: t.width * eyeSize, height: t.width * eyeSize }));
  if (worn.face && params.get('mouth')) {
    const f = faceAt(worn.drawing, worn.face, places, worn.images, params.get('mouthLower')), w = f.width * params.get('mouthSize');
    spots.push({ ...f, width: w, height: w * ASPECT, mouth: true });
  }
  return spots;
}

/** Each stroke's number at its middle stamp, in its colour, as the Parts drawer names it. */
function labelsAt(places) {
  return worn.drawing.strokes.map((s, k) => {
    const p = places[s.stamps[Math.floor(s.stamps.length / 2)]];
    return { x: p.x, y: p.y, text: String(k + 1), hue: HUES[k % HUES.length] };
  });
}

// ── Saying, keys ────────────────────────────────────────────────────────────

/** One concern's line; a trouble shows over the avatar too, where the bar is hidden. */
function tell(concern, text, isTrouble = false) {
  state[concern] = { ...state[concern], text, trouble: isTrouble };
  bar.say(['wear', 'camera', 'face'].map(k => state[k].text).filter(Boolean).join(' · '));
  const troubles = ['wear', 'camera', 'face'].filter(k => state[k].trouble).map(k => state[k].text);
  trouble.textContent = troubles.join('\n');
  trouble.hidden = !troubles.length;
}

/** The guides over the puppet, and what the camera sees beside it — a view, never in the address. */
function showGuides(on) {
  guides = on;
  guidesBtn.setAttribute('aria-pressed', String(on));
  document.documentElement.classList.toggle('guides', on);
}

/** The avatar alone, as OBS shows it: no panel, no bar, no ground but the puppet's own. */
function showAlone(on) {
  obs = on;
  document.documentElement.classList.toggle('obs', on);
  writeAddress();
}

function wireKeys() {
  const vault = new VaultPanel();
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 's' || e.key === 'S') send();
    if (e.key === 'b' || e.key === 'B') showGuides(!guides);
    if (e.key === 'h' || e.key === 'H') showAlone(!obs);
    if (e.key === 'c' || e.key === 'C') straightNow();
    if (e.key === 'g' || e.key === 'G') guide.toggle();
    if (e.key === 'v' || e.key === 'V') vault.toggle();
  });
}

boot().catch(err => {
  console.error('[puppet] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
});
