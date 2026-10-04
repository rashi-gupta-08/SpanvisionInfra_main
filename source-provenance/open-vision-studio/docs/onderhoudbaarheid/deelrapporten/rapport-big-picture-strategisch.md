# Strategisch onderhoudbaarheidsrapport — Open Planner Studio

**Meetbasis** (repo-stand 2026-07-25, `main` + worktree-branch). Waarschuwing vooraf: de lokale git-historie is **shallow** (140 commits, 2026-07-13 t/m 2026-07-24). Trends over langere tijd komen daarom uit de changelog, de GitHub-releases en de PR-lijst, niet uit `git log`.

| Grootheid | Gemeten |
|---|---|
| `src/` TypeScript | 249 bestanden, **49.860 regels** |
| Rust (`src-tauri/src`) | **83 regels**, 3 commands (2 ongebruikt) |
| i18n | 56 JSON-bestanden, 920 kB, ~1.124 sleutels × 14 talen |
| In-app documentatie | **350 markdown-artikelen** (25 × 14 talen), 2,8 MB in `public/docs` |
| Ontwerpdocs | 1,5 MB in `docs/superpowers/` (49 bestanden) |
| Testsuite | `tests/planning/` — 395–429 cases + 16 check-batterijen |
| Releases | **16 versies**, v2026.2.0 (23-02) t/m v2026.7.12 (23-07); 13 daarvan in juli |
| PR's #1–#24 | **allemaal** door `Nozzit`; eerste PR 2026-05-01 |
| Issues | 10, waarvan 5 van externe melders (NL/EN/DE) |
| CI-secrets | 12 unieke, over 4 ondertekenings-/deployketens |

---

## 1. Het ontwikkelmodel: bus factor 1, AI-uitvoering, docs als kennisdrager

**Obs. 1 — De bus factor is hard 1, en er is nul externe codebijdrage.** Alle 24 PR's komen van één GitHub-identiteit; `git shortlog` geeft 123 + 2 commits op die identiteit en 15 op `Claude`. Er zijn wél externe *aanbiedingen*: issue #17 eindigt met "happy to … contribute a first MPXJ-based MSPDI adapter as a PR", issue #21 met "er volgen binnenkort een aantal PR's". Geen van beide is uitgekomen. Geen `CONTRIBUTING.md` in de root. De drempel voor buitenstaanders is reëel hoog: werkvoertaal Nederlands, 50k regels, en een ontwerpdoc-cultuur van 1,5 MB.

**Obs. 2 — Het model levert uitzonderlijke doorlooptijd op.** ~50.000 regels productiecode in ~12 weken, 13 releases in juli. Issue #23 (vector-PDF) gemeld op 21-07, uitgeleverd op 23-07 — twee dagen van gebruikerswens tot getekende installer. Dat is het sterkste argument om het model níet af te zwakken.

**Obs. 3 — Waar het model sterk is: compile-afgedwongen contracten en data-gedreven tests.** `tsc --strict` als de facto lint; `tests/planning/` draait de echte store + solver headless met voorgerekende verwachtingen; `check-ifc-roundtrip.ts` gebruikt een omgekeerd-getest `KNOWN_GAPS`-patroon — precies het soort mechanisme dat een agent níet stil kan omzeilen; `extTypes.ts`/`extMappers.ts` ontkoppelen het publieke extensiecontract compiler-afgedwongen. Bovengemiddeld volwassen voor een project van 3 maanden.

**Obs. 4 — Waar het model kwetsbaar is: PLAN.md is als "source of truth" volledig gedreven.** `CLAUDE.md:79` noemt PLAN.md "source of truth for roadmap". Geverifieerd tegen de code beschrijft PLAN.md §3–§4 een applicatie die **niet bestaat**: `web-ifc` + `ifc-rs`, een Rust CPM-solver, een Python `mcp-server/`, Vitest + Playwright, `pnpm`, `documentStore.ts`, slices `selectionSlice`/`filterSlice`/`leanSlice`. Nul hits in `src/` en `package.json`. PLAN.md draagt nergens een "verouderd"-markering. Dit is de klassieke docdrift→agentdrift-val. CLAUDE.md en AGENTS.md zijn daarentegen wél scherp bijgehouden — de drift zit geconcentreerd in juist het document dat als bron van waarheid wordt aangewezen.

