# Onderhoudbaarheidsrapport — architectuur & state management
**Open Planner Studio**, commit-stand v2026.7.12 · deelgebied: `src/state/`, `src/engine/`, store-consumenten

## 0. Totaalbeeld

De state-laag is **ver bovengemiddeld doordacht**. Er is een expliciet *documentcontract* (`src/state/documentContract.ts`) met compile-time volledigheidschecks, een gedeeld mutatie-ritueel (`src/state/transaction.ts`) en een headless regressiesuite die het contract met échte store-code test (`tests/planning/check-document-contract.ts`, 612 regels). Dat is zeldzaam. De resterende risico's zitten daarom niet in "rommelige code" maar in **contracten die niet door de compiler worden afgedwongen** en in **onbegrensde groei** (undo-geheugen, slice-oppervlak).

Kerncijfers:

| Meting | Waarde |
|---|---|
| `src/state/` totaal | **4.194 regels** over 20 bestanden (21% commentaar) |
| Top-level `AppState`-keys | **154** (state + acties) over 13 slices |
| Grootste slices | `taskSlice.ts` **887**, `projectSlice.ts` **436**, `fileSlice.ts` **405** |
| `src/engine/` totaal | **8.067 regels**; `GanttRenderer.ts` **1.655**, `CPMSolver.ts` **1.122** |
| `beginUndoable`-aanroepen | 56 (handmatig gepaard met 56× `finishMutation`) |
| Handmatige `recomputeViewRows()` | 54 in slices + 1 in `App.tsx` |
| `useAppStore.getState()` buiten de store | 87, waarvan 17 in `extensionApi.ts`, 10 in `GanttCanvas.tsx` |
| Runtime-circulaire imports | **2** (beide rond `projectSlice`) |
| Niet-geïmporteerde bestanden in `src/` | 2 |

---

## A. Bevindingen

### 1. Er bestaat geen enkele compile-time slice-grens — `AppSlice<T>` typt elke slice tegen de héle `AppState`
**Ernst: middel-hoog**

`src/state/slices/types.ts:10` definieert `AppSlice<T> = StateCreator<AppState, …, T>`. Dat is een bewuste keuze (gedocumenteerd in `appStore.ts:23-27`) en maakt cross-slice acties mogelijk, maar het gevolg is dat **iedere slice ongehinderd de state van iedere andere slice mag schrijven**. Gemeten schrijfacties over sliceslijnen heen:

| Slice | Schrijft state van een andere slice |
|---|---|
| `fileSlice.ts` | `s.filePath`/`s.fileHandle`/`s.isDirty` (:196,208-210,228-230), `s.tasks` (:314), `s.ui.hourDataNotice` (:128) |
| `projectSlice.ts` | `s.tasks` (:261), `s.resources` (:262), `s.baselines` (:264), `s.calendars[idx]` (:206) |
| `resourceSlice.ts` | `s.calendar` (:260), `s.project.calendarId` (:259,285,287), `t.calendarId` op taken (:252-254, 280-281), `task.resourceIds` (:94-97) |
| `structureSlice.ts` | `s.view.group`/`s.view.sort` (:70-71, 162-163), `task.activityCodes`/`task.customFields` (:66-68, 107-109, 159-161) |
| `taskSlice.ts` | `s.sequences` (:300, 724, 806), `s.assignments` (:303, 736) |
| `scheduleSlice.ts` | `task.time.*` op alle taken (:78-161) |
| `uiSlice.ts` | `s.view.zoom` (:105), leest `s.tasks` (:135,143) |

Het bestandsnaam-schema suggereert dus modulariteit die er in werkelijkheid niet is: `AppState` is één god-object van 154 keys en de "slices" zijn feitelijk alleen een bestandsindeling. Een nieuwe ontwikkelaar die `resourceSlice.ts` opent, ziet niet dat `removeCalendar` de projectkalender-cache en taak-verwijzingen herschrijft.

