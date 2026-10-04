# Pointcloud Workspace verification

Verified on **2026-10-03** for **Spanvision infra · PW · Spanvision Mono**.

The independent editor is running at http://127.0.0.1:4250/. The suite launcher is running at http://127.0.0.1:4230/. Choose **Load sample** in the editor to inspect the included, naturally colored site scan.

| Check | Result |
| --- | --- |
| TypeScript and production frontend build | Passed |
| Suite hub production build | Passed |
| Shared branding/adapters check, all modules | Passed |
| Pointcloud browser verification | 9 scenario groups passed; no runtime errors |
| Suite browser verification | 32 scenarios passed; no runtime errors |
| Native `cargo check --locked` | Passed |
| Native `cargo test --locked` | 4 tests passed |
| Responsive captures | 52 screenshots |

Browser checks cover 320, 390, 820 and 1440px widths; empty and loaded viewers; settings; mobile properties; notices; selection and deselection; visibility; color-mode, point-size, budget and EDL controls; export menus; binary/ASCII PLY, XYZ, PTS, CSV and reconstructed OBJ exports; reconstruction completion and cancellation; building-dialog access; malformed/proprietary-file feedback; appearance persistence and corrupt/unavailable storage. LAS and real compressed LAZ fixtures also roundtrip through ASCII PLY with RGB and classification values intact.

The suite captures cover landing, tool launcher, assistant suggestions, login, sign-up, account and scan dialogs. The creative drawing canvas remains on the landing and account-preview pages. The business photograph loads successfully and retains `filter: none`. Document and pointcloud colors remain separate from the UI palette.

Native tests verify existing `/info` fields plus Spanvision identity, branded and legacy discovery records, cleanup that preserves other instances, real LAS import and asynchronous octree completion, and compressed LAZ RGB/classification decoding. Compilation retains existing warnings about unused upstream items; there are no compiler errors.

The LAZ regression checks exposed and corrected upstream decoder URL, WASM buffer-growth and compression-flag problems. REST routes, command names, worker messages, geometry formats and rendering shaders remain compatible.

Preview status was observed rejecting a stale running build after source changes. The final server was restarted against the current stamp; its availability, identity and suite launcher link passed verification. Source fingerprints include the WASM decoder, sample data, generated icons, frontend/backend source and local identity metadata.

The supplied ZIP was preserved at its original location. Its SHA-256 is `984F2DCC4937357F6CE76BB30130C5D7B157107E14C173972419D7C4B81A0C6B`. Active code has no upstream product presentation; the original discovery names remain only for client compatibility. Original licenses and contributor attribution remain accessible through Settings and the suite footer, with 642 npm/Rust dependency entries.

Account and scan screens are local demonstrations. No Windows installer, cloud storage or production authentication was added. The browser renderer retains upstream limitations: point-budget enforcement belongs to native LOD, and the existing EDL/classification-filter controls do not add a new post-processing/filter implementation in this rebrand. Their accessible state was checked; this report does not claim new rendering capabilities.

Native compilation output was redirected to `D:\CAD\spanvision-pointcloud-build-cache` because C: had insufficient build space. No unrelated source or user documents were removed.

## Evidence and reproduction

- [Pointcloud browser results](browser-results.json)
- [Suite browser results](suite-browser-results.json)
- [Native compilation log](native-check.log)
- [Native tests log](native-tests.log)
- [Desktop sample](editor-sample-1440.png)
- [Mobile sample](editor-sample-390.png)

From the suite root:

```powershell
node branding/sync.mjs --check
node branding/build.mjs pointcloud hub
npm run preview:pointcloud
# In another terminal:
npm run preview:suite
# With both previews running:
npm run verify:pointcloud
node branding/verify.mjs --hub-only
```

Native checks run in `spanvision-pointcloud-workspace/src-tauri`; set `CARGO_TARGET_DIR` to a disk with adequate space when necessary. `cargo run --locked --example generate_laz_fixture` recreates the compressed regression fixture.
