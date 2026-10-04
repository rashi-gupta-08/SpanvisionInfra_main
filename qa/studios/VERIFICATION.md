# Four studio integrations

Verified on 3 October 2026 against the main preview at
http://127.0.0.1:4230/ using Edge in an isolated browser profile.

| Studio | Preview | Browser workflow exercised |
| --- | --- | --- |
| Open Vision Studio | http://127.0.0.1:4265/ | Import a supplied IFC construction schedule, render its task timeline and export IFC tasks |
| FEM Vision Studio | http://127.0.0.1:4270/ | Run the local browser solver for the supplied four-node, three-beam model and obtain a stress result |
| Frame Vision Studio | http://127.0.0.1:4275/ | Load the supplied WebAssembly engine, create a tilt-and-turn frame, change its width and undo the edit |
| Vision Calculation Studio | http://127.0.0.1:4280/ | Add a calculation designer, render the calculated document and save the branded project |

All four production builds passed. Planning, FEM and Calculation TypeScript
checks passed; Frame retains its supplied JavaScript/Svelte browser build and
recorded compiled engine. `node branding/sync.mjs --check` passed.

`npm run verify:studios` passed all 13 scenarios without uncaught browser
errors. Tests verify current build fingerprints, source notices, launcher links,
main overview/Tools/Assistant layouts at 320, 390, 820 and 1440 pixels, each
studio at 390, 820 and 1440 pixels, and the workflows above. CAD, 2D CAD and
BIM remain available. Existing hub dialog/account checks also passed at 390 pixels.

The source archives are imported into their own directories, and their licenses,
source notices, saved-preference behavior and document formats are retained.
The suite registry, build adapters and main preview now include all four tools.
Source notices are also available through the main preview footer.

`results.json`, screenshots, `planning.ifc` and
`calculation.ifccalculation` contain the integration evidence. These checks cover
browser integration and the exercised workflows. Native installers, optional
remote solvers, configured AI providers and desktop-only functions were outside
this integration and retain the limitations documented by each studio.
