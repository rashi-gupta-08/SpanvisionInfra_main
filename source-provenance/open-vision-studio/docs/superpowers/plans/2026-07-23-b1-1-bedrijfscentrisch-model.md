# B1.1 — Het bedrijfscentrische model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een bedrijf *ís* een resourcebibliotheek: projecten putten uit één gedeelde pool, een resource "gebruiken" = hem aan een taak toewijzen (materialiseren), en kopiëren/toevoegen-uit/bijwerken-uit/promoveren verdwijnen als losse handelingen — die choreografie zakt onder de motorkap (kopie-met-verversing op grenzen).

**Architecture:** Bouwt op het bestaande B1-fundament (`librarySlice` + de pure `libraryOps`-kern + IFC-`OPS_`-pset-round-trip). Nieuw: een `syncedHash`-stempel dat "extern bewerkt" onderscheidt van "loopt achter", een niet-undoable verversingsprimitief, verversing op vier grenzen (openen/documentwissel/pool-edit/crash-herstel) inclusief slapende document-payloads, een naam-matcher voor de herkenningsstap, en één gedeeld koppel-/afwijkingenscherm dat de verwijderde add/update-dialogen vervangt. `s.resources` blijft de enige leesbron voor consumenten; de pool zit nooit in het bestand (golden rule); writer/reader/formaat blijven onaangeroerd op één schema-toevoeging na (`syncedHash`, rijdt gratis mee door de bestaande JSON-blob in het stempel).

**Tech Stack:** React 19 + Zustand/Immer (slice-compositie), TypeScript strict (`noUnusedLocals`/`noUnusedParameters`), IFC 4.3 als native formaat, react-i18next (14 locales), headless esbuild+Node-testbatterijen (`tests/library/`, `tests/planning/`).

---

## Bindende bron & scope

- **Spec (bindend):** `docs/superpowers/specs/2026-07-23-b1-1-bedrijfscentrisch-model-design.md` (commit bc9c045, door de user goedgekeurd). Bij elke tegenspraak met dit plan of met oudere docs wint de spec.
- **NIET gebruiken als opdracht:** `docs/archive/superpowers/specs/2026-07-20-b1-bedrijfsbibliotheken-design.md` en `docs/archive/superpowers/plans/2026-07-20-b1-bedrijfsbibliotheken.md` — dat is het VORIGE, vervangen model (add/update-dialogen, Backstage-poolbeheer, resource-promote). Uitsluitend historische context.
- **Buiten scope (spec §14): NIET plannen** — echte cross-machine-sync, het B1b-bedrijfsbrede histogram, een eigen undo-kanaal voor bedrijfs-edits, fuzzy matching, bedrijfsoverstijgende resources, IFCX.

## Werk-guardrails voor de uitvoerende agent (LEZEN VOOR JE BEGINT)

- **Alleen in deze worktree werken:** `/home/nozzit/open-aec/OPS/open-planner-studio/.claude/worktrees/quirky-austin-e63d8f` (branch `claude/ifc-5-key-concepts-ac68ae`). Nooit in de hoofdcheckout.
- **`node_modules` is een symlink** naar de hoofdcheckout. NOOIT verwijderen, NOOIT `npm install` draaien. Als `tests/library/run.sh` of `tests/planning/run.sh` faalt met exitcode 127 (esbuild niet gevonden), symlink dan de parent-esbuild in de worktree i.p.v. te installeren.
- **Dev-server alleen via je eigen `OPS_DEV_PORT`** (bv. 3007/3017/3027 kunnen bezet zijn door andere sessies). Dit plan vereist geen draaiende dev-server — alle verificatie is headless + `npm run build`.
- **Poorten per taak (exitcode is de poort — output kan "alles groen" liegen):**
  - `bash tests/library/run.sh; echo "EXIT=$?"` → verwacht `EXIT=0`, en `bash tests/library/run.sh 2>&1 | grep '^   XX'` → verwacht **geen** output.
  - Bij taken die scheduling/kalender/IFC raken óók: `bash tests/planning/run.sh; echo "EXIT=$?"` → verwacht `EXIT=0` en geen `^XX`-regels.
  - Afsluitend per taak: `npm run build` → verwacht exit 0 (tsc strict + Vite). Let op bij SLOOP-taken: `noUnusedLocals`/`noUnusedParameters` breekt de build als je een export/knop weghaalt terwijl een import blijft staan — ruim imports mee op.
- **Commits:** elke taak eindigt met een commit. Boodschappen in het Nederlands. Trailer exact (twee regels, lege regel ervoor):

  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  ```

  NOOIT auto-close-keywords ("fixes #", "closes #"); verwijs neutraal ("(issue #19)").
- **Committen/pushen naar main:** dit plan commit alleen op de feature-branch. Niet mergen/pushen naar main zonder expliciet user-akkoord.

## Bestandsoverzicht (wat raakt elke taak)

**Model/pure kern**
- `src/types/library.ts` — `LibraryOrigin.syncedHash?: string` (Taak 1).
- `src/services/library/libraryOps.ts` — hash-functies, `classify*OnOpen`, `normalizeName`/`matchByName`, `syncedHash` in copy/apply (Taken 1–3).

**Store**
- `src/state/slices/librarySlice.ts` — verversingsprimitief, grens-acties, binding/herkenning, pool-CRUD-uitbreiding, sticky-autobind strippen (Taken 4–9).
- `src/state/slices/documentSlice.ts` — grens 2 (documentwissel), dormant-payload-verversing (Taken 6, 12).
- `src/state/slices/fileSlice.ts` — grens 1 (openen) + pool-import als externe wijziging (Taken 10, 13).
- `src/state/slices/uiSlice.ts` + `src/state/slices/types.ts` — UI-vlaggen: verwijderen `showAddFromLibraryDialog`/`showUpdateFromLibraryDialog`, toevoegen `showLibraryLinkDialog`/`resourcesView`/`libraryRefreshNotice` (Taken 8, 16, 18, 19).
- `src/hooks/useRecoveryRestore.ts` — grens 4 (crash-herstel) (Taak 11).

**UI**
- `src/components/dialogs/LibraryLinkDialog.tsx` (NIEUW) — het gedeelde koppel-/afwijkingenscherm (Taak 14).
- `src/components/dialogs/ProjectInfoDialog.tsx` — altijd-zichtbare bedrijfskoppeling; wizard-checkbox weg (Taken 15, 19).
- `src/components/panels/ResourcePanel.tsx` — Bedrijfs-/Projectweergave-schakelaar + materialiseer-op-toewijzen + markeringen; add/update-knoppen weg (Taken 16, 18, 19).
- `src/components/backstage/LibrarySection.tsx` (+ `.css`) — krimpt tot bedrijvenbeheer + kalender-promote-interim (Taak 17).
- `src/App.tsx` — dialoog-mounts wisselen (Taken 14, 19).
- **VERWIJDEREN:** `src/components/dialogs/AddFromLibraryDialog.tsx`, `src/components/dialogs/UpdateFromLibraryDialog.tsx` (Taak 19).

**i18n (14 locales)**
- `src/i18n/locales/<loc>/common.json` — `companyLibrary`-blok: nieuwe keys toevoegen (alle 14), verweesde keys verwijderen (alle 14) (Taken 14–19).

**Tests**
- `tests/library/check-library-ops.ts` — pure hash/classify/match (Taken 1–3).
- `tests/library/check-library-slice.ts` — store-grenzen/binding/CRUD (Taken 4–13).
- `tests/library/check-ifc-hostile.ts` of `check-pool-ifc.ts` — `syncedHash`-round-trip (Taak 1).

**Docs**
- `docs/library.md`, `docs/CHANGELOG.md`, `docs/TODO.md` (Taak 21).

**loadState ⇒ los**
- `src/state/slices/fileSlice.ts` (`linkedOpen`-opt + strip), `src/components/panels/IFCPanel.tsx`, `src/components/layout/MenuBar/MenuBar.tsx` — een volledig-vervangende load levert een los document (Taak 20).

## Traceerbaarheid — spec §13 plan-eis → taak

| Plan-eis (§13) | Waar in dit plan |
| --- | --- |
| **1** Dormant-payload-verversing (grens 3/4 muteert `documents[].payload.resources` binnen één `set()`; herrekening pas bij activering) | **Taak 6** (`refreshAllDocumentsFromPool`) + regressie in Taak 12 |
| **2** Verversingsprimitief: pure kern, niet-undoable, 'changed'-guard behouden, wist redoStack | **Taak 5** (`refreshBehindItems`) |
| **3** Invariant + testhaak: Bedrijfsweergave-CRUD raakt uitsluitend `s.pools` | **Taak 9** (`addPoolResource`/`addPoolCalendar` + invariant-assert) |
| **4** Sequencing bij "overnemen in bedrijf" tijdens openen: eerst hydrateren, dán pool-update + sibling-verversing; net-geopende doc niet dubbel verversen | **Taak 10** (open-boundary ná hydratatie) + **Taak 14** (`resolveDeviation('file')`) |
| **5** Herkenningsstap atomisch (crash mag geen half-gestempelde toestand achterlaten) | **Taak 8** (`linkRecognizedItems` in één `set()`) |
| **6** Recovery-restore draait de grens-1-check | **Taak 11** (`useRecoveryRestore` → `runOpenBoundary`) |
| **7** Afwijkingen-/herkenningsscherm volledig uitgetekend (anti-dialoog §5) | **Taak 14** (`LibraryLinkDialog`, volledige component) |
| **8** `syncedHash` spiegelt de diff-normalisatie exact (zelfde veldlijsten, multiset-sortering, NFC/witruimte als `diffKey`) | **Taak 1** (`computeCalendarHash`/`computeResourceHash` bovenop `diffKey` + `*_DIFF_FIELDS`) |
| **9** Sticky-autobind in `addLibrary*ToProject` (`if (!project.companyId)`) strippen/assert-guarden | **Taak 4** |

**Verwerkte GO-NA-FIXES (hyperkritische planreview):**

| # | Reviewpunt | Waar verwerkt |
| --- | --- | --- |
| 1 | Taak 4 verzoenen met bestaande sticky-autobind-tests (top-guard + herschreven testblokken) | **Taak 4** (Step 3 top-guard, Step 4 test-herschrijving) |
| 2 | Grens 3 wordt óók behind-only (geen stille clobber van 'deviated') | **Taak 6** (`refreshAllDocumentsFromPool` behind-only) + **Taak 14** (`resolveDeviation('file')`-sibling-refresh erft dit) |
| 3 | loadState ⇒ los document (`linkedOpen`) | **Taak 20** (nieuw) |
| 4 | `scheduleStale` bij kalender-rakende verversing (geen `runCPM`; dormant via payload-veld) | **Taak 5** (`refreshBehindItems`), **Taak 6** (`refreshAllDocumentsFromPool` + payload.scheduleStale), **Taak 14** (`resolveDeviation`) |
| 5 | Grens 1 óók op `openRecentFile` | **Taak 10** (Step 5) |
| 6 | Test-setState-patroon: muterende Immer-draft i.p.v. partieel-object-return | **Taak 5/10/12/14** (alle testopzetten omgeschreven) |

---

## Taak 1: `syncedHash` — schema + spiegelende hash + round-trip

Het stempel krijgt een `syncedHash`: een hash van de **gevolgde velden** op het moment van materialisatie/laatste verversing. Hij MOET exact dezelfde normalisatie gebruiken als de diff (plan-eis 8) — anders vallen "hash gelijk" en "diff up-to-date" uiteen en vuren spurieuze of gemiste afwijkingsvragen. We hergebruiken daarom letterlijk `diffKey` + `CALENDAR_DIFF_FIELDS`/`RESOURCE_DIFF_FIELDS`.

**Files:**
- Modify: `src/types/library.ts` (`LibraryOrigin`)
- Modify: `src/services/library/libraryOps.ts` (exports + hash-functies + `syncedHash` in copy/apply/makeOrigin)
- Test: `tests/library/check-library-ops.ts`, `tests/library/check-ifc-hostile.ts`

- [ ] **Step 1: Falende pure test voor de hash-spiegeling**

Voeg onderaan `tests/library/check-library-ops.ts` toe (vóór de slot-`process.exit`; kijk hoe het bestand afsluit en plaats het ervóór):

```ts
// --- syncedHash spiegelt de diff-normalisatie exact (plan-eis 8) ---
{
  const p = pool();
  const c = p.calendars[0];
  // Materialisatie-hash == hash van de pool-bron.
  const h1 = computeCalendarHash(c);
  // Array-VOLGORDE mag de hash NIET veranderen (multiset, zoals diffKey): feestdagen omdraaien.
  const c2: WorkCalendar = { ...c, holidays: [...(c.holidays ?? [])].reverse() };
  assert(computeCalendarHash(c2) === h1, 'computeCalendarHash: array-volgorde telt niet mee (multiset)');
  // Een echte inhoudswijziging verandert de hash WEL.
  const c3: WorkCalendar = { ...c, workEndHour: 17 };
  assert(computeCalendarHash(c3) !== h1, 'computeCalendarHash: inhoudswijziging verandert de hash');
  // Consistentie met de diff: gelijk aan pool ⇒ hash-gelijk; diff up-to-date.
  const projCal: WorkCalendar = { ...c, id: 'proj-x', libraryOrigin: makeOrigin(p, c.id, computeCalendarHash(c)) };
  assert(diffCalendarVsPool(projCal, p).status === 'up-to-date', 'materialisatie ⇒ diff up-to-date');
  assert(projCal.libraryOrigin!.syncedHash === computeCalendarHash(c), 'makeOrigin schrijft de syncedHash');

  const r = p.resources[0];
  const hr = computeResourceHash(r);
  const r2: Resource = { ...r, availabilitySteps: r.availabilitySteps ? [...r.availabilitySteps].reverse() : undefined };
  assert(computeResourceHash(r2) === hr, 'computeResourceHash: array-volgorde telt niet mee');
  assert(computeResourceHash({ ...r, maxUnits: 99 }) !== hr, 'computeResourceHash: inhoudswijziging verandert de hash');
}
```

Voeg de nieuwe symbolen toe aan de bestaande import bovenaan het bestand (`diffCalendarVsPool` staat er al):

```ts
import {
  bumpPool, isPoolNewer, makeOrigin, findCopyByOrigin,
  copyCalendarToProject, copyResourceToProject,
  diffCalendarVsPool, diffResourceVsPool, applyResourceUpdate,
  computeCalendarHash, computeResourceHash,
} from '@/services/library/libraryOps';
```

- [ ] **Step 2: Draai — verwacht FAIL (symbolen bestaan nog niet)**

Run: `bash tests/library/run.sh; echo "EXIT=$?"`
Expected: `EXIT=1` (tsc-fout: `computeCalendarHash`/`computeResourceHash` niet geëxporteerd).

- [ ] **Step 3: `syncedHash` op het type**

In `src/types/library.ts`, breid `LibraryOrigin` uit:

```ts
export interface LibraryOrigin {
  companyId: string;
  libraryItemId: string;
  poolVersion: number;
  /** B1.1 (spec §2): hash van de gevolgde velden op het moment van materialisatie/laatste
   *  verversing. Spiegelt EXACT de diff-normalisatie (`diffKey` + de `*_DIFF_FIELDS`-lijsten) zodat
   *  "hash gelijk" en "diff up-to-date" niet uiteenlopen (plan-eis 8). Onderscheidt "bestand extern
   *  bewerkt" (hash ≠ file) van "bestand loopt achter op de pool" (hash == file, pool wijkt af).
   *  Afwezig (B1-bestanden zonder hash) ⇒ veilige kant: behandelen als mogelijk extern bewerkt. */
  syncedHash?: string;
}
```

- [ ] **Step 4: hash-functies + `syncedHash` door de kern**

In `src/services/library/libraryOps.ts`:

1. Maak `diffKey`, `CALENDAR_DIFF_FIELDS` en `RESOURCE_DIFF_FIELDS` **exporteerbaar** (zet `export` voor de bestaande `const`/`function` — inhoud onveranderd), zodat de hash gegarandeerd dezelfde normalisatie/veldlijsten deelt (plan-eis 8).

2. Voeg direct ná `diffFields` toe:

```ts
/** Hash van de gevolgde velden van een item, met EXACT dezelfde normalisatie als de diff
 *  (`diffKey` per veld → arrays als gesorteerde multiset). Twee items met dezelfde gevolgde
 *  velden — ongeacht array-volgorde — geven dezelfde hash; een verschil op één gevolgd veld
 *  verandert de hash. Deterministisch (JSON van de per-veld-diffKeys), geen externe crypto. */
function hashFields<T>(item: T, fields: (keyof T)[]): string {
  return JSON.stringify(fields.map((f) => diffKey(item[f])));
}

/** syncedHash van een pool-/projectkalender (spec §2, plan-eis 8). */
export function computeCalendarHash(cal: WorkCalendar): string {
  return hashFields(cal, CALENDAR_DIFF_FIELDS);
}

/** syncedHash van een pool-/projectresource (spec §2, plan-eis 8). */
export function computeResourceHash(res: Resource): string {
  return hashFields(res, RESOURCE_DIFF_FIELDS);
}
```

3. Geef `makeOrigin` een optionele `syncedHash`:

```ts
/** Bouw een herkomststempel voor een projectkopie van een poolitem. `syncedHash` (spec §2) wordt
 *  meegeschreven bij materialisatie/verversing van een PROJECTkopie; pool-items zelf dragen geen
 *  stempel, dus daar blijft hij afwezig. */
export function makeOrigin(pool: CompanyPool, libraryItemId: string, syncedHash?: string): LibraryOrigin {
  return {
    companyId: pool.companyId,
    libraryItemId,
    poolVersion: pool.poolVersion,
    ...(syncedHash !== undefined ? { syncedHash } : {}),
  };
}
```

4. In `copyCalendarToProject`, zet de stempel mét hash (bron = `source`):

```ts
    libraryOrigin: makeOrigin(pool, poolCalendarId, computeCalendarHash(source)),
```

5. In `copyResourceToProject`:

```ts
    libraryOrigin: makeOrigin(pool, poolResourceId, computeResourceHash(source)),
```

6. In `applyCalendarUpdate`, de gepatchte stempel krijgt de verse pool-hash:

```ts
  const patched: WorkCalendar = { ...structuredClone(source), id: projectCal.id, libraryOrigin: makeOrigin(pool, id!, computeCalendarHash(source)) };
```

7. In `applyResourceUpdate`, idem:

```ts
    libraryOrigin: makeOrigin(pool, id!, computeResourceHash(source)),
```

- [ ] **Step 5: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"`
Expected: `EXIT=0`, geen `^   XX`-regels.

- [ ] **Step 6: Round-trip-test — `syncedHash` overleeft IFC**

De writer serialiseert het HELE `libraryOrigin`-object (`JSON.stringify(cal.libraryOrigin)`), en de reader parseert het HELE object en wijst het toe (`res.libraryOrigin = parsed` / `return parsed`) ná validatie van de drie kernvelden — `syncedHash` rijdt dus gratis mee. Bewijs dat met een expliciete assert. Voeg onderaan `tests/library/check-ifc-hostile.ts` een geval toe dat een project met een gestempeld (mét `syncedHash`) resource+kalender schrijft en teruglees (volg het bestaande writeIFC/readIFC-patroon in dat bestand; de assert):

