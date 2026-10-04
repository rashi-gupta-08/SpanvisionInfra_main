# Systemische risicoketens — Open Planner Studio

**Kader.** 141 commits totaal, alle binnen 12 dagen; `CLAUDE.md`/`AGENTS.md` zijn 122 commits geleden voor het laatst bijgewerkt (2026-07-20), `PLAN.md` 140 commits geleden. De enige harde statische poort is `tsc`; er is geen linter. Dat tempo-verschil tussen code en instructies is de motor onder ketens 5 en 7c, en versterkt alle andere.

---

## Keten 1 — Dataverlies: invoer → store → auto-save → IFC → herstel

**Schakels (alle geverifieerd):** mutatie zet `isDirty` (`transaction.ts:96-99`) → store-subscription met **throttle 10 s** (`useAutoSave.ts:16,74-82`) → poort dicht tot herstelkeuze (`useAutoSave.ts:32` ↔ `useRecoveryRestore.ts:51`) → `writeIFC` per gewijzigd document (`useAutoSave.ts:44-55`) → zelfde bestandsnaam + manifest (`recoveryStore.ts:41-50`) → opruimen buiten `keep` (`:52-60`) → bij opstart `readIFC` per snapshot (`useRecoveryRestore.ts:53-84`).

**Vier plekken waar het stil doorpropageert:**
1. **De herstel-snapshot wordt gewist zodra hij níet parst.** `useRecoveryRestore.ts:78-80` vangt de fout met alleen `console.error`; is het het enige document, dan volgt op `:84` `await clearRecovery()` — het corrupte bestand wordt verwijderd, geen dialoog, geen melding. Precies in het doelscenario verdwijnt de voorziening geruisloos.
2. **Baselines overleven een crash-herstel niet.** `useRecoveryRestore.ts:63-70` laat `baselines`/`activeBaselineId` weg; optionele velden dus `tsc` zwijgt; na herstel staat `isDirty` op true → de eerstvolgende Ctrl+S schrijft het baseline-loze project over het origineel. De contract-suite test `restoreDocuments` met een volledige input — de hook zelf is ongetest.
3. **Eén kapot document blokkeert de back-up van álle documenten.** De `docs.map(...)` staat vóór de enige `await`; gooit `writeIFC` voor doc B, dan wordt `saveRecovery` nooit bereikt en bevriezen de snapshots van A/C/D permanent, met één `console.error` als spoor.
4. **`isDirty` wordt gewist op basis van verouderde inhoud.** `fileSlice.ts:188` serialiseert, `:195/:201` await (native dialoog kan minuten openstaan), `:196/:210` zet dan `isDirty = false`. Alles wat de gebruiker tijdens de await typt geldt als opgeslagen maar staat in geen enkel bestand. Idem `saveFileAs`.

**Geen enkele schrijfactie is atomair en er is geen generatie-historie.** Nergens in `src/` een temp+rename-patroon. Een onderbroken Ctrl+S truncateert het echte projectbestand; de snapshot die dat moet opvangen is niet geroteerd, evenmin atomair, en wordt volgens punt 1 stil weggegooid.

**Web-variant:** IndexedDB-records gesleuteld op een `sessionStorage`-id (`recoveryStore.ts:128-136`) — een nieuw tabblad na browser-afsluiten vindt niets. Crash-herstel in de browser werkt alleen bij reload van hetzelfde tabblad.

**Wat wél goed staat:** het write→read-contract zelf (roundtrip-suite met compile-afdwinging). Het gat zit in de *naden ernaast*.

**Zwakste punt:** `useRecoveryRestore.ts:78-84` — de enige plek waar een fout tot actieve vernietiging leidt. **Goedkoopste breking:** clearRecovery vervangen door behouden+melden (~5 r.); baselines toevoegen én verplicht maken in het contract (~4 r.); atomair schrijven achter één helper (1 functie, 4 callsites); `isDirty` wissen via revisieteller-vergelijking. **Ernst: hoog.**

## Keten 2 — Extensies: catalogus → ZIP → `new Function` → Tauri-IPC

