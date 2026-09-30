/**
 * server/events.js — tells every open page that the vault changed.
 *
 *   GET /api/vault/events   -> text/event-stream, one `changed` per new index
 *
 * The vault is one folder on one machine, and the pages looking at it may be
 * on others: a save made at the tower has to reach a panel open on the laptop.
 * Nothing here says *what* changed — the page reads the index again, which is
 * cheap and already the only way it learns anything.
 *
 * server.js calls `notify()` wherever it rewrites index.json, so a save, a
 * retag and a delete all announce themselves, from whichever machine.
 */

const KEEPALIVE_MS = 25000;   // under the idle timeout of a proxy in front, tailscale serve's included

module.exports = function events() {
  const clients = new Set();

  function handle(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');
    clients.add(res);
    const beat = setInterval(() => res.write(': keepalive\n\n'), KEEPALIVE_MS);
    req.on('close', () => { clearInterval(beat); clients.delete(res); });
  }

  function notify(count) {
    const msg = 'event: changed\ndata: ' + JSON.stringify({ count, at: new Date().toISOString() }) + '\n\n';
    for (const res of clients) res.write(msg);
  }

  return { handle, notify };
};
