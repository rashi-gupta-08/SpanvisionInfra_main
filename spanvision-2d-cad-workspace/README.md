# 2D CAD

**Spanvision Infra · Web edition**

An open source browser workspace maintained for Spanvision Infra. React,
TypeScript, Zustand, and the Canvas 2D CAD engine power the editor. No server or
account is required. Desktop packaging is outside this edition.

## Run locally

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Use `npm run build` for static `dist/` output,
then `npm run preview`. Serve over HTTP(S); do not open index.html directly.
Browser storage is specific to the browser and origin, including preview port.

## Flow

Start → **New drawing**, **Open file**, or **Restore draft** → workspace →
**Save to file** or **Download .o2d** → export.

Restore appears only when a draft exists. `.o2d` stays compatible. Open/import
DXF geometry and SVG sheet templates; export DXF, SVG, IFC4, JSON, and PDF using
the retained exporters. Project files retain drawings, layers, sheets, units,
and libraries.

Chromium browsers with File System Access can choose a file and save back to it
during the session. Other browsers download a copy. Handles are isolated per
document and are never stored in a draft. After recovery, choose a save location
again. Unsaved-changes dialogs offer Save/Download, Close without saving, Cancel.

## Spanvision Mono

Default: black backgrounds, #121212/#202020 controls, #1B1B1B canvas,
white/#EEEEEE primary text, #999999 supporting text, and translucent white
borders/focus states. Layout, typography, tools, and entity colors are retained.
Saved theme and white-canvas choices take precedence; alternate themes remain.

## Architecture

- `src/config/brand.ts`: organization, product, edition version.
- `src/components/web/WebApp.tsx`: start flow and editor selection.
- `src/services/web/draftStorage.ts`: IndexedDB project/markup snapshots.
- `src/services/web/browserSession.ts`: debounced recovery and restoration.
- `src/utils/settings.ts`: existing preference API with browser localStorage.
- `src/services/web/dialogService.ts`: queued native HTML dialogs.
- `src/services/file/projectSnapshot.ts`: complete editable serialization.
- `src/state/reviewStore.ts`: markup per document and drawing.
- `src/services/web/reviewExport.ts`: drawing + markup PNG composition.

Drafts save after 800 ms of inactivity and on document switches. They are recovery
copies. Download files for durable copies; clearing site data or private browsing
can remove drafts/preferences. Legacy recovery data migrates to IndexedDB without
opening automatically. Storage failures are visible.

## Phone review

Phones and widths below 768 px use the touch viewer; tablets/desktops use the
editor. The initial choice stays fixed while resizing. Pan, pinch to zoom,
measure, inspect layers, and add pen/highlighter/arrow/text/cloud markup. Strokes
use drawing coordinates and recover with the draft. **Review PNG** downloads
the current view with markup, excluding controls. Markup never enters `.o2d`.

Browser UI hides updater, upstream feedback, extension catalog, Blender/Bonsai
sync, ERPNext, AI shell commands, and native printers. Diagnostic Log and PDF
download remain available.

## Brand configuration

`src/config/brand.ts` is the shared source for the product, organization,
application identifier, version, and IFC metadata. About screens, export producer
labels, SDK documentation, and bundled application/document icons use this
identity. Custom IFC annotation property sets use the `SpanvisionInfra` prefix;
standard IFC entities and `.o2d` project data are unchanged.

Run `node scripts/generate-brand-icons.mjs` to regenerate application and document
icons from `public/logo.svg`. The inherited desktop packaging metadata carries
the same identity; desktop distribution remains deferred and has not been built.

No upstream extension, feedback, or update service address is configured. Optional
organization service URLs can be supplied through
`VITE_SPANVISION_EXTENSION_CATALOG_URL` and `VITE_SPANVISION_FEEDBACK_URL` for
future desktop work. These services remain hidden in the browser edition.
The active GitHub workflow verifies the browser build. Inherited release and
deployment workflows are preserved as inactive references in `docs/upstream-build`.

Internal legacy storage keys and extension aliases remain for compatibility with
existing preferences and bundles. WeFC standard schema identifiers are retained
for interoperability. Original names and copyrights are documented in the source
attribution files accessible from About.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Browser QA artifacts and exercised flows are recorded in `qa/README.md`.

## License

See [LICENSE.md](LICENSE.md) and [notices](public/NOTICE.md). About links the
Legal and licenses page, including the source license and original attribution.
Historical development documents are archived outside the application under
the workspace's `source-provenance/` directory.
