# Releaseteksten

Eén bestand per release: `v<versie>.md`, met **alleen de "What's New"-inhoud** — geen kop, geen
Downloads-blok, die worden aangebouwd.

`scripts/release-notes.mjs` maakt er de twee vormen van die de release nodig heeft:

| | |
|---|---|
| `--format=body` | markdown + het vaste Downloads-blok → de GitHub-releasepagina |
| `--format=notes` | platte tekst → het `notes`-veld in `latest.json`, wat de updater-dialoog toont |

De updater-dialoog rendert geen markdown, vandaar dat `notes` gestript wordt. Schrijf de tekst dus
zo dat hij zonder opmaak leesbaar blijft.

`release.yml` roept het script op twee plekken aan: `create-release` voor de body en
`publish-release` voor `latest.json`. Ontbreekt het bestand voor de getagde versie, dan valt de
release terug op de generieke tekst en een leeg `notes`-veld — de `gate`-job logt daar een warning
voor, vóór de build.
