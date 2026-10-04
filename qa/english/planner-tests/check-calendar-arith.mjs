// open-vision-studio/src/types/calendar.ts
function holidayEndDate(holiday) {
  return holiday.endDate || holiday.startDate;
}

// open-vision-studio/src/utils/dateUtils.ts
function parseDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const d = new Date(iso);
  if (isNaN(d.getTime())) return d;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
var MS_PER_DAY = 864e5;
function utcDayIndex(ms) {
  return Math.floor(ms / MS_PER_DAY);
}
var pad2 = (n2) => n2 < 10 ? "0" + n2 : String(n2);
function formatDate(d) {
  const y = d.getUTCFullYear();
  if (y >= 0 && y <= 9999) {
    return `${String(y).padStart(4, "0")}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  return d.toISOString().split("T")[0];
}
function isoDayOfWeek(d) {
  const day = d.getUTCDay();
  return day === 0 ? 7 : day;
}
function diffCalendarDays(a, b) {
  const msPerDay = 864e5;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}
function addCalendarDays(d, days) {
  const result = new Date(d.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// open-vision-studio/src/engine/scheduler/CalendarEngine.ts
var bandCacheRegistry = /* @__PURE__ */ new WeakMap();
function modalHighest(values) {
  const freq = /* @__PURE__ */ new Map();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [v, count] of freq) {
    if (count > bestCount || count === bestCount && v > best) {
      best = v;
      bestCount = count;
    }
  }
  return best;
}
function modalBandHoursPerDay(bands, fallback) {
  const sums = [];
  for (let wd = 1; wd <= 7; wd = wd + 1) {
    const list = bands.byWeekday[wd] ?? [];
    if (list.length === 0) continue;
    sums.push(list.reduce((s, b) => s + (b.end - b.start), 0) / 60);
  }
  return sums.length === 0 ? fallback : modalHighest(sums);
}
var CalendarEngine = class _CalendarEngine {
  calendar;
  holidaySet;
  // ── Numerieke afgeleide structuren ─────────────
  // O(1)- resp. O(1+#holidays·log)-arithmetiek voor isWorkDay/workDaysBetween, i.p.v. dag-voor-dag
  // scannen. NAAST de string-structuren: de uur-modus (bandsStartingOn/isHoliday) leunt op holidaySet.
  workDayMask;
  // index 1..7 (ISO-weekdag) ⇒ is-werkdag
  workDaysPerWeek;
  // som van true in workDayMask[1..7]
  holidayDaySet;
  // UTC-dagindices van alle holiday-dagen
  holidayWorkdayIdxSorted;
  // holiday-dagindices OP een werk-weekdag, oplopend
  // ── Werkende uitzonderingen — dag-uitzonderingen die een dag WERKEND
  //    maken, evt. met eigen banden. Afwezig `workingExceptions` ⇒ alle drie de sets/maps blijven leeg
  //    en elke `.has(...)` hieronder is false.
  workingExceptionDaySet;
  // UTC-dagindices die door een uitzondering WERKEND zijn
  workingExceptionSet;
  // dezelfde dagen als datumstring (voor isHoliday's string-API)
  workingExceptionBandsByDay;
  // alleen bij expliciete override-banden
  // Valkuil: een werkende uitzondering op een NIET-werk-weekdag (bv. zaterdag) zit niet in
  // `workDaysPerWeek`/`countWorkWeekdays` (die kennen alleen het vaste weekpatroon) en moet dus als
  // EXTRA werkdag worden opgeteld in `workDaysBetween` — vandaar een eigen gesorteerde index.
  workingExceptionOnNonWorkWeekdayIdxSorted;
  // Veiligheidsgrenzen tegen vastlopen bij een kapotte kalender (geen werkdagen)
  // of een ongeldige/sentinel-datum: MAX_SCAN = max dagen zoeken naar een werkdag;
  // MAX_DAYS = absolute iteratielimiet (~547 jaar) voor de tel-lussen.
  static MAX_SCAN = 366;
  static MAX_DAYS = 2e5;
  // Uur-modus: absolute minuut-grens, analoog aan MAX_SCAN/MAX_DAYS. Een duur groter
  // dan dit wordt niet uitgeteld (een kapotte/sentinel-invoer mag de banden-lus niet laten hangen).
  static MAX_MINUTES = _CalendarEngine.MAX_DAYS * 24 * 60;
  static MS_PER_MIN = 6e4;
  // ── Uur-modus-state (dood in dag-modus) ─────────────────────────
  mode = "day";
  derivedHpd = 0;
  bandCache;
  // De banden van een "normale werkdag" van deze
  // kalender — fallback voor een band-loze werkende uitzondering op een dag die zelf géén weekdag-
  // banden heeft (bv. een werkende zaterdag in een ma-vr-uurkalender). Zie `computeStandardWorkdayBands`.
  standardWorkdayBands = [];
  constructor(calendar) {
    this.calendar = calendar;
    this.workDayMask = new Array(8).fill(false);
    for (const wd of this.calendar.workDays) this.workDayMask[wd] = true;
    this.workDaysPerWeek = 0;
    for (let wd = 1; wd <= 7; wd++) if (this.workDayMask[wd]) this.workDaysPerWeek++;
    this.holidaySet = /* @__PURE__ */ new Set();
    this.holidayDaySet = /* @__PURE__ */ new Set();
    this.buildHolidaySet();
    this.workingExceptionDaySet = /* @__PURE__ */ new Set();
    this.workingExceptionSet = /* @__PURE__ */ new Set();
    this.workingExceptionBandsByDay = /* @__PURE__ */ new Map();
    this.buildWorkingExceptions();
    this.holidayWorkdayIdxSorted = [...this.holidayDaySet].filter((idx) => this.workDayMask[isoDayOfWeek(new Date(idx * MS_PER_DAY))] && !this.workingExceptionDaySet.has(idx)).sort((a, b) => a - b);
    this.workingExceptionOnNonWorkWeekdayIdxSorted = [...this.workingExceptionDaySet].filter((idx) => !this.workDayMask[isoDayOfWeek(new Date(idx * MS_PER_DAY))]).sort((a, b) => a - b);
    this.mode = calendar.workTime ? "hour" : "day";
    if (this.mode === "hour") {
      this.derivedHpd = this.computeDerivedHoursPerDay();
      this.standardWorkdayBands = this.computeStandardWorkdayBands();
      let cache = bandCacheRegistry.get(calendar);
      if (!cache) {
        cache = { days: /* @__PURE__ */ new Map(), fills: 0 };
        bandCacheRegistry.set(calendar, cache);
      }
      this.bandCache = cache;
    }
  }
  buildHolidaySet() {
    for (const holiday of this.calendar.holidays) {
      const start = parseDate(holiday.startDate);
      const end = parseDate(holidayEndDate(holiday));
      const days = diffCalendarDays(start, end);
      for (let i = 0; i <= days; i++) {
        const d = addCalendarDays(start, i);
        this.holidaySet.add(formatDate(d));
        this.holidayDaySet.add(utcDayIndex(d.getTime()));
      }
    }
  }
  /** Materialiseert `calendar.workingExceptions` naar dagindex-/datumstring-sets plus,
   *  bij expliciete override-banden, een dagindex→banden-map. INVARIANT (afgedwongen door de PARSER;
   *  hier vertrouwd maar niet blind: `isWorkDay`/`isHoliday`/`bandsStartingOn`/`workDaysBetween`
   *  blijven correct óók als een datum toch in zowel `holidays` als `workingExceptions` voorkomt, zie
   *  de precedentie-orde in die functies en de filter bij `holidayWorkdayIdxSorted`): een datum staat normaliter nooit tegelijk in `holidays` én in
   *  `workingExceptions`. Mirroring `buildHolidaySet` qua vorm — bewust géén gedeelde helper, zodat een
   *  fout in de ene lus niet stilzwijgend in de andere meelift.
   *
   *  OVERLAP OP DEZELFDE DATUM tussen TWEE `workingExceptions`-entries (mag óók niet voorkomen — de
   *  parser levert per-datum-unieke invoer — maar gedocumenteerd voor het geval die garantie
   *  lekt): de LAATST-verwerkte entry MET expliciete banden wint voor
   *  die datum (`.set(...)` overschrijft). Een LATERE entry ZONDER banden wist een eerder gezette
   *  override-bandenset NIET — de `if (exc.bands...)`-guard slaat dan simpelweg over, dus de eerdere
   *  banden blijven staan. Dit is geen "laatste-wint-altijd"-semantiek; het is bewust niet verder
   *  dichtgetimmerd omdat de parser-invariant dit pad dood hoort te houden. */
  buildWorkingExceptions() {
    for (const exc of this.calendar.workingExceptions ?? []) {
      const start = parseDate(exc.startDate);
      const end = parseDate(exc.endDate);
      const days = diffCalendarDays(start, end);
      for (let i = 0; i <= days; i++) {
        const d = addCalendarDays(start, i);
        const dayIdx = utcDayIndex(d.getTime());
        this.workingExceptionDaySet.add(dayIdx);
        this.workingExceptionSet.add(formatDate(d));
        if (exc.bands && exc.bands.length > 0) {
          this.workingExceptionBandsByDay.set(dayIdx, [...exc.bands]);
        }
      }
    }
  }
  /** Heeft de kalender überhaupt werkdagen? Een lege werkweek levert anders stil onzin-datums. */
  hasWorkingDays() {
    return Array.isArray(this.calendar.workDays) && this.calendar.workDays.length > 0;
  }
  /** Check if a given date is a working day.
   *  Numeriek: `floor(ms/MS_PER_DAY)` = dezelfde UTC-dagindex als `formatDate` (epoch op
   *  UTC-middernacht). Ongeldige datum: `isoDayOfWeek`→NaN ⇒ `workDayMask[NaN]`=undefined ⇒ false. */
  isWorkDay(date) {
    const dow = isoDayOfWeek(date);
    const hasExc = this.workingExceptionDaySet.size > 0;
    if (!hasExc && !this.workDayMask[dow]) return false;
    const dayIdx = utcDayIndex(date.getTime());
    if (hasExc && this.workingExceptionDaySet.has(dayIdx)) return true;
    if (!this.workDayMask[dow]) return false;
    return !this.holidayDaySet.has(dayIdx);
  }
  /** Check if a given date string is a holiday. Een werkende uitzondering op dezelfde
   *  datum overrulet — die dag is dan geen holiday meer (precedentie, zelfde volgorde als isWorkDay). */
  isHoliday(dateStr) {
    return this.holidaySet.has(dateStr) && !this.workingExceptionSet.has(dateStr);
  }
  /**
   * Add working days to a start date.
   * Returns the end date (the last working day).
   * For duration=0 (milestone), returns the start date itself.
   *
   * Delegeert naar `addWorkDaysChecked` en pakt `.date`, voor aanroepers (o.a. `useBarDrag`, de
   * niet-taakdatum-CPM-plekken) die het cap-signaal niet nodig hebben.
   */
  addWorkDays(startDate, workDays) {
    return this.addWorkDaysChecked(startDate, workDays).date;
  }
  /**
   * `addWorkDays` mét expliciet CAP-signaal. `capped: true` zodra
   * een van de twee veiligheidsgrenzen wordt geraakt — de MAX_SCAN-werkdag-zoek (een kalender die het
   * venster onwerkbaar maakt, bv. een aaneengesloten holiday-blok) óf de MAX_DAYS-tellimiet — waarna de
   * teruggegeven `Date` een gecapte (niet-betekenisvolle) datum is i.p.v. de echte laatste werkdag.
   * De solver aggregeert dit tot een zachte `cappedTaskIds`-waarschuwing.
   */
  addWorkDaysChecked(startDate, workDays) {
    if (workDays <= 0) return { date: new Date(startDate.getTime()), capped: false };
    let current = new Date(startDate.getTime());
    let scan = 0;
    while (!this.isWorkDay(current)) {
      current = addCalendarDays(current, 1);
      if (++scan > _CalendarEngine.MAX_SCAN) return { date: current, capped: true };
    }
    let remaining = workDays - 1;
    const fastOffset = this.offsetOfNthWorkday(current, remaining, 1);
    if (fastOffset !== null) return { date: addCalendarDays(current, fastOffset), capped: false };
    let steps = 0;
    while (remaining > 0) {
      current = addCalendarDays(current, 1);
      if (this.isWorkDay(current)) {
        remaining--;
      }
      if (++steps > _CalendarEngine.MAX_DAYS) return { date: current, capped: true };
    }
    return { date: current, capped: false };
  }
  /**
   * Calculate the number of working days between two dates (inclusive).
   *
   * Arithmetisch i.p.v. dag-voor-dag scannen (anders O(n²) in de solver). Semantiek:
   *  - Dagen k=0,1,… met dagindex `startIdx+k` zolang `startMs + k·MS_PER_DAY ≤ endMs` (elke +1
   *    kalenderdag = +MS_PER_DAY in UTC, geen DST). Aantal dagen = `floor((endMs−startMs)/MS_PER_DAY)+1`
   *    als `endMs≥startMs`, anders 0.
   *  - CAP: hoogstens MAX_DAYS+1 dagen ⇒ `cappedDays = min(totalDays, MAX_DAYS+1)`.
   * Telling: #werk-weekdagen in het (gecapte) bereik − #(holidays op een werk-weekdag) daarin
   *  + #(werkende uitzonderingen op een NIET-werk-weekdag) daarin (zonder die term telt een werkende
   *  zaterdag niet mee, zie `workingExceptionOnNonWorkWeekdayIdxSorted`).
   */
  workDaysBetween(start, end) {
    const startMs = start.getTime();
    const endMs = end.getTime();
    if (!(endMs >= startMs)) return 0;
    const totalDays = Math.floor((endMs - startMs) / MS_PER_DAY) + 1;
    const cappedDays = Math.min(totalDays, _CalendarEngine.MAX_DAYS + 1);
    const startIdx = utcDayIndex(startMs);
    const lastIdx = startIdx + cappedDays - 1;
    return this.countWorkWeekdays(startIdx, lastIdx) - this.countHolidayWorkdaysInRange(startIdx, lastIdx) + this.countWorkingExceptionsAddedInRange(startIdx, lastIdx);
  }
  /** Getekend werkdag-verschil van `a` naar `b`: a≤b ⇒ +stappen (`workDaysBetween − 1`), a>b ⇒
   *  −stappen. De ene definitie achter de CPM-vrije speling, de variance- en rapportdeltas, de
   *  baselinekolommen van het taakraster en de nivelleervoorvertoning. */
  signedWorkDaysBetween(a, b) {
    return a <= b ? this.workDaysBetween(a, b) - 1 : -(this.workDaysBetween(b, a) - 1);
  }
  /** #werk-weekdagen in het INCLUSIEVE dagindex-bereik [startIdx, lastIdx]. Volledige weken dragen
   *  elk `workDaysPerWeek` bij (elke weekdag komt precies één keer voor); de resterende dagen worden
   *  uitgeteld vanaf de weekdag van `startIdx`. */
  countWorkWeekdays(startIdx, lastIdx) {
    const L = lastIdx - startIdx + 1;
    if (L <= 0) return 0;
    const fullWeeks = Math.floor(L / 7);
    let count = fullWeeks * this.workDaysPerWeek;
    const rem = L - fullWeeks * 7;
    if (rem > 0) {
      let wd = isoDayOfWeek(new Date(startIdx * MS_PER_DAY));
      for (let i = 0; i < rem; i++) {
        if (this.workDayMask[wd]) count++;
        wd = wd === 7 ? 1 : wd + 1;
      }
    }
    return count;
  }
  /** Aantal elementen van een oplopend gesorteerde dagindex-lijst in het inclusieve bereik
   *  [startIdx, lastIdx], via lower/upper-bound binary search. Gedeeld door de holiday- (aftrekken)
   *  en de werkende-uitzondering-telling: zelfde vorm, ander teken bij de
   *  aanroeper. */
  countSortedIdxInRange(sorted, startIdx, lastIdx) {
    let lo = 0;
    let loHi = sorted.length;
    while (lo < loHi) {
      const mid = lo + loHi >>> 1;
      if (sorted[mid] < startIdx) lo = mid + 1;
      else loHi = mid;
    }
    let hi = 0;
    let hiHi = sorted.length;
    while (hi < hiHi) {
      const mid = hi + hiHi >>> 1;
      if (sorted[mid] <= lastIdx) hi = mid + 1;
      else hiHi = mid;
    }
    return hi - lo;
  }
  /** Aantal holiday-dagen ÓP een werk-weekdag in het inclusieve bereik [startIdx, lastIdx]. */
  countHolidayWorkdaysInRange(startIdx, lastIdx) {
    return this.countSortedIdxInRange(this.holidayWorkdayIdxSorted, startIdx, lastIdx);
  }
  /** Aantal werkende uitzonderingen ÓP een NIET-werk-weekdag
   *  in het inclusieve bereik [startIdx, lastIdx] — dagen die `countWorkWeekdays` (kent alleen het
   *  vaste weekpatroon) NIET meetelt en die hier dus als EXTRA werkdag worden opgeteld. Een werkende
   *  uitzondering op een reeds-werkende weekdag zit al in `countWorkWeekdays` en staat daarom niet in
   *  `workingExceptionOnNonWorkWeekdayIdxSorted` (gefilterd in de constructor) — geen dubbeltelling. */
  countWorkingExceptionsAddedInRange(startIdx, lastIdx) {
    return this.countSortedIdxInRange(this.workingExceptionOnNonWorkWeekdayIdxSorted, startIdx, lastIdx);
  }
  /**
   * Get the next working day on or after the given date.
   */
  nextWorkDay(date) {
    let current = new Date(date.getTime());
    let scan = 0;
    while (!this.isWorkDay(current)) {
      current = addCalendarDays(current, 1);
      if (++scan > _CalendarEngine.MAX_SCAN) return current;
    }
    return current;
  }
  /**
   * Get the next working day strictly after the given date.
   */
  nextWorkDayAfter(date) {
    let current = addCalendarDays(date, 1);
    let scan = 0;
    while (!this.isWorkDay(current)) {
      current = addCalendarDays(current, 1);
      if (++scan > _CalendarEngine.MAX_SCAN) return current;
    }
    return current;
  }
  /**
   * Eerste werkdag op of vóór de datum (spiegel van nextWorkDay). Gebruikt om een
   * kalenderdag-lag in de backward-pass richtingbewust op een werkdag te snappen:
   * een bovengrens ("niet later dan…") die op een weekend valt, hoort terug naar vrijdag.
   */
  prevWorkDay(date) {
    let current = new Date(date.getTime());
    let scan = 0;
    while (!this.isWorkDay(current)) {
      current = addCalendarDays(current, -1);
      if (++scan > _CalendarEngine.MAX_SCAN) return current;
    }
    return current;
  }
  /**
   * Get the next working day strictly before the given date.
   * Spiegel van nextWorkDayAfter — gebruikt door de backward-pass zodat de
   * "successor start de werkdag ná de predecessor"-relatie symmetrisch terugloopt.
   */
  prevWorkDayBefore(date) {
    let current = addCalendarDays(date, -1);
    let scan = 0;
    while (!this.isWorkDay(current)) {
      current = addCalendarDays(current, -1);
      if (++scan > _CalendarEngine.MAX_SCAN) return current;
    }
    return current;
  }
  /**
   * Subtract working days from an end date.
   * Returns the start date.
   */
  subtractWorkDays(endDate, workDays) {
    if (workDays <= 0) return new Date(endDate.getTime());
    let current = new Date(endDate.getTime());
    let scan = 0;
    while (!this.isWorkDay(current)) {
      current = addCalendarDays(current, -1);
      if (++scan > _CalendarEngine.MAX_SCAN) return current;
    }
    let remaining = workDays - 1;
    const fastOffset = this.offsetOfNthWorkday(current, remaining, -1);
    if (fastOffset !== null) return addCalendarDays(current, -fastOffset);
    let steps = 0;
    while (remaining > 0) {
      current = addCalendarDays(current, -1);
      if (this.isWorkDay(current)) {
        remaining--;
      }
      if (++steps > _CalendarEngine.MAX_DAYS) break;
    }
    return current;
  }
  /**
   * Verschuif `n` werkdagen vanaf een datum: n=0 => dezelfde (werk)dag, n>0 vooruit, n<0 achteruit.
   * Anders dan addWorkDays/subtractWorkDays telt de begindag hier NIET als "dag 1" — dit is een
   * zuivere offset over werkdagen. Nodig voor correcte lag/lead (positief, negatief én 0) en voor
   * de relatie-logica (FF/SF) in de CPM-solver, waar "N werkdagen verderop/eerder" exact N moet zijn.
   *
   * INVARIANT: de aanroeper voert een wérkdag aan. Alle CPM-paden garanderen dat (early/late-datums
   * zijn altijd werkdagen); een kalenderdag-lag die op een weekend landt wordt op de gebruiksplek
   * eerst richtingbewust gesnapt (forward: nextWorkDay, backward: prevWorkDay) vóór hij hier
   * binnenkomt. Een niet-werkdag zou hier vooruit normaliseren, wat voor n<0 een dag zou schelen.
   */
  addWorkingDaysSigned(date, n2) {
    let current = this.nextWorkDay(new Date(date.getTime()));
    if (n2 === 0) return current;
    const step = n2 > 0 ? 1 : -1;
    let remaining = Math.abs(n2);
    const fastOffset = this.offsetOfNthWorkday(current, remaining, step);
    if (fastOffset !== null) return addCalendarDays(current, step * fastOffset);
    let guard = 0;
    while (remaining > 0) {
      current = addCalendarDays(current, step);
      if (this.isWorkDay(current)) remaining--;
      if (++guard > _CalendarEngine.MAX_DAYS) break;
    }
    return current;
  }
  /**
   * Rekenkundige tegenhanger van de lus "stap één kalenderdag in richting `dir`; is het een werkdag,
   * dan `remaining--`; stop zodra `remaining <= 0`": het aantal kalenderdagen D waarna die lus stopt,
   * of `null` als de lus niet in D ≤ MAX_DAYS stappen stopt (of `remaining` geen eindig getal is) —
   * dan houdt de aanroeper de oude lus aan, inclusief haar afkapgedrag. `remaining ≤ 0` ⇒ 0.
   * Werkt met dezelfde telling als `workDaysBetween` (weekpatroon − feestdagen + werkende
   * uitzonderingen), dus exact dezelfde dag als dag voor dag lopen met `isWorkDay`.
   */
  offsetOfNthWorkday(from, remaining, dir) {
    if (!Number.isFinite(remaining)) return null;
    if (remaining <= 0) return 0;
    const need = Math.ceil(remaining);
    const fromIdx = utcDayIndex(from.getTime());
    if (!Number.isFinite(fromIdx)) return null;
    const countWithin = (d) => {
      const a = dir === 1 ? fromIdx + 1 : fromIdx - d;
      const b = dir === 1 ? fromIdx + d : fromIdx - 1;
      return this.countWorkWeekdays(a, b) - this.countHolidayWorkdaysInRange(a, b) + this.countWorkingExceptionsAddedInRange(a, b);
    };
    const limit = _CalendarEngine.MAX_DAYS;
    let lo = 0;
    let hi = Math.max(1, Math.min(limit, Math.ceil(need * 7 / Math.max(1, this.workDaysPerWeek))));
    while (countWithin(hi) < need) {
      if (hi >= limit) return null;
      lo = hi;
      hi = Math.min(limit, hi * 2);
    }
    while (hi - lo > 1) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (countWithin(mid) >= need) hi = mid;
      else lo = mid;
    }
    return hi;
  }
  get hoursPerDay() {
    if (this.mode === "hour") return this.derivedHpd;
    return this.calendar.hoursPerDay;
  }
  // ═══════════════════════════════════════════════════════════════════════════
  //  UUR-MODUS. Alles hieronder is DOOD in dag-modus: geen enkele
  //  dag-lus hierboven roept iets van dit blok aan. De solver
  //  dispatcht per taak via `isHourMode`. Conventies:
  //    band = [start, end);  nextWorkInstant(t)=t als t∈[start,end);
  //    prevWorkInstant(t)=t als t∈(start,end];  strikte varianten met "After"/"Before".
  // ═══════════════════════════════════════════════════════════════════════════
  /** True ⇒ uur-kalender (`workTime` aanwezig). Vervult het `DurationCalendar`-contract (duration.ts). */
  get isHourMode() {
    return this.mode === "hour";
  }
  /** De EFFECTIEVE banden (minuut-van-de-dag, `[start,end)`) die op de KALENDERDAG van `d` gelden —
   *  via hetzelfde `bandsStartingOn`-pad dat de solver zelf voor elke snap/telling gebruikt, dus
   *  INCLUSIEF werkende uitzonderingen en holidays. Alleen voor read-only VERGELIJKING tussen twee
   *  kalenders OP EEN SPECIFIEKE DATUM (`calendarsAgreeOnSharedWorkdayBands` in `relationMath.ts`) —
   *  geen dag-/uur-lus leest hierlangs. Bewust met datumcontext: de STATISCHE weekdagtabel
   *  (`workTime.byWeekday`) ziet uitzonderingen/holidays niet, zodat twee kalenders met een identiek
   *  WEEKPATROON maar een afwijkende werkende uitzondering op de landingsdag ten onrechte "identiek"
   *  lijken (de msp-04-foutvorm). Geeft een LEGE array terug (nooit
   *  `undefined`) in dag-modus — dag-modus draagt geen bandtijden, dat is een leeg antwoord, geen
   *  onbekend antwoord — en op elke dag die voor deze kalender niet werkt (holiday, geen band).
   *  Geeft altijd een VERSE kopie terug, nooit de gememoizede cache-array van `bandsStartingOn` zelf. */
  effectiveBandsOn(d) {
    if (this.mode !== "hour") return [];
    const dayMs = this.dayStartMsOf(d.getTime());
    return this.bandsStartingOn(dayMs).map((b) => ({
      start: (b.start - dayMs) / _CalendarEngine.MS_PER_MIN,
      end: (b.end - dayMs) / _CalendarEngine.MS_PER_MIN
    }));
  }
  /** Afgeleide `hoursPerDay` voor een uur-kalender: de MODALE band-som over de
   *  werk-weekdagen (meest voorkomende dagsom in uren), bij gelijkspel de HOOGSTE.
   *
   *  BEKENDE BEPERKING (niet gefixt): deze functie telt een weekdag
   *  mee zodra hij BANDEN draagt (`bands.length===0`-check), ongeacht `workDayMask`/`calendar.
   *  workDays` — `computeStandardWorkdayBands` hieronder telt een weekdag alleen mee als hij ZOWEL
   *  in `workDayMask` staat ALS banden draagt. Op een INTERN CONSISTENTE kalender (elke `workDays`-
   *  dag heeft banden, elke bandloze dag staat niet in `workDays`) maken beide filters exact
   *  dezelfde weekdagenset mee, dus is dit onderscheid onzichtbaar. Op een ZELF-TEGENSTRIJDIGE
   *  kalender (bv. `workDays` bevat zaterdag NIET, maar `workTime.byWeekday[6]` draagt toch banden
   *  — een vorm die geen van de lezers (`mppReader.ts`/`mspdiReader.ts`/`p6xmlReader.ts`) produceert,
   *  parser-invariant net als de `holidays`/`workingExceptions`-exclusiviteit hierboven) kunnen deze
   *  functie en `computeStandardWorkdayBands` een ANDERE weekdag als "modaal" aanwijzen, en dus een
   *  `hoursPerDay` teruggeven die niet bij `standardWorkdayBands`'s minutensom past. Geen corpus-
   *  of synthetische case raakt dit (de parsers garanderen de consistentie), dus bewust ongefixt. */
  computeDerivedHoursPerDay() {
    return modalBandHoursPerDay(this.calendar.workTime, this.calendar.hoursPerDay);
  }
  /** De banden van een "normale
   *  werkdag" van deze kalender. MOET dezelfde dag aanwijzen als `computeDerivedHoursPerDay` (de MODALE
   *  dagsom, bij gelijkspel de HOOGSTE) — anders spreken `hoursPerDay` en de band-loze-uitzondering-
   *  fallback elkaar tegen (bv. ma 4u, di-vr 8u: de EERSTE weekdag met banden zou 240m geven, terwijl
   *  `hoursPerDay`=8 een band-loze werkende zaterdag 480m laat verwachten).
   *  Fallback voor een band-loze werkende uitzondering op een dag zonder eigen weekdagbanden (bv. een
   *  werkende zaterdag in een ma-vr-uurkalender, `byWeekday[6]=[]`): zonder deze fallback zou zo'n dag
   *  `isWorkDay`-achtig "werkend" zijn maar 0 werkminuten opleveren — dag- en uurmodus zouden elkaar
   *  tegenspreken en ResourceLoad/workdayAxis zouden een werkdag zonder capaciteit zien. MPXJ produceert
   *  dit scenario nooit (het raakt alleen ons eigen model), maar de semantiek moet gedefinieerd zijn.
   *  Rekent in MINUTEN (niet in afgeronde uren zoals `computeDerivedHoursPerDay`) zodat de modale
   *  waarde exact is; bij gelijke frequentie wint de HOOGSTE minutensom, en van de weekdagen die dié
   *  modale som halen de EERSTE (laagste ISO-weekdagnummer) — deterministisch, ook als twee weekdagen
   *  dezelfde som maar een andere bandvorm hebben. Degenererende kalender (geen `workDays`-weekdag
   *  heeft banden) ⇒ val terug op de eerste niet-lege weekdag ongeacht `workDays`; blijft dat leeg,
   *  dan `[]` (de bestaande MAX_SCAN/geen-werk-paden vangen dat al af).
   *
   *  BEKENDE BEPERKING (niet gefixt): het eerste filter hierboven
   *  eist zowel `workDayMask[wd]` ALS banden — `computeDerivedHoursPerDay` eist alleen banden. Zie
   *  de toelichting daar voor de volledige analyse; op een zelf-tegenstrijdige kalender (`workDays`
   *  en `workTime.byWeekday` niet in overeenstemming, een vorm die geen lezer produceert) kunnen
   *  beide functies een andere weekdag als "modaal" aanwijzen. */
  computeStandardWorkdayBands() {
    const byWeekday = this.calendar.workTime.byWeekday;
    const sums = [];
    for (let wd = 1; wd <= 7; wd = wd + 1) {
      if (!this.workDayMask[wd]) continue;
      const bands = byWeekday[wd];
      if (!bands || bands.length === 0) continue;
      sums.push({ wd, minutes: bands.reduce((s, b) => s + (b.end - b.start), 0) });
    }
    if (sums.length > 0) {
      const bestMinutes = modalHighest(sums.map((s) => s.minutes));
      const match = sums.find((s) => s.minutes === bestMinutes);
      return byWeekday[match.wd];
    }
    for (let wd = 1; wd <= 7; wd = wd + 1) {
      const bands = byWeekday[wd];
      if (bands && bands.length > 0) return bands;
    }
    return [];
  }
  // ── Band-materialisatie (venster-gebaseerd, gememoized op het kalender-object) ──
  /** UTC-middernacht-ms van de dag die `ms` bevat (epoch is op UTC-middernacht uitgelijnd). */
  dayStartMsOf(ms) {
    return utcDayIndex(ms) * MS_PER_DAY;
  }
  /** Absolute werk-intervallen voor de banden die op de dag `dayMs` STARTEN. Een holiday op
   *  díé dag onderdrukt uitsluitend de banden die er starten; de staart na middernacht
   *  van de wrap-band van de vórige dag hoort bij die vorige dag en loopt gewoon door (hij wordt bij
   *  díé dag gematerialiseerd). Gememoized op de gedeelde kalender-cache.
   *  Een werkende uitzondering op `dayMs` wint van de holiday-onderdrukking
   *  hieronder. Fallback-keten voor de te gebruiken banden:
   *  (1) expliciete override-banden op de uitzondering zelf; anders (2) de eigen weekdag-banden van
   *  `dayMs` als die niet leeg zijn; anders (3) `standardWorkdayBands` (de banden van een normale
   *  werkdag van deze kalender) — zodat een band-loze uitzondering op een dag zonder eigen weekdag-
   *  banden (zaterdag in een ma-vr-kalender) niet stilzwijgend 0 minuten oplevert terwijl `isWorkDay`
   *  "werkend" zegt. Zonder `workingExceptions` is `workingExceptionDaySet` leeg en speelt dit niet. */
  bandsStartingOn(dayMs) {
    const cache = this.bandCache;
    const hit = cache.days.get(dayMs);
    if (hit) return hit;
    cache.fills++;
    const d = new Date(dayMs);
    const dayIdx = utcDayIndex(dayMs);
    const wd = isoDayOfWeek(d);
    let bands;
    if (this.workingExceptionDaySet.has(dayIdx)) {
      const override = this.workingExceptionBandsByDay.get(dayIdx);
      const ownWeekdayBands = this.calendar.workTime.byWeekday[wd];
      bands = override ?? (ownWeekdayBands && ownWeekdayBands.length > 0 ? ownWeekdayBands : this.standardWorkdayBands);
    } else if (this.holidaySet.has(formatDate(d))) {
      bands = [];
    } else {
      bands = this.calendar.workTime.byWeekday[wd] ?? [];
    }
    const result = bands.map((b) => ({
      start: dayMs + b.start * _CalendarEngine.MS_PER_MIN,
      end: dayMs + b.end * _CalendarEngine.MS_PER_MIN
    }));
    cache.days.set(dayMs, result);
    return result;
  }
  /** De band die `tMs` bevat, of null. `leftOpen=false` ⇒ voorwaartse conventie `[start,end)`;
   *  `leftOpen=true` ⇒ achterwaartse conventie `(start,end]`. Scant de huidige dag plus twee dagen
   *  terug om de staart van een wrap-band (`end ∈ (1440,2880]`) op te vangen. */
  findContaining(tMs, leftOpen) {
    const day0 = this.dayStartMsOf(tMs);
    for (let k = -2; k <= 0; k++) {
      const dayMs = day0 + k * MS_PER_DAY;
      for (const band of this.bandsStartingOn(dayMs)) {
        const inside = leftOpen ? band.start < tMs && tMs <= band.end : band.start <= tMs && tMs < band.end;
        if (inside) return band;
      }
    }
    return null;
  }
  /** Vroegste bandstart strikt > `tMs` (in ms). Dag-scan vooruit; banden zijn per dag gesorteerd en
   *  dag-starts lopen op, dus de eerste hit is globaal de kleinste. */
  nextBandStartStrictAfter(tMs) {
    let dayMs = this.dayStartMsOf(tMs);
    let scan = 0;
    while (scan <= _CalendarEngine.MAX_SCAN) {
      for (const band of this.bandsStartingOn(dayMs)) {
        if (band.start > tMs) return band.start;
      }
      dayMs += MS_PER_DAY;
      scan++;
    }
    return tMs;
  }
  /** Laatste band-eind ≤ `tMs` (of strikt < bij `strict`), in ms. Dag-scan achteruit; stopt zodra
   *  geen eerdere dag het beste resultaat nog kan verbeteren (max mogelijke eind = dagstart+2880m). */
  prevBandEndBound(tMs, strict) {
    let best = Number.NEGATIVE_INFINITY;
    let dayMs = this.dayStartMsOf(tMs);
    let scan = 0;
    const span = 2880 * _CalendarEngine.MS_PER_MIN;
    while (scan <= _CalendarEngine.MAX_SCAN) {
      if (best !== Number.NEGATIVE_INFINITY && dayMs + span <= best) break;
      for (const band of this.bandsStartingOn(dayMs)) {
        const ok = strict ? band.end < tMs : band.end <= tMs;
        if (ok && band.end > best) best = band.end;
      }
      dayMs -= MS_PER_DAY;
      scan++;
    }
    return best === Number.NEGATIVE_INFINITY ? null : best;
  }
  // ── Instant-vinders ─────────────────────────────────────────────────
  /** t valt binnen een band `[start,end)`. Uur-tegenhanger van `isWorkDay`. */
  isWorkInstant(t) {
    return this.findContaining(t.getTime(), false) !== null;
  }
  /** t als t ∈ `[bandstart, bandeind)`, anders de eerstvolgende bandstart > t. */
  nextWorkInstant(t) {
    const tMs = t.getTime();
    if (this.findContaining(tMs, false)) return new Date(tMs);
    return new Date(this.nextBandStartStrictAfter(tMs));
  }
  /** De eerstvolgende bandstart STRIKT > t (bij band-eindgrens: de volgende band). */
  nextWorkInstantAfter(t) {
    return new Date(this.nextBandStartStrictAfter(t.getTime()));
  }
  /** t als t ∈ `(bandstart, bandeind]`, anders het laatste band-eind ≤ t. Een finish exact op
   *  een band-eind is legitiem en blijft staan (rand `(start,end]`). */
  prevWorkInstant(t) {
    const tMs = t.getTime();
    if (this.findContaining(tMs, true)) return new Date(tMs);
    return new Date(this.prevBandEndBound(tMs, false) ?? tMs);
  }
  /** Begrensde variant voor aanroepers die "geen band gevonden" semantisch moeten onderscheiden
   *  van de bestaande best-effort-terugval op `t`. Dezelfde MAX_SCAN-zoektocht, nooit een tweede lus. */
  prevWorkInstantOrNull(t) {
    const tMs = t.getTime();
    if (this.findContaining(tMs, true)) return new Date(tMs);
    const found = this.prevBandEndBound(tMs, false);
    return found === null ? null : new Date(found);
  }
  /** Het laatste band-eind STRIKT < t. */
  prevWorkInstantBefore(t) {
    const tMs = t.getTime();
    return new Date(this.prevBandEndBound(tMs, true) ?? tMs);
  }
  // ── Minuut-lussen ───────────────────────────────────────────────────
  //
  // SNAP-REGEL OP NIET-WERK-INSTANTS — waarom `addWorkMinutes` en `subtractWorkMinutes` elkaars
  // exacte spiegel zijn, en waar die spiegel schijnbaar (maar niet werkelijk) breekt.
  //
  // Beide lussen normaliseren hun aangrijpingspunt eerst naar een werk-instant, elk IN DE RICHTING
  // VAN DE EIGEN WANDELING: `addWorkMinutes` gebruikt `nextWorkInstant` (vooruit), en
  // `subtractWorkMinutes` gebruikt `prevWorkInstant` (achteruit). Daaruit volgen drie regels die je
  // moet kennen vóór je hier iets aanraakt:
  //
  //  1. Voor elk WERK-instant `t` geldt `subtractWorkMinutes(addWorkMinutes(t, n), n) === t` op de
  //     milliseconde. Dat is geen toevallige eigenschap maar de invariant waarop de backward-pass
  //     van de solver leunt: `LS..LF` moet exact evenveel werktijd overspannen als `ES..EF`.
  //  2. Voor een `t` die GEEN werk-instant is (midden in een weekend, een feestdag of een
  //     aaneengesloten vrij blok van dagen) is er geen ronde-reis-identiteit, en dat is correct:
  //     `add` snapt naar de eerstvolgende bandstart, `sub` naar het laatste band-eind ervóór. De
  //     twee snappunten liggen per definitie aan weerszijden van hetzelfde gat. Een aanroeper die
  //     een niet-werk-instant aanlevert vraagt om een richtingsafhankelijk antwoord en krijgt het.
  //  3. Op een BANDGRENS zijn twee verschillende instants hetzelfde punt op de werk-as: het eind van
  //     de ene band en het begin van de volgende hebben nul werkminuten tussen zich. `sub` levert
  //     daarom een bandstart waar `add` een band-eind levert, zónder dat er werktijd verschilt. De
  //     juiste gelijkheidstest tussen twee posities op de werk-as is `workMinutesBetween(a, b) === 0`,
  //     NIET `a.getTime() === b.getTime()`.
  //
  // Er is GEEN brongebonden uitzondering op die drie regels: P6-vrije dagen worden in de XER-decoder
  // gereconstrueerd (`xerCalendarData.ts`), niet met een asymmetrische wandeling hier.
  // `tests/planning/check-calendar-mirror.ts` pint deze drie regels vast, over een aaneengesloten
  // niet-werkblok van tien dagen, in dag-modus en in uur-modus met 1, 2 en 3 banden per dag.
  /** Tel `minutes` werkminuten op vanaf `startInstant`: verbruik over opeenvolgende banden,
   *  spring bij een bandgrens naar de volgende bandstart. Een verbruik dat exact op een band-eind
   *  landt geeft die eindgrens terug (legitiem finish-moment). `minutes ≤ 0` ⇒ start ongewijzigd
   *  (spiegelt `addWorkDays`' `≤0`-tak, voor mijlpalen). */
  addWorkMinutes(startInstant, minutes) {
    return this.addPhysicalWorkMinutes(startInstant, minutes);
  }
  /** De fysieke bandwandeling. */
  addPhysicalWorkMinutes(startInstant, minutes) {
    if (minutes <= 0) return new Date(startInstant.getTime());
    let remaining = Math.min(minutes, _CalendarEngine.MAX_MINUTES);
    let curMs = this.nextWorkInstant(startInstant).getTime();
    let steps = 0;
    while (remaining > 0) {
      const band = this.findContaining(curMs, false);
      if (!band) break;
      const availMin = (band.end - curMs) / _CalendarEngine.MS_PER_MIN;
      if (remaining <= availMin) {
        curMs += remaining * _CalendarEngine.MS_PER_MIN;
        remaining = 0;
      } else {
        remaining -= availMin;
        curMs = this.nextWorkInstant(new Date(band.end)).getTime();
      }
      if (++steps > _CalendarEngine.MAX_DAYS) break;
    }
    return new Date(curMs);
  }
  /** Trek `minutes` werkminuten af van `endInstant` (spiegel van `addWorkMinutes`). Een
   *  landing exact op een bandstart is legitiem (rand `(start,end]`). */
  subtractWorkMinutes(endInstant, minutes) {
    return this.subtractPhysicalWorkMinutes(endInstant, minutes);
  }
  /** De fysieke achterwaartse bandwandeling. */
  subtractPhysicalWorkMinutes(endInstant, minutes) {
    if (minutes <= 0) return new Date(endInstant.getTime());
    let remaining = Math.min(minutes, _CalendarEngine.MAX_MINUTES);
    let curMs = this.prevWorkInstant(endInstant).getTime();
    let steps = 0;
    while (remaining > 0) {
      const band = this.findContaining(curMs, true);
      if (!band) break;
      const availMin = (curMs - band.start) / _CalendarEngine.MS_PER_MIN;
      if (remaining <= availMin) {
        curMs -= remaining * _CalendarEngine.MS_PER_MIN;
        remaining = 0;
      } else {
        remaining -= availMin;
        curMs = this.prevWorkInstant(new Date(band.start)).getTime();
      }
      if (++steps > _CalendarEngine.MAX_DAYS) break;
    }
    return new Date(curMs);
  }
  /** Getekende werkminuten in `[a,b)` (voor vrije speling). Positief als b>a, negatief als
   *  b<a, 0 als gelijk. */
  workMinutesBetween(a, b) {
    return this.physicalWorkMinutesBetween(a, b);
  }
  /** Fysieke bandminuten in `[a,b)`. */
  physicalWorkMinutesBetween(a, b) {
    const aMs = a.getTime();
    const bMs = b.getTime();
    if (aMs === bMs) return 0;
    const sign = bMs > aMs ? 1 : -1;
    const lo = Math.min(aMs, bMs);
    const hi = Math.max(aMs, bMs);
    let total = 0;
    let dayMs = this.dayStartMsOf(lo) - 2 * MS_PER_DAY;
    let steps = 0;
    while (dayMs < hi) {
      for (const band of this.bandsStartingOn(dayMs)) {
        const s = Math.max(band.start, lo);
        const e = Math.min(band.end, hi);
        if (e > s) total += (e - s) / _CalendarEngine.MS_PER_MIN;
      }
      dayMs += MS_PER_DAY;
      if (++steps > _CalendarEngine.MAX_DAYS) break;
    }
    return sign * total;
  }
  /** Zuivere getekende offset over werkminuten (uur-tegenhanger van `addWorkingDaysSigned`, voor
   *  lag/lead). m=0 ⇒ genormaliseerd naar `nextWorkInstant(t)`; m>0 vooruit, m<0 achteruit. */
  addWorkingMinutesSigned(t, m) {
    const current = this.nextWorkInstant(t);
    if (m === 0) return current;
    return m > 0 ? this.addWorkMinutes(current, m) : this.subtractWorkMinutes(current, -m);
  }
  // ── Cross-modus-primitieven — de solver wisselt hiermee tussen dag- en uur-taken ──
  /** De dag-van-t indien t exact op middernacht valt, anders de volgende dag. Modus-agnostisch
   *  (zuivere datum-rekenkunde): een dag-taak kan niet midden op een dag starten. */
  ceilToWorkDay(t) {
    const tMs = t.getTime();
    const dayMs = this.dayStartMsOf(tMs);
    return new Date(tMs === dayMs ? dayMs : dayMs + MS_PER_DAY);
  }
  /** De exclusieve "beschikbaar-vanaf"-instant die een taak op DEZE engine als VOORGANGER levert
   *  Uur-modus ⇒ de exclusieve finish-instant zelf; dag-modus ⇒ `(ef + 1 dag) @ 00:00` (de
   *  dag-taak bezet zijn hele finish-dag). In een puur dag→dag-net levert de combinatie met
   *  `availableStart` exact `nextWorkDayAfter(ef)` — bit-identiek met het huidige gedrag. */
  predDoneAt(ef) {
    if (this.mode === "hour") return new Date(ef.getTime());
    return new Date(this.dayStartMsOf(ef.getTime()) + MS_PER_DAY);
  }
  /** De ES die een taak op DEZE engine als OPVOLGER consumeert uit een `predDoneAt`-instant.
   *  Uur-modus ⇒ `nextWorkInstant(predDoneAt)`; dag-modus ⇒ `nextWorkDay(ceilToWorkDay(predDoneAt))`. */
  availableStart(predDoneAt) {
    if (this.mode === "hour") return this.nextWorkInstant(predDoneAt);
    return this.nextWorkDay(this.ceilToWorkDay(predDoneAt));
  }
  /**
   * Werk-intervallen (absolute UTC-`Date`-paren, half-open `[start,end)`) die het venster
   * `[from, to]` snijden — voor de balk-opsplitsing/bar-necking in de Gantt. Hergebruikt de
   * op het kalender-object GEMEMOIZEDE band-materialisatie (`bandsStartingOn`), dus geen extra
   * uitrol per frame. Alleen zinvol in uur-modus; een dag-kalender geeft `[]` (dag-taken renderen
   * altijd doorlopend). Scant vanaf de dag vóór `from` om de na-middernacht-staart van een
   * wrap-band (nachtploeg) mee te nemen.
   */
  workIntervalsBetween(from, to) {
    if (this.mode !== "hour") return [];
    const fromMs = from.getTime();
    const toMs = to.getTime();
    if (!(toMs > fromMs)) return [];
    const out = [];
    const lastDay = this.dayStartMsOf(toMs);
    let dayMs = this.dayStartMsOf(fromMs) - MS_PER_DAY;
    let scan = 0;
    while (dayMs <= lastDay && scan <= _CalendarEngine.MAX_DAYS) {
      for (const band of this.bandsStartingOn(dayMs)) {
        const s = Math.max(band.start, fromMs);
        const e = Math.min(band.end, toMs);
        if (e > s) out.push({ start: new Date(s), end: new Date(e) });
      }
      dayMs += MS_PER_DAY;
      scan++;
    }
    out.sort((a, b) => a.start.getTime() - b.start.getTime());
    return out;
  }
  // ── Introspectie voor de memoization-test. Twee engines op hetzelfde kalender-object
  //    delen deze cache-identiteit en teller. In dag-modus is er geen cache (0 / undefined). ──
  /** Aantal dag-materialisaties (cache-misses) op de GEDEELDE kalender-object-cache. */
  materializationCount() {
    return this.bandCache ? this.bandCache.fills : 0;
  }
  /** Identiteit van de gedeelde band-cache (voor een `===`-check tussen twee engines). */
  bandCacheRef() {
    return this.bandCache;
  }
};

// open-vision-studio/tests/planning/check-calendar-arith.ts
var diffs = [];
var checks = 0;
var seed = 1515870810;
var rnd = () => {
  seed = seed + 1831565813 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
var MAX_SCAN = 366;
var MAX_DAYS = 2e5;
function oldAddWorkDaysChecked(e, startDate, workDays) {
  if (workDays <= 0) return { date: new Date(startDate.getTime()), capped: false };
  let current = new Date(startDate.getTime());
  let scan = 0;
  while (!e.isWorkDay(current)) {
    current = addCalendarDays(current, 1);
    if (++scan > MAX_SCAN) return { date: current, capped: true };
  }
  let remaining = workDays - 1;
  let steps = 0;
  while (remaining > 0) {
    current = addCalendarDays(current, 1);
    if (e.isWorkDay(current)) remaining--;
    if (++steps > MAX_DAYS) return { date: current, capped: true };
  }
  return { date: current, capped: false };
}
function oldSubtractWorkDays(e, endDate, workDays) {
  if (workDays <= 0) return new Date(endDate.getTime());
  let current = new Date(endDate.getTime());
  let scan = 0;
  while (!e.isWorkDay(current)) {
    current = addCalendarDays(current, -1);
    if (++scan > MAX_SCAN) return current;
  }
  let remaining = workDays - 1;
  let steps = 0;
  while (remaining > 0) {
    current = addCalendarDays(current, -1);
    if (e.isWorkDay(current)) remaining--;
    if (++steps > MAX_DAYS) break;
  }
  return current;
}
function oldAddWorkingDaysSigned(e, date, n2) {
  let current = e.nextWorkDay(new Date(date.getTime()));
  if (n2 === 0) return current;
  const step = n2 > 0 ? 1 : -1;
  let remaining = Math.abs(n2);
  let guard = 0;
  while (remaining > 0) {
    current = addCalendarDays(current, step);
    if (e.isWorkDay(current)) remaining--;
    if (++guard > MAX_DAYS) break;
  }
  return current;
}
function randomCalendar() {
  const r = rnd();
  const workDays = r < 0 ? [] : r < 0.1 ? [1, 2, 3, 4, 5, 6, 7] : r < 0.2 ? [1, 3, 5] : r < 0.3 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  const holidays = [];
  for (let i = 0; i < Math.floor(rnd() * 8); i++) {
    const start = addCalendarDays(parseDate("2026-01-01"), Math.floor(rnd() * 900));
    holidays.push({ name: "h", startDate: formatDate(start), endDate: formatDate(addCalendarDays(start, Math.floor(rnd() * (rnd() < 0.1 ? 60 : 5)))) });
  }
  const workingExceptions = [];
  for (let i = 0; i < Math.floor(rnd() * 4); i++) {
    const start = addCalendarDays(parseDate("2026-01-01"), Math.floor(rnd() * 900));
    workingExceptions.push({ name: "w", startDate: formatDate(start), endDate: formatDate(addCalendarDays(start, Math.floor(rnd() * 3))) });
  }
  return {
    id: "c",
    name: "c",
    description: "",
    workDays,
    workStartHour: 8,
    workEndHour: 16,
    hoursPerDay: 8,
    holidays,
    ...workingExceptions.length > 0 ? { workingExceptions } : {}
  };
}
var AMOUNTS = () => {
  const r = rnd();
  if (r < 0.03) return NaN;
  if (r < 0.0315) return Infinity;
  if (r < 0.1) return 0;
  if (r < 0.2) return -Math.floor(rnd() * 40);
  if (r < 0.3) return Math.round(rnd() * 20 * 4) / 4;
  if (r < 0.35) return 2e3 + Math.floor(rnd() * 3e3);
  return 1 + Math.floor(rnd() * 60);
};
var n = 0;
{
  const empty = new CalendarEngine({ ...randomCalendar(), workDays: [], workingExceptions: void 0 });
  for (const amount of [3, -3, 0.5]) {
    const d = parseDate("2026-03-02");
    checks += 3;
    if (JSON.stringify(empty.addWorkDaysChecked(d, amount)) !== JSON.stringify(oldAddWorkDaysChecked(empty, d, amount))) diffs.push(`leeg addWorkDaysChecked ${amount}`);
    if (empty.subtractWorkDays(d, amount).getTime() !== oldSubtractWorkDays(empty, d, amount).getTime()) diffs.push(`leeg subtractWorkDays ${amount}`);
    if (empty.addWorkingDaysSigned(d, amount).getTime() !== oldAddWorkingDaysSigned(empty, d, amount).getTime()) diffs.push(`leeg addWorkingDaysSigned ${amount}`);
  }
}
for (let c = 0; c < 200; c++) {
  const e = new CalendarEngine(randomCalendar());
  for (let k = 0; k < 40; k++) {
    const d = addCalendarDays(parseDate("2026-01-01"), Math.floor(rnd() * 900));
    const amount = AMOUNTS();
    n++;
    const a1 = JSON.stringify(e.addWorkDaysChecked(d, amount)), b1 = JSON.stringify(oldAddWorkDaysChecked(e, d, amount));
    const a2 = e.subtractWorkDays(d, amount).getTime(), b2 = oldSubtractWorkDays(e, d, amount).getTime();
    const a3 = e.addWorkingDaysSigned(d, amount).getTime(), b3 = oldAddWorkingDaysSigned(e, d, amount).getTime();
    checks += 3;
    if (a1 !== b1) diffs.push(`addWorkDaysChecked(${formatDate(d)}, ${amount}): ${a1} \u2260 ${b1}`);
    if (!Object.is(a2, b2)) diffs.push(`subtractWorkDays(${formatDate(d)}, ${amount}): ${a2} \u2260 ${b2}`);
    if (!Object.is(a3, b3)) diffs.push(`addWorkingDaysSigned(${formatDate(d)}, ${amount}): ${a3} \u2260 ${b3}`);
  }
}
if (diffs.length === 0) {
  console.log(`OK  calendar-arith: alle checks groen (${checks} over ${n} aanroepen)`);
  process.exit(0);
} else {
  console.log(`XX  calendar-arith: ${diffs.length} afwijking(en) van ${checks}`);
  for (const d of diffs.slice(0, 10)) console.log(`   - ${d}`);
  process.exit(1);
}
