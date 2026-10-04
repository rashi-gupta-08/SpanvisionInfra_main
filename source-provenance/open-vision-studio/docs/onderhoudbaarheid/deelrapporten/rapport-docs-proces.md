# Rapport — documentatie, ontwikkelproces, release-keten & extensie-ecosysteem
**Open Planner Studio** · onderzocht op commit `850b17e` (2026-07-24), versie `2026.7.12`

## Samenvatting vooraf

De **inhoudelijke** kwaliteit is bovengemiddeld: uitstekende changelog, consequente conventional commits, grote groene testsuite (431/431 geverifieerd), eigen `verify:docs`-poort, eerlijk gedocumenteerd extensie-permissiemodel. De slechte helft is **structureel**: geen LICENSE-bestand ondanks LGPL-3.0-claims, agent-instructies met aantoonbaar onjuiste beweringen, `PLAN.md` §4 beschrijft een niet-bestaande mappenstructuur, de release-keten heeft vijf handmatige naloopstappen waarvan er bij de laatste release twee zijn overgeslagen, en de bus factor is 1.

## A. Documentatie-actualiteit

### 1. Geen LICENSE-bestand, terwijl LGPL-3.0 op vier plaatsen wordt geclaimd — **HOOG**
`find . -iname "LICEN*"` leeg; `git log --all -- LICENSE COPYING` leeg; GitHub-API: geen `license`-veld. Toch claimen `README.md:114`, `README.md:8` (shield-badge), `PLAN.md:1603-1605`, `CLAUDE.md:33` en `docs/wiki/Contributing.md:3,71` LGPL-3.0. Zonder licentiebestand is de code juridisch alle-rechten-voorbehouden; Contributing laat bijdragers instemmen met een licentie die nergens is vastgelegd.
> **Voorstel.** `LICENSE` (LGPL-3.0 volledige tekst + COPYING.LESSER), `"license": "LGPL-3.0-or-later"` in package.json, SPDX-headers-conventie.

### 2. `CLAUDE.md`/`AGENTS.md` beschrijven een dev-server die niet meer bestaat — **HOOG**
`CLAUDE.md:8` claimt "Vite dev server (port 3007, strictPort … OPS_DEV_PORT)". Werkelijkheid: `package.json:7` → `node scripts/dev-server.mjs` — per-worktree gepersisteerde poort (3007–3106) via `dev-port.mjs` onder flock (`dev-lock.mjs`), gestempeld in `.claude/launch.json` (`opsDevPort`), met een guard die een tweede start weigert. De dual-guard-machinerie landde 2026-07-23, ná de laatste CLAUDE.md-actualisatie (2026-07-20). Ook `README.md:44` en `docs/wiki/Contributing.md:35` verouderd; `docs/self-test-harness.md` heeft het wél goed.
> **Voorstel.** Alle vier bijwerken naar de werkelijke semantiek; overweeg één canonieke bron voor de commandotabel.

### 3. Testsuite-aantallen stelselmatig verouderd (395/21 → werkelijk 431/22) — **MIDDEL**
`CLAUDE.md:19` zegt 395/21; README-badge zegt 395/395; werkelijk: **431/431 over 22 batterijen** + 16 `check-*.ts` met ~7.900 extra assertions. Historie: v2026.7.7 noemde 319, v2026.7.8 369, HANDOFF 429, CLAUDE.md 395 — een handmatig getal op vier plaatsen gaat structureel mis.
> **Voorstel.** Getal machineleesbaar uit `run.sh` genereren; uit CLAUDE.md verwijderen.

### 4. "No unit-test runner" klopt niet: `tests/dev-server/` gebruikt `node:test` — **MIDDEL**
Vijf `.test.mjs`-bestanden op `node:test` + twee shell-integratietests. Zie ook bevinding 12: ze draaien nergens.
> **Voorstel.** Doc herschrijven; tests in CI draaien.

### 5. Ribbon-tabs en Backstage-secties in `CLAUDE.md` incompleet — **MIDDEL**
CLAUDE.md noemt 8 tabs; `types.ts:79` definieert er 10, `Ribbon.tsx:41` rendert er 9 — `relations` ontbreekt in de doc. Backstage: doc noemt 7 secties, code heeft er 9 (`examples` en `help` ontbreken — `help` is een compleet documentatiesubsysteem).
> **Voorstel.** Verwijzen naar de type-definities i.p.v. kopiëren, of de lijst opnemen in `verify-docs.ts`.