```ts
// --- B1.1: syncedHash round-trippt door IFC (plan-eis 8 / spec §8) ---
{
  const origin = { companyId: 'c1', libraryItemId: 'pr1', poolVersion: 3, syncedHash: 'abc123' };
  const resIn: Resource = { id: 'r1', name: 'Metselaar', type: 'LABOR', description: '', maxUnits: 2, libraryOrigin: origin };
  const ifc = writeIFC({
    project: { ...createDefaultProject(), companyId: 'c1', companyName: 'B' },
    calendar: createDefaultCalendar(), tasks: [], sequences: [],
    resources: [resIn], assignments: [], resourceCalendars: [],
  });
  const back = readIFC(ifc);
  const resOut = back.resources.find(r => r.name === 'Metselaar');
  assert(resOut?.libraryOrigin?.syncedHash === 'abc123', 'syncedHash overleeft de IFC-round-trip');
}
```

Zorg dat `createDefaultProject`/`createDefaultCalendar`/`writeIFC`/`readIFC`/`Resource` bovenaan `check-ifc-hostile.ts` geïmporteerd zijn (voeg alleen wat ontbreekt toe; het bestand importeert writeIFC/readIFC al).

- [ ] **Step 7: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`, geen `^   XX`.

- [ ] **Step 8: Build-poort**

Run: `npm run build` → verwacht exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/types/library.ts src/services/library/libraryOps.ts tests/library/check-library-ops.ts tests/library/check-ifc-hostile.ts
git commit -m "feat(library): syncedHash-stempel dat de diff-normalisatie exact spiegelt

Onderscheidt extern-bewerkt van achterlopend (spec §2/§3, plan-eis 8); rijdt
gratis mee door de bestaande OPS_-pset-JSON-round-trip.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 2: Naam-matcher voor de herkenningsstap

De herkenningsstap (spec §5) matcht projectitems tegen poolitems op **exacte naam na normalisatie**: trim, hoofdletterongevoelig, Unicode-NFC, samengevouwen witruimte. Geen fuzzy (spec §14). Bij géén of meerdere kandidaten: geen voorstel (handmatige keuze).

**Files:**
- Modify: `src/services/library/libraryOps.ts`
- Test: `tests/library/check-library-ops.ts`

- [ ] **Step 1: Falende test**

Voeg toe aan `tests/library/check-library-ops.ts`:

```ts
// --- Naam-matcher (spec §5.1): exact na normalisatie, uniek anders geen voorstel ---
{
  assert(normalizeName('  Ploeg  A ') === normalizeName('ploeg a'), 'normalizeName: trim+case+witruimte');
  const cands = [
    { id: 'a', name: 'Metselaar' },
    { id: 'b', name: 'Timmerman' },
  ];
  assert(matchByName('  metselaar ', cands)?.id === 'a', 'matchByName: exact na normalisatie');
  assert(matchByName('Loodgieter', cands) === null, 'matchByName: geen kandidaat ⇒ null');
  const dup = [{ id: 'a', name: 'Ploeg' }, { id: 'b', name: 'ploeg' }];
  assert(matchByName('PLOEG', dup) === null, 'matchByName: meerdere kandidaten ⇒ null (geen voorstel)');
}
```

Voeg `normalizeName, matchByName` toe aan de import uit `@/services/library/libraryOps`.

- [ ] **Step 2: Draai — verwacht FAIL**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=1` (tsc: symbolen onbekend).

- [ ] **Step 3: Implementatie**

Voeg toe aan `src/services/library/libraryOps.ts`:

```ts
/** Normaliseer een naam voor de herkennings-matcher (spec §5.1): Unicode-NFC, trim, samengevouwen
 *  witruimte (elke witruimte-run → één spatie), hoofdletterongevoelig (`toLocaleLowerCase`). Puur. */
export function normalizeName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/** Zoek de UNIEKE kandidaat met dezelfde genormaliseerde naam (spec §5.1). Geen kandidaat óf
 *  meerdere kandidaten ⇒ `null` (geen voorstel — handmatige keuze). Geen fuzzy (spec §14). */
export function matchByName<T extends { name: string }>(name: string, candidates: T[]): T | null {
  const target = normalizeName(name);
  const hits = candidates.filter((c) => normalizeName(c.name) === target);
  return hits.length === 1 ? hits[0] : null;
}
```

- [ ] **Step 4: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`, geen `^   XX`.

- [ ] **Step 5: Commit**

```bash
git add src/services/library/libraryOps.ts tests/library/check-library-ops.ts
git commit -m "feat(library): naam-matcher voor de herkenningsstap (exact na NFC/trim/case, uniek)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 3: Afwijkingsclassificatie bij openen (behind/deviated/removed/in-sync)

Bij grens 1/4 onderscheiden we (spec §3): bestand loopt achter (hash == file, pool wijkt af ⇒ stil verversen) vs. bestand extern bewerkt (hash ≠ file ⇒ vraag). Verwijderd poolitem ⇒ markeren. Ontbrekende `syncedHash` (B1-bestanden) ⇒ veilige kant (deviated).

**Files:**
- Modify: `src/services/library/libraryOps.ts`
- Test: `tests/library/check-library-ops.ts`

- [ ] **Step 1: Falende test**

```ts
// --- Afwijkingsclassificatie bij openen (spec §3) ---
{
  const p = pool();
  const src = p.calendars[0];
  const inSyncHash = computeCalendarHash(src);
  // in-sync: file == pool, hash == file.
  const inSync: WorkCalendar = { ...src, id: 'x', libraryOrigin: makeOrigin(p, src.id, inSyncHash) };
  assert(classifyCalendarOnOpen(inSync, p) === 'in-sync', 'classify: gelijk aan pool ⇒ in-sync');
  // behind: pool bewoog (file oud), maar file == syncedHash (niet extern bewerkt).
  const bumped = bumpPool({ ...p, calendars: [{ ...src, workEndHour: 17 }] });
  const behind: WorkCalendar = { ...src, id: 'x', libraryOrigin: makeOrigin(p, src.id, inSyncHash) };
  assert(classifyCalendarOnOpen(behind, bumped) === 'behind', 'classify: file==hash, pool wijkt af ⇒ behind');
  // deviated: file lokaal bewerkt (file != syncedHash) en pool wijkt af.
  const deviated: WorkCalendar = { ...src, id: 'x', workStartHour: 6, libraryOrigin: makeOrigin(p, src.id, inSyncHash) };
  assert(classifyCalendarOnOpen(deviated, bumped) === 'deviated', 'classify: file bewerkt na sync ⇒ deviated');
  // removed: poolitem weg.
  const removed: WorkCalendar = { ...src, id: 'x', libraryOrigin: { companyId: p.companyId, libraryItemId: 'ghost', poolVersion: 1 } };
  assert(classifyCalendarOnOpen(removed, p) === 'removed', 'classify: poolitem weg ⇒ removed');
  // hash-loos (B1-bestand) met afwijkende pool ⇒ veilige kant (deviated).
  const legacy: WorkCalendar = { ...src, id: 'x', libraryOrigin: { companyId: p.companyId, libraryItemId: src.id, poolVersion: 1 } };
  assert(classifyCalendarOnOpen(legacy, bumped) === 'deviated', 'classify: hash-loos + afwijkend ⇒ deviated (veilig)');
}
```

Voeg `classifyCalendarOnOpen, classifyResourceOnOpen, bumpPool` (bumpPool staat er al) toe aan de import.

- [ ] **Step 2: Draai — verwacht FAIL**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=1`.

- [ ] **Step 3: Implementatie**

Voeg toe aan `src/services/library/libraryOps.ts`, ná `diffResourceVsPool`:

```ts
/** Uitkomst van de openings-classificatie (spec §3, grens 1/4). */
export type OnOpenStatus =
  | 'in-sync'   // project == pool
  | 'behind'    // pool bewoog, bestand is NIET lokaal bewerkt (file == syncedHash) ⇒ stil verversen
  | 'deviated'  // bestand is ná de sync bewerkt (file != syncedHash) ⇒ vraag
  | 'removed';  // pool-origineel bestaat niet meer

function classifyOnOpen(diffStatus: ItemDiff['status'], fileHash: string, syncedHash: string | undefined): OnOpenStatus {
  if (diffStatus === 'removed') return 'removed';
  if (diffStatus === 'up-to-date') return 'in-sync';
  // diffStatus === 'changed'. Ontbrekende syncedHash (B1-bestand) ⇒ veilige kant: behandel als
  // extern bewerkt (spec §2/§12). Anders: file == syncedHash ⇒ niet-bewerkt ⇒ behind; ongelijk ⇒ deviated.
  if (syncedHash === undefined) return 'deviated';
  return fileHash === syncedHash ? 'behind' : 'deviated';
}
```

> **NB (critreview taak 1, al gefixt in code):** de promote-back-stamps in `librarySlice.ts` (`promoteCalendarToPool`/`promoteResourceToPool`) geven sinds de taak-1-fixronde de pool-hash mee aan `makeOrigin` — een net-gepromoveerd item classificeert dus als `in-sync`, niet spuria als `deviated`. Verifieer bij deze taak dat dat gedrag intact blijft.
>
> **NB (critreview taak 3, al gefixt in code):** `OnOpenStatus` kent naast de vier geplande waarden ook `'unbound'` — beide wrappers geven dat terug voor een item zónder `libraryOrigin`, zodat stempel-loos nooit samenvalt met `'removed'`. Voor taken 5/6/10-14: filters op 'behind'/'deviated'/'removed' blijven correct ('unbound' is daar inert), maar schrijf GEEN exhaustieve switch zonder 'unbound'-tak, en de companyId-scope-guard (stempel van een ánder bedrijf) blijft de verantwoordelijkheid van de aanroeper.

```typescript

export function classifyCalendarOnOpen(projectCal: WorkCalendar, pool: CompanyPool): OnOpenStatus {
  return classifyOnOpen(diffCalendarVsPool(projectCal, pool).status, computeCalendarHash(projectCal), projectCal.libraryOrigin?.syncedHash);
}

export function classifyResourceOnOpen(projectRes: Resource, pool: CompanyPool): OnOpenStatus {
  return classifyOnOpen(diffResourceVsPool(projectRes, pool).status, computeResourceHash(projectRes), projectRes.libraryOrigin?.syncedHash);
}
```

- [ ] **Step 4: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 5: Commit**

```bash
git add src/services/library/libraryOps.ts tests/library/check-library-ops.ts
git commit -m "feat(library): openings-classificatie behind/deviated/removed (spec §3)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 4: Materialisatie stempelt syncedHash + sticky-autobind strippen (plan-eis 9)

> **NB (bouw taak 4, al gefixt in code):** Step 4 hieronder miste twee bestaande testblokken die óók op de sticky-autobind leunden: "Toevoegen uit bibliotheek (meereizende kalender + dedup + binding)" (~217-264) en "Import-normalisatie via replacePool" (~417-450). Beide zijn in de taak-4-commit gefixt met `bindProjectToCompany(cid)` vooraf (zelfde patroon als het Elektricien-blok); de binding-assert in het eerste blok claimt nu "binding blijft intact", niet het oude sticky-gedrag.

`addLibrary*ToProject` blijft de materialisatie-primitief (spec §6) — via de nu-hash-schrijvende `copy*`-kern uit Taak 1 zetten kopieën automatisch een `syncedHash`. Daarnaast: het sticky-autobind-pad (`if (!s.project.companyId)`) is in dit model onbereikbaar — materialiseren gebeurt alleen bij een gekoppeld project — en wordt gestript/assert-geguard (plan-eis 9).

**Files:**
- Modify: `src/state/slices/librarySlice.ts`
- Test: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Falende test**

Voeg toe aan `tests/library/check-library-slice.ts` (voeg `computeResourceHash` toe aan de imports als je die assert; importeer uit `@/services/library`):

```ts
// --- Materialisatie stempelt syncedHash; geen sticky-autobind (plan-eis 9) ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Mat BV');
  s.bindProjectToCompany(cid); // project is nu gekoppeld — het normale pad
  const resId = s.promoteResourceToPool(cid, { id: 'src', name: 'Kraanmachinist', type: 'LABOR', description: '', maxUnits: 1 })!;
  const r = s.addLibraryResourceToProject(cid, resId);
  const copy = useAppStore.getState().resources.find(x => x.id === r.resourceId);
  assert(!!copy?.libraryOrigin?.syncedHash, 'materialisatie zet een syncedHash op de projectkopie');
  assert(copy?.libraryOrigin?.companyId === cid, 'materialisatie stempelt het juiste bedrijf');
}
```

- [ ] **Step 2: Draai — verwacht FAIL**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=1` (`copy.libraryOrigin.syncedHash` leeg zolang Taak 1 los stond — maar Taak 1 is al gemerged, dus deze faalt op de sticky-autobind-verwijdering pas ná stap 3; draai toch om de baseline te zien).

> Opmerking voor de uitvoerder: na Taak 1 slaagt de `syncedHash`-assert al. Deze taak verwijdert daarnaast dode code; de "falende test" hier is vooral de assert die het NIEUWE contract vastlegt. Als beide asserts al groen zijn na stap 1, ga direct naar stap 3 (de sticky-autobind-strip) en verifieer dat de suite groen blijft.

- [ ] **Step 3: Sticky-autobind strippen — top-guard, geen stille koppeling meer (plan-eis 9)**

In `src/state/slices/librarySlice.ts`, geef `addLibraryResourceToProject` en `addLibraryCalendarToProject` een **early-return-guard** bovenaan (materialiseren gebeurt alleen op een project dat al aan DIT bedrijf gekoppeld is — geen stille koppeling), en **verwijder** het bestaande sticky-autobind-blok aan het eind van beide acties.

In `addLibraryResourceToProject`, direct als eerste regel van de actie (vóór `let result = …`):

```ts
    // Plan-eis 9: materialiseren gebeurt UITSLUITEND op een project dat al aan dit bedrijf gekoppeld
    // is. Het oude sticky-autobind ("bind een ongebonden project stil") bestaat niet meer — de UI
    // (Bedrijfsweergave) toont materialiseren alleen voor een gekoppeld project. Anders: no-op + warn.
    if (get().project.companyId !== companyId) {
      appLog.emit('warn', 'library', `materialisatie genegeerd: actief project niet aan bedrijf ${companyId} gekoppeld (project=${get().project.companyId ?? 'geen'})`);
      return { added: false, resourceId: null };
    }
```

En verwijder aan het EIND van dezelfde actie het autobind-blok:

```ts
      // Project binden aan dit bedrijf als het nog ongebonden was. Bewust NA finishMutation ...
      if (!s.project.companyId) {
        const company = s.companies.find(c => c.id === companyId);
        if (company) { s.project.companyId = company.id; s.project.companyName = company.name; }
      }
```

Doe hetzelfde in `addLibraryCalendarToProject` — top-guard met `return { added: false, calendarId: null };` (let op het andere returntype) en verwijder daar het identieke autobind-blok. `appLog` is al geïmporteerd bovenaan het bestand.

- [ ] **Step 4: Bestaande sticky-autobind-tests herschrijven (verzoening)**

De huidige `tests/library/check-library-slice.ts` legt op ~regels 269–286 (undo-scenario) en ~288–301 (kalender-only) vast dat een add een ONGEBONDEN project bindt. Dat contract vervalt. **Vervang beide blokken** door de onderstaande. Nieuw contract: materialiseren op een ongebonden project is een no-op (warn-guard), en een normaal scenario bindt expliciet vooraf.

Vervang het undo-scenario-blok (~269–286) door:

```ts
{
  useAppStore.getState().newProject(); // verse, ONGEBONDEN payload; undoStack leeg, pools blijven
  const cid = useAppStore.getState().defaultCompanyId;
  const pCal = useAppStore.getState().promoteCalendarToPool(cid, {
    id: 'undo-cal', name: 'Undo-ploeg', description: '', workDays: [1, 2, 3, 4, 5],
    workStartHour: 8, workEndHour: 16, hoursPerDay: 8, holidays: [],
  })!;
  const pRes = useAppStore.getState().promoteResourceToPool(cid, { id: 'undo-res', name: 'Undo-res', type: 'LABOR', description: '', maxUnits: 1 })!;
  useAppStore.getState().updatePoolResource(cid, pRes, { calendarId: pCal });

  // NIEUW CONTRACT (plan-eis 9): materialiseren op een ONGEBONDEN project is een no-op + warn.
  assert(!useAppStore.getState().project.companyId, 'setup: verse project is ongebonden');
  const guarded = useAppStore.getState().addLibraryResourceToProject(cid, pRes);
  assert(guarded.added === false && guarded.resourceId === null, 'materialiseren op ongebonden project: no-op (geen stille koppeling)');
  assert(!useAppStore.getState().project.companyId, 'materialiseren bindt een ongebonden project NIET (plan-eis 9)');

  // Normaal pad: bind eerst expliciet, dan materialiseren.
  useAppStore.getState().bindProjectToCompany(cid);
  const calsBefore = useAppStore.getState().calendars.length;
  const resBefore = useAppStore.getState().resources.length;
  const add = useAppStore.getState().addLibraryResourceToProject(cid, pRes);
  assert(add.added === true, 'undo-scenario: resource toegevoegd op gebonden project');
  assert(useAppStore.getState().project.companyId === cid, 'undo-scenario: project blijft gebonden');
  assert(useAppStore.getState().resources.length === resBefore + 1, 'undo-scenario: resource erbij');
  assert(useAppStore.getState().calendars.length === calsBefore + 1, 'undo-scenario: meegereisde kalender erbij');

  // Undo draait de materialisatie ÉCHT terug; de binding (project snapshot:'none') blijft sticky.
  useAppStore.getState().undo();
  const su = useAppStore.getState();
  assert(su.resources.length === resBefore && !su.resources.some(r => r.id === add.resourceId), 'undo: resource daadwerkelijk teruggedraaid (weg)');
  assert(su.calendars.length === calsBefore, 'undo: meegereisde kalender daadwerkelijk teruggedraaid (weg)');
  assert(su.project.companyId === cid, 'undo: binding blijft sticky (project snapshot:none)');
}
```

Vervang het kalender-only-blok (~288–301) door:

```ts
{
  useAppStore.getState().newProject(); // verse, ONGEBONDEN payload
  const cid = useAppStore.getState().defaultCompanyId;
  const poolCalId = useAppStore.getState().promoteCalendarToPool(cid, {
    id: 'bind-cal', name: 'Bindploeg', description: '', workDays: [1, 2, 3, 4, 5],
    workStartHour: 8, workEndHour: 16, hoursPerDay: 8, holidays: [],
  })!;

  // Ongebonden project: kalender-materialisatie is een no-op (plan-eis 9).
  assert(!useAppStore.getState().project.companyId, 'setup: verse project is ongebonden');
  const guarded = useAppStore.getState().addLibraryCalendarToProject(cid, poolCalId);
  assert(guarded.added === false && guarded.calendarId === null, 'kalender-materialiseren op ongebonden project: no-op');
  assert(!useAppStore.getState().project.companyId, 'kalender-materialiseren bindt het project NIET (plan-eis 9)');

  // Na expliciet binden werkt materialiseren wél.
  useAppStore.getState().bindProjectToCompany(cid);
  const c = useAppStore.getState().addLibraryCalendarToProject(cid, poolCalId);
  assert(c.added === true, 'kalender-only-add op gebonden project: kalender toegevoegd');
  assert(useAppStore.getState().project.companyId === cid, 'kalender-only-add: project blijft gebonden');
}
```

Loop daarna de resterende diff-/update-blokken na (Elektricien-resource ~305, PROJECTDEFAULT-kalender ~340): het **Elektricien-blok** materialiseert via `addLibraryResourceToProject` — voeg dáár vóór de eerste `addLibraryResourceToProject` een `useAppStore.getState().bindProjectToCompany(cid);` toe (anders is de add nu een no-op). Het PROJECTDEFAULT-blok gebruikt `promote*`/`updateProjectCalendarFromLibrary` (geen materialisatie) en behoeft geen binding — laat het ongemoeid.

- [ ] **Step 5: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`, geen `^   XX`. De 190 bestaande checks + de nieuwe blijven groen.

