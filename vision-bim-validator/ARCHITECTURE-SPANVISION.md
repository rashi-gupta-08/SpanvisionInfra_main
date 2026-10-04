# Vision BIM Validator — architecture plan

Organization: Spanvision Infra. Product: Vision BIM Validator. Theme: Spanvision Mono.

## Existing system

The supplied archive contains a React 18 / TypeScript / Vite frontend in `viewer`, a FastAPI validation server in `server`, and an IFC/IDS validation engine in `src/ifc_validator`. The existing desktop workflow uses a title bar, ribbon, resizable model/property panels, That Open Engine 3D viewer, validation results, and BCF import/export. Account identity comes from an authentication proxy and optional OIDC, rather than a local password database. A separate static mockup is not the running application.

## Implementation boundaries

1. Centralize organization/product identity in `viewer/src/config/brand.ts` and a reusable SI monogram. Replace application titles, translations, icons, metadata, integration labels, report identity, and links. Keep upstream attribution in `THIRD_PARTY_NOTICES.md`; never claim authorship of third-party engines.
2. Replace shared theme tokens with the exact requested grayscale palette. Retain semantic pass/fail/warning colors, model materials, section axes, typography, layout, and animation timings. The actual WebGL scene background uses the canvas preference, defaulting to #1B1B1B.
3. Keep `/` and `/viewer` as the existing BIM workspace. Add `/home` as a branded landing page, `/login`, `/signup`, and `/account` as branded gateways to configured authentication. Keep `/validate` for the existing validation flow and `/help` for local product guidance. Do not simulate account creation or successful scans.
4. Migrate settings from the old storage namespace without deleting original values. Normalize retired theme IDs to Spanvision Mono. Preserve language, model caches, project files, and canvas preferences. Avoid renaming IndexedDB databases without a migration.
5. Replace upstream authentication/feedback destinations with explicit environment configuration. Anonymous local viewing remains available. Missing integrations produce clear setup states instead of contacting former operators.
6. Retain the desktop panel layout. At smaller widths, provide touch-friendly Models / Canvas / Checks navigation with one readable panel at a time; keep ribbon commands horizontally scrollable within their container. Fit dialogs to the viewport and preserve their keyboard workflows.

## Verification and delivery

Build the production frontend and run existing frontend tests. Add focused tests for settings migration and modal focus behavior. Inspect landing, workspace/canvas, validation flow, suggestions/results, file/settings dialogs, login, sign-up, and account at mobile (390px), tablet (820px), and desktop (1440px), including overflow, text contrast, focus, hover, selected controls, and navigation. Exercise a real sample IFC and IDS validation if the Python backend dependencies are available. Deliver the edited source, a packaged source archive, screenshots, and a running local preview. Record external services that still need deployment configuration.
