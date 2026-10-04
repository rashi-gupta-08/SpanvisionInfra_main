# OpenAEC and Spanvision Infra — readiness comparison

Checked on **4 October 2026**, against the public OpenAEC website, GitHub repository/release metadata, and this local Spanvision Infra workspace.

**Conclusion:** several OpenAEC products are downloadable and usable, but the ecosystem is not advertised as finished. Spanvision Infra has 16 current, available tool builds; that is a working local suite, not evidence that all 16 tools have complete production features.

## What “ready” means here

- **Available:** a usable application or downloadable release exists. It does not prove every advertised feature or platform.
- **Beta / Alpha:** usable for trials or defined workflows, with incomplete or changing capabilities.
- **Source / development:** requires setup or lacks enough release evidence to call it a turnkey application.
- **Our usable core:** the identified workflow has functional QA evidence. Features outside that evidence remain unverified.

Upstream applications were not installed or exhaustively tested during this review. Their status below comes from primary maintainer sources and release assets. Local functional evidence was recorded on 2–3 October; today's fresh checks establish current source/build alignment, launcher availability and shared branding. No new engineering certification or independent full regression audit is implied.

## OpenAEC: the most immediately usable releases

The official catalog marks **Open PDF Studio** and **Open Calc Studio** Available, while explicitly saying that all tools remain under active development. See the [official catalog](https://open-aec.com/en/), [PDF product page](https://open-aec.com/en/open-pdf-studio/) and [Calc product page](https://open-aec.com/en/open-calc-studio/).

| Product | Release checked | Readiness assessment |
| --- | --- | --- |
| Open PDF Studio | [v2026.39](https://github.com/OpenAEC-Foundation/open-pdf-studio/releases/tag/v2026.39) | Strong candidate for immediate document work; desktop/platform release assets exist. A newer nightly is a prerelease. |
| Open Calc Studio | [v0.13.0](https://github.com/OpenAEC-Foundation/open-calc-studio/releases/tag/v0.13.0) | Available cost-estimation application, with browser and desktop editions. |
| Open CAD Studio | [v2026.39](https://github.com/HakanSeven12/OpenCADStudio/releases/tag/v2026.39) | Released CAD application with Windows portable/installer and other platform assets. OpenAEC calls this a Community Beta; it belongs to Hakan Seven's external repository. |
| Open STL-3DMap Studio | [v1.1.1](https://github.com/OpenAEC-Foundation/Open-STL-3DMap-Studio/releases/tag/v1.1.1) | Windows installer and portable ZIP are released. Its map-to-model data coverage is the Netherlands. |

Planner, IFC viewing, field inspections, CPT viewing and speech also have released binaries, but their catalog maturity is Beta. A GitHub release being marked `prerelease: false` does not override an author's Beta or Alpha product status.

## Comparison with all 16 of our tools

The “our status” column describes verified scope, not a claim of complete feature parity. The local version values are package/source metadata; several Spanvision packages use their own version numbering.

| Our tool | Upstream counterpart / current release evidence | Our verified working scope | Remaining gap / assessment |
| --- | --- | --- | --- |
| CAD | [Open CAD Studio v2026.39](https://github.com/HakanSeven12/OpenCADStudio/releases/tag/v2026.39); Community Beta | Current Rust/WASM web build; line geometry, DWG/DXF 2018 save and reopen exercised. Local Cargo version 2026.39.0. | Usable for tested CAD workflows. Updated Spanvision native installers and broad 3D/large-file validation are not established by these checks. |
| 2D CAD | Open 2D Studio, supplied archive; current OpenAEC organization lists an AEC extension rather than the base application | Rectangle drawing, `.o2d` save/reopen, recovery, measurement/review and export paths; 26 unit tests and 20 browser checks recorded. Local metadata 0.35.0. | Ready for the tested basic browser drafting/review workflow. Every inherited drafting tool and downstream export interoperability have not been certified. |
| Vision BIM Validator | [OpenAEC-BIM-validator](https://github.com/OpenAEC-Foundation/OpenAEC-BIM-validator); no GitHub releases returned | Real IFC rendering, FastAPI IFC/IDS validation, expected failed check and BCF ZIP output; 12 integration scenarios. | Usable local validation workflow. Requires the Python/backend environment; no turnkey Spanvision installer or comprehensive standards certification established. |
| PDF | [Open PDF Studio v2026.39](https://github.com/OpenAEC-Foundation/open-pdf-studio/releases/tag/v2026.39); Available | Real PDF opening, annotation, measurement, undo/redo, save/reopen. 2,520 existing unit tests and 28 browser scenarios recorded. Local metadata 2026.39.0. | Basic browser editor usable. OCR, PDF compression, CAD import/export and other native actions require the desktop runtime. Updated Windows app was not delivered by that verification. |
| IFC | [Monty IFC Viewer v1.0.1](https://github.com/OpenAEC-Foundation/monty-ifc-viewer/releases/tag/v1.0.1); Beta | IFC fixture loads in the viewport and survives resize. Imported tag/commit explicitly retained in NOTICE. | Usable viewing core. Our 0.1.0 is a separate development release line; full model-size and sequence regression coverage is not established. |
| Calc | [Open Calc Studio v0.13.0](https://github.com/OpenAEC-Foundation/open-calc-studio/releases/tag/v0.13.0); Available | Estimate calculations, import/export tests and a three-page browser PDF; 571 tests passed and six skipped. Local metadata 0.13.0. | Strong browser core. Native app/installer, native report engine and native service paths were not verified in this edition. Skipped fixtures need separate validation. |
| Open Vision Studio | [Open Planner Studio v2026.9.0](https://github.com/OpenAEC-Foundation/open-planner-studio/releases/tag/v2026.9.0); Beta | IFC schedule import, timeline rendering and IFC task export. Local metadata 2026.9.0. | Usable planning beta. Native integrations and optional external providers remain outside our browser integration test. |
| FEM Vision Studio | Supplied Open FEM2D Studio archive; no matching repository found in the 63 public OpenAEC organization repositories inspected | Local browser solver solves the supplied four-node, three-beam model and produces stress results. | Working analysis example. Full nonlinear/code-design validation and native design checks are not established; no verified current upstream release comparison. |
| Frame Vision Studio | [Open Frame Studio v0.6.0](https://github.com/OpenAEC-Foundation/open-frame-studio/releases/tag/v0.6.0); catalog Alpha | Supplied WASM engine loads, window-frame template creates, width changes and undo work. Local metadata 0.6.0. | Working browser design core. Some CNC, project/file and production export functions require desktop; no current native delivery tested. |
| Vision Calculation Studio | [Open Calculations Studio v2026.39.0](https://github.com/OpenAEC-Foundation/Open-Calculations-Studio/releases/tag/v2026.39.0); catalog In development | Designer, calculated document and project saving exercised; builds pass. | **Not fully ready:** recorded calculation regressions pass 8/10; timber-beam reference checks and duplicate project variables fail in both our edition and the untouched archive. Native PDF engine/installer were not built. |
| Geotechnical | [Open Geotechniek Studio v0.4.1](https://github.com/OpenAEC-Foundation/open-geotechniek-studio/releases/tag/v0.4.1); Beta | CPT imports/plots, project round trips, native reports and REST/MCP checks; 156 engineering tests recorded. | Browser is partial: full report generation/layer detection require native app. IFC4x3 writer remains a placeholder. Older unsigned Windows package exists. |
| Speech | [Open Speech Studio v0.10.3](https://github.com/OpenAEC-Foundation/open-speech-studio/releases/tag/v0.10.3); Beta | Real CPU transcription and cancellation tested through Rust with a WAV fixture. Local metadata 0.12.0. | **Browser is a demonstration:** imported audio is not read/transcribed there. Only a desktop debug executable is recorded; live microphone, loopback, hotkeys and release packaging remain unverified. |
| STL-3D Map | [Open STL-3DMap Studio v1.1.1](https://github.com/OpenAEC-Foundation/Open-STL-3DMap-Studio/releases/tag/v1.1.1) | Geometry tests plus live Utrecht export with 35 buildings; packaged runtime tested. | Usable Netherlands workflow. GPS can center a map elsewhere but does not provide worldwide 3DBAG building data. Live roads/water/vegetation providers timed out in the recorded smoke test. |
| Field Workspace | [Open Field Studio v0.3.6](https://github.com/OpenAEC-Foundation/Open-Field-Studio/releases/tag/v0.3.6); Beta | Local project/photo storage, tickets, inspection lists, signature/handover and JSON/BCF reporting; 89 browser checks. | Usable local inspection workflow. ERP tests used mocks; live ERP/cloud integration and Android delivery are not complete in our suite. Older unsigned Windows package exists. |
| Pointcloud Workspace | [Open Pointcloud Studio v0.8.0](https://github.com/OpenAEC-Foundation/open-pointcloud-studio/releases/tag/v0.8.0); homepage still Beta | LAS/LAZ and other imports, exports and OBJ reconstruction exercised. Local imported frontend metadata 0.3.0. | **Largest version/architecture gap.** Our browser's EDL/classification filtering and native LOD budget are incomplete. Upstream now uses a Rust native renderer and adds section drawings, closed meshes and detected faces. An upgrade requires integration work. |
| Pile Plane Workspace | [Open Pile Plan Studio v0.4.3-alpha](https://github.com/OpenAEC-Foundation/pile-plan-studio/releases/tag/v0.4.3-alpha); Alpha | Rust/WASM CSV/XLSX imports, CPT/options, IFCPP round trip, exports and optimizer start/cancel; 51 browser/responsive cases. Local metadata 0.4.2. | Working decision-support alpha. Optimizer completion/correctness across real projects is not established by the UI tests; latest upstream patch is not integrated. Older unsigned Windows package exists. |

## Website discrepancies that affect this decision

- Pointcloud's product page still offers v0.3.0 and the homepage mentions v0.7; GitHub published **v0.8.0 on 3 October**. Prefer the release and current repository when assessing capabilities. Its present Rust-native architecture differs from our older Tauri/React/Three.js adaptation.
- Pile Plan's homepage says Beta, but its [product page](https://open-aec.com/en/open-pile-plan-studio/) says public Alpha and its latest release is `v0.4.3-alpha`.
- Heatloss is listed as Beta on the homepage, but its [repository](https://github.com/OpenAEC-Foundation/open-heatloss-studio) says public testing Alpha and releases are prereleases.
- Frame's homepage describes structural frame analysis. Its [actual repository](https://github.com/OpenAEC-Foundation/open-frame-studio) describes **window and door frame design**, matching our Frame Vision Studio. FEM is the structural analysis tool in our suite.
- CAD's homepage version is stale relative to the released `v2026.39` build. It is a community product hosted outside the Foundation organization.

## Additional software outside our suite

| Upstream software | Evidence and current assessment | Spanvision coverage |
| --- | --- | --- |
| [OpenAEC Installer](https://github.com/OpenAEC-Foundation/openaec-installer/releases/tag/v0.2.2) | v0.2.2 assets; Beta catalog status. Installs, updates and launches apps. | Our hub launches local browser tools; it is not a desktop installer/update manager. |
| [Open 3D Studio](https://github.com/OpenAEC-Foundation/open-3d-studio/releases/tag/v0.8.0) | Windows release exists; repository documents parametric/component BIM modeling. Treat as a trial candidate, not independently certified here. | No equivalent dedicated parametric BIM authoring tool; CAD and IFC viewing are different scopes. |
| [Workspace Composer](https://github.com/OpenAEC-Foundation/OpenAEC-Workspace-Composer/releases/tag/v3.0.5) | Public desktop assets exist; developer workspace utility. Release tag and asset version names differ. | Absent. |
| [Heatloss](https://github.com/OpenAEC-Foundation/open-heatloss-studio) | Public testing Alpha, released prerelease; modeller is documented as a read-only viewer during redesign. | Absent; do not label complete. |
| [Energy](https://github.com/OpenAEC-Foundation/open-energy-studio/releases/tag/v0.1.6-alpha) | Alpha release assets; Dutch energy methodology. | Absent; not a complete general/global energy compliance tool. |
| [Y-app / Y-next](https://github.com/OpenAEC-Foundation/Y-app-ERPNext) | Current README describes an ERPNext v16 frontend using its host's session/API; no GitHub releases returned. Requires an ERPNext deployment. | No live ERP platform in our hub. |
| [BCF platform](https://github.com/OpenAEC-Foundation/openaec-bcf-platform) | Catalog In development; no GitHub releases returned. | We have local BCF export, not a deployed collaborative BCF platform. |
| [Cloud desktop](https://github.com/OpenAEC-Foundation/openaec-cloud-desktop) / SuperCloud | Catalog In development; desktop README describes MVP and planned phases, with no GitHub releases returned. Needs server/account infrastructure. | Accounts and scan are local previews; no production login, storage or sync service. |
| [OpenAEC Docs](https://github.com/OpenAEC-Foundation/openaec-docs) | Source repository, no GitHub releases returned; readiness not established. | Absent. |
| [Zaagplan Optimizer](https://github.com/OpenAEC-Foundation/zaagplan) | Source setup/Docker instructions, no releases; README's online demo says coming soon. A separate OpenAEC-zaagplan repository has similar documentation. | Absent; could be evaluated from source. |
| [Open Monuments](https://github.com/OpenAEC-Foundation/open-monuments-core) modules | Frappe server applications for registers, inspections and maintenance planning; no GitHub releases returned. | Absent; not standalone desktop tools. |
| [Open Baken Studio](https://github.com/OpenAEC-Foundation/open-baken-studio-releases) | Public v0.7.4 tag mirror has no assets; source and downloads are documented as private/authorized. | Absent; public tags do not provide a usable public download. |
| [Open Books](https://github.com/OpenAEC-Foundation/open-books) | Accessible book/image collection, not an engineering editor. | Absent. |

The organization snapshot contains 63 public repositories. Many are libraries, schemas, extensions, templates, assets, mirrored modules or developer infrastructure; that count is not the number of complete software products. The remaining small repositories were inventoried, not functionally certified as applications.

## What is complete in our delivery today

Fresh checks passed: **17/17 source and branding stamps current, 16/16 tools available, all launcher links inherit Dark mode, and `npm run brand:check` passed.** Shared Light/Dark and responsive UI also have recorded verification. These establish the current suite presentation and build availability.

Windows executable/installer files exist for Field, Geotechnical, Pile and STL. All four sets were built on **3 October** and are unsigned. Shared branding, theme/location and motion sources changed on **4 October**, so those artifacts are not verified deliveries of today's interface. Installer presence does not prove installation/upgrade/uninstall on a clean machine. Speech has a debug executable, not a verified production installer. Most other tools have current browser builds without rebuilt Spanvision Windows packages.

## Practical order for finishing our suite

1. Fix and independently verify Vision Calculation Studio's known calculation failures; qualify FEM/pile engineering workflows with reference projects before claiming design readiness.
2. Integrate the newer Pointcloud architecture/features or clearly limit our product to its verified import/view/export scope.
3. Deliver actual Speech processing and PDF OCR through supported desktop packages or a real backend; sample/progress screens cannot count as those capabilities.
4. Rebuild the four existing native packages with current shared assets; build missing installers, then test installation, save/reopen, upgrade and uninstall on clean Windows machines.
5. Validate real ERP/provider connections and regional datasets. GPS positioning is already supported but does not make Netherlands-only engineering/map data global.
6. Add production account/cloud services only if they are in the intended product scope; complete local tools can remain local without those services.

## Evidence saved with this review

- `upstream-repos.json`: organization inventory from the public GitHub API.
- `upstream-products.json`: 30 user-facing/product-support repository release snapshots, including dates, prerelease flags and asset names.
- `upstream-cad.json`: external CAD release snapshot.
- `upstream/`: available upstream README snapshots; missing uppercase README responses are explicitly recorded as 404 and not treated as evidence of an absent project.
- `local-status.json`: current module build/branding fingerprints, preview availability and native artifact inventory.
- Repeat fresh checks with `node qa/comparison/inspect-local.mjs`, `node qa/location/stamps.mjs` and `npm run brand:check`.

Local functional evidence: `qa/cad-white-label/VERIFICATION.md`, `spanvision-2d-cad-workspace/qa/README.md`, `qa/bim/VERIFICATION.md`, `spanvision-pdf-workspace/docs/VALIDATION.md`, `calc-workspace/docs/VERIFICATION.md`, `qa/suite/workflow-results.json`, `qa/studios/VERIFICATION.md`, `vision-calculation-studio/docs/spanvision-verification.md`, `qa/geotechniek/VERIFICATION.md`, `qa/speech/VERIFICATION.md`, `qa/stl/VERIFICATION.md`, `qa/field/VERIFICATION.md`, `qa/pointcloud/VERIFICATION.md`, and `qa/pile/verification-results.json`.
