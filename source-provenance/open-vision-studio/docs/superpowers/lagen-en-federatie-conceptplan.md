# Conceptplan — lagen & federatie (IFC 5-geïnspireerd, IFC 4.3-gedragen)

**Status: CONCEPT — wacht op akkoord. Geen code aangeraakt.**
Datum: 2026-07-20 · Aanleiding: IFC 5-onderzoek (repo-duik + deep-research, zie geheugen `ifc5-status-2026-07`)

## 1. Aanleiding & kern

Het IFC 5-onderzoek leverde twee conclusies op:

1. IFC 5 is een alpha zonder proces-/planningsdomein — er is níets om nu op te bouwen.
2. Het achterliggende **lagenmodel** (meerdere auteurs stapelen data over hetzelfde model zonder elkaars werk te overschrijven) is wél precies wat 4D-planning conceptueel is: tijd als laag over andermans geometrie.

Dit plan haalt dat idee binnen **zonder op IFC 5 te wachten**: alles hieronder is draagbaar op IFC 4.3 (onze native standaard) en op onze bestaande architectuur. Drie sporen, oplopend in ambitie; elk spoor is los waardevol en los te stoppen.

## 2. Wat we al hebben (feitelijke basis)

Belangrijk voor de scope: een deel van de gevraagde modulariteit bestaat al.

| Bestaand | Waar |
|---|---|
| Kalenderbibliotheek (meerdere kalenders per document, project-default via `project.calendarId`) | `projectSlice` (`s.calendars`, `setProjectCalendarId`) |
| Per-taak en per-resource kalenderkeuze | `task.calendarId`, `resource.calendarId` |
| Meerdere schedules in één IFC-bestand (baselines als `.BASELINE.`-`IfcWorkSchedule`-headers + `OPS_Baselines`-pset) | `ifcWriter.ts` (fase 2.6/§8.3) |
| Multi-document met payload-swap (basis voor "meerdere bronnen open") | `documentSlice` |

De vraag "kalenders en resources als aparte modules" is intern dus al half beantwoord; wat ontbreekt is (a) **deelbaarheid over bestanden/projecten heen** en (b) **koppeling aan externe modellen**.

## 3. Spoor A — IFC 4.3-federatie: planning als losse laag over een extern model

*Het interop-spoor. Standaardconform, geen speculatie.*

**Doel:** een 3D-/deelmodel van een derde (architect, constructeur) koppelen zonder het te importeren of te wijzigen. Ons IFC blijft het planningsbestand; de koppeling loopt via GlobalId's — het IFC 5-lagenidee, uitgevoerd in IFC 4.3.

Onderdelen:

- **A1 — Extern model koppelen (referentie, niet kopie).** Backstage → "Modelkoppeling": kies een `.ifc`; we parsen alleen de elementboom (GlobalId, naam, type, spatiale structuur) en tonen die als koppelbron. Het bronbestand wordt nooit herschreven.
- **A2 — Taak↔element-koppeling.** `task.linkedElementIds: string[]` (GlobalId's). In IFC uitgeschreven als `IfcRelAssignsToProcess` naar `IfcProxy`-verwijzingen mét bron-GUID, plus een `OPS_`-pset als autoritatieve JSON (ons beproefde verliesloze patroon). UI: koppelpaneel + telling/badge op de taakbalk.
- **A3 — Herkoppel-detectie.** Bij herladen van het externe model: rapport van verdwenen/nieuwe GUID's (renovatievarianten, modelversies). Alleen detectie + rapport in dit spoor; geen automatische healing.

**Waarde:** dit is de opstap naar echte 4D (element-gekoppelde planning) en direct verkoopbaar richting BIM-workflows. **Niet in scope:** geometrie renderen — we koppelen aan de elementboom, niet aan een 3D-viewport.

## 4. Spoor B — interne lagen: bibliotheken en scenario's als stapelbare modules

*Het ontwerpspoor. Raakt de kern van de store; hier zit het echte ontwerpvraagstuk.*

**B1 — Deelbare bibliotheken (kalenders & resources) — direct antwoord op de gestelde vraag.**
Een "bibliotheekbestand" (bedrijfskalenders, resourcepool) dat los van projecten leeft en door elk document gebruikt kan worden.

- Opslag: een gewoon IFC 4.3-bestand met alléén `IfcWorkCalendar`s/resources + `OPS_`-pset (round-trip-conform; ook door andere tools leesbaar), in `appDataDir` of een door de user gekozen map.
- Gebruik: bij projectstart of via Instellingen "bibliotheek koppelen"; kalenders/resources verschijnen naast de projecteigen entries, herkenbaar gelabeld.
- **Beslispunt B1a — kopie of referentie?** Kopie-bij-gebruik (simpel, geen sync-problemen, maar drift) vs. live referentie (krachtig, maar introduceert een tweede waarheid + wat bij ontbrekend bibliotheekbestand?). Voorstel: **kopie-bij-gebruik met herkomst-stempel** (`sourceLibraryId` + versie), en een "bijwerken vanuit bibliotheek"-actie. Dat is het lagenidee zonder de sync-hel.

**B2 — Scenario's als lagen (kalender-/planvarianten).**
Basisplanning + schakelbare overlay: "winterkalender", "alternatieve bezetting", "versnelde volgorde". Een laag = een benoemde set overrides (kalenderswap, duur-/relatie-wijzigingen) die non-destructief over het basisplan ligt; aan/uit + vergelijken (twee CPM-runs naast elkaar, verschil in einddatum/kritiek pad).

- Eerlijke waarschuwing: dit raakt snapshot-undo, `runCPM`, de renderer en de IFC-round-trip tegelijk. Baselines (read-only fotomomenten) bestaan al; scenario's zijn *bewerkbare* varianten — een wezenlijk zwaarder concept.
- Voorstel: B2 pas ontwerpen ná B1, en starten met **alleen kalender-overrides** (kleinste zinvolle laag: zelfde taken, andere kalenders ⇒ andere data) vóór generieke plan-overrides.

## 5. Spoor C — `.ifcx`-experiment (geparkeerd voor het planningsdomein, maar de familie shipt de serialisatielaag al)

Voor óns domein blijft de conclusie: geen bouwwerk nu — er is geen procesdomein in IFC5 en niets dat onze planningslaag kan lezen. Maar de zusterprojecten-scan (§6) nuanceert het beeld: **open-calc-studio en Open-Calculations-Studio schrijven en lezen IFCX al productief** (naast IFC 4.3 STEP). De serialisatielaag is in de familie dus geen speculatie meer; alleen het planningsdomein erin ontbreekt.

- Consequentie: als OPS ooit `.ifcx` oppakt, is dat geen greenfield — hergebruik de familie-conventies (namespaced keys als `ifcx::ocs::…`; wij zouden `ifcx::ops::…` voeren) en de bestaande generator/importer-patronen uit open-calc-studio als referentie. Geen eigen namespacing verzinnen die daarmee botst.
- Sporen A en B leveren exact de datastructuur (planning als laag met verwijzingen naar extern model + benoemde overlay-sets) die 1-op-1 op een toekomstig `.ifcx`-lagenmodel past. Dat is de echte voorbereiding.
- Monitorsignalen (halfjaarlijkse check): proces-/taakklassen in de IFC5-voorbeelden of -schema's, een `process`-module op ifcx.dev, issues/labels over het tijddomein, uitslag van de Standards Committee-stemming (gesloten 8-8-2025, uitkomst onbekend).

## 6. Aansluiting bij de OpenAEC-zusterprojecten (scan 2026-07-20)

Alle 50 org-repo's geïnventariseerd; 10 relevante publieke repo's gecloned en doorzocht (bewijs met bestandspaden in de scanresultaten; private repo's als `Open-Infra`, `openaec-geonl`, `open-energy-studio` konden niet worden ingezien — mogelijk relevant, onbevestigd).

**Wat er al bestaat en wat wij hergebruiken:**

| Conventie | Waar in de familie | Betekenis voor dit plan |
|---|---|---|
| **Federatie via IFC GlobalId** | open-calc-studio `src/services/ifc/ifcxFolder.ts` (mapfederatie: siblings gekoppeld op gedeelde `ifcGuid`); OpenAEC-BIM-validator `viewer/src/types/project.ts` (multi-model project, elementen gekeyd op `globalId` + `modelId`, per-model zichtbaarheid) | Spoor A sluit naadloos aan; `analyzeIfcxFolder` en het validator-datamodel zijn concrete startpunten voor A1/A2. GlobalId is de familie-conventie — bewust kiezen boven monty's Revit-`Mark`-sleutel. |
| **Bibliotheken = app-niveau opslag, níet in de project-round-trip** | open-calc-studio `codeLibrarySlice.ts` (codebibliotheek in localStorage, app-breed) | Bevestigt B1a-voorstel: de bibliotheek zelf leeft op app-niveau; alleen de gebruikte kopie (met herkomststempel) gaat mee in het project-IFC. Zo blijft "IFC = native format, geen sidecar" intact. |
| **Distributie via `catalog.json` op GitHub raw (30-min cache)** | open-calc-studio én OPS delen al een identieke `CatalogEntry`-shape | Wil je bibliotheken (bedrijfskalenders/resourcepools) ooit publiek delen, dan via ditzelfde mechanisme — geen nieuw distributiekanaal. |
| **IFCX naast IFC 4.3 STEP** | Open-Calculations-Studio exporteert beide vanuit dezelfde bron (`packages/core/src/ifc-generator.ts`) | Bewijs dat dual-format haalbaar is; relevant zodra spoor C ontwaakt (zie §5). |
| **4D/model-koppeling bestaat één keer in de familie** | monty-ifc-viewer (`src/addons/bouwvolgorde/`): fases↔elementen via Speckle + Revit-`Mark` | Referentiepunt, geen voorbeeld: Speckle-afhankelijk en `Mark`-gebaseerd — wij blijven IFC-4.3-native met GlobalId. Wel het bestaande "planning ↔ 3D"-ijkpunt om tegen te toetsen. |
| **Scenario's/overlays: geen precedent** | niemand (open-3d-studio heeft alleen per-model-zichtbaarheid; fasering staat daar op de roadmap) | Spoor B2 is greenfield binnen de familie — geen conventie om te volgen, dus ontwerpen we zelf, en mogelijk wordt óns ontwerp de familie-conventie. |

**Praktisch hergebruik bij nieuwe onderdelen:** design tokens uit `@openaec/ui` en de org-brede conventie-CI (`check-conventions.yml` via repo-cleaner) meenemen waar van toepassing.

## 7. Fasering & volgorde

```
A1 → A2 → A3          (interop-spoor; A2 is de kern, A3 kan wachten)
B1 ───────→ B2-kalenders → B2-generiek   (ontwerpspoor; B1 los van A te doen)
C: monitoren (geen bouw)
```

A en B zijn onafhankelijk; B1 is het kleinste zelfstandig waardevolle stuk en het directe antwoord op de kalender/resources-vraag. Voorgestelde eerste stap na akkoord: **B1 + A1 samen ontwerpen** (beide zijn "extern bestand koppelen" — één UI-taal, één herkomst-model), dan per stuk een echt implementatieplan met testplan.

## 8. Impact per gebied (grof)

| Gebied | A1/A2 | B1 | B2 |
|---|---|---|---|
| Store/slices | nieuw `linkedModel`-deel + `task.linkedElementIds` | herkomstvelden op kalender/resource | nieuw laagconcept door de hele state |
| IFC round-trip | `IfcRelAssignsToProcess` + `OPS_`-pset | bibliotheek-IFC lezen/schrijven | overlay-serialisatie (ontwerp nodig) |
| UI | koppelpaneel, Backstage-sectie | Instellingen/bibliotheekbeheer | laagschakelaar, vergelijkweergave |
| `runCPM`/renderer | geen | geen | ja, wezenlijk |
| `tests/planning/` | round-trip-cases | round-trip-cases | nieuwe casecategorie |

Risico's: GUID-stabiliteit bij externe modellen (A3 is daarom geen luxe), bibliotheek-drift (gedempt door kopie-met-stempel), en B2-scope-creep (gedempt door kalender-only start).

## 9. Beslispunten voor akkoord

1. Volgorde akkoord? (B1 + A1 eerst, B2 later, C blijft monitoren — maar met de familie-namespace-conventie als vastgelegd uitgangspunt)
2. B1a: kopie-met-herkomststempel als bibliotheekmodel? (gesterkt door het familie-precedent: bibliotheek op app-niveau, alleen de kopie in de project-round-trip)
3. A: elementboom-koppeling zónder 3D-weergave als bewuste scopegrens? (monty's Speckle-route is het alternatief; voorstel: niet volgen)
4. Bibliotheekopslag: app-beheerd (`appDataDir`/localStorage, familie-conventie) of user-gekozen map (deelbaar via netwerk/git)? Voorstel: app-beheerd starten, export/import als deelmechanisme, `catalog.json`-distributie pas als daar vraag naar is.