1. Catalogus van GitHub raw — geen handtekening/checksum (`extensionService.ts:18-37`). 2. `installFromCatalog` fetcht een **willekeurige `downloadUrl`** (`:51-57`). 3. Eén klik = downloaden, opslaan én uitvoeren — **geen toestemmingsdialoog** (`ExtensionManagerPanel.tsx:273-278`; verwijderen heeft wél een bevestiging). 4. `overrideId` kan het record van een vertrouwde extensie overschrijven (`:57,186,220`). 5. `new Function` in dezelfde realm — de code erkent zelf "GEEN echte isolatie" (`extensionLoader.ts:115-117,132`). 6. Dus `window.__TAURI_INTERNALS__` bereikbaar, met capability **`fs:allow-home-read-recursive` + `fs:allow-home-write-recursive`** (`capabilities/default.json:22-23`) + `shell:allow-open`. 7. `read_file`/`write_file` geregistreerd zonder padvalidatie (`main.rs:20-24`, `mod.rs:15-24`), door de frontend ongebruikt. 8. **Geen CSP, nergens** (`tauri.conf.json:55`, geen meta-tag): exfiltratie ligt open in beide builds.

**Het permissiemodel is grotendeels decoratief** — en dat staat eerlijk in de code (`permissions.ts:35-37,41-42`).

**Zwakste punt — de goedkoopste schakel:** `ExtensionManagerPanel.tsx:135-137` rendert `ext.manifest.icon` als **rauwe HTML** voor elke geïnstalleerde extensie — een `<img src=x onerror=…>` in het manifest draait zodra Backstage → Extensies opent, **óók bij een uitgeschakelde extensie** en óók als de `minAppVersion`-gate hem zou weigeren. Zelfde injectie op `ribbonWidgets.tsx:421` en `Backstage.tsx:512`. Bij de *catalogus*kaart is het gevaar wél herkend en vermeden (`Backstage.tsx:247`) — maar hetzelfde onvertrouwde manifest wordt ná installatie alsnog als HTML gerenderd.

**Goedkoopste breking:** (1) de drie `dangerouslySetInnerHTML`-sites vervangen (~10 r.); (2) `read_file`/`write_file` schrappen (4 r.); (3) een CSP met beperkte `connect-src` (1 r.); (4) de echte breking: extensie-code in een **Web Worker** — het API-oppervlak is al een smalle DTO-grens (extMappers/extTypes) die zich op postMessage laat zetten; een worker heeft geen `window` en dus geen `__TAURI_INTERNALS__`. NB: `fs:allow-home-*` is wél dragend (recents zonder dialoog), dus geen goedkope knip. **Ernst: kritiek** in de desktopbuild.

## Keten 3 — Verouderde planning → export naar derden

`autoCalcCPM` standaard **uit** (`uiSlice.ts:69`); mutaties zetten alleen `scheduleStale`; het enige signaal is een statusbalktekstje. Alle vier exporters schrijven `task.time.earlyStart` (CPM-uitvoer): `p6xmlWriter.ts:370-371`, `csvWriter.ts:84-85`, `mspdiWriter.ts:349-350`, IFC.

**Wel runCPM:** F5, ribbon, de open-paden, voorbeelden, extensie-import, IFC-paneel, kalenderdialoog, herstel. **Niet:** `exportAs` voor **alle vier formaten** (`fileSlice.ts:235-277`, via `Backstage.tsx:335-336` zonder stale-controle), `saveFile`/`saveFileAs`, de PDF-export (`ReportPanel.tsx:254` — nul `scheduleStale`-treffers), het printvoorbeeld. De `BaselineDialog` doet het wél goed (`BaselineDialog.tsx:12,121`) — de exports, waar het naar buiten gaat, niet.

**Zwakste punt:** `Backstage.tsx:335` — de meest naar-buiten-gerichte knoppen met de zwakste bewaking. **Goedkoopste breking:** één regel bovenaan `exportAs`: `if (get().scheduleStale) get().runCPM();` + idem PDF. **Ernst: hoog** — de enige keten waarvan de schade bij derden terechtkomt die datums contractueel lezen.

## Keten 4 — Release en update

