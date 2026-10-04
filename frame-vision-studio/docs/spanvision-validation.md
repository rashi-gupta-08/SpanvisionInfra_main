# Frame Vision Studio — validation, 2 October 2026

## Verified

| Check | Result |
| --- | --- |
| Production frontend build | `npm run build` passes. Complete static output includes browser engine, fonts, companions, icons and notices. |
| Responsive workspace | All 20 workspace views opened at 390×844, 768×1024 and 1440×900. No document-level horizontal overflow or upstream product branding in visible app text. |
| Welcome and settings | Mobile, tablet and desktop layouts inspected; Settings/About shows Spanvision infra and Frame Vision Studio. Dialog focus is contained, Escape closes, and trigger focus is restored. |
| Palette | Computed page `rgb(0,0,0)`, panels `rgb(18,18,18)`, canvas/inputs `rgb(27,27,27)`, primary button white with black text. Supporting text and state tokens match the specified palette. |
| Keyboard focus | Visible outline uses `rgba(255,255,255,0.65)` and overrides local component outline resets. |
| Frame workflow | Created a 900×1400 tilt-and-turn frame, changed width to 1200 via Enter, then undid to 900. Canvas pan/zoom transform stayed constant during editing. |
| Desktop preferences | Selected Blue, reloaded, and verified Blue persisted; restored Spanvision Mono. Collapsed desktop project panel, used mobile drawers, returned to desktop and verified it stayed collapsed. Reopened width 220px; right width stayed 290px. |
| Canvas responsiveness | Main frame fits after substantial viewport changes; mobile Fit/zoom buttons inspected. 3D view rendered without JavaScript errors in the production preview. |
| Production layout | Mobile production tabs and table both use local horizontal scrolling; root content width is 390px and table is 920px. Energy/circularity summary cards wrap into two columns. |
| AI UI | Suggestions and provider configuration inspected; white primary controls and grayscale message/selection states checked. No live provider request sent. |
| Companion pages | Configurator, workshop and AR UI inspected at all three widths. Simulated workshop scan produced K01-SL details. Black background / #121212 header verified. |
| Metadata/assets | All locale product/organization values, Tauri metadata, native icon dimensions, and frontend metadata checked. Supplied LICENSE bytes match the retained public license file. `git diff --check` passes. |

Screenshots and compact browser observations are delivered in the preview folder; JSON observations are copied to `docs/validation-evidence`. The production preview runs at `http://127.0.0.1:5176/` on the local machine. The web ZIP contains the same compiled output.

## Limits

- Rust, wasm-pack and the Tauri CLI were not installed. The changed native export strings, executable identity, configuration migration and installers have not been compiled or run locally. Original native/engineering model interfaces are retained. The browser engine is the recorded upstream compiled artifact, with generated document-reference branding applied in the adapter.
- The original browser limitations remain: certain curtain-wall, filesystem export/import, CNC and project-management commands require the desktop runtime. Opening all screen UIs does not validate every native engineering calculation.
- Workshop scanning remains a simulation. AR was checked as a responsive UI; no model file or physical AR device was supplied. Two-finger touch handlers were implemented, while Fit/zoom controls and responsive geometry were checked in the browser viewport.
- Login, sign-up, account screens and business photography are absent from the supplied archive. Scope was confirmed as improving existing screens.
- The production build retains existing unused-selector warnings and large bundle warnings; they do not block the build. No JavaScript errors occurred in final production checks.
- Upstream attribution and the supplied license/Cargo declarations are retained in the notices and source records.
