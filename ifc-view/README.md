# geptechniek workspace · IFC

[![geptechniek workspace · IFC CI](https://github.com/spanvisioninfra-bot/IFC-View/actions/workflows/ci.yml/badge.svg)](https://github.com/spanvisioninfra-bot/IFC-View/actions/workflows/ci.yml)
[![Vercel Production](https://github.com/spanvisioninfra-bot/IFC-View/actions/workflows/vercel.yml/badge.svg)](https://github.com/spanvisioninfra-bot/IFC-View/actions/workflows/vercel.yml)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fspanvisioninfra-bot%2FIFC-View)

**geptechniek workspace · IFC by Spanvision infra** is a desktop application for opening, inspecting, and sequencing IFC building models. IFC parsing and 3D rendering run locally on the user's computer.

The current development version is **0.1.0**. The first stable Spanvision infra release will be tagged **v1.0.0**.

## Product scope

- Open local `.ifc` files with drag and drop or the file picker.
- Inspect model geometry, properties, materials, and element identifiers.
- Group model elements by an IFC property and play the groups as a construction sequence.
- Isolate, hide, select, and frame model elements in the 3D viewport.
- Keep loaded model data on the local machine. The application does not require accounts, analytics, or remote model storage.

## Architecture

```text
apps/desktop             SolidJS desktop interface and Tauri shell
packages/ifc-core        IFC parsing, property extraction, sorting, and sequence state
packages/viewer-engine   Three.js scene, camera, selection, and material presentation
brands/spanvision        Product identity and reusable brand configuration
```

The core packages do not depend on Tauri. They can be reused by another interface, including a future web viewer, without moving the IFC algorithms back into the desktop application.

## Visual system

geptechniek workspace · IFC uses the **Spanvision Mono** theme:

- Page background: `#000000`
- Surfaces: `#121212`, `#1B1B1B`, `#202020`
- Primary text: `#FFFFFF`, `#EEEEEE`
- Supporting text: `#999999`
- Borders and focus states: translucent white
- 3D workspace canvas: `#1B1B1B` by default

The interface and 3D construction states use neutral grayscale values. Model geometry remains legible through surface contrast, opacity, outlines, and selection emissive states. The appearance menu stores the selected workspace canvas shade locally and restores it on the next launch.

## Development

Requirements:

- Node.js 24
- pnpm 11
- Rust stable and the platform prerequisites listed by Tauri for native builds

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Run the native desktop application with:

```bash
pnpm tauri dev
```

## CI/CD

GitHub Actions runs brand validation, type checking, linting, tests, the web production build, and native Windows and Linux builds for pushes and pull requests targeting `main`.

After CI succeeds on `main`, the Vercel production workflow builds and deploys the web application. Configure these repository secrets under **Settings → Secrets and variables → Actions**:

- `VERCEL_TOKEN`: a Vercel access token
- `VERCEL_ORG_ID`: the `orgId` from the linked Vercel project
- `VERCEL_PROJECT_ID`: the `projectId` from the linked Vercel project

The deployment URL is written to the Vercel workflow summary after every successful production deployment. The repository-level [vercel.json](vercel.json) keeps the monorepo build configuration consistent between dashboard and CI deployments.

Pushing a `v*` tag runs the native release workflow and creates a draft GitHub release containing the desktop bundles.

## Release numbering

Development builds use `0.x.y`. Spanvision infra's first production release starts at `v1.0.0`; the imported upstream version is recorded only as source provenance and does not determine the Spanvision product version.

## License and provenance

geptechniek workspace · IFC is distributed under the LGPL-3.0 license. See [LICENSE.md](LICENSE.md) and [NOTICE.md](NOTICE.md) for the license and required source provenance. Legacy project names are confined to the legal notice and do not appear in the product interface, application assets, package identity, or release name.