- **Niets controleert de tag-versie tegen `tauri.conf.json`.** Vergeten `npm run bump` = release waarvan `latest.json` de oude versie meldt → de updater biedt bestaande installaties **nooit** een update aan. `bump-version.js` heeft geen verify-modus.
- **De opstart-check is volledig stil.** `updaterService.ts:98-104` gooit fouten in silent-modus weg zonder log — de hele vloot valt geruisloos van updates af.
- **De minisign-privésleutel is een single point of no return** (pubkey ingebakken; privé alleen als GitHub-secret; geen back-up/rotatieprocedure in de repo).
- **Geen rollback-pad**: alle URLs zwevend op `releases/latest`; de changelog bewijst dat dit al twee keer handmatig gerepareerd is (v2026.7.1 draft-404, v2026.7.8 Deflate64).
- **Snap kan `stable` bereiken zonder gepubliceerde release** (wacht alleen op het deb-asset aan de *draft*).
- **De testsuite draait niet op het releasepad**: `ci.yml` triggert niet op tags; `release.yml` heeft geen teststap; `live.yml` heeft geen gate op CI — de enige poort vóór productie-deploy is `tsc`.
- Kleiner: `bump-version.js:27` accepteert leading zeros (semver-ongeldig); `extensionLoader.ts:17` leest een `v`-prefix stil als 0. CalVer zelf is géén probleem.

**Zwakste punt:** de combinatie van de eerste twee — één vergeten bump snijdt iedereen af, en de stille check zorgt dat niemand het merkt. **Goedkoopste breking:** ~4 regels versievergelijking vooraan `release.yml`; `appLog.emit('warn', …)` in de silent-tak; `needs: [test]` op de deploy. **Ernst: kritiek voor beschikbaarheid.**

## Keten 5 — Kennis: docs → agent → drift → volgende agent

Geverifieerde drift: "debounced 800 ms in App.tsx" vs **throttle 10 s in useAutoSave.ts** (incl. verouderd commentaar in App.tsx:142 zelf); "manual, not reactive" vs de bestaande `useAutoCalcCPM`; acht vs negen ribbon-tabs; "npm run dev = Vite" vs `dev-server.mjs`; 395/21 vs 431/22.

Structureel ernstiger: (a) **docs beschrijven de sandbox als een grens** terwijl de code expliciet vastlegt van niet — een agent bouwt features op een garantie die niet bestaat; (b) **er ís een verificatieharnas voor documentatie — maar alleen voor de eindgebruikersdocs** (`verify-docs.ts` bewaakt `public/docs/**` streng in CI; voor CLAUDE.md/AGENTS.md/PLAN.md bestaat nul verificatie); (c) **zombie-code met documentaire dekking**: `MenuBar.tsx` — root-commit heet "dode MenuBar verwijderd" en voegt hem toe; daarna nog "gefixt"; `ifcSaveInput.ts:7,28` documenteert hem als levend; `PLAN.md` voert hem op als todo én als bestaande architectuur. Vier bronnen, vier waarheden — en de code die er staat is fout (opent zonder `newDocument()`, save zet `isDirty` nooit op false).

**Zwakste punt:** de bijwerkcyclus zelf — periodieke handmatige inhaalslagen; bij ~10 commits/dag is 122 commits achterstand de normale toestand. **Goedkoopste breking:** `verify-docs.ts` uitbreiden met een modus die machinaal controleerbare CLAUDE.md-beweringen verifieert (slices, locales, ribbon-tabs uit `RIBBON_TABS`, testcases, invoke-callsites) — draait al in CI. Plus MenuBar verwijderen. **Ernst: hoog als vermenigvuldiger.**

## Keten 6 — Multi-instantie en multi-document

**Productie, niet dev:** er is geen `tauri-plugin-single-instance` (`main.rs:6-14`, `Cargo.toml`). Twee vensters van de release-app delen dezelfde `appDataDir` en dezelfde `recoveryBase` zonder per-proces-component (`recoveryPaths.ts:9`). Elke 10 s: A overschrijft het manifest van B, en A's opruimlus (`recoveryStore.ts:52-60`) **verwijdert alle snapshots van B** (alles dat matcht en niet in A's keep-set zit). Twee open vensters vernietigen continu elkaars crash-herstel.

**Tweede fout in dezelfde lus:** de prefix `recovery.` van een productiebuild matcht óók de dev-worktree-bestanden `recovery.<slug>.*` — één keer de productiebuild starten wist alle herstel-snapshots van alle dev-worktrees (eenzijdig: andersom gaat het goed).

