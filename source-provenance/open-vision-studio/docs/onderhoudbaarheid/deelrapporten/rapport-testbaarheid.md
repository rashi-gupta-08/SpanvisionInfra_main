# Rapport — Testbaarheid, testdekking en kwaliteitsborging
**Open Planner Studio**, onderzocht op commit-staat van 2026-07-25

## Samenvatting vooraf

De premisse "er is geen testrunner, alleen `tests/planning/`" is **feitelijk verouderd en te bescheiden**: `run.sh` draait 431 JSON-cases over 22 batterijen **plus 16 losse `check-*.ts`-scripts** met samen ruim 8.000 assertions, inclusief IFC-round-trip-contracttest, documentcontract/undo-redo-test en renderer-tests. Er is een tweede, volledig genegeerde suite (`tests/dev-server/`, 30 tests op `node:test`). CI draait dit wél.

Wat structureel mis is: de suite kan stilletjes groen zijn zonder iets te asserteren; hij is stil bij eigen compile-fouten; de productie-deploy is niet aan de tests gekoppeld; en de helft van de app (alle UI, extensies, recovery, print/PDF) heeft nul dekking terwijl juist dáár de churn zit.

## A. Bevindingen

### 1. De suite draait, is groen, en is snel — HOOG (positief)
`bash tests/planning/run.sh` na `npm ci`: **TOTAAL: 431/431 (alles groen)**, 6,5 s, exit 0. Assertion-tellingen: axis-consolidation 4836, header-compress 1360, i18n-plurals 909, document-contract 200, advanced-cpm 186, adapters-hours 127, move-project 123, … ifc-roundtrip 14. Totaal ≈ 8.000+.

Ontwerp inhoudelijk sterk: anti-circulariteit (verwachtingen uit CPM-leerboek, onafhankelijke `caldict.mjs`), `satisfies Required<...>`-fixtures (zelf-uitbreidend), key-gedreven contracttests, `KNOWN_GAPS` die falen zodra een gat gedicht wordt.

### 2. Een case kan vacuüm groen zijn: `expect` heeft geen sleutelvalidatie — HOOG
`harness.ts:205` typeert `expect: any`. Een typefout in een top-level `expect`-sleutel wordt stil genegeerd. **Empirisch bewezen** met drie tijdelijke cases: `{"taskss": …, "projectEndd": …, "criticalPathh": …}` met absurde waarden → **GROEN** (nul assertions); `"expect": {}` → **GROEN**; alleen een typefout in een per-taak veld wordt wel gevangen. "431/431" is dus geen dekkingsmaat.
> **Quick win:** whitelist van bekende expect-sleutels in `runCase` + verbod op leeg expect. **Structureel:** `expect: any` → discriminated interface + `tsconfig.harness.json`.

### 3. `run.sh` faalt volledig stil bij een compile-fout in een check-script — HOOG
Elke esbuild-aanroep onderdrukt alle output (`>/dev/null 2>&1`) terwijl `set -euo pipefail` actief is. **Empirisch bewezen**: syntaxfout in `check-holidays.ts` → `EXIT=1`, output: **0 regels**. In CI een rode job met lege log; resterende batterijen draaien niet meer.
> **Quick win:** stderr niet onderdrukken + `|| STATUS=1` per bundelstap. **Structureel:** de 16 identieke esbuild-blokken → één `bundle_and_run`-functie.

### 4. De productie-deploy is niet gekoppeld aan CI — HOOG
`live.yml` triggert op elke push naar `main`, onafhankelijk van `ci.yml`. `npm run build` (= tsc) blokkeert een typefout, maar een **rode planning-suite blokkeert de productie-deploy niet**. Een CPM- of dataverlies-regressie gaat gewoon live.
> **Voorstel:** test-stappen in live.yml vóór de build, of `workflow_run`-trigger met success-gate; required checks op main.

### 5. `release.yml` publiceert installers zonder één gedragstest — HOOG
Vier jobs, geen test-stap; alleen indirect `tsc` via `beforeBuildCommand`. Een tag kan getekende installers met een CPM-regressie publiceren die via de auto-updater worden gepusht; snap.yml erft dit.
> **Voorstel:** test-job vooraan met `needs: [test]` op create-release.

