# Hyperkritische review — deelrapport big picture strategisch

De analyse wijst in de goede richting — de vier grote scheefheden bestaan echt — maar het **bewijsapparaat is niet leverbaar**: de meest geciteerde tabel klopt in twee van de vier rijen niet, de headline-bus-factor-statistiek is 2× opgeblazen, en twee van de zeven aanbevelingen spreken hun eigen observatie tegen.

## 1. De parser-faalmodi-tabel is voor de helft verkeerd, en mist de ergste vector — [BEVESTIGD]

Obs. 7 nagebouwd tegen de **echte** `writeIFC`→`readIFC` (headless, drie taken):

```
0 baseline (controle)      taken=3  :: "Eerste taak" | "gewone taak" | "Derde taak"
1 haakje+puntkomma         taken=3  :: "Eerste taak" | "'Fase A"     | "Derde taak"
2 comment-syntax           taken=3  :: "Eerste taak" | "beton  C30"  | "Derde taak"
3 DATA; in TAAKNAAM        taken=1  :: "Eerste taak"
4 ENDSEC; in TAAKNAAM      taken=1  :: "Eerste taak"
6 DATA; in PROJECTNAAM     taken=0  proj="Geïmporteerd Project"
8 ENDSEC; in PROJECTNAAM   taken=0  proj="Geïmporteerd Project"
```

Rij 3 en 4 claimen "0 entiteiten — bestand leest als leeg". Werkelijk: **1 van de 3 taken**. Niet minder erg — *erger* (een leeg bestand valt op, een bestand dat een derde teruggeeft niet) — maar het verkeerde faalgedrag opgeschreven.

Waar "0 entiteiten" wél vandaan komt is gemist: `ifcWriter.ts:113` interpoleert `project.name`/`author`/`company` **rauw** in `FILE_NAME`, zonder `ifcStr`. `DATA;`/`ENDSEC;` in de projectnaam zet die tokens vóór de echte sectiegrens → nul entiteiten, alles weg. En een gewone apostrof levert al een kapotte header: `FILE_NAME('Ton's project.ifc',...)`. OPS gooit de header weg en merkt niets; elke correcte IFC-parser wél. `Van 't Hof BV` als bedrijfsnaam levert dus een bestand op dat Synchro/BlenderBIM niet hoeft te accepteren — een gat in Obs. 6/9.

**Gevolg voor A2:** de "~150 regels karakter-scanner" (reader-zijde) dicht rij 1, 2 en de apostrof — **niet** rij 3/4/6/8. Die zitten in de sectiedetectie vóór de tokenizer én in de writer.

## 2. "Alle 24 PR's" — het zijn er 12 — [BEVESTIGD]
`list_pull_requests(state=all)`: PR #1–8, 11, 14, 20, 24 = twaalf. GitHub deelt de nummering met issues. De belangrijkste bus-factor-statistiek is verdubbeld. Dát ze alle twaalf van `Nozzit` komen klopt wel. Bijkomend: `DutchSailor` (auteur van issue #17, het MPXJ-aanbod) stond als **requested reviewer** op PR #1–4 — geen anonieme buitenstaander. Zowel "nul externe codebijdrage" als "vijf externe melders" leunen op die persoon als extern. Repo: 5 sterren, 0 forks.

## 3. De "24× groter dan wat af is" is een ongeldige gevolgtrekking — [BEVESTIGD]
285/12 klopt, maar de 12 vinkjes staan allemaal in Fase 2.5. Alle 46 vakjes van Fase 1 — "Gantt Canvas renderer", "CPM forward pass", "IFC 4.3 reader", "Undo/redo" — staan **open** terwijl ze aantoonbaar draaien. De ratio meet documentonderhoud, niet opleveringsgraad. En Obs. 14 ("fase 2.1–2.10 volledig af") spreekt Obs. 13 direct tegen: dat zijn 62 open vakjes die volgens Obs. 14 niet open zijn.

