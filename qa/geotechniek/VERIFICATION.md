# Spanvision infra — Geotechniek verification

Verified on 3 October 2026. Product: **geptechniek workspace · Geotechniek**. Theme: **Spanvision Mono**. Mark: **GW**.

- Existing frontend engineering tests: **156 passed**, across 18 test files.
- Geotechniek browser scenarios: **40 passed** at 320, 390, 820 and 1440 px.
- Hub landing, scan, suggestions, login, sign-up and account scenarios: **32 passed** at the same widths.
- Suite integration smoke checks: **14 passed**, including all six requested editor previews at desktop width.
- Browser checks cover overflow, controls, focus containment/restoration, drawer Escape behavior, import dialogs, fresh and saved themes, saved language/extensions, retained chart colors and an unfiltered customer logo.
- Windows executable and NSIS installer built with the dependency lockfile. Six native tests passed, including distinct report pages, Unicode fonts/CMaps and preference migration: fresh copy, missing-key merge, newer-setting preservation, original-profile preservation and one-time behavior.
- REST/MCP checks: **13 passed**. Includes branded service identity, compatible MCP tool names, GEF/BRO-XML/IFCGEO imports, project round trips, customer artwork and report generation.
- Three report paths were generated and all 15 PDF pages rendered. Exact PDF creator/producer metadata, distinct tenant pages, Unicode customer text and horizontal text bounds passed. Rendered pages and responsive browser screenshots are included for visual review. Windows Poppler reports two unused display-font alias warnings for the single-CPT fixture; its actual fonts are Helvetica/Helvetica-Bold and the pages render correctly.
- Warehouse revision: `6e8738c075719e2fc8fcf918d969406f98927b07`. Native Cargo.lock dependency resolution is unchanged; only the root package name changes. All original MCP tool names match the supplied archive.

## Local previews

- Suite: http://127.0.0.1:4230/
- Geotechniek: http://127.0.0.1:4235/

## Delivery

The windows/ directory contains the executable, matching WebView2 loader, tenant resources and NSIS installer. SHA256SUMS.json identifies the binary artifacts. The editable suite source ZIP and its manifest are under D:/SpanvisionDelivery. Downloaded Speech model weights are omitted from the source archive and remain untouched in the workspace.

## Practical limits

Account and OCR screens remain labeled local demonstrations. Passwords are discarded; account edits are session-only. Browser report generation and native layer detection require the Windows application. Experimental engineering and IFC export labels remain; the placeholder IFC4x3 writer is not promoted as schema-certified. The Windows build is unsigned. Native window sizing retains its existing 600 px minimum; the four narrow-width checks use the browser frontend. Executable identity, icon assets, packaged resources and native report generation were inspected. Live native window inspection could not run because the Windows UI helper returned a missing kernel-assets path after retry and reset. The installer was built and inspected; installation on another Windows machine remains an end-user step.

Detailed results, screenshots, report renders, source provenance and migration logs accompany this document.
