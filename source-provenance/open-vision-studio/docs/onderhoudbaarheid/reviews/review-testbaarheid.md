# Hyperkritische review — deelrapport testbaarheid & kwaliteitsborging

Fundamenteel gezond. Zeldzaam: de vier vlaggenschip-claims zijn zelf nagedraaid en reproduceren allemaal. Het rapport is te goed van vertrouwen over zijn eigen dekkingsmetriek, mist de helft van het gat dat het zelf ontdekt, en heeft een handvol getallen die niet kloppen — maar de diagnose staat.

## Zelf gereproduceerd (en klopt)

**[BEVESTIGD] Vacuüm groen.** Eigen casusbestand: onzin-sleutels (`taskss`, `projectEndd`, `criticalPathh`, `projectDurationn`) met absurde waarden → **GROEN**; `"expect": {}` → **GROEN**; typefout in per-taak veld en echte-sleutel-foute-waarde → wél gevangen. Oorzaak `harness.ts:205` (`expect: any`).

**[BEVESTIGD] `run.sh` faalt volledig stil.** Syntaxfout in een check → `EXIT=1`, **0 regels output**; `set -e` breekt af vóór de resterende 15 checks + alle 431 cases. In CI: rode job met lege log.

**[BEVESTIGD] 38%.** Eigen metafiles over alle 17 entrypoints: **93 van 246** bereikt = 37,8%. Ook nagelopen: `recoveryStore.ts`, `GanttCanvas.tsx`, alle 10 extensie-bestanden niet bereikt; `GanttRenderer.ts` wél. Alle LOC-cijfers kloppen, inclusief "~3500 loc print/pdf".

**[BEVESTIGD] Pijplijnkoppeling.** `live.yml` en `ci.yml` lopen gelijktijdig zonder ordening; `release.yml`/`snap.yml` nul teststappen; `ci.yml` triggert niet op tags.

**[BEVESTIGD] Kleingoed.** dev-server-tests 30 pass (en de gladde aanroep zonder glob faalt inderdaad); geen `test`-script; drie waarde-importcycli (eigen Tarjan, identieke uitkomst); 83 useEffect; 39 isTauri; geen eslint/prettier/editorconfig; PLURAL_KEYS = 5; `roundTrip()` vergelijkt vier tellingen; geen playwright.config (playwright is niet eens een dependency); alle CLAUDE.md/README-driftclaims.

## Wat er fout in staat

