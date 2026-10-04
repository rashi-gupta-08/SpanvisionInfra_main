# Spanvision infra — STL-3D map workspace

Delivery version: **1.1.1** · Verified on Windows, 3 October 2026.

The imported application preserves its FastAPI geometry pipeline, Leaflet
workspace, project schema, coordinates, layer identifiers, geometry colors,
STL/3MF formats and filament assignments. The interface, executable, API
identity, outgoing User-Agent and generated instructions use Spanvision infra
and the STL monogram. Coverage remains the Netherlands.

## Run and preview

- Workspace: <http://127.0.0.1:8765/>
- Spanvision suite: <http://127.0.0.1:4230/>
- Source: [application README](../../spanvision-stl-3d-map-workspace/README.md)
- Design: [architecture](../../spanvision-stl-3d-map-workspace/ARCHITECTURE.md)
- Delivery: [Windows files](../../delivery/stl/windows/)

Unzip the portable package and run **STL-3D map workspace.exe**, or run the
**Spanvision-STL-3D-map-workspace-1.1.1-Setup.exe** installer. Python is bundled.
Both bind to 127.0.0.1:8765. Matching instances are reused; another process on
that port produces a conflict message. The source preview starts with
`npm run preview:stl`; the full suite starts with `npm run preview:suite`.

## Verification evidence

| Check | Result and evidence |
|---|---|
| Python backend and compatibility | 8 tests passed; [backend log](backend-tests.log) |
| Deterministic geometry | STL watertightness, layer support, placement, colors, slots and 3MF metadata checked; 1,372 triangles in the export fixture; original `verify_output.py` checks passed |
| Responsive STL interface | 40 scenarios passed, zero browser errors; [results](browser-results.json) |
| Existing suite screens | 32 scenarios passed, zero browser errors; [suite results](../suite/browser-results.json) |
| Frozen Windows executable | 8 runtime checks passed; [native results](native-results.json) |
| Package integrity | ZIP integrity, SHA-256, standalone assets, fonts and legal notices checked; [artifact results](artifact-results.json) |
| Shared adapters and availability | `brand:check` passed; current source and branding fingerprints match `/__stl/status` |
| Live Netherlands providers | Utrecht area exported with 35 buildings; [live results](live-results.json) |

Backend tests cover non-destructive legacy migration, saved export folders,
disabled update services, API area/build/download/project operations, folder
cancellation, unavailable-provider fallback, optional IFC absence, stale-source
availability, matching launcher instances and foreign-port conflicts.

Browser checks cover fresh Mono profiles, retained light/dark/system preferences,
saved project settings, keyboard search, area drawing, drag-box and click modes,
building hiding/restoring, real STL upload, keyboard model coordinates/rotation,
filament slots, folder choice/cancellation, generation/download controls, About,
focus restoration, dialog containment and page overflow at **320, 390, 820 and
1440 pixels**. They also verify that the interface loads with external HTTPS
requests blocked and makes no inherited branding or CDN requests.

The mobile checks require a nonzero Leaflet viewport and the selected area to
remain in view after switching between Settings and Map. Area fitting waits for
the map to become visible and any preceding zoom animation to finish.

Browser area/build/folder responses use deterministic fixtures to exercise UI
states. STL upload reaches the real backend. Geometry generation is independently
tested through the Python backend, frozen executable and live-provider smoke
test. The compiled Tk folder-picker runtime is present; native folder selection
and cancellation are tested through the API's picker substitution rather than
interactive Windows dialog automation. IFC native libraries load in the package;
the optional dependency absence path is tested separately.

The installer compiled successfully with Inno Setup. PE metadata identifies
**Spanvision infra**, **STL-3D map workspace**, version **1.1.1**. Its distinct
per-user installer identity is `com.spanvisioninfra.stl3dmapworkspace`. The
installer was built and inspected; installation on this workstation was not
executed. Packages are unsigned because no code-signing identity is configured.

## Screenshots

These map captures use live PDOK imagery with deterministic feature data. Model
and provider colors are preserved. The 360px desktop sidebar becomes 300px on
tablets; mobile uses Map/Settings tabs with the same project state.

| Width | Map workspace | Settings | About |
|---|---|---|---|
| 320px | [map](preview-map-320.png) | [settings](preview-settings-320.png) | [dialog](about-320.png) |
| 390px | [map](preview-map-390.png) | [settings](preview-settings-390.png) | [dialog](about-390.png) |
| 820px | [map](preview-map-820.png) | [settings](preview-settings-820.png) | [dialog](about-820.png) |
| 1440px | [map](preview-map-1440.png) | [settings](preview-settings-1440.png) | [dialog](about-1440.png) |

The suite captures include landing, launcher, suggestions, scan, login, sign-up
and account at every requested width in [suite screenshots](../suite/screenshots/).
Account and scan demonstrations retain their preview disclosures. Natural-color
business photography is preserved.

The suite's existing form styling is activated on its preview body. Login,
sign-up and account fields use #202020 surfaces and at least 44px control
heights; responsive checks verify both properties at every requested width.

## Provider availability and retained attribution

The live Utrecht test retrieved PDOK/3DBAG data and exported a 150 × 146.1mm
model with 35 buildings. Public Overpass mirrors timed out during the smoke
test, which used an 8-second limit per attempt. Water, roads and vegetation
were unavailable. The backend retained the buildings, displayed its English
warning and completed STL/3MF generation. Live Overpass coverage was therefore
not confirmed in this session. Interface assets are local; map-data retrieval
and map tiles still require the external providers.

The original MIT copyright and license, Python dependency notices, Leaflet
license, font licenses and map-provider attribution are retained in both
packages and available through **About → Open-source notices**. Upstream names
remaining in these notices and legacy migration paths are intentional. Updates
and feedback remain disabled until Spanvision destinations are configured.

## Local build tooling

Python 3.12.14 and the application/build environment are isolated under
`D:\CAD\spanvision-stl-runtime`. The module's `.venv` is a junction to that
environment. Inno Setup 6.3.1 is used as a portable compiler; its npm archive
integrity and the compiler's Authenticode signature were verified. Nothing
requires a global Python or Inno installation.

Windows build output is under `D:\CAD\spanvision-stl-delivery\windows`, exposed
by the workspace's `delivery\stl\windows` junction. Build scratch files also
use D: because of limited free space on C:. [artifacts.json](../../delivery/stl/windows/artifacts.json)
records the exact SHA-256 checksums and byte sizes of the installer and ZIP.

Rebuild with `npm run build:stl:windows`. Run `npm run verify:stl` against the
current preview, `python -m pytest tests -q` from the application environment,
and `python qa/stl/audit_artifacts.py` from the suite root. The frozen executable
also supports `--self-test <absolute-report-path>` without opening a browser.