### 6. Een compleet documentatiesubsysteem (350 bestanden) ontbreekt in CLAUDE.md/AGENTS.md/README — **HOOG**
`public/docs/`: 25 artikelen × 14 talen + manifest, voedt de in-app helpviewer (F1) én de GitHub-wiki (`publish-wiki.mjs`). Eigen CI-poort `verify:docs` (319 regels, blokkeert in `ci.yml:73`). Nul verwijzingen in CLAUDE.md/AGENTS.md/README; ook `gen:examples`, `verify:examples`, `verify:docs`, `publish:wiki` ontbreken in de commandotabellen. Een agent die een feature bouwt weet niet dat er een 14-talige handleiding mee moet.
> **Voorstel.** Sectie "In-app documentatie & wiki" in CLAUDE.md + commandotabel aanvullen.

### 7. `PLAN.md` §4 "Mappenstructuur" beschrijft een codebase die niet bestaat — **HOOG**
CLAUDE.md verklaart PLAN.md tot "source of truth". Maar §4 (`PLAN.md:564-821`, 257 regels) bevat een gedetailleerde boom waarvan o.a. `src/api/`, `src/state/documentStore.ts`, `selectionSlice/filterSlice/leanSlice`, `TimelineRenderer/GridRenderer/DependencyRenderer/LOBRenderer/NetworkRenderer`, `FloatCalculator/MonteCarloSim`, `IntervalTree` **niet bestaan**. §10.3 claimt "Vitest unit tests" — vitest zit niet in package.json. Gevaarlijk omdat de boom plausibel genoeg is dat een agent hem als feit aanneemt.
> **Voorstel.** Banner "AANGENOMEN ONTWERP, GEEN BESCHRIJVING VAN DE CODE" boven §4/§10, of §4 wegknippen en naar AGENTS.md verwijzen; §10.3 corrigeren.

### 8. `docs/superpowers/` is geen "actieve" map meer — archiveringsdiscipline ingezakt — **MIDDEL**
CLAUDE.md beschrijft 5 onderwerpen; werkelijk 31 specs + 5 plans + 5 losse docs (~950 kB), overgrote deel al opgeleverd (terug te vinden in CHANGELOG v2026.7.3–.8). `docs/archive/superpowers/` bevat maar 5 bestanden (mei 2026). Scherpste voorbeeld: `HANDOFF-2026-07-20-poorten-ongedraaid.md` opent met "AFGEWERKT — dit draaiboek is verbruikt" en staat in de actieve map. Totaal 56 md / 26.980 regels in docs/ tegenover 49.860 regels code.
> **Voorstel.** Archiveringsronde op basis van de changelog; archivering als verplichte stap in de release-skill.

### 9. `docs/TODO.md` is de best onderhouden doc — met één contractbreuk — **LAAG**
Actueel (2026-07-23), 187 open items, gedateerd, met verworpen hypotheses. Contractbreuk: regel 9-10 belooft dat afgeronde items verwijderd worden, maar er staat één `- [x]`-item met ~25 regels verslag.
> **Voorstel.** Restpunt naar een eigen open item; rest verwijderen conform eigen contract.

### 10. `README.md` mist een ribbon-tab en beschrijft een verouderde mappenstructuur — **LAAG**
Ribbon-tabel mist Resources en Relaties; de projectstructuur-boom mist `src/extensions/`, `fileAccess/`, `recovery/`, `benchmark/`, `updater/`, `feedback/`, `pdf/`, `engine/calendar/`, `engine/view/`, `tour/`, `task-sections/`, `viewControls/`, `public/docs/`.
> **Voorstel.** README trimmen tot stabiele inhoud; boom naar AGENTS.md verwijzen.

### 11. Doc-rot in de broncode: Rust-moduledoc spreekt zichzelf tegen — **LAAG**
`mod.rs:3-5` claimt "er staat nergens `invoke()` in `src/`" — onwaar (`updaterService.ts:44-45`); `mod.rs:30-32` zegt 35 regels lager het correcte tegendeel.
> **Voorstel.** One-liner-fix.

## B. Release-keten

### 12. `tests/dev-server/` draait nergens — **MIDDEL**
Geen npm-script, geen CI-stap. Vers (2026-07-23), bewaakt poortallocatie/flock-races die stil breken.
> **Voorstel.** `test:dev-server`-script + CI-stap.

