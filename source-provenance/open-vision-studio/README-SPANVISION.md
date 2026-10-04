# Open Vision Studio

Construction planning by **Spanvision infra**, based on the supplied open-source planner.

## Run locally

Use Node 22 or later. Install dependencies with `npm ci`, then run `npm run dev`. The launcher prints the assigned localhost URL. Use `npm run build` for the production web bundle in `dist/`.

## Design

Fresh installations use **Spanvision Mono**. The canvas and inputs use `#1B1B1B`; panels and ribbon use `#121212`; the page uses black; elevated surfaces use `#202020`. Drawing colors, fonts, shortcuts, animations and previously saved theme choices are retained. The existing browser preference keys and IFC metadata identifiers intentionally remain compatible.

The supplied project has no landing, scan, suggestions, login, sign-up or account screens. The rebrand covers the existing planner, onboarding, settings, project dialogs, menus, examples and help.

See `docs/spanvision-architecture.md` for the architecture and `docs/spanvision-qa.md` for validation. The desktop identity and icons are updated, but native desktop installers have not been built or tested in this task.

## Optional services

Copy `.env.example` to `.env.local` to configure Spanvision-owned feedback/releases, extension catalogue and public documentation URLs. They are inactive by default. Desktop automatic updates also need a new signed updater configuration in `src-tauri/tauri.conf.json`; the upstream signing key and endpoint were removed.

## Open source

See `OPEN_SOURCE_NOTICES.md`, `LICENSE` and `LICENSE.GPL`. Source attribution and legal notices are retained.
