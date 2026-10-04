# Field Workspace verification

**Release:** 0.3.6 · Spanvision infra · Windows x64 · 3 October 2026

Browser checks passed: **89 recorded checks**, with no page errors or upstream update requests. The delivered native application passed **6 runtime checks**. All **3 Rust migration tests** passed. TypeScript/Vite builds, Tauri/NSIS packaging and shared branding consistency checks passed.

## Responsive and visual checks

The Field project, floor-plan, survey, BIM, inspection, handover, dashboard, export, integrations and manual screens were captured at **320, 390, 820 and 1440 pixels**. The suite landing, launcher, suggestions, login, sign-up, account and scan dialog were checked at the same widths. These checks found no page-level horizontal overflow or horizontally clipped main controls. Dialog bounds, keyboard containment, focus return, visible focus, grayscale hover/selection/disabled states and saved theme/canvas preferences were verified.

**76 final screenshots** cover responsive screens, ticket dialogs, generated reports and the native application. Desktop, mobile dialog, integrations, BIM, suite account and photography captures were visually inspected. Natural-color photography, imported floor-plan annotations, model materials and signature rendering remain independent of interface styling.

## Functional checks

- Legacy JSON import, project saving/reopening and IndexedDB photo/floor-plan hydration passed in isolated browser and native profiles.
- Ticket editing, checklist inspection completion, drawn signatures and signed handover completion passed. A completed handover updated the associated ticket status.
- Standalone JSON roundtrip and BCF export passed. Report output and BCF fallback identity were audited for Field/Spanvision branding.
- Mocked connector requests retained original ERP fields and authorization headers. Native filesystem write/read and native HTTPS access passed separately.
- Browser and packaged-native IFC viewers each rendered the sample model's six objects from the bundled WASM.
- Real WebView2 profile migration preserved the project, media, signature, French language, Light theme and #424242 canvas preference. The legacy profile remained present. Rust tests verified existing-destination protection and locked-source rollback followed by successful retry.
- Native executable metadata reports Field Workspace and Spanvision infra; the installer reports Field Workspace. FW SVG, favicon and native assets replaced application-owned upstream marks. Attribution and compatibility identifiers remain in their documented locations.

## Delivery and practical limits

The Windows executable and NSIS installer are **unsigned**. The packaged executable was launched and tested; the installer was compiled successfully but was not installed into the user's normal application profile. A Microsoft Edge WebView2 runtime is required for the Windows application.

Account and scan screens remain companion previews. Live ERP credentials and production connector endpoints were not used; connector payload compatibility was exercised with mocks. Browser connectors retain ordinary CORS restrictions. Android packaging and public cloud hosting are outside this release.

Evidence: `results.json`, `native-smoke-results.json`, `native-build-results.json`, `native-tests.log`, the screenshot PNGs and sample JSON/BCF/report exports in this directory. Automated coverage is a regression check, not a claim of complete accessibility certification.

Preview URLs: http://127.0.0.1:4245/ and http://127.0.0.1:4230/#modules.

Source architecture: `spanvision-field-workspace/ARCHITECTURE.md`. Distributed attribution, modification notices and dependency licenses are available from the information button and packaged `legal` directory under the declared CC BY-SA 4.0 terms.