### 13. Geen poort controleert of de tag-versie overeenkomt met package.json/tauri.conf.json — **HOOG**
`release.yml:26-33` leidt de versie alleen uit de git-ref af. Vergeet je `npm run bump`, dan bouwt release v2026.7.13 binaries die 2026.7.12 dragen en een `latest.json` met de oude versie — de release is **stil onzichtbaar** voor alle bestaande installaties (updater vergelijkt gelijk). Andersom: eeuwige updateloop.
> **Voorstel.** Blokkerende versie-vergelijkingsstap in `create-release` (5 regels bash). Goedkoopste hoog-rendement-fix van het rapport.

### 14. Vijf handmatige naloopstappen ná de tag-push — twee bij de laatste release aantoonbaar overgeslagen — **HOOG**
Release-skill stappen 13–17 zijn handmatig ná de onomkeerbare tag-push. Bij v2026.7.12: release-body is de hardgecodeerde placeholder uit `release.yml:46`, en `latest.json` heeft `"notes": ""` — de in-app updater toonde een **lege** wijzigingsomschrijving. v2026.7.7–.11 hadden wel handgeschreven notes. Taal wisselt bovendien per release (EN/NL/EN-boilerplate).
> **Voorstel.** Release-notes vóór de tag committen als `release-notes/vX.Y.Z.txt`; `publish-release` leest dat bestand voor body + `latest.json`; blokkeer bij ontbreken.

### 15. `publish-release` await de API-aanroep niet — race op de publicatie — **MIDDEL**
`release.yml:265-273`: `github.rest.repos.updateRelease({...})` zonder `await`/`return`. Bij een netwerkfout faalt de stap niet: job groen, release blijft draft, niets zichtbaar voor gebruikers.
> **Voorstel.** `await` + verificatie (release opnieuw ophalen, throw als draft) + assetcontrole (~14 assets, latest.json met 3 platforms).

### 16. Een gedeeltelijk mislukte release is niet herstartbaar — **HOOG**
`createRelease` faalt bij een tweede run met 422 already_exists → alle downstream-jobs overgeslagen. Met `fail-fast: false` uploadt de Linux-leg bovendien assets naar de draft terwijl macOS faalt → half gevulde draft die de retry blokkeert. Geen faalscenario-sectie in de release-skill.
> **Voorstel.** `create-release` idempotent (getReleaseByTag → hergebruik id); herstelrecept documenteren.

### 17. `npm install` i.p.v. `npm ci` in ci.yml én release.yml — **MIDDEL**
`ci.yml:45,62`, `release.yml:92,124` gebruiken `npm install`; alleen `live.yml:25` doet `npm ci`. Installers kunnen dus gebouwd zijn met andere dependency-versies dan de lock vastlegt.
> **Voorstel.** Vier keer `npm ci`; `cache: npm` op setup-node.

### 18. `snap.yml` en `release.yml` racen met een harde 30-minutenmuur — **MIDDEL**
Beide op `push: tags: v*`; snap.yml pollt 60×30s op de `.deb`. macOS-universal + Windows-signing duren regelmatig >30 min; geen `needs:`-relatie mogelijk (losse workflows). Erger: `snap.yml:88-94` publiceert naar de **Snap Store** zodra de deb er is, zonder te checken of release.yml slaagde — faalt de Windows-leg, dan is de versie wél live in de Snap Store terwijl de GitHub-release draft blijft. CLAUDE.md:73 beschrijft dit misleidend als "daarna".
> **Voorstel.** Samenvoegen als job met `needs:`, of `workflow_run`-trigger met success-gate; Snap-publicatie afhankelijk maken van een gepubliceerde release.

### 19. De minisign-signeersleutel is een onvervangbaar SPOF zonder gedocumenteerde procedure — **HOOG**
Pubkey ingebakken in elke binary (`tauri.conf.json:60`); private key alleen als GitHub-secret. Nergens gedocumenteerd: back-up, houders, rotatie. Verlies = geen enkele bestaande installatie kan ooit nog updaten. Daarnaast zes Azure-secrets + SNAPCRAFT-credentials zonder eigenaar/vervaldatum (Azure-client-secrets verlopen na 6–24 mnd → Windows-signing breekt geruisloos).
> **Voorstel.** `docs/release-secrets.md`: bewaarplek (offline, ≥2 houders), vervaldata + agenda, rotatie-runbook, dubbel-pubkey-migratiepad.

