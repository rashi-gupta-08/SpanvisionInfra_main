# Hyperkritische review — edgecase-sweep-rapport

Dit rapport is **fundamenteel gezond**. De hoofdclaim is keihard reproduceerbaar, de voorgestelde fix werkt aantoonbaar, en de meeste ernst-classificaties houden stand. Waar het zwak is, is in een handvol *specifieke getallen* die het te dik aanzet — nooit in de richting van de conclusie, meestal juist een onderschatting van de blast radius. **Geen enkele valse (c) gevonden.**

## Bevindingen, ergste eerst

### [BEVESTIGD] De `parseDate`-tijdzonebug is echt, kritiek, en de fix klopt
Suite zelf gedraaid:
- `TZ=Europe/Amsterdam` / `UTC` / `Asia/Tokyo` / `Pacific/Auckland` → **431/431 groen**
- `TZ=America/New_York` / `America/Los_Angeles` / `Pacific/Midway` → **311/431 (120 falen)**, exit 1
- Patch op een kopie (de exacte one-liner uit §1.1) → **431/431 in alle zeven zones inclusief Atlantic/Azores**, en de volledige `run.sh` (mét álle `check-*`-scripts) geeft **exit 0** onder New York. De fix is compleet, niet alleen voor de CPM-cases.

Mechanisme klopt letterlijk. Classificatie **(c) kritiek** volledig terecht — de browserbuild staat productie-live, dus dit raakt elke gebruiker ten westen van Greenwich vandaag.

*Kanttekening:* het rapport noemt in proza zes gefaalde categorieën; in werkelijkheid falen er véél meer (ook advanced-cpm, calendar, hours, baselines, boundary, lag-advanced, milestone-kinds, move-project, view + vijf `check-*`-scripts). Een **onderschatting** van de reikwijdte — het versterkt de ernst.

### [BEVESTIGD] De DST/Azoren-variant is echt en subtieler
Directe probe onder `TZ=Atlantic/Azores`: winterdatums (`2026-01-15`→`01-14`, `02-15`→`02-14`, `12-15`→`12-14`, UTC−1) schuiven terug; zomerdatums (`2026-03-30`, `04-15`, `06-01`, UTC+0 door DST) blijven correct. Een taak die de maart-overgang kruist verandert dus van lengte, en het ontsnapt aan de suite omdat het anker `2026-06-01` in de zomer valt.

### [BEVESTIGD] Taak-kalender zonder werkdagen — (c) hoog terecht
Probe tegen de echte store: bibliotheek-kalender `workDays:[]` op één taak → `es=2028-06-04`, `ef=2029-06-06`, `tf=-1`, **`cpmResult.error === undefined`**. Exact de geclaimde waarden, zonder fout. De guard staat alleen op `projectEngine.hasWorkingDays()`; MAX_SCAN geeft bij verzadiging `current` terug (CalendarEngine:130) — vandaar de verzonnen datum ~2 jaar verderop.

### [BEVESTIGD] Uurkalender zonder werkbanden — (c) middel, mechanisme klopt (leesniveau)
`hasWorkingDays()` (`:95-97`) kijkt naar `workDays`, niet naar `workTime.byWeekday`; `addWorkMinutes` breekt af op `if (!band) break;` (`:488`). Niet end-to-end door de store gedraaid, maar het pad is dwingend.

### [BEVESTIGD, met correctie] `dfsVisit`-stackoverflow — (b), maar de drempels kloppen niet
Geïsoleerd gemeten: een FS-keten gooit **`RangeError` al bij ~4500 knopen** (4000 OK, 4500 THREW) in Node v22 — niet "8.000 OK / 10.000 RangeError". Mechanisme klopt; de drempel is ~de helft van wat geclaimd wordt en is stack-/versieafhankelijk. **State-intact bevestigd**: na de throw is `tasks.length` ongewijzigd en `cpmResult` niet overschreven. (b) verdedigbaar, al leunt "stille dode F5" richting (c).

### [BEVESTIGD, met correctie] Undo-stack O(n²) — (c) hoog terecht, maar "524 MB" is opgeblazen
Gemeten: N=800 → `undoStack.length=802`, **150 MB geserialiseerd / 346 MB heap** (niet 524 MB). N=1600 → `JSON.stringify(undoStack)` gooit **`RangeError: Invalid string length`** — bevestigd. `addTask` superlineair (3→6→14 ms bij 400/800/1600).

Twee nuances die het rapport mist: (1) 524 MB is 1,5–3,5× te hoog; (2) de `Invalid string length` treft `JSON.stringify(undoStack)` — een **meet-artefact**, want de app serialiseert de undo-stack nergens zelf (`'none'` in het documentcontract). De échte schade is geheugenopblazing + kwadratische `addTask`, niet een crash-pad.

### [BEVESTIGD] `);`-corruptie — (c) kritiek terecht
Round-trip via de echte store: naam `Levering (beton); wk 12`, dur 7 → **naam `'Levering (beton`, dur 5, `wbsCode` weg**; controle `Beton besteld wk 12` → correct; notitie met `);` → **verdwenen**; lege naam → **`$`**. De stille duurwijziging 7→5 exact gereproduceerd. `splitArgs` (die wél `inString` kent) draait pas ná de truncatie en kan het niet meer redden. Dit is óók het auto-save-pad.

### [BEVESTIGD] NaN-gaten — alle vier reëel
`setZoom(NaN)` → `zoom = NaN`, geen exception; `setScroll(NaN,NaN)` → beide NaN; `setTaskProgress(id,NaN)` → `completion` én `remainingTime` NaN; duur `NaN` → `ef===es`, `scheduleDuration=NaN` blijft in de store, `error===undefined`. Alle vier (c)-labels terecht; fix triviaal (`Number.isFinite`-guards).

## Ernst-classificaties
Geen valse (c) gevonden. Het rapport **overdrijft severity nergens**; waar het misgaat is puur kwantitatief (dfsVisit-drempel 2× te hoog, undo-geheugen ~2–3× te hoog, `Invalid string length` als crash geframed). De enige te heroverwegen classificatie is dfsVisit (b) — de stille F5 zonder feedback heeft een (c)-smaak, maar state-veiligheid + pathologische invoer rechtvaardigen (b).

## Kon ik niet (volledig) controleren
De UI/prestatie-claims in §6 (`resourceNames`-timings, `TableEditor`-virtualisatie, RTL-`textAlign`) — deels expliciet "vereist echte browser"; blijven [VERMOED]. De recovery-claims (§4.1, §5.1, §5.2) — niet in de verifieerlijst. Uurkalender-zonder-banden — leesniveau. De exacte `addTask`-timings @5k/10k — gemeten tot 1600; trend klopt, absolute getallen liggen lager.

## Poortoordeel: **JA**
Inhoudelijk betrouwbaar: de hoofdclaim is hard bewezen (431→311, fix → 431/431 in zeven zones, exit 0), en elke nagelopen (c)-bevinding reproduceert. Drie getallen corrigeren vóór het als eindproduct de deur uit gaat:
1. dfsVisit-drempel: **~4000 OK / ~4500 RangeError**, niet 8.000/10.000 — of laat exacte getallen weg.
2. undo-stack: **~150 MB geserialiseerd / ~346 MB heap** bij 800 taken, niet 524 MB; en `Invalid string length` is een meet-artefact, geen app-crashpad.
3. §1.1: vermeld dat de NY-uitval breder is dan de zes genoemde categorieën.

Geen van deze raakt de severity of de fix-volgorde. De conclusies en prioritering (parseDate #1, `);` #2, recovery #3) staan als een huis.