- [ ] **Step 6: Build-poort**

Run: `npm run build` → exit 0 (let op: geen ongebruikte variabelen na het verwijderen van de autobind-blokken).

- [ ] **Step 7: Commit**

```bash
git add src/state/slices/librarySlice.ts tests/library/check-library-slice.ts
git commit -m "refactor(library): strip sticky-autobind uit materialisatie (plan-eis 9)

Materialiseren gebeurt alleen op een reeds gekoppeld project (top-guard + warn);
stille koppeling bestaat niet meer. Bestaande autobind-tests herschreven naar het
nieuwe contract (bind vooraf; ongebonden = no-op).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 5: Niet-undoable verversingsprimitief (plan-eis 2)

Het verversingsprimitief is de pure `apply*Update`-kern in een **niet-undoable** wrapper: 'changed'-guard behouden, GEEN undo-snapshot, GEEN `isDirty`, en het **wist de redoStack** (anders zet "opnieuw" stilletjes oude poolwaarden terug — spec §3). Het is de sessiegrens-primitief (grens 1/2/4) en werkt daarom **uitsluitend 'behind'-items** bij (file == syncedHash, pool wijkt af) — een onbesliste 'deviated'-item (lokaal bewerkt) mag NIET stil overschreven worden bij een documentwissel of opening (spec §3: "onbesliste items blijven gemarkeerd"). Alleen grens 3 (pool-edit, Taak 6) overschrijft élke afwijking bewust. Retourneert het aantal gewijzigde items (voor het discrete signaal).

**Files:**
- Modify: `src/state/slices/librarySlice.ts`
- Test: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Falende test**

Voeg `computeResourceHash` toe aan de imports van `check-library-slice.ts` (uit `@/services/library`) — de test bouwt de behind/deviated-toestand met een expliciete `syncedHash` zodat hij robuust is tegen de cumulatieve suite (grens 3 wordt in Taak 6 aan `updatePoolResource` gehangen; deze test mag daar niet van afhangen).

```ts
// --- Verversingsprimitief: behind-only, niet-undoable, wist redoStack, geen isDirty (plan-eis 2) ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Verv BV');
  s.bindProjectToCompany(cid);
  const resId = s.promoteResourceToPool(cid, { id: 'v', name: 'Stukadoor', type: 'LABOR', description: '', maxUnits: 1 })!;
  const add = s.addLibraryResourceToProject(cid, resId);
  s.updatePoolResource(cid, resId, { maxUnits: 5 });
  // Bouw een EXPLICIETE 'behind'-toestand (robuust tegen grens-3-timing): projectkopie op 1 MET de
  // syncedHash van maxUnits=1 ⇒ file==syncedHash ⇒ behind; pool staat op 5.
  const behindHash = computeResourceHash({ id: 'x', name: 'Stukadoor', type: 'LABOR', description: '', maxUnits: 1 });
  // Muterende setState-vorm (gevestigd patroon, tests/planning/check-document-contract.ts:127) — geen
  // partieel-object-return; muteer de Immer-draft.
  useAppStore.setState((st) => {
    st.isDirty = false; st.redoStack = [{} as never];
    const r = st.resources.find(r => r.id === add.resourceId);
    if (r) { r.maxUnits = 1; r.libraryOrigin!.syncedHash = behindHash; }
  });
  const changed = useAppStore.getState().refreshBehindItems(cid);
  const after = useAppStore.getState();
  assert(changed >= 1, 'refreshBehindItems telt gewijzigde items');
  assert(after.resources.find(r => r.id === add.resourceId)?.maxUnits === 5, 'verversing neemt poolwaarde over');
  assert(after.redoStack.length === 0, 'verversing WIST de redoStack (plan-eis 2)');
  assert(after.isDirty === false, 'verversing zet GEEN isDirty (spec §3)');

  // Een DEVIATED item (file != syncedHash) blijft ONgemoeid: file=4, syncedHash=hash(1), pool=5.
  useAppStore.setState((st) => {
    const r = st.resources.find(r => r.id === add.resourceId);
    if (r) { r.maxUnits = 4; r.libraryOrigin!.syncedHash = behindHash; }
  });
  useAppStore.getState().refreshBehindItems(cid);
  assert(useAppStore.getState().resources.find(r => r.id === add.resourceId)?.maxUnits === 4, 'refreshBehindItems laat een deviated item ONgemoeid');
}
```

- [ ] **Step 2: Draai — verwacht FAIL**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=1` (`refreshBehindItems` bestaat niet).

- [ ] **Step 3: Implementatie**

Voeg aan de `LibrarySlice`-interface (`src/state/slices/librarySlice.ts`) toe:

```ts
  /** Verversingsprimitief (spec §3, plan-eis 2): werk UITSLUITEND 'behind'-items van het ACTIEVE
   *  document bij naar de poolwaarden van het gegeven bedrijf (scope §2). 'behind' = file == syncedHash
   *  én pool wijkt af; een 'deviated' (lokaal bewerkt) item blijft ongemoeid (spec §3). Niet-undoable:
   *  geen undo-snapshot, geen isDirty, WIST de redoStack; raakte het een kalender, dan zet het
   *  `scheduleStale` (geen runCPM). Retourneert het aantal gewijzigde items. */
  refreshBehindItems: (companyId: string) => number;
```

Voeg de implementatie toe (in het `createLibrarySlice`-object). Breid de bestaande top-import uit `@/services/library` uit met `classifyCalendarOnOpen, classifyResourceOnOpen` (`applyCalendarUpdate`/`applyResourceUpdate`/`diff*VsPool` zijn al geïmporteerd):

```ts
  refreshBehindItems: (companyId) => {
    let changed = 0;
    set((s) => {
      // §2-scope: alleen het eigen-bedrijf van het actieve document, en alleen als het lokaal bestaat.
      if (s.project.companyId !== companyId || !s.companies.some((c) => c.id === companyId)) return;
      const draftPool = s.pools[companyId];
      if (!draftPool) return;
      const pool = current(draftPool);

      let calTouched = false;
      s.calendars = s.calendars.map((cal) => {
        if (cal.libraryOrigin?.companyId !== companyId) return cal;
        if (classifyCalendarOnOpen(current(cal), pool) !== 'behind') return cal; // deviated/removed/in-sync ⇒ ongemoeid
        changed++; calTouched = true;
        return applyCalendarUpdate(current(cal), pool);
      });
      s.resources = s.resources.map((res) => {
        if (res.libraryOrigin?.companyId !== companyId) return res;
        if (classifyResourceOnOpen(current(res), pool) !== 'behind') return res;
        changed++;
        return applyResourceUpdate(current(res), pool);
      });

      if (changed > 0) {
        // Plan-eis 2: niet-undoable — GEEN beginUndoable, GEEN isDirty. Wél de redoStack wissen zodat
        // "opnieuw" niet stilletjes oude poolwaarden terugzet (spec §3, Ctrl+Z-eigenaardigheid).
        s.redoStack = [];
        s.calendar = s.calendars.find((c) => c.id === s.project.calendarId) ?? s.calendar;
        // Review-fix (spec §3): kalenderverversing raakt datums ⇒ scheduleStale (geen isDirty, geen runCPM).
        if (calTouched) s.scheduleStale = true;
      }
    });
    if (changed > 0) {
      get().recomputeResourceLoad();
      get().recomputeViewRows();
    }
    return changed;
  },
```

- [ ] **Step 4: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.
Run: `bash tests/planning/run.sh; echo "EXIT=$?"` → `EXIT=0` (kalenderverversing raakt scheduling; symlink esbuild indien 127).

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/state/slices/librarySlice.ts tests/library/check-library-slice.ts
git commit -m "feat(library): niet-undoable verversingsprimitief dat de redoStack wist (plan-eis 2)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 6: Dormant-payload-verversing over alle open documenten (plan-eis 1)

> **NB (bouw taak 6, al gefixt in code):** het kalendertak-testblok dat de taak-5-review afdwong (jonger dan dit plan) dreef `refreshBehindItems` handmatig via `updatePool*`-setup; sinds de grens-3-bedrading van deze taak vuurt die setup zelf al een verversing. Verzoend door de behind-toestand in dat blok buiten de pool-CRUD om op te bouwen (directe store-mutatie), zodat het blok het primitief in isolatie blijft bewijzen. Patroon voor later: tests die het primitief geïsoleerd willen raken, mogen de pool nooit via de CRUD-acties muteren.

Een pool-edit (grens 3) en crash-herstel (grens 4) moeten óók de `resources`/`calendars` van niet-actieve documenten bijwerken — binnen **één `set()`** op hun `documents[].payload` — met herrekening pas bij activering (plan-eis 1). We voegen `refreshAllDocumentsFromPool(companyId)` toe: actief top-level + elke slapende payload.

**Behind-only (review-fix, spec §3):** ook grens 3 ververst **uitsluitend 'behind'-items** (syncedHash matcht de pool niet meer terwijl het bestand lokaal ongewijzigd is). Een onbesliste **'deviated'**-item (lokaal bewerkt) blijft staan en komt bij de volgende grens-1/heropening terug ("onbesliste items blijven gemarkeerd"). Een pool-edit overschrijft dus nooit stil een lokale afwijking.

**Staleness (review-fix, plan-eis 4-buur, spec §3):** raakte de verversing minstens één kalender, zet dan `scheduleStale = true` (ZONDER `isDirty` — zelfde patroon als `updateProjectCalendarFromLibrary`, librarySlice ~427). GEEN automatische `runCPM`: scheduling blijft handmatig, de stale-indicator is het gevestigde signaal. Voor slapende documenten landt de staleness op `payload.scheduleStale` (dat veld bestaat in het documentcontract) zodat het bij `switchDocument`/activering zichtbaar wordt.

**Files:**
- Modify: `src/state/slices/librarySlice.ts`
- Test: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Falende test**

```ts
// --- Dormant-payload-verversing (plan-eis 1): pool-edit raakt óók slapende documenten ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Multi BV');
  s.bindProjectToCompany(cid);
  const resId = s.promoteResourceToPool(cid, { id: 'm', name: 'Voeger', type: 'LABOR', description: '', maxUnits: 1 })!;
  s.addLibraryResourceToProject(cid, resId);
  // Open een TWEEDE, leeg document; het eerste (met de materialisatie) wordt slapend.
  const firstDoc = useAppStore.getState().activeDocumentId;
  const secondDoc = s.newDocument();
  // Pool-edit terwijl het gematerialiseerde document slaapt.
  s.updatePoolResource(cid, resId, { maxUnits: 8 });
  const dormant = useAppStore.getState().documents.find(d => d.id === firstDoc);
  const dormantRes = dormant?.payload?.resources.find(r => r.libraryOrigin?.libraryItemId === resId);
  assert(dormantRes?.maxUnits === 8, 'pool-edit ververst de slapende payload (plan-eis 1)');
  assert(secondDoc !== firstDoc, 'tweede document is een ander id');
}
```

- [ ] **Step 2: Draai — verwacht FAIL**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=1` (pool-edit raakt de slapende payload nog niet).

- [ ] **Step 3: Implementatie**

Voeg aan de `LibrarySlice`-interface toe:

```ts
  /** Grens 3/4 (spec §3, plan-eis 1): ververs uitsluitend 'behind'-items van het gegeven bedrijf, in
   *  het ACTIEVE document én in elke SLAPENDE document-payload, binnen één set(). 'deviated'-items
   *  blijven ongemoeid (spec §3). Slapende documenten herrekenen pas bij activering (geen recompute
   *  hier); raakte de verversing een kalender, dan zet het `scheduleStale` (per document/payload),
   *  ZONDER isDirty. Niet-undoable (wist redoStacks). Retourneert het totaal aantal gewijzigde items. */
  refreshAllDocumentsFromPool: (companyId: string) => number;
```

Implementatie (behind-only via `classify*OnOpen`; module-lokale helpers per array; retourneert per array of er een kalender wijzigde zodat `scheduleStale` gericht landt):

```ts
  refreshAllDocumentsFromPool: (companyId) => {
    let changed = 0;
    set((s) => {
      if (!s.companies.some((c) => c.id === companyId)) return;
      const draftPool = s.pools[companyId];
      if (!draftPool) return;
      const pool = current(draftPool);

      // Behind-only (review-fix): alleen items waarvan het BESTAND ongewijzigd is (file == syncedHash)
      // maar de pool wijkt af. 'deviated' blijft staan. `calTouched` seint kalender-staleness.
      let calTouched = false;
      const refreshCalendars = (cals: import('@/types/calendar').WorkCalendar[]): import('@/types/calendar').WorkCalendar[] =>
        cals.map((cal) => {
          if (cal.libraryOrigin?.companyId !== companyId) return cal;
          if (classifyCalendarOnOpen(cal, pool) !== 'behind') return cal;
          changed++; calTouched = true;
          return applyCalendarUpdate(cal, pool);
        });
      const refreshResources = (ress: import('@/types/resource').Resource[]): import('@/types/resource').Resource[] =>
        ress.map((res) => {
          if (res.libraryOrigin?.companyId !== companyId) return res;
          if (classifyResourceOnOpen(res, pool) !== 'behind') return res;
          changed++;
          return applyResourceUpdate(res, pool);
        });

      // Actief document (top-level) — alleen als het aan dit bedrijf gekoppeld is.
      if (s.project.companyId === companyId) {
        calTouched = false;
        s.calendars = refreshCalendars(s.calendars.map((c) => current(c)));
        s.resources = refreshResources(s.resources.map((r) => current(r)));
        s.calendar = s.calendars.find((c) => c.id === s.project.calendarId) ?? s.calendar;
        if (changed > 0) s.redoStack = [];
        if (calTouched) s.scheduleStale = true; // kalenderwijziging raakt datums (geen isDirty, geen runCPM)
      }

      // Slapende payloads (plan-eis 1): muteer binnen dezelfde set(); herrekening pas bij activering.
      for (const doc of s.documents) {
        if (!doc.payload) continue; // actief document heeft payload===null.
        if (doc.payload.project.companyId !== companyId) continue;
        calTouched = false;
        doc.payload.calendars = refreshCalendars(doc.payload.calendars.map((c) => current(c)));
        doc.payload.resources = refreshResources(doc.payload.resources.map((r) => current(r)));
        doc.payload.redoStack = [];
        if (calTouched) doc.payload.scheduleStale = true; // zichtbaar bij switchDocument/activering
      }
    });
    if (changed > 0) {
      get().recomputeResourceLoad();
      get().recomputeViewRows();
    }
    return changed;
  },
```

- [ ] **Step 4: Wire grens 3 in de pool-CRUD-acties**

Laat de pool-edit-acties na hun `persist(get)` de verversing triggeren. Voeg in `src/state/slices/librarySlice.ts` aan het EIND van `updatePoolCalendar`, `updatePoolResource`, `removePoolCalendar`, `removePoolResource` (ná `persist(get);`) toe:

```ts
    get().refreshAllDocumentsFromPool(companyId);
```

(`promoteCalendarToPool`/`promoteResourceToPool` voegen een NIEUW poolitem toe zonder bestaande kopieën — die hoeven geen sibling-verversing; laat ze ongemoeid.)

- [ ] **Step 5: Verzoen het bestaande Elektricien-diffblok met behind-only grens 3 (cumulatieve-breuk-fix)**

Zodra grens 3 in Step 4 aan `updatePoolResource` hangt, breekt een bestaand testblok in `tests/library/check-library-slice.ts` (~regels 303–337, "Bijwerken vanuit bibliotheek"): dat blok materialiseert een `Elektricien`-resource en verwacht ná een pool-edit `diff === 'changed'`. Maar de kopie is dan **'behind'** (file == syncedHash, pool wijkt af), dus de behind-only `refreshAllDocumentsFromPool` ververst hem STIL bij `updatePoolResource` → `diffProjectResource` wordt `'up-to-date'` → de assert `status === 'changed'` (~316) faalt én het undoable `updateProjectResourceFromLibrary`-pad (~319/323) wordt een no-op. (Die undoable update-actie + `diffProjectResource` blijven bestaan — ze zijn niet gesloopt — dus dit blok blijft in de suite.)

**Fix:** maak de kopie **deviated** (lokaal bewerkt) vóór de pool-edit, zodat de behind-only grens-3-verversing hem laat staan en de diff observeerbaar `'changed'` blijft. Vervang het bestaande Elektricien-diffblok (~303–337) door:

```ts
// --- Bijwerken vanuit bibliotheek (diff + toepassen + "bestaat niet meer") ---
{
  const s = useAppStore.getState();
  const cid = s.defaultCompanyId;
  useAppStore.getState().bindProjectToCompany(cid); // materialiseren vereist een gebonden project (Taak 4)
  const poolResId = s.promoteResourceToPool(cid, { id: 'upd-res', name: 'Elektricien', type: 'LABOR', description: '', maxUnits: 1 })!;
  const added = useAppStore.getState().addLibraryResourceToProject(cid, poolResId);
  const projResId = added.resourceId!;

  assert(useAppStore.getState().diffProjectResource(projResId)?.status === 'up-to-date', 'diffProjectResource: vers = up-to-date');

  // Verzoening met behind-only grens 3 (Taak 6): bewerk de kopie LOKAAL (deviated: file != syncedHash)
  // vóór de pool-edit. Zo laat de grens-3-verversing bij updatePoolResource hem staan en blijft de diff
  // observeerbaar 'changed' (zonder deze stap ververst grens 3 hem stil naar 'up-to-date' en faalt de assert).
  useAppStore.getState().updateResource(projResId, { description: 'lokaal bewerkt' });

  // Wijzig de pool ⇒ diff blijft 'changed' (deviated kopie wordt door grens 3 niet aangeraakt).
  useAppStore.getState().updatePoolResource(cid, poolResId, { maxUnits: 4 });
  const d = useAppStore.getState().diffProjectResource(projResId);
  assert(d?.status === 'changed', 'diffProjectResource: pool gewijzigd ⇒ changed (deviated kopie blijft staan)');

  // undoBeforeUpd wordt hier gemeten — ná de lokale updateResource — dus de +1-assert telt alleen de
  // updateProjectResourceFromLibrary-snapshot (de extra updateResource zit al in de baseline).
  const undoBeforeUpd = useAppStore.getState().undoStack.length;
  useAppStore.getState().updateProjectResourceFromLibrary(projResId);
  const updated = useAppStore.getState().resources.find(r => r.id === projResId)!;
  assert(updated.maxUnits === 4, 'updateProjectResourceFromLibrary: waarde overgenomen');
  assert(updated.id === projResId, 'updateProjectResourceFromLibrary: project-id behouden');
  assert(useAppStore.getState().undoStack.length === undoBeforeUpd + 1, 'updateProjectResourceFromLibrary: undo-snapshot gepusht (E-3)');
  assert(useAppStore.getState().diffProjectResource(projResId)?.status === 'up-to-date', 'na bijwerken weer up-to-date');

  // Micro-stap (critreview taak 9): update-aanroep op een up-to-date item is óók een no-op — geen
  // loze undo-stap, isDirty blijft ongewijzigd (guard verruimd van 'removed' naar '!== changed').
  const undoBeforeUpToDate = useAppStore.getState().undoStack.length;
  const isDirtyBeforeUpToDate = useAppStore.getState().isDirty;
  useAppStore.getState().updateProjectResourceFromLibrary(projResId);
  assert(useAppStore.getState().undoStack.length === undoBeforeUpToDate, 'update op up-to-date resource: geen loze undo-snapshot');
  assert(useAppStore.getState().isDirty === isDirtyBeforeUpToDate, 'update op up-to-date resource: isDirty ongewijzigd');

  // Verwijder het origineel uit de pool ⇒ diff "removed", bijwerken is no-op (én geen undo-stap, E-3).
  useAppStore.getState().removePoolResource(cid, poolResId);
  assert(useAppStore.getState().diffProjectResource(projResId)?.status === 'removed', 'diffProjectResource: origineel weg ⇒ removed');
  const beforeName = useAppStore.getState().resources.find(r => r.id === projResId)!.name;
  const undoBeforeNoop = useAppStore.getState().undoStack.length;
  useAppStore.getState().updateProjectResourceFromLibrary(projResId);
  assert(useAppStore.getState().resources.find(r => r.id === projResId)!.name === beforeName, 'update op verwijderd origineel = no-op');
  assert(useAppStore.getState().undoStack.length === undoBeforeNoop, 'update op verwijderd origineel: geen loze undo-snapshot (E-3)');
}
```

Waarom de asserts nu kloppen (zelf nagelopen): (a) `updateResource` maakt file-hash ≠ syncedHash ⇒ classify `'deviated'` ⇒ grens 3 laat de kopie staan; (b) `updatePoolResource(maxUnits:4)` triggert grens 3 die de deviated kopie overslaat ⇒ diff (desc én maxUnits verschillen) blijft `'changed'`; (c) `undoBeforeUpd` wordt ná de lokale `updateResource` gemeten, dus `+1` telt uitsluitend de `updateProjectResourceFromLibrary`-snapshot; (d) na `updateProjectResourceFromLibrary` neemt de kopie álle poolvelden over ⇒ `'up-to-date'`. Het PROJECTDEFAULT-kalenderblok (~344) blijft ongemoeid — dat gebruikt geen `updatePoolResource` en is al veilig.

- [ ] **Step 6: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0` (de 190 bestaande + nieuwe checks). Verifieer expliciet geen afwijkingen: `bash tests/library/run.sh 2>&1 | grep '^   XX'` → geen output.
Run: `bash tests/planning/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 7: Build + commit**

```bash
npm run build
git add src/state/slices/librarySlice.ts tests/library/check-library-slice.ts
git commit -m "feat(library): pool-edit ververst alle open + slapende documenten (grens 3 behind-only, plan-eis 1)

