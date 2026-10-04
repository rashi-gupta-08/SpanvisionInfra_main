# Build Pile Plane Workspace 0.4.2

This application and modifications are LGPL-3.0-or-later. Full GNU licenses, upstream notices and dependency attribution are in `legal/`. You may modify/rebuild the delivered source, including replacing or relinking its Rust core. No private dependency or signing secret is required.

Prerequisites: Node.js24/npm; Rust stable with `wasm32-unknown-unknown`; wasm-pack0.15.0. Windows additionally requires MSVC x64 C++ Build Tools, a Windows SDK, CMake, Ninja and libclang. HiGHS builds from its pinned dependency source. Use an x64 Native Tools prompt. WebView2 is required to run the native app; Tauri obtains official NSIS packaging tools. This delivery used Rust1.98.1. Python3.11+ is only needed to regenerate dependency notices.

From the application frontend directory `apps/pile-plan-studio`:

```powershell
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --version 0.15.0 --locked
npm ci
npm run build
npm exec vite preview -- --host 127.0.0.1 --port 4255 --strictPort
```

Build regenerates the Rust WASM crate before TypeScript/Vite. Do not edit generated WASM/JS. For Windows, from the same frontend directory in a configured compiler environment:

```powershell
npm run tauri -- build --bundles nsis -- --locked
```

Tauri invokes `tools/build-browser.mjs` before packaging. Output is under the Cargo target directory's `release/` and `release/bundle/nsis/`, with binary `spanvision-pile-plane-workspace.exe`. Artifacts are unsigned.

`tools/toolchain.mjs` reuses the delivery host's relocated `D:/SpanvisionToolchain` tooling, and falls back to the supplied environment when that directory is absent. `SPANVISION_TOOLCHAIN_ROOT` overrides it; `SPANVISION_PILE_WASM_TARGET` selects a separate WASM cache. Ordinary CARGO_HOME, CARGO_TARGET_DIR and LIBCLANG_PATH overrides are supported.

From an existing Spanvision suite root:

```powershell
npm run brand:sync
node branding/icons.mjs --modules=pile
node branding/build.mjs pile hub
node branding/preview-pile.mjs
node branding/native-pile.mjs
```

Pile runs at http://127.0.0.1:4255/; retain the existing hub at http://127.0.0.1:4230/. If absent, `node branding/preview.mjs` starts the suite. The standalone stamped pile preview rejects stale sources. Suite integration source is included separately in the delivered source archive; the generated identity files let this app build independently.

Verification:

```powershell
# frontend directory
npm test
# source root, configured compiler environment
cargo test --locked --workspace
cargo test --locked --manifest-path apps/pile-plan-studio/src-tauri/Cargo.toml
```

Browser verification uses Edge/Playwright and sample inputs; download automation exercises the supported browser save fallback. Native tests include profile migration without overwriting either profile. Browser storage names are retained for same-origin compatibility. Export/reopen IFCPP files when changing browser origins. No online account or credentials are needed.
