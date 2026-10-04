# B1 Bedrijfsbibliotheken Implementation Plan

> **GEARCHIVEERD (2026-07-23) — VOLLEDIG UITGEVOERD, NIET MEER VOLGEN.** Dit plan is afgerond (16 taken, vloot-geverifieerd). Het UX-model erin is daarna **vervangen** door B1.1 (bedrijfscentrisch): spec `docs/superpowers/specs/2026-07-23-b1-1-bedrijfscentrisch-model-design.md`. Agents die aan B1.1 werken mogen dit document hooguit raadplegen als historische context over hoe de bestaande code tot stand kwam — nooit als opdracht.

**Goal:** Eén centrale, per-bedrijf pool van bibliotheekkalenders en -resources buiten de projecten om; projecten kopiëren eruit met een herkomststempel, kunnen per item bijwerken, en een gedeeld projectbestand blijft altijd zelfstandig compleet.

**Architecture:** Een nieuwe app-globale `librarySlice` (net als `extensionSlice`, niet per-document geswapt) houdt bedrijven + pools in de store; persistentie loopt via een `isTauri()`-gesplitste `libraryStore` (browser: IndexedDB `ops-library`; desktop: `appDataDir`-JSON-bestand — patroon van `recoveryStore`). Kopieer-, dedup-, diff- en versielogica leeft als pure functies in `libraryOps` (headless testbaar); herkomststempels + bedrijfsbinding round-trippen door de bestaande `OPS_`-pset-laag (JSON autoritair, golden rule), en een pool-bestand is IFC 4.3 met een autoritatief `OPS_Library`-JSON-pset.

**Tech Stack:** TypeScript (strict, `noUnusedLocals`), React 19, Zustand + Immer slices, IndexedDB, `@tauri-apps/plugin-fs` (dynamisch geïmporteerd), IFC 4.3 (STEP), react-i18next (14 locales), headless Node-testbatterijen via esbuild (patroon `tests/planning/`).

---

## Achtergrond & bindende besluiten (uit de spec)

Lees eerst `docs/archive/superpowers/specs/2026-07-20-b1-bedrijfsbibliotheken-design.md` (mee-gearchiveerd). De bindende user-besluiten van 2026-07-20 die dit plan verwerkt:

1. **Import-demping** — pool-import vervangt de héle pool ná bevestiging; als de lokale pool nieuwer is (hogere `poolVersion` óf recentere `modifiedAt`) toont de dialoog een niet te missen waarschuwing. Stil overschrijven bestaat niet.
2. **Geen pool-embed** — projectexport bevat altijd al alle gebruikte items; de pool wordt NOOIT in het projectbestand ingebed.
3. **Vinkje "bibliotheekbestand ernaast opslaan"** — projectexport-optie die de pool als tweede, los bestand naast het project schrijft.
4. **Standaardbedrijf voor eenpitters** — er is altijd één standaardbedrijf ("Mijn bedrijf"); de bedrijfsselector verschijnt pas in de UI bij ≥2 bedrijven.
5. **Geen cross-bedrijf-overzichten** — B1b (bezetting) blijft strikt binnen één bedrijf/pool; dit plan levert alleen de stempels die B1b later gebruikt.
6. **Beperkingen §8 gedocumenteerd** — het sync-probleem wordt expliciet uitgelegd in zowel de gebruikersdocumentatie als de importdialoog zelf, inclusief de aanbeveling om over werkmaatschappijen heen bewust één gezamenlijke pool te kiezen.

## Testrealiteit (wijkt af van standaard-TDD)

Dit project heeft **geen** vitest/jest. De poorten zijn:

- **`npm run build`** — `tsc` (strict, `noUnusedLocals`/`noUnusedParameters`) + `vite build`. Draai per taak; type-groen is de basisgate.
- **Headless Node-testbatterijen** naar het model van `tests/planning/` — een `.ts`-check wordt met esbuild gebundeld (`--platform=node --format=esm --alias:@=src`) en met `node` gedraaid; **de exitcode is de poort** (niet de output-tail), fouten printen `   XX <bericht>`-regels. Dit plan voegt een **eigen map `tests/library/`** toe met eigen `run.sh` (exitcode-poort). "Failing test first" wordt hier pragmatisch: **voeg de check/case toe die faalt vóór de implementatie bestaat, draai 'm rood, implementeer, draai 'm groen.**
- **Playwright + `window.__OPS__`** (browser dev build, `npm run dev`, poort 3007) — voor de UI-flows; assert via store-state, niet canvas-pixels. Zie `docs/self-test-harness.md`. Afsluitende taak.

**Worktree-valkuil (bekend):** `tests/planning/run.sh` en `tests/library/run.sh` verwijzen naar `$ROOT/node_modules/.bin/esbuild`. In een git-worktree zonder eigen `node_modules` faalt dat met exit 127. Workaround (eenmalig per worktree): symlink de esbuild van de hoofd-checkout erin, bijv.
```bash
ln -sf ../../../<hoofdcheckout>/node_modules/.bin/esbuild node_modules/.bin/esbuild
```
of draai de suites vanuit de hoofd-checkout. Elke run-stap hieronder neemt aan dat esbuild bereikbaar is.

## Spec-dekking (welke taak dekt welke spec-paragraaf)

| Spec | Taak |
|---|---|
| §2 Kernconcepten (Bedrijf/Pool/Herkomststempel/Projectbinding) — datamodel | Taak 1 |
| §2/§3 poolVersion + modifiedAt + stempel + dedup + diff (pure logica) | Taak 2 |
| §5 Opslag (IndexedDB / appDataDir) | Taak 3 |
| §4/§6 Pool-IFC + `OPS_Library`-JSON + round-trip | Taak 4 |
| §6 Projectbinding companyId + herkomststempels in project-IFC (round-trip verliesloos, golden rule) | Taak 5 |
| §2/§3 bedrijven-CRUD + standaardbedrijf + binding (store) | Taak 6 |
| §3 promoveren naar pool + pool-inhoud bewerken (store) | Taak 7 |
| §3 toevoegen-uit-bibliotheek (meereizende kalender + dedup + "al in project") (store) | Taak 8 |
| §3 bijwerken-vanuit-bibliotheek (diff + "bestaat niet meer") (store) | Taak 9 |
| §4 export/import pool + demping-waarschuwing (store + pure check) | Taak 10 |
| §3 Backstage-sectie Bibliotheek (beheer/promote/export/import + demping-tekst + §8-uitleg) | Taak 11 |
| §3/§7 toevoegen-uit-bibliotheek + bijwerken + bedrijfsselector (≥2) UI in wizard & lopend project | Taak 12 |
| §4 vinkje "bibliotheekbestand ernaast opslaan" | Taak 13 |
| §7 i18n alle teksten, 14 locales | Taak 14 |
| §7/§8 documentatie: beperkingen §8 in docs + importdialoog, CHANGELOG, TODO | Taak 15 |
| §9 self-test UI-flows | Taak 16 |

---

## File Structure

Nieuwe bestanden (elk één verantwoordelijkheid):

- `src/types/library.ts` — domeintypes: `LibraryOrigin`, `Company`, `CompanyPool`, `CompanyLibrary` + fabrieken/constanten. Geen gedrag.
- `src/services/library/libraryOps.ts` — **pure** functies: `bumpPool`, `isPoolNewer`, `makeOrigin`, `findCopyByOrigin`, `copyCalendarToProject`, `copyResourceToProject`, `diffCalendarVsPool`, `diffResourceVsPool`. Geen store, geen I/O — headless testbaar.
- `src/services/library/libraryStore.ts` — persistentie: `loadLibrary`/`saveLibrary`, `isTauri()`-gesplitst (IndexedDB `ops-library` vs `appDataDir`-JSON).
- `src/services/library/libraryIfc.ts` — pool-bestand: `writePoolIFC`/`readPoolIFC` (delegeert aan `writeIFC`/`readIFC` + `OPS_Library`).
- `src/services/library/index.ts` — barrel-re-export van de library-service (patroon `src/extensions/index.ts`).
- `src/state/slices/librarySlice.ts` — app-globale store-state + acties (bedrijven-CRUD, promote, add/update-from-library, import/export, binding).
- `src/components/backstage/LibrarySection.tsx` + `.css` — Backstage-sectie "Bibliotheek".
- `src/components/dialogs/AddFromLibraryDialog.tsx` — "toevoegen uit bibliotheek"-kiezer (wizard + lopend project).
- `src/components/dialogs/UpdateFromLibraryDialog.tsx` — per-item bijwerken met diff-weergave.
- `src/components/dialogs/PoolImportDialog.tsx` — pool-import met demping-waarschuwing + §8-uitleg.
- `tests/library/run.sh` — testrunner (exitcode-poort), model `tests/planning/run.sh`.
- `tests/library/check-library-ops.ts` — pure-ops-batterij.
- `tests/library/check-library-slice.ts` — headless store-batterij.
- `tests/library/check-pool-ifc.ts` — pool-IFC-round-trip-batterij.
- `tests/library/tsconfig.check.json` — dedicated tsconfig voor compile-afdwinging (patroon `tsconfig.roundtrip.json`).
- `docs/library.md` — gebruikersdocumentatie incl. de §8-beperkingen + sync-uitleg.

Gewijzigde bestanden:

- `src/types/project.ts` — `Project.companyId?` + `Project.companyName?`.
- `src/types/resource.ts` — `Resource.libraryOrigin?`.
- `src/types/calendar.ts` — `WorkCalendar.libraryOrigin?`.
- `src/services/importTypes.ts` — `ImportResult.libraryPool?`.
- `src/services/ifc/ifcPsets.ts` — `PSET.Library`.
- `src/services/ifc/ifcWriter.ts` — CompanyId/CompanyName in `OPS_ProjectSettings`; `libraryOrigin` in `OPS_Resource`/`OPS_Calendar`; `OPS_Library`-pset uit `input.libraryPool`.
- `src/services/ifc/ifcReader.ts` — spiegel van bovenstaande.
- `src/state/appStore.ts` — `LibrarySlice` in de compositie-root.
- `src/state/slices/types.ts` — `BackstageSection` uitgebreid met `'library'`; nieuwe UI-vlaggen.
- `src/state/slices/uiSlice.ts` — defaults voor de nieuwe UI-vlaggen.
- `src/components/backstage/Backstage.tsx` — NavItem + render voor `'library'`.
- `src/state/slices/fileSlice.ts` — `exportProjectWithPool` (vinkje §4).
- `src/App.tsx` — `initLibrary()` bij opstarten; mount van de nieuwe dialogen.
- `src/utils/devBridge.ts` — `window.__OPS__.library.*`-haken voor self-test.
- 14× `src/i18n/locales/<lng>/common.json` — `companyLibrary`-blok.
- `docs/CHANGELOG.md`, `docs/TODO.md` — bijwerken.

---

## Task 1: Domeintypes voor bedrijfsbibliotheken

**Files:**
- Create: `src/types/library.ts`
- Modify: `src/types/project.ts`, `src/types/resource.ts`, `src/types/calendar.ts`, `src/services/importTypes.ts`

- [ ] **Step 1: Schrijf het nieuwe types-bestand**

Create `src/types/library.ts`:

```ts
import type { WorkCalendar } from '@/types/calendar';
import type { Resource } from '@/types/resource';

/**
 * Herkomststempel op een PROJECTKOPIE van een bibliotheekitem (spec §2). Maakt
 * "bijwerken vanuit bibliotheek", duplicaatherkenning en (later, B1b) resource-identiteit over
 * projecten mogelijk. `libraryItemId` = het `id` van het bronitem IN de pool (de pool-identiteit).
 */
export interface LibraryOrigin {
  companyId: string;
  libraryItemId: string;
  poolVersion: number;
}

/** Een door de user benoemde groepering met een eigen pool (spec §2). */
export interface Company {
  id: string;
  name: string;
}

/**
 * De verzameling bibliotheekkalenders en -resources van één bedrijf (spec §2). `poolVersion` loopt
 * monotoon op bij elke wijziging; `modifiedAt` is de ISO-tijdstempel van de laatste wijziging. De
 * `id` van elke kalender/resource IN de pool is diens stabiele identiteit (het `libraryItemId` waar
 * herkomststempels naar wijzen).
 */
export interface CompanyPool {
  companyId: string;
  companyName: string;
  poolVersion: number;
  modifiedAt: string; // ISO 8601
  calendars: WorkCalendar[];
  resources: Resource[];
}

/** De volledige, app-globale bibliotheek: bedrijven + hun pools + welk bedrijf de default is. */
export interface CompanyLibrary {
  companies: Company[];
  defaultCompanyId: string;
  pools: Record<string, CompanyPool>; // key = companyId
}

/** Vaste id van het automatische standaardbedrijf (spec §2, "Mijn bedrijf"). */
export const DEFAULT_COMPANY_ID = 'company-default';

export function createDefaultCompany(): Company {
  return { id: DEFAULT_COMPANY_ID, name: 'Mijn bedrijf' };
}

export function createEmptyPool(company: Company): CompanyPool {
  return {
    companyId: company.id,
    companyName: company.name,
    poolVersion: 0,
    modifiedAt: new Date().toISOString(),
    calendars: [],
    resources: [],
  };
}

export function createDefaultLibrary(): CompanyLibrary {
  const company = createDefaultCompany();
  return {
    companies: [company],
    defaultCompanyId: company.id,
    pools: { [company.id]: createEmptyPool(company) },
  };
}
```

- [ ] **Step 2: Breid de bestaande domeintypes uit**

In `src/types/project.ts`, voeg binnen `interface Project` ná `schedulingOptions?` toe:

```ts
  /** OPTIONEEL — projectbinding aan een bedrijfsbibliotheek (spec B1, §2). Afwezig ⇒ project is
   *  (nog) aan geen enkel bedrijf gebonden; heropening zonder de pool is onschuldig. `companyName`
   *  is een gedenormaliseerde cache zodat een gedeeld bestand het bedrijf toont zonder de pool. */
  companyId?: string;
  companyName?: string;
```

In `src/types/resource.ts`, voeg toe bovenaan het bestand na de bestaande imports:

```ts
import type { LibraryOrigin } from '@/types/library';
```

en binnen `interface Resource` ná `parentId?`:

```ts
  /** OPTIONEEL — herkomststempel wanneer deze resource een kopie uit een bedrijfsbibliotheek is
   *  (spec B1, §2). Afwezig ⇒ handmatig aangemaakte resource. */
  libraryOrigin?: LibraryOrigin;
```

In `src/types/calendar.ts`, voeg toe na de bestaande import:

```ts
import type { LibraryOrigin } from '@/types/library';
```

en binnen `interface WorkCalendar` ná `shift?`:

```ts
  /** OPTIONEEL — herkomststempel wanneer deze kalender een kopie uit een bedrijfsbibliotheek is
   *  (spec B1, §2). Afwezig ⇒ handmatige/gegenereerde kalender. */
  libraryOrigin?: LibraryOrigin;
```

In `src/services/importTypes.ts`, voeg de import toe:

```ts
import type { CompanyPool } from '@/types/library';
```

en binnen `interface ImportResult` ná `activeBaselineId?`:

```ts
  /** OPTIONEEL — een pool-bestand (spec B1, §4) draagt zijn autoritatieve pool-JSON in het
   *  OPS_Library-pset; een gewoon projectbestand niet. Afwezig ⇒ geen pool-bestand. */
  libraryPool?: CompanyPool;
```

- [ ] **Step 3: Verifieer dat de build groen is (types compileren)**

Run: `npm run build`
Expected: PASS — `tsc` compileert zonder fouten; `vite build` slaagt. (Er is nog geen gebruiker van de nieuwe velden; ze zijn allemaal optioneel, dus geen bestaande code breekt.)

- [ ] **Step 4: Commit**

```bash
git add src/types/library.ts src/types/project.ts src/types/resource.ts src/types/calendar.ts src/services/importTypes.ts
git commit -m "$(cat <<'EOF'
feat(library): datamodel voor bedrijfsbibliotheken (bedrijf/pool/herkomststempel)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Pure kern-logica (stempel, versie, kopie/dedup, diff)

**Files:**
- Create: `src/services/library/libraryOps.ts`
- Create: `tests/library/check-library-ops.ts`
- Create: `tests/library/run.sh`
- Create: `tests/library/tsconfig.check.json`

- [ ] **Step 1: Schrijf de pure ops**

Create `src/services/library/libraryOps.ts`:

```ts
import type { WorkCalendar } from '@/types/calendar';
import type { Resource } from '@/types/resource';
import type { CompanyPool, LibraryOrigin } from '@/types/library';

/** Nieuwe pool-versie na een wijziging: poolVersion+1 + verse modifiedAt. Puur (nieuw object). */
export function bumpPool(pool: CompanyPool): CompanyPool {
  return { ...pool, poolVersion: pool.poolVersion + 1, modifiedAt: new Date().toISOString() };
}

/**
 * Demping-check (spec §4): is de LOKALE pool nieuwer dan de te importeren pool? Nieuwer =
 * hogere poolVersion, of bij gelijke versie een recentere modifiedAt. `undefined` lokaal (nog geen
 * pool) ⇒ nooit nieuwer.
 */
export function isPoolNewer(local: CompanyPool | undefined, imported: CompanyPool): boolean {
  if (!local) return false;
  if (local.poolVersion !== imported.poolVersion) return local.poolVersion > imported.poolVersion;
  return local.modifiedAt > imported.modifiedAt;
}

/** Bouw een herkomststempel voor een item uit een pool. */
export function makeOrigin(pool: CompanyPool, libraryItemId: string): LibraryOrigin {
  return { companyId: pool.companyId, libraryItemId, poolVersion: pool.poolVersion };
}

/** Zoek een bestaande projectkopie met dezelfde herkomst (dedup, spec §3). */
export function findCopyByOrigin<T extends { libraryOrigin?: LibraryOrigin }>(
  items: T[], companyId: string, libraryItemId: string,
): T | undefined {
  return items.find(
    (i) => i.libraryOrigin?.companyId === companyId && i.libraryOrigin?.libraryItemId === libraryItemId,
  );
}

export interface CalendarCopyResult {
  /** De (nieuwe of hergebruikte) projectkalender. */
  calendar: WorkCalendar;
  /** True ⇒ een bestaande kopie met dezelfde herkomst is hergebruikt (geen nieuwe toegevoegd). */
  reused: boolean;
}

