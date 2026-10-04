# Architecture

The browser owns the compatible project JSON and posts it to the same-origin
FastAPI server. Python loads Netherlands data from PDOK, 3DBAG and Overpass,
projects coordinates to RD / EPSG:28992, generates solids, and writes STL / 3MF.
Geometry, print bands and filament assignments remain independent of UI colors.

The shared brand registry generates standalone brand.json, CSS variables and
the STL SVG. FastAPI identity, outgoing User-Agent and export metadata consume
that identity. The updater makes no requests until Spanvision destinations are
configured. The executable uses one marker and a stable loopback port (8765).

The suite's build fingerprint includes Python sources, frontend binaries,
fonts, branding, legal notices and runtime requirements. The backend captures
its fingerprint at startup and checks it against the current files and build
stamp before advertising availability. Only the suite origins can read status
through CORS. Preview mode serves the built web assets; standalone mode serves
the bundled local web folder. Runtime data always lives outside source assets.

Profile migration copies missing files and retains originals. Theme loading
occurs before first paint and keeps the existing browser preference keys.
Small screens switch between the map and unchanged numbered settings workflow.
Keyboard controls provide equivalents for search, hiding and model positioning.

PyInstaller bundles the engine and resources. Inno Setup creates a per-user
installer with identity com.spanvisioninfra.stl3dmapworkspace. Uninstallation
removes only disposable cache and log files; projects and exports remain.
