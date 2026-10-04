# Edgecase-sweep Open Planner Studio — bevindingen

**Methode:** 100+ randgevallen, waarvan het merendeel headless bewezen tegen de **echte** store + `CPMSolver`/`CalendarEngine`/`ifcWriter`/`ifcReader` (esbuild-patroon van `tests/planning/run.sh`). Classificatie: **(a)** correct · **(b)** faalt zichtbaar/veilig · **(c)** faalt stil of corrumpeert.

## Top-5 (c)-bevindingen

| # | Bevinding | Ernst |
|---|---|---|
| 1 | `parseDate` is tijdzone-afhankelijk → **de hele planning schuift een dag** ten westen van UTC | **kritiek** |
| 2 | Een taaknaam/notitie met `);` **verandert stilzwijgend de duur** en verminkt de naam bij opslaan | **kritiek** |
| 3 | Recovery-snapshot niet-atomair + `readIFC` gooit nooit → afgekapte snapshot wordt als volwaardig hersteld, daarna gewist | **kritiek** |
| 4 | Twee app-instanties / gedupliceerd tabblad **wissen elkaars recovery-snapshots** | hoog |
| 5 | Taak-kalender zonder werkdagen → **verzonnen datums twee jaar verderop**, zonder fout | hoog |

---

## 1. Datum/tijd

### 1.1 `parseDate` rekent met LOKALE getters op een UTC-instant — (c), kritiek

`src/utils/dateUtils.ts:2-5`:
```ts
export function parseDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));  // ← lokale getters
}
```
`new Date('2026-06-01')` levert UTC-middernacht; `getFullYear/getMonth/getDate` lezen die **lokaal** uit. Bij elke negatieve UTC-offset valt dat een dag terug.

**Bewijs — de echte regressiesuite (431 cases) onder verschillende `TZ`:**

| TZ | resultaat |
|---|---|
| Europe/Amsterdam, UTC, Pacific/Auckland, Asia/Tokyo | 431/431 groen |
| **America/New_York** | **311/431 — 120 cases falen** |

De uitval is precies waar je hem verwacht: `constraints`, `resource-load`, `resource-leveling`, `progress`, `kalenders`, `hours-relations`. Puur *relatieve* CPM overleeft (alles schuift uniform mee); alles met een **absolute** datum (constraints, feestdagen, statusdatum, belasting per dag, uurbanden) breekt.

**De zomertijd-variant is subtieler en erger.** De offset wordt genomen *op de geparste datum*. In `Atlantic/Azores` (UTC+0 zomer, UTC−1 winter) schuift de helft van één project wel en de andere helft niet; een taak die de maart-overgang kruist verandert daardoor van lengte. Dit ontsnapt aan de suite omdat het ankerpunt `2026-06-01` in de zomer valt.

**Reikwijdte:** 100 aanroepen in 22 bestanden — solver, kalender, renderer, minimap, histogram, variance, leveler, CSV-reader, IFC-slots, printvoorbeeld, `moveProject`, extensie-SDK. `Intl` gebruikt overal correct `timeZone:'UTC'` — alleen het *parsen* is stuk. De browserbuild staat productie-live, dus dit raakt elke gebruiker in Noord-/Zuid-Amerika vandaag.

**Voorstel — geverifieerde one-liner.** Parse de datumkop tekstueel:
```ts
export function parseDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const d = new Date(iso);
  if (isNaN(d.getTime())) return d;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
```
Met deze patch op een kopie van `src/`: **431/431 groen in Amsterdam, UTC, New York, Los Angeles, Azoren, Tokio én Pacific/Midway (UTC−11).** Voeg daarna een `TZ`-matrix toe aan `run.sh`.

### 1.2 Overig datum/tijd

| Geval | Uitkomst | Klasse |
|---|---|---|
| Schrikkeljaar 2028-02-29, jaargrenzen | correct (`setUTCDate`-rekenwerk is DST-vrij) | (a) |
| ISO-week 53 | correct in UTC+ zones; **fout in UTC− zones** — gevolg van 1.1 | (c) |
| `parseDate('0001-01-01')` → `1901-01-01` | legacy 2-cijferige-jaar-mapping | (b), laag |
| `parseDate('2026-02-30')` → `2026-03-02` | ongeldige datum rolt stil door | (b), laag |
| `parseDate('')`, `'niet-een-datum'` | `Invalid Date`, opgevangen door de solver-guard (`CPMSolver.ts:373`) | (a) |
| Taak vóór projectstart | blijft gewoon op de oude datum staan | (a) |

---

## 2. CPM/scheduler-randen

### 2.1 Taak-kalender zonder werkdagen is niet geguard — (c), hoog

