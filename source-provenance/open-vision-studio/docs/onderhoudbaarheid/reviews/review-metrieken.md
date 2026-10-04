# Hyperkritische review — deelrapport codemetrieken & dependencies

Fundamenteel gezond: de meetbare kern van dit rapport reproduceert bijna overal exact, en dat is meer dan ik verwachtte. Maar het zwaarste structurele voorstel rust op een verkeerd gelezen commentaarregel, en twee headline-getallen zijn opgeklopt op precies de manier die prioritering scheeftrekt.

## Wat er stuk is

**1. [BEVESTIGD] Bevinding #2 — het Draw2D-voorstel staat op zijn kop, en de geciteerde regel zegt letterlijk het tegenovergestelde.**
Het rapport stelt: *"Laat `GanttRenderer` op de `Draw2D`-abstractie draaien (daar expliciet voor gebouwd, zie `draw2d.ts:8`)"*. `src/services/pdf/draw2d.ts:1-10` zegt: *"de gesloten teken-abstractie waar de **print-renderer** (`printPreview.ts`) tegenaan tekent"* en *"De vorm is bewust minimaal en vast: **exact de primitieven die `printPreview.ts` gebruikt**."* Draw2D is gebouwd vóór printPreview, niet voor GanttRenderer, en is met opzet dichtgetimmerd.

En het is niet alleen een misgelezen zin. Ik heb de primitieven geteld die `GanttRenderer.ts` uit `ctx` trekt tegen `Draw2D`'s interface (`draw2d.ts:15-40`). Ontbrekend: `arc`, `clip`, `createPattern`, `globalAlpha`, `rect`, `save`, `restore`, `rotate`, `translate`. Negen stuks — waarvan `createPattern`, `clip` en `globalAlpha` in een pdf-lib-vectorbackend geen triviale toevoegingen zijn. Het rapport verkoopt dit als "de abstractie bestaat al, sluit hem aan" terwijl het in werkelijkheid betekent: Draw2D uitbreiden met transform-stack, clipping en alpha, en dat in twee backends implementeren. Dat is een ander project.

Fix: schrap de bewering dat Draw2D hiervoor gebouwd is, en herformuleer als "Draw2D uitbreiden met 9 primitieven + transform-stack, dan pas convergeren" — of val terug op het eigen minimumvoorstel (gedeelde constanten + `timelineTiers` + `getWeekNumberFor`), dat wél deugt.

**2. [BEVESTIGD] Bevinding #2, derde bullet — de "hardgecodeerde Nederlandse maandnamen" zijn een onbereikbare fallback.**
`printPreview.ts:677` is `options.localizedMonths ?? ['januari', …]`. De enige aanroeper van `renderPrintCanvas`/`renderReport` is `ReportPanel.tsx:4`, en die zet `localizedMonths: getLocalizedMonths(locale)` op `ReportPanel.tsx:178`. Altijd. Er is geen pad waarop die Nederlandse array ooit getekend wordt. Erger: `GanttRenderer.ts:788` doet exact hetzelfde met een Engelse fallback — het rapport pakt printPreview op een patroon dat het bij de renderer stilzwijgend accepteert. Dit hoort dode-code-opruiming te zijn, geen i18n-defect in een lijst met HOOG-ernst-bewijs.

De wéérgave-claim in dezelfde bullet is wél hard: `PrintOptions` (`printPreview.ts:63-92`) heeft geen `weekStartDay`-veld, `printPreview.ts:689` roept `getWeekNumber(date)` (ISO-maandag, `dateUtils.ts:113`), en `GanttRenderer.ts:794` roept `getWeekNumberFor(d, weekStartDay)`. De instelling bestaat en is bedienbaar (`settingsRegistry.ts:115`, `SettingsPanelContent.tsx:303`). Print negeert hem. [BEVESTIGD] — en dát is de bullet die het rapport had moeten uitvergroten in plaats van de maandnamen.

