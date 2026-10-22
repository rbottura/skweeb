/**
 * camera.js — the camera, playing into a <video>: the one asked for, or the
 * browser's first, as large as it gives up to 1280 × 720 — an eye is cut
 * from a few dozen of its pixels, so more is sharper.
 *
 * A page has a camera only in a secure context — 127.0.0.1, localhost, or
 * https, as the tailnet's address is — and only once the browser is told it
 * may: Chrome asks the first time; OBS's Browser source is given it by the
 * flag in the puppet's guide.
 */

/**
 * @param {HTMLVideoElement} video
 * @param {object} [opts]
 * @param {?string} [opts.deviceId]   a camera's, from `cameras()`
 * @returns {Promise<{label: string, deviceId: ?string, stop(): void}>}
 */
export async function openCamera(video, { deviceId = null } = {}) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('this page has no camera here — open it from 127.0.0.1, localhost or https');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { ...(deviceId ? { deviceId: { exact: deviceId } } : {}), width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  });
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  const track = stream.getVideoTracks()[0];
  return {
    label: (track && track.label) || 'camera',
    deviceId: track && track.getSettings ? track.getSettings().deviceId || null : null,
    stop() {
      for (const t of stream.getTracks()) t.stop();
      video.srcObject = null;
    },
  };
}

/** The cameras the browser lists: their labels once it has given the page one. */
export async function cameras() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter(d => d.kind === 'videoinput').map((d, i) => ({ deviceId: d.deviceId, label: d.label || `camera ${i + 1}` }));
}