## 4. A1 snoeit 12% en houdt precies het item actief dat Obs. 13 onmogelijk noemt — [BEVESTIGD]
A1's bevriezing (5.3 + 6.1–6.4) = **35 van de 285**. A1 zegt niets over heel Fase 4 (4D/5D BIM, Monte Carlo, claims — 34 vakjes), 5.1 MCP-server (8), 5.4 (7), 5.5 (7), 6.5 (5) — terwijl Obs. 13 "4D/5D BIM, Monte Carlo, MCP-server" letterlijk als onrealiseerbaar noemt. En A1 zet **fase 3.1 (Lean/LPS, 15 vakjes) actief** — het eerste item in Obs. 13's onmogelijk-lijst. Geen trade-off, een tegenspraak binnen anderhalve pagina. Bovendien mengt A1 drie nummerruimtes (`§2/§9`, `fase 3.1/5.3`, `TODO.md §3.8`) zonder namespace, terwijl PLAN.md een echte `§5.3` náást `Fase 5.3` heeft.

## 5. De perfcijfers zijn verkeerd gelabeld en A3 mist de derde muur — [BEVESTIGD]
Uit de audit (`:74`): 2500 taken → `solve()` **5.393 ms**, store `runCPM()` **21.354 ms**. Obs. 17 schrijft "2.500 taken = 21,4 s per solve" — factor 4 mis op het getal waar de hele §5-conclusie op staat.

Belangrijker: de audit noemt een **derde**, onafhankelijke hotspot (`:125`): `B2 — O(n²) WBS-nummering, flattenOrder (utils/wbs.ts:10-29)`, goed voor `addTask` **16,2 s** en `deleteTask` **7,3 s** bij 5000 taken — het *bewerk*pad, dat élke toevoeging treft, ook zonder F5. A3 laat 'm ongenoemd; de "één functie"-geruststelling is onjuist.

Obs. 19's "renderer gezond (0,4 ms)" is selectief: dezelfde audit noemt de **niet-gecullde pijlenlaag 84-96% van een render** (`:127`). En de audit zet er zelf boven dat absolute ms **indicatief** zijn en dat 2500/5000 in de browser **openstaand** is — het rapport verkoopt ze als "gemeten". De audit zegt óók dat de kosten schalen met Σ spelingspanne en **niet** met taakaantal, wat Obs. 17's kop ("harde muur rond 1.000–2.500 taken") tegenspreekt; het rapport citeert beide en verzoent ze niet.

## 6. "CLAUDE.md is wél scherp bijgehouden" — nee — [BEVESTIGD]
Suite zelf gedraaid, exit 0: **431/431**. `CLAUDE.md:19` zegt 395/21 — 36 cases achter. Het rapport ontwijkt dit met een *bereik* ("395–429"). Obs. 4's contrast tussen gedrifte PLAN.md en scherpe CLAUDE.md houdt niet.

Ook: van de spookstack kloppen acht van negen (`web-ifc`, `ifc-rs`, `documentStore`, `selectionSlice`, `filterSlice`, `leanSlice`, `vitest`, `pnpm`, `mcp-server`: nul hits). **Playwright bestaat wel** (`.mcp.json`, `main.tsx:24`, `devBridge.ts:17`) — één van de vier "bewezen onwaarheden" die A1 in een banner wil zetten is geen onwaarheid.

## 7. Het project is ~6 maanden oud, niet 3 — met een gat van 4 maanden — [BEVESTIGD]
Repo aangemaakt **2026-01-17**. v2026.2.0 (2026-02-23) is de "first public release (seed)" en bevat volgens zijn eigen changelog al Gantt-canvas, CPM, IFC-lezen/schrijven, ribbon, tabeleditor, rapportpaneel én 14 talen. Daarna **niets tot v2026.6.0** (2026-06-24). Dat sloopt "~50.000 regels in ~12 weken" en "3 maanden oud": de werkelijke doorlooptijd is een **julipiek**, geen steady state — wat §4's capaciteitsanalyse optimistischer maakt dan verdedigbaar (en de conclusie van §4 juist versterkt).

## 8. Meetbasis-telfouten — [BEVESTIGD]
Productiedeps **23** (niet 30); unieke CI-secrets **11** (niet 12); `docs/superpowers/` **43** bestanden (niet 49); `OPS_*`-psets **17** (niet 13); suite 431 cases / 21 case-batterijen.