- **[BEVESTIGD]** `release.yml` heeft 2× `npm install`, niet 3×.
- **[BEVESTIGD]** De `__APP_VERSION__`-NB bij bevinding 8 is onjuist: `extensionLoader.ts:13` en `sdk.ts:111` doen `typeof __APP_VERSION__ === 'string' ? … : '0.0.0'` — headless bundelen zonder de define werkt gewoon (zelf gedraaid, rc=0). Geen blokkade.
- **[BEVESTIGD]** `permissions.ts:151` is verkeerd geduid: die `continue` slaat een tabel-pad over dat niet op de API bestaat. Dat een *nieuwe* API-methode permissieloos is komt doordat `applyPermissionGuards` over `API_PERMISSIONS` itereert, niet over de API. Twee losse stille gaten; de voorgestelde tabeldekkingstest moet de API-oppervlakte tégen de tabel houden, niet andersom.
- **[BEVESTIGD]** "Alle 93 componenten ongedekt" → 91 van 93; "7 klikbare divs" → 6; "~24 telsleutels" → 18–22 afhankelijk van regex.
- **[BEVESTIGD]** "Nul assertions" bij leeg `expect` is overdreven: `harness.ts:818-856` draait op elke case drie universele invarianten. De conclusie ("431/431 is geen dekkingsmaat") overleeft; de formulering niet.
- **[BEVESTIGD]** Bevinding 4 mist een check: `main` is **protected** (`protected: true` via de API; welke checks required zijn was niet zichtbaar). Het argument moet zijn: live.yml/ci.yml racen op dezelfde push + workflow_dispatch — niet "geen branch protection".
- **[BEVESTIGD]** Sprint-1-item noemt `barDragMath` en `dropTarget` als bestaande pure modules — die bestaan niet (dat is fase 3's extractiewerk). `shortcutRegistry`, `projectTemplates`, `wbsTemplates`, `freePeriods` bestaan wél.

## Wat het rapport heeft gemist

**[BEVESTIGD] Het vacuümgat is twee keer zo groot; de Sprint-1-fix dekt de helft.** Er is géén runtime-schemavalidatie op de hele casus-JSON — niet alleen `expect`. Bewijs: `"previewExpectt"` (typo) met onzin → **GROEN** (het complete previewExpect-assertieblok verdwijnt stil); `"linkss"` → relatie stil weggegooid, case rekent een ander scenario door. Elke optionele Case-sleutel heeft dit gedrag. Een whitelist op alleen `expect` laat dit open.

**[BEVESTIGD] De echte oorzaak wordt niet benoemd: `tests/` wordt niet getypecheckt.** `tsconfig.json` include = `["src"]`; alleen check-ifc-roundtrip heeft een eigen tsconfig. Dáárom kon `expect: any` overleven. Eén `tsconfig.tests.json` + CI-regel + discriminated `expect`-interface lost bevinding 2 én de Case-validatie in één klap op — hoort in Sprint 1, niet "structureel later".

**[BEVESTIGD] Geen batterij-telling:** `run.sh` globt `cases-*.json`; een bij een rebase verdwenen bestand = stil groen met lager totaal.

**[BEVESTIGD] `tests/planning/.holidays-check.mjs` is een getrackt build-artefact** (zijn 15 broertjes staan in .gitignore, deze niet).

**[BEVESTIGD] "≈8.000 assertions" is geen kwaliteitssignaal:** 7.105 komen uit drie parameter-sweeps; het belangrijkste contract (IFC-round-trip) rapporteert er 14. Assertion-tellingen zijn onvergelijkbaar en horen niet in de samenvatting.

**[BEVESTIGD] De extensiesectie heeft de verkeerde kop.** `extensionLoader.ts:116-118` zegt zelf: "dit is GEEN echte isolatie … permissies zijn een conventie". Tegen die achtergrond zijn endsWith/zip-bom/compareVersions **robuustheidsbugs, geen beveiligingsgaten** — de aanvaller heeft al alles. De echte HOOG-bevinding: er is geen grens, alleen conventie, en geen consent-/integriteitscontrole bij `installFromCatalog`.

**[VERMOED · midden]** Volgorde-afhankelijkheid tussen cases is niet aangetoond en waarschijnlijk klein: `newProject()` is sinds audit P10 key-gedreven over `DOCUMENT_FIELDS`; alleen app-globale state lekt.

**[VERMOED · hoog]** `run.sh` schrijft vaste artefactnamen in de repo-boom — twee gelijktijdige runs clobberen elkaar; vreemd voor een expliciet multi-worktree-ingerichte repo.

## Over de aanbevolen volgorde
Sprint 1 grotendeels goed, met twee correcties: item 1 moet `tsconfig.tests.json` + Case-schemavalidatie worden; en #4 (deploy achter tests) hoort in Sprint 1 — "grootste risicoreductie per uur" in Sprint 2 zetten is zichzelf tegenspreken. Waarschuwingen: `npm ci` kan lockfile-drift blootleggen (niet kosteloos); "Playwright-smoke als goedkoopste route" is het duurste item van de lijst (geen dependency, browser-downloads, flakebudget ×3 platforms).

## Kon ik niet controleren
Welke checks required zijn op `main`; of de importcycli ooit echt breken (nu goedaardig door function-hoisting; TDZ pas bij een stijlwijziging — MIDDEL is royaal); run.sh onder gelijktijdigheid; de "check-axis-consolidation kopieert formules"-duiding (bij een consolidatie-bewijs is kopiëren juist correct ontwerp — als dekkingsgat presenteren is discutabel).

## Poort
**Ja, dit gaat door — na correcties.** Minimaal: (1) bevinding 2 verbreden naar de volledige casus-JSON incl. previewExpectt-bewijs; (2) nieuwe bevinding: tests/ niet getypecheckt — root cause, fix naar Sprint 1 item 1; (3) nieuwe bevindingen: batterij-telling, getrackt artefact; (4) `__APP_VERSION__`-NB schrappen, permissions.ts:151 herformuleren, tellingen corrigeren; (5) extensiesectie herschrijven rond "geen sandbox, alleen conventie" met consent/integriteit als HOOG; (6) `main` protected vermelden en #4 naar Sprint 1; (7) niet-bestaande modules uit fase 1; (8) assertion-cijfer duiden of weglaten.

*Werkkopie-notitie: eigen probes volledig teruggedraaid; een untracked `src/state/__assertprobe.ts` van een parallelle agent aangetroffen en bewust laten staan.*