**Obs. 5 — Procesbewijs van fragiliteit.** `docs/superpowers/HANDOFF-2026-07-20-poorten-ongedraaid.md` beschrijft een sessie die halverwege haar uitvoerrechten verloor met vier ongecommitte, individueel-groene maar nooit gecombineerd-geverifieerde pakketten. Het herstel was een handgeschreven draaiboek. De "poorten groen"-discipline is sessiegebonden en menselijk-bewaakt, niet mechanisch afgedwongen.

## 2. IFC 4.3 als native formaat met een handgeschreven STEP-parser

**Obs. 6 — De strategische waarde is echt en verdedigbaar.** IFC-native is de enige claim in de feature-matrix waar élke concurrent een streepje heeft. Alle domeindata round-trippt aantoonbaar. Reëel bezit, geen marketing.

**Obs. 7 — Maar de parser is een regex van 22 regels en is string-literal-blind.** `parseSTEP` (`ifcReader.ts:99-122`) splitst op `'DATA;'`, stript `/*…*/` globaal en matcht entiteiten met een regex — zonder te weten waar een string begint of eindigt. Uitgevoerd met een 1-op-1-replica; vier faalmodi met volgens ISO 10303-21 legale invoer:

| Taaknaam | Resultaat |
|---|---|
| `Fase A); sloop` | argumenten afgekapt |
| `beton /* let op */ C30` | wordt stil `beton  C30` |
| `meting DATA; blok` | **0 entiteiten** — bestand leest als leeg |
| `rapport ENDSEC; deel` | **0 entiteiten** |

De writer beschermt hier niet tegen (`ifcStr` escapet alleen de apostrof), dus **OPS schrijft zelf bestanden die het niet kan teruglezen**. Dit raakt óók auto-save/crash-recovery.

**Obs. 8 — Een library is nú niet het antwoord, een échte tokenizer wel.** De afwijzing van IfcOpenShell/MPXJ (TODO.md §3.8: JVM strijdig met de lichte architectuur) is correct. `web-ifc` (WASM) is geoptimaliseerd voor geometrie, niet `IfcWorkSchedule`, en kost megabytes voor een probleem dat met ~150 regels correcte tokenizer op te lossen is. **Eigen parser houden = juiste strategie; de huidige regex-implementatie niet.**

**Obs. 9 — De echte lock-in-vraag is niet lezen maar semantiek.** Dertien `OPS_*`-psets dragen alles wat IFC 4.3 niet kent. "Geen vendor lock-in" is waar op bestandsniveau, gedeeltelijk waar op datainhoud: het bestand opent in Synchro/BlenderBIM met verlies van precies de onderscheidende features. Eerlijk te communiceren nuance.

## 3. Dual-product desktop + productie-web

**Obs. 10 — De `isTauri()`-splitsing is verrassend goed ingedamd.** 54 verwijzingen over 16 bestanden, één definitie, alle Tauri-imports dynamisch. Geconcentreerd in vier runtime-gedispatchte diensten (`fileAccess/`, `recovery/`, `updater/`, `feedback/`). Feature-gedetecteerd, niet browser-gedetecteerd. Beste beheerste van de vier grote keuzes; niet herzien.

**Obs. 11 — De distributiecomplexiteit is disproportioneel.** 5 workflows, 496 regels YAML, 12 secrets over 4 onafhankelijke ketens: minisign, Azure Trusted Signing (6 secrets), SSH-deploykey, Snapcraft. `release.yml` bevat fragiel handwerk ("re-sign updater artifacts after Authenticode signing"); TODO.md bevat een handmatige `latest.json`-napatch-stap. Historisch bewijs: v2026.7.6/.7 hadden een kapotte Windows-updater die zichzelf niet kon repareren.

**Obs. 12 — Snap is nu een liability zonder gebruikswaarde.** Store-registratie nooit gedaan (geen kanaal); in een strict snap kán de in-app updater niet werken en de "updater overslaan"-detectie voor snap is nog niet af. Een vijfde distributiekanaal dat alleen onderhoud kost.

## 4. Roadmap versus capaciteit