Elektricien-diffblok verzoend met behind-only grens 3 (kopie deviated vóór pool-edit).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 7: Poolitem verwijderd ⇒ projectkopie blijft, gemarkeerd "niet meer in het bedrijf"

Een verwijderd poolitem laat de projectkopie functioneren op zijn laatste waarden (spec §3) — de `removePool*`-acties raken al alleen `s.pools`, en `refreshAll...` (Taak 6) slaat 'removed'-items over (diff-status ≠ 'changed'). We leggen dat gedrag vast als regressie plus een store-getter voor de markering die de UI (Taak 18) leest.

**Files:**
- Modify: `src/state/slices/librarySlice.ts`
- Test: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Falende test**

```ts
// --- Verwijderd poolitem: projectkopie blijft functioneren, gemarkeerd removed (spec §3) ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Del BV');
  s.bindProjectToCompany(cid);
  const resId = s.promoteResourceToPool(cid, { id: 'd', name: 'Dakdekker', type: 'LABOR', description: '', maxUnits: 2 })!;
  const added = s.addLibraryResourceToProject(cid, resId);
  s.removePoolResource(cid, resId);
  const copy = useAppStore.getState().resources.find(r => r.id === added.resourceId);
  assert(copy?.maxUnits === 2, 'projectkopie behoudt zijn laatste waarden na pool-verwijdering');
  assert(useAppStore.getState().onOpenStatusForResource(added.resourceId!) === 'removed', 'kopie is gemarkeerd removed');
}
```

- [ ] **Step 2: Draai — verwacht FAIL**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=1` (`onOpenStatusForResource` bestaat niet).

- [ ] **Step 3: Implementatie — markerings-getters**

Voeg aan de `LibrarySlice`-interface toe:

```ts
  /** Openings-status van één projectitem t.o.v. zijn eigen-bedrijf-pool (spec §2-scope): drijft de
   *  markeringen in de Projectweergave ("wijkt af — beslis" / "niet meer in het bedrijf"). Geen
   *  eigen-bedrijf-stempel of bedrijf lokaal onbekend ⇒ null (geen markering; los-gedrag). */
  onOpenStatusForResource: (resourceId: string) => import('@/services/library').OnOpenStatus | null;
  onOpenStatusForCalendar: (calendarId: string) => import('@/services/library').OnOpenStatus | null;
```

Implementatie (leest live uit de store; `classifyResourceOnOpen`/`classifyCalendarOnOpen` importeren uit `@/services/library`):

```ts
  onOpenStatusForResource: (resourceId) => {
    const s = get();
    const res = s.resources.find((r) => r.id === resourceId);
    const companyId = res?.libraryOrigin?.companyId;
    // §2-scope: alleen eigen-bedrijf-stempels van een lokaal bestaand bedrijf.
    if (!res || !companyId || companyId !== s.project.companyId || !s.companies.some((c) => c.id === companyId)) return null;
    const pool = s.pools[companyId];
    return pool ? classifyResourceOnOpen(res, pool) : null;
  },
  onOpenStatusForCalendar: (calendarId) => {
    const s = get();
    const cal = s.calendars.find((c) => c.id === calendarId);
    const companyId = cal?.libraryOrigin?.companyId;
    if (!cal || !companyId || companyId !== s.project.companyId || !s.companies.some((c) => c.id === companyId)) return null;
    const pool = s.pools[companyId];
    return pool ? classifyCalendarOnOpen(cal, pool) : null;
  },
```

- [ ] **Step 4: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/state/slices/librarySlice.ts tests/library/check-library-slice.ts
git commit -m "feat(library): markerings-getters voor removed/deviated projectkopieën (spec §3-scope)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 8: Binding, ontkoppelen, omkoppelen + atomische herkenning (plan-eis 5)

> **NB (critreview taak 8, al gefixt in code — afwijking van de letterlijke plancode hieronder):** `linkRecognizedItems`, `unbindProject` en de omkoppel-tak van `bindProjectToCompany` zijn UNDOABLE gemaakt (beginUndoable/finishMutation; wist tevens de redoStack) — het zijn gebruikersgebaren, geen verversing. `linkRecognizedItems` zet `scheduleStale` bij een kalender-link en slaat verdwenen pool-kandidaten stil over. Voor taken 10-14: reken op dit gedrag, niet op de oorspronkelijke niet-undoable plancode.

Koppelen start de herkenningsstap (spec §5). Het daadwerkelijke linken is **atomisch** (alles in één `set()` — een crash mag geen half-gestempelde toestand achterlaten, plan-eis 5). Ontkoppelen stript de stempels; omkoppelen doorloopt de herkenning opnieuw en vervangt/stript vreemde stempels.

**Files:**
- Modify: `src/state/slices/librarySlice.ts`
- Test: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Falende test**

```ts
// --- Herkenning + binding + ontkoppelen (spec §5, plan-eis 5) ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Herk BV');
  // Pool met een resource "Metselaar".
  const poolResId = s.promoteResourceToPool(cid, { id: 'p', name: 'Metselaar', type: 'LABOR', description: '', maxUnits: 3 })!;
  // Project met een naam-gelijk projectitem (niet gestempeld) via de resource-slice.
  const projResId = s.addResource({ name: 'metselaar', type: 'LABOR', description: '', maxUnits: 1 });
  s.bindProjectToCompany(cid);
  const cands = useAppStore.getState().computeRecognition();
  const match = cands.find(c => c.kind === 'resource' && c.projectId === projResId);
  assert(match?.suggestedPoolId === poolResId, 'herkenning stelt de naam-gelijke poolresource voor');
  // Bevestig de match ⇒ atomisch stempelen + verversen.
  useAppStore.getState().linkRecognizedItems([{ kind: 'resource', projectId: projResId, poolId: poolResId }]);
  const linked = useAppStore.getState().resources.find(r => r.id === projResId);
  assert(linked?.libraryOrigin?.libraryItemId === poolResId, 'linkRecognizedItems stempelt het projectitem');
  assert(!!linked?.libraryOrigin?.syncedHash, 'linkRecognizedItems zet een syncedHash');
  assert(linked?.maxUnits === 3, 'linkRecognizedItems ververst direct naar de poolwaarde');
  // Ontkoppelen stript de stempels.
  useAppStore.getState().unbindProject();
  const after = useAppStore.getState();
  assert(after.project.companyId === undefined, 'ontkoppelen wist de bedrijfsbinding');
  assert(after.resources.find(r => r.id === projResId)?.libraryOrigin === undefined, 'ontkoppelen stript de stempels');
}
```

- [ ] **Step 2: Draai — verwacht FAIL**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=1`.

- [ ] **Step 3: Implementatie**

Voeg aan de `LibrarySlice`-interface toe:

```ts
  /** Kandidaten voor de herkenningsstap (spec §5): elk NIET-gestempeld projectitem (resource/
   *  kalender) met de unieke naam-match uit de eigen-bedrijf-pool (of null als er geen/meerdere zijn). */
  computeRecognition: () => RecognitionCandidate[];
  /** Atomisch linken (plan-eis 5): stempel de gekozen projectitems, zet syncedHash, en ververs ze
   *  naar de poolwaarden — alles in één set(). */
  linkRecognizedItems: (links: RecognitionLink[]) => void;
  /** Ontkoppel het actieve project (spec §5): wis companyId/companyName en STRIP alle stempels —
   *  een los project heeft geen herkomst en ververst nergens vandaan. */
  unbindProject: () => void;
```

Voeg (boven de interface) de bijbehorende types toe in `src/state/slices/librarySlice.ts`:

```ts
export interface RecognitionCandidate {
  kind: 'resource' | 'calendar';
  projectId: string;
  projectName: string;
  /** De unieke naam-match uit de pool, of null (geen/meerdere kandidaten ⇒ handmatige keuze). */
  suggestedPoolId: string | null;
  suggestedPoolName: string | null;
}
export interface RecognitionLink {
  kind: 'resource' | 'calendar';
  projectId: string;
  poolId: string;
}
```

Implementaties (gebruik `matchByName` uit `@/services/library`; `copyResourceToProject`/`copyCalendarToProject` zijn hier niet nodig — we stempelen bestaande projectitems en verversen ze via `applyResourceUpdate`/`applyCalendarUpdate`, die de hash zetten):

```ts
  computeRecognition: () => {
    const s = get();
    const companyId = s.project.companyId;
    if (!companyId || !s.companies.some((c) => c.id === companyId)) return [];
    const pool = s.pools[companyId];
    if (!pool) return [];
    const out: RecognitionCandidate[] = [];
    for (const r of s.resources) {
      if (r.libraryOrigin?.companyId === companyId) continue; // al gestempeld voor dit bedrijf
      const m = matchByName(r.name, pool.resources);
      out.push({ kind: 'resource', projectId: r.id, projectName: r.name, suggestedPoolId: m?.id ?? null, suggestedPoolName: m?.name ?? null });
    }
    for (const c of s.calendars) {
      if (c.libraryOrigin?.companyId === companyId) continue;
      const m = matchByName(c.name, pool.calendars);
      out.push({ kind: 'calendar', projectId: c.id, projectName: c.name, suggestedPoolId: m?.id ?? null, suggestedPoolName: m?.name ?? null });
    }
    return out;
  },

  linkRecognizedItems: (links) => {
    set((s) => {
      const companyId = s.project.companyId;
      if (!companyId) return;
      const draftPool = s.pools[companyId];
      if (!draftPool) return;
      const pool = current(draftPool);
      // Plan-eis 5: alles in één set() — atomisch, geen half-gestempelde tussentoestand.
      for (const link of links) {
        if (link.kind === 'resource') {
          const idx = s.resources.findIndex((r) => r.id === link.projectId);
          if (idx < 0) continue;
          const stamped = { ...current(s.resources[idx]), libraryOrigin: makeOrigin(pool, link.poolId) };
          s.resources[idx] = applyResourceUpdate(stamped, pool); // stempelt + ververst + zet syncedHash
        } else {
          const idx = s.calendars.findIndex((c) => c.id === link.projectId);
          if (idx < 0) continue;
          const stamped = { ...current(s.calendars[idx]), libraryOrigin: makeOrigin(pool, link.poolId) };
          s.calendars[idx] = applyCalendarUpdate(stamped, pool);
        }
      }
      s.calendar = s.calendars.find((c) => c.id === s.project.calendarId) ?? s.calendar;
      s.isDirty = true;
    });
    get().recomputeResourceLoad();
    get().recomputeViewRows();
  },

  unbindProject: () => {
    set((s) => {
      s.project.companyId = undefined;
      s.project.companyName = undefined;
      s.resources = s.resources.map((r) => { const { libraryOrigin: _d, ...rest } = r; return rest; });
      s.calendars = s.calendars.map((c) => { const { libraryOrigin: _d, ...rest } = c; return rest; });
      s.calendar = s.calendars.find((c) => c.id === s.project.calendarId) ?? { ...s.calendar };
      s.isDirty = true;
    });
    get().recomputeResourceLoad();
    get().recomputeViewRows();
  },
```

Breid de top-import van `librarySlice.ts` uit met `makeOrigin, matchByName, classifyCalendarOnOpen, classifyResourceOnOpen` (voor Taken 5/7/8; voeg alleen wat nog ontbreekt toe).

`makeOrigin` moet hier **zonder** hash worden aangeroepen (`applyResourceUpdate`/`applyCalendarUpdate` overschrijven de stempel toch met de verse pool-hash) — dat klopt met de signatuur uit Taak 1.

- [ ] **Step 4: `bindProjectToCompany` rework — omkoppelen stript vreemde stempels**

Vervang de bestaande `bindProjectToCompany` door een variant die bij OMkoppelen (ander bedrijf) de bestaande vreemde stempels stript (spec §5: "bestaande (vreemde) stempels worden bij een match vervangen en anders gestript" — de herkenningsstap vervangt matches; hier strippen we alvast alle stempels van een ánder bedrijf zodat de herkenning schoon start):

```ts
  bindProjectToCompany: (companyId) => {
    set((s) => {
      const company = s.companies.find(c => c.id === companyId);
      if (!company) return;
      const previous = s.project.companyId;
      s.project.companyId = company.id;
      s.project.companyName = company.name;
      s.project.modifiedAt = new Date().toISOString();
      // Omkoppelen (spec §5): stempels van het VORIGE bedrijf zijn nu vreemd — strip ze zodat de
      // herkenningsstap schoon herbegint. Matches worden daarna opnieuw voorgesteld/gelinkt.
      if (previous && previous !== companyId) {
        s.resources = s.resources.map((r) => r.libraryOrigin?.companyId === previous ? (() => { const { libraryOrigin: _d, ...rest } = r; return rest; })() : r);
        s.calendars = s.calendars.map((c) => c.libraryOrigin?.companyId === previous ? (() => { const { libraryOrigin: _d, ...rest } = c; return rest; })() : c);
        s.calendar = s.calendars.find((c) => c.id === s.project.calendarId) ?? s.calendar;
      }
      s.isDirty = true;
    });
  },
```

- [ ] **Step 5: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.
Run: `bash tests/planning/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 6: Build + commit**

```bash
npm run build
git add src/state/slices/librarySlice.ts tests/library/check-library-slice.ts
git commit -m "feat(library): binding/ontkoppelen/omkoppelen + atomische herkenning (spec §5, plan-eis 5)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 9: Bedrijfsweergave-CRUD raakt uitsluitend `s.pools` (plan-eis 3)

De Bedrijfsweergave (Resources-tab, Taak 16) doet CRUD op het bedrijf. "Nieuw ⇒ direct in het bedrijf" heeft nog geen store-actie (`promote*` gaat vanuit een projectitem). We voegen `addPoolResource`/`addPoolCalendar` toe die **uitsluitend `s.pools`** muteren (invariant + testhaak, plan-eis 3); de propagatie naar `s.resources` loopt daarna via de aparte grens-3-verversing.

**Files:**
- Modify: `src/state/slices/librarySlice.ts`
- Test: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Falende test (invariant-testhaak)**

```ts
// --- Bedrijfsweergave-CRUD raakt uitsluitend s.pools (plan-eis 3) ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Inv BV');
  s.bindProjectToCompany(cid);
  const resSnapshotBefore = JSON.stringify(useAppStore.getState().resources);
  const poolVBefore = useAppStore.getState().pools[cid].poolVersion;
  const newId = s.addPoolResource(cid, { name: 'Grondwerker', type: 'LABOR', description: '', maxUnits: 4 });
  const after = useAppStore.getState();
  assert(!!newId && after.pools[cid].resources.some(r => r.id === newId), 'addPoolResource voegt toe aan de pool');
  assert(after.pools[cid].poolVersion === poolVBefore + 1, 'addPoolResource bumpt de pool');
  assert(JSON.stringify(after.resources) === resSnapshotBefore, 'addPoolResource raakt s.resources NIET (invariant, plan-eis 3)');
  const calId = s.addPoolCalendar(cid, { name: 'Weekendploeg', description: '', workDays: [6, 0], workStartHour: 8, workEndHour: 16, hoursPerDay: 8, holidays: [] });
  assert(!!calId && useAppStore.getState().pools[cid].calendars.some(c => c.id === calId), 'addPoolCalendar voegt toe aan de pool');
}
```

- [ ] **Step 2: Draai — verwacht FAIL**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=1`.

- [ ] **Step 3: Implementatie**

Voeg aan de interface toe:

```ts
  /** Bedrijfsweergave-CRUD: maak een NIEUW poolitem direct in het bedrijf (spec §4). Raakt
   *  UITSLUITEND s.pools (invariant, plan-eis 3); bumpt de pool. Retourneert de nieuwe pool-id. */
  addPoolResource: (companyId: string, resource: Omit<import('@/types/resource').Resource, 'id'>) => string | null;
  addPoolCalendar: (companyId: string, calendar: Omit<import('@/types/calendar').WorkCalendar, 'id'>) => string | null;
```

Implementatie:

```ts
  addPoolResource: (companyId, resource) => {
    let newId: string | null = null;
    set((s) => {
      const pool = s.pools[companyId];
      if (!pool) return;
      const id = generateId('res');
      const { libraryOrigin: _o, parentId: _p, calendarId: _c, ...rest } = resource as import('@/types/resource').Resource;
      pool.resources.push({ ...structuredClone(rest), id });
      s.pools[companyId] = bumpPool(pool);
      newId = id;
    });
    persist(get);
    return newId;
  },
  addPoolCalendar: (companyId, calendar) => {
    let newId: string | null = null;
    set((s) => {
      const pool = s.pools[companyId];
      if (!pool) return;
      const id = generateId('cal');
      const { libraryOrigin: _o, ...rest } = calendar as import('@/types/calendar').WorkCalendar;
      pool.calendars.push({ ...structuredClone(rest), id });
      s.pools[companyId] = bumpPool(pool);
      newId = id;
    });
    persist(get);
    return newId;
  },
