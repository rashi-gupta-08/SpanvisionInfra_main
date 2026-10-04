# Hyperkritische review — deelrapport systemische risicoketens

Dit rapport is **fundamenteel gezond**. Vrijwel elke harde claim houdt stand bij eigen natrekking. Wat er mis mee is zit in de randen: een verkeerde bestandsverwijzing, drie getallen die niet reproduceren, één keten waarin drie ongelijke dingen op één hoop gaan, en een paar "goedkoopste brekingen" die goedkoper worden voorgesteld dan ze zijn.

## Zelf geverifieerd — en klopt

**[BEVESTIGD] De drie `dangerouslySetInnerHTML`-sites bestaan, precies daar** (`ExtensionManagerPanel.tsx:137`, `Backstage.tsx:512`, `ribbonWidgets.tsx:421`); verder niets in `src/`.

**[BEVESTIGD] Manifest-iconen gaan ongefilterd door.** `installFromZipBlob` doet `JSON.parse(...)` (`extensionService.ts:177`) en zet het manifest ongewijzigd in IndexedDB én de store (`:227-232`); `extractManifestFromCode` idem (`:137`). Geen veldvalidatie, geen icon-whitelist, geen DOMPurify in de repo.

**[BEVESTIGD] En het rendert óók bij een uitgeschakelde en bij een geweigerde extensie** — de scherpste claim van het rapport, exact goed. `loadAllExtensions` registreert het manifest met `status:'disabled'` (`extensionLoader.ts:238-243`) **vóór** activatie; de `minAppVersion`-gate gooit pas ín `enableExtension` (`:163-168`), ná registratie. `InstalledExtensionCard` rendert onvoorwaardelijk. Extensie die niet mag draaien → `<img src=x onerror=…>` vuurt zodra Backstage → Extensies opengaat.

**[BEVESTIGD] Multi-instantie-vernietiging, inclusief de prefix-claim.** Opruimlus nagebouwd en gedraaid op een gemengde listing: productie verwijdert `recovery.docB.ifc`, `recovery.ops-worktree2.docX.ifc`, `recovery.feature-x.docY.ifc`, `recovery.ifc`; dev verwijdert niets. Eenzijdig, precies zoals beschreven.

**[BEVESTIGD] Baselines sneuvelen bij crash-herstel — scherper dan het rapport zegt.** De hele keten draagt baselines (`documentContract.ts:87-88,243-244`, `ifcSaveInput.ts:43-44`, `ifcReader.ts:82,95`) — behalve `useRecoveryRestore.ts:63-70`. De data staat in het herstelbestand en wordt op de laatste meter weggegooid. Extra pijnlijk: `IFCPanel.tsx:19` draagt commentaar over precies deze bugklasse ("ONVOLLEDIGE IFC (baselines gingen verloren…)") — daar gefixt, hier niet.

**[BEVESTIGD] `exportAs` draait geen `runCPM` en kijkt niet naar `scheduleStale`** (`fileSlice.ts:235-277`); `autoCalcCPM: false` (`uiSlice.ts:69`); de drie exporters schrijven `task.time.earlyStart`.

**[BEVESTIGD] `isDirty` op verouderde inhoud gewist** — regelnummers exact (`:188` serialiseert, `:195/:201` awaiten, `:196/:210` wissen).

**[BEVESTIGD] `saveFile` heeft geen try/catch — en de hangende dialoog is echt.** Ook de Tauri-backend vangt niets. `CloseDocumentDialog.tsx:35-42`: bij een reject wordt `setUI({pendingCloseDocId:null})` nooit bereikt → dialoog blijft permanent staan. Wel Tauri-only: `saveToRefWeb` vangt alles af (`webBackend.ts:94-96`) — dat had het rapport mogen zeggen.

**[BEVESTIGD] Klembord-`calendarId`**, **[BEVESTIGD] web-recovery aan `sessionStorage`**, **[BEVESTIGD] import overschrijft terwijl `openFile` de pristine-check wél doet**, **[BEVESTIGD] de hele releaseketen** (ci.yml niet op tags; release.yml zonder teststap; live.yml zonder `needs`; silent updater-tak zonder log; `bump-version.js` accepteert `2026.07.1`; `parseInt('v2026')||0`; snap naar `stable` vóór publicatie), **[BEVESTIGD] alle kennisdrift-punten** (incl. suite zelf gedraaid: **431/431 over 22 batterijen**), **[BEVESTIGD] de MenuBar-zombie** (root-commit heet "dode MenuBar verwijderd" en het bestand staat er; daarna nog twee keer aangeraakt), **[BEVESTIGD] geen atomair schrijven**, **[BEVESTIGD] `csp: null` + home-recursive capabilities + één `invoke()` in heel `src/`**.

## Wat er mis is met het rapport

**[BEVESTIGD] Verkeerde bestandsverwijzing.** De geprezen veilige catalogus-kaart staat niet op `Backstage.tsx:247` maar op **`ExtensionManagerPanel.tsx:251-254`**. De pointe klopt (het commentaar daar bewijst dat de auteur het gevaar kende), maar in een rapport dat het van zijn citaten moet hebben is dit niet niks.