**Obs. 13 — De roadmap is ~24× groter dan wat af is.** PLAN.md telt **285 open checkboxes tegen 12 afgevinkte**; TODO.md ~187 open items. Fase 3–6 (Lean/LPS, EVM, kosten, 4D/5D BIM, Monte Carlo, MCP-server, ERPNext, CRDT-multi-user, SSO, mobiel, white-label) is voor één maintainer nooit realiseerbaar. Dit is geen roadmap maar een marktinventarisatie die als roadmap is opgeschreven.

**Obs. 14 — De feitelijke prioritering gebeurt elders en is verstandig.** De 16 releases tonen diep-en-smal bouwen: fase 2.1–2.10 volledig af vóór fase 3 begon. De discrepantie is niet slechte prioritering, maar dat PLAN.md die prioritering niet weerspiegelt en daardoor als stuurdocument onbruikbaar is.

**Obs. 15 — Assets versus liabilities.** *Assets:* de CPM/kalender-engine met suite; de IFC-round-trip met KNOWN_GAPS; `fileAccess`; het registrypatroon. *Liabilities:* **de 14 talen** (duurste: elke string ×14; ~190 kB gzip dood gewicht eager geladen; een merge met 14 locale-conflicten; issues alleen in nl/en/de), de **350 doc-artikelen**, de **vector-PDF-export** (eigen typografie-engine voor één exportknop), de **Snap-keten**.

**Obs. 16 — Eén architectonische schuld blokkeert drie roadmap-items tegelijk.** "Vereist store-singleton-refactor" staat bij: split view met twee documenten, live cross-project solve, en impliciet bij issue #19 (resources over meerdere projecten). De single-active documentSlice-keuze was juist bij invoering, maar is nu de rem op multi-project — precies wat een aannemer met tien bouwstromen wil.

## 5. Schaalbaarheidsgrenzen

**Obs. 17 — De harde muur staat rond 1.000–2.500 taken en is gemeten.** Uit `docs/superpowers/prestatie-modulariteit-audit.md`: bij een groot bestand is `readIFC` 134 ms en **`runCPM` 9.350 ms — 98,6% van de wachttijd**. Oorzaak: `workDaysBetween` scant dag-voor-dag met ~1,26 mln stringallocaties per solve; effectief O(n²) (1.000→2.500 taken = 15,9× duurder). 2.500 taken = 21,4 s per solve. Kosten schalen met Σ spelingspanne in kalenderdagen, niet met taakaantal.

**Obs. 18 — Snapshot-undo is de tweede muur.** `createSnapshot` op de Immer-draft is 7,6× duurder dan op plain state (145 ms bij 5.000 taken); geen cap op `undoStack` (gemeten: 258 MB heap na 50 bewerkingen op 5.000 taken); `DateTextInput` commit per toetsaanslag.

**Obs. 19 — Is dat erg voor de doelgroep? Deels.** Renderer gezond (culling, 0,4 ms), IFC lineair. Voor MKB (50–500 taken) geen probleem. Voor het segment waar OPS zich tegen P6 positioneert (infra/GWW, 2.000–5.000 taken) is de app vandaag onbruikbaar — terwijl PLAN.md P6 juist aanvalt op "trage performance bij >5.000 taken". Positief: één keten in één functie, geen architecturale herbouw; de perf-audit heeft de attributie al gedaan.

## 6. Ecosysteem en externe afhankelijkheden

**Obs. 20 — Runtime-afhankelijkheden opvallend mager: 30 productiedeps.** Geen chart-lib, datum-lib of UI-kit. Voor een eenmansproject precies goed.

**Obs. 21 — Grootste continuïteitsrisico's, in volgorde:** (1) **de minisign-sleutel** — private helft alleen als GitHub-secret; verlies = geen enkele installatie kan ooit nog updaten; enige onherstelbare SPOF. (2) **GitHub-monocultuur** — releases, updater-endpoint, CI én extensiecatalogus aan één account. (3) **Azure Trusted Signing** — betaalde dienst, expiratie breekt Windows-releases. (4) **`deploy-site.yml` in een andere repo** (`OpenAEC-Foundation/github`). (5) Snapcraft — nog niet eens geactiveerd.

