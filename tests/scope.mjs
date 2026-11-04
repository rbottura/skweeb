/**
 * tests/scope.mjs — run with: node tests/scope.mjs
 *
 * Covers core/scope.js, what a mounted app holds (S9): its stops run when
 * it closes, the newest first, once; `held` with no scope open keeps
 * nothing; a scope opened inside another gives the outer back; a listener
 * taken off; a stop held once closed run at once; a stop released — the
 * thing ended another way — neither kept nor run, even released while the
 * close runs; a listener's own off; a stop that throws does not keep the
 * others from running.
 */

const { openScope, held, listen, current } = await import('../core/scope.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(56), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

{
  const ran = [];
  held(() => ran.push('loose'));
  ok('no scope open: nothing kept', [current(), ran], [null, []]);

  const s = openScope('particles');
  held(() => ran.push(1));
  held(() => ran.push(2));
  s.hold(() => ran.push(3));
  ok('three held', s.size, 3);
  s.close();
  ok('closed: every stop, the newest first', ran, [3, 2, 1]);
  s.close();
  ok('…and twice is once', ran, [3, 2, 1]);
  ok('…the scope no more open', current(), null);
  s.hold(() => ran.push('late'));
  ok('held once closed: run at once', ran.at(-1), 'late');
}

{
  const ran = [];
  const outer = openScope('outer');
  const inner = openScope('inner');
  held(() => ran.push('inner'));
  ok('the newest open is the one held to', current() === inner, true);
  inner.close();
  ok('…closed, the outer back', current() === outer, true);
  held(() => ran.push('outer'));
  outer.close();
  ok('each its own stops', ran, ['inner', 'outer']);
}

{
  const target = new EventTarget();
  let heard = 0;
  const s = openScope();
  listen(target, 'ping', () => heard++);
  target.dispatchEvent(new Event('ping'));
  s.close();
  target.dispatchEvent(new Event('ping'));
  ok('a listener: heard while open, off once closed', heard, 1);

  let loose = 0;
  listen(target, 'ping', () => loose++);
  target.dispatchEvent(new Event('ping'));
  ok('…with no scope, kept', loose, 1);
}

{
  // What ends before its app takes itself out: the scope keeps nothing gone.
  const ran = [];
  const s = openScope('release');
  const a = held(() => ran.push('a'));
  held(() => ran.push('b'));
  a();
  ok('released: no more held', s.size, 1);
  s.close();
  ok('…and never run at the close', ran, ['b']);
}

{
  // A stop that releases another as it runs — a panel taking its picker with it: that one is not run twice.
  const ran = [];
  const s = openScope('nested');
  const picker = held(() => ran.push('picker'));
  held(() => { ran.push('panel'); picker(); });
  s.close();
  ok('released while the close runs: not run', ran, ['panel']);
}

{
  // `listen` gives back what takes the listener off now, and out of the scope.
  const target = new EventTarget();
  let heard = 0;
  const s = openScope();
  const off = listen(target, 'ping', () => heard++);
  off();
  target.dispatchEvent(new Event('ping'));
  ok('a listener taken off by its own hand: unheard, unheld', [heard, s.size], [0, 0]);
  s.close();
  const loose = listen(target, 'ping', () => heard++);
  loose();
  target.dispatchEvent(new Event('ping'));
  ok('…with no scope too', heard, 0);
  ok('held with no scope: a release that does nothing', typeof held(() => {}), 'function');
}

{
  const ran = [];
  const s = openScope('throws');
  const was = console.error;
  console.error = () => {};
  held(() => ran.push('first'));
  held(() => { throw new Error('no'); });
  held(() => ran.push('last'));
  s.close();
  console.error = was;
  ok('a stop that throws: the others still run', ran, ['last', 'first']);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
