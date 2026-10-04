# Spec — B1.1: het bedrijfscentrische model (v3, na critreviews + edge-case-jacht)

Datum: 2026-07-23 · Status: ontwerp v3, ter akkoord user · Vervangt de gebruikerservaring van B1; bouwt op het B1-fundament.
v2 verwerkte drie critreviews (2× modelgetrouwheid, 1× uitvoerbaarheid); v3 verwerkt twee
edge-case-jachten (gebruikersflows + techniek/data). Besluiten gemarkeerd met **(besluit)**.

## 1. Kernprincipe (de omkering)

Een **bedrijf ís een resourcebibliotheek**: dé verzameling resources en kalenders van dat bedrijf.
Alle projecten van dat bedrijf werken vanuit die ene verzameling — één waarheid, gedeeld over
projecten. Een project "gebruikt" een resource door hem **aan een taak toe te wijzen**; dat is de
enige gebruik-handeling. Kopiëren, toevoegen-uit, bijwerken-uit en promoveren bestaan voor de
gebruiker niet meer — die choreografie zakt onder de motorkap.

## 2. Concepten

- **Koppeling project ↔ bedrijf**: zichtbaar en expliciet, ALTIJD — óók bij één bedrijf **(besluit)**:
  wizard en Projectinfo tonen steeds "Bedrijf: Mijn bedrijf ▾ / geen (los project)". **Default =
  het standaardbedrijf voorgeselecteerd (besluit, edge-jacht):** gekoppeld is de norm; de eenpitter
  merkt daar niets van (een lege/kleine pool triggert nooit vragen of verversingen — alle §3/§5-
  mechaniek is inhoudsgedreven). De B1-regel "verberg bedrijfs-UI bij ≤1 bedrijf" vervalt alleen
  voor deze ene regel en blijft gelden voor alle overige selectors.
- **De koppeling pint op `companyId` (besluit)**; het bestaande vrije-tekstveld "company" is
  IFC-opdrachtgever-metadata en krijgt het label "Opdrachtgever/organisatie".
- **Los project**: geen bibliotheek; alles leeft in het bestand — exact de toestand van een
  geëxporteerd/ontvangen bestand. Eén "los"-toestand, geen apart mechanisme.
- **Stempels onder de motorkap**: herkomst {companyId, libraryItemId, poolVersion, **syncedHash**}.
  `syncedHash` **(besluit, edge-jacht)** is een hash van de gevolgde velden op het moment van
  materialisatie/laatste verversing — hiermee is "het bestand is extern bewerkt" te onderscheiden
  van "het bestand loopt gewoon achter op de pool" (§3). Stempels zonder hash (B1-bestanden):
  veilige kant — behandelen als mogelijk extern bewerkt.
- **Stempel-scope (besluit, edge-jacht; aangescherpt in her-toets):** alle verversings-,
  markerings- en afwijkingsmechaniek geldt uitsluitend voor items waarvan
  `stamp.companyId === project.companyId` **én dat bedrijf lokaal bestaat**. Is het
  `companyId` van het project lokaal onbekend (ontvangen bestand, verwijderd bedrijf), dan
  gedraagt het document zich als **los** — geen mechaniek, geen valse "niet meer in het
  bedrijf"-labels. Items met een vreemd stempel (geplakt uit een ander document) doen
  eveneens nergens aan mee: gewoon projectinhoud.

## 3. Waarheid: het verversingsmodel

Kopie-met-verversing op grenzen; consumenten blijven `s.resources` lezen; `s.resources` bevat
nooit de hele pool (alleen gematerialiseerde items) — golden rule en writer/reader onaangeroerd.

**De grenzen** (alle verversingen idempotent via de bestaande 'changed'-guard):
1. **Openen van een gekoppeld bestand** — mét afwijkingsonderscheid, zie hieronder.
2. **Documentwissel** (activeren van een geopend document) — stil.
3. **Pool-edit** (bewerken/verwijderen van een poolitem) — stil, direct voor het actieve document
   én alle geopende documenten (ook slapende, via hun payloads).
