# Spanvision Infra CAD branding verification

Verified on 3 October 2026. Scope: `SpanvisionCAD` and `spanvision-2d-cad-workspace`.

## Delivered changes

- CAD and 2D CAD now use Spanvision Infra identity, with a dedicated monochrome CAD vector mark and generated desktop, installer, web, and document icons.
- Updated application labels, titles, About screens, package descriptions, and remaining visible OCS wording in all 21 native interface locales.
- CAD modules have their own overrides in the shared branding manifest, so regenerating suite branding preserves these product names and marks.
- Removed default upstream service destinations, including the default font download source. A user can configure a font server; downloads remain disabled until a source is supplied.
- Added local monochrome legal pages, accessible from website and browser About screens, with the full license and attribution links.
- Archived optional original developer instructions, historical correspondence, and build notes under the workspace's `source-provenance` directory. Renamed five original title-block template filenames to CAD names.
- Rebuilt both browser distributions and the CAD web archive. Build stamps match the current source fingerprints and branding digests.
- The site builder now removes superseded generated logo and icon files, so older marks do not remain in a rebuilt release folder or archive.

## Checks passed

| Check | Result |
| --- | --- |
| Shared branding adapters and manifests | Passed for CAD and 2D CAD |
| Native `cargo check --locked -j 2` | Passed using WSL and the existing dependency cache |
| Native branding audit | Passed: package identity, interface fallback copy, translation values, and vector assets |
| Native release-script tests | 3 passed |
| Website tests | All 21 localized pages, local links, manifests, icons, and language navigation passed |
| Browser loading locale and clipboard scripts | Passed |
| 2D CAD typecheck and lint | Passed |
| 2D CAD existing unit tests | 26 passed across 5 files |
| 2D CAD production build | Passed |
| Native editor WebAssembly production build | Passed, including the parsing worker and localized site assembly; five existing warnings |
| Existing 2D CAD browser checks | 20 passed: drawing, save/export, recovery, theme persistence, legal access, responsive layouts, and markup |
| Branding browser checks | Passed at 390, 820, and 1440 px: product branding, legal links, overflow, and no external startup requests |
| Native editor startup | Canvas loaded at 820 and 1440 px, with no JavaScript errors or external requests |
| Existing native browser automation and file checks | DWG 2018 and DXF 2018 QSAVE, SAVE, SAVEAS, denied preview capture, and save/reopen passed; reopened line geometry retained |
| Web release archive | Contains the current build stamp, editor, own logo, legal page, license, and attribution record |

Native save checks used Microsoft Edge through Playwright. The existing smoke script was run with the installed browser channel and dismissed the software graphics warning before retrying the interrupted command. This was an automated-browser accommodation; application behavior was unchanged. Test downloads and screenshots are in `native-save-check`.

## Preserved contracts and limits

- Original copyrights, licenses, and contributor attribution remain in legal records. OpenAEC attribution has been removed from product presentation, not from required provenance.
- Existing `ocs_*` automation calls, the Rust library interface, plugin ABI, drawing metadata, legacy SDK aliases and preferences, and canonical WeFC schema identifiers remain compatible. Schema identifiers are format names and do not initiate network calls.
- Drawing colors, geometry, rendering data, and imported materials were not changed by this branding work.
- The original supplied source and ZIP were preserved. Archived historical documents are recoverable outside the active CAD application directories.
- Native installers were not rebuilt in this pass. Existing native release files predate this branding update. The full native workspace test suite and Clippy were not run in this pass; native compilation and browser drawing/save checks provide the recorded verification.

## Preview and artifact

- CAD editor: http://127.0.0.1:4173/app/
- CAD website: http://127.0.0.1:4173/
- 2D CAD: http://127.0.0.1:4220/
- Updated web release: `SpanvisionCAD/artifacts/SpanvisionCAD-2026.39.0-web.tar.gz`
