# STL-3D map workspace

**Spanvision infra · STL · Spanvision Mono**

A local map-to-print workspace for the Netherlands. Search a location, select
an area, retrieve buildings and map features, hide buildings, import a design,
assign filament slots, and export STL / 3MF models.

The Windows launcher opens the interface in your browser and runs the Python
geometry backend on your computer. Map providers require internet access;
interface fonts and Leaflet are bundled locally. Satellite imagery and model
colors retain their original colors.

## Suite preview

From the parent workspace:

```powershell
node branding/sync.mjs
node branding/icons-stl.mjs
node branding/build.mjs stl hub
npm run preview:stl
npm run preview:suite
npm run verify:stl
npm run build:stl:windows
```

Map workspace: http://127.0.0.1:8765/ · Suite: http://127.0.0.1:4230/
The suite checks the running backend and built assets before enabling its tile.
Set SPANVISION_STL_PYTHON to an interpreter with requirements.txt installed
when the local .venv is unavailable.

## Standalone source development

Use Python 3.12. Create a .venv, install requirements.txt, then run
`.venv\Scripts\python.exe run_app.py`. The committed local branding and assets
work independently of the parent suite. Install requirements-dev.txt to run
`python -m pytest tests -q`.

## Windows packages

Portable: unzip and run `STL-3D map workspace.exe`.
Installer: run `Spanvision-STL-3D-map-workspace-1.1.1-Setup.exe`.
Both contain Python, native geometry libraries, fonts, Leaflet and notices.
Packages are unsigned; no signing identity is configured.

To build independently use `build_installer.bat`; set SPANVISION_STL_ISCC to
an Inno Setup compiler. The suite build writes artifacts to delivery/stl/windows.
Build tooling uses an isolated D: runtime on this machine and is not bundled.

## Compatibility and storage

Existing project JSON fields, layer identifiers, geometry colors and CFS slot
assignments remain compatible. Fresh profiles use Spanvision Mono; saved
light/dark/system choices and the original browser keys are preserved.
Browser storage is available only on the same host and port as before.

Writable data: `%LOCALAPPDATA%\Spanvision infra\STL-3D map workspace`.
On first launch, missing settings, projects and uploads are copied from the
legacy installed profile. Original files and newer branded files are retained.
Stored export destinations remain in use. Fresh exports default to
`Documents\Spanvision infra\STL-3D map workspace`.

Use the 3MF in Creality Print / OrcaSlicer to keep each part's original height
and filament assignment. If using STL files, import the first as an object and
the others through Add part > Load. Each export includes English instructions
and map-data attribution.

## Attribution

About → Open-source notices contains the unchanged MIT license, upstream
copyright, font licenses, Leaflet license and map-provider credits. See legal/.
Account and scan screens live in the suite and remain labeled demonstrations.