/**
 * Kopieer een pool-kalender naar het project met stempel (spec §3). Bestaat er al een kopie met
 * dezelfde herkomst, dan wordt die hergebruikt (`reused: true`), nooit gedupliceerd. `genId` mint
 * een verse project-lokale id (injecteerbaar voor deterministische tests). `null` ⇒ de pool bevat
 * die kalender niet.
 */
export function copyCalendarToProject(
  pool: CompanyPool,
  poolCalendarId: string,
  existingCalendars: WorkCalendar[],
  genId: (prefix: string) => string,
): CalendarCopyResult | null {
  const source = pool.calendars.find((c) => c.id === poolCalendarId);
  if (!source) return null;
  const existing = findCopyByOrigin(existingCalendars, pool.companyId, poolCalendarId);
  if (existing) return { calendar: existing, reused: true };
  const calendar: WorkCalendar = {
    ...structuredClone(source),
    id: genId('cal'),
    libraryOrigin: makeOrigin(pool, poolCalendarId),
  };
  return { calendar, reused: false };
}

export interface ResourceCopyResult {
  resource: Resource;
  reused: boolean;
  /** Meereizende kalender (spec §3): de eigen `calendarId` van de resource bracht deze kalender mee.
   *  Afwezig ⇒ de resource had geen eigen kalender, of hij verwees niet naar een pool-kalender. */
  travelingCalendar?: CalendarCopyResult;
}

/**
 * Kopieer een pool-resource naar het project met stempel (spec §3). Afhankelijkheden reizen mee:
 * heeft de resource een eigen `calendarId` die in de pool bestaat, dan wordt die kalender
 * mee-gekopieerd (met dedup) en `resource.calendarId` naar de project-lokale kopie herschreven.
 * Dedup op de resource zelf: bestaat er al een projectkopie met dezelfde herkomst ⇒ hergebruik.
 */
export function copyResourceToProject(
  pool: CompanyPool,
  poolResourceId: string,
  existingResources: Resource[],
  existingCalendars: WorkCalendar[],
  genId: (prefix: string) => string,
): ResourceCopyResult | null {
  const source = pool.resources.find((r) => r.id === poolResourceId);
  if (!source) return null;
  const existing = findCopyByOrigin(existingResources, pool.companyId, poolResourceId);
  if (existing) return { resource: existing, reused: true };

  let travelingCalendar: CalendarCopyResult | undefined;
  let calendarId = source.calendarId;
  if (source.calendarId && pool.calendars.some((c) => c.id === source.calendarId)) {
    travelingCalendar = copyCalendarToProject(pool, source.calendarId, existingCalendars, genId) ?? undefined;
    calendarId = travelingCalendar?.calendar.id;
  } else {
    // De resource verwees niet naar een pool-kalender (bv. projectkalender): geen meereizende kopie.
    calendarId = undefined;
  }

  const resource: Resource = {
    ...structuredClone(source),
    id: genId('res'),
    calendarId,
    libraryOrigin: makeOrigin(pool, poolResourceId),
    // parentId (ploeg-lidmaatschap) is een pool-lokale verwijzing; bij een losse kopie laten we hem
    // vallen (het project heeft de ploeg niet noodzakelijk). Zo ontstaat nooit een dode verwijzing.
    parentId: undefined,
  };
  return { resource, reused: false, travelingCalendar };
}

/** Uitkomst van een diff tussen een projectkopie en zijn pool-origineel (spec §3). */
export type ItemDiff =
  | { status: 'removed' } // origineel bestaat niet meer in de bibliotheek
  | { status: 'up-to-date' }
  | { status: 'changed'; fields: DiffField[] };

export interface DiffField {
  field: string;
  project: unknown;
  library: unknown;
}

/** Velden die we vergelijken bij een kalender-diff (herkomst/id/naam-identiteit tellen niet mee). */
const CALENDAR_DIFF_FIELDS: (keyof WorkCalendar)[] = [
  'name', 'description', 'workDays', 'workStartHour', 'workEndHour', 'hoursPerDay',
  'holidays', 'generation', 'workTime', 'shift',
];

const RESOURCE_DIFF_FIELDS: (keyof Resource)[] = [
  'name', 'type', 'description', 'costPerHour', 'maxUnits', 'unitOfMeasure', 'availabilitySteps',
];

function diffFields<T>(project: T, library: T, fields: (keyof T)[]): DiffField[] {
  const out: DiffField[] = [];
  for (const f of fields) {
    const a = project[f];
    const b = library[f];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push({ field: String(f), project: a, library: b });
    }
  }
  return out;
}

export function diffCalendarVsPool(projectCal: WorkCalendar, pool: CompanyPool): ItemDiff {
  const id = projectCal.libraryOrigin?.libraryItemId;
  const source = id ? pool.calendars.find((c) => c.id === id) : undefined;
  if (!source) return { status: 'removed' };
  const fields = diffFields(projectCal, source, CALENDAR_DIFF_FIELDS);
  return fields.length === 0 ? { status: 'up-to-date' } : { status: 'changed', fields };
}

export function diffResourceVsPool(projectRes: Resource, pool: CompanyPool): ItemDiff {
  const id = projectRes.libraryOrigin?.libraryItemId;
  const source = id ? pool.resources.find((r) => r.id === id) : undefined;
  if (!source) return { status: 'removed' };
  const fields = diffFields(projectRes, source, RESOURCE_DIFF_FIELDS);
  return fields.length === 0 ? { status: 'up-to-date' } : { status: 'changed', fields };
}

/** Pas de pool-waarden toe op een projectkalender bij "bijwerken" (spec §3): overschrijf de
 *  vergeleken velden, behoud id + herkomst (met verse poolVersion). Puur (nieuw object). */
export function applyCalendarUpdate(projectCal: WorkCalendar, pool: CompanyPool): WorkCalendar {
  const id = projectCal.libraryOrigin!.libraryItemId;
  const source = pool.calendars.find((c) => c.id === id)!;
  const patched: WorkCalendar = { ...structuredClone(source), id: projectCal.id, libraryOrigin: makeOrigin(pool, id) };
  return patched;
}

export function applyResourceUpdate(projectRes: Resource, pool: CompanyPool): Resource {
  const id = projectRes.libraryOrigin!.libraryItemId;
  const source = pool.resources.find((r) => r.id === id)!;
  // Behoud id + de PROJECT-lokale calendarId (die verwijst naar de meegereisde projectkalender,
  // niet naar de pool-id) + herkomst met verse versie; overschrijf de inhoudelijke velden.
  const patched: Resource = {
    ...structuredClone(source),
    id: projectRes.id,
    calendarId: projectRes.calendarId,
    parentId: projectRes.parentId,
    libraryOrigin: makeOrigin(pool, id),
  };
  return patched;
}
```

- [ ] **Step 2: Schrijf de falende testbatterij (pure ops)**

Create `tests/library/check-library-ops.ts`:

```ts
// Pure-ops-batterij voor de bedrijfsbibliotheek (spec B1, §2/§3/§4). Draait headless op Node; de
// exitcode is de poort (XX-regels tonen afwijkingen). Geen store, geen I/O — alleen libraryOps.
import {
  bumpPool, isPoolNewer, makeOrigin, findCopyByOrigin,
  copyCalendarToProject, copyResourceToProject,
  diffCalendarVsPool, diffResourceVsPool, applyResourceUpdate,
} from '@/services/library/libraryOps';
import type { CompanyPool } from '@/types/library';
import type { WorkCalendar } from '@/types/calendar';
import type { Resource } from '@/types/resource';

declare const process: { exit(code: number): never };

let checks = 0; let fails = 0;
function assert(cond: boolean, msg: string): void {
  checks++;
  if (!cond) { fails++; console.log(`   XX ${msg}`); }
}

function cal(id: string, name: string): WorkCalendar {
  return {
    id, name, description: '', workDays: [1, 2, 3, 4, 5],
    workStartHour: 7, workEndHour: 15, hoursPerDay: 8, holidays: [],
  };
}
function res(id: string, name: string, calendarId?: string): Resource {
  return { id, name, type: 'LABOR', description: '', maxUnits: 1, calendarId };
}
function pool(): CompanyPool {
  return {
    companyId: 'c1', companyName: 'Bedrijf 1', poolVersion: 3, modifiedAt: '2026-07-20T10:00:00.000Z',
    calendars: [cal('pc1', 'Ploegkalender')],
    resources: [res('pr1', 'Timmerman', 'pc1'), res('pr2', 'Kraan')],
  };
}

// counter-gebaseerde genId voor deterministische ids in de test
let n = 0;
const genId = (prefix: string) => `${prefix}-gen-${++n}`;

// 1. bumpPool
{
  const p = pool();
  const b = bumpPool(p);
  assert(b.poolVersion === 4, 'bumpPool verhoogt poolVersion');
  assert(b.modifiedAt !== p.modifiedAt, 'bumpPool verse modifiedAt');
  assert(p.poolVersion === 3, 'bumpPool muteert het origineel niet');
}

// 2. isPoolNewer
{
  const local = pool();
  assert(isPoolNewer(undefined, local) === false, 'isPoolNewer: geen lokale pool ⇒ niet nieuwer');
  assert(isPoolNewer({ ...local, poolVersion: 5 }, local) === true, 'isPoolNewer: hogere versie ⇒ nieuwer');
  assert(isPoolNewer({ ...local, poolVersion: 1 }, local) === false, 'isPoolNewer: lagere versie ⇒ niet nieuwer');
  assert(
    isPoolNewer({ ...local, modifiedAt: '2026-07-21T00:00:00.000Z' }, local) === true,
    'isPoolNewer: gelijke versie, recentere modifiedAt ⇒ nieuwer',
  );
}

// 3. makeOrigin + dedup
{
  const p = pool();
  const o = makeOrigin(p, 'pr1');
  assert(o.companyId === 'c1' && o.libraryItemId === 'pr1' && o.poolVersion === 3, 'makeOrigin stempelt correct');
  const list: Resource[] = [{ ...res('x', 'x'), libraryOrigin: o }];
  assert(findCopyByOrigin(list, 'c1', 'pr1')?.id === 'x', 'findCopyByOrigin vindt bestaande kopie');
  assert(findCopyByOrigin(list, 'c1', 'pr2') === undefined, 'findCopyByOrigin: geen match');
}

// 4. copyCalendarToProject — nieuw + dedup
{
  const p = pool();
  const c1 = copyCalendarToProject(p, 'pc1', [], genId)!;
  assert(c1.reused === false, 'copyCalendar: verse kopie is niet-hergebruikt');
  assert(c1.calendar.id !== 'pc1', 'copyCalendar: verse project-lokale id');
  assert(c1.calendar.libraryOrigin?.libraryItemId === 'pc1', 'copyCalendar: stempel wijst naar pool-id');
  const c2 = copyCalendarToProject(p, 'pc1', [c1.calendar], genId)!;
  assert(c2.reused === true && c2.calendar.id === c1.calendar.id, 'copyCalendar: dedup hergebruikt bestaande kopie');
  assert(copyCalendarToProject(p, 'onbekend', [], genId) === null, 'copyCalendar: onbekende id ⇒ null');
}

// 5. copyResourceToProject — meereizende kalender + herschreven calendarId
{
  const p = pool();
  const r = copyResourceToProject(p, 'pr1', [], [], genId)!;
  assert(r.reused === false, 'copyResource: verse kopie');
  assert(!!r.travelingCalendar && r.travelingCalendar.reused === false, 'copyResource: kalender reist mee');
  assert(r.resource.calendarId === r.travelingCalendar!.calendar.id, 'copyResource: calendarId → project-lokale kalender');
  assert(r.resource.libraryOrigin?.libraryItemId === 'pr1', 'copyResource: stempel');
  // Resource zonder eigen pool-kalender (pr2): geen meereizende kalender, calendarId undefined
  const r2 = copyResourceToProject(p, 'pr2', [], [], genId)!;
  assert(r2.travelingCalendar === undefined && r2.resource.calendarId === undefined, 'copyResource: geen kalender ⇒ geen meereizende kopie');
}

// 6. copyResourceToProject — dedup van meereizende kalender (bestaande kalenderkopie hergebruikt)
{
  const p = pool();
  const existingCal = copyCalendarToProject(p, 'pc1', [], genId)!.calendar;
  const r = copyResourceToProject(p, 'pr1', [], [existingCal], genId)!;
  assert(r.travelingCalendar?.reused === true, 'copyResource: bestaande kalenderkopie wordt hergebruikt');
  assert(r.resource.calendarId === existingCal.id, 'copyResource: calendarId → hergebruikte kalender');
}

// 7. diff — up-to-date / changed / removed
{
  const p = pool();
  const copy = copyResourceToProject(p, 'pr2', [], [], genId)!.resource;
  assert(diffResourceVsPool(copy, p).status === 'up-to-date', 'diff: verse kopie is up-to-date');
  const changed = { ...copy, maxUnits: 5 };
  const d = diffResourceVsPool(changed, p);
  assert(d.status === 'changed' && d.fields.some(f => f.field === 'maxUnits'), 'diff: gewijzigd veld gedetecteerd');
  const removedPool: CompanyPool = { ...p, resources: [] };
  assert(diffResourceVsPool(copy, removedPool).status === 'removed', 'diff: verwijderd origineel ⇒ removed');
  const c = copyCalendarToProject(p, 'pc1', [], genId)!.calendar;
  assert(diffCalendarVsPool(c, p).status === 'up-to-date', 'diff: kalenderkopie up-to-date');
}

// 8. applyResourceUpdate behoudt id + project-lokale calendarId, verse poolVersion
{
  const p = bumpPool(pool()); // poolVersion 4
  const copy = { ...res('local-r', 'Oude naam', 'local-cal'), libraryOrigin: makeOrigin({ ...p, poolVersion: 3 }, 'pr2') };
  const updated = applyResourceUpdate(copy, { ...p, resources: [res('pr2', 'Nieuwe naam')] });
  assert(updated.id === 'local-r', 'applyUpdate: behoudt project-id');
  assert(updated.name === 'Nieuwe naam', 'applyUpdate: neemt pool-naam over');
  assert(updated.calendarId === 'local-cal', 'applyUpdate: behoudt project-lokale calendarId');
  assert(updated.libraryOrigin?.poolVersion === 4, 'applyUpdate: verse poolVersion in stempel');
}

console.log(`library-ops: ${checks - fails}/${checks} groen`);
process.exit(fails > 0 ? 1 : 0);
```

- [ ] **Step 3: Schrijf de testrunner + dedicated tsconfig**

Create `tests/library/tsconfig.check.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "types": []
  },
  "include": [
    "check-library-ops.ts",
    "check-library-slice.ts",
    "check-pool-ifc.ts",
    "../../src/types/file-system-access.d.ts"
  ]
}
```

Create `tests/library/run.sh` (chmod +x na aanmaak):

```bash
#!/usr/bin/env bash
# Bedrijfsbibliotheek-regressietests (spec B1). Bundelt elke check met esbuild en draait 'm op Node;
# de exitcode is de poort (exit 0 = alles groen, exit 1 = minstens één afwijking). Model:
# tests/planning/run.sh. Worktree-let-op: verwijst naar $ROOT/node_modules/.bin/esbuild.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
ESBUILD="$ROOT/node_modules/.bin/esbuild"
TSC="$ROOT/node_modules/.bin/tsc"
STATUS=0

# Compile-afdwinging (fixture-/type-volledigheid) — dedicated tsconfig, want de hoofd-tsconfig
# sluit tests/ uit.
node "$TSC" --noEmit -p "$DIR/tsconfig.check.json" || STATUS=1

run_check() {
  local name="$1"
  local out="$DIR/.$name.mjs"
  "$ESBUILD" "$DIR/$name.ts" \
    --bundle --platform=node --format=esm --alias:@="$ROOT/src" \
    --define:import.meta.env.DEV=false \
    --define:import.meta.env.PROD=true \
    --define:import.meta.env.MODE='"production"' \
    --define:__OPS_DEV_INSTANCE__='"test"' \
    --outfile="$out" >/dev/null 2>&1
  node "$out" || STATUS=1
}

run_check check-library-ops
run_check check-library-slice
run_check check-pool-ifc

exit "$STATUS"
```

Create `tests/library/.gitignore`:

```
.*.mjs
```

- [ ] **Step 4: Draai de batterij — verwacht ROOD (ops bestaat, maar de andere twee checks nog niet)**

Voor deze taak draaien we alleen de ops-check gericht. Maak de nog-ontbrekende checks tijdelijk leeg zodat de runner niet crasht op ontbrekende bestanden, óf draai de ops-check los:

Run: `bash -c 'cd /pad/naar/worktree && node_modules/.bin/esbuild tests/library/check-library-ops.ts --bundle --platform=node --format=esm --alias:@=src --define:import.meta.env.DEV=false --define:import.meta.env.PROD=true --define:import.meta.env.MODE=\"production\" --define:__OPS_DEV_INSTANCE__=\"test\" --outfile=tests/library/.check-library-ops.mjs && node tests/library/.check-library-ops.mjs'`
Expected: eerst FAIL als je de check schreef vóór de ops — hier zijn ops + check samen gemaakt, dus draai en verwacht: `library-ops: 30/30 groen`, exitcode 0. (Als een assert rood is: fix de ops, niet de test.)

- [ ] **Step 5: Verifieer build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
chmod +x tests/library/run.sh
git add src/services/library/libraryOps.ts tests/library/check-library-ops.ts tests/library/run.sh tests/library/tsconfig.check.json tests/library/.gitignore
git commit -m "$(cat <<'EOF'
feat(library): pure kern-logica (stempel/versie/kopie/dedup/diff) + ops-testbatterij

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Persistentielaag (IndexedDB / appDataDir)

**Files:**
- Create: `src/services/library/libraryStore.ts`
- Create: `src/services/library/index.ts`

- [ ] **Step 1: Schrijf de persistentielaag**

Create `src/services/library/libraryStore.ts`:

```ts
/**
 * Persistentie van de bedrijfsbibliotheek (spec §5). Pools zijn BEDRIJFSDATA, geen instellingen ⇒
 * NIET in localStorage. Browser: IndexedDB (patroon van het extensiesysteem, eigen database
 * `ops-library`). Desktop (Tauri): JSON-bestand in `appDataDir` (patroon van recoveryStore), buiten
 * de browserprofiel-levensduur. Export (libraryIfc) is het backupmechanisme (spec §5).
 */
