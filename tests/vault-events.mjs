/**
 * tests/vault-events.mjs — run with: node tests/vault-events.mjs
 *
 * A panel open on one machine hears a save made on another. That is a stream
 * from the server, /api/vault/events (server/events.js), and this holds it to
 * it: a save, a retag and a delete each arrive as `changed`, with the count,
 * on every listener at once — two here, standing for two machines.
 *
 * Brings its own server on a throwaway vault, as tests/vault.mjs does.
 */

import { spawn }         from 'node:child_process';
import net               from 'node:net';
import fs                from 'node:fs';
import os                from 'node:os';
import path              from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(48), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

const freePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});

const vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skweeb-vault-'));
const port     = await freePort();
const BASE     = 'http://127.0.0.1:' + port;
const child = spawn(process.execPath,
  [path.join(ROOT, 'server.js'), '--port', String(port), '--vault', vaultDir],
  { stdio: ['ignore', 'ignore', 'pipe'] });

async function waitForServer(until = Date.now() + 10000) {
  while (Date.now() < until) {
    try { if ((await fetch(BASE + '/api/vault')).ok) return; } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('server never answered on ' + port);
}

/** A listener: the `changed` events it has heard, parsed, as they come. */
async function listener() {
  const ctrl = new AbortController();
  const res = await fetch(BASE + '/api/vault/events', { signal: ctrl.signal });
  const heard = [];
  let buf = '';
  (async () => {
    const dec = new TextDecoder();
    try {
      for await (const part of res.body) {
        buf += dec.decode(part, { stream: true });
        let cut;
        while ((cut = buf.indexOf('\n\n')) !== -1) {
          const block = buf.slice(0, cut); buf = buf.slice(cut + 2);
          if (!/^event: changed$/m.test(block)) continue;
          heard.push(JSON.parse(block.match(/^data: (.*)$/m)[1]));
        }
      }
    } catch { /* aborted */ }
  })();
  return { res, heard, close: () => ctrl.abort() };
}

const settle = async (l, n) => {
  for (let i = 0; i < 50 && l.heard.length < n; i++) await new Promise(r => setTimeout(r, 20));
  return l.heard.length;
};

try {
  await waitForServer();
  const a = await listener(), b = await listener();
  ok('the stream is an event stream', a.res.headers.get('content-type').split(';')[0], 'text/event-stream');

  const saved = await (await fetch(BASE + '/api/vault', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'params', origin: { app: 'test', version: '0' }, recipe: { x: 1 },
      render: { ext: 'json', data: Buffer.from('{"x":1}').toString('base64') } }),
  })).json();
  ok('a save is heard, with the count', [await settle(a, 1), a.heard[0] && a.heard[0].count], [1, 1]);
  ok('…by every listener, the other machine too', await settle(b, 1), 1);

  await fetch(BASE + '/api/vault/' + saved.object.id, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ add: ['trash'] }),
  });
  ok('a retag is heard', await settle(a, 2), 2);

  await fetch(BASE + '/api/vault/delete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: [saved.object.id] }),
  });
  ok('a delete is heard, the vault empty again', [await settle(a, 3), a.heard[2] && a.heard[2].count], [3, 0]);

  b.close();
  await new Promise(r => setTimeout(r, 50));
  await fetch(BASE + '/api/vault', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'params', origin: { app: 'test', version: '0' }, recipe: { x: 2 },
      render: { ext: 'json', data: Buffer.from('{"x":2}').toString('base64') } }) });
  ok('a listener gone does not stop the rest', await settle(a, 4), 4);
  ok('only GET opens a stream', (await fetch(BASE + '/api/vault/events', { method: 'POST' })).status, 405);
  a.close();
} finally {
  child.kill();
  fs.rmSync(vaultDir, { recursive: true, force: true });
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
