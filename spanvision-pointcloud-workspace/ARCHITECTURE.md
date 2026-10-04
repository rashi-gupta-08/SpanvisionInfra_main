# Pointcloud Workspace architecture

**Spanvision infra · PW · Spanvision Mono**

The React interface uses Zustand for session state and validated, versioned localStorage for appearance only. Browser imports use the existing parsers and worker protocol, laz-perf WASM, an in-memory geometry store, and the Three.js viewer. No file contents, paths, accounts or credentials are persisted by the appearance store.

Desktop imports keep the existing Tauri command interface, Rust pointcloud manager, LAS/LAZ parser, octree construction and LOD responses. The application identifier is `com.spanvisioninfra.pointcloudworkspace`; the executable is `spanvision-pointcloud-workspace`. REST routes, request/response contracts and IPC names remain compatible. `/info` adds product and organization metadata.

Native instance discovery writes to `%APPDATA%\SpanvisionInfra\PointcloudWorkspace\instances` on Windows, and `~/.config/spanvision-infra/pointcloud-workspace/instances` on Unix. It also maintains the existing OpenNDStudio discovery location for external client compatibility. Each process removes only its own discovery records at shutdown.

The suite's `branding/brand.json` generates local JSON, Rust constants, CSS tokens and PW marks through the pointcloud adapter. Standalone builds consume these local adapters without requiring the suite. Legacy theme choices remain available; new profiles use Spanvision Mono and a #1B1B1B canvas. Explicit canvas colors survive theme changes.

The browser editor is independent of the hub. The hub retains its existing account and OCR demonstrations, adds the pointcloud launcher and suggestion, and does not authenticate users or upload pointclouds. Responsive layouts use a properties drawer below 768px and local ribbon scrolling; desktop layout and data colors remain intact.

`node branding/build.mjs pointcloud hub` typechecks and stamps builds. `npm run preview:pointcloud` serves the editor at 127.0.0.1:4250; `npm run preview:suite` serves the suite at 127.0.0.1:4230 and available editors. Preview servers validate build identity and source fingerprints. Run `npm run verify:pointcloud` and `npm run verify:suite -- --hub-only` for responsive browser checks. Native verification uses `cargo check --locked` and `cargo test --locked` in src-tauri.

The supplied archive is preserved. Embedded Git data and upstream deployment workflows were excluded from the active application. Original attribution and license text remain in the legal notices, accessible from Settings and the suite footer.

Verification also corrected upstream LAZ import defects: browser worker loading now resolves the bundled WASM decoder from the application base URL and refreshes its point buffer after WASM memory grows. Format parsing masks compression flags before interpreting RGB/classification layouts. A real compressed LAS 1.2 format-2 fixture exercises both browser roundtrip exports and native decompression. The reconstruction algorithm, geometry formats, shaders and worker protocol remain compatible.
