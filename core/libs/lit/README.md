# Lit 3.3.3

The suite's components are custom elements written with Lit (docs/decisions.md,
2026-11-03; CLAUDE.md, rule 8). One version, copied here by
`scripts/vendor-lit.mjs`, never fetched at run time. BSD-3-Clause, Google LLC —
`LICENSE`, and the bundle's own header.

    import { LitElement, html, css } from '../../core/libs/lit/lit-all.min.js';

A component renders into the page's DOM (`createRenderRoot() { return this; }`):
theme.css draws it, and the checks find its classes.

| file | bytes | from | sha256 |
|---|---|---|---|
| `lit-all.min.js` | 29370 | https://cdn.jsdelivr.net/gh/lit/dist@3.3.3/all/lit-all.min.js | `e14e8c5cece98af1f21c737187763f51fa4efba87be1641916d9bf475472bcb9` |
| `LICENSE` | 1517 | https://cdn.jsdelivr.net/npm/lit@3.3.3/LICENSE | `45d31799d0db956cc3eb5469346abbd9b7025babc5ff29fab10d7095da992ef1` |