**Klembord-besmetting tussen documenten:** `pasteTasks` kopieert `calendarId` mee (`taskSlice.ts:704`) terwijl die kalender in het doeldocument niet bestaat; `resolveCalendar.ts:15` valt stil terug op de projectkalender. Een 6-daagse-werkweek-taak wordt in document B zonder melding 5-daags gepland — en gaat via keten 3 mee de export in. Resource-toewijzingen worden stil weggefilterd (`:709,730`).

**Web-tabbladen:** gedeeld `localStorage` zonder `storage`-listener — laatste schrijver wint; idem gedeelde IndexedDB voor extensies/recents. Herstel-data is hier wél per tab gescheiden.

**Goedkoopste breking:** (1) `tauri-plugin-single-instance` (één regel); (2) de opruimlus alleen laten verwijderen wat in het **vorige eigen** manifest stond; (3) `calendarId` bij plakken laten vallen als de id niet bestaat (~2 r.). **Ernst: hoog / middel.**

## Keten 7a (eigen vondst) — De stille-fout-keten

**106 `catch`-blokken**, waarvan 19 leeg/comment-only en 26 alleen `console.error`. Gebruikerszichtbare foutkanalen: één toast in GanttCanvas (cykelfout), één setError in Backstage, en de standaard-uitgeschakelde debug-terminal. `openFile`/`openRecentFile`/auto-save/herstel-detectie falen allemaal onzichtbaar; `saveFile` heeft **geen** try/catch (`fileSlice.ts:184-213`) — een volle schijf geeft een unhandled rejection en een blijvend hangende CloseDocumentDialog. Fouten worden niet slecht afgehandeld — ze worden zorgvuldig gevangen en doelbewust doodgezwegen (`idb.ts:84,99` documenteert dat zelfs als beleid).

**Goedkoopste breking:** een `notify(level, message)`-helper naar `appLog` én de bestaande toast; de vijf bestandspaden erop aansluiten. **Ernst: hoog als vermenigvuldiger** — samen zorgen ze dat een gebruiker structureel niet kan weten of zijn werk veilig is.

## Keten 7b (eigen vondst) — Import overschrijft het openstaande bestand

Backstage → Importeren (`Backstage.tsx:491`) en de extensie-API (`extensionApi.ts:76-80`) roepen `loadState` aan: in-place vervangen, `filePath` ongemoeid, `isDirty: false`, **undo/redo-stacks leeg** (`documentContract.ts:255,268`). Gevolg: niet-opgeslagen werk verdwijnt zonder dirty-prompt, terugdraaien kan niet, en de volgende Ctrl+S schrijft het geïmporteerde vreemde project over het origineel. `openFile` doet het wél goed (`if (!isActivePristine(get())) get().newDocument();`, `fileSlice.ts:164`) — de import-paden slaan precies die regel over.

**Goedkoopste breking:** dezelfde regel op beide callsites (`isActivePristine` bestaat al, alleen nog niet geëxporteerd). **Ernst: hoog** — het enige pad dat het bronbestand kan overschrijven zonder dat de gebruiker ooit een waarschuwing ziet.

## De drie versterkende combinaties

1. **7a × 1 × 4:** de stille-fout-keten geeft dataverlies en de kapotte updateketen hetzelfde symptoom: niets. Eén notify-kanaal maakt drie ketens diagnosticeerbaar.
2. **5 × alles:** de docs beweren een 800ms-debounce, een handmatige planning en een afgedwongen sandbox — elke volgende agent bouwt op precies die drie onjuistheden, en de enige doc-verificatie kijkt naar de verkeerde bestanden.
3. **2 × 4:** de updater en de catalogus zijn tegengestelde ontwerpen voor hetzelfde probleem (code afleveren): de updater verifieert met minisign, de catalogus met niets. Het beveiligingsmodel is al aanwezig en gewoon niet toegepast.

**Als er maar tijd is voor vier ingrepen:** (1) de drie `dangerouslySetInnerHTML`-sites (~10 r.); (2) de versiecontrole in `release.yml` (~4 r.); (3) `single-instance` + de opruimlus (~5 r.); (4) `clearRecovery()` vervangen door behouden-en-melden (~5 r.).