De guard staat alleen op de **project**kalender (`CPMSolver.ts:365`). Een bibliotheek-kalender met `workDays: []` op één taak passeert. Bewezen: taak A krijgt `es=2028-06-04`, `tf=-1` (bedoeld: `2026-06-01`). De `MAX_SCAN=366`-vangnetten in `CalendarEngine` geven bij verzadiging `current` terug — plausibel ogende maar verzonnen datums, zonder fout, die zich voortplanten. **Voorstel:** `hasWorkingDays()` over de projectkalender én elke door een taak gebruikte kalender.

### 2.2 Uurkalender zonder werkbanden — duur wordt stil 0 — (c), middel

`hasWorkingDays()` (`CalendarEngine.ts:95-97`) kijkt naar `calendar.workDays`, niet naar `workTime.byWeekday`. Een `4h`-taak wordt een nul-lengte mijlpaal (`addWorkMinutes` breekt af op `if (!band) break;`). **Voorstel:** in uur-modus ook minstens één band per week eisen.

### 2.3 `dfsVisit` is niet-iteratieve recursie zonder dieptegrens — (b), middel

Recursieve DFS-cyclusdetectie (`CPMSolver.ts:432-465`); `runCPM` heeft geen try/catch. Gemeten: FS-keten 8.000 OK, **10.000 → RangeError**; WBS-diepte 4.000 OK, 8.000 → RangeError. State blijft intact (Immer commit niets bij throw), maar de gebruiker krijgt een stille dode F5. Realistische projecten zijn breed, niet diep — daarom (b). **Voorstel:** iteratieve DFS óf try/catch → `emptyResult('graaf te diep')`.

### 2.4 Overige scheduler-randen — grotendeels netjes

Leeg project (a); cyclus gedetecteerd (a); self-ref A→A wordt toegestaan door `addSequence` maar door `runCPM` als cyclus gevangen (b); dubbele relatie gededupliceerd (a); 0-duur = mijlpaal (a); hammock zonder kinderen gerapporteerd (a); MSO ná deadline → `tf=−22` + gemeld (a); lead −100.000 afgekapt (a); negatieve duur → `ef=es` (a); duur 1.000.000 stil afgekapt op `MAX_DAYS` (b); feestdagenblok >~2 jaar → verzadiging, stil (c, laag); statusdatum vóór start bij 100%-taak → `projectDuration 1` i.p.v. 5 (b, laag).

---

## 3. Invoer-extremen

### 3.1 `);` in een naam corrumpeert stilzwijgend het plan — (c), kritiek

`parseSTEP` (`ifcReader.ts:110`) gebruikt een niet-string-bewuste regex die stopt op het eerste `);` — óók binnen een string-literal; `ifcStr` (`ifcPsets.ts:59-62`) escapet alleen apostrofs. Bewijs (`writeIFC` → `readIFC`):

| Invoer | Terug na opslaan+laden |
|---|---|
| taaknaam `Levering (beton); wk 12`, **duur 7** | naam `'Levering (beton`, **duur 5**, `wbsCode` weg |
| notitie `Levering (beton); wk 12` | **notitie volledig verdwenen** (`notes: undefined`) |
| notitie `Beton besteld wk 12` (controle) | correct |

