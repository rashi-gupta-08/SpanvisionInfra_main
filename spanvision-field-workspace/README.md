# Field Workspace

**Spanvision infra · FW · Spanvision Mono**

Local construction inspections, defects on floor plans, BIM review, checklist surveys, signed handovers and reports. Adapted from Open Field Studio v0.3.6 under CC BY-SA 4.0; see legal/UPSTREAM-NOTICES.md.

Install dependencies with `npm ci`. Run `npm run dev`, or build with `npm run build`. The browser preview uses http://127.0.0.1:4245/. From the suite root, use `node branding/build.mjs field hub` and `npm run preview:suite`.

The HTML/JavaScript inspection engine, TypeScript initialization, PDF.js and lazy Three.js/web-ifc viewer are preserved. Projects use the existing JSON format, localStorage metadata and IndexedDB media. Native Tauri plugins provide dialogs, file access and connector HTTP requests. Browser connectors remain subject to the browser's cross-origin restrictions; native connectors use the original HTTP bridge.

Spanvision Mono is the default on new profiles. Existing language, theme and recorded canvas preferences take precedence. The theme button and Ctrl+D cycle through Spanvision Mono, Light and Dark. Document colors, signatures and model materials remain independent of interface styling.

The new Windows identity is `com.spanvisioninfra.fieldworkspace`. Before opening its webview, the app imports the legacy native profile only when the destination is empty. It stages the copy, checks that the source did not change, and commits atomically. Locked profiles offer Retry or Exit. Existing destination profiles and the original profile are preserved. Browser data at a different origin requires project JSON export/import. `SPANVISION_FIELD_DATA_ROOT` selects an isolated native profile parent for testing.

Run `npm run verify:field` from the suite root for browser regression checks. Build the Windows application and NSIS installer with `npm run build:field:windows`. Delivery files are written to delivery/field/windows; test results and screenshots are in qa/field. Companion scan/account screens remain previews in the suite launcher. No account service or upstream update check is enabled.