```

(Deze acties triggeren bewust GEEN `refreshAllDocumentsFromPool` — een nieuw poolitem heeft geen bestaande kopieën. De invariant-test asserteert precies dat.)

- [ ] **Step 4: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/state/slices/librarySlice.ts tests/library/check-library-slice.ts
git commit -m "feat(library): addPool* — nieuw poolitem direct in het bedrijf, s.pools-only (plan-eis 3)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 10: Grens 1 — openen van een gekoppeld bestand (met afwijkingsonderscheid, plan-eis 4)

Na het volledig hydrateren van een geopend bestand (spec §3.1): classificeer de gestempelde items van het actieve document; ververs 'behind' stil; open bij ≥1 'deviated' het koppel-/afwijkingenscherm (Taak 14). Sequencing (plan-eis 4): eerst hydrateren, dán deze boundary — nooit mid-hydratatie.

**Files:**
- Modify: `src/state/slices/librarySlice.ts` (de gedeelde boundary-actie)
- Modify: `src/state/slices/fileSlice.ts` (aanroep na `applyLoadedProject`)
- Modify: `src/state/slices/uiSlice.ts` + `src/state/slices/types.ts` (nieuwe vlag `showLibraryLinkDialog`)
- Test: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Falende test**

Importeer `computeResourceHash` in `check-library-slice.ts` (indien nog niet gedaan; uit `@/services/library`).

```ts
// --- Grens 1: openen ververst 'behind' stil, markeert 'deviated' (spec §3) ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Open BV');
  s.bindProjectToCompany(cid);
  const resId = s.promoteResourceToPool(cid, { id: 'o', name: 'Ijzervlechter', type: 'LABOR', description: '', maxUnits: 2 })!;
  const added = s.addLibraryResourceToProject(cid, resId);
  s.updatePoolResource(cid, resId, { maxUnits: 9 });
  // "Net geopend" behind-toestand EXPLICIET bouwen (robuust tegen grens-3-timing): kopie op 2 MET de
  // syncedHash van maxUnits=2 ⇒ file==syncedHash ⇒ behind; pool staat op 9.
  const behindHash = computeResourceHash({ id: 'x', name: 'Ijzervlechter', type: 'LABOR', description: '', maxUnits: 2 });
  useAppStore.setState((st) => {
    const r = st.resources.find(r => r.id === added.resourceId);
    if (r) { r.maxUnits = 2; r.libraryOrigin!.syncedHash = behindHash; }
  });
  const result = useAppStore.getState().runOpenBoundary();
  const copy = useAppStore.getState().resources.find(r => r.id === added.resourceId);
  assert(copy?.maxUnits === 9, 'grens 1 ververst een behind-item stil naar de poolwaarde');
  assert(result.deviated === 0, 'geen deviated-items in dit scenario');
}
```

- [ ] **Step 2: Draai — verwacht FAIL**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=1` (`runOpenBoundary` bestaat niet).

- [ ] **Step 3: Nieuwe UI-vlag**

In `src/state/slices/types.ts`, vervang de twee te verwijderen vlaggen (dat gebeurt in Taak 19; voeg hier alleen de nieuwe toe) — voeg bij het B1-blok toe:

```ts
  /** session — het gedeelde koppel-/afwijkingenscherm open (spec §5/§3, plan-eis 7). Vervangt de
   *  verwijderde Add/Update-dialogen. Data wordt live uit de store afgeleid (computeRecognition +
   *  classify*), dus er is geen transient payload nodig. */
  showLibraryLinkDialog: boolean;
```

In `src/state/slices/uiSlice.ts` (`createDefaultUI`), voeg toe:

```ts
    showLibraryLinkDialog: false,
```

- [ ] **Step 4: `runOpenBoundary` in `librarySlice.ts`**

Voeg aan de interface toe:

```ts
  /** Grens 1/4 (spec §3): ná volledige hydratatie van het actieve document — ververs 'behind'-items
   *  stil, en open bij ≥1 'deviated'-item het koppel-/afwijkingenscherm. Retourneert de tellingen
   *  (voor het discrete signaal + tests). Plan-eis 4: roep dit ná de hydratatie aan, nooit ertijdens. */
  runOpenBoundary: () => { refreshed: number; deviated: number; removed: number };
```

Implementatie:

```ts
  runOpenBoundary: () => {
    const s0 = get();
    const companyId = s0.project.companyId;
    // §2-scope: onbekend/ontbrekend bedrijf ⇒ los-gedrag, geen mechaniek, geen valse labels.
    if (!companyId || !s0.companies.some((c) => c.id === companyId) || !s0.pools[companyId]) {
      return { refreshed: 0, deviated: 0, removed: 0 };
    }
    let deviated = 0; let removed = 0;
    for (const r of s0.resources) {
      if (r.libraryOrigin?.companyId !== companyId) continue;
      const st = classifyResourceOnOpen(r, s0.pools[companyId]);
      if (st === 'deviated') deviated++; else if (st === 'removed') removed++;
    }
    for (const c of s0.calendars) {
      if (c.libraryOrigin?.companyId !== companyId) continue;
      const st = classifyCalendarOnOpen(c, s0.pools[companyId]);
      if (st === 'deviated') deviated++; else if (st === 'removed') removed++;
    }
    // 'behind' stil verversen via de primitief uit Taak 5 (behind-only: 'deviated'-items blijven
    // ongemoeid, wachtend op een gebruikerskeuze). Niet-undoable, wist redoStack, geen isDirty.
    const refreshed = get().refreshBehindItems(companyId);
    if (refreshed > 0) get().setUI({ libraryRefreshNotice: refreshed });
    if (deviated > 0) get().setUI({ showLibraryLinkDialog: true });
    return { refreshed, deviated, removed };
  },
```

`refreshBehindItems` is de primitief uit **Taak 5** — hier NIET opnieuw definiëren, alleen aanroepen.

Voeg ook de `libraryRefreshNotice`-vlag toe — zie Taak 18 (voeg 'm hier al toe aan `types.ts`/`uiSlice.ts` zodat `setUI({ libraryRefreshNotice })` compileert):

In `types.ts` (B1-blok): `libraryRefreshNotice: number | null;`
In `uiSlice.ts` (`createDefaultUI`): `libraryRefreshNotice: null,`

- [ ] **Step 5: Wire in álle open-paden — `openFile` én `openRecentFile` (sequencing, plan-eis 4; review-punt 5)**

In `src/state/slices/fileSlice.ts`, in `openFile`, ná `get().applyLoadedProject(...)` en vóór `await pushRecent(...)`:

```ts
        // Grens 1 (spec §3, plan-eis 4): ná VOLLEDIGE hydratatie — behind stil verversen, deviated
        // markeren/vragen. Nooit tijdens de hydratatie zelf.
        get().runOpenBoundary();
```

**Óók in `openRecentFile`** (fileSlice ~regel 386, ná zijn `get().applyLoadedProject(...)`): dezelfde aanroep. `openRecentFile` is een volwaardig open-pad (`linkedOpen: true` — zie Taak 20) en moet dus dezelfde grens-1-check draaien:

```ts
        // Grens 1 (idem openFile): ná hydratatie de openings-check draaien.
        get().runOpenBoundary();
```

(De `loadState`/CSV/XML-paden krijgen dit NIET — die worden in Taak 20 juist als *los* geladen (`linkedOpen: false`, stempels gestript), dus `runOpenBoundary` zou er sowieso een no-op zijn.)

- [ ] **Step 6: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.
Run: `bash tests/planning/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 7: Build + commit**

```bash
npm run build
git add src/state/slices/librarySlice.ts src/state/slices/fileSlice.ts src/state/slices/uiSlice.ts src/state/slices/types.ts tests/library/check-library-slice.ts
git commit -m "feat(library): grens 1 — openen ververst behind stil, opent afwijkingenscherm bij deviated (spec §3, plan-eis 4)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 11: Grens 4 — crash-herstel draait de grens-1-check (plan-eis 6)

Na recovery-restore draait voor elk bedrijfsgebonden document dezelfde check als bij openen (spec §3.4). `restoreDocuments` herstelt alle documenten; ná het herstellen roepen we `runOpenBoundary` voor het actieve document (de slapende documenten krijgen hun check bij activering — grens 2, Taak 12).

**Files:**
- Modify: `src/hooks/useRecoveryRestore.ts`
- Test: `tests/library/check-library-slice.ts` (via de `restoreDocuments`+`runOpenBoundary`-store-route; headless — de hook zelf is React)

- [ ] **Step 1: Falende test (store-route die de hook naboots)**

```ts
// --- Grens 4: na recovery draait de grens-1-check voor het actieve document (plan-eis 6) ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Rec BV');
  const poolResId = s.promoteResourceToPool(cid, { id: 'rc', name: 'Sloper', type: 'LABOR', description: '', maxUnits: 7 })!;
  // Herstel een document dat aan dit bedrijf gekoppeld is met een ACHTERLOPENDE (behind) kopie.
  const syncedHash = computeResourceHash({ id: 'x', name: 'Sloper', type: 'LABOR', description: '', maxUnits: 3 });
  s.restoreDocuments([{
    id: 'doc-rec',
    project: { ...useAppStore.getState().project, id: 'p-rec', companyId: cid, companyName: 'Rec BV' },
    calendar: useAppStore.getState().calendar,
    tasks: [], sequences: [],
    resources: [{ id: 'rr', name: 'Sloper', type: 'LABOR', description: '', maxUnits: 3, libraryOrigin: { companyId: cid, libraryItemId: poolResId, poolVersion: 1, syncedHash } }],
    assignments: [], filePath: null, isDirty: false,
  }], 'doc-rec');
  const res = useAppStore.getState().runOpenBoundary();
  const copy = useAppStore.getState().resources.find(r => r.id === 'rr');
  assert(copy?.maxUnits === 7, 'grens 4 ververst een behind-kopie stil na herstel');
  assert(res.refreshed === 1, 'grens 4 telt de verversing');
}
```

Voeg `computeResourceHash` toe aan de imports van `check-library-slice.ts` als nog niet aanwezig.

- [ ] **Step 2: Draai — verwacht FAIL of PASS?**

Run: `bash tests/library/run.sh; echo "EXIT=$?"`. Als `runOpenBoundary` uit Taak 10 al bestaat, kan deze test al slagen — dat is prima; de code-wijziging in deze taak zit in de React-hook (die de suite niet dekt). Behandel deze test als de headless *contract*-borging; de hook-wijziging is stap 3.

- [ ] **Step 3: Hook wire**

In `src/hooks/useRecoveryRestore.ts`, in de `onRestore`-closure, ná `useAppStore.getState().restoreDocuments(restored, loaded.activeDocumentId);`:

```ts
              // Grens 4 (spec §3.4, plan-eis 6): crash-herstel telt als grens 1 — draai voor het
              // actieve, herstelde document dezelfde openings-check (behind stil verversen, deviated
              // markeren/vragen). Slapende herstelde documenten krijgen hun check bij activering (grens 2).
              useAppStore.getState().runOpenBoundary();
```

- [ ] **Step 4: Draai + build**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.
Run: `npm run build` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRecoveryRestore.ts tests/library/check-library-slice.ts
git commit -m "feat(library): crash-herstel draait de grens-1-check (spec §3.4, plan-eis 6)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 12: Grens 2 — documentwissel ververst stil

> **NB (critreview taak 10 — verplicht bij deze taak):** de ui-vlaggen `showLibraryLinkDialog`/`libraryRefreshNotice` zijn app-globaal en worden door `runOpenBoundary` alleen AANgezet. Documentwissel moet ze deterministisch resetten (het nieuwe actieve document bepaalt de nieuwe toestand), anders toont taak 14's dialoog stale data van het vorige document. Neem een expliciete reset + test op.

Activeren van een geopend document (spec §3.2) ververst stil. `switchDocument`/`closeDocument`(naar-buur) hydrateren het inkomende document; ná hydratatie draaien we `refreshBehindItems` (behind-only, uit Taak 5 — stil, geen dialoog bij documentwissel; onbesliste 'deviated'-items blijven gemarkeerd, spec §3). Slapende payloads zijn al bijgewerkt door grens 3; deze grens vangt het geval dat de pool wijzigde terwijl het document sliep vóór grens 3 bestond (defensief + zelfhelend).

**Files:**
- Modify: `src/state/slices/documentSlice.ts`
- Test: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Falende test**

```ts
// --- Grens 2: documentwissel ververst het inkomende document stil (spec §3.2) ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Switch BV');
  s.bindProjectToCompany(cid);
  const resId = s.promoteResourceToPool(cid, { id: 'sw', name: 'Schilder', type: 'LABOR', description: '', maxUnits: 1 })!;
  const added = s.addLibraryResourceToProject(cid, resId);
  const docA = useAppStore.getState().activeDocumentId;
  const docB = s.newDocument();
  // Forceer de slapende A-payload naar een achterlopende waarde (simuleert pre-grens-3 drift).
  // Muterende setState-vorm (gevestigd patroon), NIET een partieel-object-return.
  useAppStore.setState((st) => {
    const d = st.documents.find(d => d.id === docA);
    const r = d?.payload?.resources.find(r => r.id === added.resourceId);
    if (r) r.maxUnits = 1;
  });
  s.updatePoolResource(cid, resId, { maxUnits: 6 }); // pool schuift op; grens 3 raakt A's payload
  s.switchDocument(docA); // activeren ⇒ grens 2 ververst stil
  const copy = useAppStore.getState().resources.find(r => r.id === added.resourceId);
  assert(copy?.maxUnits === 6, 'grens 2 ververst het geactiveerde document naar de poolwaarde');
  assert(docB !== docA, 'twee documenten');
}
```

- [ ] **Step 2: Draai — verwacht FAIL of PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"`. Grens 3 (Taak 6) werkt de slapende payload al bij, dus de assert kan al slagen. De code-wijziging borgt het zelfhelend gedrag; als de test al groen is, ga naar stap 3 en verifieer dat 'ie groen blijft.

- [ ] **Step 3: Wire in `documentSlice`**

In `src/state/slices/documentSlice.ts`, in `switchDocument`, ná `get().recomputeViewRows();` (buiten de `set()`):

```ts
    // Grens 2 (spec §3.2): activeren ververst STIL — behind-only (deviated blijft gemarkeerd, spec §3),
    // zelfhelend als de pool schoof terwijl het document sliep. Geen dialoog bij documentwissel
    // (alleen bij openen/herstel). Gebruikt de primitief uit Taak 5.
    { const cid = get().project.companyId; if (cid) get().refreshBehindItems(cid); }
```

Doe hetzelfde aan het eind van `closeDocument` in de "actief document → naar buur"-tak (ná `get().recomputeViewRows();`, buiten de `set()`).

- [ ] **Step 4: Draai + build**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.
Run: `bash tests/planning/run.sh; echo "EXIT=$?"` → `EXIT=0`.
Run: `npm run build` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/state/slices/documentSlice.ts tests/library/check-library-slice.ts
git commit -m "feat(library): grens 2 — documentwissel ververst stil (spec §3.2)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 13: Pool-import = externe wijziging (grens-1-gedrag)

Na een pool-import (hele vervanging, evt. ouder bestand — de demping waarschuwt vooraf) draait voor elk open bedrijfsgebonden document de **afwijkingscheck van grens 1**, niet de stille grens 3 (spec §3). De gebruiker houdt regie wanneer een import zijn open projecten zou herschrijven.

**Files:**
- Modify: `src/components/dialogs/PoolImportDialog.tsx`
- Test: manueel/store — de `replacePool`+`runOpenBoundary`-route (headless-borging in `check-library-slice.ts`)

- [ ] **Step 1: Falende test (store-route)**

```ts
// --- Pool-import = externe wijziging: draait grens 1, niet stille grens 3 (spec §3) ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Imp BV');
  s.bindProjectToCompany(cid);
  const resId = s.promoteResourceToPool(cid, { id: 'im', name: 'Betonvlechter', type: 'LABOR', description: '', maxUnits: 2 })!;
  const added = s.addLibraryResourceToProject(cid, resId);
  // Geïmporteerde pool = zelfde item-id, andere waarde. replacePool + grens 1.
  const imported = { ...useAppStore.getState().pools[cid], poolVersion: 99, modifiedAt: new Date().toISOString(),
    resources: [{ id: resId, name: 'Betonvlechter', type: 'LABOR' as const, description: '', maxUnits: 12 }] };
  s.replacePool(cid, imported);
  const res = useAppStore.getState().runOpenBoundary();
  const copy = useAppStore.getState().resources.find(r => r.id === added.resourceId);
  assert(copy?.maxUnits === 12, 'na import + grens 1 volgt de behind-kopie de nieuwe pool');
  assert(res.refreshed >= 1, 'import telt als grens 1 (behind stil ververst)');
}
```

- [ ] **Step 2: Draai — verwacht PASS (route bestaat na Taak 10)**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`. (Deze test borgt het contract; de dialoog-wire is stap 3.)

- [ ] **Step 3: Wire in `PoolImportDialog`**

Lees `src/components/dialogs/PoolImportDialog.tsx`. Zoek de bevestig-handler die `replacePool(...)` aanroept. Voeg direct ná de `replacePool`-aanroep toe (in dezelfde handler, ná het sluiten van de dialoog):

```tsx
    // Pool-import is een EXTERNE wijziging (spec §3): draai grens 1 voor het actieve document i.p.v.
    // de stille grens 3 — de gebruiker houdt regie wanneer een import open projecten herschrijft.
    useAppStore.getState().runOpenBoundary();
```

Zorg dat `useAppStore` in dat bestand geïmporteerd is (dat is het al, gezien `replacePool` via de store loopt — verifieer en voeg anders `import { useAppStore } from '@/state/appStore';` toe).

- [ ] **Step 4: Draai + build**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.
Run: `npm run build` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/dialogs/PoolImportDialog.tsx tests/library/check-library-slice.ts
git commit -m "feat(library): pool-import draait grens 1 (externe wijziging, regie bij de gebruiker) (spec §3)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 14: Het gedeelde koppel-/afwijkingenscherm `LibraryLinkDialog` (plan-eis 7)

> **NB (critreview taak 10 — verplicht bij deze taak):** het sluiten van de dialoog (elke uitgang: klaar, annuleren, Escape) moet `showLibraryLinkDialog` op false zetten; verifieer ook dat een `openFile` naar een ander document terwijl de dialoog openstaat geen stale dialoog-inhoud achterlaat (grens 2-reset uit taak 12 + live uit de store afleiden).
>
> **NB (critreview taak 12 — verplichte VOORSTAP van deze taak, vóór het bedraden van een consument):** maak de vlag-invariant universeel: (1) `runOpenBoundary` vestigt voortaan de VOLLEDIGE vlagtoestand — óók wissen (`showLibraryLinkDialog: false`, `libraryRefreshNotice: null`) als er níéts deviated/behind is; (2) `newDocument()` en de laatste-sluit-naar-leeg-tak van `closeDocument` resetten beide vlaggen. Anders lekt stale dialoogstatus via File→Nieuw en openFile-in-nieuw-document. Mét tests (set-only-regressie moet rood worden).

Eén scherm, gedeelde vormtaal (spec §5/§3, plan-eis 7). Het toont twee secties: **Herkennen** (niet-gestempelde projectitems met hun unieke naam-match, per stuk of bulk bevestigen ⇒ `linkRecognizedItems`) en **Afwijkingen** (gestempelde items die 'deviated'/'removed' zijn: per item **bedrijfswaarden gebruiken** óf **bestandswaarden overnemen in het bedrijf** — met de waarschuwing "dit geldt voor al je projecten"). Annuleren/"later beslissen" mag (derde uitkomst, spec §3): het scherm sluit, markeringen blijven, en het is handmatig heropbaar. Nooit een verkapte "toevoegen uit bibliotheek"-dialoog (anti-dialoog-clausule §5): geen knop die poolitems één voor één een project in kopieert.

**Files:**
- Create: `src/components/dialogs/LibraryLinkDialog.tsx`
- Modify: `src/state/slices/librarySlice.ts` (`resolveDeviation`)
- Modify: `src/App.tsx` (mount)
- Modify: `src/i18n/locales/<loc>/common.json` (14 locales — nieuwe keys)
- Test: `tests/library/check-library-slice.ts` (`resolveDeviation`)

- [ ] **Step 1: Falende test voor `resolveDeviation`**

Grens 3 is nu **behind-only** (Taak 6, review-fix), dus een lokaal-bewerkte (deviated) kopie wordt door `updatePoolResource` NIET stil overschreven — de test is daardoor eenvoudig en robuust. Muterende setState-vorm.

```ts
// --- resolveDeviation: bedrijfswaarden vs bestandswaarden-overnemen (spec §3) ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Dev BV');
  s.bindProjectToCompany(cid);
  const resId = s.promoteResourceToPool(cid, { id: 'dv', name: 'Timmerman', type: 'LABOR', description: '', maxUnits: 4 })!;
  const added = s.addLibraryResourceToProject(cid, resId); // kopie=4, syncedHash=hash(4)
  s.updatePoolResource(cid, resId, { maxUnits: 10 });      // pool schuift
  // Lokaal bewerken ⇒ file=hash(6) != syncedHash=hash(4) ⇒ deviated (grens 3 laat 'm staan).
  useAppStore.setState((st) => {
    const r = st.resources.find(r => r.id === added.resourceId);
    if (r) r.maxUnits = 6;
  });
  s.resolveDeviation({ kind: 'resource', projectId: added.resourceId! }, 'company'); // neem poolwaarde
  assert(useAppStore.getState().resources.find(r => r.id === added.resourceId)?.maxUnits === 10, "resolveDeviation('company') neemt de poolwaarde");

  // Nieuw deviated geval, kies 'file' ⇒ pool neemt de bestandswaarde over (geldt voor alle projecten).
  const res2 = s.promoteResourceToPool(cid, { id: 'dv2', name: 'Ijzerman', type: 'LABOR', description: '', maxUnits: 1 })!;
  const add2 = s.addLibraryResourceToProject(cid, res2);   // kopie=1, syncedHash=hash(1)
  useAppStore.setState((st) => {
    const r = st.resources.find(r => r.id === add2.resourceId);
    if (r) r.maxUnits = 3;                                 // deviated: file=hash(3) != syncedHash=hash(1)
  });
  s.resolveDeviation({ kind: 'resource', projectId: add2.resourceId! }, 'file');
  assert(useAppStore.getState().pools[cid].resources.find(r => r.id === res2)?.maxUnits === 3, "resolveDeviation('file') schrijft de bestandswaarde naar de pool");
}
```

- [ ] **Step 2: Draai — verwacht FAIL**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=1` (`resolveDeviation` bestaat niet).