### 6. 167 van 246 bronmodules (68%) worden door geen enkele test geladen — HOOG
Exacte dekkingskaart via esbuild-`--metafile`s over alle 17 test-entrypoints: 93/246 bereikt (38%). Materiële gaten × churn:
- `GanttCanvas.tsx` + `canvas/hooks/` (~2500 loc, churn #2): hit-testing, drag-and-drop muteert taken/relaties. (GanttRenderer zelf is wél gedekt via check-gantt-float-cull/header-compress/axis-consolidation — de interactie-helft niet.)
- `src/extensions/**` (2159 loc): nul dekking — zie 8.
- `recoveryStore.ts` (232 loc): nul — zie 9.
- `print/` + `pdf/` (~3500 loc, churn 5): paginering, RTL-bidi, WASM-fontsubsetting. `check-axis-consolidation` *kopieert* printPreview-formules i.p.v. te importeren.
- `hooks/` (1563 loc) incl. `useAutoSave`, `shortcutRegistry` (463 loc, pure tabelgedreven logica, triviaal testbaar).
- Alle 93 React-componenten (18.715 loc), incl. TableEditor (616) en ReportPanel (633).
- `updaterService`, `feedbackService`, `projectTemplates`/`wbsTemplates` (voeden de wizard; kapot sjabloon is stil).
> **Voorstel gefaseerd:** (1) pure logica als `check-*.ts`: shortcutRegistry, templates, barDragMath, dropTarget, freePeriods; (2) paginate/paginateVector met stub-Draw2d (bewezen patroon); (3) rekenkern uit useBarDrag extraheren.

### 7. "Bereikt" ≠ "geassert": `fileAccess` is geladen maar nergens geverifieerd — MIDDEL/HOOG
`fileAccess/*` wordt alleen transitief geladen; geen enkele testregel raakt de runtime-dispatch, het `FileRef`-model, de FSA-tak, de download-fallback of `recentFiles.ts`. Vergelijkbaar: CSV/MSPDI/P6 worden alleen op uur-precisie geassert, niet op volledige round-trip.
> **Voorstel:** dekkingskaart als repo-script; `check-file-access.ts` met gestubde `showSaveFilePicker`/`__TAURI_INTERNALS__`; `check-adapters-roundtrip.ts` naar IFC-model.

### 8. Het extensiesysteem heeft nul dekking, en de concrete risico's zijn aanwijsbaar — HOOG
Met bewijs: ZIP-entryselectie op `endsWith` (`extensionService.ts:174`, `evil-manifest.json` matcht); assetlimieten pas ná decompressie (zip-bom); geen manifest-runtime-validatie (`id` met `:` kan bij prefix-scan settings van een andere extensie wissen); stille permissie-gaten (`permissions.ts:151` skipt onbekende paden — nieuwe API-methode is stilzwijgend permissieloos); geen consent/integriteitscontrole bij installFromCatalog; `compareVersions` is parseInt-per-segment (rc1 == release). De twee riskantste onderdelen (`executeExtensionCode`, ZIP-parser) zijn niet geëxporteerd → headless onbereikbaar.
> **Voorstel oplopend:** (1) `extMappers` round-trip-check (volledig puur, goedkoopste zinvolle test); (2) `permissions`-tabeldekkingstest; (3) `extensionEvents`; (4) `parseZipEntries`/`executeExtensionCode` exporteren en headless testen; (5) rest via `__OPS__.extensions.*`. NB: `run.sh` definieert `__APP_VERSION__` niet — nodig voor extensietests.

### 9. `recoveryStore.ts` — de dataverlies-kritieke laag — is ongedekt — HOOG
`check-document-contract.ts:184-235` test de state-kant grondig, maar `recoveryStore.ts` zelf (dubbele backend, manifest, opruimen, legacy-fallback, slug-isolatie) niet.
> **Voorstel:** `check-recovery-store.ts` met in-memory IndexedDB-shim; Tauri-tak eenmalig via Tier 2.

### 10. `tests/dev-server/` — 30 werkende tests die door niets worden gedraaid — MIDDEL
`node --test tests/dev-server/*.test.mjs` → pass 30. Geen npm-script, geen CI, geen README-vermelding; de voor de hand liggende aanroep zonder glob is kapot.
> **Quick win:** npm-script + CI-stap.

### 11. `package.json` heeft geen `test`-script — MIDDEL
Geen `npm test`; canonieke aanroep staat alleen in CLAUDE.md/AGENTS.md/ci.yml.
> **Quick win:** `test`, `test:planning`, `test:devserver`, `typecheck`, `verify` toevoegen.

### 12. Geen ESLint: drie echte importcycli in de kern van de store — MIDDEL
Metafile-graafanalyse (308 modules): cycli `documentContract → projectSlice → transaction → snapshot → documentContract` (+2 varianten), **waarde**-imports. Module-initialisatievolgorde-hazard in precies de bestanden die documentcontract/undo/multi-document dragen. Verder: 83 useEffect zonder hooks-lint; 7 klikbare divs zonder role; geen formatter.
> **Voorstel gefaseerd:** (1) flat-config met alleen `import/no-cycle` + hooks-regels + `.editorconfig`; (2) cycli breken (`createDefaultProject` → `state/defaults.ts`), dan no-cycle op error; (3) Prettier + jsx-a11y.

### 13. De self-test-harness is een procedure, geen suite — MIDDEL
Geen playwright.config, geen spec-bestanden; elke sessie herbouwt zijn klikpad. Extra brosheid: `window.__OPS__.roundTrip()` (`devBridge.ts:44-60`) vergelijkt alleen **tellingen** — veel zwakker dan check-ifc-roundtrip; Tier 2 vereist handmatige mkdir vóór boot; poort-sync leunt op een user-global hook buiten de repo; docdrift rond de dev-server.
> **Voorstel:** `roundTrip()` upgraden naar de `canon()`-vergelijking; 5-10 gecodificeerde Playwright-smoke-scenario's in CI (goedkoopste route om 18.715 loc UI van 0 af te krijgen).

### 14. De i18n-pluralisatiecheck dekt 5 van de ~24 telsleutels — MIDDEL
`PLURAL_KEYS` (`check-i18n-plurals.ts:44-46`) is handmatig: 5 sleutels, alleen `moveProject`, alleen `common`. ~24 `t(..., {count})`-plekken; task/menu/report hebben nul pluralvormen (bewuste `(s)`-workarounds — geen lek nú, maar zodra iemand één sleutel pluraliseert en 13 talen vergeet, vangt de check hem niet). Sleutelpariteit zelf is gezond over 14×4 — maar er is geen test die dát bewaakt.
> **Quick win:** auto-detectie van telsleutels uit `src/**` + pariteitscheck als extra batterij (~40 regels).

### 15. `npm install` i.p.v. `npm ci` in CI en release; geen caches — MIDDEL
ci.yml (2×) en release.yml (3×) gebruiken npm install; alleen live.yml is strikt — precies verkeerd om. Geen npm-cache, geen rust-cache: de 3-platform-matrix hercompileert alles.
> **Quick win:** npm ci + `cache: npm` + `Swatinem/rust-cache`.

### 16. Testbaarheid van de code zelf: de globale store is de grootste rem — MIDDEL
(a) Singleton-store: alles test via `useAppStore.getState()` met `newProject()`-reset — geen parallellisme, volgorde-afhankelijk. **Voorstel:** `createAppStore()`-factory naast de singleton (kleine refactor, appStore is al compositie-root). (b) 39 `isTauri()`-gates, consistent correct; webtak headless bereikbaar; Tauri-tak alleen via `globalThis.__TAURI_INTERNALS__` (ongedocumenteerd) — testhelper `withTauriRuntime(fn)` gewenst. (c) Canvas-renderer: goed opgelost via opnemende context-stub — patroon bewezen, alleen nog niet uitgebreid naar Histogram/MiniMap/interactiehooks. (d) Vitest **niet** als vervanging maar als aanvulling (componenten/jsdom, hooks, IndexedDB) — voorwaarde: eerst (a).

### 17. Documentatiedrift maakt de suite minder vindbaar dan hij is — MIDDEL
CLAUDE.md zegt 395/21 (werkelijk 431/22); "geen unit-testrunner" (node:test in gebruik); tests/planning/README documenteert 12 van de 22 batterijen (225 ongedocumenteerde cases) en 1 van de 16 checks; CLAUDE.md:8 beschrijft de oude dev-server.
> **Quick win:** batterijtabel genereren uit run.sh + JSON, meeliftend op het bestaande `verify:docs`.

## B. Aanbevolen volgorde

**Sprint 1 (± een dag, geen nieuwe dependencies):** 1. expect-whitelist (#2, eerst — anders weet je niet wat 431/431 waard is) · 2. run.sh stderr + doorlopen (#3) · 3. npm test + dev-server-tests in CI (#10,11) · 4. npm ci + caches (#15) · 5. test-job in release.yml (#5) · 6. testdocs genereren (#17)
**Sprint 2:** 7. deploy achter tests (#4 — grootste risicoreductie per uur) · 8. extMappers + permissions-tests (#8) · 9. check-recovery-store (#9) · 10. i18n-auto-detectie (#14) · 11. ESLint-minimaal (#12)
**Sprint 3:** 12. createAppStore() (#16a) · 13. cycli breken (#12) · 14. check-file-access + adapter-round-trips (#7) · 15. ZIP/sandbox exporteren+testen (#8) · 16. Playwright-smoke in CI (#13) · 17. useBarDrag-kern + paginate-tests (#6)

## Wat expliciet níet als probleem geldt
De kwaliteit van wat wél getest wordt is hoog: anti-circulaire verwachtingen, compile-afgedwongen fixtures, key-gedreven contracttests, KNOWN_GAPS-discipline, renderer-stubs die werken. i18n-pariteit is in orde. De isTauri-discipline is consequent. Het probleem is dekkingsspreiding, vangnetten om de suite heen, en pijplijnkoppeling.