**Voorstel** — de intersectie-typing hoeft niet weg (dat zou de cross-slice acties breken), maar maak de koppeling *zichtbaar en gecontroleerd*:
1. Introduceer een dun `AppSliceDeps<T, Extra>`-alias waarmee een slice expliciet declareert welke *vreemde* velden hij mag zien (`AppSlice<ResourceSlice, Pick<AppState,'tasks'|'project'|'calendar'>>`). Al is dat alleen documentatie op typeniveau, het maakt de fan-out reviewbaar.
2. Voeg bovenaan elke slice een korte "raakt ook"-blok toe (2 regels) — nu staat die kennis alleen verspreid in inline-commentaar.
3. Overweeg de echte grensovertreders te verplaatsen naar duidelijk benoemde cross-slice-modules, analoog aan het bestaande `syncProjectCalendar.ts`: bijv. `cascadeDeleteTask.ts` (taken+relaties+toewijzingen+selectie) en `cascadeRemoveCalendar.ts`.

---

### 2. Het documentcontract is gesloten aan de payload-kant, maar niet aan de state-kant
**Ernst: middel**

Dit is de sterkste plek in de codebase én tegelijk waar de resterende val zit. `DOCUMENT_FIELDS` (`documentContract.ts:146-180`) is één canonieke lijst; `capturePayload`/`hydratePayload`/`freshPayload` lopen er key-gedreven overheen (:203-227), en er is een compile-time check dat elke `DocumentPayload`-key een descriptor heeft:

```ts
// documentContract.ts:185-188
type MissingFields = Exclude<keyof DocumentPayload, CoveredKey>;
const _assertAllFieldsCovered: MissingFields extends never ? true : [...] = true;
```

`snapshot.ts:53-60` doet hetzelfde in twee richtingen tussen de `snapshot`-rol en de `Snapshot`-`Pick<>`. `tests/planning/check-document-contract.ts` test het geheel op echte store-acties en itereert zelf over `DOCUMENT_FIELDS`, zodat nieuwe velden automatisch meegetest worden. **Dit is precies goed gedaan.**

Het gat: er is **geen enkele check die een nieuw *top-level state-veld* in een slice verplicht koppelt aan `DocumentPayload`**. Wie morgen `notes: string[]` aan `projectSlice` toevoegt, krijgt een veld dat stilzwijgend *app-globaal* is — het lekt tussen documenten, staat niet in de undo-snapshot en wordt niet gereset door `newProject()`. De compiler zwijgt, de suite zwijgt.

Ik heb alle 154 keys nagelopen: **op dit moment is de indeling correct en volledig.** De enige per-document afgeleide waarde buiten het contract is `viewRows` (`viewSlice.ts:16`), bewust, en elk swap-pad roept `recomputeViewRows()` aan (`documentSlice.ts:90,113,133,157,195`).

**Voorstel** — draai de check om zodat hij *dwingend* is: definieer een expliciete `AppGlobalKey`-lijst en een type-level assert dat elke niet-functie-key van `AppState` óf in `DocumentPayload` óf in `AppGlobalKey` zit (`_assertNoUnclassifiedState`). Dit dwingt de auteur van elk nieuw veld tot een **bewuste** keuze in plaats van een stille default. Kosten: ~10 regels; dekt de belangrijkste bugklasse die dit hele ontwerp probeert uit te bannen.

---

### 3. Twee echte runtime-circulaire imports rond `projectSlice`, die alleen door function-hoisting werken
**Ernst: middel**

Import-graafanalyse (waarde-imports, `import type` uitgesloten):

```
src/state/slices/projectSlice.ts → transaction.ts → snapshot.ts → documentContract.ts → projectSlice.ts
src/state/slices/projectSlice.ts → transaction.ts → snapshot.ts → projectSlice.ts
```

Oorzaak: `documentContract.ts:14` en `snapshot.ts:6` importeren **de waarde** `createDefaultProject` uit `projectSlice`, terwijl `projectSlice.ts:19-21` `beginUndoable`/`freshPayload`/`hydratePayload` terug-importeert. `DOCUMENT_FIELDS` is een module-level `const` die op evaluatietijd `createDefaultProject` als `fresh`-callback vastlegt (`documentContract.ts:150`).

Dit werkt vandaag **uitsluitend** omdat `createDefaultProject` (`projectSlice.ts:151`) en `createDefaultView` (`viewSlice.ts:49`) *function declarations* zijn en dus gehoist worden. Verander één daarvan naar `export const createDefaultProject = () => …` — een volstrekt onschuldig ogende stijlwijziging — en de app crasht bij module-init met een TDZ-`ReferenceError`, mogelijk pas in de productiebundel (andere modulevolgorde dan Vite dev).

