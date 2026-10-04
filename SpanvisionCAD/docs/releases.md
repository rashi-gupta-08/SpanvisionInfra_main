# Release preparation

CAD by Spanvision Infra builds from the shared Rust core. Native artifacts use the prefix `SpanvisionCAD-`, and the browser bundle is assembled with the localized site.

The **Release preview** workflow is manual and read only. The website workflow builds a downloadable CI artifact; it does not deploy. Native release upload and store publishing steps require the repository variable `SPANVISION_PUBLISH_ENABLED=true`. `scripts/release.py prepare --publish` also requires `repository_url` and `release_url` in [brand.json](../brand.json) and `SPANVISION_PUBLISH_ENABLED=true` in its environment. Those destinations are currently unset.

Before any publication, run `cargo check --locked`, `cargo test --workspace --locked`, Clippy, the Wasm check, `trunk build --release`, `python3 scripts/test_site.py`, `python3 scripts/check_brand.py`, and native release builds for each target. Inspect the assembled site and desktop packages, including profile migration and protocol compatibility.
