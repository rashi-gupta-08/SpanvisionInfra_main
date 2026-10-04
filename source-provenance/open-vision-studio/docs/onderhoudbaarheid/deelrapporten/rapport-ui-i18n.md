# Onderhoudbaarheidsrapport — UI-laag, i18n en platformsplit
**Open Planner Studio** (49.860 regels TS/TSX in `src/`, `tsc --noEmit` = exit 0)

## Kerncijfers

| Map | Regels | Bestanden |
|---|---|---|
| `src/components/` | 21.121 | 104 |
| ├ `dialogs/` | 6.702 | 30 |
| ├ `layout/` | 3.519 | 19 |
| ├ `canvas/` | 2.846 | 11 |
| ├ `panels/` | 2.724 | 10 |
| ├ `backstage/` | 1.889 | 6 |
| ├ `task-sections/` | 1.212 | 14 |
| ├ `common/` | 1.110 | 7 |
| ├ `settings/` | 513 | 2 |
| `src/engine/` | 8.067 | 29 |
| `src/i18n/` | 204 + 56 JSON-bestanden | |

**Top-10 grootste UI/render-bestanden:** `GanttRenderer.ts` 1655 · `GanttCanvas.tsx` 1489 · `ribbonWidgets.tsx` 918 · `ribbonConfig.tsx` 653 · `ReportPanel.tsx` 633 · `TableEditor.tsx` 616 · `Backstage.tsx` 553 · `ScreenshotAnnotator.tsx` 491 · `CalendarForm.tsx` 472 · `SettingsPanelContent.tsx` 443.

**Algemene indruk:** opvallend gedisciplineerd — zichtbare, gedocumenteerde refactor-golven (audit P18 ribbon, H1 settings-register, UI-F4 dialoog-primitive, C5/P17 themapalet, E2 code-splitting). `App.tsx` is met 370 regels géén god-component meer. De problemen zijn geconcentreerd, niet diffuus.

## (a) Bevindingen

### 1. `GanttCanvas.tsx` is de enige echte god-component — HOOG
`src/components/canvas/GanttCanvas.tsx:64`: één functie van **1426 regels** met 60 `useAppStore(...)`-aanroepen (`:78`–`:146`), 12 `useMemo`, 14 `useCallback`, 8 `useEffect`, en ≥8 gescheiden verantwoordelijkheden (primaire render `drawPrimary` `:496`, split-view `drawSecondary` `:559`, histogram `:413`/`:385`/`:467`, mini-map, splitter, muisgebaren `:773`–`:1100`, contextmenu-bedrading `:1348`–`:1477`, tooltip + toast). Muisgebaren zijn al deels uitgetrokken naar `canvas/hooks/` (5 hooks, ~750 regels) — het patroon bestaat, maar is halverwege gestopt.

> **Voorstel:** trek `<HistogramStrip>`, `<SecondaryPane>` en `<GanttContextMenuHost>` los met eigen selectors; verplaats `sharedAxis`/`effectiveView`/`totalContentWidth`-memo's naar een `useGanttViewport()`-hook. Doel: ≤ 500 regels, ≤ 20 selectors.

### 2. `MenuBar.tsx` is dode code met een kapotte parallelle bestands-I/O — MIDDEL
`src/components/layout/MenuBar/MenuBar.tsx` (125 regels) wordt **nergens geïmporteerd** (enige treffer van de weesdetectie). Inhoudelijk verouderd én in strijd met de architectuur: `:26` bouwt zelf een `<input type="file">` (omzeilt `fileAccess` volledig); `:47` altijd blob-download, ook in Tauri; `:18` de enige selectorloze `useAppStore()`; `:69-85` hardcodeert sneltoetslabels en labelt Ctrl+S fout; `:122` toont `menuBar.version` = "Open Planner Studio v0.1" (hardcoded in 14 locales). De `menuBar.*`-tak = 14 keys × 14 locales = **196 dode vertaalregels**.

> **Voorstel:** verwijder de map + de `menuBar`-tak uit alle 14 `menu.json`; werk `ifcSaveInput.ts:7,28` bij.

### 3. Dezelfde actie wordt op 4 oppervlakken opnieuw gedefinieerd — HOOG
Vier actie-oppervlakken, elk eigen mechanisme: ribbon (`ribbonConfig.tsx`, declaratief), sneltoetsen (`shortcutRegistry.ts`, declaratief), contextmenu (24 losse callback-props), backstage (inline handlers). "Taak toevoegen met standaardduur" staat **8× in de UI-laag** (`ribbonConfig.tsx:116`, `ribbonWidgets.tsx:181`, `TaskDialog.tsx:33`, `GanttCanvas.tsx:823,1369,1378,1409,1416,1424`, `shortcutRegistry.ts:284,304`). Guards lopen uiteen: ribbon en shortcuts toetsen `isTreeMode(...)` vóór uitvoering, `GanttCanvas.tsx:1428` (`onIndent`) niet — latent gedragsverschil.

> **Voorstel:** één `COMMANDS`-register (`{id, labelKey, icon, run, enabled, visible}`) naar het model van `SHORTCUTS`/`RIBBON_TABS`; begin met de ~12 acties op ≥2 oppervlakken.