**Voorstel**: haal de default-fabrieken uit de slices naar een bladmodule zonder afhankelijkheden, bijv. `src/state/defaults.ts` met `createDefaultProject`/`createDefaultView`/`createDefaultUI`. Slices en `documentContract`/`snapshot` importeren daaruit; de cyclus verdwijnt volledig. Voeg daarnaast `madge --circular src` (of `dpdm`) toe als CI-poort — er is nu geen enkele automatische bewaking op cycli.

---

### 4. De undo-stack is onbegrensd en kloneert bij élke bewerking het volledige project
**Ernst: hoog**

`createSnapshot` (`snapshot.ts:68-76`) deep-cloont via `JSON.parse(JSON.stringify(…))` tien collecties: `project, calendar, tasks, sequences, resources, assignments, calendars, activityCodeTypes, customFieldDefs, baselines`. Er is **nergens een cap**: `grep -rn "undoStack" src` levert alleen `push`/`pop`/`length`, geen `slice(-N)`, geen `MAX_UNDO`.

Erger: `undoStack`/`redoStack` zitten *in* het documentcontract (`documentContract.ts:175-176`), dus elk **inactief geopend document** houdt zijn volledige geschiedenis in de registry vast (`documentSlice.ts:36-38`). Het geheugen schaalt als `bewerkingen × projectgrootte × open documenten`.

Orde van grootte (JSON-bytes van een representatieve `Task` gemeten op 542 B): ~2,6 MB JSON per snapshot bij 5.000 taken, in-heap grofweg 5-7 MB. De bestaande audit `docs/superpowers/prestatie-modulariteit-audit.md` (pakket **B3**) meet dit onafhankelijk op **4,95 MB per snapshot en 248 MB na 50 bewerkingen** — dat pakket is nog **niet** geland (`beginUndoable` is wel al geoptimaliseerd via `original(s)`, pakket B1, `transaction.ts:84`, maar zonder cap of copy-on-write). Bij vier open tabbladen is dat in de orde van een GB.

Bovendien kloont een pure hernoem-actie ook alle 5.850 relaties en 2.819 toewijzingen mee.

**Voorstel** (oplopend in moeite, de eerste stap is triviaal en haalt het meeste risico weg):
1. **Cap in `beginUndoable`** — `if (s.undoStack.length > MAX_UNDO) s.undoStack.shift();` met `MAX_UNDO = 50…100`. ~2 regels, gedekt door de bestaande contract-suite.
2. **Ook de payloads cappen**: bij `capturePayload` in `switchDocument` de geschiedenis van het *uitgaande* document afkappen op bijv. 20 stappen — een tabblad dat je niet ziet hoeft geen volle historie te dragen.
3. **Copy-on-write per collectie**: de snapshot houdt per collectie een referentie, en `beginUndoable` kloont alleen de collecties die de actie daadwerkelijk raakt. De `DOCUMENT_FIELDS`-rollen zijn al de juiste plek om die "geraakte collecties"-set te declareren.

---

### 5. Het "manual, not reactive" runCPM-contract rust volledig op auteursdiscipline en faalt stil
**Ernst: hoog**

`scheduleStale` is de enige vangnetvlag, en die wordt volledig handmatig gezet: 22× `finishMutation(s, { stale: true })`, 28× `finishMutation(s)` zonder, plus 6 conditionele varianten. Er is geen type, geen lint, geen test die afdwingt dat een datum-beïnvloedende mutatie de vlag zet. `transaction.ts:90-99` documenteert de asymmetrie netjes — maar documentatie is de enige handhaving.

Drie concrete gaten:

**(a) `autoCalcCPM` staat standaard UIT** (`uiSlice.ts:69`). Een vergeten `{ stale: true }` levert dus een planning op die er correct uitziet maar het niet is, zonder enige hint. Dat is de duurste soort bug in een planningstool.

**(b) Het laadpad zet `scheduleStale` op `false` terwijl er nog niets gerekend is.** `payloadFromImport` (`documentContract.ts:253`) start van `freshPayload()` → `scheduleStale: false`, `cpmResult: null`. Bij `applyLoadedProject(..., { recompute: false })` (`fileSlice.ts:133`, de `loadState`-semantiek) zit de app dus in de toestand *"planning is vers"* terwijl er geen CPM-resultaat bestaat. Elke `loadState`-caller moet zelf `runCPM()` aanroepen — en dat is precies wat er in de praktijk vergeten is: `src/utils/devBridge.ts:80` (`openFromPath`) roept `loadState(parsed)` aan **zonder** navolgende `runCPM()`, in tegenstelling tot de vier andere callsites (`extensionApi.ts:81-82`, `IFCPanel.tsx:49-51`, `Backstage.tsx:490-491`, `MenuBar.tsx:36-38`). Dat is het bewijs dat het contract in de praktijk niet houdt.

