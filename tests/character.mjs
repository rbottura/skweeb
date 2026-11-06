/**
 * tests/character.mjs — run with: node tests/character.mjs
 *
 * Covers core/character.js, a character defined once (P3): a set's members
 * as loops by direction in RPG Maker's order, the left the right mirrored
 * when it is left out — and core/uses.js offering it to the map by default.
 * What is easy to get wrong: three members read as four, a mirrored left
 * named as its own loop, a set of another role taken for a character.
 */

const { ROLE, DIRECTIONS, STANCE, waysOf, characterOf, isCharacterCount } = await import('../core/character.js');
const { usesOf, USES } = await import('../core/uses.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

ok('RPG Maker\'s order, its stance the first frame', [DIRECTIONS, STANCE], [['down', 'left', 'right', 'up'], 0]);
ok('four members: down, left, right, up, none mirrored', waysOf(['D', 'L', 'R', 'U']), {
  down: { id: 'D', mirrored: false }, left: { id: 'L', mirrored: false }, right: { id: 'R', mirrored: false }, up: { id: 'U', mirrored: false } });
ok('three: down, right, up — the left the right, mirrored', waysOf(['D', 'R', 'U']), {
  down: { id: 'D', mirrored: false }, left: { id: 'R', mirrored: true }, right: { id: 'R', mirrored: false }, up: { id: 'U', mirrored: false } });
ok('any other count is no character — two, five, none', [waysOf(['A', 'B']), waysOf(['A', 'B', 'C', 'D', 'E']), waysOf([]), waysOf(null)], [null, null, null, null]);
ok('…and what is not an id is not a member', waysOf(['D', null, 'R', 'U'])?.left, { id: 'R', mirrored: true });
ok('the counts that make one', [2, 3, 4, 5].map(isCharacterCount), [false, true, true, false]);

const set = (role, members) => ({ type: 'set', recipe: { members, ...(role ? { role } : {}) }, tags: [] });
ok('a set made as a character is one', characterOf(set(ROLE, ['D', 'L', 'R', 'U'])).up, { id: 'U', mirrored: false });
ok('…a set of another role is not, whatever its count', [characterOf(set('brush-family', ['D', 'L', 'R', 'U'])), characterOf({ type: 'shape' })], [null, null]);

ok('a use for it: the map\'s, by its role', USES.find(u => u.role === ROLE), { id: 'character', app: 'map', label: 'map character', role: ROLE });
ok('a character is offered to the map by default, and only there', [...usesOf(set(ROLE, ['D', 'R', 'U']))], ['character']);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
