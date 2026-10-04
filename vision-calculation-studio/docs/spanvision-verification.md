# Verification — 2 October 2026

## Build

Core TypeScript, the desktop React frontend (TypeScript + Vite), and the shared web frontend build successfully. The supplied inconsistent npm lockfile was repaired. SI-branded native icons were regenerated with the existing Sharp/Tauri tooling. The native installer and optional Rust PDF engine were not built during this UI change.

The Vite production web bundle is served locally on port 3023 and receives a separate browser smoke check. Vite reports a large main chunk (the existing calculation/editor dependencies); this is a build warning, not a failed build.

## Browser inspection

Chrome checks cover desktop 1440×960, tablet 768×1024, and mobile 390×844. Screens include project details, the base-plate visual designer and drawing canvas, calculation editor, theme dropdown/settings, file-menu About screen, print preview, and IFC viewer. Screen captures are in `artifacts/` when verification is run.

Assertions cover the exact page/ribbon/input/canvas palette; readable report headings; no horizontal page overflow; no overlap between designer controls and the footer; absence of the old product identity in visible screens; persistent Mono and legacy Night preferences; cancellation of live theme preview; keyboard focus visibility and containment within dialogs; and downloaded calculation files carrying Spanvision Infra / Vision Calculation Studio metadata.

Run `npm run verify:ui` with the preview running. Set `PREVIEW_URL` to test another local server. Chrome must be installed.

## Existing calculation regression suite

Eight of ten original checks pass. `check-balklaag.mjs` and `check-projectvariabelen.mjs` fail in both the modified app and an untouched copy extracted from the supplied ZIP. All 61 beam-check failure lines and all three project-variable conflicts match the untouched baseline exactly. No calculation formulas were changed.

The project-variable check reports duplicate `CC`, `RC`, and `DesignLife` inputs in `projectMetadata.ts`. The beam check reports reference mismatches in several timber floor-beam examples. These are existing upstream failures and are retained for a separate engineering correction.

## Supplied scope

The source has no landing page, scan dialog, login, sign-up, account flow, or business photography. These screens were not fabricated. Engineering drawing colors, map imagery/attributions, document formats, existing font families and ribbon animations remain in place. Printable reports retain white paper.

## Provenance

Product-facing upstream logos, initials, names and promotional links were replaced. Factual source provenance, upstream dependency identities and the supplied copyright/license information remain in `NOTICE`, the upstream README and downloadable notices. The supplied archive did not contain the `LICENSE` file referenced by its README.