- [ ] **Step 3: `resolveDeviation` in `librarySlice.ts`**

Interface:

```ts
  /** Los één afwijking op (spec §3, koppel-/afwijkingenscherm). 'company' = neem de poolwaarde over
   *  (ververs het item, niet-undoable, wist redoStack, geen isDirty). 'file' = neem de BESTANDSwaarde
   *  over in het bedrijf: werk het poolitem bij (bumpt de pool — "geldt voor al je projecten") en
   *  ververs de siblings; het net-geopende item krijgt de verse syncedHash zonder dubbele verversing
   *  (plan-eis 4). */
  resolveDeviation: (ref: { kind: 'resource' | 'calendar'; projectId: string }, choice: 'company' | 'file') => void;
```

Implementatie (importeer `computeCalendarHash`/`computeResourceHash` uit `@/services/library`):

```ts
  resolveDeviation: (ref, choice) => {
    const companyId = get().project.companyId;
    if (!companyId) return;
    if (choice === 'company') {
      // Neem poolwaarde over: gerichte niet-undoable verversing van dit ene item.
      set((s) => {
        const draftPool = s.pools[companyId];
        if (!draftPool) return;
        const pool = current(draftPool);
        if (ref.kind === 'resource') {
          const idx = s.resources.findIndex((r) => r.id === ref.projectId);
          if (idx < 0 || diffResourceVsPool(current(s.resources[idx]), pool).status !== 'changed') return;
          s.resources[idx] = applyResourceUpdate(current(s.resources[idx]), pool);
        } else {
          const idx = s.calendars.findIndex((c) => c.id === ref.projectId);
          if (idx < 0 || diffCalendarVsPool(current(s.calendars[idx]), pool).status !== 'changed') return;
          s.calendars[idx] = applyCalendarUpdate(current(s.calendars[idx]), pool);
          s.calendar = s.calendars.find((c) => c.id === s.project.calendarId) ?? s.calendar;
          // Review-fix (spec §3): kalenderwaarden gewijzigd ⇒ scheduleStale (geen isDirty, geen runCPM).
          s.scheduleStale = true;
        }
        s.redoStack = [];
      });
      get().recomputeResourceLoad();
      get().recomputeViewRows();
      return;
    }
    // choice === 'file': schrijf de BESTANDSwaarde naar het poolitem (bump), zet de verse syncedHash op
    // het net-geopende item, en ververs de siblings (plan-eis 4: geen dubbele verversing van dit item).
    set((s) => {
      const draftPool = s.pools[companyId];
      if (!draftPool) return;
      if (ref.kind === 'resource') {
        const item = current(s.resources.find((r) => r.id === ref.projectId));
        const libId = item?.libraryOrigin?.libraryItemId;
        const pIdx = libId ? draftPool.resources.findIndex((r) => r.id === libId) : -1;
        if (!item || pIdx < 0) return;
        // Overschrijf de gevolgde velden van het poolitem met de bestandswaarden.
        for (const f of RESOURCE_DIFF_FIELDS_LOCAL) (draftPool.resources[pIdx] as Record<string, unknown>)[f] = (item as Record<string, unknown>)[f];
        s.pools[companyId] = bumpPool(draftPool);
        const newHash = computeResourceHash(current(s.pools[companyId]).resources[pIdx]);
        const rIdx = s.resources.findIndex((r) => r.id === ref.projectId);
        s.resources[rIdx] = { ...item, libraryOrigin: makeOrigin(current(s.pools[companyId]), libId!, newHash) };
      } else {
        const item = current(s.calendars.find((c) => c.id === ref.projectId));
        const libId = item?.libraryOrigin?.libraryItemId;
        const pIdx = libId ? draftPool.calendars.findIndex((c) => c.id === libId) : -1;
        if (!item || pIdx < 0) return;
        for (const f of CALENDAR_DIFF_FIELDS_LOCAL) (draftPool.calendars[pIdx] as Record<string, unknown>)[f] = (item as Record<string, unknown>)[f];
        s.pools[companyId] = bumpPool(draftPool);
        const newHash = computeCalendarHash(current(s.pools[companyId]).calendars[pIdx]);
        const cIdx = s.calendars.findIndex((c) => c.id === ref.projectId);
        s.calendars[cIdx] = { ...item, libraryOrigin: makeOrigin(current(s.pools[companyId]), libId!, newHash) };
        s.calendar = s.calendars.find((c) => c.id === s.project.calendarId) ?? s.calendar;
      }
    });
    persist(get);
    // Siblings in alle open/slapende documenten volgen de nieuwe pool (plan-eis 4). Het net-opgeloste
    // item is nu gelijk aan de pool (diff up-to-date) ⇒ refreshAllDocumentsFromPool raakt het niet.
    get().refreshAllDocumentsFromPool(companyId);
  },
```

Voor de veldlijsten in de 'file'-tak: exporteer `RESOURCE_DIFF_FIELDS`/`CALENDAR_DIFF_FIELDS` uit `libraryOps` (dat deden we in Taak 1) en importeer ze in `librarySlice.ts` onder een lokale alias om botsing te vermijden:

```ts
import { /* ... bestaande ... */ CALENDAR_DIFF_FIELDS as CALENDAR_DIFF_FIELDS_LOCAL, RESOURCE_DIFF_FIELDS as RESOURCE_DIFF_FIELDS_LOCAL, computeCalendarHash, computeResourceHash } from '@/services/library';
```

- [ ] **Step 4: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 5: Nieuwe i18n-keys (14 locales)**

Voeg aan het `companyLibrary`-blok in `src/i18n/locales/nl/common.json` toe (Nederlands is de canonieke bron; vertaal per locale, of neem de NL-string over waar een vertaling ontbreekt — nooit een key weglaten):

```json
    "linkTitle": "Bedrijf koppelen",
    "recognizeHeading": "Herkennen",
    "recognizeIntro": "Deze projectonderdelen lijken op onderdelen van het bedrijf. Koppel ze zodat ze meelopen met het bedrijf.",
    "deviationsHeading": "Afwijkingen",
    "deviationsIntro": "Deze onderdelen wijken af van het bedrijf. Kies per onderdeel wat de waarheid is.",
    "suggestedMatch": "Voorstel: {{name}}",
    "noMatch": "Geen voorstel — kies handmatig",
    "linkThis": "Koppelen",
    "linkAll": "Alle voorstellen koppelen",
    "useCompanyValues": "Bedrijfswaarden gebruiken",
    "adoptFileValues": "Bestandswaarden overnemen in het bedrijf",
    "adoptWarning": "Let op: dit past het bedrijf aan en geldt voor al je projecten.",
    "decideLater": "Later beslissen",
    "refreshNotice": "{{count}} onderdelen bijgewerkt vanuit het bedrijf",
    "deviates": "wijkt af — beslis",
    "notInCompany": "niet meer in het bedrijf"
```

Doe dezelfde toevoeging in de 13 overige locales (`ar de en es fa fr it ja ko pl pt tr zh`). Voor `en` een echte Engelse vertaling; voor de overige talen mag je de bestaande vertaalconventie volgen of de Engelse string overnemen indien geen vertaling voorhanden — maar de key MOET in alle 14 bestanden bestaan (anders wees + i18n-inconsistentie). Verifieer met:

```bash
for f in src/i18n/locales/*/common.json; do node -e "const j=require('./$f'); if(!j.companyLibrary.linkTitle||!j.companyLibrary.refreshNotice){console.log('MIST keys: $f'); process.exit(1)}"; done; echo "i18n OK"
```

Verwacht: `i18n OK`, geen `MIST keys`-regel.

- [ ] **Step 6: De component**

Maak `src/components/dialogs/LibraryLinkDialog.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { X, Link2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/state/appStore';
import { Dialog } from '@/components/common/Dialog';

/**
 * Het gedeelde koppel-/afwijkingenscherm (spec §5/§3, plan-eis 7). Vervangt AddFromLibraryDialog én
 * UpdateFromLibraryDialog. Twee secties met gedeelde vormtaal:
 *  - Herkennen: niet-gestempelde projectitems met hun unieke naam-match; per stuk of "alle voorstellen".
 *  - Afwijkingen: gestempelde items die deviated/removed zijn; per item bedrijfs- óf bestandswaarden.
 * Anti-dialoog-clausule (§5): NOOIT poolitems één voor één een project in kopiëren — koppelen/optillen
 * bij een koppelmoment. "Later beslissen" sluit het scherm; markeringen blijven; heropbaar via de
 * Projectweergave.
 */
export function LibraryLinkDialog() {
  const { t } = useTranslation('common');
  const open = useAppStore((s) => s.ui.showLibraryLinkDialog);
  const setUI = useAppStore((s) => s.setUI);
  // Live afgeleid uit de store (geen transient payload): abonneer op de bronnen zodat het scherm
  // herrendert bij elke oplossing/koppeling.
  useAppStore((s) => s.resources);
  useAppStore((s) => s.calendars);
  useAppStore((s) => s.pools);
  const companyId = useAppStore((s) => s.project.companyId);
  const computeRecognition = useAppStore((s) => s.computeRecognition);
  const linkRecognizedItems = useAppStore((s) => s.linkRecognizedItems);
  const resolveDeviation = useAppStore((s) => s.resolveDeviation);
  const onOpenStatusForResource = useAppStore((s) => s.onOpenStatusForResource);
  const onOpenStatusForCalendar = useAppStore((s) => s.onOpenStatusForCalendar);
  const resources = useAppStore((s) => s.resources);
  const calendars = useAppStore((s) => s.calendars);

  if (!open) return null;
  const close = () => setUI({ showLibraryLinkDialog: false });

  const candidates = companyId ? computeRecognition() : [];
  const withMatch = candidates.filter((c) => c.suggestedPoolId);

  // Afwijkingen: gestempelde items die deviated/removed zijn (spec §2-scope via de getters).
  const deviatedResources = resources.filter((r) => {
    const st = onOpenStatusForResource(r.id); return st === 'deviated' || st === 'removed';
  }).map((r) => ({ id: r.id, name: r.name, status: onOpenStatusForResource(r.id)! }));
  const deviatedCalendars = calendars.filter((c) => {
    const st = onOpenStatusForCalendar(c.id); return st === 'deviated' || st === 'removed';
  }).map((c) => ({ id: c.id, name: c.name, status: onOpenStatusForCalendar(c.id)! }));

  const linkAll = () => linkRecognizedItems(
    withMatch.map((c) => ({ kind: c.kind, projectId: c.projectId, poolId: c.suggestedPoolId! })),
  );

  return (
    <Dialog
      onBackdropClick={close}
      onCancel={close}
      panelClassName="bg-surface border border-border rounded-[14px] shadow-[var(--shadow-pop)] w-[640px] max-h-[88vh] flex flex-col overflow-hidden"
      panelProps={{ 'data-ops-library-link-dialog': true }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>{t('companyLibrary.linkTitle')}</span>
        <button onClick={close} className="p-1 hover:bg-surface-hover rounded-[8px]"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
        {/* ── Herkennen ── */}
        {candidates.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>{t('companyLibrary.recognizeHeading')}</h3>
              {withMatch.length > 1 && (
                <button onClick={linkAll} className="btn btn--sm btn--secondary flex items-center gap-1">
                  <Link2 size={12} /> {t('companyLibrary.linkAll')}
                </button>
              )}
            </div>
            <p className="text-text-secondary">{t('companyLibrary.recognizeIntro')}</p>
            <ul className="flex flex-col gap-1">
              {candidates.map((c) => (
                <li key={`${c.kind}-${c.projectId}`} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-[8px] border border-border">
                  <span className="flex items-center gap-1.5">
                    <b>{c.projectName}</b>
                    {c.suggestedPoolName
                      ? <span className="text-text-secondary flex items-center gap-1"><ArrowRight size={11} /> {t('companyLibrary.suggestedMatch', { name: c.suggestedPoolName })}</span>
                      : <span className="text-text-secondary italic">{t('companyLibrary.noMatch')}</span>}
                  </span>
                  {c.suggestedPoolId && (
                    <button
                      onClick={() => linkRecognizedItems([{ kind: c.kind, projectId: c.projectId, poolId: c.suggestedPoolId! }])}
                      className="btn btn--sm btn--secondary flex items-center gap-1"
                    >
                      <Link2 size={12} /> {t('companyLibrary.linkThis')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Afwijkingen ── */}
        {(deviatedResources.length > 0 || deviatedCalendars.length > 0) && (
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>{t('companyLibrary.deviationsHeading')}</h3>
            <p className="text-text-secondary">{t('companyLibrary.deviationsIntro')}</p>
            <ul className="flex flex-col gap-2">
              {[...deviatedResources.map((d) => ({ ...d, kind: 'resource' as const })),
                ...deviatedCalendars.map((d) => ({ ...d, kind: 'calendar' as const }))].map((d) => (
                <li key={`${d.kind}-${d.id}`} className="flex flex-col gap-1.5 px-2 py-2 rounded-[8px] border border-border">
                  <div className="flex items-center justify-between">
                    <b>{d.name}</b>
                    <span className="badge badge--red flex items-center gap-1">
                      <AlertCircle size={11} /> {d.status === 'removed' ? t('companyLibrary.notInCompany') : t('companyLibrary.deviates')}
                    </span>
                  </div>
                  {d.status === 'deviated' && (
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <button onClick={() => resolveDeviation({ kind: d.kind, projectId: d.id }, 'company')} className="btn btn--sm btn--secondary">{t('companyLibrary.useCompanyValues')}</button>
                        <button onClick={() => resolveDeviation({ kind: d.kind, projectId: d.id }, 'file')} className="btn btn--sm btn--secondary">{t('companyLibrary.adoptFileValues')}</button>
                      </div>
                      <span className="text-text-secondary italic">{t('companyLibrary.adoptWarning')}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {candidates.length === 0 && deviatedResources.length === 0 && deviatedCalendars.length === 0 && (
          <p className="text-text-secondary italic">{t('companyLibrary.upToDate')}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 px-4 py-3 border-t border-border">
        <button onClick={close} className="btn btn--sm btn--primary">{t('companyLibrary.decideLater')}</button>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 7: Mount in `App.tsx`**

In `src/App.tsx`: voeg de import toe (naast de bestaande dialoog-imports) en mount 'm bij de andere dialogen. (De verwijdering van `AddFromLibraryDialog`/`UpdateFromLibraryDialog` gebeurt in Taak 19; hier alleen toevoegen.)

```tsx
import { LibraryLinkDialog } from '@/components/dialogs/LibraryLinkDialog';
```

En bij de mounts (naast `<PoolImportDialog />`):

```tsx
      <LibraryLinkDialog />
```

- [ ] **Step 8: Build-poort**

Run: `npm run build` → exit 0 (React/TSX + tsc). Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 9: Commit**

```bash
git add src/components/dialogs/LibraryLinkDialog.tsx src/state/slices/librarySlice.ts src/App.tsx src/i18n/locales tests/library/check-library-slice.ts
git commit -m "feat(library): gedeeld koppel-/afwijkingenscherm LibraryLinkDialog (spec §5/§3, plan-eis 7)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 15: Altijd-zichtbare bedrijfskoppeling in wizard + Projectinfo (spec §2)

De koppeling project ↔ bedrijf is ALTIJD zichtbaar en expliciet, óók bij één bedrijf (spec §2 — de enige uitzondering op de "verberg bedrijfs-UI bij ≤1 bedrijf"-regel). Default = het standaardbedrijf voorgeselecteerd. Het bestaande vrije-tekstveld "company" krijgt het label "Opdrachtgever/organisatie". Koppelen via Projectinfo start de herkenningsstap (opent `LibraryLinkDialog`).

**Files:**
- Modify: `src/components/dialogs/ProjectInfoDialog.tsx`
- Modify: `src/i18n/locales/<loc>/menu.json` en/of `common.json` (label-key)
- Test: handmatig (React); geen headless test. Verificatie via build + zelftest-harness optioneel.

- [ ] **Step 1: Label-key toevoegen (14 locales)**

Voeg in `src/i18n/locales/nl/common.json` `companyLibrary` toe:

```json
    "linkedCompany": "Bedrijf",
    "noCompanyLinked": "geen (los project)",
    "clientOrg": "Opdrachtgever/organisatie"
```

Doe dit in alle 14 locales (NL canoniek; overige vertalen of NL/EN overnemen — key mag nooit ontbreken).

- [ ] **Step 2: Bedrijfsselector in `ProjectInfoDialog`**

Lees de huidige `company`-invoerregel (rond regel 183–184). Vervang het label door de nieuwe key en voeg een bedrijfsselector toe die ALTIJD zichtbaar is. Voeg bovenin de component (bij de andere `useAppStore`-hooks) toe:

```tsx
  const defaultCompanyId = useAppStore(s => s.defaultCompanyId);
  const bindProjectToCompany = useAppStore(s => s.bindProjectToCompany);
  const unbindProject = useAppStore(s => s.unbindProject);
  // Voorselectie: het gekoppelde bedrijf, anders het standaardbedrijf (spec §2 — gekoppeld is de norm).
  const [linkedCompanyId, setLinkedCompanyId] = useState<string>(isNew ? defaultCompanyId : (project.companyId ?? ''));
```

