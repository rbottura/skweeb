/**
 * tests/reach.mjs — run with: node tests/reach.mjs
 *
 * Covers scripts/reach.mjs on a tree of its own (C10): a page loads what it
 * imports all the way down — a module's imports and re-exports, an
 * `import()` with a comment before its string, a stylesheet's `@import`, a
 * page's inline module and its `<script src>` — so a file reaches the pages
 * that come to it, and the checks that open them; what an app's rebuild.js
 * comes to reaches every check, as do the check kit, the server, a file gone
 * and one of no kind known; a check's own file reaches it; the docs and the
 * tests reach none; a check naming no page, or opening apps from a table,
 * opens every page.
 */

const { reach, imports } = await import('../scripts/reach.mjs');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

const files = new Map(Object.entries({
  'apps/a/index.html': `<link rel="stylesheet" href="./style.css">
    <script type="module">import { mount } from './main.js'; mount(document.body);</script>`,
  'apps/a/style.css': `@import '../../core/theme.css';`,
  'apps/a/main.js': `import { ui } from './ui.js';\nimport { Bar } from '../../core/Bar.js';`,
  'apps/a/ui.js': `export const ui = 1;`,
  'apps/a/rebuild.js': `import { frames } from './frames.js';`,
  'apps/a/frames.js': `import { rng } from '../../core/rng.js';`,
  'apps/a/data.json': null,
  'apps/b/index.html': `<script type="module" src="./main.js"></script>`,
  'apps/b/main.js': `import '../../core/Bar.js';\nconst lazy = () => import(/* @vite-ignore */ '../../core/lazy.js');`,
  'core/Bar.js': `export { thing } from './thing.js';`,
  'core/thing.js': `export const thing = 1;`,
  'core/rng.js': `export const rng = 1;`,
  'core/lazy.js': `export default 1;`,
  'core/theme.css': `:root {}`,
  'scripts/check-page.html': `<script type="module" src="/core/lazy.js"></script>`,
  'scripts/check-kit.mjs': `export {}`,
  'docs/plan.md': null,
  'tests/x.mjs': `import '../core/rng.js';`,
  'server.js': `import http from 'node:http';`,
}));
const checks = [
  { name: 'a', file: 'scripts/check-a.mjs', source: `await c.go(c.base + '/apps/a/');` },
  { name: 'b', file: 'scripts/check-b.mjs', source: `await c.go(c.base + '/apps/b/?open=' + id);` },
  { name: 'gpu', file: 'scripts/check-gpu.mjs', source: `const PAGE = c.base + '/scripts/check-page.html';` },
  { name: 'print', file: 'scripts/check-print.mjs', source: `for (const [app] of APPS) await c.go(c.base + '/apps/' + app + '/');` },
  { name: 'loose', file: 'scripts/check-loose.mjs', source: `// opens nothing it names` },
];
const reached = (...changed) => [...reach({ files, checks, changed }).checks.keys()].sort();

ok('the imports, resolved, git\'s only', [...imports(files).get('apps/a/main.js')].sort(), ['apps/a/ui.js', 'core/Bar.js']);
ok('an inline module, and a stylesheet', [...imports(files).get('apps/a/index.html')].sort(), ['apps/a/main.js', 'apps/a/style.css']);
ok('an app\'s own module: its page, and the checks of every page', reached('apps/a/ui.js'), ['a', 'loose', 'print']);
ok('a re-export followed: both pages', reached('core/thing.js'), ['a', 'b', 'loose', 'print']);
ok('a stylesheet\'s @import followed', reached('core/theme.css'), ['a', 'loose', 'print']);
ok('an import() with a comment before its string: its pages', reached('core/lazy.js'), ['b', 'gpu', 'loose', 'print']);
ok("what an app's rebuild.js comes to: every check", reached('core/rng.js'), ['a', 'b', 'gpu', 'loose', 'print']);
ok('a check\'s own file: that check', reached('scripts/check-b.mjs'), ['b']);
ok('the kit under every check: every check', reached('scripts/check-kit.mjs').length, 5);
ok('the server: every check', reached('server.js').length, 5);
ok('a file of no kind known: every check', reached('apps/a/data.json').length, 5);
ok('a file gone: every check', reached('apps/a/old.js').length, 5);
ok('the docs and the tests: none', reached('docs/plan.md', 'tests/x.mjs'), []);
const why = reach({ files, checks, changed: ['apps/a/ui.js'] });
ok('each change says what it reaches', why.changes[0], { path: 'apps/a/ui.js', reach: 'apps/a/index.html', why: 'loaded by a' });
ok('each check says why', why.checks.get('a'), 'apps/a/ui.js → apps/a');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