**Wel exact en behouden:** 249 bestanden / 49.860 regels src; 83 regels Rust; 56 i18n-bestanden / 920 kB / 1124×14; 350 doc-artikelen / 2,8 MB; 285 vs 12 checkboxes; 187 TODO-items; 5 workflows / 496 regels YAML; 16 releases waarvan 13 in juli; isTauri 54/16 en **nul** top-level Tauri-imports; geen CONTRIBUTING.md; snap onregistreerd; latest.json-notes-stap open; extensie-permissies letterlijk "geen sandbox-garantie"; store-singleton 2× in TODO; ~190 kB locale-dood-gewicht.

## 9. A5 rekent niet — [BEVESTIGD]
"Vijf kanalen naar drie", maar de drie deelacties leveren maximaal −1 (Snap). Vijf naar vier, in het gunstigste geval. De trade-offzin ("AppImage + .deb + web dekken het praktisch") laat Windows en macOS stilzwijgend uit de telling verdwijnen, terwijl Azure Trusted Signing in Obs. 21 als risico #3 staat.

## 10. Kleinere gaten
- **[VERMOED · hoog]** "v2026.7.6/.7 kapotte Windows-updater": de changelog documenteert v2026.7.1 (draft-URL) en een uitpak-bug hersteld in 7.8 zónder getroffen versies. Het paar 7.6/.7 staat nergens.
- **[VERMOED · hoog]** "minisign private helft **alleen** als GitHub-secret" is met repo-materiaal principieel niet vast te stellen; label als aanname.
- **[BEVESTIGD]** Obs. 21 #4 onderschat: `live.yml` roept een reusable workflow uit een andere repo aan, gepind op een **branch** — een onbeveiligde supply-chain-hefboom op de productiedeploy.
- **[BEVESTIGD]** A4's "Engels-fallback (mechanisme bestaat al)" verzwijgt de scherpe rand waarvoor `check-i18n-plurals` (909 checks) juist bestaat: i18next valt bij een ontbrekende pluralcategorie niet terug binnen dezelfde taal maar naar `fallbackLng` — dus Engels midden in een Poolse dialoog. "Community-onderhouden met fallback" = gemengde taal per scherm, niet per taal.
- **[BEVESTIGD]** "eigen typografie-engine voor één exportknop": het is 2.025 regels over `src/services/pdf/` bovenop pdf-lib/fontkit/bidi-js, en bedient drie rapporttypes. Classificatie verdedigbaar, karakterisering is retoriek.
- **[BEVESTIGD]** "123 + 2 + 15 op Claude" suggereert twee bijdragers; het zijn 123 Nozzit + 2 Ethan de Wit op **hetzelfde e-mailadres** + 17 Claude — dezelfde persoon plus diens agent. Versterkt de conclusie, leest als het tegendeel.

## Kon ik niet controleren
Of de IFC-faalmodi zich in browser/Tauri identiek gedragen (headless gedraaid); de perfcijfers zelf (tegen de audit gelegd, niet hermeten); de landen van de externe melders; of de minisign-sleutel elders bestaat; de infra/GWW-vs-MKB-marktbewering — die komt uit PLAN.md §9 (het verkoopdocument dat A1 zelf onbetrouwbaar noemt) en hangt volledig aan de verkeerd gelabelde 21,4 s.

## Poort: **NEE**
De richting deugt, de uitvoering niet. Minimaal vóór doorgang: (1) Obs. 7 vervangen door echte repro-uitvoer + de header/projectnaam-vector toevoegen; (2) A2 uitbreiden met sectiedetectie en writer-escaping; (3) "24 PR's" → 12 en DutchSailor herclassificeren; (4) "24×" schrappen of herformuleren + de tegenspraak met Obs. 14 oplossen; (5) A1 herschrijven (prune-lijst uitbreiden tot Fase 4 + 5.1/5.4/5.5, de 3.1-tegenspraak oplossen, één nummerruimte); (6) runCPM ≠ solve corrigeren en **B2 (`flattenOrder`, addTask 16,2 s)** aan A3 toevoegen, "renderer gezond" nuanceren met de pijlenlaag; (7) telfouten repareren en de suite dráaien (431/431, CLAUDE.md loopt achter); (8) projectleeftijd naar ~6 maanden met het releasegat; (9) A5's telling laten kloppen. Punten 1, 3, 5 en 6 zijn blokkerend.