Bij het bestaande `company`-veld (het vrije-tekstveld): hernoem het label naar `tCommon('companyLibrary.clientOrg')`. Voeg direct erboven de altijd-zichtbare bedrijfsselector toe:

```tsx
            <div className="flex flex-col gap-1">
              <label className="text-text-secondary font-medium">{tCommon('companyLibrary.linkedCompany')}</label>
              <select
                value={linkedCompanyId}
                onChange={e => setLinkedCompanyId(e.target.value)}
                className={inputCls}
                data-ops-project-company-select
              >
                <option value="">{tCommon('companyLibrary.noCompanyLinked')}</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
```

- [ ] **Step 3: Koppeling toepassen bij "Toepassen"/aanmaken**

In `handlePrimary` (en de bestaande-project-tak), ná het schrijven van de projectvelden: pas de binding toe en start de herkenning als er gekoppeld werd.

Voeg in de `isNew`-tak, ná `createNewProject(...)`:

```tsx
      // Spec §2/§5: koppel aan het gekozen bedrijf (default = standaardbedrijf). Herkenning start
      // pas als het project al inhoud heeft — bij een vers, leeg project is dat een no-op.
      if (linkedCompanyId) {
        useAppStore.getState().bindProjectToCompany(linkedCompanyId);
        if (useAppStore.getState().computeRecognition().some(c => c.suggestedPoolId)) {
          useAppStore.getState().setUI({ showLibraryLinkDialog: true });
        }
      }
```

In de bestaande-project-tak (waar het project met `setProject`/analoog bijgewerkt wordt), ná het toepassen:

```tsx
      const prevCompany = project.companyId ?? '';
      if (linkedCompanyId !== prevCompany) {
        if (linkedCompanyId) {
          useAppStore.getState().bindProjectToCompany(linkedCompanyId);
          if (useAppStore.getState().computeRecognition().some(c => c.suggestedPoolId)) {
            useAppStore.getState().setUI({ showLibraryLinkDialog: true });
          }
        } else {
          useAppStore.getState().unbindProject();
        }
      }
```

(De wizard-checkbox `offerLibraryAdd` + `hasLibraryContent` + `addAfterCreate`-tekst worden in Taak 19 verwijderd — laat ze hier nog staan zodat de build tussenin groen blijft; Taak 19 ruimt ze op.)

- [ ] **Step 4: Build-poort**

Run: `npm run build` → exit 0. Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 5: Commit**

```bash
git add src/components/dialogs/ProjectInfoDialog.tsx src/i18n/locales
git commit -m "feat(library): altijd-zichtbare bedrijfskoppeling in wizard + Projectinfo (spec §2)

Company-vrijetekstveld gelabeld als Opdrachtgever/organisatie; koppelen start de herkenning.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 16: Resources-tab = de werkplek — Bedrijfs-/Projectweergave (spec §4)

Voor een gekoppeld project toont het Resources-paneel de bedrijfspool met twee schakelbare weergaven (de schakelaar bestaat ook bij één bedrijf — inhoudsfilter, geen bedrijvenconcept):
- **Bedrijfsweergave** (default zodra de pool inhoud heeft; lége pool ⇒ open in Projectweergave): alle poolresources. CRUD hier = CRUD op het bedrijf (`addPoolResource`/`updatePoolResource`/`removePoolResource` — raakt uitsluitend `s.pools`, Taak 9 — plus grens-3-verversing), met een zichtbaar signaal "geldt voor alle projecten — valt buiten ongedaan maken".
- **Projectweergave**: wat dít project bevat (toegewezen/bestand/wees-materialisaties), met de markeringen uit Taak 18.

**Toewijzen = materialiseren:** een poolitem kiezen materialiseert (kopie + stempel + syncedHash via `addLibraryResourceToProject`). Los project: alleen projectresources.

**Files:**
- Modify: `src/components/panels/ResourcePanel.tsx`
- Modify: `src/state/slices/uiSlice.ts` + `types.ts` (`resourcesView`)
- Modify: `src/i18n/locales/<loc>/common.json`
- Test: build + optioneel zelftest-harness (React).

- [ ] **Step 1: `resourcesView`-vlag (app-globaal, session)**

In `src/state/slices/types.ts` (B1-blok):

```ts
  /** session — Resources-tabweergave: 'company' (bedrijfspool) of 'project' (wat dit project bevat).
   *  Default afgeleid: bij inhoud in de pool 'company', anders 'project' (spec §4). */
  resourcesView: 'company' | 'project';
```

In `src/state/slices/uiSlice.ts` (`createDefaultUI`): `resourcesView: 'project',` (start veilig op project; de component schakelt naar 'company' zodra de pool inhoud heeft — zie stap 3).

- [ ] **Step 2: i18n-keys (14 locales)**

Voeg in `companyLibrary` (NL canoniek, 14 locales) toe:

```json
    "companyView": "Bedrijf",
    "projectView": "Project",
    "companyViewHint": "Dit bewerkt het bedrijf en geldt voor alle projecten — valt buiten ongedaan maken.",
    "assignFromCompany": "Toewijzen aan project",
    "removeFromProject": "Verwijder uit project",
    "addToCompany": "Nieuw in het bedrijf"
```

- [ ] **Step 3: De weergaveschakelaar + Bedrijfsweergave**

Lees `src/components/panels/ResourcePanel.tsx` volledig. Wijzig als volgt:

1. Vervang de twee bibliotheek-knoppen (regels ~117–128, `showAddFromLibraryDialog`/`showUpdateFromLibraryDialog`) door een weergaveschakelaar en (in Bedrijfsweergave) een "nieuw in het bedrijf"-knop. Voeg bovenin de nodige store-hooks toe:

```tsx
  const project = useAppStore(s => s.project);
  const companies = useAppStore(s => s.companies);
  const pools = useAppStore(s => s.pools);
  const resourcesView = useAppStore(s => s.ui.resourcesView);
  const addPoolResource = useAppStore(s => s.addPoolResource);
  const removePoolResource = useAppStore(s => s.removePoolResource);
  const updatePoolResource = useAppStore(s => s.updatePoolResource);
  const addLibraryResourceToProject = useAppStore(s => s.addLibraryResourceToProject);
  const linked = !!project.companyId && companies.some(c => c.id === project.companyId);
  const pool = project.companyId ? pools[project.companyId] : undefined;
```

2. Default-weergave-effect (spec §4: Bedrijfsweergave default zodra de pool inhoud heeft; lege pool ⇒ Projectweergave). Voeg toe:

```tsx
  useEffect(() => {
    if (!linked) { if (resourcesView !== 'project') setUI({ resourcesView: 'project' }); return; }
    const hasContent = (pool?.resources.length ?? 0) > 0;
    setUI({ resourcesView: hasContent ? 'company' : 'project' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.companyId, linked]);
```

3. De header-schakelaar (alleen bij een gekoppeld project; los project = alleen Projectweergave, oude gedrag):

```tsx
        <div className="flex items-center gap-2">
          {linked && (
            <div className="flex items-center rounded-[8px] border border-border overflow-hidden" data-ops-resources-view-toggle>
              <button
                className={`px-2 py-1 ${resourcesView === 'company' ? 'bg-surface-hover font-semibold' : ''}`}
                onClick={() => setUI({ resourcesView: 'company' })}
              >{t('companyLibrary.companyView')}</button>
              <button
                className={`px-2 py-1 ${resourcesView === 'project' ? 'bg-surface-hover font-semibold' : ''}`}
                onClick={() => setUI({ resourcesView: 'project' })}
              >{t('companyLibrary.projectView')}</button>
            </div>
          )}
          <button onClick={addRow} className="btn btn--sm btn--primary flex items-center gap-1">
            <Plus size={13} /> {t('resource.panel.addRow')}
          </button>
          <button onClick={() => setUI({ showResourcePanel: false })} className="p-1 hover:bg-surface-hover rounded" title={t('close')}>
            <X size={15} />
          </button>
        </div>
```

4. Body: render de Bedrijfsweergave wanneer `linked && resourcesView === 'company'`, anders de bestaande Projectweergave (het bestaande resource-grid). De Bedrijfsweergave toont poolresources met "Toewijzen aan project" (materialiseren) + inline nieuw/verwijderen, plus het waarschuwingssignaal:

```tsx
      {linked && resourcesView === 'company' && pool ? (
        <div className="flex flex-col flex-1 overflow-auto p-2 gap-2 text-xs">
          <p className="flex items-center gap-1.5 text-text-secondary italic" data-ops-company-view-hint>
            {t('companyLibrary.companyViewHint')}
          </p>
          <button
            onClick={() => addPoolResource(project.companyId!, { name: t('resource.panel.addRow'), type: 'LABOR', description: '', maxUnits: 1 })}
            className="btn btn--sm btn--secondary self-start flex items-center gap-1"
          >
            <Plus size={12} /> {t('companyLibrary.addToCompany')}
          </button>
          <ul className="flex flex-col gap-1">
            {pool.resources.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded-[8px] border border-border">
                <span>{r.name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => addLibraryResourceToProject(project.companyId!, r.id)} className="btn btn--sm btn--secondary">{t('companyLibrary.assignFromCompany')}</button>
                  <button onClick={() => updatePoolResource(project.companyId!, r.id, { name: prompt(t('companyLibrary.field.name'), r.name) || r.name })} className="p-1 hover:bg-surface-hover rounded" title={t('companyLibrary.editItem')}><Pencil size={12} /></button>
                  <button onClick={() => removePoolResource(project.companyId!, r.id)} className="p-1 hover:bg-surface-hover rounded"><Trash2 size={12} /></button>
                </div>
              </li>
            ))}
            {pool.resources.length === 0 && <li className="text-text-secondary italic px-2">{t('companyLibrary.noResources')}</li>}
          </ul>
        </div>
      ) : (
        /* … het bestaande Projectweergave-grid ongewijzigd … */
        <ExistingProjectResourceGrid />
      )}
```

> De uitvoerder houdt het bestaande Projectweergave-grid intact — wikkel het huidige `<div className="flex-1 overflow-auto">…</div>`-blok in de `else`-tak (hierboven schematisch `ExistingProjectResourceGrid`; gebruik letterlijk de bestaande JSX, niet een nieuw component). Importeer `Pencil, Trash2` uit `lucide-react` als ze nog niet geïmporteerd zijn.

- [ ] **Step 4: Build-poort**

Run: `npm run build` → exit 0 (let op ongebruikte imports). Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 5: Commit**

```bash
git add src/components/panels/ResourcePanel.tsx src/state/slices/uiSlice.ts src/state/slices/types.ts src/i18n/locales
git commit -m "feat(library): Resources-tab als werkplek — Bedrijfs-/Projectweergave, toewijzen=materialiseren (spec §4)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 17: Backstage → Bibliotheek krimpt tot bedrijvenbeheer (spec §7)

Backstage → Bibliotheek behoudt: bedrijven aanmaken/hernoemen/verwijderen (met de §5-verwijderdialoog), standaardbedrijf, pool-export (backup), pool-import (demping + §3-afwijkingsgedrag), plus fase-1-interim: de **kalender**-promoveerknop. Weg gaat: het rechtstreekse **resource**-poolbeheer en de resource-promoveerknop (die leven nu in de Resources-tab Bedrijfsweergave, Taak 16). Bedrijf verwijderen meldt hoeveel geopende projecten eraan gekoppeld zijn en ontkoppelt die expliciet (spec §5).

**Files:**
- Modify: `src/components/backstage/LibrarySection.tsx` (+ `.css` voor verweesde klassen)
- Modify: `src/state/slices/librarySlice.ts` (`removeCompany` ontkoppelt open documenten)
- Modify: `src/i18n/locales/<loc>/common.json`
- Test: `tests/library/check-library-slice.ts` (removeCompany-ontkoppeling)

- [ ] **Step 1: Falende test — bedrijf verwijderen ontkoppelt open documenten**

```ts
// --- Bedrijf verwijderen ontkoppelt gekoppelde open documenten (spec §5) ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Weg BV');
  s.bindProjectToCompany(cid);
  const resId = s.promoteResourceToPool(cid, { id: 'w', name: 'Sloopman', type: 'LABOR', description: '', maxUnits: 1 })!;
  const added = s.addLibraryResourceToProject(cid, resId);
  const affected = s.countDocumentsLinkedTo(cid);
  assert(affected >= 1, 'countDocumentsLinkedTo telt het actieve document');
  s.removeCompany(cid);
  const after = useAppStore.getState();
  assert(after.project.companyId === undefined, 'removeCompany ontkoppelt het actieve document');
  assert(after.resources.find(r => r.id === added.resourceId)?.libraryOrigin === undefined, 'removeCompany stript de stempels van open documenten');
}
```

- [ ] **Step 2: Draai — verwacht FAIL**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=1` (`countDocumentsLinkedTo` + ontkoppel-gedrag ontbreken).

- [ ] **Step 3: `countDocumentsLinkedTo` + `removeCompany` uitbreiden**

Interface:

```ts
  /** Aantal GEOPENDE documenten (actief + slapend) gekoppeld aan dit bedrijf — voor de
   *  verwijder-bevestiging (spec §5). */
  countDocumentsLinkedTo: (companyId: string) => number;
```

Implementatie:

```ts
  countDocumentsLinkedTo: (companyId) => {
    const s = get();
    let n = s.project.companyId === companyId ? 1 : 0;
    for (const d of s.documents) if (d.payload && d.payload.project.companyId === companyId) n++;
    return n;
  },
```

Breid `removeCompany` uit zodat het gekoppelde open documenten ontkoppelt (stempels strippen). Vervang de bestaande `removeCompany` door:

```ts
  removeCompany: (id) => {
    set((s) => {
      if (s.companies.length <= 1) return; // altijd ≥1 bedrijf (spec §2)
      s.companies = s.companies.filter(c => c.id !== id);
      delete s.pools[id];
      if (s.defaultCompanyId === id) s.defaultCompanyId = s.companies[0].id;
      // Spec §5: ontkoppel gekoppelde OPEN documenten expliciet (stempels strippen). Opgeslagen
      // bestanden gedragen zich bij later openen als ontvangen bestanden (los; §2-scope).
      if (s.project.companyId === id) {
        s.project.companyId = undefined;
        s.project.companyName = undefined;
        s.resources = s.resources.map((r) => r.libraryOrigin?.companyId === id ? (() => { const { libraryOrigin: _d, ...rest } = r; return rest; })() : r);
        s.calendars = s.calendars.map((c) => c.libraryOrigin?.companyId === id ? (() => { const { libraryOrigin: _d, ...rest } = c; return rest; })() : c);
        s.calendar = s.calendars.find((c) => c.id === s.project.calendarId) ?? s.calendar;
      }
      for (const d of s.documents) {
        if (!d.payload || d.payload.project.companyId !== id) continue;
        d.payload.project = { ...d.payload.project, companyId: undefined, companyName: undefined };
        d.payload.resources = d.payload.resources.map((r) => r.libraryOrigin?.companyId === id ? (() => { const { libraryOrigin: _d, ...rest } = r; return rest; })() : r);
        d.payload.calendars = d.payload.calendars.map((c) => c.libraryOrigin?.companyId === id ? (() => { const { libraryOrigin: _d, ...rest } = c; return rest; })() : c);
      }
    });
    persist(get);
  },
```

- [ ] **Step 4: Draai — verwacht PASS**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 5: `LibrarySection` uitkleden**

In `src/components/backstage/LibrarySection.tsx`:
1. Verwijder de resource-pool-lijst, de resource-promoteknop/-paneel, en de resource-inline-edit (alles onder `<h3>{t('companyLibrary.resources')}</h3>` t/m de bijbehorende `</ul>` en de `promotePanel === 'resource'`-blokken).
2. Behoud de **kalender**-sectie inclusief de kalender-promoteknop (fase-1-interim, spec §7/§9) en de kalender-inline-edit.
3. Verwijder de nu-ongebruikte state/handlers: `promoteResourceToPool`, `updatePoolResource`, `removePoolResource`, `editingResourceId`/`resDraft`/`startEditResource`/`saveEditResource`, `projectResources`, en de resource-tak van `promotePanel` (versmal het type naar `'calendar' | null`). Laat `promoteCalendarToPool`/`updatePoolCalendar`/`removePoolCalendar`/`projectCalendars` staan.
4. Verwijder ongebruikte imports (`ArrowUpFromLine` blijft voor kalender; controleer `Trash2`/`Pencil`/`Check`/`X` — behoud wat de kalender-tak nog gebruikt).
5. Voeg de bedrijf-verwijder-bevestiging toe die het aantal gekoppelde open documenten meldt:

```tsx
  const countDocumentsLinkedTo = useAppStore(s => s.countDocumentsLinkedTo);
  const onRemoveCompany = () => {
    const n = countDocumentsLinkedTo(selected.id);
    const msg = n > 0 ? t('companyLibrary.removeCompanyConfirmLinked', { count: n }) : t('companyLibrary.removeCompanyConfirm');
    if (window.confirm(msg)) removeCompany(selected.id);
  };
```

Wijzig de bestaande verwijder-knop `onClick={() => removeCompany(selected.id)}` naar `onClick={onRemoveCompany}`.

6. Update de intro-tekst `companyLibrary.intro` naar het nieuwe model (zie i18n-stap).

- [ ] **Step 6: i18n + CSS opruimen**

Voeg (14 locales) toe:

```json
    "removeCompanyConfirm": "Dit bedrijf verwijderen?",
    "removeCompanyConfirmLinked": "Dit bedrijf is aan {{count}} geopende projecten gekoppeld. Verwijderen ontkoppelt die projecten. Doorgaan?"
```

Herschrijf `companyLibrary.intro` (NL): `"Beheer je bedrijven en hun gedeelde pool. Toewijzen gebeurt in het Resources-tabblad; wat je toewijst wordt automatisch een kopie mét herkomst in het project."` (14 locales bijwerken).

Verwijder verweesde CSS-klassen in `src/components/backstage/LibrarySection.css` die alleen bij de verwijderde resource-tak hoorden (bijv. resource-specifieke edit-inputs) — controleer met een grep welke klassen nog in de JSX voorkomen; verwijder alleen wat nergens meer gebruikt wordt.

- [ ] **Step 7: Build-poort (let op noUnusedLocals)**

Run: `npm run build` → exit 0. Als tsc klaagt over ongebruikte imports/vars: verwijder ze. Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 8: Commit**

```bash
git add src/components/backstage/LibrarySection.tsx src/components/backstage/LibrarySection.css src/state/slices/librarySlice.ts src/i18n/locales tests/library/check-library-slice.ts
git commit -m "feat(library): Backstage-Bibliotheek krimpt tot bedrijvenbeheer + kalender-promote-interim (spec §7)

Bedrijf verwijderen ontkoppelt gekoppelde open projecten met bevestiging (spec §5).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 18: Verversingssignaal + Projectweergave-markeringen (spec §3/§4)

Elke verversing die iets wijzigde toont een discreet signaal ("N onderdelen bijgewerkt vanuit het bedrijf") — óók het zichtbare antwoord op de Ctrl+Z-eigenaardigheid (spec §3). De Projectweergave toont de markeringen "wijkt af — beslis" en "niet meer in het bedrijf" (spec §4), met een handmatige heropening van het afwijkingenscherm (derde uitkomst §3).

**Files:**
- Modify: `src/App.tsx` (of een klein bestaand toast/notice-mechanisme) voor het signaal
- Modify: `src/components/panels/ResourcePanel.tsx` (markeringen in Projectweergave)
- Test: build (React).

- [ ] **Step 1: Signaal-consumptie**