import { isTauri } from '@/utils/platform';
import type { CompanyLibrary } from '@/types/library';
import { createDefaultLibrary } from '@/types/library';

const LIBRARY_FILE = 'ops-library.json';

// ── IndexedDB (browser) ───────────────────────────────────────────────────────────────────────
let dbPromise: Promise<IDBDatabase> | null = null;

function openLibraryDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('ops-library', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('library')) {
        db.createObjectStore('library', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

async function loadWeb(): Promise<CompanyLibrary | null> {
  if (typeof indexedDB === 'undefined') return null; // headless Node (testbatterij) = no-op.
  const db = await openLibraryDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('library', 'readonly');
    const req = tx.objectStore('library').get('library');
    req.onsuccess = () => resolve((req.result as { key: string; value: CompanyLibrary } | undefined)?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveWeb(lib: CompanyLibrary): Promise<void> {
  if (typeof indexedDB === 'undefined') return; // headless Node (testbatterij) = no-op; geen unhandled rejection.
  const db = await openLibraryDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('library', 'readwrite');
    tx.objectStore('library').put({ key: 'library', value: lib });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── appDataDir-bestand (Tauri) ────────────────────────────────────────────────────────────────
async function loadTauri(): Promise<CompanyLibrary | null> {
  const { readTextFile, exists } = await import('@tauri-apps/plugin-fs');
  const { appDataDir, join } = await import('@tauri-apps/api/path');
  const path = await join(await appDataDir(), LIBRARY_FILE);
  if (!(await exists(path))) return null;
  try {
    return JSON.parse(await readTextFile(path)) as CompanyLibrary;
  } catch {
    return null; // corrupt bestand: val terug op een verse bibliotheek i.p.v. crashen
  }
}

async function saveTauri(lib: CompanyLibrary): Promise<void> {
  const { writeTextFile } = await import('@tauri-apps/plugin-fs');
  const { appDataDir, join } = await import('@tauri-apps/api/path');
  const path = await join(await appDataDir(), LIBRARY_FILE);
  await writeTextFile(path, JSON.stringify(lib));
}

// ── Publieke API ──────────────────────────────────────────────────────────────────────────────

/** Laad de opgeslagen bibliotheek; nog niets opgeslagen ⇒ een verse default-bibliotheek. */
export async function loadLibrary(): Promise<CompanyLibrary> {
  const loaded = isTauri() ? await loadTauri() : await loadWeb();
  return loaded ?? createDefaultLibrary();
}

export async function saveLibrary(lib: CompanyLibrary): Promise<void> {
  return isTauri() ? saveTauri(lib) : saveWeb(lib);
}
```

- [ ] **Step 2: Schrijf de barrel**

Create `src/services/library/index.ts`:

```ts
export * from './libraryOps';
export * from './libraryStore';
export * from './libraryIfc';
```

**Let op:** `libraryIfc` bestaat pas na Taak 4. Voeg de `libraryIfc`-regel voorlopig NIET toe; zet in deze taak alleen:

```ts
export * from './libraryOps';
export * from './libraryStore';
```

en breid de barrel uit in Taak 4.

- [ ] **Step 3: Verifieer build**

Run: `npm run build`
Expected: PASS. (De persistentielaag is nog nergens aangeroepen; de dynamische `@tauri-apps/*`-imports zitten binnen `isTauri()`-takken, dus de web-build blijft heel.)

- [ ] **Step 4: Commit**

```bash
git add src/services/library/libraryStore.ts src/services/library/index.ts
git commit -m "$(cat <<'EOF'
feat(library): persistentielaag (IndexedDB in browser, appDataDir-bestand in Tauri)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Pool-bestand — IFC 4.3 met OPS_Library-JSON-pset

**Files:**
- Modify: `src/services/ifc/ifcPsets.ts`, `src/services/ifc/ifcWriter.ts`, `src/services/ifc/ifcReader.ts`
- Create: `src/services/library/libraryIfc.ts`
- Modify: `src/services/library/index.ts`
- Create: `tests/library/check-pool-ifc.ts`

- [ ] **Step 1: Voeg de PSET-naam toe**

In `src/services/ifc/ifcPsets.ts`, voeg binnen het `PSET`-object (na `Calendar: 'OPS_Calendar',`) toe:

```ts
  // Bedrijfsbibliotheek-pool als autoritatief JSON-blob op het IfcProject (spec B1, §4).
  Library: 'OPS_Library',
```

- [ ] **Step 2: Schrijf de OPS_Library-pset in de writer**

In `src/services/ifc/ifcWriter.ts`:

(a) breid de destructurering in `writeIFC` uit — voeg `libraryPool = undefined` toe aan het `const { ... } = input;`-blok (regel ~96):

```ts
  const {
    project, calendar, tasks, sequences, resources, assignments,
    activityCodeTypes = [],
    customFieldDefs = [],
    resourceCalendars = [],
    baselines = [],
    activeBaselineId = null,
    libraryPool = undefined,
  } = input;
```

(b) roep vlak ná de `writeStructure(...)`-aanroep (regel ~224) de nieuwe pool-writer aan:

```ts
  writeLibraryPool(ctx, ownerHistId, libraryPool);
```

(c) voeg de functie toe (bij de andere `write*`-helpers, bijvoorbeeld direct ná `writeStructure`):

```ts
/**
 * Spec B1, §4 — de VOLLEDIGE pool als één autoritatief JSON-blob in het `OPS_Library`-pset op het
 * IfcProject (patroon `OPS_StructureMeta`: één IFCTEXT-property, verliesloos, incl. ids en versie).
 * Alleen een pool-BESTAND draagt dit; een gewoon projectbestand roept dit met `undefined` aan ⇒
 * niets geschreven (golden rule, byte-identiek). De IFCWORKCALENDAR/resource-entiteiten in het
 * bestand blijven voor derden leesbaar, maar deze JSON is voor ONZE reader de bron van waarheid.
 */
function writeLibraryPool(
  ctx: WriteContext,
  ownerHistId: number,
  pool: import('@/types/library').CompanyPool | undefined,
): void {
  if (!pool) return;
  const projRef = ref(ctx, '_project');
  const json = JSON.stringify(pool);
  const propId = addLine(ctx, '_ps_library',
    `IFCPROPERTYSINGLEVALUE('pool',$,IFCTEXT(${ifcStr(json)}),$)`);
  const setId = addLine(ctx, '_pset_library',
    `IFCPROPERTYSET(${ifcStr(ifcGuid('pset_library'))},#${ownerHistId},${ifcStr(PSET.Library)},$,(#${propId}))`);
  addLine(ctx, '_rel_library',
    `IFCRELDEFINESBYPROPERTIES(${ifcStr(ifcGuid('rel_library'))},#${ownerHistId},$,$,(${projRef}),#${setId})`);
}
```

- [ ] **Step 3: Lees de OPS_Library-pset in de reader**

In `src/services/ifc/ifcReader.ts`, binnen de project-pset-lus (de plek waar `PSET.ProjectSettings` wordt afgehandeld, rond regel 628), voeg vóór `if (psetName === PSET.ProjectSettings)` een nieuw blok toe:

```ts
    if (psetName === PSET.Library) {
      for (const prop of props) {
        if (prop.type !== 'IFCPROPERTYSINGLEVALUE') continue;
        if (stripQuotes(prop.args[0] || '') !== 'pool') continue;
        const v = parseTypedValue(prop.args[2] || '');
        if (typeof v === 'string' && v) {
          try {
            libraryPoolOut.value = JSON.parse(v) as import('@/types/library').CompanyPool;
          } catch { /* corrupte pool-JSON: negeren, geen pool-resultaat */ }
        }
      }
      continue;
    }
```

`extractStructure` (de functie met deze lus) moet de gevonden pool teruggeven. De eenvoudigste, lokaal-contained aanpak: geef `extractStructure` een out-parameter mee. Voeg bovenaan `readIFC` (waar `extractStructure` wordt aangeroepen, rond regel 91) een houder toe en lees hem uit:

```ts
  const libraryPoolOut: { value: import('@/types/library').CompanyPool | undefined } = { value: undefined };
```

Geef `libraryPoolOut` door aan `extractStructure(...)` (voeg 'm als laatste parameter toe aan de signatuur en de aanroep), en neem in het `return`-object van `readIFC` op:

```ts
    libraryPool: libraryPoolOut.value,
```

Werk de signatuur van `extractStructure` bij: voeg `libraryPoolOut: { value: import('@/types/library').CompanyPool | undefined }` als extra parameter toe.

- [ ] **Step 4: Schrijf de pool-IFC-service**

Create `src/services/library/libraryIfc.ts`:

```ts
/**
 * Pool-bestand (spec §4): één IFC 4.3-bestand per bedrijf met de kalenders/resources als echte
 * entiteiten (leesbaar voor derden) én de VOLLEDIGE pool als autoritatief `OPS_Library`-JSON
 * (verliesloos, incl. ids/versie). Delegeert aan de bestaande writeIFC/readIFC.
 */
import { writeIFC } from '@/services/ifc/ifcWriter';
import { readIFC } from '@/services/ifc/ifcReader';
import { createDefaultProject } from '@/state/slices/projectSlice';
import { createDefaultCalendar } from '@/engine/calendar/defaultCalendar';
import type { CompanyPool } from '@/types/library';

/** Serialiseer een pool naar een IFC-bestand (string). */
export function writePoolIFC(pool: CompanyPool): string {
  const project = {
    ...createDefaultProject(),
    name: `Bibliotheek — ${pool.companyName}`,
    company: pool.companyName,
    companyId: pool.companyId,
    companyName: pool.companyName,
  };
  return writeIFC({
    project,
    calendar: createDefaultCalendar(),
    tasks: [],
    sequences: [],
    resources: pool.resources,
    assignments: [],
    resourceCalendars: pool.calendars,
    libraryPool: pool,
  });
}

/** Lees een pool uit een IFC-bestand. Gooit als het bestand geen OPS_Library-pool draagt. */
export function readPoolIFC(content: string): CompanyPool {
  const result = readIFC(content);
  if (!result.libraryPool) {
    throw new Error('Dit IFC-bestand bevat geen bedrijfsbibliotheek (OPS_Library).');
  }
  return result.libraryPool;
}
```

- [ ] **Step 5: Breid de barrel uit**

In `src/services/library/index.ts`, voeg toe:

```ts
export * from './libraryIfc';
```

- [ ] **Step 6: Schrijf de pool-round-trip-batterij (rood-first)**

Create `tests/library/check-pool-ifc.ts`:

```ts
// Pool-IFC-round-trip (spec §4/§9): writePoolIFC → readPoolIFC ⇒ IDENTIEKE pool (incl. versie + ids),
// zodat een pool-import op een schone staat de pool exact herstelt en bestaande project-stempels
// blijven matchen. Exitcode = poort.
import { writePoolIFC, readPoolIFC } from '@/services/library/libraryIfc';
import type { CompanyPool } from '@/types/library';
import type { WorkCalendar } from '@/types/calendar';
import type { Resource } from '@/types/resource';

declare const process: { exit(code: number): never };

let checks = 0; let fails = 0;
function assert(cond: boolean, msg: string): void {
  checks++;
  if (!cond) { fails++; console.log(`   XX ${msg}`); }
}

const cal: WorkCalendar = {
  id: 'pc1', name: 'Ploegkalender', description: 'Ma-vr',
  workDays: [1, 2, 3, 4, 5], workStartHour: 7, workEndHour: 15, hoursPerDay: 8,
  holidays: [{ name: 'Kerst', startDate: '2026-12-25', endDate: '2026-12-26' }],
};
const resources: Resource[] = [
  { id: 'pr1', name: 'Timmerman', type: 'LABOR', description: '', maxUnits: 2, costPerHour: 45, calendarId: 'pc1' },
  { id: 'pr2', name: 'Beton', type: 'MATERIAL', description: '', maxUnits: 1, unitOfMeasure: 'm3' },
];
const pool: CompanyPool = {
  companyId: 'c1', companyName: 'Aannemer BV', poolVersion: 7, modifiedAt: '2026-07-20T09:30:00.000Z',
  calendars: [cal], resources,
};

const ifc = writePoolIFC(pool);
const back = readPoolIFC(ifc);

assert(back.companyId === 'c1', 'pool round-trip: companyId');
assert(back.companyName === 'Aannemer BV', 'pool round-trip: companyName');
assert(back.poolVersion === 7, 'pool round-trip: poolVersion');
assert(back.modifiedAt === '2026-07-20T09:30:00.000Z', 'pool round-trip: modifiedAt');
assert(back.calendars.length === 1 && back.calendars[0].id === 'pc1', 'pool round-trip: kalender-id behouden');
assert(back.resources.length === 2, 'pool round-trip: aantal resources');
assert(back.resources.find(r => r.id === 'pr1')?.costPerHour === 45, 'pool round-trip: resource-detail');
assert(back.resources.find(r => r.id === 'pr2')?.unitOfMeasure === 'm3', 'pool round-trip: materiaal-eenheid');

// Idempotentie: tweede round-trip byte-stabiel op de JSON-pool.
const ifc2 = writePoolIFC(back);
const back2 = readPoolIFC(ifc2);
assert(JSON.stringify(back) === JSON.stringify(back2), 'pool round-trip: idempotent');

// Een gewoon projectbestand draagt geen OPS_Library ⇒ readPoolIFC gooit.
let threw = false;
try {
  const projIfc = writePoolIFC(pool).replace(/OPS_Library/g, 'OPS_Iets_Anders');
  readPoolIFC(projIfc);
} catch { threw = true; }
assert(threw, 'readPoolIFC gooit op een bestand zonder OPS_Library');

console.log(`pool-ifc: ${checks - fails}/${checks} groen`);
process.exit(fails > 0 ? 1 : 0);
```

- [ ] **Step 7: Draai de pool-IFC-check — verwacht GROEN**

Run: `node_modules/.bin/esbuild tests/library/check-pool-ifc.ts --bundle --platform=node --format=esm --alias:@=src --define:import.meta.env.DEV=false --define:import.meta.env.PROD=true --define:import.meta.env.MODE='"production"' --define:__OPS_DEV_INSTANCE__='"test"' --outfile=tests/library/.check-pool-ifc.mjs && node tests/library/.check-pool-ifc.mjs`
Expected: `pool-ifc: 11/11 groen`, exitcode 0. (Als een assert rood is: writer/reader-koppeling herzien, niet de test verslappen.)

- [ ] **Step 8: Verifieer dat de bestaande IFC-round-trip-suite groen blijft (golden rule)**

Run: `bash tests/planning/run.sh cases-calibration.json` gevolgd door de round-trip-check:
`node_modules/.bin/tsc --noEmit -p tests/planning/tsconfig.roundtrip.json && node_modules/.bin/esbuild tests/planning/check-ifc-roundtrip.ts --bundle --platform=node --format=esm --alias:@=src --define:import.meta.env.DEV=false --define:import.meta.env.PROD=true --define:import.meta.env.MODE='"production"' --define:__OPS_DEV_INSTANCE__='"test"' --outfile=tests/planning/.ifc-roundtrip-check.mjs && node tests/planning/.ifc-roundtrip-check.mjs`
Expected: geen `XX`-regels; exitcode 0. Een gewoon projectbestand (geen `libraryPool`) schrijft géén OPS_Library — golden rule intact.

- [ ] **Step 9: Verifieer build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/services/ifc/ifcPsets.ts src/services/ifc/ifcWriter.ts src/services/ifc/ifcReader.ts src/services/library/libraryIfc.ts src/services/library/index.ts tests/library/check-pool-ifc.ts
git commit -m "$(cat <<'EOF'
feat(library): pool-bestand als IFC 4.3 met autoritatief OPS_Library-JSON-pset

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Projectbinding + herkomststempels in het project-IFC

**Files:**
- Modify: `src/services/ifc/ifcWriter.ts`, `src/services/ifc/ifcReader.ts`
- Modify: `tests/planning/check-ifc-roundtrip.ts`

- [ ] **Step 1: Schrijf companyId/companyName in OPS_ProjectSettings**

In `src/services/ifc/ifcWriter.ts`, binnen `writeStructure`, ná het `project.modifiedAt`-blok (regel ~320, vóór `if (projSettingProps.length > 0)`), voeg toe:

```ts
  // Projectbinding aan een bedrijfsbibliotheek (spec B1, §6). Golden rule: alleen wanneer gebonden.
  if (project.companyId) {
    projSettingProps.push(addLine(ctx, '_ps_companyid',
      `IFCPROPERTYSINGLEVALUE('CompanyId',$,IFCTEXT(${ifcStr(project.companyId)}),$)`));
  }
  if (project.companyName) {
    projSettingProps.push(addLine(ctx, '_ps_companyname',
      `IFCPROPERTYSINGLEVALUE('CompanyName',$,IFCTEXT(${ifcStr(project.companyName)}),$)`));
  }
```

- [ ] **Step 2: Schrijf libraryOrigin in OPS_Resource**

In `src/services/ifc/ifcWriter.ts`, binnen `writeResourceMeta`, ná het `res.parentId`-blok (regel ~753, vóór `if (props.length === 0) continue;`), voeg toe:

```ts
    if (res.libraryOrigin) {
      const id = addLine(ctx, `_reslo_${res.id}`,
        `IFCPROPERTYSINGLEVALUE('LibraryOrigin',$,IFCTEXT(${ifcStr(JSON.stringify(res.libraryOrigin))}),$)`);
      props.push(`#${id}`);
    }
```

- [ ] **Step 3: Schrijf libraryOrigin in OPS_Calendar**

In `src/services/ifc/ifcWriter.ts`, `writeCalendarGenerationMeta` schrijft nu alleen bij aanwezige `generation`. Breid de golden-rule-guard uit zodat `libraryOrigin` óók een pset triggert. Vervang de eerste regels van de functie:

```ts
  const gen = cal.generation;
  if (!gen) return;
```

door:

```ts
  const gen = cal.generation;
  if (!gen && !cal.libraryOrigin) return;
```

en (voor het geval `gen` afwezig maar `libraryOrigin` aanwezig is) maak de generation-props conditioneel. Vervang het bestaande `props`-opbouwblok zodat het generation-deel alleen draait bij `gen`:

```ts
  const props: number[] = [];
  if (gen) {
    props.push(addLine(ctx, `_opscal_ruleset_${cal.id}`,
      `IFCPROPERTYSINGLEVALUE('RuleSetId',$,IFCLABEL(${ifcStr(gen.ruleSetId)}),$)`));
    if (gen.region) {
      props.push(addLine(ctx, `_opscal_region_${cal.id}`,
        `IFCPROPERTYSINGLEVALUE('Region',$,IFCLABEL(${ifcStr(gen.region)}),$)`));
    }
    if (gen.breakChoice) {
      props.push(addLine(ctx, `_opscal_break_${cal.id}`,
        `IFCPROPERTYSINGLEVALUE('BreakChoice',$,IFCLABEL(${ifcStr(gen.breakChoice)}),$)`));
    }
    props.push(addLine(ctx, `_opscal_from_${cal.id}`,
      `IFCPROPERTYSINGLEVALUE('GeneratedFromYear',$,IFCINTEGER(${gen.generatedFromYear}),$)`));
    props.push(addLine(ctx, `_opscal_to_${cal.id}`,
      `IFCPROPERTYSINGLEVALUE('GeneratedToYear',$,IFCINTEGER(${gen.generatedToYear}),$)`));
  }
  if (cal.libraryOrigin) {
    props.push(addLine(ctx, `_opscal_lo_${cal.id}`,
      `IFCPROPERTYSINGLEVALUE('LibraryOrigin',$,IFCTEXT(${ifcStr(JSON.stringify(cal.libraryOrigin))}),$)`));
  }
```

(De bestaande `setId`/`rel`-regels daaronder blijven ongewijzigd.)

- [ ] **Step 4: Lees companyId/companyName terug (reader)**

In `src/services/ifc/ifcReader.ts`, binnen het `PSET.ProjectSettings`-blok (regel ~628), voeg twee `else if`-takken toe ná de `ModifiedAt`-tak:

```ts
        } else if (name === 'CompanyId') {
          if (typeof v === 'string' && v) project.companyId = v;
        } else if (name === 'CompanyName') {
          if (typeof v === 'string' && v) project.companyName = v;
        }
```

- [ ] **Step 5: Lees libraryOrigin terug op resources**

Zoek in `src/services/ifc/ifcReader.ts` de functie die het `OPS_Resource`-pset terugleest (de per-property-lus over `props` op de resource `res`, ifcReader.ts:770-797). Voeg in die lus een tak toe die `LibraryOrigin` parseert:

```ts
        } else if (name === 'LibraryOrigin' && typeof value === 'string' && value) {
          try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed.companyId === 'string' && typeof parsed.libraryItemId === 'string'
                && typeof parsed.poolVersion === 'number') {
              res.libraryOrigin = parsed;
            }
          } catch { /* corrupte JSON: negeren */ }
        }
```

(De lus-variabele heet `res` (ifcReader.ts:770-797), `value` komt al uit `parseTypedValue(prop.args[2] || '')`; de tak hangt bij de andere `name === '...'`-vergelijkingen.)

- [ ] **Step 6: Lees libraryOrigin terug op kalenders**

De bestaande `generation`-reader (`extractCalendarGeneration`, ifcReader.ts:845) deugt hier NIET voor: die functie heeft geen kalenderobject in scope en `continue`t bij een onvolledige generation (regel 877), waardoor een gepromoveerde kalender met alléén een `LibraryOrigin` (geen generation) verloren zou gaan. Schrijf daarom een eigen, LOSSTAANDE helper die dezelfde `OPS_Calendar`-pset opzoekt (zelfde rel-lus-patroon als `extractCalendarGeneration`) maar uitsluitend de `LibraryOrigin`-property parseert — volledig los van de generation-volledigheidsguard. Voeg 'm toe naast `extractCalendarGeneration`:

```ts
/**
 * Fase B1 (§6) — `LibraryOrigin`-herkomststempel teruglezen uit het `OPS_Calendar`-pset (spiegel van
 * de writer, die 'm naast de generation-props schrijft). BEWUST losstaand van
 * `extractCalendarGeneration`: die `continue`t bij een onvolledige generation, waardoor een kalender
 * met ALLEEN een LibraryOrigin (gepromoveerd, niet gegenereerd) er verloren zou gaan. Geen/corrupte
 * property ⇒ `undefined`.
 */
function extractCalendarLibraryOrigin(
  calStepId: string,
  entities: StepEntity[],
  entityMap: Map<string, StepEntity>,
): LibraryOrigin | undefined {
  for (const rel of entities) {
    if (rel.type !== 'IFCRELDEFINESBYPROPERTIES') continue;
    const objectRefs = parseRefs(rel.args[4] || '');
    if (!objectRefs.includes(calStepId)) continue;
    const pset = entityMap.get(parseRef(rel.args[5] || '') || '');
    if (!pset || pset.type !== 'IFCPROPERTYSET' || stripQuotes(pset.args[2] || '') !== PSET.Calendar) continue;

    const props = parseRefs(pset.args[4] || '')
      .map(r => entityMap.get(r))
      .filter((p): p is StepEntity => !!p && p.type === 'IFCPROPERTYSINGLEVALUE');

    for (const prop of props) {
      if (stripQuotes(prop.args[0] || '') !== 'LibraryOrigin') continue;
      const value = parseTypedValue(prop.args[2] || '');
      if (typeof value !== 'string' || !value) continue;
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed.companyId === 'string' && typeof parsed.libraryItemId === 'string'
            && typeof parsed.poolVersion === 'number') {
          return parsed as LibraryOrigin;
        }
      } catch { /* corrupte JSON: negeren */ }
    }
  }
  return undefined;
}
```

Roep 'm aan in `buildCalendarFromEntity` direct naast regel 983 (waar `calendar.generation = extractCalendarGeneration(cal.id, entities, entityMap);` staat) — de variabele heet `calendar`, NIET `targetCalendar`:

```ts
  calendar.libraryOrigin = extractCalendarLibraryOrigin(cal.id, entities, entityMap);
