# Edition validation — 2 October 2026

## Passed

- Frontend typecheck and production multi-entry Vite build (native preparation bypassed).
- A separate production preview smoke test loaded the built landing entry and opened/rendered a real PDF in the built editor with no browser errors.
- Existing frontend unit tests: **2,520 passed**, four pre-existing skips, no failures.
- Existing quality tests: **23 passed**.
- Edition preference migration/startup/theme/service regressions: **6 passed**.
- Playwright in Edge: **28 scenarios passed** across 390px, 768px and 1440px. Landing, login, sign-up, account, suggestions, scan progress/completion, cancellation, real assistant and editor views were inspected. Screenshots and the detailed report are in ../qa/.
- Browser PDF opening, rectangle annotation, distance measurement, keyboard undo/redo, download/save and reopening the saved PDF. Annotation colors and original blue/red PDF drawing content were preserved; saved Creator/Producer identify the edition.
- Resize preserves the same canvas node. Page/property panels toggle, mobile ribbon actions remain within the viewport, keyboard focus stays in the scan dialog and returns after closing. Touch taps were exercised on scan, cancellation, file opening, pages and ribbon overflow controls.
- Saved light theme, custom canvas color and drawing preferences migrate without deleting the old browser record.
- Rust storage migration: **2 tests passed**, covering nested assets, empty destinations, missing sources and preservation of newer settings/source data. Changed Rust source files parse successfully. These checks ran through the available Linux Rust toolchain.
- Rust CAD crate: cargo check --locked -p open-pdf-cad passed through the Linux Rust toolchain.
- Branded title block and A3/A4/cover sheets were rendered and visually inspected. Paper boxes, original scale dictionaries and the twelve editable title-field identifiers are retained. Resource PDF text and visible browser screens pass the upstream-brand audit.
- npm/Tauri manifests match brand.json. SV application/file/installer icons are generated. Upstream public destinations and auto-deployment/issue assignment are inactive; release workflows require an explicit repository setting.

## Pending Windows runtime checks

The host's Rust MSVC toolchain cannot find link.exe. cargo check --locked -p open-pdf-studio stops while linking dependency build scripts, before checking the Tauri application. The log is ../qa/windows-native-check.log. Install Visual Studio Build Tools with Desktop development with C++ and a Windows SDK, then run the Windows commands in ../README.md.

An updated Windows executable/installer has **not** been produced. Native OCR recognition, CAD import in the app, printing, installed file associations, Windows storage migration and installer launch still require validation in that Windows build. Existing engines and native binaries are retained; Linux CAD checks and browser tests do not prove these Windows runtime behaviors.

Account and browser OCR screens are local prototypes as requested. No hosted account service, scanner-device integration or public deployment was created.
