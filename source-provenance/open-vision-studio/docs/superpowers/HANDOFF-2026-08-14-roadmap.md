# HANDOFF — 2026-08-14: wat er nog op de roadmap staat

> **Doel.** Eén document waaruit iemand — de eigenaar, of een verse sessie over een maand —
> begrijpt wat er nog ligt, hoe groot het is, waar het van afhangt en wat er al besloten is.
>
> **Peildatum:** `origin/main` op `3cec89b` (2026-08-14). Alles hieronder is tegen die stand
> geverifieerd, niet tegen geheugen of eerdere handoffs. Waar de repo een eerder beeld
> tegenspreekt, staat dat expliciet in §2.
>
> **Maten:** *klein* = minder dan een dagdeel · *middel* = een tot enkele dagen · *groot* = een
> week of meer, of een eigen ontwerpronde. Waar ik het niet kan inschatten, staat dat er.
>
> **Wat dit document níet is:** geen besluit. De adviezen zijn óf al eerder vastgelegd (dan staat
> de bron erbij), óf expliciet gelabeld als mijn inschatting (§13).

---

## 1. Stand van zaken

Uitgebrachte versie: **v2026.7.14** (2026-07-30, `docs/CHANGELOG.md` regel 9). `package.json` en
`src-tauri/tauri.conf.json` staan op diezelfde versie. Sinds die tag staan er **15 commits
ongereleased** op `main`; er is dus materiaal voor een volgende release. Let op de CalVer-vorm
`YYYY.M.patch`: de eerstvolgende release valt in augustus en heet dus waarschijnlijk `2026.8.0`,
niet `2026.7.15`.

De codebase telt op deze stand **318 TS/TSX-bestanden en 73.338 regels** in `src/` (eigen telling
via `find src -name '*.ts*' | xargs wc -l`). Ter vergelijking: het onderhoudbaarheidsonderzoek van
2026-07-25 mat 249 bestanden / 49.860 regels. De groei zit vooral in de MCP-laag en de
bibliotheek-slice.

Functioneel: fase 1 en fase 2 (2.1 t/m 2.10) van `PLAN.md` zijn af, inclusief 2.8b uren-scheduling
en 2.9 geavanceerde CPM. Daarbovenop staan op `main`: de MCP-bridge met **39** `planner_*`-tools
(eigen telling over `src/services/mcp/tools/`; `CLAUDE.md` zegt nog 38 — kleine drift),
resourcebibliotheken B1 + B1.1, browser-bestandstoegang, vector-PDF-export, Snap-distributie met
automatische Store-publicatie, en een `npm run verify`-poort die CI, de release-gate en de
deploy-gate alle drie draaien.

### Wat er sinds eind juli op `main` is geland

Uit `git log v2026.7.14..origin/main` — 15 commits, allemaal na de release:

| datum | wat |
|---|---|
| 2026-08-05 | `ab83dc5` — de gidsen `gids-ai-mcp` en `gids-resourcebibliotheken` vertaald naar de overige 12 talen |
| 2026-08-13 | `9f0ebda` `.gitignore` voor `PROMPTS.md`/`output/`; `fb92e71` npm-audit-fix (brace-expansion/nanoid high, postcss moderate) |
| 2026-08-13 | `254902a` opgeslagen thema wordt vóór de eerste paint toegepast (issue #61); `9d201d4` `<html lang>` volgt de actieve locale |
| 2026-08-13 | `68ffcf5` Resources-tab opent standaard in Projectweergave + prominente bibliotheekbanner (issue #64) |
| 2026-08-13 | `ce1ef47` tekstschaal in canvas (#60), guard voor datumloze taken, middelklik-pan (#52) |
| 2026-08-13 | `58a9fde` de standalone suite-run typecheckt nu álle check-batterijen; `480af55` `DATA;`-sectiegrens hoofdletterongevoelig; `fb53258` bulk-verwijderen is één undo-stap op alle drie de routes |
| 2026-08-13 | `276e569` merge van PR #66 (opruimronde issues/PR's) |
| 2026-08-14 | `3cec89b` webbuild valt terug op downloaden wanneer de omgeving schrijven weigert |

Er zijn **geen open pull requests** (`gh pr list --state open` geeft niets terug).

---

## 2. Correcties op het uitgangsbeeld — hier wint de repo

Dit zijn de punten waar mijn opdracht-brief (context tot eind juli) niet klopt met wat er in de
repo staat. Ze staan vooraan omdat ze de rest van dit document sturen.

1. **De versie is 2026.7.14, niet 2026.7.13.** Er is ná die brief nog een release geweest
   (2026-07-30) met ongeveer 88 commits, plus 15 ongereleasede commits daarna.

2. **Het modulariteitstraject fase 5 is wél gebouwd — al op 2026-07-17.** De brief zegt dat P16 →
   P15 → P18 → P20 goedgekeurd maar niet gebouwd is. Vier commits, alle vier voorouder van
   `origin/main` (geverifieerd met `git merge-base --is-ancestor`):
   - `29d3abb` `refactor(extensions): stabiele Ext*-facade + centrale permissietabel (audit P16/D2/D3)`
   - `85d8acb` `refactor(engine): relatie-wiskunde 4×→1 module + 26 uur-relatie-cases (audit P15/C2)`
   - `ad1e6e7` `refactor(ui): ribbon naar declaratieve config-registry — 9 tabs uit één RIBBON_TABS-lijst (audit P18/B2)`
   - `33a151a` `refactor(canvas): GanttCanvas-interactie naar hooks per muisgebaar + useCanvasLayer (audit P20/B1)`

   Zie §5 voor wat er van dat traject dan nog wél openstaat.

3. **Van de prestatie-audit is meer af dan de brief aanneemt.** De brief noemt A1/A2/B2/D1/E1/E2.
   Er zijn ook commits voor **A4** (`0cc1258`), **B1** (`65961b1`) en **C1** (`34a6aa1`), alle op
   2026-07-23. Wat écht openstaat: A3, B3(COW-deel), C2, C3, D2 en de M-restpunten. Zie §6.

4. **De ontwerpbeslissing over `planner_manage_resources` × bibliotheekstempels is genomen én
   gebouwd** (2026-07-27, commit `222ca70`, en afgevinkt in `docs/TODO.md` regel 73-88). Gekozen is
   *spiegelen*: de tool weigert de vijf `RESOURCE_DIFF_FIELDS` op een gestempeld item, noemt de twee
   werkende routes, en een gemengde update sneuvelt in zijn geheel. De pool is bewust **niet** via
   MCP muteerbaar gemaakt. Wat er van dat advies nog open is: "losmaken van de bibliotheek" als
   MCP-actie (§7, MCP-thema).

5. **`docs/TODO.md` bevat minstens zes items die aantoonbaar al gefixt zijn.** Zie §8. De lijst
   wordt wél onderhouden (er zijn `docs(todo): … afgevoerd`-commits op 2026-08-13), maar er staat
   een oudere laag in die is blijven hangen.

6. **Browser-bestandstoegang is niet geparkeerd.** Er is geen onafgemerged branch: de functie is
   uitgeleverd in v2026.7.11 (`src/services/fileAccess/`) en kreeg vandaag nog een fix
   (`3cec89b`). De brief noemde een "afgeronde branch die bewust niet gemerged is" — die bestaat
   niet meer.

7. **Er ligt wél ander onafgemerged werk**, dat de brief niet noemt: `origin/claude/orchestrator-role-uiskcu`
   (marktonderzoek + een echte bugfix). Zie §10.

8. **Het oude `/OPS/`-pad staat nog op vier plekken in `docs/`** — gemeld, niet gerepareerd (buiten
   scope):
   - `docs/superpowers/workflows/triple-verify.js:15` (`/home/nozzit/Impertio/open-aec/OPS/…`)
   - `docs/superpowers/specs/2026-07-07-2.10-onderdeel5-docs-design.md:23`
   - `docs/superpowers/specs/2026-07-20-move-project-design.md:4`
   - `docs/superpowers/plans/2026-07-23-b1-1-bedrijfscentrisch-model.md:21`

   Plus `docs/superpowers/HANDOFF-2026-07-20-poorten-ongedraaid.md` (STAP 0). Alle vijf zijn
   historische documenten; alleen `triple-verify.js` is *uitvoerbaar* en zou dus stukgaan als
   iemand hem draait — dat script draagt overigens al een instructie om `ROOT` per sessie aan te
   passen.

---

## 3. Spoor 1 — `PLAN.md`, de fasen-roadmap

**Wat het is.** `PLAN.md` §6 "Functionaliteiten — Roadmap in 6 Fases" is de aangewezen bron voor de
roadmap. Let op de banner boven §4 "Mappenstructuur": dat is een verlaten ontwerp uit de
ontwerpfase en beschrijft code die niet bestaat. Alleen §6 is bruikbaar.

**Belangrijke waarschuwing bij gebruik.** De checkboxen in `PLAN.md` §6 zijn **nooit bijgehouden** —
ook fase 1 en fase 2, die volledig af zijn, staan er nog als `- [ ]`. Zelfde in §5.2 (de
MCP-toollijst), terwijl er 39 `planner_*`-tools draaien. Lees `PLAN.md` §6 dus als *scopelijst*,
niet als statuslijst. De onderhouden afgeleide is `docs/TODO.md`, waar afgeronde items uit de
lijst verwijderd worden.

**Stand per fase:**

| fase | omvang in PLAN.md | stand |
|---|---|---|
| 1 — Fundament (v0.1) | §1.1–1.8 | af |
| 2 — Professionele planning (v0.5) | §2.1–2.10 | **af**, inclusief 2.8b (uren) en 2.9 (geavanceerde CPM); per subfase staan bewuste "later"-restjes in `docs/TODO.md` regel 512-646 |
| 3 — Bouwsector & NL (v1.0) | §3.1–3.10 | **grotendeels open**; alleen §3.10 (14 talen) is af. §3.5 heeft één halve stap (de "Totaal"-kolom in ResourcePanel). §3.8 is deels gedekt door bestaande IFC/CSV/MSPDI/P6-adapters |
| 4 — 4D/5D BIM & analyse (v2.0) | §4.1–4.6 | volledig open. Raakt aan spoor A van het lagen-conceptplan (§4) |
| 5 — AI, automatisering, integratie (v3.0) | §5.1–5.5 | §5.1 is **grotendeels vooruitgelopen**: de MCP-bridge draait al met 39 tools. Wat resteert binnen 5.1 is de *inhoudelijke* AI-laag (suggesties, risico-analyse, resource-optimalisatie, duurschatting, chat-in-app) en de publieke `window.planner`-API. §5.3–5.5 volledig open |
| 6 — Samenwerking, cloud, enterprise (v4.0) | §6.1–6.5 | volledig open |

**Wat resteert, grof.** Fase 3 is de eerstvolgende inhoudelijke fase en is **groot**: §3.1 (Lean/Last
Planner, 14 punten) en §3.4 (EVM, 8 punten) zijn elk een eigen ontwerpronde. §3.5 (kosten/budget)
hangt aan resources en baselines die er al zijn en is daarmee de goedkoopst bereikbare van de
fase-3-blokken. Fase 4 (4D BIM) heeft een architecturale voorwaarde: een 3D-viewport (Three.js +
web-ifc) bestaat vandaag niet, en het lagen-conceptplan (§4 hieronder) stelt expliciet voor om de
elementboom-koppeling **zonder** 3D-weergave als eerste stap te nemen.

**Afhankelijkheden die vastliggen.** Uit `docs/onderhoudbaarheid/README.md` item 41: split view met
twee verschillende documenten, live cross-project solve en organisatie-brede resourcepooling hangen
alle drie aan één ingreep — een `createAppStore()`-factory naast de huidige singleton. Dat is de
enige geplande architecturale investering in het onderzoek, en hij staat bewust helemaal achteraan.

---

## 4. Spoor 2 — de B-serie en het lagen-/federatieconceptplan

Bron: `docs/superpowers/lagen-en-federatie-conceptplan.md` (2026-07-20, status "CONCEPT — wacht op
akkoord"; de beslispunten in §9 daarvan zijn voor B1 inmiddels feitelijk beantwoord door wat er
gebouwd is, maar het document zelf is niet bijgewerkt).

### Wat af is

**B1 + B1.1 — resourcebibliotheken.** Op `main`, gedocumenteerd in `docs/library.md`. Beslispunt
B1a is beantwoord zoals voorgesteld: kopie-met-herkomststempel, bibliotheek app-globaal, alleen de
gebruikte kopie in de project-round-trip. Issue [#19](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/19)
is hiermee deels beantwoord — de vraag "meerdere projecten openen en zien waar welke resource
verpland is" is precies B1b en staat nog open.

### B1b — bezettingsoverzicht over open documenten

**Wat het is.** Een overzicht dat over alle open documenten heen laat zien waar een
bibliotheekresource geboekt staat, zodat dubbelbezetting zichtbaar wordt. Strikt binnen één
bibliotheek/pool — bedrijfsoverstijgende histogrammen zijn expliciet afgewezen (besluit user
2026-07-20, vastgelegd in `docs/archive/superpowers/specs/2026-07-20-b1-bedrijfsbibliotheken-design.md:12`).

**Wat er al ligt.** Het fundament: de herkomststempels (`libraryOrigin`) en de
Bibliotheek-/Projectweergave uit B1.1. `docs/superpowers/specs/2026-07-23-b1-1-bedrijfscentrisch-model-design.md`
§10 zegt letterlijk: "B1.1 legt het fundament; het bedrijfsbrede histogram is het B1b-vervolg". Er
is **geen eigen ontwerpdoc voor B1b** — alleen scope-afbakeningen in de B1/B1.1-stukken.

**Wat resteert.** Het hele ding: een aggregatie over `documents[].payload` (de niet-actieve
documenten leven als `DocumentPayload`-snapshots in `documentSlice`), een weergave, en de
i18n/docs eromheen. De rekenkant kan leunen op de bestaande `computeResourceLoad`.

**Omvang:** middel. **Afhankelijk van:** niets blokkerends; B1.1 is er.
**Bekende beperking die vooraf gedocumenteerd moet worden:** het overzicht ziet alleen deze machine
(`docs/library.md` "Bekende beperkingen" punt 2).

### B2 — scenario's als lagen

**Wat het is.** Conceptplan §4: een basisplanning met schakelbare, non-destructieve overlays
("winterkalender", "alternatieve bezetting", "versnelde volgorde"), aan/uit te zetten en te
vergelijken (twee CPM-runs naast elkaar, verschil in einddatum en kritiek pad).

**Wat er al ligt.** Alleen het concept. Het plan waarschuwt zelf: dit raakt snapshot-undo, `runCPM`,
de renderer én de IFC-round-trip tegelijk. Baselines (read-only fotomomenten) bestaan al; scenario's
zijn *bewerkbare* varianten en dus een wezenlijk zwaarder concept. Het plan stelt voor B2 pas ná B1
te ontwerpen en te starten met **alleen kalender-overrides** — zelfde taken, andere kalenders, dus
andere datums — vóór generieke plan-overrides. Er is geen precedent in de OpenAEC-familie
(conceptplan §6): dit is greenfield.

**Wat resteert.** Alles, inclusief het ontwerp. **Omvang: groot.** Er is nog geen implementatieplan
en geen testplan; de impacttabel in conceptplan §8 markeert B2 als het enige spoor dat `runCPM` en
de renderer *wezenlijk* raakt.

**Afhankelijk van:** B1 (klaar). Praktisch ook van het documentcontract (`DOCUMENT_FIELDS`) — een
overlay is per definitie nieuwe per-document data en moet daar dus doorheen.

### Spoor A — IFC 4.3-federatie (planning als laag over een extern model)

Dit spoor staat in het conceptplan naast de B-serie en is in de opdracht niet genoemd, maar hoort
erbij omdat het de opstap naar fase 4 (4D BIM) is.

- **A1** extern model koppelen als referentie (elementboom parsen, bronbestand nooit herschrijven)
- **A2** taak↔element-koppeling via `task.linkedElementIds` (GlobalId's), IFC-uitgeschreven als
  `IfcRelAssignsToProcess` + `OPS_`-pset
- **A3** herkoppel-detectie bij herladen (rapport van verdwenen/nieuwe GUID's, geen auto-healing)

**Stand: niets gebouwd.** `grep -rn "linkedElementIds\|linkedModel\|Modelkoppeling" src/` geeft nul
treffers. Het conceptplan noemt concrete startpunten in zusterrepo's (`analyzeIfcxFolder` in
open-calc-studio, het multi-model datamodel van de OpenAEC-BIM-validator).

**Omvang:** A1+A2 samen middel tot groot; A3 middel. Bewuste scopegrens in het plan: **geen
geometrie renderen** — koppelen aan de elementboom, niet aan een 3D-viewport. Dat is beslispunt 3
in conceptplan §9 en staat nog open.

### IFCX / spoor C — geparkeerd

Conceptplan §5. Voor óns domein blijft de conclusie: **niets bouwen**. IFC 5 is alpha en heeft geen
proces-/planningsdomein, dus er is niets dat onze planningslaag kan lezen. Nuance uit de
zusterprojecten-scan: open-calc-studio en Open-Calculations-Studio schrijven en lezen IFCX al
productief, dus de *serialisatielaag* is in de familie geen speculatie meer — alleen het
planningsdomein erin ontbreekt. Als OPS ooit IFCX oppakt, is dat dus geen greenfield: hergebruik de
familie-conventies (`ifcx::ops::…` namespacing) en de bestaande generator/importer-patronen.

**Actie nu:** alleen monitoren, halfjaarlijks. Signalen die het plan noemt: proces-/taakklassen in
de IFC5-voorbeelden of -schema's, een `process`-module op ifcx.dev, issues/labels over het
tijddomein, en de uitslag van de Standards Committee-stemming (gesloten 8-8-2025, uitkomst
onbekend). **Die laatste is inmiddels een jaar oud en niet nagekeken.**

---

## 5. Spoor 3 — het modulariteitstraject

Bron: `docs/superpowers/modulariteit-audit.md` (2026-07-10), werkpakketten P1–P21 met een gefaseerd
saneringsplan.

**Stand: P1 t/m P20 zijn gebouwd, inclusief de fase-5-pakketten.** Geverifieerd via
`git log --grep 'audit P'` op `origin/main`:

| pakket | commit | datum |
|---|---|---|
| P1/P2 (`ImportResult`, `writeIFC`-optionsobject, bug B4) | `0c602fb` | 2026-07-13 |
| P3 (solver-idempotentie, `emptyResult`, `scheduleAnalysis`, bug B1) | `015fa21` | 2026-07-13 |
| P4 (renderer-kalender, bug B2) | `f944b1f` | 2026-07-13 |
| P5 (één laadpad `applyLoadedProject`) | `1ca1408` | 2026-07-13 |
| P8 (transactiehelper) | `f37cf73` | 2026-07-13 |
| P10 (key-gedreven documentcontract, bug B3) | `50e27b2` | 2026-07-13 |
| P11a/P11b (round-trip-batterij + 8 dataverlies-gaten; pset-registry) | `63a2e30`, `8b28739`, `1d1c4a0` | 2026-07-13 |
| P12 (laagfixes) | `0c466a4` | 2026-07-13 |
| P19 (cross-reader-dedup) | `ea94ea3` | 2026-07-13 |
| P6 (Dialog/Popover-primitives, `useClickOutside`) | `b0272c5` | 2026-07-16 |
| P9 (settings-registry) | `f14f65f` | 2026-07-16 |
| P14 (App.tsx 741→345 regels) | `9547a11` | 2026-07-16 |
| **P15** (RelationResolver) | `85d8acb` | 2026-07-17 |
| **P16** (extensie-facade + permissietabel) | `29d3abb` | 2026-07-17 |
| **P18** (Ribbon-config-registry) | `ad1e6e7` | 2026-07-17 |
| **P20** (GanttCanvas → interactie-hooks + `useCanvasLayer`) | `33a151a` | 2026-07-17 |

**Wat van dit traject nog openstaat:**

- **P7** — `TimeAxis`-waardeobject gedeeld tussen `GanttRenderer` en `HistogramRenderer`. Klein tot
  middel. In de prestatie-audit hernummerd tot onderdeel van **M5**.
- **P17** — ThemePalette-injectie in de renderers (nu half globale-DOM-read, half hardcoded hex).
  Middel. Ook onderdeel van M5.
- **P21** — `printPreview` splitsen in layout/renderer + een eigen STEP-module. `printPreview.ts` is
  vandaag **1.570 regels** (was 1.112 bij de audit — het is gegroeid, niet gekrompen). Middel tot
  groot, laag risico.
- **P13** — vervallen; de `fileAccess`-facade heeft dit ingehaald (expliciet zo genoteerd in
  `docs/superpowers/prestatie-modulariteit-audit.md`).
- **A7 / M2** — `TaskTime` splitsen in input/computed/tracking. De prestatie-audit adviseert dit
  **type-only** (`Pick<>`-varianten) te doen en raadt de runtime-variant af.

**Let op — P20 heeft de groei niet gestopt.** `GanttCanvas.tsx` is vandaag **1.777 regels** (bij de
audit 1.791). De interactie is naar hooks gegaan, maar het bestand is netto niet kleiner geworden.
Item 33 van het onderhoudbaarheidsonderzoek (`buildGanttRenderOptions` extraheren, verder opsplitsen
langs de hook-conventie) staat dan ook nog open — `grep -rn "buildGanttRenderOptions" src/` geeft
nul treffers.

---

## 6. Spoor 4 — het onderhoudbaarheidsonderzoek (K-items)

Bron: `docs/onderhoudbaarheid/README.md` (2026-07-25), elf kritieke bevindingen K1–K11 en een
prioritering in drie fasen met 41 genummerde ingrepen. **Er is geen K12** — die staat nergens in het
onderzoek; wat er als "K12" rondzweeft in commitberichten is *item 12* uit de prioriteringstabel
(dode vensterknoppen/MenuBar-opruiming), niet een twaalfde bevinding.

### Fase "nu" — 12 van 12 afgerond

| # | item | commit |
|---|---|---|
| 1 | K1 `parseDate` tijdzone-onafhankelijk + TZ-matrix in `run.sh` | `a7f910c` |
| 2 | K3 baselines overleven crashherstel | `a20639f` |
| 3 | K6a extensie-iconen saniteren + `read_file`/`write_file` uit de `invoke_handler` | `bfc78d7` |
| 4 | K11a testpoort + tag/versie-controle vóór release en deploy | `904a6b3` |
| 5 | K11b `snap.yml` aan `workflow_run` | `1ccdaab` |
| 6 | K7 `runCPM`-guard in de export, weigeren bij cyclus | `de74903` |
| 7 | K9b suite laat bundelfouten zien en loopt door | `3a2e596` |
| 8/9/10 | undo-historie begrenzen, herstelde planning als verouderd melden, NUL-byte weg | `5e4b85a` |
| 11 | LGPL-3.0-licentiebestanden | `641fc52` |
| 12 | dode vensterknoppen, zoomsectie, MenuBar opruimen | `8e57347` |

### Fase "deze maand" — 13 van 13 afgerond

K2 (quote-bewuste STEP-scan + header-escaping, `4220f43` + `771db15`), K10a (sleutel-gedreven
round-trip-vergelijking, `bca777d`), K10b (`tsconfig.tests.json` + casus-schema, `54c504b`), K4
(atomair schrijven + `readIFC` weigert een afgekapt bestand, `26b578f` + `385e5aa`), K5
(single-instance + opruimen binnen de eigen boekhouding, `c12922d`), K8a/K8b (één meldingenkanaal +
opslagfouten bereiken de gebruiker, `eaa4b42` + `51bf085`), CI-hygiëne (`094a208`), O1-injectieklasse
(`72079fa`), de `verify`-poort (`8b3c0f0`), i18n-poort (`e537e48`), documentatie-actualisatie
(`1ab1f20`), governance (`dcc57f6`), release-secrets (`32e315f`).

> **Eén rest bij item 25.** `docs/release-secrets.md` bestaat, maar vier velden staan er nog als
> `⟨IN TE VULLEN⟩`. Die kan alleen de eigenaar invullen — zie §11.

### Fase "structureel" — 7 van 16 afgerond, 9 open

| # | item | stand |
|---|---|---|
| 26 | `_assertNoUnclassifiedState` + `ui`-taak-id's resetten | ✅ `b38f871` |
| 27 | defaults naar `src/state/defaults.ts` + cyclus-poort | ✅ `b3c195b` |
| 28 | minimale ESLint-config + audit-poort | ✅ `b684c83` |
| 29 | `ifcGuid`-ontkoppeling vóór collisiecheck | ✅ `69da76c` |
| 30 | `applyCpmResult` extraheren, benchmark-kopie vervangen | ✅ `e034616` |
| 31 | `taskSlice` tijd-default | ✅ `696c7b5` |
| 32 | `withTransaction` + `api.data.batch` | ✅ `3d58e1e` |
| **33** | `buildGanttRenderOptions` extraheren, `GanttCanvas` verder opsplitsen | ❌ open — *middel*. `GanttCanvas.tsx` staat op 1.777 regels |
| **34** | `COMMANDS`-register (imperatieve `run` + reactieve `useEnabled`) | ❌ open — *groot*. Volgorde-eis: ná 33 en 31 |
| **35** | `taskTree.ts` extraheren + selectie/klembord naar een eigen slice | ❌ open — *middel*. `src/utils/taskTree.ts` en `selectionSlice.ts` bestaan niet |
| **36** | prestaties (zie §7) | ⚠️ deels — `workDaysBetween`/`isWorkDay`, `flattenOrder` en de pijlen-culling zijn af; `resourceNames` heeft nog geen index-Map (`src/engine/view/filterEval.ts:24`) |
| **37** | extensie-`apiVersion` los van `minAppVersion` + `check-ext-contract.ts` | ❌ open — *middel*. Geen `apiVersion` in `src/extensions/` |
| **38** | extensies naar een Web Worker (of `__TAURI_INTERNALS__` afschermen) + sha256 per catalogusentry + consent-dialoog | ❌ open — *groot*. De pragmatische afdekking (K6a + checksum) is er deels; de echte grens niet |
| **39** | print↔scherm: gedeelde constanten, `timelineTiers`/`getWeekNumberFor` in `printPreview` | ❌ open — *klein tot middel*. Geen treffers in `printPreview.ts` |
| **40** | `docs/ifc-round-trip.md` + archiveringsronde `docs/superpowers/` + `scripts/README.md` | ❌ open — *klein*. Geen van beide bestanden bestaat |
| **41** | `createAppStore()`-factory naast de singleton | ❌ open — *groot*. Voorwaarde voor split view met twee documenten, cross-project solve en organisatie-brede pooling. Bewust achteraan; volgorde-eis: niet vóór item 26 (die is nu wél af) |

**Samenvatting van dit spoor:** het acute correctheidswerk is klaar. Wat resteert is puur refactor —
geen bekend dataverlies, geen bekende live bug. De volgorde binnen "structureel" is niet vrij: 31 →
33 → 34, 29 vóór collisiechecks, 41 helemaal achteraan.

---

## 7. Spoor 5 — de prestatie-audit

Bron: `docs/superpowers/prestatie-modulariteit-audit.md` (2026-07-20). Spoor 1 = prestaties
(A/B/C/D/E), spoor 2 = modulariteits-restpunten (M1–M6).

### Afgerond

| pakket | wat | commit |
|---|---|---|
| A1 + A2 | allocatievrije `isWorkDay` + arithmetische `workDaysBetween` | `98e36c1` |
| A4 | `updateSummary`-rollup via id→taak-Map | `0cc1258` |
| B1 | undo-snapshot op de plain pre-mutatiestaat i.p.v. de Immer-draft | `65961b1` |
| B2 | `flattenOrder` O(n²)→O(n) | `44c53ff` |
| C1 | dependency-pijlen verticaal offscreen cullen | `34a6aa1` |
| D1 | auto-save serialiseert alleen gewijzigde documenten | `e1bc10a` |
| E1 | talen lazy laden (alleen Engels eager) | `82612c4` |
| E2 | dialogs/Backstage/zeldzame panels lazy | `6174f33` |
| M6 (deels) | `remove*`-guards vastgelegd | `022587e` |
| (los) | undo-stack cappen op `MAX_UNDO = 100` (`src/state/transaction.ts:61,73`) | `5e4b85a` |

### Open

- **A3 — solve buiten de Immer-`produce`.** De solver draait puur op plain state; alleen de
  resultaten binnen `set()` schrijven. Geschatte winst in de audit: −30–40 % op de `runCPM`-schil
  (Immer-proxy-primitieven waren ≈34 %). Risico laag, **omvang klein tot middel**. **Valt samen met
  M3/C7** (solver injecteerbaar maken) — die audit zegt expliciet dat injecteerbaarheid dan bijna
  gratis is, en het is de voorwaarde voor een latere worker/WASM-verhuizing.
- **B3 — copy-on-write snapshot.** De cap is er (zie boven), de COW-helft niet: een taak-edit kloont
  vandaag nog steeds alle relaties en toewijzingen mee. **Omvang: groot** (de audit noteert "cap S /
  COW L"). Poort: document-contract-check + geheugenmeting.
- **C2 — sleep-hotpath ontlasten.** Eén undo-snapshot per sleep i.p.v. per mousemove,
  `recomputeViewRows` pas bij mouseup. **Omvang: middel.** Bouwt voort op B1 (af).
  *Kanttekening:* commit `fb53258` (2026-08-13) heeft de undo-granulariteit van bulk-verwijderen al
  aangepakt; of dat de sleep-route raakt heb ik niet nagemeten.
- **C3 — canvas-heralloc / renderer-hergebruik.** **Geparkeerd** op 2026-07-23 (`1148376`), staat als
  zodanig in `docs/TODO.md` regel 474-477. Reden: marginale winst nu de pijl-culling binnen is, en in
  de browser-preview lastig hard te bewijzen. Alleen oppakken bij een concrete meting. Omvang klein
  tot middel.
- **D2 — IFC-serialisatie naar een Web Worker.** **Geparkeerd** op dezelfde datum, `docs/TODO.md`
  regel 464-473. De pijn is verzacht door de 10 s-throttle en de dirty-cache in
  `src/hooks/useAutoSave.ts`, dus dit is een nice-to-have. **Let op:** dit zou de eerste Web Worker
  in de app zijn — nieuwe infrastructuur (berichtenverkeer, foutafhandeling), dus met een frisse
  aanloop bouwen. Harde verificatie-eis die al vastligt: de worker moet **byte-identieke** IFC
  produceren t.o.v. de synchrone `writeIFC`. **Omvang: middel tot groot.**
- **M1** — IFCTASK/IFCTASKTIME-slot-descriptors + STEP-module. Deels ingehaald: `ifcTaskSlots.ts` en
  `ifcPsets.ts` bestaan (`docs/onderhoudbaarheid/README.md` §1 noemt ze als bewijs van
  refactor-discipline). Of de STEP-module er ook gekomen is heb ik niet geverifieerd.
- **M2** — TaskTime-split, type-only. Open. Middel.
- **M4** — backward-FS uur/dag-symmetrie in `relationMath.ts`. Open; de audit waarschuwt dat
  suite-case `rr-fs-pred-startms` bewust rood gaat en de verwachting mee moet. Middel.
- **M5** — ThemePalette-injectie + TimeAxis + print-kleurtabel (= P17 + P7 + printPreview). Open.
  Middel. Maakt de renderer eindelijk puur/headless-testbaar.

### Openstaande nulmetingen

De audit noemt er drie, alle drie nog niet gedaan voor zover ik kan zien (er zijn geen commits die
ernaar verwijzen):

1. In-app benchmark bij 2500 en 5000 taken in de browser (de 500/1000-runs staan er wel).
2. Opstartmeting op de productiebundel (`domContentLoadedEventEnd` + `first-contentful-paint`), vóór
   en ná E1/E2 — E1 en E2 zijn inmiddels gebouwd, dus deze meting mist nu haar "vóór"-punt.
3. Echte-canvas frametijd tijdens slepen/scrollen bij 1000 en 5000 taken.

Los daarvan staat in `docs/TODO.md` (regel 454-462) nog de **ResourceLeveler-schaalbaarheid**
(kwadratisch in taakaantal; 2000 taken ≈ 100 s geëxtrapoleerd in dagmodus). Kandidaat-verbeteringen:
incrementele her-solve of PF-caching per iteratie. Omvang: middel tot groot.

---

## 8. Spoor 6 — `docs/TODO.md`, thematisch

Hieronder de volledige openstaande lijst uit `docs/TODO.md`, gehergroepeerd per thema in plaats van
per bestandsvolgorde. Regelverwijzingen zijn naar `docs/TODO.md` op deze stand.

### 8.0 Eerst: items die aantoonbaar niet meer openstaan

Deze staan nog als `- [ ]` in de lijst maar zijn gefixt. Bewijs erbij, zodat een volgende sessie ze
kan afvoeren in plaats van opnieuw te onderzoeken.

| TODO-item | bewijs dat het af is |
|---|---|
| "Dag-pred/uur-succ — BEVESTIGD en in behandeling" (r. 226) | `28990a3` (2026-07-20): *"backward-uur-FS, dag-pred/uur-succ: grensvlaggen ontbraken ⇒ tf=-1 en onterecht kritiek; nu gespiegeld aan forwardHour"*. Cases `rr-fs-crossmode-*` staan in `tests/planning/cases-hours-relations.json` |
| "Lag in minuten zonder dagen verdwijnt stil" (r. 231) | Zelfde commit. `resolveEffectiveLagDays` in `CPMSolver.ts:93-100` rekent `lagMinutes` om zodra `lagDays === 0`; cases `lagadv-minutes-*` in `cases-lag-advanced.json` |
| "Een leeg project levert `projectEnd: 1970-01-01`" (r. 287) | Zelfde commit. `scheduleAnalysis.ts:372` geeft `hasSchedule ? formatInstant(projectEnd, …) : ''`. De `new Date(0)`-accumulator (r. 118) staat er nog, maar lekt niet meer naar buiten |
| "Undo-stack heeft geen limiet" (r. 264) | `5e4b85a`. `MAX_UNDO = 100` en `undoStack.shift()` in `src/state/transaction.ts:61,73` |
| "Generator-scripts staan niet in CI" (r. 324) | `verify:examples` zit in `npm run verify` (`package.json`), en dát is wat CI, release-gate en deploy-gate draaien |
| "Project verplaatsen…" (r. 329) | `28990a3` voegde `src/engine/moveProject.ts` en `src/components/dialogs/MoveProjectDialog.tsx` toe; ribbon-entry, `cases-move-project.json` en `check-move-project.ts` bestaan |
| "Live gaan in de Snap Store — eigenaar-stappen" (r. 410) | `CLAUDE.md` en de changelog: sinds 2026-07-30 publiceert `snap.yml` automatisch naar het `stable`-kanaal met `SNAPCRAFT_STORE_CREDENTIALS` |
| "In-app updater overslaan binnen de snap" (r. 404) | `src/services/updater/updaterService.ts:22,28,46` — `InstallKind` kent `'snap'` en slaat de updater over |
| "Release-notes-vulling van `latest.json` automatiseren" (r. 421) | `fe0afb1` + `scripts/release-notes.mjs`; `release.yml` roept `--format=body` en `--format=notes` aan |

> **Vertrouwensniveau.** Voor elk van deze negen heb ik óf de code gelezen óf de commit-boodschap
> mét de bijbehorende testcases gezien. Ik heb de suite níet gedraaid om het gedrag te bevestigen —
> dat is de resterende onzekerheid (zie §14).

### 8.1 Resourcebibliotheken

| item | maat | TODO-regel |
|---|---|---|
| **B1b — bezettingsoverzicht** over open documenten | middel | 15 |
| **Gedeelde opslag/sync tussen machines** — de wortel van drie van de vier bekende beperkingen | groot | 18 |
| **Kalenderpromotie verhuizen** van Backstage → Bibliotheek naar de Resources-tab (bewuste fase-1-interim) | klein tot middel | 21 |
| **Cross-document-plakken verliest resource-toewijzingen stil** — toewijzingen wijzen naar bron-document-id's. Korte-termijn-fix = een melding; via de herkomststempels kan het ook automatisch herkoppelen mits beide documenten aan dezelfde bibliotheek hangen | klein (melding) / middel (herkoppelen) | 24 |
| **Twee gelijknamige bibliotheken zijn in selectors niet te onderscheiden** — kandidaat-fix: secundair kenmerk tonen bij naamcollisie | klein | 30 |
| **Projectinfo-selector toont "geen bibliotheek" bij een dode binding** — presentatie-polish, geen dataverlies | klein | 35 |
| **`computeRecognition()` niet gememoïseerd** — schaalgrens bij pools van 1000+ items, niet gemeten | klein | 39 |
| **Undo na ontkoppelen laat een inconsistente tussenstaat achter** — `project.companyId` valt bewust buiten de undo-snapshot (B3-uitzondering in `src/state/snapshot.ts`) | klein | 44 |
| **Standaardbibliotheek zou een gegenereerd id moeten krijgen i.p.v. `DEFAULT_COMPANY_ID`** — blokkeert automatische herkenning voor eenpitters (de meest voorkomende situatie). Vergt een migratie voor bestaande installaties én bestaande `libraryOrigin`-stempels; `DEMO_COMPANY_ID` blijft bewust vast | middel | 50 |
| **Crash-herstel reset de bibliotheek-UI-vlaggen niet** in `restoreDocuments()` — de andere vier paden doen dat wél. Eerst nagaan of de vlaggen dat pad überhaupt kunnen bereiken | klein | 95 |

### 8.2 MCP-bridge

| item | maat | TODO-regel |
|---|---|---|
| **"Losmaken van de bibliotheek" als MCP-actie.** Directe vervolgstap op de spiegel-beslissing: de weigering verwíjst naar losmaken, maar de bridge kan die route niet lópen. `unlinkResourceFromLibrary` bestaat al als store-actie (projectlokaal, ongedaan te maken). Open: ook voor kalenders? Eigen tool of `action` op `planner_manage_resources`? | klein tot middel | 89 |
| **De bridge merkt niet dat het venster erachter weg is.** Gemeten: na een hot reload verdwenen de frontend-listeners, de Rust-kant bleef luisteren en élke aanvraag liep vast tot de 120 s-timeout — óók een aanvraag zónder token, die puur in Rust op 401 hoort te stranden. Eén blokkerend verzoek zet via de serialisatie-mutex al het verkeer erachter vast. Richtingen liggen vast: auth-/Origin-/methode-afwijzingen vóór de mutex; een hartslag met een snelle "geen luisteraar"-fout; frontend-listeners herstellen na een reload | middel | 148 |
| **Een tweede app-instantie is onzichtbaar voor de gebruiker.** "Poort bezet" vertelt niet dát er al een ander venster luistert. Richting: onderzoeken of het onze eigen app is en dat benoemen | klein | 159 |
| **`update_project.calendarId` kan de projectdefault niet wisselen** (de inhoud wél, via `projectDefaultId`). Nu een expliciete weigering met uitleg. Beoordeel of dit een echte beperking moet blijven | klein (besluit) | 206 |

### 8.3 IFC & interoperabiliteit

| item | maat | TODO-regel |
|---|---|---|
| **Een rauwe apostrof in een taaknaam in de DATA-sectie verliest nog steeds stil data.** `#2=IFCTASK('g2',$,'Van 't Hof',…)` levert nul taken op zonder fout. Onze eigen writer produceert dit niet (alles gaat door `ifcStr`), maar een geïmporteerd bestand kan er zo uitzien. Richting: per entiteit een niet-afgesloten string detecteren en dan óf de regel overslaan met melding, óf de hele lezing als getypeerde fout afkeuren — niet stil nul | middel | 174 |
| **De IFC-leesfouten zijn hardgecodeerd Nederlands.** `not-step`, `truncated`, `no-data-section` gooien een Nederlandse `message` die letterlijk in een Japanse of Arabische UI belandt. De `reason` is al getypeerd, dus: `messageKey` per reason + vertaling bij de aanroeper | klein | 182 |
| **Per weekdag verschillende uurbanden overleven een round-trip niet.** IFC draagt één werkweek-patroon, dus alle werkdagen krijgen bij herladen de banden van de eerste werkdag — een korte vrijdag komt terug als kopie van maandag | middel | 203 |
| **Primavera XER import/export** — hoogste interop-prioriteit na fase 2. Tekstformaat, native in TS haalbaar (geen JVM). Uitgebreide scope-uitwerking ligt klaar op een **niet-gemergede branch**, zie §10 | groot | 724 |
| **iCalendar (.ics) export** — mijlpalen/deadlines naar agenda-apps; goedkoop, hoge waarde | klein tot middel | 726 |
| **MS Project MPP / Asta PP import** — alleen via MPXJ (JVM), dus níét als core-dependency. Besluit ligt vast: distributie via het extensiesysteem met "managed tools", waarbij de **app-kern** de binary-levenscyclus beheert (bevestigingsvraag, download, sha256, opslag in de app-datamap, updates, opruimen) en de extensie alleen declareert | groot | 727, 738 |
| **KYP Project REST API-integratie (onderzoek)** — de facto NL-bouwplanningstool zonder publieke export; eerst API-toegang/partnerschap verkennen | onbekend (onderzoek) | 739 |
| **PMXML-dialectvarianten breed genoeg dekken** — restcontrole op de bestaande P6-XML-round-trip | klein tot middel | 742 |
| SVG-export van de Gantt; clipboard-export naar Excel; MSPDI native `<Notes>`-mapping | elk klein tot middel | 744-748 |

### 8.4 Rapportage, export & print

| item | maat | TODO-regel |
|---|---|---|
| **Raster-terugval van de rapport-export heeft geen paginalimiet.** De *preview* is afgedekt (`maxPages`, 30 vellen — geverifieerd in `ReportPanel.tsx:375`), `exportRaster()` niet: alle `rows × cols` pagina-canvassen bestaan tegelijk vóór de JPEG-omzetting, op `SUPERSAMPLE = 2`. Gemeten scenario (300 taken, `timelineColumns: 8`, 160 pagina's) komt op ~2,5 GB. Slaat toe precies wanneer de vector-tak net gefaald is. Fix-richting: streamend omzetten en per pagina vrijgeven | middel | 252 |
| §3.9 uit PLAN.md — rapport-wizard, standaardrapporten, custom rapporten, grafische rapporten, look-ahead, voortgangsrapport, executive dashboard, opleverpuntenlijst, kostenrapport | elk middel; samen groot | 750-760 |

### 8.5 UI & interactie

| item | maat | TODO-regel |
|---|---|---|
| **Taakdatumvelden pushen 3 undo-stappen per ingetypte datum.** `DateTextInput` commit live bij elke toetsaanslag en `parseFlexibleDate` accepteert een jaar al bij 2 cijfers. **Advies ligt vast na onderzoek (2026-07-20):** los het bij de bron op met een `commitMode`-prop (commit-op-blur), niet met per-actie coalesce-keys — de gedeelde `task-sections`-componenten voeden zowel het eigenschappenpaneel als de taakdialoog. `grep -rn "commitMode" src/components` geeft nul treffers, dus dit is niet gebouwd | middel | 269 |
| **Zes Gantt-schakelaars slaan aan terwijl de Gantt niet in beeld is** (histogram, baseline-overlay, voortgangslijn, statusdatumlijn, mini-map, split view). Expliciet genoteerd als **één ontwerpprobleem, geen zes bugs**. Keuze nodig: de zes uitschakelen met tooltip zolang de Gantt onzichtbaar is, óf de volledige-paneelmodus zo vormgeven dat hij de Gantt niet verdringt | middel (na een besluit) | 359 |
| **Anker versus berekend: `scheduleStart` als datamodel-vraag.** Het paneelveld is gelijkgetrokken, maar in de tabel typ je een datum die naar `scheduleStart` gaat terwijl de cel daarna de berekende datum toont — je invoer *lijkt* genegeerd. Nette oplossing: het anker alleen bewaren bij taken zonder voorgangers, óf het als apart "Plan"-veld benoemen en overal consistent labelen. Raakt store, IFC-round-trip, `TableEditor`, `TaskDialog`, paneel, `check-ifc-roundtrip.ts` en i18n — **eigen golf**. Let op het regressierisico beschreven in `scheduleSlice.ts:96-100` | groot | 241 |

### 8.6 Prestaties

| item | maat | TODO-regel |
|---|---|---|
| **`applyWbsNumbering` + `recomputeViewRows` draaien per mutatie** — de tweede kwadratische factor naast K-item 32. Bij 600 `addTask`-aanroepen ging het van 4528 ms naar 1533 ms door de transactie-fix, maar de schaling bleef ~3,5× bij verdubbeling van n. Aanpak: binnen een lopende batch uitstellen tot het einde. **Expliciet genoteerd als gedragswijziging, geen pure optimalisatie** — code binnen de batch ziet dan verouderde `wbsCode`/`viewRows`. Geverifieerd: `applyWbsNumbering` wordt nog steeds per mutatie aangeroepen (`taskSlice.ts:361`) | middel | 348 |
| **ResourceLeveler-schaalbaarheid** — zie §7 | middel tot groot | 454 |
| **D2 / C3** — zie §7, geparkeerd | — | 464, 474 |

### 8.7 Kwaliteit, tests & poorten

| item | maat | TODO-regel |
|---|---|---|
| **Geen enkele poort raakt het Tauri-asset-protocol.** Aangetoond 2026-07-28: in de uitgeleverde `.deb` v2026.7.13 toonde Backstage → Help bij élk artikel "Artikel niet gevonden" terwijl alle artikelen in de binary zaten (gefixt in `e257770`). Oorzaak: `tauri-utils` kent de extensie `md` niet en valt terug op `MimeType::Html`. Niets ving het: dev, webdeploy én `tauri:dev` gaan allemaal via Vite; CI bouwt de bundel wel maar start hem nooit. **Nog steeds latent** voor `.ifc`-voorbeelden en (bij een overstap naar `instantiateStreaming`) voor `pdf/hbSubset.ts`. Twee kandidaat-poorten liggen vast: de gebundelde binary in CI daadwerkelijk starten, óf — veel goedkoper — een headless check die onze uitgeleverde extensies aftoetst tegen de MIME-tabel van `tauri-utils` | middel (goedkope variant: klein) | 433 |
| **Driedubbele eindverificatie van fase 2** (uitgesteld sinds 2026-07-04). De volledige werkwijze ligt klaar als uitvoerbaar script: `docs/superpowers/workflows/triple-verify.js` — 8 gebieden × (1 Opus + 2 Sonnet) + een Opus-rechter per gebied, met een afgedwongen rapportschema. **Vóór gebruik `ROOT`/`TMP` en de prompts actualiseren** (het script draagt nog het oude `/OPS/`-pad, zie §2 punt 8) | groot | 479 |

### 8.8 Distributie & release

| item | maat | TODO-regel |
|---|---|---|
| **Bewaarplek van de minisign-privésleutel en zijn wachtwoord vastleggen** — de enige onherstelbare SPOF; de pubkey `28AC8F08A87C90CD` zit in élke uitgeleverde binary en Tauri kent één `pubkey`-veld, dus geen reservesleutel. Kwijt = alle bestaande installaties permanent van auto-update afgesneden. De GitHub-secret telt niet als back-up (write-only) | klein (maar alleen de eigenaar kan het) | 379 |
| **Een tweede persoon toegang geven** — bus factor is nu hard 1 op die sleutel | klein | 387 |
| **Vervaldatum van `AZURE_CLIENT_SECRET` + certificaatprofiel vastleggen**, met een agenda-herinnering die niet aan één persoon hangt. Verloopt uit zichzelf en breekt midden in een release — ná de onomkeerbare tag-push | klein | 388 |
| **Vervaldatum van `SNAPCRAFT_STORE_CREDENTIALS` vastleggen**, idem | klein | 391 |

### 8.9 Fase 3 t/m 6 uit PLAN.md

Deze staan integraal in `docs/TODO.md` regel 648-896 en zijn hierboven in §3 samengevat. Ze zijn
allemaal *groot* in de zin dat elk blok een eigen ontwerpronde vraagt; ik kan ze niet zinvol fijner
schatten zonder ontwerp.

---

## 9. Spoor 7 — open GitHub-issues

Tien open issues, geen open PR's. Gekoppeld aan de sporen hierboven waar dat kan.

| issue | titel | spoor | opmerking |
|---|---|---|---|
| [#17](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/17) | Proposal: comprehensive import/export format support | §8.3 | De "6+2"-lijst met NL-marktanalyse; drijft de XER/ICS/MPP-prioritering in `docs/TODO.md` §3.8. Laatst bijgewerkt 2026-08-14 |
| [#19](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/19) | Ressources über mehrere Projekte | §4 (B1b) | B1/B1.1 dekken het bibliotheekdeel; het gevraagde "overzicht waar welke resource verpland is om dubbelbezetting te zien" is letterlijk B1b en staat nog open |
| [#21](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/21) | Verbeterpunten na testen | §8.5 | Meerdelig; verticale drag, weeknummers, Ctrl+klik-multiselect, relatie uit selectie, alleen-werkdagen-as. Grote delen zijn gebouwd (werkdagen-as, verticale drag hebben eigen ontwerpdocs in `docs/superpowers/`); punt 1 (auto-scroll bij verticaal slepen) ligt onafgemaakt in twee benchmark-worktrees, zie §10 |
| [#27](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/27) | Status-update view en spreadsheet-round-trip voor voortgang | fase 2.6-uitloper / §8.4 | Afgesplitst van #26. Een spreadsheet-sjabloon dat je naar het uitvoeringsteam stuurt en terugimporteert. Middel tot groot |
| [#47](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/47) | Issues with Relations tab (**bug**) | §8.5 | Relaties niet selecteerbaar; taaktabel en Gantt verdwijnen bij die tab, waardoor de meeste ribbon-acties onbruikbaar zijn. Zelfde grondprobleem als het "zes Gantt-schakelaars"-item: paneelmodus verdringt de Gantt |
| [#52](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/52) | Diversen | §8.5 | Verzamelissue. Middelklik-pan is inmiddels gebouwd (`ce1ef47`); de rest (drag-and-drop met linkermuisknop, breedte-instelbare hoofdstukken, blokken groeperen) staat open |
| [#53](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/53) | Warnings- en rule-check-paneel | nieuw | Statusbalk toont waarschuwingen maar zonder detail; gevraagd wordt een paneel dat naar de betrokken taak/resource/relatie navigeert. Sluit aan op het meldingenkanaal uit K8. Middel |
| [#54](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/54) | Verbeteringen aan het Gantt-rapport | §8.4 | Statusdatum-/voortgangslijn als optie in het rapport, en de huidige gefilterde/gegroepeerde/gesorteerde weergave exporteren. Middel |
| [#63](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/63) | Herrekent hij meteen na openen? | §8.5 / fase 2 | Vraag om herberekening te kunnen uitzetten en datums te tonen zoals vastgelegd — relevant voor uit P6 → IFC geïmporteerde planningen met onvolledige logica. Raakt de "anker versus berekend"-datamodelvraag (`docs/TODO.md` r. 241). Klein als instelling, groot als datamodelvraag |
| [#65](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/65) | Snelle preview en navigatie naar afhankelijke activiteiten | §8.5 | Knop met het bestaande relatiepijl-icoon bij elke afhankelijke activiteit in het eigenschappenpaneel, die ernaartoe navigeert. Klein tot middel |

---

## 10. Spoor 8 — geparkeerd, geblokkeerd en onafgemaakt werk

### Branches die ergens op wachten

Geverifieerd met `git rev-list --count origin/main..<branch>` over alle lokale én `origin`-branches.
Slechts vier hebben werk dat niet op `main` staat.

**1. `origin/claude/orchestrator-role-uiskcu` — 10 commits, gepusht, niet gemerged, niemand wacht erop.**
Dit is de belangrijkste vondst van dit spoor.

- **Een echte bugfix:** `8122249` `fix(msproject): baselines meegeven bij MSPDI-export + regressietest`.
  De diff op `src/state/slices/fileSlice.ts` voegt `state.baselines, state.activeBaselineId` toe aan
  de `writeMSPDI`-aanroep. Zonder die twee argumenten valt de writer terug op zijn defaults
  (`[]` / `null`) en **gaat de actieve baseline stil verloren bij MSPDI-export, terwijl de reader
  hem wél inleest**. Ik heb `main` gecontroleerd: `mspdiWriter.ts:197` accepteert de parameters,
  `fileSlice.ts` geeft ze niet mee. **De bug staat dus nog op `main`.** De branch bevat ook
  `tests/planning/check-mspdi-baseline-export.ts` (129 regels) en de bijbehorende `run.sh`-regel.
- **Een compleet marktonderzoek** (~58.000 regels onder `docs/marktonderzoek/`: eindrapport, per
  markt, per sector, dwarsdoorsnede-thema's). Bestaat niet op `main`.
- **Drie substantiële `docs/TODO.md`-uitbreidingen** die roadmap-materiaal zijn:
  - **Slavische talen + Russisch** (`ru`, `uk`, `cs`, `sk`, `sr`, `hr`, `bg`, plus `hu`/`ro` als
    niet-Slavische buren in hetzelfde CEE-gat) — onderbouwd met marktcijfers; `uk` is expliciet
    géén afgeleide van `ru`.
  - **Nordic talen** (`sv`, `nb`, `da`, `fi`) — de Nordics stonden in de top-5 kansen van het
    onderzoek; nu valt die markt volledig op Engels terug.
  - **XER-scope-uitwerking**: recordmarkers `%T`/`%F`/`%R`, minimaal benodigde tabellen (`PROJECT`,
    `PROJWBS`, `TASK`, `TASKPRED`, `CALENDAR`, `RSRC`, `TASKRSRC`), import vóór export, en de
    aandachtspunten (ongedocumenteerd en versiegebonden formaat, eigenzinnige kalender-encoding,
    duur en lag in **uren**, geen schema om tegen te valideren, dus echte P6-fixtures nodig).
    Plus de bevinding dat de **PMXML-elementnamen nooit tegen echte P6 geverifieerd zijn**
    (`p6xmlWriter.ts:78-80` zegt het zelf) en dat er geen fixtures van echte P6-/MS Project-exports
    in `tests/planning/` staan.

  **Beslissing nodig:** deze branch mergen (of ten minste de MSPDI-fix eruit halen). Zolang dat niet
  gebeurt staat er een stille dataverlies-bug op `main` en ligt er roadmap-onderbouwing buiten de
  lijst.

**2. `claude/voorbeelden-resources` — 4 commits, lokaal, niet gepusht. LOPEND WERK.**
Acht basisvoorbeelden hebben resourcesets gekregen omdat 22 van de 24 voorbeeldbestanden 0 resources
en 0 toewijzingen hadden — wie een voorbeeld opende zag dus niets van de Resources-tab, het
histogram, nivellering en de resourcebibliotheek. Commits van 2026-08-14 (vandaag), met
`scripts/example-resources.ts` (551 regels nieuw) plus opnieuw gegenereerde `examples/` en
`public/examples/`. De merge-base is `276e569`, dus de branch loopt **één commit achter** op
`origin/main` (`3cec89b`). Wacht op: een visuele controle door de eigenaar en een merge met de
actuele main.

**3. `backup-voor-push` (13 commits) en `backup-voor-rebase` (9 commits).** Beide bevatten het
rapport-werk rond issue #25. De commit-titels komen één-op-één terug op `main` (bijv.
`fix(rapport): labels vrij van relatielijnen…` = `bbafca1`, `feat(rapport): instellingen blijven
bewaard` = `d87d5b2`). Het zijn dus back-ups van al gemerged werk. Ik heb **niet** vergeleken of
`460de62` ("bevindingen uit de derde hyperkritische review") volledig op `main` staat — dat is de
enige die geen duidelijke tegenhanger heeft.

**4. `origin/chore/push-local-work-2026-07-30` — 1 commit.** Een WIP-veiligstelling met vooral
gegenereerde `output/*.pdf`/`*.png`-artefacten. `9f0ebda` heeft `output/` inmiddels in `.gitignore`
gezet, dus deze branch is achterhaald en kan waarschijnlijk weg.

### Worktrees als signaal

Elf worktrees onder `.claude/worktrees/`. De meeste staan op een commit die al op `main` zit. Twee
hebben **ongecommitte wijzigingen**:

- `bench-a-glm` en `bench-a-sonnet` — beide staan op `bench/a-*` (390 commits achter op main) en
  hebben allebei `M src/components/canvas/hooks/useRowDrag.ts` + `?? src/components/canvas/hooks/autoScroll.ts`.
  Dit is een **model-vergelijkingsproef**: twee modellen die dezelfde taak (auto-scroll bij
  verticaal slepen, issue #21 punt 1) op dezelfde basis uitvoeren. Niet mergebaar zoals het is — de
  basis is te oud. Behandel als experiment, niet als roadmap-werk.
- `todo-kleine-dingen-794832` — `M docs/TODO.md` op een branch die 382 commits achterloopt. Vrijwel
  zeker een restje; niet zonder diff mergen.

### Geparkeerd met een reden

| item | waarom geparkeerd | wanneer heropenen |
|---|---|---|
| **IFCX / IFC 5** (conceptplan §5) | IFC 5 is alpha en heeft geen proces-/planningsdomein — er is niets om op te bouwen | Halfjaarlijkse monitorcheck: proces-/taakklassen in de IFC5-schema's, een `process`-module op ifcx.dev, uitslag van de Standards-Committee-stemming |
| **D2 — opslaan naar een Web Worker** | De pijn is verzacht door de 10 s-throttle + dirty-cache; het zou de eerste Web Worker in de app zijn | Bij een gemeten hik op grote projecten, en dan met een frisse aanloop |
| **C3 — canvas-heralloc** | Marginale winst nu C1 binnen is; in de browser-preview lastig hard te bewijzen | Alleen bij een concrete meting die aantoont dat het knelt |
| **Gedeelde opslag/sync van bibliotheken** | Local-first, geen server. Wortel van drie van de vier bekende beperkingen in `docs/library.md` | Eigen vervolgproject; er is nog geen ontwerp |
| **MPP/Asta-import via MPXJ** | JVM-dependency is strijdig met de lichte Tauri/web-architectuur | Route ligt vast (managed tools via het extensiesysteem); wacht op vraag |
| **Bedrijfsoverstijgende histogrammen/overzichten** | Expliciet afgewezen (besluit user 2026-07-20) — B1b blijft strikt binnen één bibliotheek/pool | Niet; dit is een gesloten besluit |
| **Reactief herrekenen (CPM bij elke edit)** | Botst met het bewuste "manual, not reactive"-ontwerp | Niet. Let op de spanning met issue #63, die juist om *minder* herrekenen vraagt |
| **`GanttRenderer` in pass-modules splitsen** | Lage opbrengst, renderlaag ongetest; hit-test en tekengeometrie delen al één bron | Niet — expliciet "bewust NIET doen" in de modulariteits-audit |
| **De 72 %-store-koppeling van componenten "oplossen"** | Normaal Zustand-idioom, geen schuld | Niet |
| **Compute naar Rust/WASM** | A1+A2 haalden het in pure TypeScript; projectregel is "Rust dun" | Niet |

---

## 11. Beslissingen die op de user wachten

Kort en op één plek. Alles hieronder is een keuze die niemand anders kan maken.

1. **Sleutelbeheer — vier velden invullen in `docs/release-secrets.md`.** Bewaarplek + wachtwoord
   van de minisign-privésleutel, een tweede persoon met toegang, en de vervaldata van
   `AZURE_CLIENT_SECRET` en `SNAPCRAFT_STORE_CREDENTIALS` mét een agenda-herinnering die niet aan
   één persoon hangt. Zolang die velden `⟨IN TE VULLEN⟩` zijn is dat document een inventarisatie en
   géén herstelplan. Het migratiepad staat al uitgeschreven in §2 van dat document en werkt
   **alleen zolang de oude sleutel er nog is**.

2. **`origin/claude/orchestrator-role-uiskcu` mergen of afvoeren.** Er staat een echte
   dataverlies-bugfix in (MSPDI-export verliest de actieve baseline) plus het volledige
   marktonderzoek en drie roadmap-uitbreidingen. Deelbesluit mogelijk: alleen de fix cherry-picken.

3. **`claude/voorbeelden-resources` — visuele controle.** De branch wacht expliciet op jouw
   akkoord vóór de merge.

4. **De zes Gantt-schakelaars (`docs/TODO.md` r. 359) — welke van de twee routes?** Uitschakelen met
   tooltip zolang de Gantt niet zichtbaar is, óf de volledige-paneelmodus zo vormgeven dat hij de
   Gantt niet verdringt. Het TODO-item waarschuwt expliciet dat de generieke regel "toon de Gantt bij
   het aanzetten van een Gantt-optie" schadelijk is. Ditzelfde besluit raakt issue #47.

5. **"Anker versus berekend" (`scheduleStart`) — datamodelkeuze.** Anker alleen bewaren bij taken
   zonder voorgangers, óf het als apart "Plan"-veld benoemen en overal consistent labelen. Eigen
   golf; raakt store, IFC, tabel, dialoog, paneel, tests en i18n. Hangt samen met issue #63.

6. **`update_project.calendarId` — echte beperking of nog te bouwen?** Nu weigert de tool met uitleg.

7. **"Losmaken van de bibliotheek" via MCP — eigen tool of `action` op `planner_manage_resources`?
   En geldt hetzelfde voor kalenders?**

8. **Standaardbibliotheek een gegenereerd id geven?** Lost automatische herkenning voor eenpitters
   op (de meest voorkomende situatie), maar vergt een migratie voor bestaande installaties én
   bestaande `libraryOrigin`-stempels.

9. **Volgende fase kiezen.** Fase 3 (Lean/LPS, EVM, kosten, NL-standaarden), spoor A (federatie, de
   opstap naar 4D), of B2 (scenario-lagen). Deze drie concurreren om dezelfde tijd en er ligt geen
   besluit.

10. **De driedubbele eindverificatie van fase 2 — nu doen of nog uitstellen?** Het draaiboek ligt
    klaar (`docs/superpowers/workflows/triple-verify.js`) en is uitgesteld sinds 2026-07-04. Fase 2
    is inmiddels compleet, dus de oorspronkelijke voorwaarde ("uitvoeren zodra fase 2 verder
    gevorderd is") is vervuld.

11. **Beslispunt 3 uit het lagen-conceptplan:** elementboom-koppeling zónder 3D-weergave als bewuste
    scopegrens? Het conceptplan stelt voor om monty's Speckle-route niet te volgen. Nog niet
    formeel beantwoord.

---

## 12. Geparkeerd en waarom

Zie de tabel in §10 ("Geparkeerd met een reden") — die staat daar omdat hij naadloos aansluit op de
branch-inventarisatie. Samengevat in één alinea: geparkeerd zijn **IFCX** (geen planningsdomein in
IFC 5), **D2 en C3** uit de prestatie-audit (winst te klein of te duur te bewijzen), **gedeelde
bibliotheeksync** (vergt een server die er niet is), **MPP/Asta-import** (JVM), en een reeks
expliciete *niet-doen*-besluiten uit beide audits (GanttRenderer splitsen, store-koppeling
"oplossen", reactief herrekenen, Rust/WASM, React vervangen, `structuredClone`, autoFreeze uit,
selectors herstructureren). Die laatste groep is geen uitgesteld werk maar een genomen besluit —
heropen ze niet zonder nieuwe meting.

---

## 13. Mijn voorgestelde volgorde — expliciet mijn inschatting

> Dit is **niet** eerder besloten. Het is mijn weging van wat ik hierboven heb geverifieerd. Neem
> het als vertrekpunt voor een gesprek, niet als plan.

**Eerst, want het is stil dataverlies op `main`:**
1. De MSPDI-baseline-fix uit `origin/claude/orchestrator-role-uiskcu` binnenhalen (klein).

**Daarna, want het is goedkoop en de brief-schuld staat er nog:**
2. `docs/TODO.md` opschonen — de negen items uit §8.0 afvoeren (klein). Zonder dit onderzoekt de
   volgende sessie opnieuw wat al gefixt is.
3. De MCP-bridge-robuustheid (`docs/TODO.md` r. 148): auth-/Origin-afwijzingen vóór de mutex. Dat is
   het deel met het slechtste symptoom (twee minuten stilte) en de kleinste ingreep.

**Dan, want het is gebruikerszichtbaar en er liggen issues op:**
4. Een besluit over de paneelmodus (beslissing 4) en dan issue #47 + de zes Gantt-schakelaars in één
   golf (middel).
5. `claude/voorbeelden-resources` afronden na jouw visuele controle (klein voor mij, wacht op jou).

**Dan het inhoudelijke werk, in de volgorde die de bestaande documenten al voorstellen:**
6. **B1b** (middel) — het is het kleinste zelfstandig waardevolle stuk, het beantwoordt issue #19
   volledig, en het fundament ligt er.
7. **XER-import** (groot) — hoogste interop-prioriteit volgens issue #17 én het marktonderzoek, en
   de scope-uitwerking ligt al klaar op de orchestrator-branch. Import eerst, export daarna.
8. Daarna kiezen tussen **spoor A** (federatie → opstap naar fase 4) en **fase 3.5** (kosten/budget,
   het goedkoopst bereikbare fase-3-blok omdat resources en baselines er al zijn).

**Doorlopend, naast het bovenstaande:**
- A3 uit de prestatie-audit (klein tot middel, valt samen met M3 en is de voorwaarde voor een latere
  worker).
- De structurele items 33 → 35 → 34 wanneer je tóch in `GanttCanvas`/`taskSlice` zit.
- De sleutelbeheer-velden (beslissing 1) — dat is een half uur en het risico is onherstelbaar.

**Wat ik nadrukkelijk níet vooraan zou zetten:** B2 (scenario-lagen). Het is greenfield, raakt vier
subsystemen tegelijk, en er ligt geen ontwerp. Als het toch nu moet: begin met de kalender-only
variant zoals het conceptplan voorstelt.

---

## 14. Wat ik NIET heb kunnen vaststellen

Eerlijk onvolledig is beter dan glad en onjuist. Dit is wat ik niet hard heb.

**Niet gedraaid, dus niet bewezen.**
- Ik heb **alleen `npm run verify:docs`** gedraaid (exit 0). De planningssuite, de bibliotheeksuite,
  de MCP-suite, `typecheck`, `lint`, `verify:examples`, `verify:i18n`, `verify:cycles` en
  `verify:audit` heb ik **niet** gedraaid. Alle uitspraken over "dit is gefixt" berusten op
  code-lezing plus commit-boodschappen, niet op groen gedrag.
- Ik heb de app niet gestart — niet in de browser, niet als desktopbuild. Alle UI-uitspraken komen
  uit code en issue-teksten.

**Onzekerheden per spoor.**
- **§8.0 (achterhaalde TODO-items).** Voor "dag-pred/uur-succ" en "lagMinutes" leun ik op de
  commit-boodschap van `28990a3` plus het bestaan van de bijbehorende cases (`rr-fs-crossmode-*`,
  `lagadv-minutes-*`). Ik heb die cases niet gedraaid en niet gelezen of hun verwachtingen het juiste
  gedrag vastleggen.
- **§7, M1.** Of de STEP-module uit M1 er gekomen is heb ik niet nagekeken; ik zag alleen dat
  `ifcTaskSlots.ts`/`ifcPsets.ts` bestaan.
- **§7, C2.** Of `fb53258` (bulk-verwijderen als één undo-stap) ook de sleep-route raakt, weet ik
  niet — ik heb de diff niet gelezen.
- **§6, item 36.** "Deels af" is mijn inschatting op basis van vier deelclaims waarvan ik er drie
  kon verifiëren; van de vierde (`resourceNames` index-Map) zag ik alleen dat de functie ongewijzigd
  in `filterEval.ts` staat, niet of hij nog een hotspot is.
- **§8.1, `restoreDocuments` en de bibliotheek-UI-vlaggen.** Ik zag dat `switchDocument` en
  `closeDocument` de vlaggen resetten en dat `restoreDocuments` wél `runCPM` aanroept
  (`documentSlice.ts:381`), maar ik heb niet kunnen vaststellen of de vlaggen dat pad überhaupt
  kunnen bereiken — precies de vraag die het TODO-item zelf stelt.
- **§10, `backup-voor-push`.** Ik heb per commit-titel vergeleken, niet per diff. Van `460de62`
  ("bevindingen uit de derde hyperkritische review (#25)") kon ik geen tegenhanger op `main` vinden;
  het kan zijn dat de inhoud onder een andere titel is geland, het kan ook echt ontbreken.

**Externe feiten die ik niet kon controleren.**
- De uitslag van de buildingSMART Standards-Committee-stemming over IFC 5 (gesloten 8-8-2025). Het
  conceptplan noemt de uitkomst onbekend; ik heb niet extern gekeken. Dat is een monitorsignaal dat
  inmiddels een jaar oud is.
- Of de minisign-privésleutel ergens buiten de GitHub-secrets bestaat. Niet vast te stellen vanuit
  de repo — dat is exact waarom beslissing 1 bestaat.
- Welke checks required zijn op de protected branch `main`. Het onderhoudbaarheidsonderzoek noemde
  dit al als openstaande vraag; ik heb het niet opnieuw geprobeerd.

**Dingen die ik bewust niet heb gedaan.**
- De vier `/OPS/`-padverwijzingen gerepareerd (buiten scope, alleen gemeld — §2 punt 8).
- `docs/CHANGELOG.md` aangeraakt.
- `docs/TODO.md` opgeschoond. De negen achterhaalde items staan er nog in; §8.0 is de lijst waarmee
  iemand dat in één keer kan doen.
- Enige codewijziging.

**Één inconsistentie die ik onderweg tegenkwam en niet heb opgelost.** `CLAUDE.md` zegt "38
`planner_*`-tools"; mijn eigen telling over `src/services/mcp/tools/` geeft er **39**, en de
snap-meting in `docs/TODO.md` r. 134 noemt er óók 39. `npm run verify:docs` controleert wel
CLAUDE.md-beweringen maar kennelijk niet deze. Cosmetisch, maar het is precies het soort drift dat
die poort hoort te vangen.