**[BEVESTIGD] De drie injectiesites zijn niet gelijkwaardig.** Alleen site 1 rendert manifest-data van een extensie die *niet draait*. Sites 2 en 3 renderen iconen die door **draaiende** extensiecode zijn geregistreerd — die zit al in dezelfde realm met volledige `window`-toegang, dus HTML-injectie levert daar niets extra's op. "Zelfde injectie" tilt een echte severity-trap plat; het dreigingsverhaal is opgeblazen met factor drie. De fix (alle drie dichten) blijft juist.

**[BEVESTIGD] Keten 1 punt 1 is te mild geformuleerd.** Ook bij méérdere documenten waarvan er één niet parst is het corrupte document altijd weg: zowel `onRestore` (`:92`) als `onDiscard` (`:96`) roepen `clearRecovery()` aan, en `clearTauri` verwijdert elk bestand uit het manifest (`recoveryStore.ts:106-107`). Het rapport verkoopt zichzelf tekort.

**[BEVESTIGD] De catch-census 106/19/26 reproduceert niet.** Eigen teller (accolade-matching, commentaar gestript): **93** catch-blokken (+10 `.catch(`), **33** leeg/comment-only, **17** alleen `console.*`. Het beeld is onaantastbaar; presenteer dan geen exacte cijfers zonder telscript.

**[BEVESTIGD] Keten 3 mist een callsite:** naast `Backstage.tsx:336` roept ook `ribbonWidgets.tsx:384` (ExportDropdown) `exportAs` aan.

**[BEVESTIGD] Keten 3's fix heeft een gat.** `runCPM` raakt `isDirty`/undo niet (goed), maar bij een cyclus doet de solver `if (result.error) { s.cpmResult = result; return; }` (`scheduleSlice.ts:70-73`) — `scheduleStale` staat dan al op `false` en de export loopt door met oude `task.time`-waarden. De one-liner moet ook op `cpmResult.error` afbreken.

**[BEVESTIGD] Keten 7a's fix is duurder dan "een helper".** Er is geen bestaande toast om op aan te sluiten — het is lokale `useState` in `GanttCanvas.tsx:174`, onbereikbaar van buiten; `api.ui.showNotification` schrijft alleen naar `appLog`. De breking begint dus met toast-state naar de store tillen. Gemist vierde kanaal: een rauwe `alert()` in `IFCPanel.tsx`.

**[BEVESTIGD] Keten 7b's fix heeft een semantische bijwerking.** Dezelfde regel op `extensionApi.ts:76-80` verandert het contract van `api.data.loadProject` van "vervang in-place" naar "open nieuw tabblad" — een breaking change voor bestaande extensies, gedocumenteerd in `docs/extensions.md`.

**[BEVESTIGD] Twee gemiste `loadState`-callsites:** `IFCPanel.tsx:49` en `MenuBar.tsx:36`. De eerste is verdedigbaar (zelfde document) maar wist wél de undo-stack — wat het rapport bij de import-paden juist als schade opvoert.

**[BEVESTIGD] "De enige poort vóór productie-deploy is `tsc`" is slordig.** `ci.yml` heeft een volwaardige `test`-job (tsc, planning-suite, verify:examples, verify:docs). Het punt overleeft (die job blokkeert `live.yml` niet), maar de formulering suggereert dat er geen suite in CI draait.

**[VERMOED · hoog] Keten 1 punt 3 heeft een smallere trigger.** De constructie klopt, maar `ifcWriter.ts` heeft precies één `throw` (regel 262, onbekend custom-field-type) — bereikbaar, geen alledaags scenario. Het rapport suggereert dat `writeIFC` regelmatig omvalt; dat blijft onbewezen.

**[BEVESTIGD, triviaal]** Kader-cijfers lopen één commit achter (142/123/141 i.p.v. 141/122/140).

## Kon ik niet controleren
Of `saveFileDialogWeb` óók kan rejecten (hangende-dialoog staat alleen voor Tauri hard); of branch protection de CI-testjob afdwingt; of twee productie-Tauri-vensters op elk OS startbaar zijn; de rest van de writer op throws; de extensie-XSS end-to-end (datastroom regel voor regel geverifieerd, niet daadwerkelijk laten vuren).

## Oordeel
**Dit gaat door.** De vier scherpste beweringen — manifest-XSS bij uitgeschakelde extensies, de prefix-collisie in de opruimlus, de weggegooide baselines en de hangende sluitdialoog — zijn zelf nagerekend en staan als een huis.

**Minimaal te repareren:** (1) `Backstage.tsx:247` → `ExtensionManagerPanel.tsx:251`; (2) keten 2 splitsen naar severity (site 1 = kwetsbaarheid, 2 en 3 = hygiëne achter een reeds open grens); (3) catch-cijfers vervangen door reproduceerbare (93/33/17 mét telscript) of "tientallen"; (4) de vier brekingen eerlijk beprijzen (cyclus-tak, toast-state uit GanttCanvas, gebroken extensie-API-contract); (5) keten 1 punt 1 aanscherpen naar de multi-document-variant. De prioriteitenlijst onderaan blijft staan — die vier zijn de juiste vier.