**(c) Er zijn twee parallelle laadpaden.** `fileSlice.applyLoadedProject` is de canonieke, gedeelde implementatie (bewust zo gebouwd, "audit P5/F6", `fileSlice.ts:91-95`) — maar `loadState` blijft als publieke escape-hatch bestaan en wordt door 5 callers gebruikt die elk hun eigen nastappen improviseren.

**Voorstel**:
1. Maak `payloadFromImport` `scheduleStale: true` zetten. Dan is "geladen maar niet gerekend" *ook* zichtbaar als verouderd, en dekt `autoCalcCPM` het automatisch af.
2. Deprecate `loadState` ten gunste van `applyLoadedProject` met expliciete opties; laat de 5 callsites migreren.
3. Overweeg `autoCalcCPM` default AAN te zetten, of de "verouderd"-indicator prominenter te maken.
4. Voor de langere termijn: maak `stale` een *verplichte* parameter van `finishMutation`.

---

### 6. Het "trailing recompute"-ritueel wordt 54× met de hand herhaald
**Ernst: middel**

`transaction.ts:32-34` benoemt dit expliciet als bewuste keuze: "de trailing recomputes blijven per actie expliciet ná de `set()` staan". Het resultaat is 54 losse `get().recomputeViewRows()`-aanroepen in de slices en 11 `get().recomputeResourceLoad()`-aanroepen (alle 11 in `resourceSlice`).

De regels zijn niet triviaal af te leiden:
- `sequenceSlice` roept **geen** `recomputeViewRows` aan (correct — er is geen sequence-afgeleid `FieldRef`, zie `src/types/view.ts:31-42`);
- `baselineSlice` ook niet (correct);
- maar zodra iemand ooit een `{ src: 'baseline' }`- of `{ src: 'relation' }`-`FieldRef` toevoegt, worden die twee slices stil incorrect en is er niets dat dat signaleert.

Daarnaast is `viewRows` per-document afgeleide state die *buiten* het documentcontract valt; de correctheid bij een tabwissel hangt aan vier losse handmatige aanroepen in `documentSlice.ts:90,113,133,157` plus één in `restoreDocuments` (:195).

**Voorstel**: maak de afhankelijkheid data-gedreven. Laat `finishMutation` een `invalidates`-set accepteren en voer de recomputes centraal uit. Alternatief, goedkoper: leid de recompute-triggers af uit één tabel `VIEW_ROW_INPUTS` en documenteer die naast `FieldRef`.

---

### 7. `updateTask` markeert de planning altijd als verouderd, óók bij een pure hernoeming
**Ernst: laag-middel**

`taskSlice.ts:225-235`: `updateTask` doet altijd `finishMutation(s, { stale: true })`. De enige `updateTask`-caller met alleen een naam is `TableEditor.tsx:222`. Met `autoCalcCPM` aan kost het hernoemen van één taak dus: een volledige deep-clone-snapshot + een complete `CPMSolver`-run + `computeResourceLoad` + `computeViewRows`.

**Voorstel**: leid `stale` af uit de patch-sleutels, net zoals `setProject` dat al doet (`projectSlice.ts:185`: `stale: 'startDate' in updates`). Bijv. een module-constante `DATE_RELEVANT_TASK_KEYS` en `stale: Object.keys(updates).some(k => DATE_RELEVANT_TASK_KEYS.has(k))`.

---

### 8. Immer-footgun na `hydratePayload`/`restoreSnapshot`, alleen geborgd door één commentaarblok
**Ernst: middel**

`syncProjectCalendar.ts:41-45` documenteert een subtiel maar hard probleem: als een array binnen dezelfde `set()`-producer al uit een payload/snapshot is *toegewezen*, is `s.calendars` geen Immer-draft meer maar de bevroren bronarray — `push()` gooit dan `Cannot add property N, object is not extensible`. De code lost dat op met `s.calendars = [...s.calendars, …]`.

