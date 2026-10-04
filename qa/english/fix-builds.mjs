import fs from 'node:fs';
function edit(file,transform) { const old=fs.readFileSync(file,'utf8'); fs.writeFileSync(file,transform(old)); }
const planner='open-vision-studio/src/';
for(const file of ['components/backstage/HelpPanel.tsx','extensions/guideModel.ts','utils/helpArticleRegistry.ts','services/mcp/tools/guideTools.ts']) edit(planner+file,s=>s.replaceAll('"and"',"'en'"));
edit(planner+'components/backstage/HelpPanel.tsx',s=>s.replace('LANGUAGE_LABELS.en[1]','LANGUAGE_LABELS.en![1]').replace(/\s*<button type="button" className="help-stale-btn" onClick=\{\(\) => changeDocsLang\('nl'\)\}>[\s\S]*?<\/button>/,''));
edit(planner+'components/dialogs/CalendarForm.tsx',s=>s.replaceAll('breakChoice ?? "none"',"breakChoice ?? 'geen'"));
edit(planner+'components/dialogs/CalendarGeneratorFields.tsx',s=>s.replace('["none",',"['geen',").replaceAll('value.bouwvak !== "none"',"value.bouwvak !== 'geen'"));
edit(planner+'engine/calendar/generateCalendarHolidays.ts',s=>s.replace('params.bouwvak !== "none"',"params.bouwvak !== 'geen'"));
edit(planner+'engine/renderer/GanttRenderer.ts',s=>s.replace('return "wk"',"return 'week'"));
edit(planner+'extensions/validation.ts',s=>s.replace('"Schedule"',"'planning'"));
edit(planner+'services/csv/csvWriter.ts',s=>s.replaceAll('"Home"',"'Start'"));
edit(planner+'services/mcp/tools/readTools.ts',s=>s.replace('["day", "wk", "month"]',"['dag', 'week', 'maand']"));
edit('vision-calculation-studio/packages/desktop/src/components/calc/ProjectBrowser.tsx',s=>s.replace('["ready", "controleren", "draft"]','["gereed", "controleren", "concept"]').replaceAll('s === "draft"','s === "concept"').replaceAll('s === "ready"','s === "gereed"').replaceAll('nagekeken en vrijgegeven','reviewed and released').replaceAll('gedimd = nog niet nagekeken','dimmed = awaiting review').replaceAll('Klik om toe te voegen aan het project','Click to add to the project').replaceAll('klik om toe te voegen aan het project','click to add to the project').replaceAll('(nog niet beschikbaar)','(not yet available)').replaceAll('Dubbelklik om te hernoemen','Double-click to rename').replace('`"${ex.naam}" uit het project verwijderen?`','`Remove "${ex.naam}" from the project?`'));
edit('vision-calculation-studio/packages/desktop/src/components/calc/projectTree.ts',s=>s.replace('Gecalibreerd — toetsing nagerekend op referentiebladen','Calibrated — calculations verified against reference sheets').replace('Toetsing uitgewerkt, nog niet tegen referentiebladen gecontroleerd','Calculation complete — awaiting verification against reference sheets').replace('Nog uit te werken — alleen invoer en parametrisch beeld, geen toetsing','To be completed — inputs and model view available; calculation pending').replace('Gepubliceerd — nagekeken en vrijgegeven','Published — reviewed and released').replace('Nog niet gepubliceerd — nog niet nagekeken','Unpublished — awaiting review'));
edit('spanvision-geptechniek-workspace/apps/desktop/src/App.tsx',s=>s.replace('action.type === "on"','action.type === "over"').replace('Voor BRO CPT-XML en projectbestanden heb je de desktop-versie nodig.','BRO CPT XML and project files require the desktop application.'));
edit('spanvision-geptechniek-workspace/apps/desktop/src/components/panels/SonderingstekeningView.tsx',s=>s.replace('m === "sondering" ? null : "CPT"','m === "sondering" ? null : "sondering"').replace('p.kind === "bore" ? "bore" : "CPT"','p.kind === "bore" ? "bore" : "sondering"'));
edit('spanvision-pile-plane-workspace/apps/pile-plan-studio/src/i18n/config.ts',s=>s.replace(' showSupportNotice: false,\n',''));
// The restoration audit also found display-only strings: keep these in English.
const codes=new Set(['frame-vision-studio\\ui\\src\\lib\\layout.js','frame-vision-studio\\ui\\src\\lib\\profileContour.js','open-vision-studio\\src\\services\\mcp\\tools\\readTools.ts','open-vision-studio\\src\\services\\updater\\releaseHighlights.ts','vision-calculation-studio\\packages\\desktop\\src\\components\\calc\\ProjectBrowser.tsx','vision-calculation-studio\\packages\\desktop\\src\\components\\calc\\ifcCalcLanguage.ts']);
for(const item of JSON.parse(fs.readFileSync('qa/english/restored-codes.json','utf8'))) {
 if(codes.has(item.file)||item.file.endsWith('GanttRenderer.ts')&&item.to==='week') continue;
 edit(item.file,s=>s.replaceAll(JSON.stringify(item.to),JSON.stringify(item.from)).replaceAll("'"+item.to+"'",JSON.stringify(item.from)));
}
