# Verification — Calc workspace 0.13.0

Verified on 2 October 2026 from `calc-workspace`, extracted independently from the supplied archive.

## Completed

| Check | Result | Evidence |
| --- | --- | --- |
| Frontend TypeScript | Pass | `qa/typecheck.log` |
| Frontend lint | Pass | `qa/lint.log` |
| Existing tests and edition tests | 571 passed, 6 skipped; 70 test files passed, 1 skipped | `qa/tests.log` |
| Production web build | Pass | `qa/build.log` |
| Embed build and declarations | Pass | `qa/embed-build.log`; preferred `CalcWorkspace` export plus compatibility alias |
| MCP TypeScript and bundle | Pass | `qa/mcp-typecheck.log`, `qa/mcp-build.log` |
| Embed package contents | Pass, npm pack dry run | `qa/embed-package.log`; edition README, source notices, font notices |
| Branding audit | Pass | `npm run brand:validate`; translations, samples, SVGs, docs, production and embed JavaScript |
| Browser UI | 59 checks passed | `qa/browser-results.json` |
| Embed behavior | 5 checks passed | `qa/print-embed-results.json` |
| Browser PDF print | Pass, 3 pages, extracted estimate total 40,562.35 | `output/pdf/sample-estimate.pdf`, `qa/pdf-results.json`; rendered pages visually inspected |
| Calculation source parity | 3/3 modules unchanged from the supplied archive | `qa/engine-parity.json` |
| Reports dependency | Correct revision, clean checkout | `3a5fa40abdb443fc56ab306bbd82b6b0be5f47eb` |
| Native brand/migration module syntax | Pass, standalone Rust metadata compilation | `qa/native-brand.log` |
| CW assets | SVG, PNG, ICO and ICNS generated | `src/assets/app-icon.svg`, `src-tauri/icons/` |

The test suite exercises calculations, formulas, undo/redo, document state, importers and export round trips. The original test baseline failed on an unavailable external ÖNORM fixture and an unbounded-worker timeout. External fixture suites now register explicit skips when their data is absent; the test script uses two workers. External schema checks also require their original Python/XSD setup.

UI flows were inspected at **390 × 844**, **820 × 1180**, and **1440 × 900**: start sidebar, workspace, settings, search/replace dialog, and report preview. About and embedding screens were captured at desktop width. Checks cover page overflow, dialog fit, mobile title spacing, keyboard focus, fresh monochrome defaults, saved light and legacy blue themes, inherited branding, and uncaught errors. Startup and report preview make no external network requests. Grid, ribbon, tabs, and wide paper retain contained scrolling.

Screenshots are in [screenshots](screenshots/). The running production preview is [http://127.0.0.1:4225](http://127.0.0.1:4225/); the embedding example is on port 4226. These are local processes and stop when their sessions end.

## Native limitation

`cargo check` was attempted after restoring the reports dependency. It failed before checking the full application: the MSVC linker `link.exe` is unavailable, and the installed Rust toolchain also emitted metadata-stub errors. Full diagnostics are in `native-check.log`.

The desktop executable/installer was therefore **not built or launched**. Native title rendering, first-launch settings migration, OS file associations/opening, local REST/WebSocket execution, and Rust/Typst PDF output remain unverified at runtime. The new identity/association metadata and icons have been prepared; the settings module compiles to Rust metadata and its migration test is present, but that test could not be linked here. The browser-printed PDF is a separate verified path.

Production builds retain existing warnings about large viewer/importer chunks and browser-externalized Node modules used by legacy importer dependencies. This work does not rewrite those importers.

## Attribution and compatibility audit

Original promotional screens, feeds, screenshots, and active publishing/issue workflows are excluded from the edition's application and current documentation. Required source records remain under `docs/source-provenance/` and `NOTICE.md`. Native Rust crate/submodule names, file/storage namespaces, IFC property names, and compatibility embed exports retain necessary technical identifiers. User company names, logos, imported content, document formatting colors, and model materials are preserved.
