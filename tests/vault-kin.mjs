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

// How many columns the grid has: 150px cards, 14px gaps, 16px padding each side —
// or at the density a host set: cluster's vault, 50px pictures, 6px gaps, 8px padding.
ok('columns at the panel\'s widths', [columnsIn(200), columnsIn(360), columnsIn(1600)], [1, 2, 9]);
ok('…and at a density a host set', [columnsIn(244, { card: 50, gap: 6, pad: 8 }), columnsIn(190, { card: 50, gap: 6, pad: 8 })], [4, 3]);

// A set filed with the folder holding exactly its members — the legacy grid's: a folder of tiles, a set of them.
const { filedWith } = await import('../core/vault-folder.js');
const tile = (id, folder) => ({ id, type: 'shape', tags: ['folder:' + folder] });
const T1 = tile('T1', 'stones'), T2 = tile('T2', 'stones'), T3 = tile('T3', 'tiles');
const set = (id, members, tags = []) => ({ id, type: 'set', tags, members });
const SAME = set('SAME', ['T2', 'T1']), SOME = set('SOME', ['T1']), BOTH = set('BOTH', ['T1', 'T3']),
  OWN = set('OWN', ['T1', 'T2'], ['folder:earlier materials']), OLD = set('OLD');
const fileOf = filedWith([SAME, SOME, BOTH, OWN, OLD, T1, T2, T3]);
ok('a set of exactly a folder\'s members is filed with them', fileOf(SAME), 'stones');
ok('…one of some of them, or of two folders\', is not', [fileOf(SOME), fileOf(BOTH)], [null, null]);
ok('…one with a folder of its own keeps it; one from an older index stays loose', [fileOf(OWN), fileOf(OLD)], ['earlier materials', null]);
ok('…and where its members are not shown — a picker of sets — it is not', filedWith([SAME, OWN])(SAME), null);
const filed = arrange([SAME, T2, T1], [SAME, T2, T1], { kin: true, folderOf: fileOf });
ok('…arranged, it is in their folder, not beside it', filed.map(i => i.folder ? i.folder + ':' + i.rows.map(r => r.id) : i.row.id), ['stones:SAME,T2,T1']);

// The app's own first, then the rest: a kin holding one of the app's with the app's, so the parts never mix.
const { ownFirst, holds, madeBy } = await import('../core/vault-kin.js');
const by = (r, app) => ({ ...r, origin: { app } });
const mixed = [by(USER, 'compose'), by(LIVE, 'particles'), by(L, 'rig/puppet'), by(C, 'grid'), by(B, 'particles'), by(A, 'grid')];
const order = ownFirst(mixed, 'particles');
ok('the app\'s own first, newest first in each part', [order.rows.map(r => r.id), order.own], [['LIVE', 'B', 'USER', 'L', 'C', 'A'], 2]);
const parts = arrange(order.rows, mixed, { kin: true, folderOf: () => null }).map(i => holds(i, 'particles'));
ok('…arranged, every item holding one of its own before every item holding none', [parts.indexOf(false) === parts.lastIndexOf(true) + 1, parts],
  [true, [true, true, false]]);
ok('…the rig\'s puppet made by the rig', madeBy(by(L, 'rig/puppet')), 'rig');

// Groups by hand (vault-groups.js, V3): a folder tag, one at most, its name made sure of.
const { regroup, groupsIn, groupName } = await import('../core/vault-groups.js');
ok('a group\'s name, trimmed, its spaces one', groupName('  bec   2027 '), 'bec 2027');
ok('into a group: its folder tag, any other let go of', regroup({ tags: ['x', 'folder:old'] }, 'new'), { add: ['folder:new'], remove: ['folder:old'] });
ok('…already in it: nothing changes', regroup({ tags: ['folder:new'] }, 'new'), { add: [], remove: [] });
ok('…out of every group, none named', regroup({ tags: ['folder:a', 'y'] }, ''), { add: [], remove: ['folder:a'] });
ok('the groups there are, by name', groupsIn([{ tags: ['folder:b'] }, { tags: ['folder:a'] }, { tags: [] }, { tags: ['folder:b'] }]), ['a', 'b']);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