4. **Crash-herstel (recovery-restore) telt als grens 1 (besluit, edge-jacht):** na herstel draait
   voor elk bedrijfsgebonden document dezelfde check als bij openen — herstel omzeilt de vraag niet.

**Afwijkingsonderscheid bij grens 1/4 (besluit, edge-jacht):**
- Bestandswaarden-hash == `syncedHash`, maar pool wijkt af ⇒ het bestand loopt gewoon achter
  (bijv. je wijzigde zelf de pool en heropent een ouder project) ⇒ **stil verversen**, geen vraag.
- Bestandswaarden-hash ≠ `syncedHash` ⇒ het bestand is ná de laatste synchronisatie bewerkt
  (een collega deed dat niet zonder reden) ⇒ **afwijkingenoverzicht** met per item (of bulk):
  **bedrijfswaarden gebruiken** óf **bestandswaarden overnemen in het bedrijf** (pool wordt
  bijgewerkt; waarschuwing "dit geldt voor al je projecten" **(besluit, edge-jacht)**).
- **Derde uitkomst (besluit, edge-jacht):** annuleren/"later beslissen" mag — het document opent op
  bestandswaarden, afwijkende items blijven zichtbaar gemarkeerd, het overzicht is handmatig
  oproepbaar vanuit die markering en komt bij een volgende opening terug. Gedeeltelijk beslissen
  mag; onbesliste items blijven gemarkeerd. Niemand wordt klemgezet.