### 20. macOS-builds worden niet ondertekend of genotariseerd — **MIDDEL**
Wel Azure Trusted Signing voor Windows; geen APPLE_*-secrets/notarisatie voor macOS. Gebruikers krijgen Gatekeeper-blokkade; nergens gedocumenteerd (ook niet op de wiki-Installation-pagina).
> **Voorstel.** Notarisatie inrichten, of expliciet documenteren mét workaround.

## C. Scripts

### 21. `bump-version.js` is voorbeeldig — maar dekt de keten niet af — **LAAG**
Sterk: CalVer-validatie, tekst-gebaseerde vervanging, verwacht-aantal-check, anker-regex voor de lock. Gat: geen commit/tag/`--check`-modus; `snapcraft.yaml:4` draagt een derde versie die via `sed` in snap.yml wordt overschreven — twee mechanismen.
> **Voorstel.** `--check`-vlag + aanroep in release.yml (bevinding 13); snapcraft-versie door bump laten zetten.

### 22. `scripts/` is een ongesorteerde verzameling van 21 bestanden — **MIDDEL**
Naast productieve scripts ook: `i18n-apply-wave6.mjs` (77 r.) + `i18n-translations-wave6.mjs` (569 r.) — eenmalige golf; `example-topologies.json` (117 kB); generator-bestanden (109 kB). Geen scripts-README. Moderne scripts zijn wel goed (nooit-blokkeren-contracten, cleanup-handlers).
> **Voorstel.** Wave6-scripts verwijderen; generators naar `scripts/generators/`; `scripts/README.md` met per script één regel.

### 23. `scripts/` en `tests/` worden niet getypecheckt — 7.900 regels TS buiten de poort — **MIDDEL**
`tsconfig.json:23` → `include: ["src"]`. 25 `.ts`-bestanden in scripts/tests draaien via esbuild (strips types zonder check). Uitzondering: `tsconfig.roundtrip.json` dekt precies één bestand. Een refactor in src/ breekt een check pas at runtime; `verify-docs.ts` (CI-blokkerend) heeft geen typecontrole.
> **Voorstel.** `tsconfig.tools.json` (scripts+tests, zelfde strictness) als extra CI-stap.

## D. Extensiesysteem

### 24. Geen versioneringscontract voor de extensie-API — **HOOG**
Manifest kent alleen `minAppVersion` (ondergrens). De app gebruikt CalVer — draagt per definitie geen breaking-change-signaal. Een extensie met `minAppVersion: 2026.4.0` activeert vrolijk op 2027.3.0 na drie API-wijzigingen. Bij de verwijdering van de `commands`-permissie (audit P16) was de oplossing "stil wegfilteren" — extensies falen stil.
> **Voorstel.** Los `apiVersion`-veld (semver), weiger/waarschuw bij major-mismatch, documenteer garanties per major in docs/extensions.md.

### 25. Interne types lekken in het extensie-API-contract — **MIDDEL**
De `Ext*`-DTO-laag (extTypes.ts 257 r., extMappers.ts 497 r.) is het juiste ontwerp, maar twee lekken in `types.ts`: `:8/:103` exposeert de interne `RibbonTab`-union (die NL/EN mengt — `beeld`, `instellingen` — en dus hernoemd gaat worden) als publiek API; `:9/:169` exposeert `CjkFontProvider` uit de pdf-internals. En de 497 regels mappers hebben geen compile-afdwinging op volledigheid (i.t.t. check-ifc-roundtrip).
> **Voorstel.** Eigen `ExtRibbonTab`/`ExtFontProvider` in extTypes + mapping; `check-ext-contract.ts` met `satisfies Required<Ext*>`.

### 26. Sandbox + catalogus vormen samen een toeleveringsketen-risico — **MIDDEL** (technisch hoog, verzacht door eerlijke documentatie)
`new Function(...)` same-context met toegang tot window/fetch/localStorage en (Tauri) dynamisch importeerbare plugin-fs/-shell; `csp: null`. Catalogus + `installFromCatalog` doen `fetch(entry.downloadUrl)` → uitvoeren, **zonder checksum/handtekening**. Compromittering van het catalogus-repo = code-uitvoering op elke installerende machine. Verzachting: dit staat overal eerlijk gedocumenteerd; het permissiemodel zelf is netjes.
> **Voorstel.** `sha256` per catalogusentry + verificatie (~15 regels); niet-null CSP; op termijn iframe/Worker-isolatie.

