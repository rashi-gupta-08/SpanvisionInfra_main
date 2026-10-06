# Spanvision Infra operations

## Current topology and state

`branding/brand.json` lists the tools and local preview ports. `deployment/production.json` records the deployed URLs. Vercel hosts the hub and static browser applications. Render hosts the Python BIM and STL APIs with their frontends. The FEM v2 Rust calculation bridge is not yet integrated into the production browser deployment.

The FEM release configuration now targets `design-mockup`, the canonical frontend. `deployment/Dockerfile.fem` and the Render blueprint define a bounded API using the actual Rust `toetsbrug` and `doorsnedemotor` executables. Vercel packaging forwards the two FEM API endpoints to that service. This configuration remains undeployed and needs Linux container and live-service verification before release. Local acceptance uses port 10000 for the API and the frontend preview proxy; `deployment/verify-fem-browser.mjs` checks the real browser-to-Rust path.

The deployment uses anonymous workspaces. The cloud middleware issues private HttpOnly cookies, strips visitor identity headers, and supplies an internal tenant identity. BIM project/model/job state and STL designs must not be shared across workspace cookies. Browser profiles store a display name locally and do not authenticate a person.

Cloud storage is temporary. Uploaded files, processed geometry and SQLite/project data on the current ephemeral service filesystem can disappear after redeployment or restart. Hosting can sleep when idle. Do not promise durable storage, backups, uninterrupted service or an availability SLA on this configuration.

## Build and verify

Install each application's declared dependencies using its lockfile. Use Python 3.12 virtual environments for the deployed Python backends and the pinned Rust toolchain/lockfiles for native libraries. Avoid using a Windows Store Python or Bash alias when a real interpreter is required.

From the repository root:

```text
node deployment/audit-suite.mjs
node branding/build.mjs hub frame bim
node branding/preview.mjs
```

The complete audit is expensive. It records results in `qa/readiness/checks.json`, individual JSON records and logs. Filter commands by their check IDs for development, then run all required release gates. Planner requires its complete `npm run verify` gate before a release/push.

Check free disk and Windows commit memory before native builds, browser batteries and installer generation. Place disposable browser TEMP/TMP and Rust target directories on a drive with adequate capacity. Do not place a dependency backup under a watched development tree. This audit currently needs additional disk space before further large builds and packaging; do not interpret an interrupted or incomplete command as a passing check.

Frame's browser engine must be rebuilt after Rust changes:

```text
wasm-pack build ofs-wasm --target web --release -- --locked
```

Run this from `frame-vision-studio`, copy the generated JavaScript/WASM pair into `ui/public/wasm`, run the browser integration tests, then rebuild the frontend. Do not deploy a new JavaScript bridge with an older incompatible WASM binary.

FEM canonical v2 source is `fem-vision-studio/design-mockup`. Its solver sidecar is built by `npm run build:sidecar`. Native prerequisites include `cargo build --locked --release -p toetsbrug` and `-p openaec-mcp-server` from `src-tauri`. A green v2 test suite does not certify the currently deployed v1 frontend.

## Cloud controls

The cloud middleware limits actual request bodies to 55 MB, allowing multipart overhead around a 50 MB file limit. BIM's cloud API separately caps IFC input at 50 MB and IDS at 5 MB. Upload receipt times out after 120 seconds. A request cannot bypass limits by omitting or lying about Content-Length.

BIM geometry runs in a separate process. The worker has a 300-second timeout and bounded report size. One geometry worker is accepted at a time; excess requests receive 503 with Retry-After. Native failures become API errors rather than killing the HTTP process. This limits concurrency, but it is not an operating-system memory quota.

Sessions expire from in-memory tracking after 24 hours without active requests; at most 256 sessions are tracked. Files and persistent project rows need their own lifecycle policy before durable hosting is introduced. Do not mistake in-memory expiry for complete disk/database cleanup.

Keep `/health` for BIM and `/api/ping` for STL under external monitoring. Check real upload, processing and download workflows periodically in addition to health endpoints. Store credentials only in the approved CLI/environment secret stores; never commit them or include them in diagnostics.

## Release procedure

Pointcloud's native local automation bridge accepts clients without a browser Origin and validates its loopback Host header. Browser-origin requests are rejected; script bodies are bounded by their actual streamed bytes at 1 MB and require valid UTF-8. This does not replace operating-system account permissions for local processes. Native LAS/LAZ indexing is currently limited to 50 million points and still holds the cloud in memory. Editable source preparation is bounded separately at one million points and 128 MB. These limits are implementation bounds; representative large-file resource acceptance remains outstanding.

1. Review the readiness report and resolve release blockers. Verify browser and Windows variants independently.
2. Inspect the Git diff and stage only the intended source, tests, maintained documentation and reproducible artifacts. Preserve unrelated user work.
3. Run required checks, build the exact release artifacts, and record the source commit and artifact digest.
4. Push the reviewed commit. Deploy the verified Vercel outputs and Render services using the repository's deployment tools.
5. Run live theme/load and real API workflow verification. Test tenant isolation and downloadable file content.
6. Record deployment IDs, source commit, verification timestamps and rollback artifacts. Keep the previous tested build available for rollback.

Windows release acceptance must cover clean install, first launch, file associations, dependency/model installation, save/reopen/export, recovery, upgrade and uninstall. Signing and a working update channel require separate verified release configuration. Native GUI acceptance remains outstanding in this audit.
