# Spanvision verification

Verified locally on 3 October 2026. Source: the user-supplied archive, edited in this directory. The original archive is unchanged.

## Result

- Production TypeScript/Vite build passes. The landing/account bundle is loaded separately from the heavier BIM workspace.
- 67 focused tests pass across API client, BCF exporter/types, saved preferences, and modal accessibility. Seven are new tests for this work.
- Real IFC/IDS validation passes for `test/sample.ifc` and fails correctly for `test/sample-fail.ifc`. The failed wall naming requirement produces relevant next-step guidance.
- `test/2786_CLT_model.ifc` renders in the browser with its original material colors. No original operator or engine watermark is visible.
- Local export produced `Spanvision Model Review.zip`, containing `project.json` and the complete 7,204,498-byte IFC model. New exports identify the application as `vision-bim-validator`.
- Python source compilation passes. The frontend and API run together on localhost using the production build.

## Responsive and accessibility checks

The following surfaces were inspected at 390 × 844, 820 × 1180, and 1440 × 1000:

| Surface | Result |
|---|---|
| Landing | Readable navigation, stacked mobile content, no page overflow |
| Login, sign-up, account | Readable copy and actions; honest provider-configuration state |
| Upload/scan | Readable inputs and scan controls, no page overflow |
| Failed results and suggestions | Real failed requirement and guidance remain readable at all widths |
| IFC drawing canvas | Full-width mobile/tablet pane; original three-panel desktop workflow |
| Settings dialog | Fits within viewport, grayscale surfaces, visible selected states |
| Open and save dialogs | Fit within viewport, readable controls, accessible modal behavior |

The ribbon scrolls within its own container on small screens. Models, Canvas, and Checks navigation selects the mobile/tablet pane while retaining the canvas. Desktop panel resizing is preserved. Screenshot and measurement evidence is in `preview/`, including `responsive-audit.json`.

The main canvas defaults to #1B1B1B. A custom #303030 color was applied, observed in the renderer, and confirmed after reopening settings; the preview was restored to #1B1B1B. The primary button is white with black text, and keyboard focus uses rgba(255, 255, 255, 0.65). Modals have accessible labels, initial focus, Tab containment, focus restoration, and topmost-only Escape handling. Original language and canvas preferences migrate without deleting their old records.

## Test commands

```powershell
cd viewer
npm run build
npx vitest run src/utils/settingsStore.test.ts src/components/chrome/Modal.test.tsx src/api/client.test.ts src/components/bcf/__tests__/BcfExporter.test.ts src/components/bcf/__tests__/bcfTypes.test.ts --maxWorkers=1
```

The complete inherited suite was also run against both the edited app and the untouched extracted source using the same dependencies. Both reproduce 22 failures: four IDS selector tests, four results summary tests, and fourteen BCF store tests using outdated APIs. Both also exhaust the test worker's heap before 23 remaining tests complete. The baseline reports 135 passing tests; this version reports 142, including the seven new passing tests. These failures are documented rather than represented as a passing complete suite. Raw reports are `verification-upstream-results.json` and `verification-frontend-results.json`.

## Deployment boundaries

Organization SSO, registration, feedback, and Nextcloud/BCF services need Spanvision endpoints and credentials before deployment. Former-operator defaults were removed. Login/sign-up are provider gateways; no local password or account creation service was fabricated. Guest local viewing and exports work. The inherited clash-detection feature remains unavailable.

The archive contains no business photography. IFC materials, drawing/highlight colors, and semantic pass/fail colors were retained. The heavy BIM engine bundle still triggers the existing size warning. Docker configuration was updated for Node 22 and the required source notices, but a Docker image was not built in this session. Source attribution and dependency notices are preserved in `THIRD_PARTY_NOTICES.md`.
