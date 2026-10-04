# Hyperkritische review — deelrapport "docs, proces & release"

Het rapport is **fundamenteel gezond**: de meeste bevindingen reproduceren, de meeste regelverwijzingen kloppen, en de twee belangrijkste release-gaten (geen versiepoort, lege updater-notes) zijn tot op de bytes van `latest.json` nagetrokken. Maar het is **niet af**: het mist de twee grootste gaten in de release-keten, onderbouwt drie faalscenario's met een mechanisme dat aantoonbaar niet klopt, en bevat minstens één verzonnen getal en één verzonnen regelverwijzing — in een rapport dat anderen op stale getallen afrekent.

## Zelf gedraaid/gelezen
`bash tests/planning/run.sh` (exit 0), `node --test` op alle zes dev-server-testbestanden, `node -e` voor het unhandled-rejection-gedrag, `curl` op vier `latest.json`-releaseassets, GitHub-MCP voor releases/branches, plus regel-voor-regel de vier workflows, `mod.rs`/`main.rs`, dev-server-scripts, extensielaag, `bump-version.js`, `snapcraft.yaml`, `tauri.conf.json` en de release-skill.

## Bevindingen — het ergste bovenaan

### 1. GEMIST: `release.yml` draait nul tests. Groter dan de versiepoort (#13). [BEVESTIGD]
Geen van de vier jobs draait de planning-suite, `verify:examples` of `verify:docs`; alleen `beforeBuildCommand` = `tsc && vite build`. En `ci.yml` triggert op branches/PR's — een **tag** matcht geen van beide. Er is dus geen enkel mechanisme dat afdwingt dat de getagde commit ooit groene CI had. Een tag op een commit met rode suite wordt gebouwd, gesigneerd, gepubliceerd en naar alle installaties gepusht. Fix: test-job vooraan in `release.yml`, alles `needs:` daarop.

### 2. GEMIST: `live.yml` deployt productie op elke push naar main, ongegate. [BEVESTIGD]
Geen `needs`, geen `workflow_run`-gate. De 431-case-suite draait parallel en kan rood worden nadat de deploy al gelukt is.

### 3. #14 is onder-gerapporteerd: de lege updater-notes zijn geen 7.12-incident. [BEVESTIGD]
Release-body van v2026.7.12 is byte-voor-byte de placeholder ✓. Maar `latest.json`-notes: 7.12 `""`, **7.11 óók `""`**, 7.10 1264 tekens, 7.9 1611, 7.8 3662. Skill-stap 15 is bij **twee opeenvolgende releases** overgeslagen, stap 14 bij één. Bovendien schrijft `release.yml` `notes` überhaupt nooit (geen `releaseBody`-input aan tauri-action).

### 4. Het fix-voorstel bij #14 werkt niet zoals opgeschreven. [BEVESTIGD]
`publish-release` (`release.yml:254-274`) heeft **geen checkout-stap** — kan geen repo-bestand lezen. En `latest.json` wordt als laatste geschreven door `build-windows`; publish-release zou moeten downloaden, patchen, her-uploaden. Staat er niet.

### 5. #15 (`await`): code klopt, faalscenario niet. [BEVESTIGD dat het niet klopt]
De ontbrekende `await` op `release.yml:268` is echt. Maar "job groen, release blijft draft" houdt geen stand: Node ≥15 behandelt een unhandled rejection als fataal (zelf gedraaid: exit 1 op Node 22), en de open HTTP-socket houdt de event-loop levend. De stap **faalt** — luidruchtig, met een waardeloze stacktrace. Ernst: LAAG-MIDDEL (hygiëne + geen verificatie), niet stille storing. [VERMOED · hoog] dat github-script@v8 dit niet alsnog opslokt — action-source niet nagekeken.

### 6. #16: het 422-mechanisme is waarschijnlijk verkeerd. [VERMOED · midden]
GitHub geeft 422 voor een **gepubliceerde** release op de tag; voor **drafts** mag hetzelfde `tag_name` meermaals — een re-run maakt vermoedelijk een **tweede draft** (assets naar het nieuwe id, halfvolle eerste draft blijft staan). Conclusie ("niet herstartbaar, geen faalscenario-doc") staat; mechanisme onbewezen; ernst HOOG is te hoog (gevolg = handmatige opruimactie).

### 7. #18: juiste conclusie, verkeerde redenering. [BEVESTIGD]
De Snap-Store-publicatie zonder success-gate is echt en ernstig (deb komt uit de **draft**; Windows-leg kan daarna falen; Snap-release is niet in te trekken). Maar de "30-minutenmuur tegenover macOS-universal + Windows-signing" klopt niet: de poll wacht op de deb uit de **ubuntu-leg**, die parallel met macOS draait — de muur staat tegenover één Ubuntu-build.

### 8. #20: "nergens gedocumenteerd" is onwaar. [BEVESTIGD]
`docs/superpowers/plans/2026-06-24-auto-update-cross-platform.md:88-98` documenteert het ontbreken van macOS-notarisatie expliciet, mét reden en kosten. Wat klopt: `docs/wiki/Installation.md` zwijgt erover. De bevinding is "bewuste afweging bereikt de eindgebruiker niet".

