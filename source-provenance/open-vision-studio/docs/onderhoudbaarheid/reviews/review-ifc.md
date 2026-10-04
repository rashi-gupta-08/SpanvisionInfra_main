# Hyperkritische review — deelrapport IFC-laag & round-trip

Dit rapport is **fundamenteel gezond**: elke empirische claim is zelf nagedraaid en ze reproduceren vrijwel allemaal exact, tot op het regelnummer. Maar het is te vroeg tevreden — het heeft de tokenizer-bug gevonden en vervolgens de twee ergere varianten ervan gemist, en de voorgestelde fix dicht het gat maar half.

## Zelf gedraaid en bevestigd

**[BEVESTIGD] B1 — `);` corrumpeert stil.** Alle vijf tabelrijen reproduceren letterlijk; alle zes regelverwijzingen exact.

**[BEVESTIGD] B2 — het testvangnet is een maas, de gevaarlijkste bevinding.** Volledige experiment overgedaan: nieuw veld → exact twee compile-fouten → beide "normaal" opgelost → alles groen, exit 0. Scherper nog dan het rapport claimt: **géén enkele andere poort vangt het** — document-contract (200), adapters-hours (127), move-project (123): allemaal groen. Een nieuw domeinveld wandelt langs twee compile-gates én 431 tests zonder één byte te round-trippen. (Tree daarna schoon teruggezet; suite 431/431.)

**[BEVESTIGD] B3 — recovery laat baselines vallen.** End-to-end bewezen: auto-save schrijft `OPS_Baselines`, `readIFC` leest ze, en `payloadFromInput` op de input van `useRecoveryRestore.ts:63-70` levert `baselines: []`. Contra-proef met de velden erbij: 1 baseline. Echte, live bug.

**[BEVESTIGD] B4, B5(a/b/c), B6, B7, B10, B11, B12 (grotendeels).** Header met apostrof = ongeldig STEP; geen `\X2\` in beide richtingen; `$`-duur → 0; `parseDateFromIFC($)` → vandaag; korte vrijdag verdwijnt, split-shift overleeft; `writeCSV` vier ongebruikte params; kalender-bibliotheek superlineair (1000 → 437 ms, 2000 → 1182 ms); `raw` ongebruikt.

## Waar het rapport fout zit

**[BEVESTIGD] B12, laatste bullet is onwaar.** "`verify:examples` draait niet in CI" — `ci.yml:71` draait het wél. TODO.md-regel overgeschreven als geverifieerd feit. Alleen `gen:examples` staat niet in CI.

**[BEVESTIGD] B8 is te mild.** Met de échte `generateId`-vorm: **1 collisie bij 50.000 ids, 5 bij 200.000** — geen toeval maar exact de verjaardagsverwachting bij een 2³²-ruimte (de hele 22-teken-GUID is een functie van één 32-bits hash). "Houdt in de praktijk stand" is de verkeerde conclusie; "breekt aantoonbaar bij grote projecten" is de juiste.

**[BEVESTIGD] Regelref-slip:** de `entries.length === 0`-poort staat op `useRecoveryRestore.ts:84`, niet `:81` (enige onnauwkeurige verwijzing in het rapport).

## Wat het rapport heeft gemist

**[BEVESTIGD] De sectie-split is óók niet string-bewust, en strikt erger dan B1.** `parseSTEP:101` splitst bot op `'DATA;'`/`'ENDSEC;'`. Gemeten met 10 taken: naam `Sloop ENDSEC; hergebruik` → **3 taken** (7 stil verdampt); `Levering DATA; fase 2` → idem. In de **projectnaam**: `Toren ENDSEC; fase` → `tasks=0`, bestand feitelijk onleesbaar = totaalverlies. **De voorgestelde tokenizer-fix raakt regel 101 niet.**

**[BEVESTIGD] De commentaar-strip is de derde string-onveilige laag.** `ifcReader.ts:106`: taaknaam `Sloop /* let op */ klaar` → `"Sloop  klaar"`, stil. Ook buiten de voorgestelde fix. Drie lagen zijn string-onveilig; het rapport ziet er één.

**[BEVESTIGD] Het stille *gedeeltelijke* herstel is erger dan het 0-taken-geval uit B4.** Afgekapte snapshots door de echte `restoreDocuments` + `runCPM`: 70% → 8 taken/0 relaties; **80% → alle 10 taken en 0 van de 9 relaties**; 90% → 10/7. Geen crash, geen melding. Een compleet ogende planning zonder logicanetwerk — de gebruiker heeft geen aanleiding tot twijfel. (Dit bevestigt wel dat de TODO-premisse "laat het opstarten klappen" terecht is weersproken: er klapt niets.)

## Voorstellen die zelf nieuwe schade maken

**[BEVESTIGD] B8's collisiecheck breekt wat hij moet beschermen.** `ifcReader.ts:1302` **herberekent** de GUID uit de interne taskId; suffix je bij het schrijven, dan matcht de remap niet meer en verdwijnt de baseline-koppeling stil. De collisiecheck mag níét vóór de ontkoppeling — volgorde is hier de hele fix.

**[BEVESTIGD] B4's "0 taken = niet aanbieden" introduceert nieuw dataverlies.** Een leeg-maar-echt document (verse wizard, kalender/resources ingericht) is legitiem — en omdat de flow doorloopt naar `clearRecovery()` zou die snapshot ook nog **gewist** worden. Filter op onparseerbaarheid, niet op taakaantal.

**[VERMOED · hoog] B6's `''`-in-plaats-van-vandaag** raakt consumenten die een geldige datumstring aannemen; aparte verbouwing, niet een bijzin. Te bevestigen: datumaannames in solver/renderer uitputtend nalopen.

**[VERMOED · hoog] B7's multi-`IfcWorkTime` breekt achterwaartse compatibiliteit:** oude builds lezen alleen de eerste groep (`break` op `:976`) en repliceren die over de week — nieuw bestand geeft in een oude versie stil een verkeerde kalender.

**[BEVESTIGD] B5(c) is geen one-liner:** naïef `'${ifcStr(project.name)}.ifc'` levert `''O'Hara'.ifc'` — erger dan nu. Het moet `ifcStr(project.name + '.ifc')` zijn.

## Kon ik niet controleren
De Tauri-recovery-paden (alleen codelezing, geen Tauri-runtime); interop tegen echte derde-partij-parsers; de web/IndexedDB-backend; of er écht nergens een checklist-doc bestaat (niet alle ~40 docs uitgelezen).

## Poortoordeel
**Door — als betrouwbaar, met correcties.** Minimaal: (1) B12's CI-bullet schrappen; (2) B1 verbreden naar **drie lagen** (entity-regex `:110`, sectie-split `:101`, commentaar-strip `:106`) — `ENDSEC;` in een projectnaam maakt het hele bestand onleesbaar; (3) B4 uitbreiden met het gedeeltelijke herstel en het "0 taken = weggooien"-voorstel intrekken; (4) B8 herclassificeren (collisies reproduceerbaar vanaf ~50k) en de suffix-fix achter de ontkoppeling zetten; (5) B7's terugwaartse compatibiliteit benoemen. De prioriteitstabel blijft staan, met één correctie: B1 is geen "~30 regels parser" maar drie call-sites en verdient een eigen regressiebatterij vooraf.
