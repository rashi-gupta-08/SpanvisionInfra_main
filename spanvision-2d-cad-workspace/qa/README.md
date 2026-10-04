# Web edition verification

Verified on 2 October 2026 against the production build at
`http://127.0.0.1:4220/`, using Microsoft Edge through Playwright.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 26 tests passed across 5 files |
| `npm run build` | Passed; static output in `dist/` |
| Production browser checks | 20 passed; no uncaught browser errors |

The browser run exercises New, drawing a rectangle, `.o2d` download fallback,
opening an `.o2d` project, SVG/DXF/IFC4/JSON exports, persistent theme choices,
draft restoration, hidden desktop actions, license access, touch review,
markup recovery, and marked-up PNG download. Page overflow is checked at each
tested editor width. Results are saved in [browser-results.json](browser-results.json).

Native File System Access save handles and cancellation are covered with mocked
browser handles in the unit tests. Real browser download fallback is exercised
by Playwright; an operating-system file picker is not automated. Tests also cover
separate document handles, edits made during a save, settings recovery, complete
project serialization, markup coordinates, and keeping markup outside `.o2d`.

## Screenshots

| Viewport | Start | Workspace |
| --- | --- | --- |
| Desktop, 1440 × 900 | [Start](start-desktop.png) | [Editor](workspace-desktop.png) |
| Tablet, 820 × 1180 | [Start](start-tablet.png) | [Editor](workspace-tablet.png) |
| Phone, 390 × 844 | [Start](start-phone.png) | [Touch viewer](workspace-phone.png) |
| Small phone, 320 × 740 | — | [Touch viewer](small-phone.png) |

Additional screenshots: [download dialog](save-dialog-desktop.png),
[restore](restore-desktop.png), [About](about-desktop.png),
[measurement](measure-phone.png), [markup](markup-phone.png), and
[recovered markup](recovered-phone.png). The generated
[marked-up PNG](marked-up-review.png) excludes editor controls.

The screens were visually inspected for readable labels, grayscale surfaces,
canvas contrast, visible selection and focus states, centered dialogs, and
usable phone controls. Entity and markup colors remain user-controlled.

## Repeat the browser run

Install Playwright and its Edge/Chromium browser environment, start the production
preview, and run the script with `CAD_PREVIEW_URL` set to the preview URL:

```powershell
$env:CAD_PREVIEW_URL = 'http://127.0.0.1:4220/'
node qa/browser-check.cjs
```

This run used the bundled Playwright module through `NODE_PATH` and the installed
Edge channel. The script defaults to port 4174 when no URL is supplied. It creates
an office drawing fixture and saves downloads/screenshots in this directory.

The retained importers support `.o2d`, DXF geometry, and SVG sheet templates.
IFC4 and JSON are export formats. The browser run verifies export downloads;
it does not certify downstream CAD interoperability or every inherited tool.

The build reports the inherited CAD bundle-size warning and an outdated
Browserslist dataset warning; neither prevents the production build.

## Start page clipping fix

The short desktop viewport reproduced an inaccessible header at -20.875 px
and a caption overlapping the footer. The start panel now uses auto margins
that stop centering when content overflows, and the caption participates in
normal scrolling. The footer wraps on narrow screens.

The rebuilt production preview passed 12 layout checks: six viewport sizes,
each with zero and five drafts. These include 1440 × 900, 1280 × 550 and
960 × 450 desktop views (the latter two approximate the CSS viewport at higher
browser zoom), 820 × 1180 tablet, 390 × 844 phone, and 320 × 740 small phone.
Checks confirm the header is accessible from the top, the footer and caption
are reachable at the bottom, the caption does not overlap the footer, and
there is no horizontal overflow or uncaught browser error.

See [layout results](start-layout-results.json),
[fixed desktop](start-layout-desktop-fixed.png),
[compact desktop header](start-layout-compact-desktop-fixed.png),
[compact desktop footer](start-layout-footer-fixed.png), and
[small phone with drafts](start-layout-drafts-phone-fixed.png).

## Spanvision branding pass

Typecheck, lint, all 26 tests, and the production web build passed after the
branding changes. The production browser script passed all 20 checks again.

An additional six branding checks confirm the start page and browser title,
About screen, IFC dashboard, and downloaded IFC producer metadata use Spanvision
Infra and 2D CAD Workspace. Generated IFC annotation property sets, WeFC header
metadata, and MCP identity also use the shared brand configuration. The browser
made no requests to upstream brand services and had no uncaught errors. Source
license and original notices remain accessible from About.

See [branding results](branding-results.json),
[About screenshot](branding-about-desktop.png), and
[IFC metadata screenshot](branding-ifc-desktop.png).

Application and document icons were regenerated from the monochrome 2D vector
mark. Deferred Blender integration labels and desktop packaging identities were
updated, but those integrations and desktop packages were not run or built.
