# Spec — B1b: bezettingsoverzicht per bibliotheek over alle open documenten

Datum: 2026-08-14 · Status: ontwerp, ter akkoord user · Bouwt op B1/B1.1 (herkomststempels,
Bibliotheek-/Projectweergave). Beantwoordt het resterende deel van
[issue #19](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/19): "meerdere
projecten openen en zien waar welke resource verpland is, om dubbelbezetting te zien".
Besluiten gemarkeerd met **(besluit)**.

## 1. Doel

Eén overzicht dat, binnen één resourcebibliotheek, over álle geopende documenten heen laat zien
waar elke bibliotheekresource geboekt staat — per document, per periode — en op welke dagen de
som van die boekingen boven de bedrijfscapaciteit uitkomt (**dubbelbezetting**). Het overzicht is
leesvenster, geen werkbank: er valt niets vanuit te muteren.

## 2. Vastliggende scope-grenzen (eerder besloten — niet heropenen)

1. **Strikt binnen één bibliotheek/pool.** Bedrijfsoverstijgende histogrammen/overzichten zijn
   expliciet afgewezen (besluit user 2026-07-20, vastgelegd in
   `docs/archive/superpowers/specs/2026-07-20-b1-bedrijfsbibliotheken-design.md` regel 12).
2. **Alleen geopende documenten op deze machine.** Er is geen gedeelde opslag/sync; boekingen op
   de machine van een collega bestaan lokaal niet (`docs/library.md`, "Bekende beperkingen"
   punt 2). Deze beperking wordt vooraf gedocumenteerd — in het gebruikersartikel (§9) én als
   permanente hint in de weergave zelf (§5).
3. **Matching uitsluitend via `libraryOrigin`-stempels** (`companyId` + `libraryItemId`,
   `src/types/library.ts`) — nooit via naam. Identiteit rust op id (zie `docs/library.md`,
   "Identiteit rust op id, niet op naam").
4. **Geen `createAppStore()`-factory** (onderhoudbaarheidsitem 41). B1b leest passieve
   `DocumentPayload`-snapshots uit `documentSlice`; er is géén live cross-document solve.

## 3. Waar leeft de weergave? (vraag a)

Drie kandidaten afgewogen:

- **Backstage → Bibliotheek** — afgevallen. Die sectie is met B1.1 bewust gekrompen tot
  bedrijvenbeheer (spec B1.1 §7); bezetting is een plannersvraag, geen beheertaak. Backstage
  verbergt bovendien de Gantt en de context van het actieve project.
- **Eigen paneel (rechterzijde, naast `TableEditor`/`IFCPanel`)** — afgevallen. Een extra
  paneelsoort betekent nieuwe chrome (mount-conditie, collapse-state, ribbonknop) voor een
  weergave die inhoudelijk gewoon "de derde blik op resources" is. De rechterpanelen zijn
  bovendien smal; dit overzicht is tabelvormig en breed.
- **Derde weergave in de Resources-tab (`ResourcePanel`)** — **gekozen (besluit)**. Het
  Resources-tabblad is sinds B1.1 dé werkplek voor alles rond resources; de schakelaar
  Bibliotheek/Project (`ui.resourcesView: 'company' | 'project'`, `src/state/slices/types.ts`)
  bestaat al en wordt uitgebreid met een derde stand.

Concreet:

- `ui.resourcesView` wordt `'company' | 'project' | 'occupancy'`. Het veld is **session-only**
  (géén `ops-`-sleutel, geen settingsRegistry-entry) en `ResourcePanel` reset het bij elke
  mount en bij elke wijziging van `[project.companyId, linked]` bewust naar `'project'`
  (issue #64). De Bezettingsweergave erft dat gedrag: hij is weg na sluiten/heropenen van het
  paneel — dat is bestaand, gecontroleerd gedrag, geen omissie (critreview bevinding 6).
- De schakelaar rechtsboven in `src/components/panels/ResourcePanel.tsx` krijgt een derde knop
  **"Bezetting"** (`t('resource.occupancyView')`). De weergave zelf komt als eigen component
  `src/components/panels/ResourceOccupancyView.tsx`, gerenderd vanuit `ResourcePanel` wanneer
  `resourcesView === 'occupancy'` — het paneel is al groot; de nieuwe weergave hoort in een
  eigen bestand, niet erbij in de bestaande 1200+ regels.
- **Zichtbaarheid (besluit):** de knop bestaat alleen wanneer het actieve document aan een
  lokaal bestaand bedrijf gekoppeld is (`linked`, zelfde conditie als de Bibliotheekweergave).
  Een los document heeft geen bibliotheekcontext en dus geen bezettingsoverzicht; een
  bibliotheekkiezer voor losse documenten staat op de bewust-later-lijst (§12). Valt de
  koppeling weg terwijl de weergave openstaat (bedrijf verwijderd, ontkoppeld), dan valt het
  paneel terug op de Projectweergave — zelfde vangnet als de Bibliotheekweergave nu.

## 4. Aggregatie over payload-snapshots (vraag b)

### 4.1 De pure kern: `computeLibraryOccupancy`

Nieuw bestand `src/services/library/occupancy.ts` (naast `libraryOps.ts` — het is
bibliotheekdomein dat engine-bouwstenen leent), met één pure, headless testbare functie:

```ts
export interface OccupancyDocInput {
  docId: string;
  title: string;            // via documentTitle(); '' ⇒ weergavelaag vult 'untitled' + ordinal
  scheduleStale: boolean;
  companyId: string | null; // project.companyId van dit document
  resources: Resource[];
  assignments: ResourceAssignment[];
  tasks: Task[];
  calendar: WorkCalendar;   // projectkalender
  calendars: WorkCalendar[];
}

export interface OccupancyDocBooking {
  docId: string;
  title: string;
  scheduleStale: boolean;
  counted: boolean;         // false ⇒ stale: zichtbaar maar niet meegeteld (§4.3) — dan geen cijfers
  firstDay: string | null;  // ISO, eerste dag met belasting > 0 (null bij counted: false)
  lastDay: string | null;
  peak: number;             // hoogste dagbelasting binnen dít document (0 bij counted: false)
  dailyLoad: Record<string, number>; // ISO-dag → belasting (alleen dagen > 0; {} bij counted: false) — voedt §5a
}

export interface OccupancyRow {
  libraryItemId: string;    // pool-resource-id
  name: string;             // poolnaam (weergave; matching blijft op id)
  docs: OccupancyDocBooking[];
  totalPeak: number;        // hoogste gesommeerde dagbelasting over documenten
  capacityAtPeak: number;   // maxUnitsOn(poolItem, piekdag)
  conflictDays: string[];   // ISO-datums waar som > capaciteit (gesorteerd)
}

export function computeLibraryOccupancy(
  companyId: string,
  pool: CompanyPool,
  docs: OccupancyDocInput[],
): { rows: OccupancyRow[]; anyStale: boolean }
```

Per document draait de functie de bestaande `computeResourceLoad`
(`src/engine/scheduler/ResourceLoad.ts`) op de payload-velden van dát document — dezelfde
curve-verdeling (`distributeUnits`), leaf-filter en werkdag-mapping als het bestaande
histogram, dus per-document exact consistente cijfers. Daarna wordt per resource het
`load`-resultaat via `resource.libraryOrigin.libraryItemId` opgeteld in een emmer per poolitem
per ISO-dag.

**Er wordt bewust NIET geleund op het opgeslagen `resourceLoadResult` in de payload**: grens 3/4
van het verversingsmodel kan resources/kalenders van een slapende payload al ververst hebben
terwijl diens `resourceLoadResult` nog oude waarden droeg (dat is precies waarom
`switchDocument` bij activering onvoorwaardelijk `recomputeResourceLoad()` draait — zie het
commentaar in `src/state/slices/documentSlice.ts`). Vers rekenen vanuit de payload-velden is
goedkoop (§7) en altijd juist t.o.v. wat de payload bevat.

### 4.2 Scope-regels per document en per item

Zelfde scope als alle B1.1-mechaniek (spec B1.1 §2, "stempel-scope"):

- Een document telt alleen mee wanneer `doc.companyId === companyId` — documenten die aan een
  ándere (of geen) bibliotheek hangen dragen niets bij, ook niet via vreemde stempels.
- Een resource telt alleen mee wanneer `resource.libraryOrigin?.companyId === companyId` **én**
  `pool.resources` het `libraryItemId` nog bevat. **Wezen** (origineel uit de pool verwijderd)
  vallen er dus uit: het overzicht is per poolitem geordend en een stempel dat nergens meer
  naar wijst hoort bij geen enkel poolitem **(besluit)**. Projecteigen resources (geen stempel)
  tellen nooit mee — hun dubbelbezetting is per definitie een binnen-project-vraag en die
  beantwoordt het bestaande histogram al.
- Poolitems zonder enige boeking in de open documenten krijgen géén rij — het overzicht toont
  inzet, geen catalogus (die staat in de Bibliotheekweergave).

### 4.3b Stale planning v2: efemeer doorrekenen (besluit eigenaar 2026-08-14, vervangt 4.3-beleid)

De eigenaar heeft na oplevering van v1 besloten dat het overzicht stale documenten **zelf
doorrekent** in plaats van ze uit te sluiten: "je zou toch gewoon alles kunnen berekenen voor
je dat overzicht geeft" — dat kost weinig rekentijd en bespaart de gebruiker de
activeer-en-F5-rondgang. De eerdere aanname dat dit cross-document solve zou vergen klopt
niet: de solver draait al headless buiten de store (de benchmark doet `new CPMSolver(...)
.solve()` + `applyCpmResult` op plain data, zonder Immer of de actieve store).

- **Efemeer, nooit terugschrijvend:** bij het opbouwen van de aggregatie wordt elk document
  met `scheduleStale: true` (inclusief het actieve) in het geheugen doorgerekend op een
  kloon van zijn taken; de payload/store blijft onaangeraakt en het document zelf toont zijn
  oude datums tot de gebruiker echt F5 drukt.
- **Pariteit by construction:** de solve-kern van `runCPM` (solver-opties, statusdatum,
  geavanceerde-CPM-nabewerking) wordt geëxtraheerd naar één pure functie die zowel `runCPM`
  als het overzicht aanroepen — geen tweede implementatie die kan divergeren. Dit is meteen
  prestatie-audit-item A3/M3 (solver injecteerbaar, buiten de Immer-produce); de bestaande
  planningssuite is het vangnet voor de extractie.
- **De ⚠ verandert van betekenis:** een doorgerekend-stale document telt gewoon mee
  (`counted: true`) maar draagt een informatieve markering — "dit document zelf is nog niet
  doorgerekend; het overzicht rekent alvast met de actuele invoer (F5 in het document om het
  daar ook te zien)". De banner idem. Beide teksten verwijzen ook naar de bestaande instelling
  **"Automatisch berekenen"** (`ui.autoCalcCPM`): staat die aan, dan herrekent een document
  zichzelf zodra het verouderd raakt (ook direct bij activeren) en verdwijnt de markering
  vanzelf. De handmatige modus blijft de default — kernontwerp "manual, not reactive",
  relevant voor geïmporteerde planningen (issue #63).
- **Vangnet:** faalt de efemere solve (bijv. een relatiecyclus of een solverfout), dan valt
  dát document terug op het 4.3-gedrag hieronder: zichtbaar maar niet meegeteld, met de
  niet-meegeteld-⚠. De fantoomrij-guards blijven onverkort gelden.
- **Cache:** de efemere solve valt onder dezelfde per-payload-cache als de load (§7) —
  één keer per payload-versie, niet per toetsaanslag.

**Terugschrijven mét "Automatisch berekenen" (besluit eigenaar 2026-08-14, tweede ronde).**
De eigenaar vond het weggooien van de efemere uitkomst onlogisch ("waarom zou je dan alsnog
op F5 moeten drukken als het stiekem al berekend is") en heeft gekozen: staat
`ui.autoCalcCPM` **aan**, dan worden verouderde documenten bij het openen van het overzicht
**echt bijgewerkt** in plaats van alleen efemeer doorgerekend — het actieve document via het
bestaande `useAutoCalcCPM`-pad (`runCPM`), slapende documenten via een nieuwe store-actie die
per stale payload de gedeelde solve-kern draait en de uitkomst terugschrijft
(taken/`cpmResult`/`scheduleStale: false`; `resourceLoadResult: null` — die wordt bij
activering toch onvoorwaardelijk herrekend). Semantiek spiegelt `runCPM`: geen
undo-snapshot, `isDirty` ongemoeid. Faalt de solve (cyclus), dan blijft de payload
onaangeraakt en geldt het vangnet. Staat de instelling **uit**, dan blijft alles zoals
hierboven: efemeer, nooit terugschrijvend — een leesvenster verandert de documenten van een
handmatige rekenaar nooit (issue #63). De ⚠-markering verschijnt dus alleen nog in de
handmatige modus.

### 4.3 Stale planning zonder efemere solve: zichtbaar maar NIET meegeteld (vangnetgedrag; herzien na critreview 2026-08-14)

Scheduling is handmatig (`runCPM` draait niet reactief) en B1b mag geen cross-document solve
doen (§2 punt 4). De taakdatums in een payload (`task.time.earlyStart`/`earlyFinish`) zijn dus
de **laatst doorgerekende** datums; `payload.scheduleStale` zegt of er sindsdien gemuteerd is
(en staat na crash-herstel altijd op `true` voor niet-actieve documenten — zie
`payloadFromInput` in `src/state/documentContract.ts`).

**Waarom stale cijfers niet meetellen mogen.** De eerdere versie van deze paragraaf ("telt
gewoon mee op zijn laatst bekende datums") beloofde precisie die de engine niet levert:
`computeResourceLoad` verdeelt over `task.time.scheduleDuration` maar mapt op
`earlyStart..earlyFinish`, afgekapt op `min(days.length, workDayIsos.length)`
(`ResourceLoad.ts`). Bij een stale document lopen duur en datums per definitie uiteen; het
resultaat is dan noch de oude noch de nieuwe planning, en de fout valt afhankelijk van de
curve willekeurig te hoog óf te laag uit — de critreview mat een geval waarin zeven echte
conflictdagen als groen verschenen. "Verkeerd groen" is voor dit overzicht onaanvaardbaar.

**Beleid (besluit):** een stale document wordt **niet meegeteld** in sommen, pieken en
`conflictDays`, maar blijft **zichtbaar**: elke boeking (= het document heeft toewijzingen op
aan dit poolitem gestempelde resources) verschijnt als ongenummerde subregel met
⚠ `t('resource.occupancy.staleDoc')` ("telt niet mee — activeer dit document en druk F5"), en
boven de tabel staat de banner zodra `anyStale` waar is. Zo verdwijnt er niets stil — de
gebruiker ziet dát er boekingen zijn en wat hij moet doen om ze mee te laten tellen — en er
worden geen verzonnen getallen bij het bedrijfsbeeld opgeteld. Stil herrekenen kan niet zonder
de solver op een niet-actieve payload los te laten; de gebruiker houdt de regie: document
activeren, F5, terugschakelen.

In de kern: een booking is `counted` wanneer het document niet stale is én de berekende
belasting op minstens één dag > 0 is. Stale documenten met toewijzingen op het item leveren
een booking zonder cijfers (`dailyLoad: {}`, `firstDay`/`lastDay: null`, `peak: 0`,
`scheduleStale: true`). Niet-stale documenten zonder enige belasting > 0 (bijv. een toewijzing
met 0 eenheden, of een document zonder doorgerekende datums dat tóch niet stale gemarkeerd
staat) leveren **géén** booking — dat voorkomt de fantoomrijen uit de critreview. Een rij
bestaat alleen als er minstens één booking (geteld of ongeteld) is; `anyStale` staat alleen
wanneer een ongetelde booking daadwerkelijk in het overzicht voorkomt.

Voor B1c is dit een harde voorwaarde: nivelleren tegen restcapaciteit mag uitsluitend op
getelde (niet-stale) cijfers rusten — zie §12.

### 4.4 Aanlevering vanuit de store

`ResourceOccupancyView` haalt de invoer met de bestaande
`getOpenDocumentPayloads()` (`documentSlice`) — die levert het actieve document via
`capturePayload` (referenties, geen deep clone) en de rest per referentie uit de registry — en
mapt per document naar `OccupancyDocInput` (titel via de bestaande `documentTitle`-helper +
`untitledOrdinals`, zoals de tabbladen). Geen nieuwe store-actie, geen nieuw store-veld: de
aggregatie is een leesberekening in de weergavelaag over bestaande state.

**Randvoorwaarde (critreview):** `getOpenDocumentPayloads()` bouwt bij élke aanroep een verse
array met een vers actieve-document-object — als Zustand-selector is hij dus onbruikbaar
(scheurt of loopt oneindig). Aanroepen **binnen** de `useMemo`, nooit als
`useAppStore(s => s.getOpenDocumentPayloads())`; abonneer op de §7-afhankelijkheden. Dit is
dezelfde val die `useDocumentCards` al bewust ontwijkt.

## 5. Wat de weergave toont (vraag c)

**Gekozen vorm (besluit): een tabel met uitklapbare per-document-regels — géén tijdlijn-canvas
in v1.** Issue #19 vraagt "zien wáár welke resource verpland is om dubbelbezetting te zien"; dat
is een vraag om feiten (welke projecten, welke periode, waar knelt het), niet om een grafiek.
Een canvas-tijdlijn over N documenten is de duurste vorm (renderer-werk, timescale, hit-testing)
en staat op de bewust-later-lijst (§12). De goedkoopste vorm die de vraag écht beantwoordt:

- **Hoofdrij per geboekt poolitem**: naam, aantal documenten
  (`t('resource.occupancy.docCount', { count })`), totale periode (min `firstDay` … max
  `lastDay`), piek-som vs. capaciteit ("3,0 / 2,0"), en — alleen bij conflict — een rode badge
  `t('resource.occupancy.conflictDays', { count })` met als tooltip/subregel de eerste
  conflictdatums (max. ~5, dan "…").
- **Uitklap (chevron, zelfde patroon als de `availabilitySteps`-subrij in `ResourcePanel`)**:
  één subregel per document — documenttitel, periode (`firstDay`–`lastDay`), piek in dat
  document, en de ⚠-markering bij `scheduleStale`. Zo is direct zichtbaar wélke projecten de
  resource claimen en wie de overlap veroorzaakt. Ongetelde (stale) boekingen tonen "—" op de
  cijferplekken (§4.3); een hoofdrij met uitsluitend ongetelde boekingen toont "—" voor
  periode en piek en krijgt nooit een conflictbadge.
- **Sortering**: rijen met conflicten bovenaan (meeste conflictdagen eerst), daarna alfabetisch
  op poolnaam.
- **Permanente voetnoot** onder de tabel: `t('resource.occupancy.machineOnly')` — "dit overzicht
  ziet alleen documenten die op deze computer geopend zijn" (scope-grens 2, vooraf zichtbaar in
  het product zelf, niet alleen in de docs).
- **Lege toestand**: `t('resource.occupancy.empty')` wanneer geen enkel open document een
  bibliotheekresource van deze pool boekt.

Bewuste eigenaardigheid, gedocumenteerd in §9: een variant-duplicaat (`duplicateDocument`)
telt als volwaardig extra document en verdubbelt dus de boekingen — het ís een geopend document.
Wie varianten vergelijkt moet ze sluiten of negeren; het overzicht filtert er niet stil op.

### 5a. Histogram per geselecteerd poolitem (v1-aanvulling — besluit eigenaar 2026-08-14)

De eigenaar heeft bij review besloten dat een histogram wél in v1 hoort: het is de natuurlijke
vorm om overbezetting in de tijd te zien, zoals het bestaande histogram dat binnen een project al
is. De vorm blijft goedkoop en raakt de canvas-renderer niet:

- **Selectie van een hoofdrij** toont onder (of naast) de tabel een histogram voor dát poolitem:
  per ISO-dag de **gestapelde** bijdrage per document (kleurtoewijzing per document, **uniek
  binnen het overzicht** — op volgorde van eerste verschijnen, niet op id-hash, zodat twee
  documenten nooit dezelfde kleur delen zolang het palet reikt (correctie eigenaar
  2026-08-14); legenda = de documenttitels uit de uitklap), de **capaciteitslijn** van het poolitem
  (`maxUnitsOn` per dag, dus `availabilitySteps`-knikken zichtbaar) eroverheen, en dagen waar de
  som boven de lijn uitkomt **rood** gemarkeerd — dezelfde conflictdefinitie als §6, geen tweede
  berekening.
- **Techniek:** SVG in de DOM binnen `ResourceOccupancyView`, niet de canvas-`HistogramRenderer`
  — die hangt aan de tijdschaal van het actieve project; hem losweken is het open P7/M5-werk
  (TimeAxis/ThemePalette) en hoort niet in B1b. De databron is het `dailyLoad`-veld per
  `OccupancyDocBooking` (§4.1); de UI sommeert zelf, uitsluitend over `counted` boekingen (§4.3).
- **X-as-domein en begrenzing (critreview bevinding 5):** het domein is de vereniging van de
  gételde geboekte dagen, **met gatcompressie**: een aaneengesloten gat van meer dan 30
  kalenderdagen zonder enige boeking wordt ingeklapt tot één smalle visuele breukmarkering
  ("⋯"), zodat twee documenten die jaren uit elkaar liggen geen duizenden lege kolommen
  produceren. Binnen de getoonde segmenten blijft de granulariteit één dag; wordt het geheel
  breder dan het paneel, dan scrollt de chart horizontaal in zijn eigen container. De
  capaciteitslijn wordt per getoond segment getekend en de padopbouw hoort **binnen** de memo,
  niet in de render-body. (De zusterfunctie `computeHistogramReport` kreeg eerder om precies
  deze reden `from`/`to`/`bucket` — onbegrensde dag-granulariteit is hier al één keer eerder
  misgegaan.)
- **Schrijfrichting:** de chart is geforceerd LTR, óók onder `ar`/`fa` — een tijdas spiegelt
  in dit product nergens (de Gantt-canvas evenmin); de omringende tabel en legenda volgen
  gewoon de documentrichting.
- **Zonder selectie**: hint `t('resource.occupancy.selectHint')` ("Selecteer een resource om het
  histogram te zien."). Een rij met uitsluitend ongetelde (stale) boekingen toont geen chart
  maar de stale-uitleg.
- Strikt binnen één bibliotheek — het besluit van 2026-07-20 tegen bedrijfsoverstijgende
  histogrammen blijft onverkort staan; dit is een per-poolitem-weergave binnen de gekozen pool.

## 6. Wanneer is een resource dubbel geboekt? (vraag d)

**Definitie (besluit):** poolitem *r* is dubbel geboekt op ISO-dag *d* wanneer

> Σ over alle meetellende open documenten van de dagbelasting op *d* van hun aan *r* gestempelde
> resource(s) > `maxUnitsOn(poolItem, d)`

met `maxUnitsOn` uit `src/engine/scheduler/ResourceLoad.ts` — letterlijk dezelfde
capaciteitsdefinitie (vlakke `maxUnits` + effective-dated `availabilitySteps`) als histogram en
nivelleerder, maar toegepast op het **poolitem**, niet op een projectkopie.

Onderbouwing van die keuze: `maxUnits`/`availabilitySteps` op een projectkopie zijn
*projectinzet* ("volgt de bibliotheek NIET", `docs/library.md`) — hoeveel dít project claimt.
De vraag van B1b is een bedrijfsvraag: is er méér geboekt dan het bedrijf heeft. Daar is het
poolitem de enige waarheid. Twee projecten die elk keurig binnen hun eigen `maxUnits = 2`
blijven zijn samen alsnog dubbel geboekt als het bedrijf maar 2 krachten heeft.

Twee bewuste vereenvoudigingen **(besluit)**:

1. **Geen kalendercheck op de capaciteit.** De belasting landt per document al uitsluitend op
   werkdagen van dát document (zo werkt `computeResourceLoad`); een extra pool-kalendercheck
   zou dagen met echte boekingen als capaciteit-0 kunnen bestempelen en valse conflicten tonen
   wanneer projectkalenders en poolkalender uiteenlopen. "Werkt de resource die dag wel" blijft
   de per-project-vraag van het bestaande histogram. **Keerzijde, even bewust aanvaard:** bij
   documenten met uiteenlopende werkweken kan een conflictdag landen op een dag waarop het
   bedrijf zelf niet werkt — het overzicht velt geen kalenderoordeel over de som, geen van
   beide richtingen (critreview bevinding 9).
2. **Binnen-document-overbezetting telt gewoon mee in de som.** Eén document dat in z'n eentje
   boven de poolcapaciteit boekt, verschijnt hier dus ook als conflict. Dat is juist: de vraag
   is bedrijfsbreed, en het uitklapniveau (§5) laat meteen zien dat er maar één veroorzaker is.

## 7. Prestaties (vraag e)

- **Lazy, niet reactief (besluit):** `ResourceOccupancyView` mount alleen bij
  `resourcesView === 'occupancy'`; er wordt nergens anders gerekend, geen store-subscription
  die buiten de weergave om aggregeert, geen achtergrondwerk.
- **Memoization:** één `useMemo` in de component rond
  `computeLibraryOccupancy`, met als afhankelijkheden de identiteiten van `s.documents`,
  `s.pools[cid]`, en de top-level velden van het actieve document
  (`s.resources`, `s.assignments`, `s.tasks`, `s.calendar`, `s.calendars`, `s.scheduleStale`,
  **plus `s.project` en `s.filePath`** — de titelafleiding leest die twee, dus zonder deze deps
  bevriezen de documenttitels na hernoemen/Opslaan-als; critreview bevinding 3, zelfde
  dep-lijst als `useDocumentCards`). Immer geeft nieuwe referenties bij elke mutatie, dus dit
  is correct voor velden waarop daadwerkelijk geabonneerd is; slapende payloads wijzigen
  alleen op de vier verversingsgrenzen en die vervangen de payload-referentie.
- **Per-payload-cache (critreview bevinding 4):** zolang de weergave openstaat, is elke
  taak-/toewijzingsbewerking in het actieve document een memo-invalidatie — het naastgelegen
  takenraster blijft immers bedienbaar. Zónder maatregel herrekent elke toetsaanslag de load
  van álle N documenten. Daarom cachet de component de per-document-load in een `WeakMap`
  gesleuteld op payload-referentie: slapende payloads zijn referentiestabiel en komen uit de
  cache, alleen het actieve document rekent opnieuw — daarmee is de per-bewerking-kost gelijk
  aan die van het bestaande projecthistogram, ongeacht N. (De eerdere raming "zelfde
  ordegrootte als `switchDocument`" gold per documentwissel, niet per toetsaanslag; de trigger
  is bewerkfrequentie, niet documentaantal.)
- **Kostenraming:** `computeResourceLoad` is O(assignments × taakduur) per document; N is het
  aantal open tabbladen (praktisch ≤ ~10). Met de per-payload-cache is de steady-state-kost
  per bewerking die van één document. De §5a-chart rendert alleen voor de geselecteerde rij;
  zijn padopbouw en segmentindeling zitten in de memo (§5a), niet in de render-body.

## 8. i18n (vraag f)

Nieuwe sleutels in `common`, onder het bestaande `resource.*`-blok, in alle veertien locales
(`verify:i18n` dwingt volledigheid af, CLDR-pluralcategorieën incl. — dus géén `_one` voor
`zh`/`ja`/`ko`, wél `_few`/`_many` voor `pl` en `_many` voor `es`/`fr`/`it`/`pt`):

- `resource.occupancyView` — "Bezetting" (derde stand van de schakelaar)
- `resource.occupancy.empty` — "Geen bibliotheekresources geboekt in de geopende documenten."
- `resource.occupancy.machineOnly` — "Dit overzicht ziet alleen de documenten die in dit
  programma geopend zijn." (herzien 2026-08-14: "in dit programma", niet "op deze computer" —
  een ander venster of andere applicatie op dezelfde machine telt niet mee)
- `resource.occupancy.staleDoc` — "Telt niet mee: planning niet doorgerekend — activeer dit document en druk F5."
  (alleen nog het **vangnetpad** van §4.3: efemere solve mislukt/afwezig)
- `resource.occupancy.staleBanner` — "Minstens één document is niet doorgerekend en telt niet mee in de bezetting."
  (idem: alleen wanneer er een ongetelde booking in het overzicht staat)
- `resource.occupancy.staleComputedDoc` — "Alvast doorgerekend voor dit overzicht — het document
  zelf toont oudere datums tot je daar F5 drukt." (informatieve ⚠ bij een gételde stale-booking, §4.3b)
- `resource.occupancy.staleComputedBanner` — "Gewijzigde documenten zijn voor dit overzicht
  alvast doorgerekend; druk F5 in het document om het daar ook te zien." (banner wanneer er
  wél stale documenten zijn maar allemaal geteld)
- `resource.occupancy.docCount_one` / `_other` — "{{count}} document" / "{{count}} documenten"
- `resource.occupancy.conflictDays_one` / `_other` — "{{count}} dag dubbel geboekt" / "{{count}} dagen dubbel geboekt"
- `resource.occupancy.period` / `resource.occupancy.peak` / `resource.occupancy.capacity` /
  `resource.occupancy.documents` — kolomkoppen
- `resource.occupancy.moreDays` — "… en {{count}} meer" (afkap van de conflictdatum-lijst; plural)
- `resource.occupancy.selectHint` — "Selecteer een resource om het histogram te zien." (§5a)

Alle teksten via `t(...)`; niets hardgecodeerd (ook de "/" tussen piek en capaciteit is opmaak,
geen tekst).

## 9. Documentatie (vraag g)

- **Nieuw artikel `gids-bezettingsoverzicht.md`** in `public/docs/nl/` én `public/docs/en/`
  (minimum dat `verify:docs` hard eist; de overige twaalf talen volgen in de maandelijkse
  vertaalronde), plus een manifest-entry in `public/docs/manifest.json` met `layer: "gidsen"` en
  titels in veertien talen.
- Inhoud binnen de miniMarkdown-subset (géén tabellen, géén blockquotes, géén h4): koppen,
  paragrafen en enkelvoudige lijsten. Kern: wat het overzicht toont, hoe dubbelbezetting
  gedefinieerd is (som over documenten vs. bedrijfscapaciteit van het poolitem), de
  ⚠-stale-markering en wat eraan te doen (F5), en — prominent, eigen kop — de beperking
  "alleen deze machine" met een `docs://gids-resourcebibliotheken`-verwijzing naar de bekende
  beperkingen. Ook de variant-eigenaardigheid uit §5 hoort hier.
- `gids-resourcebibliotheken.md` (nl+en) krijgt één alinea + `docs://gids-bezettingsoverzicht`-
  link in de sectie over meerdere projecten.
- `docs/library.md` ("Bekende beperkingen" punt 2) wordt bijgewerkt: het bezettingsoverzicht
  bestaat nu, de machine-grens blijft er letterlijk in staan.

## 10. Tests (vraag h)

De aggregatiekern is puur en dus volledig headless testbaar; hij hoort in de bestaande
bibliotheeksuite. Model: `tests/library/run.sh` bundelt elke `check-*.ts` met esbuild
(alias `@` → `src`), draait op Node, exitcode is de poort.

**Nieuw: `tests/library/check-occupancy.ts`**, geregistreerd als extra `run_check`-regel in
`tests/library/run.sh` en gedekt door `tsconfig.check.json`. Cases (fixtures als handgebouwde
`OccupancyDocInput`-arrays + een minimale `CompanyPool`):

1. Twee documenten boeken hetzelfde poolitem met overlappende dagen; som > `maxUnits` ⇒ de
   juiste `conflictDays`, juiste `totalPeak`/`capacityAtPeak`, beide documenten in `docs`.
2. Zelfde overlap maar som ≤ capaciteit ⇒ géén conflictdagen (grensgeval som == capaciteit is
   géén conflict — `>`, niet `≥`).
3. `availabilitySteps` op het poolitem: capaciteit daalt halverwege ⇒ conflict alléén ná de stap
   (bewijst `maxUnitsOn`-op-poolitem).
4. Stempel van een ándere bibliotheek en een document met `companyId: null` ⇒ dragen niets bij.
5. Wees (stempel wijst naar verwijderd poolitem) ⇒ geen rij.
6. Twee poolitems met identieke naam maar verschillende id's ⇒ blijven twee losse rijen
   (bewijst id-matching, nooit naam).
7. `scheduleStale`-document ⇒ telt NIET mee in sommen/`conflictDays` (§4.3 herzien), maar de
   booking is zichtbaar (`counted: false`, geen cijfers) én `anyStale` staat.
8. Binnen-document-overbezetting in één document ⇒ verschijnt als conflict (§6 punt 2).
9. Curve-consistentie: een `FRONT_LOADED`-toewijzing levert per dag exact dezelfde bijdrage als
   `computeResourceLoad` voor dat document alleen (som-invariant).
10. `dailyLoad`-consistentie (§5a): de som van `dailyLoad` over documenten per dag matcht de
    som-invariant van case 9, en alle dagen in `dailyLoad` vallen binnen `firstDay`..`lastDay`
    van die booking.
11. Stale-uitsluiting (vangnetgedrag zonder solve-injectie) maskeert geen conflict
    verkeerd-groen: een stale document naast een niet-stale dat in z'n eentje boven
    capaciteit boekt ⇒ conflict blijft staan; en een som die alléén mét het stale document
    boven capaciteit zou komen ⇒ géén conflictdag, wél `anyStale` + ongetelde booking.
12. Fantoomrij-triggers (critreview bevinding 2): een niet-stale toewijzing met
    `unitsPerDay: 0` ⇒ geen booking en (zonder andere boekingen) geen rij; een niet-stale
    document zonder doorgerekende datums (`earlyStart: ''`) ⇒ idem.
13. Stale-detectie: een document met toewijzingen op het poolitem en `scheduleStale: true`
    maar zónder bruikbare datums ⇒ tóch een zichtbare ongetelde booking (niets verdwijnt
    stil) — geldt in het vangnetpad (geen of falende solve-injectie).
14. Efemere solve (§4.3b): een stale document mét solve-injectie ⇒ `counted: true`, cijfers
    exact gelijk aan wat dezelfde invoer ná runCPM zou geven (pariteits-assert via de
    gedeelde solve-kern), `scheduleStale` blijft true (voor de informatieve ⚠).
15. Efemere solve faalt (injectie gooit/geeft null, bijv. cyclus) ⇒ terugval op case 13-
    gedrag: zichtbaar, ongeteld, `anyStale`.
16. De efemere solve muteert zijn invoer niet: payload-taken zijn ná de aanroep byte-gelijk
    aan ervoor.

De i18n-sleutels worden vanzelf bewaakt door `npm run verify:i18n` (pluralcategorieën) en het
artikel door `npm run verify:docs`. De UI-kant (derde schakelstand, uitklap) is Tier-1
zelftestbaar via `window.__OPS__` tegen de browser-dev-build (store-asserties op
`ui.resourcesView`), maar krijgt geen eigen geautomatiseerde poort — conform de bestaande lijn
dat gedragspoorten headless zijn.

## 11. Buiten scope (bewust)

- **Schrijfacties vanuit het overzicht** — geen nivellering, geen toewijzingen bewerken, geen
  "los dit conflict op"-knop. Leesvenster.
- **Sync tussen machines** — apart vervolgproject (zie `docs/library.md`); B1b documenteert de
  machine-grens alleen zichtbaar.
- **B2-scenario's** — overlays/varianten-vergelijking staan hier volledig los van.
- **Bedrijfsoverstijgende overzichten** — gesloten besluit (§2 punt 1).
- **Opgeslagen-maar-niet-geopende bestanden meetellen** — zou een bestandsindex/scan vergen;
  het overzicht gaat expliciet over *open* documenten.
- **Cross-document solve / `createAppStore()`-factory** — item 41 blijft achteraan de roadmap.

## 12. Bewust later

- ~~Tijdlijn-/histogramweergave~~ — **naar v1 gehaald als §5a** (besluit eigenaar 2026-08-14),
  in de vorm van een SVG-histogram per geselecteerd poolitem. Wat wél later blijft: een
  canvas-tijdlijn over álle poolitems tegelijk met de volledige Gantt-tijdschaal.
- **B1c — nivelleren tegen restcapaciteit** (besluit eigenaar 2026-08-14): vanuit een
  conflictregel het veroorzakende document activeren en dáár nivelleren tegen de
  bedrijfscapaciteit mín wat de andere open documenten die dag boeken. Krijgt een eigen
  ontwerpdoc ná oplevering van B1b; open ontwerpvragen: wie wijkt, per-dag-capaciteitsprofiel
  de nivelleerder in, omgang met verouderde planningen. **Harde voorwaarde uit de critreview:**
  restcapaciteit mag uitsluitend uit gételde (niet-stale) boekingen worden afgeleid — nivelleren
  tegen cijfers van een stale document is nivelleren tegen een getal dat nergens vandaan komt
  (§4.3). Echt simultaan cross-document nivelleren blijft aan item 41 (`createAppStore()`)
  hangen.
- **Bibliotheekkiezer voor losse documenten** zodat het overzicht ook zonder gekoppeld actief
  document te openen is.
- **Per-docId-memoisatie** van de per-document-load (payload-referentie als sleutel) — alleen
  nodig bij extreem veel open documenten.
- **MCP-leestool** (`planner_get_library_occupancy`) bovenop dezelfde pure kern — triviaal
  additief zodra iemand het vraagt.
- **Doorspring-actie** ("activeer dit document en selecteer de resource") vanuit een
  uitklapregel — handig, maar raakt documentwissel-choreografie en is geen leesactie meer.

## 13. Beslispunten voor de eigenaar

Geen. De drie punten die eerder open leken zijn hierboven onderbouwd gekozen: plaats
(derde weergave in de Resources-tab, §3), capaciteitsbron (het poolitem via `maxUnitsOn`, §6)
en het stale-beleid (meetellen met zichtbare markering, §4.3). Bezwaar tegen één van die
keuzes hoort in een reviewronde op dit document.
