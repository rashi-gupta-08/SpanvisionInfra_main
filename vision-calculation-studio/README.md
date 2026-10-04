# Vision Calculation Studio

Structural calculation workspace branded for **Spanvision Infra**. The web and desktop frontends share the existing React ribbon, project browser, visual designers, CalcPAD-compatible editor, calculation engine, report preview and IFC exports.

## Preview and build

```powershell
npm ci
npm run build
npm run dev
```

Open http://127.0.0.1:3022. To preview the production bundle at http://127.0.0.1:3023, use `npm run preview` after building. Native desktop development uses `npm run tauri:dev --workspace=@spanvision/vision-calculation-studio` and requires the existing Tauri/Rust toolchain.

## Branding and theme

- Organization: Spanvision Infra. Product: Vision Calculation Studio. Identity: white SI span monogram.
- Default: **Spanvision Mono**, with black pages, `#121212` panels/ribbon, `#1B1B1B` drawing canvas/inputs, `#202020` dialogs/dropdowns, `#333333` selection, white primary buttons and light-gray text.
- Existing light, forge, night, blueprint and contrast choices remain available. The internal `openaec` theme ID and native app identifier remain compatible with previous preferences.
- Browser preferences persist locally. Desktop preferences use the existing `preferences.json` store. Calculation data, drawing colors and printable white paper are preserved.
- On tablet/mobile screens the project browser becomes a collapsible drawer, resizable panes stack vertically, designer controls wrap and dialogs fit the viewport.
- On phones, a pane switcher gives design/code and results the full workspace height.
- Original release/deployment/assignment workflows are archived under `docs/upstream-workflows`. The active workflow builds the Spanvision frontend without publishing to upstream infrastructure.

Read [the architecture plan](docs/spanvision-architecture.md) and [verification notes](docs/spanvision-verification.md).

## Source and open-source notices

This is a UI/branding adaptation of the supplied Open Calculations Studio archive. Upstream provenance and the supplied license information are retained in [NOTICE](NOTICE), [the upstream README](docs/UPSTREAM-README.md), and downloadable notices in each frontend. The archive references a `LICENSE` file but did not include it. Third-party dependencies and the optional upstream Rust PDF engine retain their identities and licenses.

## Documentation archive

Historical plans, research, logs and superseded source documentation have moved out of this tool to [the suite source archive](../source-provenance/vision-calculation-studio/). Current run instructions, useful technical guides, in-app Help and required source/license notices remain with the application.
