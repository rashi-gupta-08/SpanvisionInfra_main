# Spec — B1: bedrijfsbibliotheken voor kalenders & resources

> **GEARCHIVEERD (2026-07-23).** Het UX-model in deze spec (add/update-dialogen, Backstage-poolbeheer, promote-flow) is **vervangen** door de bedrijfscentrische omkering in `docs/superpowers/specs/2026-07-23-b1-1-bedrijfscentrisch-model-design.md` — dát is de geldende bron. Alleen het fundament (§2 concepten, §5 opslag, §6 IFC-round-trip) blijft van kracht. Bouw of plan NIETS op basis van dit document.

Datum: 2026-07-20 · Status: gearchiveerd — UX-model vervangen door B1.1
Aanleiding: conceptplan lagen & federatie (spoor B1) + [issue #19](https://github.com/OpenAEC-Foundation/open-planner-studio/issues/19) (resources over meerdere projecten).

## 1. Doel

Eén centrale plek per **bedrijf** waar kalenders en resources leven, buiten de projecten om. Projecten van dat bedrijf putten eruit; wat een project gebruikt wordt een **bewerkbare kopie mét herkomststempel** in het project zelf. Een gedeeld projectbestand is daardoor altijd compleet en zelfstandig ("gebeiteld": zelfstandig, níet read-only).

Niet in deze spec (bewust): het bezettings-/dubbelbezettingsoverzicht over open projecten (vervolg "B1b", bouwt op de herkomststempels uit deze spec — en blijft strikt binnen één bedrijf/pool: bedrijfsoverstijgende histogrammen/overzichten komen er niet, besluit user 2026-07-20); gedeelde opslag/sync tussen machines (zie §8).

## 2. Kernconcepten

- **Bedrijf**: een door de user benoemde groepering met een eigen pool. Er bestaat altijd automatisch één standaardbedrijf ("Mijn bedrijf"); de bedrijfsselector verschijnt pas in de UI zodra er ≥2 bedrijven zijn — eenpitters zien het concept nooit.
- **Pool**: de verzameling bibliotheekkalenders en -resources van één bedrijf, met `poolVersion` (monotoon oplopend bij elke wijziging) en `modifiedAt`.
- **Herkomststempel** op een projectkopie: `{companyId, libraryItemId, poolVersion}` — maakt "bijwerken vanuit bibliotheek", duplicaatherkenning en (later, B1b) resource-identiteit over projecten mogelijk.
- **Projectbinding**: het project onthoudt zijn bedrijf (`companyId` + naam) in het projectbestand; heropening zonder die pool is onschuldig (alles werkt, alleen "bijwerken" is dan niet beschikbaar).

## 3. Gedrag

**Toevoegen aan een project.** Via de projectwizard (naast de bestaande kalender-presets/sjablonen) en in een lopend project via de resource-/kalender-UI ("toevoegen uit bibliotheek"). Toevoegen kopieert het item met stempel. Afhankelijkheden reizen mee: een resource met eigen `calendarId` brengt die kalender mee; bestaat er in het project al een kopie met dezelfde herkomst, dan wordt die hergebruikt, nooit gedupliceerd. Nogmaals toevoegen van een al aanwezig item ⇒ melding "al in project", geen duplicaat.

**Bijwerken vanuit bibliotheek.** Nooit een bulk-overschrijfknop. Per item, met zichtbaar verschil (bibliotheekwaarde naast projectwaarde), user kiest per item. Een projectkopie waarvan het bibliotheekorigineel verwijderd is: project merkt niets; de bijwerkweergave meldt "bestaat niet meer in bibliotheek".

**Beheer.** Backstage krijgt een sectie **Bibliotheek**: bedrijven beheren (aanmaken/hernoemen/verwijderen), pool-inhoud bewerken, promoveren ("zet deze projectkalender/-resource in de bibliotheek" — spiegel van de bestaande `promote`-actie voor kalenders), export/import.

**Bedrijf wisselen op een project** mag en is onschuldig: kopieën blijven; alleen de bijwerk-bron verandert.

## 4. Export, import & demping van het sync-probleem

- **Pool-export**: één bestand per bedrijf. Formaat: IFC 4.3 met alleen `IfcWorkCalendar`s/resources + `OPS_Library`-pset (JSON autoritair, ons beproefde verliesloze patroon) voor stempel-/versiedata. Leesbaar voor derden, consistent met "IFC is het native formaat".
- **Pool-import**: vervangt de héle pool van het gekozen bedrijf, ná expliciete bevestiging (item-voor-item samenvoegen is bewust geen v1-optie — vervangen is voorspelbaar en de bijwerkflow van §3 dekt de fijnmazige gevallen). **Demping (besluit user, 2026-07-20):** als de lokale pool een hogere `poolVersion`/recentere `modifiedAt` heeft dan het geïmporteerde bestand, toont de dialoog een niet te missen waarschuwing ("jouw lokale bibliotheek is nieuwer — importeren kan wijzigingen van jou overschrijven"). Stil overschrijven bestaat niet.
- **Project delen**: projectexport bevat altijd al alle gebruikte items (kernprincipe §1). Extra vinkje **"bibliotheekbestand ernaast opslaan"** schrijft de pool als tweede, los bestand naast het project. Géén embed van de hele pool ín het projectbestand (besluit user, 2026-07-20: voorkomt bestandsvervuiling en verouderde-pool-verspreiding).

## 5. Opslag

Pools zijn bedrijfsdata, geen instellingen ⇒ **niet** in localStorage. Browser: IndexedDB (patroon van het extensiesysteem, eigen database `ops-library`). Desktop (Tauri): bestand(en) in `appDataDir` (patroon van recovery), zodat de data buiten de browserprofiel-levensduur valt. Export (§4) is tevens het backupmechanisme en wordt als zodanig in de UI benoemd.

## 6. IFC-round-trip (projectbestand)

Herkomststempels en `companyId`-binding gaan mee in het project-IFC via het bestaande `OPS_`-pset-patroon (JSON autoritair; golden rule: geen bibliotheekgebruik ⇒ geen extra pset). Andere tools zien gewone IFC 4.3-kalenders/-resources; de stempels zijn voor hen inerte metadata. Round-trip is verliesloos.

## 7. UI-talen & documentatie

Alle teksten via `t(...)`, 14 locales. **Documentatie-eis (user, 2026-07-20):** het sync-probleem (§8.1) wordt expliciet uitgelegd op de plekken waar het speelt — de importdialoog zelf én de gebruikersdocumentatie — inclusief de aanbeveling dat organisaties die ploegen delen over werkmaatschappijen heen bewust één gezamenlijke pool kiezen (zie §8, punt 2).

## 8. Gedocumenteerde beperkingen (bewust niet opgelost in B1)

Beide herleidbaar tot dezelfde wortel — geen gedeelde opslag tussen machines (local-first, geen server) — en op te lossen in één benoemd vervolgproject **"gedeelde opslag/sync"**:

1. **Twee planners, zelfde bedrijf**: pools kunnen uiteenlopen; import-demping (§4) waarschuwt maar kan divergentie niet voorkomen.
2. **Bezettingsoverzicht ziet alleen deze machine** (volle ambitie issue #19): boekingen op andermans machine bestaan lokaal niet.

*Notitie (besluit user, 2026-07-20): dubbelbezetting van een resource tussen lósse organisaties (bijv. een onderaannemer die voor twee aannemers werkt) is bewust géén probleem van ons systeem — dat is het planningsprobleem van die resource zelf. Het speelt alleen binnen één gebruiker die meerdere bedrijven beheert, en dáár is de oplossing organisatorisch: kies één gezamenlijke pool (§7).*

## 9. Testen

- `tsc` groen (build).
- Round-trip-cases: project met gestempelde items ⇒ IFC ⇒ heropenen ⇒ stempels/binding intact; project zonder bibliotheekgebruik ⇒ byte-arm (geen extra psets).
- Pool-export ⇒ import op "schone" staat ⇒ identieke pool (incl. versie).
- Dempingspad: import van oudere pool toont waarschuwing (self-test via `window.__OPS__`/Playwright, conform self-test-harness).
- Edge-gedrag: duplicaat-toevoegen, verwijderd origineel, meereizende kalender — elk één gerichte case.

## 10. Buiten scope

B1b (bezettingsoverzicht over open documenten), gedeelde opslag/sync, catalogus-distributie van pools (kan later via het bestaande `catalog.json`-mechanisme), bedrijfsoverstijgende resource-identiteit, IFCX (eigen traject, wacht).