`libraryRefreshNotice` (Taak 10) draagt het aantal. Toon 'm discreet en ruim 'm op na een paar seconden. Voeg in `src/App.tsx` een klein effect + niet-blokkerende melding toe (spiegel het bestaande `hourDataNotice`-patroon als dat er is; anders een eenvoudige tijdelijke banner). Minimale variant:

```tsx
  const libraryRefreshNotice = useAppStore(s => s.ui.libraryRefreshNotice);
  const setUI = useAppStore(s => s.setUI);
  useEffect(() => {
    if (libraryRefreshNotice == null) return;
    const id = setTimeout(() => setUI({ libraryRefreshNotice: null }), 4000);
    return () => clearTimeout(id);
  }, [libraryRefreshNotice, setUI]);
```

En bij de render (bij de andere globale overlays), een discrete melding:

```tsx
      {libraryRefreshNotice != null && libraryRefreshNotice > 0 && (
        <div className="fixed bottom-4 right-4 z-50 px-3 py-2 rounded-[10px] bg-surface border border-border shadow-[var(--shadow-pop)] text-xs" data-ops-library-refresh-notice>
          {t('companyLibrary.refreshNotice', { count: libraryRefreshNotice })}
        </div>
      )}
```

Zorg dat `t` beschikbaar is in `App.tsx` (gebruik `useTranslation('common')` als dat er nog niet is; anders het bestaande `t`).

- [ ] **Step 2: Markeringen in de Projectweergave**

In `src/components/panels/ResourcePanel.tsx`, in het Projectweergave-grid, toon per resource de status-badge via `onOpenStatusForResource` (Taak 7) en een knop die het afwijkingenscherm opent. Voeg bovenin toe:

```tsx
  const onOpenStatusForResource = useAppStore(s => s.onOpenStatusForResource);
```

Render per rij (bij de naam-kolom) een badge wanneer de status niet null/`in-sync` is:

```tsx
  {(() => {
    const st = onOpenStatusForResource(resource.id);
    if (st === 'deviated') return <button className="badge badge--red" onClick={() => setUI({ showLibraryLinkDialog: true })} data-ops-resource-deviates>{t('companyLibrary.deviates')}</button>;
    if (st === 'removed') return <span className="badge badge--red" data-ops-resource-removed>{t('companyLibrary.notInCompany')}</span>;
    return null;
  })()}
```

(Plaats deze expressie naast de resourcenaam in het bestaande grid; behoud de bestaande layout.)

- [ ] **Step 3: Build-poort**

Run: `npm run build` → exit 0. Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/panels/ResourcePanel.tsx
git commit -m "feat(library): verversingssignaal + Projectweergave-markeringen wijkt-af/niet-meer-in-bedrijf (spec §3/§4)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 19: Sloop zonder wezen — Add/Update-dialogen, resource-promote-UI, wizard-checkbox, ui-flags, CSS, i18n

> **NB (critreview taak 4 — bekende tussentoestand die deze taak oplost):** sinds de autobind-strip (commit `ab0c43c`) geeft `AddFromLibraryDialog` op een ongebonden (of anders-gebonden) project een no-op mét de misleidende melding "al in project". De sloop van die dialoog lost dit op; verifieer bij deze taak expliciet dat de vervángende flows (Resources-tab taak 16, LibraryLinkDialog taak 14) nergens dezelfde no-op-zonder-eerlijke-feedback introduceren.

Verwijder de vervangen UX volledig (spec §6): `AddFromLibraryDialog`, `UpdateFromLibraryDialog` (+ de `ResourcePanel`-knoppen, al vervangen in Taak 16), de wizard-checkbox, de bijbehorende `ui`-flags, verweesde CSS en i18n-keys — niets verweesd, en de build (`noUnusedLocals`) blijft groen.

**Files:**
- Delete: `src/components/dialogs/AddFromLibraryDialog.tsx`, `src/components/dialogs/UpdateFromLibraryDialog.tsx`
- Modify: `src/App.tsx`, `src/components/dialogs/ProjectInfoDialog.tsx`, `src/state/slices/uiSlice.ts`, `src/state/slices/types.ts`
- Modify: `src/i18n/locales/<loc>/common.json` (14 locales — verweesde keys)
- Test: build + i18n-wezencheck.

- [ ] **Step 1: Bestanden verwijderen + imports/mounts opruimen**

```bash
git rm src/components/dialogs/AddFromLibraryDialog.tsx src/components/dialogs/UpdateFromLibraryDialog.tsx
```

In `src/App.tsx`: verwijder de imports `AddFromLibraryDialog`/`UpdateFromLibraryDialog` en de mounts `<AddFromLibraryDialog />`/`<UpdateFromLibraryDialog />`.

- [ ] **Step 2: ui-flags verwijderen**

In `src/state/slices/types.ts`: verwijder `showAddFromLibraryDialog` en `showUpdateFromLibraryDialog` uit `UIState`.
In `src/state/slices/uiSlice.ts` (`createDefaultUI`): verwijder de twee `false`-initialisaties.
Grep om zeker te zijn dat er geen verwijzingen resten:

```bash
grep -rn "showAddFromLibraryDialog\|showUpdateFromLibraryDialog" src/ || echo "geen verwijzingen meer"
```

Verwacht: `geen verwijzingen meer`.

- [ ] **Step 3: Wizard-checkbox verwijderen (ProjectInfoDialog)**

In `src/components/dialogs/ProjectInfoDialog.tsx`: verwijder de `offerLibraryAdd`-state, de `hasLibraryContent`-berekening, de checkbox-JSX (rond regels 233–244, `data-ops-offer-library-add` + `companyLibrary.addAfterCreate`), en het `if (offerLibraryAdd) { … showAddFromLibraryDialog … }`-blok in `handlePrimary`. Verwijder de nu-ongebruikte `pools`/`companies`-hooks alléén als niets anders in de component ze nog gebruikt (Taak 15 gebruikt `companies` voor de bedrijfsselector — die blijft).

- [ ] **Step 4: Verweesde i18n-keys verwijderen (14 locales)**

Verwijder uit `companyLibrary` in ALLE 14 `common.json` de keys die nergens meer via `t(...)` gebruikt worden. Kandidaten (verifieer eerst per key met een grep dat hij nergens meer voorkomt): `addFromLibrary`, `updateFromLibrary`, `addTitle`, `updateTitle`, `addAfterCreate`, `alreadyInProject`, `noStampedItems`, `updateThis`, `upToDate` (blijft — LibraryLinkDialog gebruikt 'm; NIET verwijderen), `removedFromLibrary` (vervangen door `notInCompany` — verifieer), `importInto`/`importTitle` (blijven als PoolImportDialog ze gebruikt — verifieer). Werk key-voor-key:

```bash
# Voorbeeld: bevestig dat een key echt wees is vóór verwijderen.
for k in addFromLibrary updateFromLibrary addTitle updateTitle addAfterCreate alreadyInProject noStampedItems updateThis; do
  echo -n "$k: "; grep -rn "companyLibrary.$k" src --include=*.tsx --include=*.ts | grep -v locales | wc -l;
done
```

Een telling van `0` ⇒ wees ⇒ verwijder de key in alle 14 locales. Een telling `>0` ⇒ laten staan.

- [ ] **Step 5: Wezencheck + build**

```bash
# Geen enkele companyLibrary.<key> in code zonder tegenhanger in nl/common.json, en omgekeerd geen wezen.
node -e '
const fs=require("fs");const nl=require("./src/i18n/locales/nl/common.json").companyLibrary;
const {execSync}=require("child_process");
const used=new Set(execSync("grep -rhoE \"companyLibrary\\.[a-zA-Z]+\" src --include=*.tsx --include=*.ts | sed s/companyLibrary.//").toString().split(/\s+/).filter(Boolean));
let bad=0;
for(const u of used){ if(u!=="field" && !(u in nl)){ console.log("CODE gebruikt ontbrekende key:",u); bad=1; } }
process.exit(bad);
'
echo "check exit=$?"
npm run build
```

Verwacht: geen "CODE gebruikt ontbrekende key"-regel, `check exit=0`, `npm run build` exit 0.
Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(library): sloop Add/Update-dialogen, wizard-checkbox, ui-flags + verweesde i18n/CSS (spec §6)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 20: loadState-paden leveren een *los* document (`linkedOpen`) (spec §5, review-punt 3)

`readIFC → loadState` (IFCPanel `src/components/panels/IFCPanel.tsx:49`, MenuBar `src/components/layout/MenuBar/MenuBar.tsx:36`, en extensie-imports die het document volledig vervangen) laadt een geparsede IFC die `companyId` + `libraryOrigin`-stempels kan dragen — dat zou het document **gekoppeld** laden zónder de grens-1-check. Spec §5 eist dat zo'n volledig-vervangende import een **los** document oplevert (koppelen kan daarna via de herkenningsstap). Besluit: `applyLoadedProject` krijgt een `linkedOpen: boolean`; de echte open-paden geven `true`, de loadState-paden `false` → bij binnenkomst worden `companyId`/`companyName` + alle `libraryOrigin`-stempels gestript.

**Files:**
- Modify: `src/state/slices/fileSlice.ts` (`ApplyLoadedProjectOpts` + `applyLoadedProject` + de open-paden)
- Modify: `src/components/panels/IFCPanel.tsx`, `src/components/layout/MenuBar/MenuBar.tsx` (loadState → los)
- Test: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Falende test**

```ts
// --- loadState van een gestempeld IFC-document levert een LOS document (spec §5, review-punt 3) ---
{
  const s = useAppStore.getState();
  const cid = s.addCompany('Load BV');
  const poolResId = s.promoteResourceToPool(cid, { id: 'ld', name: 'Betontimmerman', type: 'LABOR', description: '', maxUnits: 2 })!;
  // Bouw een ImportResult-achtige payload met een gekoppeld project + gestempelde resource, zoals
  // readIFC die zou opleveren, en voer 'm door loadState (het volledig-vervangende pad).
  const stampedProject = { ...useAppStore.getState().project, id: 'p-load', companyId: cid, companyName: 'Load BV' };
  const stampedRes = { id: 'lr', name: 'Betontimmerman', type: 'LABOR' as const, description: '', maxUnits: 2,
    libraryOrigin: { companyId: cid, libraryItemId: poolResId, poolVersion: 1, syncedHash: 'x' } };
  useAppStore.getState().loadState({
    project: stampedProject, calendar: useAppStore.getState().calendar,
    tasks: [], sequences: [], resources: [stampedRes], assignments: [], resourceCalendars: [],
  } as never);
  const after = useAppStore.getState();
  assert(after.project.companyId === undefined, 'loadState: gestempeld project wordt LOS geladen (companyId gestript)');
  assert(after.resources.every(r => r.libraryOrigin === undefined), 'loadState: alle libraryOrigin-stempels gestript');
}
```

- [ ] **Step 2: Draai — verwacht FAIL**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=1` (loadState laadt nu nog gekoppeld met stempels).

- [ ] **Step 3: `linkedOpen` op `ApplyLoadedProjectOpts` + strip in `applyLoadedProject`**

In `src/state/slices/fileSlice.ts`, breid `ApplyLoadedProjectOpts` uit:

```ts
  /** True = een echt open-pad (openFile/openRecentFile): behoud bedrijfsbinding + stempels en draai
   *  de grens-1-check. False (default) = een volledig-vervangende load (loadState: IFCPanel/MenuBar/
   *  extensie-import): laad LOS — strip companyId/companyName + alle libraryOrigin-stempels (spec §5).
   *  (Crash-herstel loopt NIET door applyLoadedProject maar via `restoreDocuments`, dat de opgeslagen —
   *  dus gekoppelde — staat exact herstelt en de grens-1-check apart draait, Taak 11.) */
  linkedOpen?: boolean;
```

In `applyLoadedProject`, binnen de `set((s) => { … })` ná `hydratePayload(s, payload);`, voeg toe:

```ts
        // Spec §5 (review-punt 3): een volledig-vervangende load zonder open-pad-semantiek levert een
        // LOS document — geen stille koppeling, geen stille herkenning. Strip bedrijfsbinding + stempels.
        if (!opts.linkedOpen) {
          s.project = { ...s.project, companyId: undefined, companyName: undefined };
          s.resources = s.resources.map((r) => { const { libraryOrigin: _d, ...rest } = r; return rest; });
          s.calendars = s.calendars.map((c) => { const { libraryOrigin: _d, ...rest } = c; return rest; });
          s.calendar = s.calendars.find((c) => c.id === s.project.calendarId) ?? s.calendar;
        }
```

- [ ] **Step 4: Open-paden geven `linkedOpen: true`**

Zet in `openFile` en `openRecentFile` (en, indien `applyLoadedProject` daar loopt, elk ander echt open-pad) `linkedOpen: true` in het opts-object bij `get().applyLoadedProject(parsed, { … })`. Voorbeeld (openFile-opts, náást de bestaande vlaggen):

```ts
          recompute: true,
          fit: true,
          hourDataNotice: true,
          linkedOpen: true,
```

De `loadState`-actie (die intern `applyLoadedProject` aanroept) laat `linkedOpen` weg (default `false`) — verifieer in `fileSlice.loadState` dat het opts-object geen `linkedOpen: true` zet.

- [ ] **Step 5: IFCPanel/MenuBar blijven loadState gebruiken (geen wijziging nodig, verifiëren)**

`IFCPanel.tsx:49` en `MenuBar.tsx:36` roepen `store.loadState(data)` aan; die loopt door `applyLoadedProject` met `linkedOpen` afwezig ⇒ los. Verifieer dat er geen ándere loadState/`applyLoadedProject`-aanroep bestaat die per ongeluk `linkedOpen: true` zet:

```bash
grep -rn "applyLoadedProject\|loadState" src/ | grep -v "\.test\."
```

Verwacht: alleen de open-paden (openFile/openRecentFile) zetten `linkedOpen: true`; loadState-paden niet. (Recovery gebruikt `restoreDocuments`, geen `applyLoadedProject` — dus geen `linkedOpen` nodig.) `openExampleFromString` laat `linkedOpen` bewust weg: voorbeeldprojecten laden als los document.

- [ ] **Step 6: Draai + build**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`.
Run: `bash tests/planning/run.sh; echo "EXIT=$?"` → `EXIT=0`.
Run: `npm run build` → exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/state/slices/fileSlice.ts src/components/panels/IFCPanel.tsx src/components/layout/MenuBar/MenuBar.tsx tests/library/check-library-slice.ts
git commit -m "feat(library): loadState-paden laden een los document (linkedOpen) (spec §5)

Een volledig-vervangende IFC-load (IFCPanel/MenuBar/extensie-import) strip bedrijfsbinding
en stempels; alleen echte open-paden (openFile/openRecentFile/recovery) laden gekoppeld en
draaien de grens-1-check.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Taak 21: Documentatie — `docs/library.md` herschrijven + CHANGELOG + TODO (spec §12)

> **NB (critreview taak 8 — verplichte extra docs-eigenaardigheid):** naast de §12-eigenaardigheden ook documenteren: "undo van omkoppelen (bedrijf A → B) herstelt de stempels maar niet de binding; de herstelde A-stempels gedragen zich als los tot je terugkoppelt naar A." Dit is bewust gedrag (project.companyId valt buiten de undo-snapshot-scope).
>
> **NB (critreview taak 14 — tweede verplichte docs-eigenaardigheid):** ook documenteren: "beslissingen in het afwijkingenscherm (bedrijfswaarden gebruiken / overnemen in het bedrijf) zijn niet met Ctrl+Z terug te draaien — de overnemen-keuze wijzigt de bedrijfsbibliotheek zelf, die buiten de projecthistorie valt. Koppelen/ontkoppelen kán wel ongedaan worden gemaakt." Plus: een als 'niet meer in het bedrijf' gemarkeerd item los je niet in het scherm op; het blijft gewoon bruikbaar in het project (opruimen kan via de Projectweergave).

`docs/library.md` wordt herschreven naar het bedrijfscentrische model en documenteert expliciet de geëiste eigenaardigheden (spec §12). CHANGELOG en TODO bijwerken.

**Files:**
- Modify: `docs/library.md`, `docs/CHANGELOG.md`, `docs/TODO.md`

- [ ] **Step 1: `docs/library.md` herschrijven**

Vervang de inhoud door een beschrijving van het B1.1-model. Neem in elk geval deze expliciet geëiste punten op (spec §12):
- Het kernprincipe: een bedrijf ís een resourcebibliotheek; toewijzen = materialiseren; kopiëren/toevoegen-uit/bijwerken-uit/promoveren bestaan niet meer als losse handelingen.
- De vier grenzen (openen/documentwissel/pool-edit/crash-herstel) en het afwijkingsonderscheid (behind stil verversen vs. deviated vragen) op basis van `syncedHash`.
- De **Ctrl+Z/verversing-eigenaardigheid**: oude waarden kunnen tijdelijk terugkeren tot de volgende grens; de verversing wist de redo-stapel; het discrete signaal "N onderdelen bijgewerkt vanuit het bedrijf" is het zichtbare antwoord.
- Dat **identiteit op id rust**: een verwijderd poolitem naamgelijk hercreëren herlinkt NIET automatisch — de handmatige koppel-uitweg (herkenningsstap) bestaat.
- Dat de **matcher alleen op koppelmomenten** draait (exact na NFC/trim/case/witruimte; geen fuzzy).
- Het gedrag van **ontvangen bestanden** (los; §2-scope voorkomt valse "niet meer in het bedrijf"-labels).
- Dat een geïmporteerde **óudere pool** in-sync openstaande documenten stil terugzet (de vraag guardt alleen extern-bewerkte bestanden; de demping vooraf is de bewuste poort).
- Dat **omkoppelen** de per ongeluk in het oude bedrijf gepromoveerde items niet opruimt (handmatig via de Bedrijfsweergave).
- De bekende beperking: geen sync tussen machines (onverkort uit B1).

- [ ] **Step 2: CHANGELOG + TODO**

Voeg bovenaan `docs/CHANGELOG.md` een B1.1-sectie toe (Nederlands, noemenswaardige wijzigingen: bedrijfscentrisch model, syncedHash, verversing op vier grenzen, gedeeld koppel-/afwijkingenscherm, Resources-werkplek, gesloopte dialogen). Werk `docs/TODO.md` bij: streep de B1.1-punten af en noteer het B1b-vervolg (bedrijfsbreed histogram) als openstaand.

- [ ] **Step 3: Poort (docs raken geen code, maar draai de suite als sanity)**

Run: `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0`. Run: `npm run build` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add docs/library.md docs/CHANGELOG.md docs/TODO.md
git commit -m "docs(library): herschrijf library.md naar het bedrijfscentrische model + CHANGELOG/TODO (spec §12)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Slotverificatie (na Taak 21)

- [ ] `bash tests/library/run.sh; echo "EXIT=$?"` → `EXIT=0` en `bash tests/library/run.sh 2>&1 | grep '^   XX'` → geen output.
- [ ] `bash tests/planning/run.sh; echo "EXIT=$?"` → `EXIT=0` en geen `^XX`-regels.
- [ ] `npm run build` → exit 0 (tsc strict + Vite).
- [ ] i18n-wezencheck (Taak 19 stap 5) → geen ontbrekende keys, alle 14 locales dragen de nieuwe `companyLibrary`-keys.
- [ ] Handmatige/zelftest-harness-verificatie van de UI-flows (koppelen → herkenning; openen met deviated → afwijkingenscherm; Bedrijfs-/Projectweergave; verversingssignaal) via `docs/self-test-harness.md` (Playwright MCP + `window.__OPS__`) — de headless suites dekken de store-laag, de UI-flows verifieer je in de browser-devbuild op je eigen `OPS_DEV_PORT`.
