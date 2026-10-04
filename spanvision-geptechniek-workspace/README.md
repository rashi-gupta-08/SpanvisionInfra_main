# Spanvision infra · geptechniek workspace · Geotechniek

React/Tauri geotechnical workspace for CPT data, boreholes, site drawings and PDF reports. The Spanvision edition preserves the engineering backend and file formats, adds Spanvision Mono, and integrates with the shared suite launcher.

From the parent suite directory:
```powershell
npm ci
npm run brand:sync
npm run build:suite
npm run preview:suite
```
Open http://127.0.0.1:4230 for the suite and http://127.0.0.1:4235 for Geotechniek.

Standalone browser build:
```powershell
cd apps/desktop
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 4235
npm test -- --reporter=dot
```

Native Windows build requires Rust MSVC, Visual Studio C++ Build Tools and the Windows SDK. From the suite root, run `npm run build:geo:windows`. Dependencies resolve from the pinned local warehouse; Cargo.lock remains the authority. The native binary also supports `--serve --port 8787` and `--mcp` with compatible routes/tools.

Fresh profiles default to Spanvision Mono; existing native preferences are copied once without changing the original profile. Browser preferences preserve their existing keys. Accounts and OCR in the suite are local demonstrations, and engineering modules retain their experimental labels.

See [ARCHITECTURE.md](ARCHITECTURE.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and the delivery verification report.

## Documentation archive

Historical plans, research, logs and superseded source documentation have moved out of this tool to [the suite source archive](../source-provenance/spanvision-geptechniek-workspace/). Current run instructions, useful technical guides, in-app Help and required source/license notices remain with the application.