Dit raakt elke code die na `hydratePayload(s, p)` of `restoreSnapshot(s, snap)` **binnen dezelfde producer** nog iets muteert. Vandaag doen alleen `applyLoadedProject` en `syncProjectCalendar` dat, dus het is correct — maar de valstrik is onzichtbaar: geen type, geen assert, geen test, alleen een comment in één bestand.

**Voorstel**: documenteer de invariant in de JSDoc van `hydratePayload` en `restoreSnapshot`, en voeg in de contract-suite een gerichte case toe die `hydratePayload` gevolgd door een in-place `push` uitvoert en verwacht dat dat *faalt*.

---

### 9. `UIState` is een god-object van 64 velden met één ongedifferentieerde setter
**Ernst: middel**

`slices/types.ts:105-195` telt **64 velden** in `UIState`. `setUI(updates: Partial<UIState>)` (`uiSlice.ts:97-106`) is de enige mutator en wordt **138×** aangeroepen. Het veld mengt drie totaal verschillende levensduren, alleen onderscheiden door inline-commentaar: persistent, sessie, per-document (`collapsedTaskIds` — de enige uitzondering in `DOCUMENT_FIELDS`). Elk `setUI({showFooDialog:true})` invalideert bovendien het hele `ui`-object.

**Voorstel**:
1. Splits het *type*: `UIState = PersistedUIState & SessionUIState & PerDocumentUIState`. Type-only, nul gedragsimpact. (Staat al als **M6** in `docs/superpowers/prestatie-modulariteit-audit.md`.)
2. Vervang de ~20 `show*Dialog`-booleans door één `activeDialog: DialogId | null`.

---

### 10. `taskSlice.ts` (887 regels, 26 keys) draagt zes ongerelateerde verantwoordelijkheden
**Ernst: middel**

Het bestand combineert: taak-CRUD, boomstructuur-manipulatie, selectie (5 acties), klembord, WBS-nummering, voortgangsinvarianten en externe koppelingen.

Concrete gevolgen:
- **Duplicatie van de cykel-check**: `moveTask` (:321-333) en `moveTaskTo` (:371-380) bevatten twee bijna-identieke visited-set-walks, met een comment die naar elkaar verwijst met een inmiddels onjuist regelnummer (documentatiedrift binnen één bestand).
- **Drie-voudige waarheidsbron**: `parentId`, `childIds` van beide ouders, én de rauwe `s.tasks`-volgorde moeten synchroon blijven. `moveTaskTo` besteedt daar 40 regels aan (:409-434), `reorderSibling` 30 (:588-640), `addTask` 20 (:186-208). Dezelfde invariant, drie keer met de hand geïmplementeerd.
- `indentTasks` doet `flattenOrder` + `order.indexOf(id)` + `s.tasks.find(...)` in geneste lussen (:455-471) — O(n²)-O(n³) op een multi-select indent.

**Voorstel**: extraheer één `src/state/taskTree.ts` met pure helpers over `Task[]` — `detach`, `insertAt`, `isDescendant`, `siblingIds` — die de drievoudige waarheidsbron op één plek onderhouden. Pure functies ⇒ direct testbaar. Split daarnaast selectie + klembord naar een eigen `selectionSlice`.

---

### 11. `GanttCanvas.tsx` is de god-component die de hele renderer-store-koppeling draagt
**Ernst: middel**

De rendererlaag zelf is **voorbeeldig**: nul `useAppStore`-treffers in `src/engine/`, `GanttRenderer` krijgt alles via een `GanttRenderOptions`-object en schrijft nergens naar `Task`-objecten. De scheduler is even zuiver.

Maar alle koppeling is samengeperst in één component: **`GanttCanvas.tsx` telt 1.489 regels met 60 `useAppStore(...)`-abonnementen** (:78-146) plus 10 `getState()`-aanroepen.

Lekken in de verder schone enginegrens:
- `GanttRenderer.ts:6` importeert `isHourCalendar` uit `@/services/subdayIo` — engine → services;
- `src/engine/view/visibleRows.ts:8-10` importeert types uit `@/state/slices/types` — engine → state (type-only);
- `GanttRenderer.ts:106` en `themePalette.ts:23` doen DOM-toegang; het palet is al injecteerbaar, de hatch-pattern nog niet.