**3. [BEVESTIGD] Bevinding #7 — "88 nl-strings zijn nog Engels" is een naïeve string-vergelijking, geen defectenteller.**
88/1124 klopt exact. Maar de lijst bestaat grotendeels uit woorden die in beide talen hetzelfde zijn: `"OK"`, `"#"`, `"Type"`, `"Start"`, `"Status"`, `"WBS"`, `"Resources"`, `"Benchmark"`, `"Histogram"`, `"Planning"`, `"IFC"`, `"d"`, `"Open Planner Studio"`, `"{{count}} d"`. Echt vertaalbaar: hooguit vijftien à twintig (`"Constraint"`, `"Activity codes"`, `"Retained Logic"`, `"Progress Override"`, `"Split view"`, `"Feature request"`, `"Mismatch"`, `"Variance"`).

De vergelijking *"8%, vs 2-4% bij andere locales"* is onjuist. Zelf gemeten tegen `en`: nl 7,8% · **fr 7,3%** · **de 5,8%** · es 4,3% · it 3,9% · pt 3,9% · pl 3,6% · tr 2,3%. Frans zit vrijwel gelijk. Het voorstel — drempel-assert — is op deze metriek een vals-positieven-machine (faalt permanent op `"OK"`). Borging vereist een allowlist voor bewust-identieke sleutels; dát is de kern van het werk.

**4. [BEVESTIGD] Bevinding #10 — "er bestaat geen toast/notify in state/UI" is onjuist; er ligt er één, ongebruikt door het I/O-pad.**
`GanttCanvas.tsx:59` (`interface ToastState`), `:174`, `:296` (CPM-cyclusfout), `:1390`, `:1478-1484` (render met `.gantt-toast`/`toast-error`/`toast-info`). Er ís een werkende toast met foutvariant — alleen lokaal in het canvas-component en voor `fileSlice` onbereikbaar.

Het substantiële punt overleeft — de catches op `fileSlice.ts:179-181, 299-301, 377-379, 400-402` gaan allemaal naar `console.error` (zelf gecontroleerd), en `alert()` staat alleen op `IFCPanel.tsx:54`. Maar de fix verandert: hijs het bestaande, gestylede toast-mechanisme naar `uiSlice` en sluit het I/O-pad erop aan; bouw geen tweede implementatie.

**5. [BEVESTIGD] Bevinding #11 mist de bijwerking die het voorstel breekt: recente bestanden.**
De home-permissies kloppen (`fs:allow-home-read-recursive` + `fs:allow-home-write-recursive`, zelf gelezen). Maar `recentFiles.ts:6-11` bewaart `ref: FileRef` als `{kind:'path', path}` in IndexedDB, persistent over sessies, en `openRecentFile` gaat via `tauriBackend.ts:38-39` → `readTextFile(ref.path)` — **zonder dialoog**. Runtime-scope uit een vorige sessie bestaat niet meer. Schrap je `fs:allow-home-read-recursive`, dan valt de complete MRU-lijst op Tauri om.

Bovendien klopt het extensie-mechanisme niet zoals beschreven: `withGlobalTauri` staat **niet** in `tauri.conf.json`, dus `window.__TAURI__` bestaat niet, en `require()` in de sandbox geeft alleen `'open-planner-studio'` terug. Een extensie kan `@tauri-apps/plugin-fs` niet importeren. Wat hij wél kan: via `new Function` in dezelfde realm `window.__TAURI_INTERNALS__.invoke('plugin:fs|write_text_file', …)` aanroepen. Zelfde conclusie, ander gat — en een hefboom die het rapport mist: internals afschermen/bevriezen vóór extensie-uitvoering.

**6. [BEVESTIGD] Meerdere getallen in bevinding #1 kloppen niet.**
`GanttCanvas.tsx`: geclaimd **71** `useAppStore`-selectors; werkelijk 60 × `useAppStore(` en 10 × `useAppStore.` (`getState()`) — en die tien zijn geen selectors (abonneren niet; `useShallow`-voorstel raakt ze niet). `useState` is **8**, niet 9. `useEffect` 8 ✓, `useCallback` 14 ✓, `useMemo` 12 ✓, functie `:64`–`:1489` = 1426 regels ✓.