```

(Zorg dat `LibraryOrigin` bovenaan `ifcReader.ts` geïmporteerd is: `import type { LibraryOrigin } from '@/types/library';`. Doordat de helper losstaat van de generation-guard wordt de herkomst óók teruggezet wanneer `generation` afwezig is.)

- [ ] **Step 7: Breid de round-trip-fixture uit (compile-afdwinging dwingt dit sowieso)**

In `tests/planning/check-ifc-roundtrip.ts`:

(a) De project-fixture is `satisfies Required<Project>` (of vergelijkbaar). Voeg `companyId`/`companyName` toe aan het project-fixture-object, bijv.:

```ts
  companyId: 'c-fixture',
  companyName: 'Fixture Bouw BV',
```

(b) De kalender-fixtures zijn `satisfies Omit<Required<WorkCalendar>, 'workTime'>` — voeg `libraryOrigin` toe. Voor `projCal`:

```ts
  libraryOrigin: { companyId: 'c-fixture', libraryItemId: 'lib-projcal', poolVersion: 4 },
```

en pas de `_CALENDAR_FIELD_WITNESS` (`satisfies Required<WorkCalendar>`) aan met een `libraryOrigin`.

(c) De resource-fixture(s) `satisfies Required<Resource>` — voeg `libraryOrigin` toe aan minstens één resource-fixture:

```ts
  libraryOrigin: { companyId: 'c-fixture', libraryItemId: 'lib-res1', poolVersion: 4 },
```

(d) Voeg de bijbehorende assert-regels toe in het vergelijkingsdeel (naar het bestaande stramien), bijv.:

```ts
assert(rt.project.companyId === 'c-fixture', 'project.companyId round-trip');
assert(rt.project.companyName === 'Fixture Bouw BV', 'project.companyName round-trip');
```

en voor resource/kalender-libraryOrigin, vergelijk op de genormaliseerde (natuurlijke-sleutel) manier die de fixture al gebruikt. Neem `libraryOrigin` óók op in de KNOWN_GAPS-uitsluitingslijst als de bestaande diff die als "onbekend veld" zou markeren — controleer of de generieke diepe vergelijking `libraryOrigin` al meepakt; zo ja, geen KNOWN_GAP nodig.

- [ ] **Step 8: Draai de round-trip-suite — verwacht ROOD-dan-GROEN**

Draai eerst zonder de writer/reader-wijzigingen om te zien dat de fixture faalt (bewijs dat de test iets afdwingt), daarna met de wijzigingen erin. In de praktijk (writer/reader al aangepast in stappen 1-6):

Run: `node_modules/.bin/tsc --noEmit -p tests/planning/tsconfig.roundtrip.json`
Expected eerst (vóór stap 7-fixture-uitbreiding): FAIL — `companyId`/`libraryOrigin` ontbreekt in `Required<...>`-fixtures. Ná stap 7: PASS.

Run: `node_modules/.bin/esbuild tests/planning/check-ifc-roundtrip.ts --bundle --platform=node --format=esm --alias:@=src --define:import.meta.env.DEV=false --define:import.meta.env.PROD=true --define:import.meta.env.MODE='"production"' --define:__OPS_DEV_INSTANCE__='"test"' --outfile=tests/planning/.ifc-roundtrip-check.mjs && node tests/planning/.ifc-roundtrip-check.mjs`
Expected: geen `XX`-regels; exitcode 0.

- [ ] **Step 9: Volledige planning-suite groen (regressie)**

Run: `bash tests/planning/run.sh; echo "exit=$?"`
Expected: `exit=0` en geen `^XX`-regels (`bash tests/planning/run.sh 2>&1 | grep '^   XX'` moet leeg zijn).

- [ ] **Step 10: Verifieer build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/services/ifc/ifcWriter.ts src/services/ifc/ifcReader.ts tests/planning/check-ifc-roundtrip.ts
git commit -m "$(cat <<'EOF'
feat(library): projectbinding + herkomststempels round-trippen door het project-IFC

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Library-slice — bedrijven-CRUD + standaardbedrijf + init

**Files:**
- Create: `src/state/slices/librarySlice.ts`
- Modify: `src/state/appStore.ts`
- Create: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Schrijf de slice (bedrijven-deel)**

Create `src/state/slices/librarySlice.ts`:

```ts
import type { AppSlice } from './types';
import type { Company, CompanyPool, CompanyLibrary } from '@/types/library';
import { createDefaultLibrary, createEmptyPool, DEFAULT_COMPANY_ID } from '@/types/library';
import { generateId } from '@/utils/id';
import { loadLibrary, saveLibrary } from '@/services/library';

/**
 * App-globale bedrijfsbibliotheek (spec B1). NIET per-document (niet in DOCUMENT_FIELDS) — pools zijn
 * bedrijfsdata, gedeeld over alle documenten, net als `installedExtensions`. Persistentie loopt
 * ná elke mutatie via `saveLibrary` (fire-and-forget; de store is de bron van waarheid in-memory).
 */
export interface LibrarySlice {
  companies: Company[];
  defaultCompanyId: string;
  pools: Record<string, CompanyPool>;
  /** True zodra `initLibrary()` de opgeslagen bibliotheek heeft geladen (voorkomt vroege save). */
  libraryLoaded: boolean;

  initLibrary: () => Promise<void>;
  addCompany: (name: string) => string;
  renameCompany: (id: string, name: string) => void;
  removeCompany: (id: string) => void;
  setDefaultCompany: (id: string) => void;
}

/** Serialiseer de huidige bibliotheek-state en persisteer 'm (fire-and-forget). */
function persist(get: () => { companies: Company[]; defaultCompanyId: string; pools: Record<string, CompanyPool> }): void {
  const s = get();
  const lib: CompanyLibrary = { companies: s.companies, defaultCompanyId: s.defaultCompanyId, pools: s.pools };
  void saveLibrary(lib);
}

export const createLibrarySlice: AppSlice<LibrarySlice> = (set, get) => ({
  companies: createDefaultLibrary().companies,
  defaultCompanyId: DEFAULT_COMPANY_ID,
  pools: createDefaultLibrary().pools,
  libraryLoaded: false,

  initLibrary: async () => {
    const lib = await loadLibrary();
    set((s) => {
      s.companies = lib.companies.length > 0 ? lib.companies : createDefaultLibrary().companies;
      s.defaultCompanyId = lib.companies.some(c => c.id === lib.defaultCompanyId)
        ? lib.defaultCompanyId
        : s.companies[0].id;
      s.pools = lib.pools;
      // Elk bedrijf moet een pool hebben (verse bedrijven / gemigreerde data).
      for (const c of s.companies) {
        if (!s.pools[c.id]) s.pools[c.id] = createEmptyPool(c);
      }
      s.libraryLoaded = true;
    });
  },

  addCompany: (name) => {
    const id = generateId('company');
    const company: Company = { id, name: name.trim() || 'Nieuw bedrijf' };
    set((s) => {
      s.companies.push(company);
      s.pools[id] = createEmptyPool(company);
    });
    persist(get);
    return id;
  },

  renameCompany: (id, name) => {
    set((s) => {
      const c = s.companies.find(c => c.id === id);
      if (!c) return;
      c.name = name.trim() || c.name;
      // Gedenormaliseerde companyName in de pool meelopen.
      if (s.pools[id]) s.pools[id].companyName = c.name;
    });
    persist(get);
  },

  removeCompany: (id) => {
    set((s) => {
      // Er moet altijd minstens één bedrijf blijven (spec §2). Laatste verwijderen ⇒ no-op.
      if (s.companies.length <= 1) return;
      s.companies = s.companies.filter(c => c.id !== id);
      delete s.pools[id];
      if (s.defaultCompanyId === id) s.defaultCompanyId = s.companies[0].id;
    });
    persist(get);
  },

  setDefaultCompany: (id) => {
    set((s) => {
      if (s.companies.some(c => c.id === id)) s.defaultCompanyId = id;
    });
    persist(get);
  },
});
```

- [ ] **Step 2: Voeg de slice toe aan de compositie-root**

In `src/state/appStore.ts`:

(a) import bovenaan:

```ts
import { createLibrarySlice, type LibrarySlice } from './slices/librarySlice';
```

(b) voeg `LibrarySlice` toe aan de `AppState`-intersectie:

```ts
  StructureSlice &
  BaselineSlice &
  LibrarySlice;
```

(c) spreid de slice-creator uit in de `immer(...)`-body:

```ts
    ...createBaselineSlice(...a),
    ...createLibrarySlice(...a),
```

- [ ] **Step 3: Schrijf de headless store-batterij (bedrijven-deel eerst)**

Create `tests/library/check-library-slice.ts`:

```ts
// Headless store-batterij voor de bedrijfsbibliotheek (spec B1). Draait de ECHTE Zustand-store op
// Node (patroon tests/planning/check-move-assignment.ts). Persistentie (saveLibrary) valt in Node
// stil terug (geen IndexedDB/Tauri) — we asserten alleen de in-memory state. Exitcode = poort.
import { useAppStore } from '@/state/appStore';

declare const process: { exit(code: number): never };

let checks = 0; let fails = 0;
function assert(cond: boolean, msg: string): void {
  checks++;
  if (!cond) { fails++; console.log(`   XX ${msg}`); }
}

const store = useAppStore.getState();

// --- Bedrijven-CRUD + standaardbedrijf ---
{
  assert(store.companies.length === 1, 'start: één standaardbedrijf');
  assert(store.defaultCompanyId === store.companies[0].id, 'start: default = standaardbedrijf');

  const id2 = store.addCompany('Onderaannemer BV');
  assert(useAppStore.getState().companies.length === 2, 'addCompany voegt bedrijf toe');
  assert(!!useAppStore.getState().pools[id2], 'addCompany maakt een lege pool');

  store.setDefaultCompany(id2);
  assert(useAppStore.getState().defaultCompanyId === id2, 'setDefaultCompany');

  store.renameCompany(id2, 'Onderaannemer 2 BV');
  assert(useAppStore.getState().companies.find(c => c.id === id2)?.name === 'Onderaannemer 2 BV', 'renameCompany');
  assert(useAppStore.getState().pools[id2].companyName === 'Onderaannemer 2 BV', 'renameCompany synct pool.companyName');

  store.removeCompany(id2);
  assert(useAppStore.getState().companies.length === 1, 'removeCompany');
  assert(useAppStore.getState().defaultCompanyId === useAppStore.getState().companies[0].id, 'removeCompany: default valt terug');

  // Laatste bedrijf niet verwijderbaar.
  const lastId = useAppStore.getState().companies[0].id;
  store.removeCompany(lastId);
  assert(useAppStore.getState().companies.length === 1, 'removeCompany: laatste bedrijf blijft');
}

console.log(`library-slice: ${checks - fails}/${checks} groen`);
process.exit(fails > 0 ? 1 : 0);
```

- [ ] **Step 4: Draai de slice-batterij — verwacht GROEN**

Run: `node_modules/.bin/esbuild tests/library/check-library-slice.ts --bundle --platform=node --format=esm --alias:@=src --define:import.meta.env.DEV=false --define:import.meta.env.PROD=true --define:import.meta.env.MODE='"production"' --define:__OPS_DEV_INSTANCE__='"test"' --outfile=tests/library/.check-library-slice.mjs && node tests/library/.check-library-slice.mjs`
Expected: `library-slice: 10/10 groen`, exitcode 0.

- [ ] **Step 5: Verifieer build + volledige library-suite**

Run: `npm run build && bash tests/library/run.sh; echo "exit=$?"`
Expected: build PASS; `exit=0`, geen `XX`-regels.

- [ ] **Step 6: Commit**

```bash
git add src/state/slices/librarySlice.ts src/state/appStore.ts tests/library/check-library-slice.ts
git commit -m "$(cat <<'EOF'
feat(library): store-slice met bedrijven-CRUD, standaardbedrijf en init

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Promoveren naar pool + pool-inhoud bewerken

**Files:**
- Modify: `src/state/slices/librarySlice.ts`
- Modify: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Breid de slice-interface + acties uit**