**Voorstel**:
1. Extraheer een pure `buildGanttRenderOptions(state, layout): GanttRenderOptions` — headless testbaar, haalt ~40 selectors uit de component.
2. Verplaats `isHourCalendar` naar `@/utils/` of `@/engine/calendar/`.
3. Verhuis `visibleRows`' type-imports naar `@/types/view`.
4. Injecteer de hatch-pattern via `palette` (= **M5** in de bestaande audit).

---

### 12. De CPM-terugschrijf + summary-rollup bestaat twee keer
**Ernst: laag-middel**

`scheduleSlice.ts:78-161` schrijft het CPM-resultaat terug en rolt de verzameltaken op. `src/services/benchmark/runner.ts:81-107` doet exact hetzelfde nog een keer, met een comment die dat toegeeft. De benchmarkkopie is al gedivergeerd: mist `interferingFloat`, `isNearCritical`, `floatPath`, de late-datums-rollup, `totalFloat`/`freeFloat`-min over kinderen en de uur-modus-normalisatie. De benchmark meet dus niet meer wat de app doet.

**Voorstel**: extraheer één pure `applyCpmResult(tasks, result)` naar `src/engine/scheduler/`. Valt samen met pakket **A3/M3** uit de bestaande audit.

---

### 13. Bulk-mutaties hebben geen transactie-API — n aanroepen kosten O(n²)
**Ernst: middel**

Elke `addTask` pusht een eigen deep-clone-snapshot (`taskSlice.ts:131`). Een lus van *n* toevoegingen kloont dus `1 + 2 + … + n` taken — kwadratisch. Dit gebeurt echt: `extensionApi.ts:75` (`data.addTask`) is de enige manier waarop een extensie taken kan aanmaken; `tests/planning/harness.ts:420` bouwt scenario's zo op.

`indentTasks`/`outdentTasks` gebruiken al een `snapshotPushed`-vlag en `insertWbsTemplate`/`pasteTasks` pushen één snapshot per operatie — maar dat is per actie opnieuw met de hand gebouwd.

**Voorstel**: voeg een `withTransaction(fn)` toe die de snapshot één keer pusht en genest `beginUndoable` tot no-op maakt (module-level diepteteller, zoals de bestaande `coalesce`-marker in `transaction.ts:47`). Exposeer als `api.data.batch(fn)` aan extensies. ~20 regels.

---

### 14. De multi-document-invariant "precies één entry heeft `payload === null`" wordt nergens afgedwongen
**Ernst: laag-middel**

`documentSlice.ts` gebruikt vier non-null-asserties op die invariant: `:149`, `:169-171`, `:180`. Raakt de invariant stuk, dan crasht `getOpenDocuments()` — een functie die de tabbalk élke render aanroept: de hele UI valt om.

Kleinere randgevallen: `switchDocument` faalt stil (`return`) op een onbekend id (`:102`); `restoreDocuments` bij `docs.length === 0` doet niets (`:185`).

**Voorstel**: vervang de assertie-punten door een gedeelde `activePayload(s, d)`-helper die bij schending één `appLog`-fout emit en terugvalt op de live top-level state. Dwing de invariant af in de contract-suite.

---

### 15. Dood bestand met een eigen, gedivergeerd laad-/opslaanpad — en de documentatie verwijst er nog naar
**Ernst: laag**

Orphan-scan vindt precies twee niet-geïmporteerde bestanden in `src/`: **`src/components/layout/MenuBar/MenuBar.tsx` (126 regels)** en `src/types/index.ts` (6 regels).

`MenuBar.tsx:30-38` bevat een **vierde, afwijkend laadpad** (`loadState` + `setFilePath` + `runCPM`, zónder nieuw tabblad, recents, `fileHandle`, fit of uur-melding), en `src/state/ifcSaveInput.ts:7` en `:28` beschrijven de "MenuBar-quicksave" nog steeds als **actieve** callsite.

**Voorstel**: verwijder `MenuBar.tsx`, werk de comments in `ifcSaveInput.ts` bij, voeg een orphan-scan toe als CI-stap.

---

### 16. Documentatiedrift: `CLAUDE.md` beschrijft de kern van de state-laag niet, en de auto-save verkeerd
**Ernst: middel**

