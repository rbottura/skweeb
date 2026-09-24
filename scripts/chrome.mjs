/**
 * scripts/chrome.mjs — headless Chrome, driven over the DevTools protocol.
 *
 * The browser half of a check: open a page, run code in it, wait for it to
 * say something, press its buttons, take a picture. What a node test cannot
 * see — a canvas actually drawn, a panel actually built, a console actually
 * quiet — is what this is for. Written twice in session scratchpads and lost
 * twice; here so a browser check is a command (`scripts/check-compose.mjs`).
 *
 * No dependencies: Node 22 has WebSocket, and the protocol is JSON over it.
 * Chrome is found where it installs, or wherever `CHROME` says.
 *
 * Selectors are JavaScript expressions evaluated in the page, not CSS
 * strings, so a check can say "the row whose label is scale" in one line.
 */

import { spawn }  from 'node:child_process';
import fs         from 'node:fs';
import path       from 'node:path';

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Where Chrome is, or null. */
export function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  return CANDIDATES.find(p => fs.existsSync(p)) || null;
}

/**
 * Start Chrome and attach to its page.
 *
 * @param {object} opts
 * @param {number} opts.port        the DevTools port — a free one
 * @param {string} opts.profile     a throwaway user-data folder
 * @param {number} [opts.width=1600]
 * @param {number} [opts.height=1000]
 * @returns {Promise<{page: object, close: () => Promise<void>}>}
 */
export async function launch({ port, profile, width = 1600, height = 1000 }) {
  const chrome = findChrome();
  if (!chrome) throw new Error('no Chrome found — set CHROME to its path');
  fs.mkdirSync(profile, { recursive: true });
  const proc = spawn(chrome, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`, '--force-device-scale-factor=1',
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank',
  ], { stdio: 'ignore' });

  let targets = null;
  for (let i = 0; i < 75 && !targets; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); }
    catch { await sleep(200); }
  }
  const target = targets && targets.find(t => t.type === 'page');
  if (!target) { proc.kill(); throw new Error('Chrome never offered a page on ' + port); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let last = 0;
  const waiting = new Map();
  const listeners = new Set();
  const log = [];

  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      return msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
    const p = msg.params;
    if (msg.method === 'Runtime.consoleAPICalled') {
      log.push({ kind: p.type, text: p.args.map(a => a.value ?? a.description ?? '').join(' ') });
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = p.exceptionDetails;
      log.push({ kind: 'exception', text: (d.exception && d.exception.description) || d.text });
    } else if (msg.method === 'Log.entryAdded') {
      log.push({ kind: 'log-' + p.entry.level, text: p.entry.text, url: p.entry.url || '' });
    }
    for (const fn of listeners) fn(msg);
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++last;
    waiting.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');

  const page = {
    /** Everything the console said since the last goto(). */
    log,

    async goto(url, { settle = 1000 } = {}) {
      log.length = 0;
      const loaded = new Promise(resolve => {
        const fn = msg => { if (msg.method === 'Page.loadEventFired') { listeners.delete(fn); resolve(); } };
        listeners.add(fn);
      });
      await send('Page.navigate', { url });
      await loaded;
      await sleep(settle);
    },

    /** Run an expression in the page; promises are awaited, the value comes back as JSON. */
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) {
        throw new Error('in the page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      }
      return r.result.value;
    },

    /** Wait until an expression is truthy in the page. */
    async until(expression, { timeout = 20000, every = 150 } = {}) {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        if (await page.eval(expression)) return;
        await sleep(every);
      }
      throw new Error('timed out waiting for ' + expression);
    },

    /** Click the element an expression finds. False when it finds none. */
    click(element) {
      return page.eval(`(() => { const el = ${element}; if (!el) return false; el.click(); return true; })()`);
    },

    /** Type into a field as a person would: set it, then fire what its widget listens for. */
    typeInto(element, value, event = 'change') {
      return page.eval(`(() => { const el = ${element}; if (!el) return false;
        el.value = ${JSON.stringify(String(value))};
        el.dispatchEvent(new Event(${JSON.stringify(event)}, { bubbles: true })); return true; })()`);
    },

    async screenshot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
      return file;
    },

    /** What went wrong in the console: errors and uncaught exceptions. */
    errors() {
      return log.filter(e => e.kind === 'error' || e.kind === 'exception' || e.kind === 'log-error');
    },
  };

  return {
    page,
    async close() {
      try { await send('Browser.close'); } catch { /* already gone */ }
      ws.close();
      proc.kill();
      await sleep(300);
    },
  };
}
