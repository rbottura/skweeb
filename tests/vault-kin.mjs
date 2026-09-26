/**
 * tests/vault-kin.mjs — run with: node tests/vault-kin.mjs
 *
 * Covers core/vault-kin.js: which loose objects the vault panel keeps
 * together, in what order, and where each group sits in the grid. What is
 * easy to get wrong: kin joined only through an object the grid does not
 * show loose (a parent put away in a folder), and a page made from several
 * objects coming after all of them.
 */

const { kinOf, arrange, columnsIn } = await import('../core/vault-kin.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(56), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

let clock = 0;
const row = (id, { parents = [], refs = [], folder = null, at } = {}) => ({
  id, parents, refs, tags: folder ? ['folder:' + folder] : [],
  created: new Date(Date.UTC(2026, 8, 20) + (at ?? ++clock) * 60000).toISOString(),
});
const folderOf = r => (r.tags.find(t => t.startsWith('folder:')) || '').slice(7) || null;
const ids = group => group.members.map(m => m.id);

// A chain, a loner, siblings of a parent put away, a page of two, refs.
const A = row('A'), B = row('B', { parents: ['A'] }), C = row('C', { parents: ['B'] });
const L = row('L');
const P = row('P', { folder: 'session' });
const X = row('X', { parents: ['P'] }), Y = row('Y', { parents: ['P'] });
const S1 = row('S1'), S2 = row('S2'), PAGE = row('PAGE', { parents: ['S2', 'S1'] });
const LIVE = row('LIVE'), USER = row('USER', { refs: ['LIVE'] });
const all = [A, B, C, L, P, X, Y, S1, S2, PAGE, LIVE, USER];
const newestFirst = [...all].reverse();
const loose = newestFirst.filter(r => !folderOf(r));

const groups = kinOf(loose, all);
ok('a chain is kin, the most original first', ids(groups.get('C')), ['A', 'B', 'C']);
ok('one member, one group', groups.get('A') === groups.get('C'), true);
ok('an object made from nothing, by nothing, is alone', groups.has('L'), false);
ok('siblings are kin through a parent in a folder', ids(groups.get('X')), ['X', 'Y']);
ok('and the group names that parent', groups.get('X').outside.map(r => r.id), ['P']);
ok('a page comes after everything placed on it', ids(groups.get('PAGE')), ['S1', 'S2', 'PAGE']);
ok('refs join as parents do', ids(groups.get('USER')), ['LIVE', 'USER']);

// Older after newer when lineage says so: a child made from something younger is still after it.
const Q = row('Q', { at: 100 }), R = row('R', { parents: ['Q'], at: 50 });
ok('a parent before its child, whatever their dates', ids(kinOf([Q, R], [Q, R]).get('R')), ['Q', 'R']);

// A cycle cannot be saved, but must not hang: oldest first.
const U = row('U', { parents: ['V'], at: 1 }), V = row('V', { parents: ['U'], at: 2 });
ok('a cycle ends, oldest first', ids(kinOf([U, V], [U, V]).get('U')), ['U', 'V']);

// Where things sit: a group where its newest member would, a folder where its newest is.
const items = arrange(newestFirst, all, { kin: true, folderOf });
const at = items.map(i => i.row ? i.row.id : i.folder ? 'folder:' + i.folder : 'kin:' + ids(i.kin).join('+'));
ok('the grid: groups and folders where their newest member is', at,
  ['kin:LIVE+USER', 'kin:S1+S2+PAGE', 'kin:X+Y', 'folder:session', 'L', 'kin:A+B+C']);
ok('with the switch off, every loose object on its own',
  arrange(newestFirst, all, { kin: false, folderOf }).filter(i => i.row).map(i => i.row.id),
  ['USER', 'LIVE', 'PAGE', 'S2', 'S1', 'Y', 'X', 'L', 'C', 'B', 'A']);

// How many columns the grid has: 150px cards, 14px gaps, 16px padding each side.
ok('columns at the panel\'s widths', [columnsIn(200), columnsIn(360), columnsIn(1600)], [1, 2, 9]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
