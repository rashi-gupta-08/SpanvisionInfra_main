# Spanvision white-label validation

Validated on **2 October 2026**. Live source preview: `http://localhost:3007/`.

## Delivered behavior

- Product chrome, translations, help text, browser title, exported IFC/print branding, favicon and application icons use **Open Vision Studio / Spanvision infra**.
- Fresh installs use **Spanvision Mono**. Page black; panels/ribbon `#121212`; canvas/inputs `#1B1B1B`; elevated surfaces `#202020`; selection `#333333`; white primary controls with black text; primary text `#EEEEEE`; supporting labels `#999999`; translucent white borders, hover and focus.
- Saved theme choices, `ops-` preference keys, IFC compatibility identifiers, typography, animations and task/resource drawing colors are retained. Optional upstream services are replaced with owner-configured integrations and inactive by default.
- Narrow workspaces open properties as a temporary side drawer. Settings stack their navigation, dialogs fit the viewport, ribbon tabs scroll locally and help stacks its contents on mobile. Escape closes a dropdown without closing its parent dialog; closing the mobile properties drawer restores keyboard focus.

## Browser evidence

**13 tests passed** in Chromium: `spanvision-responsive.spec.ts`, `smoke.spec.ts`, `system-theme.spec.ts` and `theme-render.spec.ts`.

| Surface | Mobile 390 × 844 | Tablet 768 × 1000 | Desktop 1440 × 1000 |
| --- | --- | --- | --- |
| Welcome/onboarding | Passed | Passed | Passed |
| Task grid and drawing canvas | Passed | Passed | Passed |
| New-project dialog | Passed | Passed | Passed |
| Settings/theme picker | Passed | Passed | Passed |
| Language dropdown | Passed | Passed | Passed |
| Examples | Passed | Passed | Passed |
| Help | Passed | Passed | Passed |

Assertions cover viewport and dialog bounds, canvas width, page and Backstage horizontal overflow, selected-state contrast, keyboard focus, menu placement, theme persistence through reload, system-theme changes, renderer invalidation and absence of upstream network requests. Intentional local scrolling remains in the task table, timeline, ribbon and dense status strip. Representative screenshots are supplied in the delivery archive under `preview/`.

Primary `#EEEEEE` text against `#202020` is approximately **14:1**; supporting `#999999` text is approximately **5.7:1** against that same elevated surface. White-button text is black. This is a palette contrast check, not a complete accessibility certification.

## Static and data validation

- Production build and app/test TypeScript checks passed.
- ESLint, all 14 locale key/format checks, documentation validation and typography-role checks passed.
- Store, Gantt, convention and import-cycle architecture gates passed.
- Theme pre-paint/default and system-theme contract checks passed.
- IFC step encoding, CRLF handling, full IFC round-trip and print-report checks passed after changing exported product identity.
- All 3 showcase projects, 20 base examples and the linked source file passed the example validator after rebranding their application metadata.
- Documentation validation reports 84 pre-existing translations with structural differences from English as non-blocking warnings.

The entire `npm run verify` chain was not run; the checks above were selected for the actual changes. Native Tauri installers were not built or tested.

## Scope limits

The supplied archive has no landing page, scan dialog, suggestions flow, login, sign-up, account screens or business photography. Those screens cannot be inspected in this codebase and were not added as invented functionality. The existing planner surfaces above were inspected instead. Authentication and Spanvision service endpoints require a separate implementation/configuration if desired.

Original license texts, source copyright/attribution and third-party notices are preserved in `LICENSE`, `LICENSE.GPL` and `OPEN_SOURCE_NOTICES.md`, with an in-app link to the bundled notices. The visible product presentation is rebranded.