In `src/state/slices/librarySlice.ts`, voeg aan `interface LibrarySlice` toe (ná `setDefaultCompany`):

```ts
  /** Promoveer een projectkalender naar de pool van een bedrijf (spiegel van de bestaande
   *  calendar-`promote`; spec §3). Voegt een POOL-kopie toe met een verse pool-id en bumpt de pool.
   *  Retourneert de nieuwe pool-item-id. */
  promoteCalendarToPool: (companyId: string, calendar: import('@/types/calendar').WorkCalendar) => string;
  promoteResourceToPool: (companyId: string, resource: import('@/types/resource').Resource) => string;
  /** Bewerk pool-inhoud rechtstreeks (Backstage). Elke wijziging bumpt de pool. */
  updatePoolCalendar: (companyId: string, calendarId: string, updates: Partial<import('@/types/calendar').WorkCalendar>) => void;
  updatePoolResource: (companyId: string, resourceId: string, updates: Partial<import('@/types/resource').Resource>) => void;
  removePoolCalendar: (companyId: string, calendarId: string) => void;
  removePoolResource: (companyId: string, resourceId: string) => void;
```

Voeg de implementaties toe (binnen de `createLibrarySlice`-return, ná `setDefaultCompany`). Importeer bovenaan `bumpPool`:

```ts
import { bumpPool } from '@/services/library';
```

```ts
  promoteCalendarToPool: (companyId, calendar) => {
    const id = generateId('cal');
    set((s) => {
      const pool = s.pools[companyId];
      if (!pool) return;
      // Verse pool-identiteit; strip een eventuele bestaande herkomst (dit wordt zelf een origineel).
      const { libraryOrigin: _drop, ...rest } = calendar;
      pool.calendars.push({ ...structuredClone(rest), id });
      s.pools[companyId] = bumpPool(pool);
    });
    persist(get);
    return id;
  },

  promoteResourceToPool: (companyId, resource) => {
    const id = generateId('res');
    set((s) => {
      const pool = s.pools[companyId];
      if (!pool) return;
      const { libraryOrigin: _drop, parentId: _p, ...rest } = resource;
      // Een gepromoveerde resource verwijst niet naar een project-lokale kalender-id.
      pool.resources.push({ ...structuredClone(rest), id, calendarId: undefined });
      s.pools[companyId] = bumpPool(pool);
    });
    persist(get);
    return id;
  },

  updatePoolCalendar: (companyId, calendarId, updates) => {
    set((s) => {
      const pool = s.pools[companyId];
      const idx = pool?.calendars.findIndex(c => c.id === calendarId) ?? -1;
      if (!pool || idx < 0) return;
      Object.assign(pool.calendars[idx], updates);
      s.pools[companyId] = bumpPool(pool);
    });
    persist(get);
  },

  updatePoolResource: (companyId, resourceId, updates) => {
    set((s) => {
      const pool = s.pools[companyId];
      const idx = pool?.resources.findIndex(r => r.id === resourceId) ?? -1;
      if (!pool || idx < 0) return;
      Object.assign(pool.resources[idx], updates);
      s.pools[companyId] = bumpPool(pool);
    });
    persist(get);
  },

  removePoolCalendar: (companyId, calendarId) => {
    set((s) => {
      const pool = s.pools[companyId];
      if (!pool) return;
      pool.calendars = pool.calendars.filter(c => c.id !== calendarId);
      s.pools[companyId] = bumpPool(pool);
    });
    persist(get);
  },

  removePoolResource: (companyId, resourceId) => {
    set((s) => {
      const pool = s.pools[companyId];
      if (!pool) return;
      pool.resources = pool.resources.filter(r => r.id !== resourceId);
      s.pools[companyId] = bumpPool(pool);
    });
    persist(get);
  },
```

- [ ] **Step 2: Breid de slice-batterij uit**

In `tests/library/check-library-slice.ts`, voeg vóór de `console.log`-slotregel een blok toe:

```ts
// --- Promoveren + pool-inhoud bewerken ---
{
  const s = useAppStore.getState();
  const cid = s.defaultCompanyId;
  const v0 = s.pools[cid].poolVersion;

  const calId = s.promoteCalendarToPool(cid, {
    id: 'proj-cal', name: 'Ploeg A', description: '', workDays: [1, 2, 3, 4, 5],
    workStartHour: 7, workEndHour: 15, hoursPerDay: 8, holidays: [],
  });
  let pool = useAppStore.getState().pools[cid];
  assert(pool.calendars.some(c => c.id === calId), 'promoteCalendarToPool voegt kalender toe');
  assert(pool.calendars.find(c => c.id === calId)?.libraryOrigin === undefined, 'gepromoveerde kalender heeft geen herkomst (is zelf origineel)');
  assert(pool.poolVersion === v0 + 1, 'promoteCalendarToPool bumpt de pool');

  const resId = s.promoteResourceToPool(cid, {
    id: 'proj-res', name: 'Metselaar', type: 'LABOR', description: '', maxUnits: 3, calendarId: 'proj-cal',
  });
  pool = useAppStore.getState().pools[cid];
  assert(pool.resources.find(r => r.id === resId)?.calendarId === undefined, 'gepromoveerde resource verliest project-lokale calendarId');
  assert(pool.poolVersion === v0 + 2, 'promoteResourceToPool bumpt opnieuw');

  s.updatePoolResource(cid, resId, { maxUnits: 5 });
  pool = useAppStore.getState().pools[cid];
  assert(pool.resources.find(r => r.id === resId)?.maxUnits === 5, 'updatePoolResource');
  assert(pool.poolVersion === v0 + 3, 'updatePoolResource bumpt');

  s.removePoolResource(cid, resId);
  s.removePoolCalendar(cid, calId);
  pool = useAppStore.getState().pools[cid];
  assert(!pool.resources.some(r => r.id === resId) && !pool.calendars.some(c => c.id === calId), 'removePool* verwijdert items');
  assert(pool.poolVersion === v0 + 5, 'removePool* bumpt tweemaal');
}
```

- [ ] **Step 3: Draai de batterij — verwacht GROEN**

Run: `node_modules/.bin/esbuild tests/library/check-library-slice.ts --bundle --platform=node --format=esm --alias:@=src --define:import.meta.env.DEV=false --define:import.meta.env.PROD=true --define:import.meta.env.MODE='"production"' --define:__OPS_DEV_INSTANCE__='"test"' --outfile=tests/library/.check-library-slice.mjs && node tests/library/.check-library-slice.mjs`
Expected: alle asserts groen, exitcode 0.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/slices/librarySlice.ts tests/library/check-library-slice.ts
git commit -m "$(cat <<'EOF'
feat(library): promoveren naar pool + pool-inhoud bewerken (bumpt poolVersion)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Toevoegen uit bibliotheek (kopie + meereizende kalender + dedup)

**Files:**
- Modify: `src/state/slices/librarySlice.ts`
- Modify: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Breid de slice-interface uit**

In `interface LibrarySlice`, voeg toe:

```ts
  /** Bind het ACTIEVE project aan een bedrijf (spec §6). Zet project.companyId + companyName. */
  bindProjectToCompany: (companyId: string) => void;
  /**
   * Voeg een bibliotheek-kalender toe aan het ACTIEVE project (spec §3): kopieer met stempel, dedup
   * op herkomst. Retourneert `{ added, calendarId }` — `added: false` ⇒ item was er al ("al in project").
   */
  addLibraryCalendarToProject: (companyId: string, poolCalendarId: string) => { added: boolean; calendarId: string | null };
  /**
   * Voeg een bibliotheek-resource toe aan het ACTIEVE project (spec §3): kopieer met stempel, laat
   * de eigen kalender meereizen (met dedup), dedup op herkomst. Bindt het project aan het bedrijf als
   * het nog ongebonden was.
   */
  addLibraryResourceToProject: (companyId: string, poolResourceId: string) => { added: boolean; resourceId: string | null };
```

- [ ] **Step 2: Implementeer de acties**

Importeer bovenaan de copy-helpers plus de undo-transactiehelpers (E-3 maakt de acties undoable, spiegel `resourceSlice`):

```ts
import { copyCalendarToProject, copyResourceToProject } from '@/services/library';
import { beginUndoable, finishMutation } from '../transaction';
```

Voeg de implementaties toe (E-3: `beginUndoable(s)` als eerste mutatie-statement, `finishMutation(s)` als laatste; hergebruik/no-op-paden keren terug vóór `beginUndoable`, zodat er geen loze undo-stap ontstaat — spiegel `resourceSlice.removeCalendar`):

```ts
  bindProjectToCompany: (companyId) => {
    set((s) => {
      const company = s.companies.find(c => c.id === companyId);
      if (!company) return;
      s.project.companyId = company.id;
      s.project.companyName = company.name;
      s.project.modifiedAt = new Date().toISOString();
      s.isDirty = true;
    });
  },

  addLibraryCalendarToProject: (companyId, poolCalendarId) => {
    let result: { added: boolean; calendarId: string | null } = { added: false, calendarId: null };
    set((s) => {
      const pool = s.pools[companyId];
      if (!pool) return;
      const copy = copyCalendarToProject(pool, poolCalendarId, s.calendars, generateId);
      if (!copy) return;
      if (copy.reused) {
        // Hergebruik = geen mutatie ⇒ vóór beginUndoable terugkeren, geen loze undo-stap.
        result = { added: false, calendarId: copy.calendar.id };
        return;
      }
      beginUndoable(s);
      s.calendars = [...s.calendars, copy.calendar];
      s.isDirty = true;
      result = { added: true, calendarId: copy.calendar.id };
      finishMutation(s);
    });
    // Pure kalender-mutatie → histogram verversen (spiegel resourceSlice.addCalendar:224-225).
    get().recomputeResourceLoad();
    return result;
  },

  addLibraryResourceToProject: (companyId, poolResourceId) => {
    let result: { added: boolean; resourceId: string | null } = { added: false, resourceId: null };
    set((s) => {
      const pool = s.pools[companyId];
      if (!pool) return;
      const copy = copyResourceToProject(pool, poolResourceId, s.resources, s.calendars, generateId);
      if (!copy) return;
      if (copy.reused) {
        // Hergebruik = geen mutatie ⇒ vóór beginUndoable terugkeren, geen loze undo-stap.
        // (Bij reused levert copyResourceToProject nooit een travelingCalendar, dus niets te doen.)
        result = { added: false, resourceId: copy.resource.id };
        return;
      }
      beginUndoable(s);
      // Meereizende kalender toevoegen als hij vers is (dedup gaf `reused: true` ⇒ al aanwezig).
      if (copy.travelingCalendar && !copy.travelingCalendar.reused) {
        s.calendars = [...s.calendars, copy.travelingCalendar.calendar];
      }
      s.resources = [...s.resources, copy.resource];
      // Project binden aan dit bedrijf als het nog ongebonden was.
      if (!s.project.companyId) {
        const company = s.companies.find(c => c.id === companyId);
        if (company) { s.project.companyId = company.id; s.project.companyName = company.name; }
      }
      s.isDirty = true;
      result = { added: true, resourceId: copy.resource.id };
      finishMutation(s);
    });
    // Pure resource-mutatie → histogram + rijen verversen (spiegel resourceSlice.addResource:61-64).
    get().recomputeResourceLoad();
    get().recomputeViewRows();
    return result;
  },
```

- [ ] **Step 3: Breid de slice-batterij uit**

Voeg vóór de slot-`console.log` toe:

```ts
// --- Toevoegen uit bibliotheek (meereizende kalender + dedup + binding) ---
{
  const s = useAppStore.getState();
  const cid = s.defaultCompanyId;
  // Seed de pool met een kalender + resource-die-ernaar-verwijst.
  const poolCalId = s.promoteCalendarToPool(cid, {
    id: 'seed-cal', name: 'Nachtploeg', description: '', workDays: [1, 2, 3, 4, 5],
    workStartHour: 22, workEndHour: 6, hoursPerDay: 8, holidays: [],
  });
  // Resource met eigen kalender: zet zijn calendarId op de POOL-kalender-id (promote strip het niet
  // want we bouwen de pool-resource direct).
  const poolResId = s.promoteResourceToPool(cid, { id: 'seed-res', name: 'Wachter', type: 'LABOR', description: '', maxUnits: 1 });
  useAppStore.getState().updatePoolResource(cid, poolResId, { calendarId: poolCalId });

  const beforeCals = useAppStore.getState().calendars.length;
  const undoBefore = useAppStore.getState().undoStack.length;
  const r1 = useAppStore.getState().addLibraryResourceToProject(cid, poolResId);
  assert(r1.added === true, 'addLibraryResource: resource toegevoegd');
  let st = useAppStore.getState();
  assert(st.resources.some(r => r.id === r1.resourceId), 'addLibraryResource: resource in project');
  assert(st.calendars.length === beforeCals + 1, 'addLibraryResource: kalender reisde mee');
  assert(st.undoStack.length === undoBefore + 1, 'addLibraryResource: undo-snapshot gepusht (E-3)');
  const added = st.resources.find(r => r.id === r1.resourceId)!;
  assert(!!st.calendars.find(c => c.id === added.calendarId)?.libraryOrigin, 'addLibraryResource: meegereisde kalender heeft herkomst');
  assert(st.project.companyId === cid, 'addLibraryResource: project gebonden aan bedrijf');

  // Nogmaals toevoegen ⇒ dedup, geen duplicaat, GEEN loze undo-stap (E-3).
  const undoAfterAdd = useAppStore.getState().undoStack.length;
  const r2 = useAppStore.getState().addLibraryResourceToProject(cid, poolResId);
  assert(r2.added === false && r2.resourceId === r1.resourceId, 'addLibraryResource: dedup ("al in project")');
  assert(useAppStore.getState().resources.filter(r => r.libraryOrigin?.libraryItemId === poolResId).length === 1, 'addLibraryResource: geen duplicaat');
  assert(useAppStore.getState().calendars.length === beforeCals + 1, 'addLibraryResource: kalender niet gedupliceerd bij tweede keer');
  assert(useAppStore.getState().undoStack.length === undoAfterAdd, 'addLibraryResource: dedup pusht geen undo-snapshot (E-3)');

  // Losse bibliotheek-kalender toevoegen is óók undoable (E-3).
  const poolCalId2 = useAppStore.getState().promoteCalendarToPool(cid, {
    id: 'seed-cal2', name: 'Weekendploeg', description: '', workDays: [6, 7],
    workStartHour: 8, workEndHour: 16, hoursPerDay: 8, holidays: [],
  });
  const undoBeforeCal = useAppStore.getState().undoStack.length;
  const c1 = useAppStore.getState().addLibraryCalendarToProject(cid, poolCalId2);
  assert(c1.added === true, 'addLibraryCalendar: kalender toegevoegd');
  assert(useAppStore.getState().undoStack.length === undoBeforeCal + 1, 'addLibraryCalendar: undo-snapshot gepusht (E-3)');
  const undoAfterCal = useAppStore.getState().undoStack.length;
  const c2 = useAppStore.getState().addLibraryCalendarToProject(cid, poolCalId2);
  assert(c2.added === false, 'addLibraryCalendar: dedup ("al in project")');
  assert(useAppStore.getState().undoStack.length === undoAfterCal, 'addLibraryCalendar: dedup pusht geen undo-snapshot (E-3)');
}
```

- [ ] **Step 4: Draai de batterij — verwacht GROEN**

Run: `node_modules/.bin/esbuild tests/library/check-library-slice.ts --bundle --platform=node --format=esm --alias:@=src --define:import.meta.env.DEV=false --define:import.meta.env.PROD=true --define:import.meta.env.MODE='"production"' --define:__OPS_DEV_INSTANCE__='"test"' --outfile=tests/library/.check-library-slice.mjs && node tests/library/.check-library-slice.mjs`
Expected: alle asserts groen, exitcode 0.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/state/slices/librarySlice.ts tests/library/check-library-slice.ts
git commit -m "$(cat <<'EOF'
feat(library): toevoegen uit bibliotheek met meereizende kalender, dedup en binding

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Bijwerken vanuit bibliotheek (diff + "bestaat niet meer")

**Files:**
- Modify: `src/state/slices/librarySlice.ts`
- Modify: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Breid de slice-interface uit**

In `interface LibrarySlice`:

```ts
  /** Bereken de diff van een projectkalender t.o.v. zijn bibliotheekorigineel (spec §3). */
  diffProjectCalendar: (calendarId: string) => import('@/services/library').ItemDiff | null;
  diffProjectResource: (resourceId: string) => import('@/services/library').ItemDiff | null;
  /** Werk één projectkalender bij naar de bibliotheekwaarden (spec §3). No-op als geen herkomst/pool. */
  updateProjectCalendarFromLibrary: (calendarId: string) => void;
  updateProjectResourceFromLibrary: (resourceId: string) => void;
```

- [ ] **Step 2: Implementeer**

Importeer bovenaan (de undo-transactiehelpers zijn al in Taak 8 geïmporteerd; hier komt `syncProjectCalendar` erbij voor de kalender-cache, spiegel `resourceSlice.updateCalendar:234`):

```ts
import { diffCalendarVsPool, diffResourceVsPool, applyCalendarUpdate, applyResourceUpdate } from '@/services/library';
import { syncProjectCalendar } from '../syncProjectCalendar';
```