### 4. `ContextMenu` is het enige echte prop-drilling-geval — MIDDEL
`ContextMenu.tsx:12`: **34 props** waarvan 24 callbacks (de op één en twee na grootste props-interface in de codebase heeft er 9). Bedrading kost 130 regels JSX in `GanttCanvas.tsx:1348-1477`.

> **Voorstel:** laat `ContextMenu` eigen store-acties ophalen; alleen `{x, y, task, barHit, group, onClose}` doorgeven.

### 5. In de browser-build zijn de vensterknoppen dood — MIDDEL
`TitleBar.tsx:150-159` rendert onvoorwaardelijk minimaliseren/maximaliseren/sluiten; de handlers (`:53`, `:58`, `:68`) beginnen alle drie met `if (!isTauri()) return;`. In de **productie-webdeploy** ziet de gebruiker drie dode OS-vensterknoppen.

> **Voorstel:** `{isTauri() && (...)}` om het blok; overweeg `data-platform` op `<html>`.

### 6. Platformsplit-discipline is uitstekend; één lek in `ReportPanel` — MIDDEL
**0 top-level `@tauri-apps/*`-imports** in `src/`; alle 27 aanroepen dynamisch binnen `isTauri()`-takken; `isTauri` op één plek (`utils/platform.ts:8`); 54 aanroepen over 16 bestanden; meerdere expliciete `KRITIEK:`-comments. `fileAccess` is klein en scherp (298 regels, 4 bestanden). Eén lek: `ReportPanel.tsx:231-250` (`writePdf`) herimplementeert de split zelf omdat `saveFileDialog` alleen `string` accepteert en een PDF `Uint8Array` is.

> **Voorstel:** `saveBinaryFileDialog(defaultName, bytes, filters)` toevoegen aan `fileAccess`; `writePdf` erop.

### 7. i18n-dekking is 100 %, maar niets bewaakt het — MIDDEL
Gemeten key-diff over alle 56 JSON (canon = `nl`, 1124 keys): alle locales 100% (de "ontbrekende"/"extra" keys zijn correcte CLDR-pluralcategorieën). Identieke nl-waarden aan andere talen bleken bij inspectie vrijwel allemaal terecht (OK, WBS, IFC, homografen). Codekant schoon: 863 letterlijke `t()`-keys, 0 ontbrekend.

Risico zit in de borging: `scripts/i18n-diff.mjs` bestaat (exact het juiste script) maar staat **niet in package.json scripts en niet in ci.yml**. Een feature met 20 nieuwe nl-keys slipt geruisloos door; de app valt terug op Engels.

> **Voorstel:** `verify:i18n` in package.json + ci.yml; script laten exit(1) doen bij missing > 0; negeerlijst voor CLDR-categorieën; omgekeerde check (t()-keys die niet in nl bestaan).

### 8. RTL (ar/fa) is correct opgezet, met een beperking — LAAG
`config.ts:16` RTL_LOCALES; `:56-61` zet `dir` bij init én languageChanged. PDF-export heeft volwaardige bidi (`bidiShape.ts`, 400+ regels). Maar: 9 fysieke `left:`/`right:`-declaraties in CSS tegenover 8 logische; 332 inline styles; en de **canvas-renderer is volledig LTR** (`dateToX` `:219`, taaktabel links `:1387`) — voor ar/fa blijft de Gantt LTR terwijl de chrome spiegelt.

> **Voorstel:** documenteer de tekenlaag als bewust LTR-only; normaliseer de 9 fysieke offsets naar `inset-inline-*`; Playwright-smoketest voor `dir=rtl`.

### 9. De settings-conventie wordt gevolgd, maar de regel klopt niet met de praktijk — LAAG
`SettingsPanelContent` (443 regels) is gedeeld over de drie ingangen — conventie gerespecteerd. `settingsRegistry.ts` (23 descriptors) is sterk. Maar 6 van de 23 persistente voorkeuren staan alleen in de Beeld-ribbon (weergavetoggles), terwijl CLAUDE.md de regel absoluut stelt. Twee concrete gebreken:
- `SettingsPanelContent.tsx:185-187`: datumnotatie-opties tonen hardcoded **`'dd-mm-jjjj'` enz.** — Nederlands (`jjjj`), onvertaald in alle 14 locales. De enige echte hardcoded zichtbare tekst uit de scan.
- `:209-214`: dode sectie "Standaardzoom" met een statische `<span>30 px/day</span>`.

> **Voorstel:** notatielabels via `t()` of genereren uit een voorbeelddatum; dode sectie verwijderen/implementeren; regel in CLAUDE.md aanscherpen (applicatie-instellingen vs. weergavetoggles).