**Obs. 22 — Extensiesysteem contractueel netjes, ecosysteem leeg.** Permissie-afdwinging gecentraliseerd; eerlijk gedocumenteerd dat `filesystem`/`network` "installatie-informatief" zijn (geen sandbox-garantie). Verdedigbaar zolang de catalogus Foundation-gecureerd is; zodra derden publiceren is het een niet-waar te maken beveiligingsclaim. Vandaag nul externe extensies.

**Obs. 23 — Er is beginnende, internationale tractie.** Vijf externe melders in drie weken uit vier landen; reactietijd op #23: twee dagen. Precies het moment waarop een project contributors aantrekt óf verliest.

---

## Strategische aanbevelingen

**A1 — Ontmantel PLAN.md als "source of truth" en vervang hem door een expliciet snoeibesluit.** Banner boven §3–§4 (met de vier bewezen onwaarheden benoemd), architectuur naar CLAUDE.md/AGENTS.md, "source of truth" naar docs/TODO.md. Snoei: fase 3.1 + 3.8 actief, 3.2/3.3 vraaggestuurd, **5.3 en 6.1–6.4 expliciet bevriezen**. *Trade-off:* PLAN.md is ook verkoopdocument — behoud §2/§9 als marktanalyse.

**A2 — Vervang de STEP-regex door een echte tokenizer, vóór alle nieuwe features.** ~150 regels karakter-scanner + testbatterij met de vier bewezen faalgevallen. Enige gevonden zwakte met **stil dataverlies in het eigen formaat**; raakt ook crash-recovery. *Trade-off:* tokenizer trager dan regex — met 134 ms van 9.484 ms is er ruimte zat.

**A3 — Behandel de solverprestaties als productbeslissing.** (a) `workDaysBetween`/`isWorkDay` naar voorberekende werkdag-prefixsom per kalender; (b) `createSnapshot` op plain state + harde cap op undo/redo. Publiceer daarna een expliciete grens ("ontworpen tot N taken"). *Trade-off:* prefixsom-invalidatie is echte complexiteit — maar dit is de zwaarst geteste module; hier betaalt de suite zich uit.

**A4 — Bevries de taalportfolio op de gebruikte talen en maak de rest opt-in.** nl/en/de met leveringsgarantie; overige 11 community-onderhouden met Engels-fallback (mechanisme bestaat al); locales lazy laden (~190 kB winst); docs nl/en canoniek. *Trade-off:* "14 talen" is een echte badge — dit is een positioneringsofferte; alternatief is 14 houden en drift expliciet accepteren.

**A5 — Verklein de distributiekegel van vijf kanalen naar drie, en verzeker de minisign-sleutel.** (a) private sleutel offline op een tweede plek; (b) Snap: registreren + updater-detectie bouwen óf archiveren; (c) `latest.json`-notes-stap automatiseren. *Trade-off:* Snap laten vallen kost Linux-zichtbaarheid; AppImage + .deb + web dekken het praktisch.

**A6 — Maak van de eerste externe bijdragers een tweede paar handen, of accepteer bewust een soloproduct.** CONTRIBUTING.md (Engels), `good first issue`-labels, reageer op #17 met de al genomen MPXJ-beslissing. *Trade-off:* menselijke contributors zijn in een AI-model duur; solo blijven is legitiem — maar dan als opgeschreven besluit.

**A7 — Behandel de store-singleton-refactor als de enige geplande architecturale investering.** Sleutel tot split view, cross-project solve en resourcepooling (issue #19). *Trade-off:* raakt de hele state-laag; niet doen vóór A2/A3, en niet zonder eerst het "één veld erbij"-contractprobleem te sluiten.

---

**Samenvattend eerlijk oordeel.** Voor een 3 maanden oud eenmansproject een ongewoon goed onderhouden codebase: schone laagscheiding, pure zwaar-geteste scheduler, nette web/desktop-splitsing, en structurele zelf-audits die scherper zijn dan wat de meeste teams produceren. De risico's zitten niet in codekwaliteit maar in drie strategische scheefheden: een PLAN.md die niet meer met de werkelijkheid correspondeert, een onderhoudsportfolio (14 talen, 350 artikelen, 5 kanalen, eigen PDF-typografie) dat sneller groeit dan één maintainer kan dragen, en twee gemeten prestatiemuren die precies het marktsegment afsnijden waartegen het product zich positioneert. Alle drie oplosbaar met gerichte besluiten; geen vereist architecturale herbouw.