```ts
  diffProjectCalendar: (calendarId) => {
    const s = get();
    const cal = s.calendars.find(c => c.id === calendarId);
    const companyId = cal?.libraryOrigin?.companyId;
    const pool = companyId ? s.pools[companyId] : undefined;
    if (!cal || !cal.libraryOrigin || !pool) return null;
    return diffCalendarVsPool(cal, pool);
  },

  diffProjectResource: (resourceId) => {
    const s = get();
    const res = s.resources.find(r => r.id === resourceId);
    const companyId = res?.libraryOrigin?.companyId;
    const pool = companyId ? s.pools[companyId] : undefined;
    if (!res || !res.libraryOrigin || !pool) return null;
    return diffResourceVsPool(res, pool);
  },

  updateProjectCalendarFromLibrary: (calendarId) => {
    set((s) => {
      const idx = s.calendars.findIndex(c => c.id === calendarId);
      const cal = idx >= 0 ? s.calendars[idx] : undefined;
      const companyId = cal?.libraryOrigin?.companyId;
      const pool = companyId ? s.pools[companyId] : undefined;
      if (!cal || !cal.libraryOrigin || !pool) return;
      // Alleen bijwerken als het origineel nog bestaat (diff !== removed) — vóór beginUndoable, geen
      // loze undo-stap bij een no-op (E-3).
      if (diffCalendarVsPool(cal, pool).status === 'removed') return;
      beginUndoable(s);
      s.calendars[idx] = applyCalendarUpdate(cal, pool);
      syncProjectCalendar(s); // gedenormaliseerde projectkalender-cache in sync (E-2, §9.1).
      finishMutation(s, { stale: true }); // kalenderwijziging raakt datums.
    });
    get().recomputeResourceLoad();
  },

  updateProjectResourceFromLibrary: (resourceId) => {
    set((s) => {
      const idx = s.resources.findIndex(r => r.id === resourceId);
      const res = idx >= 0 ? s.resources[idx] : undefined;
      const companyId = res?.libraryOrigin?.companyId;
      const pool = companyId ? s.pools[companyId] : undefined;
      if (!res || !res.libraryOrigin || !pool) return;
      // No-op vóór beginUndoable (E-3): verwijderd origineel ⇒ geen undo-stap.
      if (diffResourceVsPool(res, pool).status === 'removed') return;
      beginUndoable(s);
      s.resources[idx] = applyResourceUpdate(res, pool);
      finishMutation(s);
    });
    get().recomputeResourceLoad();
    get().recomputeViewRows(); // resource-naam/toewijzing raakt kolom/groep/filter (E-2, §4.3).
  },
```

- [ ] **Step 3: Breid de batterij uit**

Voeg vóór de slot-`console.log` toe:

```ts
// --- Bijwerken vanuit bibliotheek (diff + toepassen + "bestaat niet meer") ---
{
  const s = useAppStore.getState();
  const cid = s.defaultCompanyId;
  const poolResId = s.promoteResourceToPool(cid, { id: 'upd-res', name: 'Elektricien', type: 'LABOR', description: '', maxUnits: 1 });
  const added = useAppStore.getState().addLibraryResourceToProject(cid, poolResId);
  const projResId = added.resourceId!;

  assert(useAppStore.getState().diffProjectResource(projResId)?.status === 'up-to-date', 'diffProjectResource: vers = up-to-date');

  // Wijzig de pool ⇒ diff wordt "changed".
  useAppStore.getState().updatePoolResource(cid, poolResId, { maxUnits: 4 });
  const d = useAppStore.getState().diffProjectResource(projResId);
  assert(d?.status === 'changed', 'diffProjectResource: pool gewijzigd ⇒ changed');

  const undoBeforeUpd = useAppStore.getState().undoStack.length;
  useAppStore.getState().updateProjectResourceFromLibrary(projResId);
  const updated = useAppStore.getState().resources.find(r => r.id === projResId)!;
  assert(updated.maxUnits === 4, 'updateProjectResourceFromLibrary: waarde overgenomen');
  assert(updated.id === projResId, 'updateProjectResourceFromLibrary: project-id behouden');
  assert(useAppStore.getState().undoStack.length === undoBeforeUpd + 1, 'updateProjectResourceFromLibrary: undo-snapshot gepusht (E-3)');
  assert(useAppStore.getState().diffProjectResource(projResId)?.status === 'up-to-date', 'na bijwerken weer up-to-date');

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

- [ ] **Step 4: Draai — verwacht GROEN**

Run: `node_modules/.bin/esbuild tests/library/check-library-slice.ts --bundle --platform=node --format=esm --alias:@=src --define:import.meta.env.DEV=false --define:import.meta.env.PROD=true --define:import.meta.env.MODE='"production"' --define:__OPS_DEV_INSTANCE__='"test"' --outfile=tests/library/.check-library-slice.mjs && node tests/library/.check-library-slice.mjs`
Expected: alle asserts groen, exitcode 0.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/state/slices/librarySlice.ts tests/library/check-library-slice.ts
git commit -m "$(cat <<'EOF'
feat(library): per-item bijwerken vanuit bibliotheek met diff en verwijderd-origineel-detectie

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Pool export/import + demping

**Files:**
- Modify: `src/state/slices/librarySlice.ts`
- Modify: `tests/library/check-library-slice.ts`

- [ ] **Step 1: Breid de slice-interface uit**

In `interface LibrarySlice`:

```ts
  /** Serialiseer de pool van een bedrijf naar een IFC-string (voor export/backup, spec §4). */
  exportPoolIFC: (companyId: string) => string | null;
  /** Vervang de HELE pool van een bedrijf door een geïmporteerde pool ná bevestiging (spec §4).
   *  De demping-waarschuwing zit in de UI (via `isPoolNewer`); deze actie vervangt onvoorwaardelijk. */
  replacePool: (companyId: string, pool: import('@/types/library').CompanyPool) => void;
  /** True als de lokale pool nieuwer is dan een te importeren pool (demping, spec §4). */
  isLocalPoolNewer: (companyId: string, imported: import('@/types/library').CompanyPool) => boolean;
```

- [ ] **Step 2: Implementeer**

Importeer bovenaan:

```ts
import { writePoolIFC, isPoolNewer } from '@/services/library';
```

```ts
  exportPoolIFC: (companyId) => {
    const pool = get().pools[companyId];
    return pool ? writePoolIFC(pool) : null;
  },

  replacePool: (companyId, pool) => {
    set((s) => {
      if (!s.companies.some(c => c.id === companyId)) return;
      // De geïmporteerde pool krijgt het DOEL-companyId (import in een gekozen bedrijf, spec §4).
      const company = s.companies.find(c => c.id === companyId)!;
      s.pools[companyId] = { ...pool, companyId, companyName: company.name };
    });
    persist(get);
  },

  isLocalPoolNewer: (companyId, imported) => {
    return isPoolNewer(get().pools[companyId], imported);
  },
```

- [ ] **Step 3: Breid de batterij uit**

Voeg vóór de slot-`console.log` toe:

```ts
// --- Export/import pool + demping ---
{
  const s = useAppStore.getState();
  const cid = s.defaultCompanyId;
  s.promoteResourceToPool(cid, { id: 'exp-res', name: 'Loodgieter', type: 'LABOR', description: '', maxUnits: 1 });
  const ifc = useAppStore.getState().exportPoolIFC(cid);
  assert(!!ifc && ifc.includes('OPS_Library'), 'exportPoolIFC produceert een pool-bestand');

  const localVersion = useAppStore.getState().pools[cid].poolVersion;
  // Een OUDERE geïmporteerde pool ⇒ demping meldt "lokaal nieuwer".
  const older = { companyId: cid, companyName: 'x', poolVersion: 0, modifiedAt: '2000-01-01T00:00:00.000Z', calendars: [], resources: [] };
  assert(useAppStore.getState().isLocalPoolNewer(cid, older) === true, 'isLocalPoolNewer: oudere import ⇒ true');

  // replacePool vervangt de hele pool.
  const fresh = { companyId: 'x', companyName: 'x', poolVersion: localVersion + 10, modifiedAt: '2030-01-01T00:00:00.000Z', calendars: [], resources: [{ id: 'new-only', name: 'X', type: 'LABOR' as const, description: '', maxUnits: 1 }] };
  useAppStore.getState().replacePool(cid, fresh);
  const pool = useAppStore.getState().pools[cid];
  assert(pool.resources.length === 1 && pool.resources[0].id === 'new-only', 'replacePool vervangt de hele pool');
  assert(pool.companyId === cid, 'replacePool herschrijft companyId naar het doelbedrijf');
  assert(useAppStore.getState().isLocalPoolNewer(cid, older) === true, 'na replace: nieuwe pool nog steeds nieuwer dan oude import');
}
```

- [ ] **Step 4: Draai — verwacht GROEN**

Run: `node_modules/.bin/esbuild tests/library/check-library-slice.ts --bundle --platform=node --format=esm --alias:@=src --define:import.meta.env.DEV=false --define:import.meta.env.PROD=true --define:import.meta.env.MODE='"production"' --define:__OPS_DEV_INSTANCE__='"test"' --outfile=tests/library/.check-library-slice.mjs && node tests/library/.check-library-slice.mjs`
Expected: alle asserts groen, exitcode 0.

- [ ] **Step 5: Volledige library-suite + build**

Run: `npm run build && bash tests/library/run.sh; echo "exit=$?"`
Expected: build PASS; `exit=0`, geen `XX`-regels.

- [ ] **Step 6: Commit**

```bash
git add src/state/slices/librarySlice.ts tests/library/check-library-slice.ts
git commit -m "$(cat <<'EOF'
feat(library): pool export/import met demping-check (lokaal-nieuwer)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Backstage-sectie "Bibliotheek"

**Files:**
- Modify: `src/state/slices/types.ts`, `src/components/backstage/Backstage.tsx`
- Create: `src/components/backstage/LibrarySection.tsx`, `src/components/backstage/LibrarySection.css`
- Create: `src/components/dialogs/PoolImportDialog.tsx`
- Modify: `src/state/slices/uiSlice.ts`, `src/App.tsx`, `src/utils/devBridge.ts`

- [ ] **Step 1: Voeg 'library' toe aan BackstageSection**

In `src/state/slices/types.ts`, breid het `BackstageSection`-union uit — de union (slices/types.ts:82-92) eindigt op `'help'`; voeg `'library'` toe tussen `'extensions'` en `'help'`:

```ts
  | 'library'
```

Voeg aan `interface UIState` (ná `showBenchmarkDialog`) de nieuwe dialoog-vlaggen toe:

```ts
  /** session — pool-importdialoog open (met demping-waarschuwing). */
  showPoolImportDialog: boolean;
  /** session — "toevoegen uit bibliotheek"-kiezer open (spec §3). */
  showAddFromLibraryDialog: boolean;
  /** session — "bijwerken vanuit bibliotheek"-diffdialoog open (spec §3). */
  showUpdateFromLibraryDialog: boolean;
```

- [ ] **Step 2: Zet de defaults in uiSlice**

In `src/state/slices/uiSlice.ts`, voeg bij de initiële `ui`-objectdefaults toe (naast de andere `show*: false`-vlaggen):

```ts
    showPoolImportDialog: false,
    showAddFromLibraryDialog: false,
    showUpdateFromLibraryDialog: false,
```

- [ ] **Step 3: Schrijf de Backstage-sectie**

Create `src/components/backstage/LibrarySection.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Plus, Trash2, Star, Download, Upload, ArrowUpFromLine } from 'lucide-react';
import { useAppStore } from '@/state/appStore';
import { saveFileDialog } from '@/services/fileAccess';
import './LibrarySection.css';

/**
 * Backstage → Bibliotheek (spec §3): bedrijven beheren, pool-inhoud tonen/verwijderen, promoveren,
 * export/import. Export is tevens het backupmechanisme (spec §5).
 */
export function LibrarySection() {
  const { t } = useTranslation();
  const companies = useAppStore(s => s.companies);
  const pools = useAppStore(s => s.pools);
  const defaultCompanyId = useAppStore(s => s.defaultCompanyId);
  const addCompany = useAppStore(s => s.addCompany);
  const renameCompany = useAppStore(s => s.renameCompany);
  const removeCompany = useAppStore(s => s.removeCompany);
  const setDefaultCompany = useAppStore(s => s.setDefaultCompany);
  const removePoolCalendar = useAppStore(s => s.removePoolCalendar);
  const removePoolResource = useAppStore(s => s.removePoolResource);
  const exportPoolIFC = useAppStore(s => s.exportPoolIFC);
  const setUI = useAppStore(s => s.setUI);

  const [selectedId, setSelectedId] = useState(defaultCompanyId);
  const selected = companies.find(c => c.id === selectedId) ?? companies[0];
  const pool = pools[selected.id];

  const onExport = async () => {
    const content = exportPoolIFC(selected.id);
    if (!content) return;
    await saveFileDialog(`bibliotheek-${selected.name}.ifc`, content, [{ name: 'IFC', extensions: ['ifc'] }]);
  };

  return (
    <div className="backstage-panel library-section">
      <h2>{t('companyLibrary.title')}</h2>
      <p className="library-intro">{t('companyLibrary.intro')}</p>

      <div className="library-layout">
        <aside className="library-companies">
          <div className="library-companies-head">
            <span>{t('companyLibrary.companies')}</span>
            <button onClick={() => setSelectedId(addCompany(t('companyLibrary.newCompany')))} title={t('companyLibrary.addCompany')}>
              <Plus size={14} />
            </button>
          </div>
          <ul>
            {companies.map(c => (
              <li key={c.id} className={c.id === selected.id ? 'active' : ''} onClick={() => setSelectedId(c.id)}>
                <Building2 size={13} />
                <span>{c.name}</span>
                {c.id === defaultCompanyId && <Star size={12} className="default-star" />}
              </li>
            ))}
          </ul>
        </aside>

        <section className="library-detail">
          <div className="library-detail-head">
            <input
              className="library-name-input"
              value={selected.name}
              onChange={e => renameCompany(selected.id, e.target.value)}
              aria-label={t('companyLibrary.companyName')}
            />
            <div className="library-detail-actions">
              <button onClick={() => setDefaultCompany(selected.id)} disabled={selected.id === defaultCompanyId}>
                <Star size={13} /> {t('companyLibrary.setDefault')}
              </button>
              <button onClick={onExport}><Download size={13} /> {t('companyLibrary.export')}</button>
              <button onClick={() => setUI({ showPoolImportDialog: true })}><Upload size={13} /> {t('companyLibrary.import')}</button>
              <button
                className="danger"
                onClick={() => removeCompany(selected.id)}
                disabled={companies.length <= 1}
                title={companies.length <= 1 ? t('companyLibrary.cannotRemoveLast') : ''}
              >
                <Trash2 size={13} /> {t('companyLibrary.removeCompany')}
              </button>
            </div>
          </div>

          <p className="library-backup-hint">{t('companyLibrary.backupHint')}</p>

          <div className="library-pool">
            <h3>{t('companyLibrary.calendars')} <span className="pool-version">v{pool.poolVersion}</span></h3>
            {pool.calendars.length === 0 && <p className="empty">{t('companyLibrary.noCalendars')}</p>}
            <ul>
              {pool.calendars.map(cal => (
                <li key={cal.id}>
                  <span>{cal.name}</span>
                  <button className="danger-icon" onClick={() => removePoolCalendar(selected.id, cal.id)}><Trash2 size={12} /></button>
                </li>
              ))}
            </ul>

            <h3>{t('companyLibrary.resources')}</h3>
            {pool.resources.length === 0 && <p className="empty">{t('companyLibrary.noResources')}</p>}
            <ul>
              {pool.resources.map(res => (
                <li key={res.id}>
                  <span>{res.name}</span>
                  <button className="danger-icon" onClick={() => removePoolResource(selected.id, res.id)}><Trash2 size={12} /></button>
                </li>
              ))}
            </ul>
          </div>

          <p className="library-promote-hint">
            <ArrowUpFromLine size={13} /> {t('companyLibrary.promoteHint')}
          </p>
        </section>
      </div>
    </div>
  );
}
```

Create `src/components/backstage/LibrarySection.css` met basis-styling (volg `Backstage.css`-conventies):

```css
.library-section .library-layout { display: flex; gap: 16px; }
.library-companies { width: 220px; border-right: 1px solid var(--border); padding-right: 12px; }
.library-companies-head { display: flex; justify-content: space-between; align-items: center; font-weight: 600; margin-bottom: 8px; }
.library-companies ul { list-style: none; padding: 0; margin: 0; }
.library-companies li { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
.library-companies li.active { background: var(--surface-hover); }
.library-companies li .default-star { margin-left: auto; color: var(--accent); }
.library-detail { flex: 1; min-width: 0; }
.library-detail-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 6px; }
.library-name-input { font-size: 1.1em; font-weight: 600; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text); }
.library-detail-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.library-detail-actions button { display: inline-flex; align-items: center; gap: 4px; }
.library-detail-actions .danger { color: var(--danger); }
.library-backup-hint, .library-promote-hint { font-size: 0.85em; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }
.library-pool h3 { display: flex; align-items: center; gap: 8px; margin: 14px 0 6px; }
.library-pool .pool-version { font-size: 0.75em; color: var(--text-secondary); font-weight: 400; }
.library-pool ul { list-style: none; padding: 0; margin: 0; }
.library-pool li { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; }
.library-pool .empty { color: var(--text-secondary); font-style: italic; }
.danger-icon { color: var(--danger); background: transparent; border: none; cursor: pointer; }
```

- [ ] **Step 4: Schrijf de pool-importdialoog (met demping + §8-uitleg)**

Create `src/components/dialogs/PoolImportDialog.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '@/state/appStore';
import { readPoolIFC } from '@/services/library';
import { openFileDialog } from '@/services/fileAccess';
import type { CompanyPool } from '@/types/library';

/**
 * Pool-import (spec §4): kies bestand → toon inhoud + demping-waarschuwing als de lokale pool
 * nieuwer is → vervang de HELE pool ná bevestiging. Legt het sync-probleem (§8.1) expliciet uit.
 */
export function PoolImportDialog() {
  const { t } = useTranslation();
  const open = useAppStore(s => s.ui.showPoolImportDialog);
  const setUI = useAppStore(s => s.setUI);
  const companies = useAppStore(s => s.companies);
  const defaultCompanyId = useAppStore(s => s.defaultCompanyId);
  const isLocalPoolNewer = useAppStore(s => s.isLocalPoolNewer);
  const replacePool = useAppStore(s => s.replacePool);

  const [companyId, setCompanyId] = useState(defaultCompanyId);
  const [imported, setImported] = useState<CompanyPool | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;
  const close = () => { setImported(null); setError(null); setUI({ showPoolImportDialog: false }); };

  const pick = async () => {
    setError(null);
    const res = await openFileDialog([{ name: 'IFC', extensions: ['ifc'] }]);
    if (!res) return;
    try {
      setImported(readPoolIFC(res.content));
    } catch {
      setError(t('companyLibrary.importNotAPool'));
      setImported(null);
    }
  };

  const newer = imported ? isLocalPoolNewer(companyId, imported) : false;

  const confirm = () => {
    if (imported) replacePool(companyId, imported);
    close();
  };

  return (
    <div className="dialog-overlay" onClick={close}>
      <div className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="dialog-head">
          <h2>{t('companyLibrary.importTitle')}</h2>
          <button onClick={close}><X size={16} /></button>
        </div>

        <div className="dialog-body">
          <label>{t('companyLibrary.importInto')}</label>
          <select value={companyId} onChange={e => setCompanyId(e.target.value)}>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <button className="secondary" onClick={pick} style={{ marginTop: 10 }}>{t('companyLibrary.chooseFile')}</button>
          {error && <p className="error">{error}</p>}

          {imported && (
            <div className="import-preview">
              <p>{t('companyLibrary.importPreview', { calendars: imported.calendars.length, resources: imported.resources.length, version: imported.poolVersion })}</p>
              <p className="warning-replace">{t('companyLibrary.importReplaces')}</p>
              {newer && (
                <p className="demping-warning">
                  <AlertTriangle size={16} /> {t('companyLibrary.dempingWarning')}
                </p>
              )}
            </div>
          )}

          <p className="sync-note">{t('companyLibrary.syncNote')}</p>
        </div>

        <div className="dialog-foot">
          <button className="secondary" onClick={close}>{t('cancel')}</button>
          <button className="primary" onClick={confirm} disabled={!imported}>{t('companyLibrary.importConfirm')}</button>
        </div>
      </div>
    </div>
  );
}
```