De duurverandering 7 → 5 is het gevaarlijkst: de planning verandert stil bij opslaan/heropenen, en `writeIFC` is óók de auto-save elke 10 s. **Voorstel:** (1) `ifcStr` ISO 10303-21-conform (backslash verdubbelen, non-ASCII als `\X2\…\X0\`); (2) `parseSTEP` string-bewust via de al bestaande `splitArgs`-`inString`-logica (regels 125-161).

### 3.2 Unicode: verrassend robuust — (a)

Round-trip correct voor emoji, CJK, Arabisch, RTL-override, backslashes, `(A,B)`, newlines, NUL-byte, combining accents, 200.000 tekens. Werkt omdat *beide* kanten dezelfde niet-conforme conventie hanteren — voor externe IFC-tools zijn deze bestanden ongeldig zodra er een backslash of non-ASCII in staat.

### 3.3 Lege naam wordt `$` — (c), laag

`ifcStr('')` geeft `$`; `stripQuotes('$')` geeft `'$'`. Een taak zonder naam heet na opslaan+laden `$`. Fix: schrijf `''` i.p.v. `$` voor een lege verplichte naam-slot.

### 3.4 Duplicaat-ID's en wees-taken — (a)/(b)

Dubbele `IFCTASK` → aparte taken met verse ids (a); `IFCRELNESTS` naar niet-bestaande ouder → kind wordt stil root (b, verdient importwaarschuwing); `rebuildWbsHierarchy` kan geen cyclus maken (a); rauwe `completion` buiten 0–1 uit import wél geklemd incl. NaN (a).

---

## 4. Multi-document / instantie

### 4.1 Twee instanties wissen elkaars recovery — (c), hoog

Geen `tauri-plugin-single-instance`; in productie is `recoveryBase === 'recovery'` zonder slug (`recoveryPaths.ts:9`). De opruimlus (`recoveryStore.ts:52-60`) verwijdert elk `recovery.*.ifc` dat niet in de eigen documentenlijst zit → instantie B's eerste auto-save vernietigt alle snapshots van A. Web: `sessionStorage`-scoping helpt, maar **"Tabblad dupliceren" kopieert `sessionStorage`** → tab B's `clearRecovery()` wist tab A's records. **Voorstel:** `ownerId` + `heartbeatAt` in het manifest; opruimlussen beperken tot het eigen laatst geschreven manifest; plus single-instance.

### 4.2 Klembord remapt drie velden niet — (c), middel

`pasteTasks` (`taskSlice.ts:677-761`) filtert `resourceIds`/`assignments` op bestaan, maar `calendarId`, `activityCodes` en `customFields` gaan via `JSON.parse(JSON.stringify(src))` letterlijk mee. In een doeldocument zonder die ids valt `resolveCalendar` stil terug op de projectkalender, codes/velden zijn onzichtbaar, en de eerstvolgende IFC-save filtert ze permanent weg. **Voorstel:** drie filterregels in dezelfde stijl als de `resourceIds`-filter + een toast.

### 4.3 Wat wél goed is — (a)

Het **documentcontract is compleet en compile-time bewaakt** (`documentContract.ts:146-188`, `snapshot.ts:53-60` dubbelzijdig). `viewRows` staat er terecht buiten. Sluiten van het laatste document reset correct. Kleinere randen: de coalesce-marker (`transaction.ts:47`) wordt door `switchDocument` gewist maar niet door `newDocument`/`closeDocument` (twee sessies → één undo-stap); de tabstrip klipt boven ~11 documenten (hamburger-menu blijft werken); Ctrl+1..9 mist een `hasBlockingDialogOpen()`-guard.

---

## 5. Bestands-I/O

### 5.1 Recovery: niet-atomair schrijven + een reader die nooit gooit — (c), kritiek

(1) `recoveryStore.ts:41-43` schrijft direct over het bestand (truncate't eerst), geen temp+rename — een crash midden in de write laat een afgekapte snapshot achter. (2) `readIFC` bevat **nul** `throw`-statements; `parseSTEP:101-102` doet `content.split('DATA;')[1]?.split('ENDSEC;')[0]` en gaat bij een afgekapt bestand door op de resterende tekst. Gevolg: de per-document `try/catch` in `useRecoveryRestore.ts:61-80` vuurt nooit; de afgekapte snapshot wordt hersteld met stilzwijgend minder taken, waarna `clearRecovery()` de enige kopie wist — mét de originele `filePath`. Eén Ctrl+S en het bestand is weg. Zelfde klasse: `loadTauri:70` doet `JSON.parse` van het manifest buiten try/catch. **Voorstel:** temp+rename in `saveTauri`; integriteitscheck in `readIFC` (eis `ISO-10303-21`-kop én afsluitende `END-ISO-10303-21;`); `clearRecovery()` pas ná geslaagde restore.

### 5.2 Opslagfouten zijn volledig ongevangen — (b) qua data, (c) qua feedback, hoog

`saveToRefTauri` (`tauriBackend.ts:28-33`) vangt niets, en geen enkele callsite vangt de rejection. Die landt in `appLog.ts:88` (DebugTerminal, standaard uit). Data blijft behouden (`isDirty` blijft true), maar de gebruiker krijgt niets. Realistische trigger: dialoog-grant overleeft geen herstart → opslaan naar netwerkshare → herstart → recovery herstelt mét `filePath` → Ctrl+S doet letterlijk niets, voor altijd. De web-backend doet het wél goed (`webBackend.ts:81-97`, terugval naar opslaan-als).

### 5.3 Overig bestands-I/O

- **Hetzelfde bestand in twee tabs**: geen dedupe/mtime-check — laatste schrijver wint. Fix: scannen op gelijk `filePath`/`handle.isSameEntry()` (helper `sameRef` bestaat al). (c, middel-hoog)
- **FSA-permissies**: ritueel correct, maar `readFromRef` geeft `null` bij geweigerd/verdwenen/elke fout, waarna `fileSlice.ts:345-350` de recent-entry stil wist. (b, middel)
- **Bestandsnaam-sanitisatie: nul.** Vijf callsites interpoleren `project.name` rauw; `project.name` komt mede uit het geopende bestand. (b met (c)-randje via `ENAMETOOLONG`)
- `isDirty`-boekhouding is goed (a); randje: `runCPM` schrijft in uur-modus `scheduleFinish` (geserialiseerd veld) zonder dirty-markering.
- `MenuBar.tsx` is dode code met een tweede, ongesanitiseerd save-pad — verwijderen.

---

## 6. UI-randen

| Bevinding | Bewijs | Klasse |
|---|---|---|
| **`resourceNames` O(n·m)** (`filterEval.ts:24-29`) | groeperen 11/37/138/541 ms @500/1k/2k/4k; sorteren **1.504 ms @4k** → ~9 s bevroren bij 10k | (c), hoog |
| **`TableEditor` zonder virtualisatie** (`TableEditor.tsx:520`, `includes()` per rij :545-546) | ~148 ms/render @10k + select-all, ~100k DOM-nodes | (c), hoog |
| **Undo-snapshot per mutatie, geen cap** (`transaction.ts:84-85`) | 26/171/**331 ms** per `addTask` @1k/5k/10k; undo-stack **524 MB** bij 800 taken; bij 1600 knalt `JSON.stringify` op `Invalid string length`; `addTask` zuiver kwadratisch | (c), hoog |
| **RTL horizontale scroll dood** (`GanttCanvas.tsx:1340`, geen `dir`; `setScroll` klemt op 0) | statisch afgeleid; balklabels mogelijk verdwenen (`GanttRenderer.ts:975-989`, geen `textAlign`) — vereist echte browser | (c), middel-hoog |
| **NaN-gat in `setZoom`/`setScroll`** (`viewSlice.ts:67-71,102-107`) | `setTimeScale('bogus')` → `zoom=NaN` → lege Gantt zonder exception; `settingsStore.ts:166` valideert alleen `typeof==='string'` | (c), middel |
| Canvas-culling per rij én balk; 0-rijen/0×0/lege minimap/histogram; zoom-to-fit-randen; presentatiemodus | overal geguard | (a) |

---

## 7. Getallen

| Invoer | Uitkomst | Klasse |
|---|---|---|
| **duur = NaN** | `ef=es` — stil nul-lengte balk; NaN blijft in de store, gaat mee naar IFC | (c), middel |
| duur = Infinity | `projectEnd 2574`, 62 ms voor één taak — bij corrupte import een hang | (b)/(c), middel |
| lag = NaN/±Infinity | correct genegeerd → 0 (`Number.isFinite`, `CPMSolver.ts:80,288,293,868-874`) | (a) |
| completion buiten 0–1 via import | geklemd incl. NaN | (a) |
| **completion = NaN via `setTaskProgress`** | `Math.max(0,Math.min(1,NaN))===NaN` (`taskSlice.ts:838`) → `remainingTime = NaN` | (c), laag-middel |
| Uurkalender 1-min-werkdag, 8h-taak | exact correct (480 werkdagen), geen float-drift | (a) |
| Afgeleide `hoursPerDay` bij 0 banden | terugval op `calendar.hoursPerDay`, geen deling door 0 | (a) |

Float-precisie in uurmodus is goed: absolute UTC-ms + integer minuten; de `interferingFloat == totalFloat − freeFloat`-invariant draait met `1e-9`-tolerantie over alle 431 cases zonder afwijking.

---

## Aanbevolen volgorde

1. **`parseDate`-fix + `TZ`-matrix in `run.sh`.** Eén functie, geverifieerd 431/431 in zeven tijdzones. Live productiebug voor alle gebruikers ten westen van Greenwich.
2. **`ifcStr` conform + `parseSTEP` string-bewust.** Sluit stille planwijziging bij opslaan én maakt bestanden IFC-conform.
3. **Recovery: temp+rename + integriteitscheck in `readIFC`.** Tegen het enige pad naar echte datavernietiging.
4. **Foutafhandeling rond opslaan** (try/catch in `tauriBackend` + één toast-mechanisme op app-niveau).
5. **Undo-stack cap** (één regel) en de **`resourceNames`-index-Map** — de twee goedkoopste prestatiefixes met de grootste opbrengst.
6. Guards: taak-kalenders zonder werkdagen, `Number.isFinite` op zoom/scroll/completion/duur, klembord-remapping.

**Niet vast te stellen zonder echte browser** (expliciet open gelaten): het RTL-`textAlign`-effect op balklabels, het gedrag van `showSaveFilePicker` bij een ongeldige `suggestedName`, en of user activation een `requestPermission()`-prompt overleeft.