**7. [BEVESTIGD] Churn-methodiek staat er niet bij; de voor de hand liggende reproductie geeft andere getallen.**
`git log --oneline -- <pad>` geeft 15/12/9/4 waar het rapport 16/14/11/11 claimt. Pas met `--no-merges --full-history` komt álles exact uit. Zet het commando erbij, anders faalt elke spot-check.

**8. [BEVESTIGD] Kleinere onnauwkeurigheden.**
- "Enige binaire bestand in `src/`": nee — vier `.ttf`'s en `hb-subset.wasm` zijn ook binair; het is het enige binaire *TypeScript*-bestand. Het NUL-byte-feit zelf is keihard (`rg` vindt `NONE_RAWKEY` niet, GNU grep wel).
- "TODO/FIXME/HACK/XXX = 0": er zijn 6 grep-treffers — allemaal verwijzingen naar `docs/TODO.md`, geen markers. Conclusie klopt, getal niet.
- "102 identieke regels (27%)": niet reproduceerbaar (`comm -12` geeft 166; 102/609=17%). Noemer ontbreekt.
- "401 en 361 regels": `readMSPDI` is 361; het 401-getal/paring onduidelijk.
- "Alle `@tauri-apps/*` actueel": op majorniveau ja, maar patch-achterstanden bestaan; ook gemist: tailwindcss 4.2.0→4.3.3, immer, zustand.

**9. [VERMOED · midden] De postcss-CVE is geen "high" voor dít project.**
Audit-output klopt exact, maar postcss is een devDependency en het lek betreft source-map-loading; feitelijke exploiteerbaarheid nagenoeg nul. Als hygiëne prima; als risicopost naast "gebruiker ziet fout-bij-opslaan niet" misleidend. `autoprefixer` als spookdependency is wél hard bevestigd.

**10. [BEVESTIGD] Gemist, en het lag in de eigen data: `CLAUDE.md` is verouderd (395/21 vs werkelijk 431/22).**

## Wat wél gewoon klopt
Zelf nagerekend en exact: 249 bestanden / 49.860 regels / Rust 83; de complete top-15; de mappenverdeling; 0 `: any`, 0 `as any`, 15 `as unknown as`, 1 `@ts-expect-error`; 106 catches waarvan 6 leeg (alle in appLog); 56 `console.*`; alle major-achterstanden; alle negen dode exports; MenuBar-historie (`17f25f9` "verwijderd" → `ad1e6e7` her-toegevoegd); run.sh-cijfers; geen lint/audit in ci.yml. Bevindingen #3, #4, #8, #9, #13 zijn schoon.

## Kon ik niet controleren
- "141 exports / 103 onnodig geëxporteerd" — [VERMOED · midden], methode niet opgegeven; de 9 harde dode wél bevestigd.
- "31 exacte 10-regel-clones" — [VERMOED · laag], geen tool/methode.
- Tauri 2 runtime-scope-gedrag van de dialog-plugin — plugin-bron niet gelezen; dat het recente-bestanden-pad geen dialoog gebruikt is genoeg om het voorstel te blokkeren.
- Of `npm audit fix` de lock echt naar ≥8.5.18 tilt — niet gedraaid.

## Poortoordeel
**Voorwaardelijk door — niet in deze vorm.** Minimaal vóór doorgang: (1) bevinding #2 herschrijven (Draw2D-claim schrappen, 9 ontbrekende primitieven noemen, maandnamen degraderen tot dode fallback, weekstart-bug promoveren); (2) bevinding #7 herijken (identieke-woorden-filter, fr/de-percentages corrigeren, allowlist i.p.v. kale drempel); (3) bevinding #11 aanvullen met het recentFiles-brekende effect en het juiste extensie-mechanisme (`__TAURI_INTERNALS__`); (4) bevinding #10 corrigeren (bestaande toast hijsen, niet nieuw bouwen); (5) cijfers rechtzetten (60 selectors, 8 useState, TODO-teller, "enige binaire TS-bestand", duplicatieclaim); (6) churn-commando documenteren. Punten #1 en #7 uit het rapport, plus #3, #4, #8, #9 en #13, mogen direct de backlog in.