**Let op:** controleer de exacte signaturen van `openFileDialog`/`saveFileDialog` in `src/services/fileAccess`. Als `openFileDialog` een ander resultaatobject teruggeeft (bijv. `{ content, path }` vs `{ text }`), pas de veldnaam aan. Verifieer met `grep -n "export .*openFileDialog\|export .*saveFileDialog" src/services/fileAccess/*.ts`.

- [ ] **Step 5: Bedraad de sectie + dialoog in de Backstage-navigatie en App**

In `src/components/backstage/Backstage.tsx`:

(a) importeer bovenaan:

```tsx
import { LibrarySection } from './LibrarySection';
import { Building2 } from 'lucide-react';
```

(b) voeg een NavItem toe (ná de extensions-NavItem, regel ~66):

```tsx
        <NavItem icon={<Building2 size={14} />} label={tMenu('backstage.library')} active={section === 'library'} onClick={() => goTo('library')} />
```

(c) voeg de render toe (ná `{section === 'extensions' && <ExtensionsSection />}`):

```tsx
        {section === 'library' && <LibrarySection />}
```

In `src/App.tsx`, mount de importdialoog bij de andere globale dialogen (achter `ui.show*`):

```tsx
import { PoolImportDialog } from '@/components/dialogs/PoolImportDialog';
// ... in de JSX bij de andere dialogen:
<PoolImportDialog />
```

- [ ] **Step 6: Voeg de menu-sleutel toe (nl + en, rest in Taak 14)**

In `src/i18n/locales/nl/menu.json`, voeg binnen `"backstage"` toe:

```json
      "library": "Bibliotheek",
```

In `src/i18n/locales/en/menu.json`:

```json
      "library": "Library",
```

- [ ] **Step 7: Voeg de nl+en common-sleutels toe (voorlopig, volledige set in Taak 14)**

Voeg in `src/i18n/locales/nl/common.json` en `en/common.json` het `companyLibrary`-blok toe — zie Taak 14 voor de volledige sleutelset; voor deze taak zijn minimaal nodig: `title, intro, companies, addCompany, newCompany, companyName, setDefault, export, import, removeCompany, cannotRemoveLast, backupHint, calendars, resources, noCalendars, noResources, promoteHint, importTitle, importInto, chooseFile, importNotAPool, importPreview, importReplaces, dempingWarning, syncNote, importConfirm`. Neem de nl+en-waarden uit de volledige tabel in Taak 14.

- [ ] **Step 8: Zelf-test-haken in devBridge**

In `src/utils/devBridge.ts`, voeg binnen het `window.__OPS__`-object een `library`-tak toe die de belangrijkste acties/state blootlegt (naast de bestaande `extensions.*`):

```ts
    library: {
      state: () => {
        const s = useAppStore.getState();
        return { companies: s.companies.length, defaultCompanyId: s.defaultCompanyId, pools: Object.fromEntries(Object.entries(s.pools).map(([k, v]) => [k, { version: v.poolVersion, cals: v.calendars.length, res: v.resources.length }])) };
      },
      addCompany: (name: string) => useAppStore.getState().addCompany(name),
      addResource: (companyId: string, poolResourceId: string) => useAppStore.getState().addLibraryResourceToProject(companyId, poolResourceId),
    },
```

(Pas het exacte object-literal aan de bestaande structuur in `devBridge.ts` aan.)

- [ ] **Step 9: Verifieer build + draai de dev-build en open de sectie**

Run: `npm run build`
Expected: PASS.

Start de browser-dev-build via de preview en navigeer naar Backstage → Bibliotheek; controleer dat de sectie laadt zonder console-fouten en dat een tweede bedrijf verschijnt na "toevoegen". (Diepere UI-verificatie in Taak 16.)

- [ ] **Step 10: Commit**

```bash
git add src/state/slices/types.ts src/state/slices/uiSlice.ts src/components/backstage/LibrarySection.tsx src/components/backstage/LibrarySection.css src/components/backstage/Backstage.tsx src/components/dialogs/PoolImportDialog.tsx src/App.tsx src/utils/devBridge.ts src/i18n/locales/nl/menu.json src/i18n/locales/en/menu.json src/i18n/locales/nl/common.json src/i18n/locales/en/common.json
git commit -m "$(cat <<'EOF'
feat(library): Backstage-sectie Bibliotheek + pool-importdialoog met demping-waarschuwing

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Toevoegen/bijwerken-UI + bedrijfsselector (wizard & lopend project)

**Files:**
- Create: `src/components/dialogs/AddFromLibraryDialog.tsx`, `src/components/dialogs/UpdateFromLibraryDialog.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/dialogs/ProjectInfoDialog.tsx`
- Modify: het resource-beheerpaneel (`src/components/resources/ResourcePanel*.tsx` — verifieer exacte bestandsnaam)

- [ ] **Step 1: Schrijf de "toevoegen uit bibliotheek"-kiezer**

Create `src/components/dialogs/AddFromLibraryDialog.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Check } from 'lucide-react';
import { useAppStore } from '@/state/appStore';

/**
 * "Toevoegen uit bibliotheek" (spec §3): kies bedrijf (selector alleen bij ≥2 bedrijven, §2) en
 * items; toevoegen kopieert met stempel + dedup ("al in project"-melding).
 */