### 9. #21: de snapcraft-"derde versie" bestaat niet; het voorstel is schadelijk. [BEVESTIGD]
`snapcraft.yaml:3-4` is een expliciet gelabelde placeholder ("wordt in CI overschreven"). Geen synchronisatieplicht. Het voorstel zou een extra te synchroniseren plek toevoegen. Schrappen.

### 10. Verzonnen getal in #3, verzonnen regelverwijzing in #1. [BEVESTIGD]
"~7.900 assertions" in de 16 check-scripts = in werkelijkheid het regels-getal (7910) uit bevinding #23, hergebruikt als assertion-telling. En `README.md:8` is de Talen-badge; de licentiebadge staat op regel 9 en "claimt" niets (rendert "unknown"). De gemiste vijfde LGPL-claim is `PLAN.md:815` — tegelijk een extra spookbestand voor #7.

### 11. Kleine telfouten. [BEVESTIGD]
Zes (niet vijf) `.test.mjs`-bestanden (alle 30 tests zelf gedraaid, groen); `types.ts:7-8`/`:168` (niet :8/:9/:169); `csp: null` op `tauri.conf.json:55` (niet :52), pubkey `:62` (niet :60); `docs/superpowers` 1,36 MB (niet ~950 kB), `docs/` 62 md / 28.101 regels (niet 56/26.980); shortlog Nozzit 123, Claude 16, Ethan 2 = 141 (niet "van 140").

### 12. Severity-scheefheid: #31 is geen LAAG. [BEVESTIGD]
De keten is aaneengesloten: catalogus zonder checksum → `new Function` in dezelfde realm (geen shadowing van window/fetch/import; `csp: null`) → `window.__TAURI_INTERNALS__.invoke('write_file', {path, contents})` zonder padvalidatie → willekeurig bestand schrijven buiten elke plugin-fs-scope. Het rapport ziet de combinatie en zet er LAAG boven. Minimaal MIDDEL; de twee-regel-fix (`main.rs:21-22` uit de invoke_handler) hoort in de "deze week"-lijst.

### 13. GEMIST: `latest.json` read-modify-write door twee parallelle matrix-legs. [VERMOED · midden]
Ubuntu- en macOS-leg draaien parallel, beide `includeUpdaterJson: true`, zelfde releaseId. De Windows-leg is juist bewust geserialiseerd (comment `:132-134`) — het gevaar was bekend, half opgelost. Vier gepubliceerde latest.json's hebben alle tien platform-sleutels — nog niet gebeten. Te bevestigen: of tauri-action de merge atomair doet.

### 14. GEMIST: het rapport vertrouwt de tail van een suite die de release-skill zelf onbetrouwbaar noemt. [BEVESTIGD]
`SKILL.md:99-100`: "De suite print 'alles groen' óók bij exit 1 — vertrouw op exitcode + `grep ^XX`". `run.sh` zet bij een falende check alleen `STATUS=1`; de harness print daarna onvoorwaardelijk zijn eigen groene totaal. Een procesrapport hoort deze val te benoemen.

### 15. GEMIST: geen `concurrency`-groep op `release.yml`/`snap.yml`. [BEVESTIGD]
`live.yml` heeft er wél een. Twee snelle tags → twee runs tegelijk aan hetzelfde `latest.json`/dezelfde Snap-channel.

## Wat het rapport goed heeft — en dat is veel
Exact gereproduceerd incl. regelnummers: #1 LICENSE (terecht prioriteit 1; LGPL geclaimd op README:114, PLAN:815+1605, CLAUDE:27, wiki-Contributing:3,72); #2 dev-server (scherper nog: CLAUDE.md's "override with OPS_DEV_PORT" doet aantoonbaar het tegenovergestelde — dev-server.mjs óverschrijft de env-var); #3 testtellingen (431/22 zelf gedraaid); #5 tabs/secties; #6 `public/docs` (351 bestanden, nul verwijzingen in drie agent-docs); #7 PLAN.md §4 (plus gemiste extra vitest-claims op :511 en :812); #11 mod.rs-zelftegenspraak; #13 versiepoort; #17 npm install ×4; #19 minisign-SPOF; #22/#23 scripts + tsconfig; #24/#25/#26 extensies; #27/#28 governance; #9, #10, #30, #32.

## Kon ik niet controleren
github-script@v8's rejection-afhandeling; draft-gedrag van createRelease; atomiciteit van tauri-action's latest.json-merge; of de taalwissel per release bewust is; de archiveringsachterstand per document (alleen aantallen + het HANDOFF-bestand geverifieerd).

## Poort
**Nee — niet in deze vorm.** Minimaal vóór doorlaten: (1) de twee gemiste bevindingen toevoegen, beide boven #13 in prioriteit; (2) #14 herschrijven (twee aparte faalstappen, .11 én .12 leeg; fix-voorstel repareren — publish-release heeft geen checkout); (3) #15/#16/#18/#20 corrigeren; (4) #21-snapcraft-alinea schrappen; (5) verzonnen getallen weghalen (7.900, README:8, docs-omvang) en PLAN.md:815 opnemen; (6) #31 opwaarderen naar minimaal MIDDEL mét de expliciete keten en de fix in de "deze week"-lijst. Blok A (op #1's regelverwijzing na), #13, #17, #19, #22–#28 mogen blijven zoals ze zijn.
