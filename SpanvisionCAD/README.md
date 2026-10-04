<p align="center"><img src="assets/logo.svg" width="112" alt="Spanvision Infra CAD logo"></p>

# CAD

CAD is a desktop and browser editor for 2D drafting and 3D modeling. It reads and writes DWG and DXF drawings through a shared Rust core. Desktop builds also provide CLI, REST `/api/v1`, MCP, and native plugins.

## Appearance

New profiles use **Spanvision Mono**: black page backgrounds, a dark gray model-space canvas (#1B1B1B), dark gray surfaces, white and light gray text, and white focus and active states. Existing theme and canvas preferences remain in effect. Drawing layer colors, materials, imported images, geometry, and paper-space output retain their document colors.

## Build

Product names, logos, window titles, package metadata, and translated interface text identify **CAD**. Upstream sponsor artwork is excluded. Original authorship and third-party sources are recorded in the legal notices; compatibility identifiers are retained for existing plugins, settings, and drawings. Run `python3 scripts/check_brand.py` to check the distribution identity and visual assets before packaging.

The source requires a Rust toolchain and the platform libraries used by Iced/wgpu.

```sh
cargo build --locked --release --bin SpanvisionCAD
```

The executable is `target/release/SpanvisionCAD` (`SpanvisionCAD.exe` on Windows). Run `SpanvisionCAD --help` for export, automation, REST, and MCP options. Browser builds use:

```sh
rustup target add wasm32-unknown-unknown
trunk build --locked --release --public-url /app/ --dist dist/app --html-output index.html web-app.html
sh scripts/assemble-site.sh dist
```

The site builder emits relative links until `website_url` is configured in [brand.json](brand.json). Release, feedback, donation, community, and tutorial actions require corresponding Spanvision URLs in that manifest. Publishing is disabled by default. The browser build needs a same-origin HTTPS deployment to use browser storage and file APIs.

## Existing profiles and integrations

On first launch, when the new profile has no settings file, CAD copies supported settings, command aliases, custom fonts, plot styles, and plugins from the former `OpenCADStudio` profile into `Spanvision Infra/CAD`. Existing files in the new profile win; the old directory is retained. Same-origin browser builds read former local-storage keys when their new keys are absent. Browser storage cannot migrate across origins.

The plugin ABI, REST `/api/v1` operations, and existing `ocs_*` MCP tool names remain stable. Installed desktop packages also provide an `OpenCADStudio` executable alias where the platform allows it. See [automation](docs/automation/README.md) and [plugin architecture](docs/plugin-architecture.md).

## Font source

If a drawing needs a missing SHX font, enter your organization's font server URL in the prompt. No default external font source is configured. Fonts are stored in your CAD profile; existing fonts and user-selected sources remain available.

## License and attribution

This distribution is licensed under [GNU GPL v3.0 or later](LICENSE). Original project attribution and third-party notices are recorded in [NOTICE.md](NOTICE.md). Spanvision Infra branding identifies this distribution; it does not change third-party licenses or copyright ownership.

Customer-facing product identity is CAD — Spanvision Infra. Original source correspondence is archived outside this application under the workspace's `source-provenance/` directory. Distribution notices are available through the website's Legal and licenses page.
