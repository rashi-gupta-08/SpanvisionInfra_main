# BIM and 2D CAD main preview integration

The supplied `Vision-BIM-Validator-Spanvision.zip` is imported into
`vision-bim-validator`. Its React frontend, FastAPI validation engine,
IFC/IDS fixtures, settings, and source notices are retained.

The suite registry adds Vision BIM Validator at port 4260. The main overview
has direct BIM and 2D CAD links, and Tools includes CAD, 2D CAD, and BIM. BIM
uses one origin for its built frontend, deep links, validation jobs, and BCF
downloads. A suite adapter supplies availability and validates the running
build before reuse. The normal suite build and branding commands support the
new module. The validator keeps its existing SI browser icon.

Verified on 3 October 2026:

- Production TypeScript check and Vite build for BIM and the suite hub passed.
- `node branding/sync.mjs --check` passed for all module adapters.
- `npm run verify:bim` passed all 12 integration scenarios without uncaught
  browser errors. Main preview and BIM landing layouts passed at 320, 390,
  820, and 1440 pixels.
- Opening BIM from Tools loads a geometric IFC model in the existing viewer.
- The validation UI submits the failing IFC fixture with a custom IDS file,
  reports the expected failed wall check, and produces a BCF ZIP.
- Opening 2D CAD from Tools creates a drawing. A rectangle drawn on the canvas
  survives downloading and parsing the `.o2d` project.
- Existing hub screen, dialog, and account checks passed at 390 and 1440 pixels.

`results.json`, `validation.json`, `validation.bcfzip`, `drawing.o2d`, and PNG
captures in this directory record these checks. The browser tests use Edge in
an isolated profile and run against the local preview.

Open the main preview at http://127.0.0.1:4230/. Run `npm run preview:suite` to
start it again, or `npm run preview:bim` to start the validator alone.
