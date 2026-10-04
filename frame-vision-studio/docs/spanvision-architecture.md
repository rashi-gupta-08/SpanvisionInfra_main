# Spanvision infra / Frame Vision Studio — implementation architecture

## Scope

White-label the supplied Svelte 5/Vite frontend, Tauri shell, browser companion pages, and generated document branding. Keep the current desktop composition, bundled Inter/Space Grotesk/JetBrains Mono typography, animations, frame geometry, natural material and RAL colors, undo/redo, file format, and engineering workflows.

The supplied app includes a file welcome screen, frame/curtain-wall/profile canvases, 3D view, AI suggestions, settings, reporting and production views. The companion workshop has a simulated scan result. Authentication/account screens and business photography are not present; this pass covers existing screens only.

## Layers

1. **Identity** — one frontend brand module for organization, product and initials; a new geometric SV mark for titlebar, welcome, About, browser favicon and desktop icons. Rebrand locale strings, app metadata, AI identity, companion pages, PDF/IFC/glTF output, and generated order identifiers. Retain upstream attribution, original license files and historical source documentation separately from product branding. Do not invent support domains.
2. **Design tokens** — Spanvision Mono is the default for new installations. Page `#000000`; panels/ribbon `#121212`; inputs/canvas `#1B1B1B`; elevated surfaces `#202020`; selection `#333333`; primary actions/logo `#FFFFFF`; text `#EEEEEE`; supporting text `#999999`; borders white at 16%, hover at 9%, focus at 65%. Component styles use semantic tokens instead of legacy accent literals. Existing named themes remain selectable for compatibility with saved choices.
3. **Drawing appearance** — separate interface accent/selection tokens from canvas content. Apply `#1B1B1B` to the default workspace, retain technical glass/frame/material/annotation colors, and keep previous themes and any stored canvas setting. Use the same canvas backdrop in 3D without recoloring materials.
4. **Interaction** — consistent white primary actions with black text; hover overlays, grayscale selected states, visible keyboard focus, readable disabled states, named icon controls, native buttons for panel toggles, accessible dialogs with Escape and focus restoration. Keep current animation timings.
5. **Responsive shell** — preserve resizable sidebars on desktop. On tablet/mobile provide labeled controls to open one panel at a time over the canvas, without overwriting persisted desktop widths/open settings. Contain ribbon/tab scrolling locally, constrain dialogs and tables, and adapt welcome/profile layouts.
6. **Compatibility** — retain engineering Rust crate identities, `.ofs` files, storage keys and API command names. Central brand changes affect display/output strings, not model serialization. Saved theme, language, panel and project choices remain readable.

## Verification and delivery

- Production Vite build; browser smoke checks at 390, 768 and 1440px widths.
- Check welcome, settings/About, frame creation/editing, AI suggestions/configuration, profile editor, all workspace tabs, and companion configurator/workshop/AR pages for overflow and branded text.
- Verify focus/hover/selection/disabled states and white-button contrast, default canvas color, legacy-theme persistence, and sidebar preference preservation.
- Keep preview running locally and provide a source ZIP, build ZIP, screenshots and concise validation notes. Native/WASM builds require the Rust/wasm toolchain; explicitly record any unavailable checks.
