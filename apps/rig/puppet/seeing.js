/**
 * seeing.js — the camera and what the puppet reads in it: the face, once a
 * frame of the camera, its eyes and its mouth held steady, its head measured
 * from straight.
 *
 * The camera is asked for when the page opens, and again while another
 * program holds it — the puppet still open in Chrome, OBS's own source of it
 * — so a page waiting for it takes it as soon as it is let go. It is let go
 * when switched off (the Camera drawer) and with the page. MediaPipe reads
 * each frame when the video says it came (`requestVideoFrameCallback`), at
 * that frame's time, so the 1€ filters are fed once a frame (steady.js);
 * where the video does not call, a frame of the screen reads it once, as the
 * count of its frames goes up. What it reads is the puppet's: the eyes and
 * the mouth as the page shows them, the boxes as the camera has them for the
 * guides, the head's pose as shown, from straight.
 */

import { openCamera, cameras }  from './camera.js';
import { openFace, NoTracker }  from './face.js';
import { eyesOf, asShown }      from './eyes.js';
import { mouthOf, mouthShown, ASPECT } from './mouth.js';
import { poseOf, asShownPose, straight } from './head.js';
import { steadyBoxes, steadyPose } from './steady.js';

const IN_OBS = typeof window.obsstudio === 'object';   // OBS's browser gives its pages this
const OBS_FLAGS = '--enable-media-stream --use-fake-ui-for-media-stream';
const AGAIN_MS = 2000;                                 // how long to wait before asking for a held camera again

/** Why the camera was refused, and what to do: in OBS, the flag it wants — said over the avatar, where nothing else is. */
function whyNoCamera(err) {
  if (err.name === 'NotAllowedError') {
    return IN_OBS ? `OBS keeps the camera from its Browser sources — start OBS with ${OBS_FLAGS} (docs/guides/obs.md)`
      : 'the browser was not allowed one — see the camera icon in its address bar';
  }
  if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') return 'none was found';
  return err.message;
}

/** Whether the camera is there but held — another program has it, or a page just gone has not let go yet — or not there yet: worth asking again. */
const held = err => /NotReadableError|AbortError|TrackStartError/.test(err.name);
const absent = err => err.name === 'NotFoundError';

/**
 * @param {object} o
 * @param {HTMLVideoElement} o.video
 * @param {object} o.params                 the puppet's
 * @param {(concern: string, text: string, trouble?: boolean) => void} o.tell
 * @param {(list: Array, current: ?string) => void} o.listed   the cameras there are, and which is on
 * @param {(on: boolean) => void} o.switched                  the camera on or off now
 */
export function makeSeeing({ video, params, tell, listed, switched }) {
  const kept = { boxes: steadyBoxes({ steadiness: params.get('steady') }), mouth: steadyBoxes({ steadiness: params.get('steady') }),
                 pose: steadyPose(), straight: straight() };
  const out = { eyes: null, mouth: null, seen: [], pose: null, camera: null, wanted: true };
  let face = null, found = null, again = null, watching = false, called = -Infinity, lastFrames = -1, device = null;

  async function start(deviceId = device) {
    device = deviceId;
    clearTimeout(again);
    if (out.camera) out.camera.stop();
    out.camera = null;
    if (!out.wanted) return;
    try {
      out.camera = await openCamera(video, { deviceId });
      if (!out.wanted) { out.camera.stop(); out.camera = null; return; }
      tell('camera', out.camera.label);
      listed(await cameras(), out.camera.deviceId);
      watch();
    } catch (err) {
      if ((held(err) || absent(err)) && out.wanted) {
        tell('camera', held(err) ? 'waiting for the camera: another program has it' : 'waiting for a camera: none found yet', IN_OBS);
        again = setTimeout(() => start(deviceId), AGAIN_MS);
        return;
      }
      tell('camera', 'no camera: ' + whyNoCamera(err), true);
    }
  }

  /** The camera switched: off, it is let go and the puppet wears its own eyes; on, it is asked for again. */
  function setWanted(on) {
    out.wanted = on;
    switched(on);
    if (on) return start();
    clearTimeout(again);
    if (out.camera) out.camera.stop();
    out.camera = null;
    out.eyes = out.mouth = out.pose = null;
    out.seen = [];
    kept.boxes.reset(); kept.mouth.reset(); kept.pose.reset();
    tell('camera', 'camera off — let go, for OBS to take');
  }

  async function startFace() {
    try {
      face = await openFace();
      tell('face', `MediaPipe on the ${face.on}`);
    } catch (err) {
      tell('face', err instanceof NoTracker ? err.message : 'MediaPipe would not start: ' + err.message, true);
    }
  }

  /** Each frame of the camera read once, when it comes, by the video's own call. */
  function watch() {
    if (watching || !('requestVideoFrameCallback' in video)) return;
    watching = true;
    const next = () => video.requestVideoFrameCallback((now, meta) => { called = now; read(now, meta); next(); });
    next();
  }

  /** One frame of the camera: the face in it, its eyes and its mouth held, its head measured from straight. */
  function read(now, meta) {
    if (!face || !out.camera || video.readyState < 2) return;
    const time = ((meta && meta.captureTime) || now) / 1000, mirror = params.get('mirror'), level = params.get('level');
    const got = face.read(video, now), mouthOn = params.get('mouth');
    const boxes = kept.boxes.hold(got ? eyesOf(got.points, { around: params.get('around'), level }) : null, time);
    out.eyes = boxes ? asShown(boxes, mirror) : null;
    const lips = got && mouthOn ? mouthOf(got.points, { around: params.get('mouthAround'), level }) : null;
    const lipsHeld = kept.mouth.hold(lips ? [lips] : null, time);
    const mouthBox = lipsHeld && mouthOn ? { ...lipsHeld[0], aspect: ASPECT } : null;
    out.mouth = mouthShown(mouthBox, mirror);
    out.seen = [...(boxes || []), mouthBox];
    out.pose = asShownPose(kept.straight.from(kept.pose.hold(got ? poseOf(got.transform) : null, time), time), mirror);
    if (!!got !== found) {
      found = !!got;
      tell('face', found ? `MediaPipe on the ${face.on} · your eyes are on` : `MediaPipe on the ${face.on} · looking for a face…`);
    }
  }

  return Object.assign(out, {
    start, setWanted, startFace,
    /** A frame of the screen: read the camera here when the video does not call — none, or not lately. */
    tick(now) {
      if (!out.camera || now - called < 500) return;
      const count = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality().totalVideoFrames : -1;
      if (count >= 0 && count === lastFrames) return;
      lastFrames = count;
      read(now, null);
    },
    /** The head as it is now is straight; whether there was a head to take it from. */
    straightNow() { kept.straight.now(); return !!out.pose || kept.straight.learnt; },
    tune(steadiness) { kept.boxes.tune(steadiness); kept.mouth.tune(steadiness); },
    /** Forget the eyes' boxes, the mouth's, or both — after a change in how they are cut. */
    forget(which) { if (which !== 'mouth') kept.boxes.reset(); if (which !== 'eyes') kept.mouth.reset(); },
    /** Let go of the camera, as the page goes. */
    stop() { clearTimeout(again); if (out.camera) out.camera.stop(); },
  });
}