**Verversing en de document-status (besluit, edge-jacht — herzien t.o.v. v2):** een verversing zet
GÉÉN `isDirty` en triggert géén opslaan-prompts of auto-save-golven — één pool-edit mag niet N open
documenten "onopgeslagen" maken. Het bestand op schijf mag achterlopen; elke volgende grens
ververst opnieuw (zelfhelend, goedkoop door de 'changed'-guard). Slaat de gebruiker op na eigen
werk, dan gaan de actuele waarden vanzelf mee. Verversing is niet-undoable; hij **wist wél de
redo-stapel (besluit, edge-jacht)** — anders kan "opnieuw" stilletjes oude poolwaarden terugzetten.
Elke verversing die iets wijzigde toont een discreet signaal ("N items bijgewerkt vanuit het
bedrijf") **(besluit, edge-jacht)** — dit is ook het zichtbare antwoord op de Ctrl+Z-eigenaardigheid
(oude waarden kunnen tijdelijk terugkeren tot de volgende grens).

**Pool-import is een externe wijziging (besluit, edge-jacht):** na een pool-import (hele
vervanging, evt. ouder bestand — de demping waarschuwt vooraf) draait voor elk open
bedrijfsgebonden document de afwijkingscheck van grens 1, niet de stille grens 3. De gebruiker
houdt dus regie wanneer een import zijn open projecten zou herschrijven.

**Poolitem verwijderd** ⇒ projectkopie blijft functioneren op zijn laatste waarden, discreet
gemarkeerd "niet meer in het bedrijf" (alleen bij eigen-bedrijf-stempels, zie §2-scope).

## 4. Het Resources-tabblad = de werkplek

Voor een **gekoppeld** project toont het tabblad de **bedrijfspool**. Twee weergaven, schakelbaar
(de schakelaar bestaat ook bij één bedrijf — het is een inhoudsfilter, geen bedrijvenconcept):

- **Bedrijfsweergave** (default zodra de pool inhoud heeft; bij een lége pool opent het tabblad in
  de Projectweergave, zodat een eenpitter niet tegen een lege lijst aankijkt — **besluit,
  her-toets**): alle resources van het bedrijf (uit de pool). CRUD hier = CRUD op
  het bedrijf (raakt uitsluitend `s.pools`, nooit direct `s.resources` — invariant): nieuw ⇒ direct
  in het bedrijf; bewerken/verwijderen ⇒ geldt overal via §3, met een zichtbaar signaal "geldt voor
  alle projecten — valt buiten ongedaan maken" **(besluit, aangescherpt na edge-jacht)**.
- **Projectweergave**: wat dít project **bevat** — toegewezen items, items uit het bestand, én
  wees-materialisaties (toegewezen geweest, nu nergens meer aan gekoppeld). Die laatste worden
  níet stil opgeruimd **(besluit, edge-jacht)**: ze blijven zichtbaar met een "verwijder uit
  project"-actie. Hier staan ook de markeringen ("niet meer in het bedrijf", "wijkt af — beslis").

**Toewijzen = materialiseren.** Pickers tonen project- én poolitems; een poolitem kiezen
materialiseert (kopie + stempel + `syncedHash`, mét meereizende kalender — altijd, ook fase 1)
via de bestaande kopieerlogica. Los project: alleen projectresources, zoals vanouds.

## 5. Koppelen & herkennen

Bij koppelen (wizard, of achteraf via Projectinfo) start automatisch de herkenningsstap zodra het
project al inhoud heeft:

1. **Matcher (besluit):** exacte naam-match na normalisatie — trim, hoofdletterongevoelig,
   Unicode-NFC en samengevouwen witruimte **(aangescherpt, edge-jacht)**. Geen fuzzy in v1. Bij
   géén of meerdere kandidaten: geen voorstel, handmatige keuze per item. Tarief/type alleen context.
2. Bevestigen per stuk of bulk ⇒ linken (stempelen + syncedHash) en direct verversen (zichtbaar
   vóór bevestiging).
3. Niet-gematcht: het bedrijf in tillen, of projectgebonden laten (§4, transient gemarkeerd).

**Stempels bij ontkoppelen/omkoppelen (besluit, edge-jacht):** ontkoppelen stript de stempels —
een los project heeft géén herkomst en ververst nooit ergens vandaan. Omkoppelen naar een ander
bedrijf doorloopt de herkenningsstap opnieuw; bestaande (vreemde) stempels worden bij een match
vervangen en anders gestript. De herkenningsstap is atomisch (alles-of-niets bij crash; plan-eis).

**Bedrijf verwijderen (besluit, edge-jacht):** de bevestigingsdialoog meldt hoeveel geopende
projecten eraan gekoppeld zijn; verwijderen ontkoppelt die open projecten expliciet (stempels
strippen, melding). Opgeslagen bestanden van dat bedrijf gedragen zich bij later openen als
ontvangen bestanden (los; §2-scope voorkomt valse labels).

**Extensie-/importer-geladen documenten (besluit, edge-jacht):** een import die het document
volledig vervangt (`loadState`-pad) levert een **los** document op — koppelen kan daarna gewoon
via deze stap. Geen stille koppeling, geen stille herkenning.

Eén scherm, gedeelde vormtaal met het afwijkingenoverzicht (§3). Het mag onder geen beding een
verkapte "toevoegen uit bibliotheek"-dialoog worden: het draait om koppelen/optillen bij een
koppelmoment, nooit om items één voor één een project in kopiëren.

## 6. Wat verdwijnt, wat blijft (onder de motorkap)

Verdwijnt (UI + ui-flags + i18n, niets verweesd): `AddFromLibraryDialog` + paneelknop,
`UpdateFromLibraryDialog` + paneelknop, de **resource**-promoveerknop (de **kalender**-variant
blijft in fase 1 als interim en verhuist in fase 2), de wizard-checkbox.

Blijft, hergebruikt: `addLibrary*ToProject` → materialisatie; de pure `copy*/diff*/apply*`-kern →
verversing + herkenning — **let op (plan-eis, edge-jacht): het verversingsprimitief is de pure kern
in een niet-undoable wrapper mét behoud van de 'changed'-guard; NIET de bestaande undoable
`updateProject*FromLibrary`-acties 1-op-1**; `promote*ToPool` → optillen + bedrijfsweergave-CRUD;
`bindProjectToCompany` → krijgt zijn UI. Slice-tests blijven; het plan benoemt per actie het lot.

## 7. Backstage → Bibliotheek krimpt tot bedrijvenbeheer

Bedrijven aanmaken/hernoemen/verwijderen (met de §5-verwijderdialoog), standaardbedrijf,
pool-export (backup) en pool-import (demping + §3-afwijkingsgedrag). Plus fase-1-interim: de
kalender-promoveerknop.

## 8. Opslaan, laden en delen

Ongewijzigd t.o.v. v2: "gebeiteld" onverkort (bestand bevat wat het project bevat, nooit de pool),
golden rule blijft en blijft bewaakt, writer/reader en formaat veranderen niet — met als enige
schema-toevoeging het `syncedHash`-veld in het stempel (round-trip via het bestaande pset-JSON;
oude bestanden zonder hash blijven geldig, zie §2). Ontvanger zonder het bedrijf: los-gedrag,
zonder valse labels (§2-scope), koppelen via §5.

## 9. Kalenders: zelfde principe, gefaseerd zonder gat

Als v2: materialisatie neemt de meereizende kalender altijd mee; het kalender-promoveerpad blijft
in fase 1 bestaan; fase 2 brengt de kalender-UI naar dit model.

## 10. Histogram over projecten heen = B1b

Als v2: B1.1 legt het fundament; het bedrijfsbrede histogram is het B1b-vervolg (machine-grens
gedocumenteerd).

## 11. Wat onverkort blijft van B1

Opslagformaat/round-trip, golden rule, pool-opslag, export/import + demping, parser, alle checks,
i18n, sync-beperkingen. Nieuw in de fundamentlaag: het §3-verversingsmechanisme + `syncedHash` —
toevoegingen bovenop de bestaande primitieve functies.

## 12. Migratie, compatibiliteit & documentatie

Als v2, plus: B1-bestanden zonder `syncedHash` vallen bij afwijking aan de veilige kant (vraag).
`docs/library.md` wordt herschreven en documenteert expliciet: de Ctrl+Z/verversing-eigenaardigheid
en het signaal; dat identiteit op id rust (een verwijderd poolitem naamgelijk hercreëren herlinkt
niet — de handmatige koppel-uitweg bestaat); dat de matcher alleen op koppelmomenten draait; en
het gedrag van ontvangen bestanden; dat een geïmporteerde óudere pool in-sync openstaande
documenten stil terugzet (de vraag guardt alleen extern-bewerkte bestanden — de demping vooraf is
de bewuste poort); en dat omkoppelen de per ongeluk in het oude bedrijf gepromoveerde items niet
opruimt (handmatig via de Bedrijfsweergave).

## 13. Expliciete plan-eisen (uit reviews en edge-jachten — het implementatieplan MOET deze dragen)

1. Dormant-payload-verversing: grens 3/4 muteert ook `documents[].payload.resources` van
   niet-actieve documenten (binnen één set()); herrekening pas bij activering.
2. Verversingsprimitief: pure kern, niet-undoable, 'changed'-guard behouden, wist redoStack.
3. Invariant + testhaak: Bedrijfsweergave-CRUD raakt uitsluitend `s.pools`.
4. Sequencing bij "overnemen in bedrijf" tijdens openen: eerst het nieuwe document volledig
   hydrateren, dán pool-update en sibling-verversing; het net-geopende document niet dubbel verversen.
5. Herkenningsstap atomisch (crash mag geen half-gestempelde toestand achterlaten die auto-save vastlegt).
6. Recovery-restore draait de grens-1-check (§3.4).
7. Het afwijkingen-/herkenningsscherm wordt in het plan volledig uitgetekend (anti-dialoog-clausule §5).
8. `syncedHash` spiegelt de diff-normalisatie exact (zelfde veldlijsten, zelfde
   array-multiset-sortering, zelfde NFC/witruimte-behandeling als `diffKey`) — anders vallen
   "hash gelijk" en "diff up-to-date" uit elkaar en vuren spurieuze of gemiste afwijkingsvragen.
9. Het sticky-autobind-pad in `addLibrary*ToProject` (`if (!project.companyId)`) is in dit model
   onbereikbaar en wordt gestript of assert-geguard — stille koppeling bestaat niet meer.

## 14. Buiten scope

Echte sync (vervolgproject), B1b-histogram, eigen undo-kanaal voor bedrijfs-edits, fuzzy matching,
bedrijfsoverstijgende resources, IFCX.