export function AddFromLibraryDialog() {
  const { t } = useTranslation();
  const open = useAppStore(s => s.ui.showAddFromLibraryDialog);
  const setUI = useAppStore(s => s.setUI);
  const companies = useAppStore(s => s.companies);
  const pools = useAppStore(s => s.pools);
  const project = useAppStore(s => s.project);
  const defaultCompanyId = useAppStore(s => s.defaultCompanyId);
  const addResource = useAppStore(s => s.addLibraryResourceToProject);
  const addCalendar = useAppStore(s => s.addLibraryCalendarToProject);

  // Voorselectie: het gebonden bedrijf van het project, anders de default.
  const [companyId, setCompanyId] = useState(project.companyId ?? defaultCompanyId);
  const [notice, setNotice] = useState<string | null>(null);

  if (!open) return null;
  const close = () => { setNotice(null); setUI({ showAddFromLibraryDialog: false }); };
  const pool = pools[companyId];

  const onAddResource = (id: string) => {
    const r = addResource(companyId, id);
    setNotice(r.added ? t('companyLibrary.added') : t('companyLibrary.alreadyInProject'));
  };
  const onAddCalendar = (id: string) => {
    const r = addCalendar(companyId, id);
    setNotice(r.added ? t('companyLibrary.added') : t('companyLibrary.alreadyInProject'));
  };

  return (
    <div className="dialog-overlay" onClick={close}>
      <div className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="dialog-head">
          <h2>{t('companyLibrary.addTitle')}</h2>
          <button onClick={close}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          {/* Bedrijfsselector alleen bij ≥2 bedrijven (spec §2). */}
          {companies.length >= 2 && (
            <select value={companyId} onChange={e => setCompanyId(e.target.value)}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {notice && <p className="notice"><Check size={13} /> {notice}</p>}

          <h3>{t('companyLibrary.resources')}</h3>
          {pool.resources.length === 0 && <p className="empty">{t('companyLibrary.noResources')}</p>}
          <ul className="add-list">
            {pool.resources.map(r => (
              <li key={r.id}><span>{r.name}</span><button onClick={() => onAddResource(r.id)}><Plus size={13} /> {t('add')}</button></li>
            ))}
          </ul>

          <h3>{t('companyLibrary.calendars')}</h3>
          {pool.calendars.length === 0 && <p className="empty">{t('companyLibrary.noCalendars')}</p>}
          <ul className="add-list">
            {pool.calendars.map(c => (
              <li key={c.id}><span>{c.name}</span><button onClick={() => onAddCalendar(c.id)}><Plus size={13} /> {t('add')}</button></li>
            ))}
          </ul>
        </div>
        <div className="dialog-foot">
          <button className="primary" onClick={close}>{t('close')}</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Schrijf de "bijwerken vanuit bibliotheek"-diffdialoog**

Create `src/components/dialogs/UpdateFromLibraryDialog.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/state/appStore';

/**
 * "Bijwerken vanuit bibliotheek" (spec §3): per gestempeld projectitem het verschil
 * (bibliotheekwaarde naast projectwaarde); user kiest per item. Verwijderd origineel ⇒ "bestaat niet
 * meer in bibliotheek". NOOIT een bulk-overschrijfknop.
 */
export function UpdateFromLibraryDialog() {
  const { t } = useTranslation();
  const open = useAppStore(s => s.ui.showUpdateFromLibraryDialog);
  const setUI = useAppStore(s => s.setUI);
  const resources = useAppStore(s => s.resources);
  const calendars = useAppStore(s => s.calendars);
  const diffResource = useAppStore(s => s.diffProjectResource);
  const diffCalendar = useAppStore(s => s.diffProjectCalendar);
  const updateResource = useAppStore(s => s.updateProjectResourceFromLibrary);
  const updateCalendar = useAppStore(s => s.updateProjectCalendarFromLibrary);

  if (!open) return null;
  const close = () => setUI({ showUpdateFromLibraryDialog: false });

  const stampedResources = resources.filter(r => r.libraryOrigin);
  const stampedCalendars = calendars.filter(c => c.libraryOrigin);

  const renderDiff = (name: string, diff: ReturnType<typeof diffResource>, onUpdate: () => void) => {
    if (!diff) return null;
    return (
      <li key={name} className="update-row">
        <span className="update-name">{name}</span>
        {diff.status === 'up-to-date' && <span className="tag ok">{t('companyLibrary.upToDate')}</span>}
        {diff.status === 'removed' && <span className="tag removed"><AlertCircle size={12} /> {t('companyLibrary.removedFromLibrary')}</span>}
        {diff.status === 'changed' && (
          <>
            <ul className="diff-fields">
              {diff.fields.map(f => (
                <li key={f.field}>
                  <b>{f.field}</b>: <span className="proj">{JSON.stringify(f.project)}</span> → <span className="lib">{JSON.stringify(f.library)}</span>
                </li>
              ))}
            </ul>
            <button className="secondary" onClick={onUpdate}><RefreshCw size={12} /> {t('companyLibrary.updateThis')}</button>
          </>
        )}
      </li>
    );
  };

  return (
    <div className="dialog-overlay" onClick={close}>
      <div className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="dialog-head">
          <h2>{t('companyLibrary.updateTitle')}</h2>
          <button onClick={close}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          {stampedResources.length === 0 && stampedCalendars.length === 0 && <p className="empty">{t('companyLibrary.noStampedItems')}</p>}
          {stampedResources.length > 0 && <h3>{t('companyLibrary.resources')}</h3>}
          <ul className="update-list">
            {stampedResources.map(r => renderDiff(r.name, diffResource(r.id), () => updateResource(r.id)))}
          </ul>
          {stampedCalendars.length > 0 && <h3>{t('companyLibrary.calendars')}</h3>}
          <ul className="update-list">
            {stampedCalendars.map(c => renderDiff(c.name, diffCalendar(c.id), () => updateCalendar(c.id)))}
          </ul>
        </div>
        <div className="dialog-foot">
          <button className="primary" onClick={close}>{t('close')}</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Mount beide dialogen in App.tsx**

In `src/App.tsx`, importeer en mount:

```tsx
import { AddFromLibraryDialog } from '@/components/dialogs/AddFromLibraryDialog';
import { UpdateFromLibraryDialog } from '@/components/dialogs/UpdateFromLibraryDialog';
// ... in de JSX bij de andere dialogen:
<AddFromLibraryDialog />
<UpdateFromLibraryDialog />
```

- [ ] **Step 4: Voeg de openings-knoppen toe in het resource-paneel**

Het resource-beheerpaneel is `src/components/panels/ResourcePanel.tsx`. De kop is de flex-balk op regel 114 (`<div className="flex items-center justify-between h-9 px-3 border-b border-border flex-shrink-0">`) met de titel-`<span>` (regel 115) en rechts een knoppengroep `<div className="flex items-center gap-2">` (regel 116) die nu de "rij toevoegen"-knop (regel 117-119) en de sluit-knop bevat. Voeg de twee bibliotheek-knoppen ín die knoppengroep toe, vóór de bestaande `addRow`-knop op regel 117:

```tsx
          <button
            onClick={() => setUI({ showAddFromLibraryDialog: true })}
            className="btn btn--sm flex items-center gap-1"
          >
            {t('companyLibrary.addFromLibrary')}
          </button>
          <button
            onClick={() => setUI({ showUpdateFromLibraryDialog: true })}
            className="btn btn--sm flex items-center gap-1"
          >
            {t('companyLibrary.updateFromLibrary')}
          </button>
```

(`setUI` en `t` zijn al in `ResourcePanel.tsx` in scope: `const setUI = useAppStore(s => s.setUI)` bestaat er al — het paneel gebruikt 'm o.a. voor de sluit-knop op regel 121 — en `t` komt uit de bestaande `useTranslation()`.)

- [ ] **Step 5: Wizard-integratie — "toevoegen uit bibliotheek" naast presets**

In `src/components/dialogs/ProjectInfoDialog.tsx` (alleen in de `isNew`-tak, naast de kalender-presets/faseringssjablonen): voeg een sectie toe die, wanneer er pool-inhoud is, een knop toont die na aanmaken de "toevoegen uit bibliotheek"-dialoog opent. Concreet, ná `createNewProject({...})` in de bestaande create-handler:

```tsx
      // Spec §3: na het aanmaken kan de gebruiker direct uit de bibliotheek toevoegen.
      if (offerLibraryAdd) {
        useAppStore.getState().setUI({ showAddFromLibraryDialog: true });
      }
```

met een checkbox-state `const [offerLibraryAdd, setOfferLibraryAdd] = useState(false);` en een checkbox in de JSX, alleen gerenderd als `companies.some(c => (pools[c.id]?.resources.length ?? 0) + (pools[c.id]?.calendars.length ?? 0) > 0)`. Lees `companies`/`pools` via `useAppStore`. Label: `t('companyLibrary.addAfterCreate')`.

- [ ] **Step 6: Verifieer build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/dialogs/AddFromLibraryDialog.tsx src/components/dialogs/UpdateFromLibraryDialog.tsx src/components/dialogs/ProjectInfoDialog.tsx src/App.tsx src/components/resources
git commit -m "$(cat <<'EOF'
feat(library): toevoegen/bijwerken-UI + bedrijfsselector (wizard en resource-paneel)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Vinkje "bibliotheekbestand ernaast opslaan"

**Files:**
- Modify: `src/state/slices/fileSlice.ts`
- Modify: het export-paneel in de Backstage (`src/components/backstage/Backstage.tsx` → `ExportSection`, of het aparte bestand indien uitgesplitst)

- [ ] **Step 1: Voeg een export-actie toe die de pool ernaast schrijft**

In `src/state/slices/fileSlice.ts`, voeg aan de `FileSlice`-interface toe:

```ts
  /** Exporteer het project + (spec §4) schrijf de gebonden bedrijfs-pool als tweede, LOS bestand
   *  ernaast. Géén embed. No-op op de pool-kant als het project niet aan een bedrijf gebonden is. */
  exportProjectWithPool: () => Promise<void>;
```

Implementeer 'm (naast `exportAs`), hergebruik `buildWriteIFCInput`/`writeIFC` + `writePoolIFC` + `saveFileDialog`:

```ts
    exportProjectWithPool: async () => {
      const state = get();
      // 1. Het project zelf (bevat altijd al alle gebruikte items — kernprincipe §1).
      const projectContent = writeIFC(buildWriteIFCInput(state));
      const base = state.project.name || 'project';
      const outcome = await saveFileDialog(`${base}.ifc`, projectContent, [{ name: 'IFC', extensions: ['ifc'] }]);
      if (!outcome) return;
      // 2. De pool ernaast (los bestand), alleen als het project aan een bedrijf gebonden is.
      const companyId = state.project.companyId;
      if (!companyId) return;
      const poolContent = state.exportPoolIFC(companyId);
      if (!poolContent) return;
      await saveFileDialog(`${base}-bibliotheek.ifc`, poolContent, [{ name: 'IFC', extensions: ['ifc'] }]);
    },
```

**Let op:** verifieer de exacte handtekening/retourwaarde van `saveFileDialog` (`grep -n "export .*saveFileDialog" src/services/fileAccess/*.ts`) en pas de `outcome`-guard daarop aan.

- [ ] **Step 2: Voeg de checkbox + knop toe in de export-UI**

In de `ExportSection` van `src/components/backstage/Backstage.tsx` (of het uitgesplitste export-bestand), voeg een checkbox toe (`const [alsoPool, setAlsoPool] = useState(false)`), alleen zichtbaar wanneer `project.companyId` gezet is, met label `t('companyLibrary.exportWithPool')`, en laat de IFC-export-knop `exportProjectWithPool()` aanroepen als `alsoPool` aan staat (anders het bestaande `exportAs('ifc')`).

```tsx
{project.companyId && (
  <label className="export-option">
    <input type="checkbox" checked={alsoPool} onChange={e => setAlsoPool(e.target.checked)} />
    {t('companyLibrary.exportWithPool')}
  </label>
)}
```

- [ ] **Step 3: Verifieer build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/state/slices/fileSlice.ts src/components/backstage/Backstage.tsx
git commit -m "$(cat <<'EOF'
feat(library): exportoptie "bibliotheekbestand ernaast opslaan" (geen embed)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: i18n — alle teksten in 14 locales

**Files:**
- Modify: 14× `src/i18n/locales/<lng>/common.json`

- [ ] **Step 1: Definieer de volledige nl-sleutelset**

Voeg in `src/i18n/locales/nl/common.json` het top-level `companyLibrary`-blok toe (naast de bestaande top-level keys zoals `resource`, `calendar`):

```json
  "companyLibrary": {
    "title": "Bedrijfsbibliotheek",
    "intro": "Beheer kalenders en resources centraal per bedrijf. Projecten van dit bedrijf putten hieruit; wat een project gebruikt wordt een bewerkbare kopie mét herkomst in het project zelf.",
    "companies": "Bedrijven",
    "addCompany": "Bedrijf toevoegen",
    "newCompany": "Nieuw bedrijf",
    "companyName": "Bedrijfsnaam",
    "removeCompany": "Bedrijf verwijderen",
    "cannotRemoveLast": "Het laatste bedrijf kan niet worden verwijderd.",
    "setDefault": "Als standaard",
    "export": "Exporteren",
    "import": "Importeren",
    "backupHint": "Exporteren is tevens je back-up: bewaar het bestand op een veilige plek.",
    "calendars": "Kalenders",
    "resources": "Resources",
    "noCalendars": "Nog geen kalenders in de pool.",
    "noResources": "Nog geen resources in de pool.",
    "promoteHint": "Promoveer een projectkalender of -resource naar de bibliotheek vanuit het project.",
    "addFromLibrary": "Toevoegen uit bibliotheek",
    "updateFromLibrary": "Bijwerken vanuit bibliotheek",
    "addTitle": "Toevoegen uit bibliotheek",
    "added": "Toegevoegd aan project.",
    "alreadyInProject": "Dit item zit al in het project.",
    "addAfterCreate": "Na aanmaken direct items uit de bibliotheek toevoegen",
    "updateTitle": "Bijwerken vanuit bibliotheek",
    "upToDate": "Actueel",
    "updateThis": "Dit item bijwerken",
    "removedFromLibrary": "Bestaat niet meer in bibliotheek",
    "noStampedItems": "Geen items met een bibliotheekherkomst in dit project.",
    "importTitle": "Bibliotheek importeren",
    "importInto": "Importeren in bedrijf",
    "chooseFile": "Bestand kiezen…",
    "importNotAPool": "Dit IFC-bestand bevat geen bedrijfsbibliotheek.",
    "importPreview": "{{calendars}} kalenders, {{resources}} resources (versie {{version}}).",
    "importReplaces": "Importeren vervangt de HELE pool van het gekozen bedrijf.",
    "importConfirm": "Vervangen",
    "dempingWarning": "Jouw lokale bibliotheek is nieuwer — importeren kan wijzigingen van jou overschrijven.",
    "syncNote": "Let op: bibliotheken worden niet gesynchroniseerd tussen machines. Werken twee planners met hetzelfde bedrijf, dan kunnen de bibliotheken uiteenlopen. Deelt jullie organisatie ploegen over werkmaatschappijen heen, kies dan bewust één gezamenlijke pool.",
    "exportWithPool": "Bibliotheekbestand ernaast opslaan"
  },
```

- [ ] **Step 2: Definieer de volledige en-sleutelset**

Voeg in `src/i18n/locales/en/common.json` toe:

```json
  "companyLibrary": {
    "title": "Company library",
    "intro": "Manage calendars and resources centrally per company. Projects of this company draw from it; what a project uses becomes an editable copy with provenance inside the project itself.",
    "companies": "Companies",
    "addCompany": "Add company",
    "newCompany": "New company",
    "companyName": "Company name",
    "removeCompany": "Remove company",
    "cannotRemoveLast": "The last company cannot be removed.",
    "setDefault": "Set as default",
    "export": "Export",
    "import": "Import",
    "backupHint": "Exporting is also your backup: keep the file somewhere safe.",
    "calendars": "Calendars",
    "resources": "Resources",
    "noCalendars": "No calendars in the pool yet.",
    "noResources": "No resources in the pool yet.",
    "promoteHint": "Promote a project calendar or resource to the library from within the project.",
    "addFromLibrary": "Add from library",
    "updateFromLibrary": "Update from library",
    "addTitle": "Add from library",
    "added": "Added to project.",
    "alreadyInProject": "This item is already in the project.",
    "addAfterCreate": "Add items from the library right after creating",
    "updateTitle": "Update from library",
    "upToDate": "Up to date",
    "updateThis": "Update this item",
    "removedFromLibrary": "No longer exists in library",
    "noStampedItems": "No items with a library origin in this project.",
    "importTitle": "Import library",
    "importInto": "Import into company",
    "chooseFile": "Choose file…",
    "importNotAPool": "This IFC file does not contain a company library.",
    "importPreview": "{{calendars}} calendars, {{resources}} resources (version {{version}}).",
    "importReplaces": "Importing replaces the ENTIRE pool of the selected company.",
    "importConfirm": "Replace",
    "dempingWarning": "Your local library is newer — importing may overwrite your changes.",
    "syncNote": "Note: libraries are not synchronized between machines. If two planners work with the same company, the libraries may diverge. If your organization shares crews across operating companies, deliberately choose one shared pool.",
    "exportWithPool": "Save library file alongside"
  },
```

- [ ] **Step 3: Vertaal analoog voor de overige 12 locales**

Voeg hetzelfde `companyLibrary`-blok (met dezelfde sleutelnamen en interpolatie-placeholders `{{calendars}}`/`{{resources}}`/`{{version}}`) toe aan elk van: `fr, de, es, zh, it, pt, pl, tr, ar, ja, ko, fa`. Vertaal de waarden idiomatisch per taal; laat de placeholders exact staan. Voeg ook `backstage.library` toe aan elke `<lng>/menu.json` (nl "Bibliotheek", en "Library", rest vertaald). De RTL-locales (`ar`, `fa`) hebben geen speciale JSON-behandeling nodig — de richting wordt al door `RTL_LOCALES` afgehandeld.

- [ ] **Step 4: Verifieer dat elke locale alle sleutels heeft (geen ontbrekende)**

Run:
```bash
node -e '
const fs=require("fs");
const langs=["nl","en","fr","de","es","zh","it","pt","pl","tr","ar","ja","ko","fa"];
const ref=Object.keys(require("./src/i18n/locales/nl/common.json").companyLibrary);
let bad=0;
for(const l of langs){
  const j=require("./src/i18n/locales/"+l+"/common.json").companyLibrary||{};
  const miss=ref.filter(k=>!(k in j));
  if(miss.length){bad++;console.log("XX",l,"mist:",miss.join(","));}
}
process.exit(bad?1:0);'
```
Expected: geen `XX`-regels, exitcode 0.

- [ ] **Step 5: Verifieer build (JSON-imports valideren + tsc)**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/locales
git commit -m "$(cat <<'EOF'
feat(library): i18n voor de bedrijfsbibliotheek in alle 14 locales

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Documentatie — beperkingen §8, CHANGELOG, TODO

**Files:**
- Create: `docs/library.md`
- Modify: `docs/CHANGELOG.md`, `docs/TODO.md`, `CLAUDE.md`

- [ ] **Step 1: Schrijf de gebruikersdocumentatie**

Create `docs/library.md` met de volgende inhoud (uitgeschreven — bevat de expliciete §8-beperkingen en de sync-uitleg uit spec §7/§8):

```markdown
# Bedrijfsbibliotheken

Eén centrale plek per **bedrijf** waar kalenders en resources leven, buiten de projecten om.
Projecten van dat bedrijf putten eruit; wat een project gebruikt wordt een **bewerkbare kopie mét
herkomststempel** in het project zelf. Een gedeeld projectbestand is daardoor altijd compleet en
zelfstandig — "gebeiteld": zelfstandig, niet read-only.

## Bedrijven

Er is altijd één standaardbedrijf ("Mijn bedrijf"). Eenpitters zien het bedrijfsconcept nooit: de
bedrijfsselector verschijnt pas zodra er ≥2 bedrijven zijn. Beheer bedrijven via
**Bestand → Bibliotheek**: aanmaken, hernoemen, verwijderen (het laatste bedrijf blijft altijd
bestaan), en één als standaard aanwijzen.

## De pool

Elk bedrijf heeft een **pool**: de verzameling bibliotheekkalenders en -resources, met een
oplopend versienummer. Promoveer een projectkalender of -resource naar de pool vanuit het project.

## Toevoegen aan een project

Via de projectwizard en in een lopend project ("Toevoegen uit bibliotheek"). Toevoegen kopieert het
item met een herkomststempel. Afhankelijkheden reizen mee: een resource met een eigen kalender brengt
die kalender mee. Bestaat er al een kopie met dezelfde herkomst, dan wordt die hergebruikt — nooit
gedupliceerd. Een al aanwezig item nogmaals toevoegen meldt "al in project".

## Bijwerken vanuit bibliotheek

Per item, met zichtbaar verschil (bibliotheekwaarde naast projectwaarde). Er is bewust **geen**
bulk-overschrijfknop. Is het bibliotheekorigineel verwijderd, dan meldt de bijwerkweergave "bestaat
niet meer in bibliotheek" en verandert er niets aan de projectkopie.

## Export, import & back-up

Een pool exporteer je als één IFC 4.3-bestand per bedrijf; dat is tevens je **back-up**. Import
vervangt de **hele** pool van het gekozen bedrijf, ná bevestiging. Bij projectexport kun je met
"Bibliotheekbestand ernaast opslaan" de pool als tweede, los bestand naast het project schrijven.

## Bekende beperkingen (bewust niet opgelost in B1)

Beide komen voort uit dezelfde wortel — **er is geen gedeelde opslag tussen machines** (local-first,
geen server) — en worden opgelost in een apart vervolgproject "gedeelde opslag/sync".

1. **Twee planners, zelfde bedrijf.** Pools kunnen op verschillende machines uiteenlopen. De
   import-demping waarschuwt wanneer je een oudere pool over een nieuwere lokale pool importeert
   ("jouw lokale bibliotheek is nieuwer"), maar kan divergentie niet vóórkomen.

2. **Bezettingsoverzicht ziet alleen deze machine.** Boekingen op de machine van een collega bestaan
   lokaal niet, dus een bezettingsoverzicht (vervolg B1b) is beperkt tot wat op deze machine bekend
   is.

**Aanbeveling.** Deelt jullie organisatie ploegen over werkmaatschappijen heen, kies dan bewust
**één gezamenlijke pool** in plaats van per werkmaatschappij een eigen bedrijf. Dubbelbezetting van
een resource tussen losse organisaties (bijvoorbeeld een onderaannemer die voor twee aannemers werkt)
is bewust geen probleem van dit systeem — dat is het planningsprobleem van die resource zelf.
```

- [ ] **Step 2: Werk de CHANGELOG bij**

Voeg bovenaan `docs/CHANGELOG.md` (onder de meest recente versie-of-`Unreleased`-kop, volg de bestaande stijl) toe:

```markdown
### Toegevoegd
- **Bedrijfsbibliotheken (B1).** Centrale pool van kalenders en resources per bedrijf, buiten de
  projecten om. Projecten kopiëren eruit met een herkomststempel, kunnen per item bijwerken (met
  diff-weergave), en een gedeeld projectbestand blijft zelfstandig compleet. Beheer via
  Bestand → Bibliotheek; pool-export/-import als IFC 4.3 met import-demping; optie
  "bibliotheekbestand ernaast opslaan" bij projectexport. Zie `docs/library.md`.
```

- [ ] **Step 3: Werk de TODO bij**

In `docs/TODO.md`: streep de B1-regel door (of markeer 'm afgerond) en voeg een vervolg-item toe:

```markdown
- [ ] **B1b — bezettingsoverzicht** over open documenten (binnen één bedrijf/pool; bouwt op de
  herkomststempels uit B1). Zie docs/library.md "Bekende beperkingen".
- [ ] **Gedeelde opslag/sync** tussen machines (wortel van beide B1-beperkingen).
```

- [ ] **Step 4: Werk CLAUDE.md bij (Docs-sectie)**

Voeg in `CLAUDE.md` onder de "## Docs"-lijst een regel toe:

```markdown
- [docs/library.md](docs/library.md) — bedrijfsbibliotheken (B1): pools per bedrijf, herkomststempels, pool-IFC-export/-import, bekende beperkingen (geen sync tussen machines).
```

en (optioneel, kort) in de architectuur-sectie een zin dat de bibliotheek app-globaal is (net als extensies), persistentie via `ops-library` (IndexedDB) / `ops-library.json` (appDataDir), en dat herkomststempels/binding via `OPS_`-psets round-trippen.

- [ ] **Step 5: Verifieer (geen build-impact, alleen docs)**

Run: `git diff --stat`
Expected: alleen `docs/*` + `CLAUDE.md` gewijzigd/toegevoegd.

- [ ] **Step 6: Commit**

```bash
git add docs/library.md docs/CHANGELOG.md docs/TODO.md CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(library): gebruikersdoc met §8-beperkingen + changelog/todo/CLAUDE bijgewerkt

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Self-test van de UI-flows (Playwright + window.__OPS__)

**Files:**
- Modify: `src/App.tsx` (init-hook, indien nog niet gedaan)
- Geen productie-code-wijziging verwacht — alleen verificatie.

- [ ] **Step 1: Zorg dat de bibliotheek bij opstarten laadt**

In `src/App.tsx`, roep `initLibrary()` aan in het bootstrap-`useEffect` (naast de bestaande `initTheme()`/`initLocale()`/`loadAllExtensions()`-init), zodat de opgeslagen bibliotheek in de store staat vóór de UI hem gebruikt:

```ts
useAppStore.getState().initLibrary();
```

(Fire-and-forget; de slice zet `libraryLoaded` op true.)

- [ ] **Step 2: Verifieer build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Start de dev-build en draai de UI-flows via de store-hook**

Start de browser-dev-build (preview, poort 3007). Draai via Playwright `browser_evaluate` (of de dev-console) de volgende flow tegen `window.__OPS__`:

```js
// 1. Standaardbedrijf aanwezig, selector verborgen bij 1 bedrijf
const s = window.__OPS__.store.getState();
console.assert(s.companies.length === 1, 'één standaardbedrijf');

// 2. Promoveer een projectresource naar de pool, voeg 'm toe aan het project, controleer stempel + dedup
const cid = s.defaultCompanyId;
const poolResId = s.promoteResourceToPool(cid, { id: 'ui-res', name: 'UI-timmerman', type: 'LABOR', description: '', maxUnits: 2 });
const a1 = s.addLibraryResourceToProject(cid, poolResId);
const a2 = s.addLibraryResourceToProject(cid, poolResId);
console.assert(a1.added === true && a2.added === false, 'toevoegen + dedup');
console.assert(window.__OPS__.store.getState().project.companyId === cid, 'project gebonden');

// 3. Wijzig de pool ⇒ diff "changed" ⇒ bijwerken ⇒ up-to-date
s.updatePoolResource(cid, poolResId, { maxUnits: 9 });
console.assert(window.__OPS__.store.getState().diffProjectResource(a1.resourceId).status === 'changed', 'diff changed');
window.__OPS__.store.getState().updateProjectResourceFromLibrary(a1.resourceId);
console.assert(window.__OPS__.store.getState().resources.find(r => r.id === a1.resourceId).maxUnits === 9, 'bijgewerkt');

// 4. IFC-round-trip van het project behoudt companyId + herkomststempel
const rt = window.__OPS__.roundTrip ? window.__OPS__.roundTrip() : null;
console.log('roundTrip', rt);
```

Expected: alle `console.assert`s slagen (geen assertion-fouten in de console). Controleer óók visueel: Backstage → Bibliotheek toont het bedrijf + de gepromoveerde resource; na een tweede bedrijf verschijnt de selector in de "Toevoegen uit bibliotheek"-dialoog.

- [ ] **Step 4: Controleer de importdialoog-demping visueel**

Exporteer via `window.__OPS__.store.getState().exportPoolIFC(cid)` een pool-string, importeer 'm via de UI (Backstage → Bibliotheek → Importeren) terug in hetzelfde bedrijf en controleer dat, als de lokale pool nieuwer is, de gele demping-waarschuwing verschijnt en dat de §8-sync-uitleg (`syncNote`) altijd zichtbaar is.

- [ ] **Step 5: Volledige suites groen (eindpoort)**

Run:
```bash
bash tests/library/run.sh; echo "library exit=$?"
bash tests/planning/run.sh; echo "planning exit=$?"
bash tests/planning/run.sh 2>&1 | grep '^   XX' || echo "geen XX-regels"
```
Expected: `library exit=0`, `planning exit=0`, "geen XX-regels".

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit (indien App.tsx gewijzigd)**

```bash
git add src/App.tsx
git commit -m "$(cat <<'EOF'
feat(library): laad de bedrijfsbibliotheek bij opstarten (initLibrary)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Afsluitende checklist (self-review vóór afronden)

- [ ] `npm run build` groen.
- [ ] `bash tests/library/run.sh` exitcode 0, geen `XX`-regels.
- [ ] `bash tests/planning/run.sh` exitcode 0, geen `XX`-regels (golden rule + round-trip intact).
- [ ] Elke locale heeft het volledige `companyLibrary`-blok (Taak 14, stap 4-check groen).
- [ ] Backstage → Bibliotheek, "Toevoegen uit bibliotheek", "Bijwerken vanuit bibliotheek" en pool-import werken in de dev-build.
- [ ] `docs/library.md` bevat de §8-beperkingen; de importdialoog toont de sync-uitleg + demping-waarschuwing.
- [ ] Geen `@tauri-apps/*`-top-level-imports (alle library-Tauri-code zit achter `isTauri()` met dynamische import).