## E. Governance

### 27. Bus factor 1, geen CONTRIBUTING, geen issue-/PR-templates — **HOOG**
`git shortlog -sn --all`: Nozzit 123 van 140 (88%); CODEOWNERS: `* @Nozzit`; geen ISSUE_TEMPLATE/, PULL_REQUEST_TEMPLATE, CODE_OF_CONDUCT, SECURITY.md, CONTRIBUTING.md in de root (wel `docs/wiki/Contributing.md` — de enige plek waar GitHub hem niet toont). Inconsistentie: CODEOWNERS wijst `@Nozzit`, `auto-assign-issues.yml:16` wijst `DutchSailor`. Geen disclosure-kanaal terwijl de app installers + code-uitvoerend extensiesysteem distribueert.
> **Voorstel.** CONTRIBUTING.md-root (of bron omdraaien: repo=bron, wiki=gegenereerd), SECURITY.md, issue-templates, CODEOWNERS/auto-assign gelijk trekken, tweede release-bevoegde documenteren.

### 28. Commitberichten en branch-hygiëne goed — wat achtergebleven takken — **LAAG**
Consequent conventional commits mét aanleiding en issue-verwijzingen — beter dan gemiddeld. Drie achtergebleven `claude/*`-takken, waarvan één al gemerged via PR #20.
> **Voorstel.** "Automatically delete head branches" aan; takken opruimen.

## F. Tweetaligheid

### 29. Het taalbeleid is grotendeels bewust — maar niet vastgelegd, en CLAUDE.md is de grootste overtreder — **MIDDEL**
Impliciet consistent: NL = commentaar/commits/interne docs; EN = changelog (expliciet beargumenteerd), wiki, public docs (EN+NL bron). Misgaat: (1) CLAUDE.md/AGENTS.md mengen talen binnen alinea's (sedimentatie per bewerkingsronde); (2) release-notes wisselen per release van taal; (3) beleid staat nergens.
> **Voorstel.** Taalbeleid-tabel bovenaan CLAUDE.md; release-notes-taal vastleggen in de skill; CLAUDE.md/AGENTS.md in één taal.

## G. Rust-kant

### 30. De shell is inderdaad extreem dun — claim klopt — **positief**
83 regels totaal; Cargo.toml compact met uitstekende zip-pin-motivatie; `0.1.0` vierdubbel gedocumenteerd.
> **Voorstel.** Geen; evt. `#![forbid(unsafe_code)]`.

### 31. `read_file`/`write_file`: dode code met verzwakkend excuus én een security-oppervlak — **LAAG**
Ongebruikt maar aanroepbaar vanuit de webview, zonder padvalidatie. In combinatie met bevinding 26: een kwaadaardige extensie kan er elk bestand mee lezen/schrijven, buiten de plugin-fs-scopes om.
> **Voorstel.** Uit `invoke_handler` halen; serde/serde_json opruimen.

### 32. `tauri.conf.json`: klein en beheersbaar — met `csp: null` — **LAAG**
`csp: null` (`:52`) = geen vangnet (zie 26). Windows-signeervelden bewust leeg (Azure draait na de build) maar dat is niet-evident.
> **Voorstel.** Minimale CSP; toelichting in de release-skill-gotcha-tabel.

## Prioriteitsvoorstel

**Deze week:** 1. LICENSE (#1) · 2. versiepoort release.yml (#13) · 3. npm ci ×4 (#17) · 4. await publish-release (#15) · 5. CONTRIBUTING+SECURITY (#27)
**Deze maand:** 6. CLAUDE.md/AGENTS.md actualiseren (#2,3,4,5,6) · 7. release-notes automatiseren (#14) · 8. create-release idempotent (#16) · 9. PLAN.md §4/§10 (#7) · 10. tests/dev-server in CI (#12)
**Structureel:** 11. apiVersion extensie-API (#24) + types-lek (#25) · 12. sha256 catalogus (#26) · 13. secrets-runbook (#19) · 14. archiveringsronde (#8) · 15. tsconfig.tools.json (#23) · 16. taalbeleid (#29)
