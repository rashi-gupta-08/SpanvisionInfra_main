# Pointcloud Workspace

**Spanvision infra · PW · Spanvision Mono**

A local pointcloud viewer and editor with React, Three.js and a Rust/Tauri desktop backend. Import LAS/LAZ and the existing supported point/mesh formats; inspect RGB, elevation, classification and intensity; adjust point size and budget; select, transform, reconstruct and export using the existing workflow.

```powershell
npm ci
npm run dev
npm run build
npm run preview
# Optional native development:
npm run tauri dev
```

The standalone browser preview opens at http://127.0.0.1:4250/. Suite integration, appearance persistence, backend compatibility and verification are documented in [ARCHITECTURE.md](ARCHITECTURE.md). A small sample is available through the empty viewer's Load sample action.

Modified from Open Pointcloud Studio 0.3.0. LGPL-3.0-or-later; see [LICENSE.md](LICENSE.md) and [open-source notices](legal/UPSTREAM-NOTICES.md).