- **Auto-save**: `CLAUDE.md:67` zegt *"een debounced (800 ms) store-subscription in `App.tsx`"*. Werkelijkheid: een **throttle van 10.000 ms** in `src/hooks/useAutoSave.ts:18` (`AUTOSAVE_INTERVAL_MS = 10_000`), met een comment die uitlegt waarom debounce juist *verkeerd* was. Verschil in dataverliesvenster: factor 12.
- **De drie belangrijkste bestanden van de state-laag ontbreken.** `CLAUDE.md:47-53` noemt `documentContract.ts`, `snapshot.ts` en `transaction.ts` nergens. Wie op `CLAUDE.md` vaart, schrijft onvermijdelijk een mutatie zonder `beginUndoable`/`finishMutation` en een nieuw documentveld zonder descriptor.

**Voorstel**: vervang de auto-save-zin en voeg drie regels toe aan de state-sectie over `DOCUMENT_FIELDS`, het mutatie-ritueel en de snapshot-rollen.

---

### 17. Twee globale store-abonnementen draaien bij élke mutatie
**Ernst: laag**

`useAutoSave.ts:76` en `useAutoCalcCPM.ts:23` registreren allebei een ongefilterde `useAppStore.subscribe(...)`. De callbacks zijn goedkoop, dus dit is nu geen probleem — maar het patroon schaalt slecht.

**Voorstel**: introduceer één `subscribeWithSelector`-gebaseerde helper. Lage prioriteit.

---

## B. Wat expliciet goed is (en behouden moet blijven)

1. **Het documentcontract** (`documentContract.ts`) — één key-gedreven veldregister dat payload, hydrate, reset, recovery en undo-snapshot voedt, met twee compile-time volledigheidschecks.
2. **`transaction.ts`** — het mutatie-ritueel op één plek, met de bewuste asymmetrieën expliciet gedocumenteerd, plus undo-coalescing.
3. **De engine-grens** — nul store-imports in `src/engine/`; alles via parameters. Dit is de reden dat de headless suite van 395+ cases kan bestaan.
4. **Guard-vóór-snapshot als vaste conventie** — consistent over alle 56 callsites.
5. **`buildWriteIFCInput`** (`ifcSaveInput.ts`) — één plek die bepaalt welke velden in een IFC-save meegaan.
6. **`tests/planning/check-document-contract.ts`** — 612 regels die het contract met *echte* store-acties testen en zelf over `DOCUMENT_FIELDS` itereren.

---

## C. Prioritering

| Prio | Bevinding | Moeite | Waarom eerst |
|---|---|---|---|
| **1** | #4 undo-stack cappen | XS (2 regels) | Grootste risico, kleinste ingreep; 248 MB → begrensd |
| **2** | #5b `payloadFromImport` → `scheduleStale: true` | XS | Sluit het enige *stille* correctheidsgat in het CPM-contract |
| **3** | #16 `CLAUDE.md` bijwerken | XS | Zonder dit reproduceren nieuwe bijdragers opgeloste bugklassen |
| **4** | #2 omgekeerde volledigheidscheck op state-velden | S (~10 regels) | Sluit de laatste opening in een verder waterdicht contract |
| **5** | #3 defaults naar bladmodule + cyclus-CI | S | Verwijdert een latente crash |
| **6** | #15 dood bestand + comments | XS | Verwijdert een misleidend "vierde laadpad" |
| **7** | #12 `applyCpmResult` extraheren | S | Valt samen met pakket A3/M3 |
| **8** | #7 `updateTask` stale-afleiding | S | Directe UX/perf-winst |
| **9** | #13 `withTransaction` | S | Bulk-mutaties lineair i.p.v. kwadratisch |
| **10** | #5c `loadState` deprecaten | M | "Vergeten runCPM" structureel onmogelijk |
| **11** | #10 `taskTree.ts` extraheren | M | Drievoudige waarheidsbron op één plek |
| **12** | #11 `buildGanttRenderOptions` extraheren | M | ~40 selectors uit een 1.489-regels-component |
| **13** | #9 `UIState`-split (type-only) + `activeDialog` | M | Gratis op typeniveau |
| **14** | #1, #6, #8, #14, #17 | M-L | Structureel, geen acute correctheidsrisico's |

**Samenhang met bestaand werk**: `docs/superpowers/prestatie-modulariteit-audit.md` bevat al gemeten pakketten. Geland: A4, B1, B2, E2. Nog open en direct relevant: **B3** (undo-cap/COW = #4), **A3/M3** (= #12), **M5** (= #11.4), **M6** (= #9). Het onderhoudbaarheidsdocument moet daarnaar verwijzen in plaats van ze opnieuw te nummeren.
