# FEM Vision Studio

A Spanvision Infra branded adaptation of the supplied open-source FEM editor.

## Run the web application

Use Node.js 22 or newer. From this directory:

```powershell
npm ci
npm run dev
```

Open http://localhost:1430. The development command generates the vendored
CSS tokens before starting Vite. For a production build:

```powershell
npm run build
npm run preview
```

The static web build is in `dist/`. Browser report preview and printing use the
existing HTML report renderer. The browser uses the existing local solver
when the optional remote backend is unavailable. Rust/Tauri-specific design
checks and native file APIs still require the desktop runtime.

## Brand and interface

- Organization: Spanvision Infra
- Product: FEM Vision Studio
- Mark: SI
- Default appearance: Spanvision Mono
- Page: #000000; panels and ribbon: #121212; canvas and inputs: #1B1B1B;
  elevated surfaces: #202020; selected controls: #333333.
- Existing typefaces, animations, engineering drawing colors and FEM calculations
  are retained. The saved light preference remains available.
- Phone/tablet dock panels open over the canvas, ribbon groups scroll locally,
  and dialogs and command suggestions fit the viewport.

Brand definitions are in `src/brand.ts`, the palette is in
`src/styles/spanvision-mono.css`, and shared theme preferences are in
`src/lib/theme.ts`. See `ARCHITECTURE.md` for the implementation plan.

## Verification

```powershell
npm run test:branding
npm run build
```

The tests cover legacy theme migration, retained light settings, blocked storage,
change notifications, canvas fitting at three screen sizes and centered zoom.
Browser inspection covers desktop (1440px), tablet (768px) and phone (390px).

## Desktop

Tauri metadata and icons use the Spanvision identity and the branded root
frontend. The original application identifier remains unchanged so native saved
preferences stay in the same data directory. Native installer builds require the
existing Rust toolchain and sidecar prerequisites and have not been verified as
part of the web UI update.

`design-mockup/` is an archived upstream prototype and is not the branded app
entry point. Run the root frontend described above.

## Open-source notices

Original licenses and authorship are preserved in `LICENSE.md`,
`THIRD_PARTY_NOTICES.md`, vendored dependencies and `provenance/`. Upstream artwork
is archived under `provenance/upstream-brand-assets/` and is not served by the
webapp. `../source-provenance/fem-vision-studio/provenance/upstream-readme.md` retains the original project documentation.

## Documentation archive

Historical plans, research, logs and superseded source documentation have moved out of this tool to [the suite source archive](../source-provenance/fem-vision-studio/). Current run instructions, useful technical guides, in-app Help and required source/license notices remain with the application.