### 10. Ribbon: declaratief en goedkoop uitbreidbaar, één restduplicatie — LAAG
`ribbonConfig.tsx` is een echte registry (9 tabs, drie item-soorten, escape-hatch `kind:'component'` voor 14 widgets); gedeelde items worden hergebruikt; een knop toevoegen = één object-literal (4 regels); rules-of-hooks bewust afgedekt (`RibbonTabContent.tsx:100`, tab-unieke keys). Restpunten: `Ribbon.tsx:41` hardcodeert de tabvolgorde als tweede lijst naast `RIBBON_TABS`, en `:48` bevat een id↔key-vertaalhack (`beeld`→`view`, `instellingen`→`settings`) omdat twee van de negen tab-ids Nederlands zijn.

> **Voorstel:** tabvolgorde uit de registry; hernoem `beeld`/`instellingen` naar `view`/`settings`.

### 11. `GanttRenderer`: goede methodesplitsing, twee verantwoordelijkheden in één klasse — MIDDEL
1655 regels, 37 methoden, gemiddeld 44 regels; hit-test puur geometrisch en gescheiden (`:1567`–`:1656`); as-abstractie netjes uitgetrokken (`timeAxis`/`workdayAxis` + `GanttAxis`-interface); themapalet injecteerbaar. Wat er niet in hoort: **`drawTaskTable()` (`:1387`, 180 regels)** tekent de volledige takentabel binnen de chart-renderer. `GanttRenderOptions` heeft ~25 velden; een nieuwe visuele feature = veld toevoegen + doorgeven in `drawPrimary` én `drawSecondary` + methode aanhaken.

> **Voorstel:** splits `GanttChartRenderer` / `TaskTableRenderer` met gedeelde `RowLayout`; hit-tests naar een puur `ganttHitTest.ts`; één `buildRenderOptions(store)`-helper voor beide panes.

### 12. Styling: drie mechanismen naast elkaar, thema's zelf consistent — LAAG
Tailwind (1447 `className=`) + 12 CSS-bestanden (3136 regels) + 332 inline styles; 0 CSS-modules. Themasysteem strak: 98 tokens, exact 35 variabelen per thema × 3 thema's, geen ontbrekende. Renderer via `themePalette` uit dezelfde variabelen; high-contrast heeft eigen `highContrast`-vlag. Zwak: **38 hardcoded hexkleuren in TSX** (ExtensionManagerPanel 8, VarianceReport 7, ReportPanel 5, DebugTerminal 5, MilestoneReport 4, SettingsPanelContent 3) — volgen het thema niet; contrastrisico in high-contrast.

> **Voorstel:** hexwaarden → CSS-variabelen of `themePalette.BRAND`-tokens; regel "geen hex in components/" in CLAUDE.md (greppable).

### 13. Focus-trap ontbreekt in 3 modale oppervlakken — LAAG (a11y)
`common/Dialog.tsx` bundelt overlay + `useDialogKeys` + `useFocusTrap` + aria; 19 van 22 dialogs gebruiken hem. Zonder: `ScreenshotAnnotator.tsx`, `CloseDocumentDialog.tsx`, `canvas/ContextMenu.tsx` (geen focus-trap, geen `role="dialog"`). `CloseDocumentDialog` is juist de destructieve-keuze-dialoog.

> **Voorstel:** `CloseDocumentDialog` → `common/Dialog`; `useFocusTrap` in `ScreenshotAnnotator`; `role="menu"` + pijltjesnavigatie in `ContextMenu`.

### 14. Kleinere gebreken — LAAG
- `TitleBar.tsx:40-51`: `useEffect` retourneert cleanup vanuit een async IIFE — React ontvangt die nooit; `onResized`-listener lekt bij unmount.
- `ReportPanel.tsx:29-36`: `describeVectorFallback` bouwt Nederlandse strings buiten `t()` om (nu alleen console.warn).
- `GanttCanvas.tsx:118`: abonneert op het hele `project`-object waar alleen `startDate`/`statusDate` nodig zijn.

## (b) Prioriteitsvolgorde

| # | Bevinding | Ernst | Inspanning |
|---|---|---|---|
| 5 | Dode vensterknoppen web-build | Middel | **Triviaal** (1 regel) |
| 9 | `dd-mm-jjjj` hardcoded + dode zoom-sectie | Laag | **Triviaal** |
| 2 | `MenuBar.tsx` + 196 dode vertaalregels | Middel | **Klein** |
| 7 | `i18n-diff.mjs` in CI met exit-code | Middel | **Klein** |
| 6 | `saveBinaryFileDialog` in `fileAccess` | Middel | Klein |
| 13 | `CloseDocumentDialog` → `common/Dialog` | Laag | Klein |
| 10 | Ribbon-tabvolgorde uit registry | Laag | Klein |
| 12 | 38 hexkleuren → tokens | Laag | Middel |
| 4 | `ContextMenu` 34 → 6 props | Middel | Middel |
| 1 | `GanttCanvas` opsplitsen | **Hoog** | Middel |
| 11 | `GanttRenderer` splitsen + hit-test extraheren | Middel | Middel |
| 3 | `COMMANDS`-register | **Hoog** | **Groot** |

De vier bovenste posten zijn samen minder dan een dagdeel werk. Bevindingen 1, 3 en 11 hangen samen — een `COMMANDS`-register maakt de contextmenu-ontkoppeling én het afslanken van `GanttCanvas` goedkoper, dus die volgorde is de juiste.
