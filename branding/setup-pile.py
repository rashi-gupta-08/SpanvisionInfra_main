"""One-time import adapter. Runtime brand assets are maintained by pile.mjs."""
import json, re, pathlib, hashlib, shutil
root=pathlib.Path(__file__).resolve().parent.parent
module=root/'spanvision-pile-plane-workspace'
app=module/'apps/pile-plan-studio'
def read(p): return p.read_text(encoding='utf-8')
def write(p,s): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf-8')
def patch(p,a,b):
    s=read(p)
    if a not in s: raise RuntimeError(f'Missing edit anchor in {p}: {a[:90]}')
    write(p,s.replace(a,b))
def json_edit(p,fn):
    obj=json.loads(read(p));fn(obj);write(p,json.dumps(obj,ensure_ascii=False,indent=2)+'\n')

# Rebrand owned implementation and maintained product documentation, preserving fixtures.
for base in [app/'src',app/'src-tauri/src',app/'src-tauri/capabilities',module/'crates']:
    for p in base.rglob('*'):
        if not p.is_file() or p.suffix not in ['.ts','.tsx','.rs','.json','.css']:continue
        if '/core/wasm/' in p.as_posix() or '.test.' in p.name:continue
        s=read(p).replace('Open Pile Plan Studio','Pile Plane Workspace').replace('OpenAEC Theme System','Spanvision Theme System')
        write(p,s)
patch(module/'crates/pile-plan-core/src/project.rs','pub(crate) const APPLICATION_NAME: &str = "Pile Plane Workspace";','pub(crate) use crate::brand::APPLICATION_NAME;')
patch(module/'crates/pile-plan-core/src/lib.rs','mod cpt_selection;','mod brand;\nmod cpt_selection;')
patch(app/'src/productInfo.ts','export const PRODUCT_INFO', 'import brand from "./brand.json";\n\nexport const PRODUCT_INFO')
patch(app/'src/productInfo.ts','name: "Pile Plane Workspace"','name: brand.product')
patch(app/'src/productInfo.ts','organization: "OpenAEC Foundation"','organization: brand.organization')
patch(app/'src/app/mcp/protocol.ts','name: "open-pile-plan-studio"','name: "spanvision-pile-plane-workspace"')
patch(app/'index.html','Open Pile Plan Studio','Pile Plane Workspace — Spanvision infra')
patch(app/'index.html','<html','<html data-theme="spanvision-mono" data-canvas-tone="mono"')
patch(app/'src/main.tsx','import "./App.css";','import "./App.css";\nimport "./styles/brand-palette.css";\nimport "./styles/spanvision-workspace.css";')
json_edit(app/'package.json',lambda x:x.update(name='@spanvision-infra/pile-plane-workspace',description='Pile Plane Workspace by Spanvision infra'))
json_edit(app/'package-lock.json',lambda x:(x.update(name='@spanvision-infra/pile-plane-workspace'),x['packages'][''].update(name='@spanvision-infra/pile-plane-workspace')))

settings=app/'src/domain/settings/userSettings.ts'
patch(settings,'theme: string;','theme: string;\n    canvasBackground: "auto" | "light" | "mono";')
patch(settings,'theme: "light",','theme: "spanvision-mono",\n    canvasBackground: "auto",')
patch(settings,'interfaceScalePercent: normalizeInterfaceScale(','canvasBackground: preferences.canvasBackground === "light" || preferences.canvasBackground === "mono" ? preferences.canvasBackground : "auto",\n      interfaceScalePercent: normalizeInterfaceScale(')
patch(app/'src/domain/settings/userSettingsStore.ts','readLegacySetting("theme", "light")','readLegacySetting("theme", "spanvision-mono")')
dialog=app/'src/components/template/settings/SettingsDialog.tsx'
patch(dialog,'const THEME_OPTIONS = [','const THEME_OPTIONS = [\n  { value: "spanvision-mono", labelKey: "appearance.spanvisionMono", swatches: ["#000000", "#121212", "#1B1B1B", "#EEEEEE"] },')
patch(dialog,'theme || "light"','theme || "spanvision-mono"')
patch(dialog,'export function applyTheme(theme?: string) {','import { applyCanvasBackground, type CanvasBackground } from "../../../domain/settings/canvasBackground.ts";\n\nexport function applyTheme(theme?: string) {')
patch(dialog,'theme: string;\n  language:','theme: string;\n  canvasBackground: CanvasBackground;\n  language:')
patch(dialog,'theme: string;\n    language:','theme: string;\n    canvasBackground: CanvasBackground;\n    language:')
patch(dialog,'  theme,\n  language,','  theme,\n  canvasBackground,\n  language,')
patch(dialog,'const [draftTheme, setDraftTheme] = useState(theme);','const [draftTheme, setDraftTheme] = useState(theme);\n  const [draftCanvas, setDraftCanvas] = useState(canvasBackground);\n  const originalCanvas = useRef(canvasBackground);')
patch(dialog,'originalTheme.current = theme;','originalTheme.current = theme;\n      originalCanvas.current = canvasBackground;\n      setDraftCanvas(canvasBackground);')
patch(dialog,'language, open, theme]);','language, open, theme, canvasBackground]);')
patch(dialog,'applyTheme(value);','applyTheme(value);\n    applyCanvasBackground(draftCanvas, value);')
patch(dialog,'applyTheme(originalTheme.current);','applyTheme(originalTheme.current);\n    applyCanvasBackground(originalCanvas.current, originalTheme.current);')
patch(dialog,'applyTheme(draftTheme);','applyTheme(draftTheme);\n    applyCanvasBackground(draftCanvas, draftTheme);')
patch(dialog,'theme: draftTheme,','theme: draftTheme,\n      canvasBackground: draftCanvas,')
patch(dialog,'setDraftTheme("light");\n    applyTheme("light");','setDraftTheme("spanvision-mono");\n    setDraftCanvas("auto");\n    applyTheme("spanvision-mono");\n    applyCanvasBackground("auto", "spanvision-mono");')
patch(dialog,'theme={draftTheme}','canvasBackground={draftCanvas}\n              onCanvasChange={(value) => { setDraftCanvas(value); applyCanvasBackground(value, draftTheme); }}\n              theme={draftTheme}')
patch(dialog,'function AppearanceTabContent({\n  theme,','function AppearanceTabContent({\n  canvasBackground,\n  onCanvasChange,\n  theme,')
patch(dialog,'  theme: string;\n  onThemeSelect:','  canvasBackground: CanvasBackground;\n  onCanvasChange: (value: CanvasBackground) => void;\n  theme: string;\n  onThemeSelect:')
# Last replacement also matched ThemeDropdown; remove the two extra props there.
patch(dialog,'function ThemeDropdown({\n  theme,\n  onThemeSelect,\n}: {\n  canvasBackground: CanvasBackground;\n  onCanvasChange: (value: CanvasBackground) => void;','function ThemeDropdown({\n  theme,\n  onThemeSelect,\n}: {')
patch(dialog,'<ThemeDropdown theme={theme} onThemeSelect={onThemeSelect} />','<ThemeDropdown theme={theme} onThemeSelect={onThemeSelect} />\n      <div className="settings-row"><label htmlFor="canvas-background">{t("appearance.canvas")}</label><select id="canvas-background" value={canvasBackground} onChange={e => onCanvasChange(e.target.value as CanvasBackground)}>{["auto", "light", "mono"].map(value => <option key={value} value={value}>{t(`appearance.canvas_${value}`)}</option>)}</select></div>')

session=app/'src/app/session/AppSession.tsx'
patch(session,'import SettingsDialog,','import { applyCanvasBackground } from "../../domain/settings/canvasBackground.ts";\nimport { useResponsiveWorkspace, WorkspaceNavigation } from "../../components/template/WorkspaceNavigation.tsx";\nimport SettingsDialog,')
patch(session,'const { workspaceLayout } = userSettings.preferences;','const { workspaceLayout } = userSettings.preferences;\n  const responsive = useResponsiveWorkspace();')
patch(session,'applyTheme(settings.preferences.theme);','applyTheme(settings.preferences.theme);\n        applyCanvasBackground(settings.preferences.canvasBackground, settings.preferences.theme);')
patch(session,'data-testid="openaec-shell"','data-testid="spanvision-shell"\n        data-drawer={responsive.drawer || "none"}\n        data-commands={responsive.commands ? "open" : "closed"}')
patch(session,'        <Ribbon\n','        <WorkspaceNavigation controller={responsive} />\n        <Ribbon\n')
patch(session,'{workspaceLayout.explorerVisible && <PilePlanExplorer','{(workspaceLayout.explorerVisible || responsive.narrow) && <PilePlanExplorer')
patch(session,'{workspaceLayout.propertiesVisible && <RightPanel','{(workspaceLayout.propertiesVisible || responsive.phone) && <RightPanel')
patch(session,'<main className="workspace" aria-label="Pile plan workspace">','<main className="workspace" aria-label={t("appName")}>\n            {responsive.drawer && <button className="workspace-drawer-dismiss" aria-label={t("close")} onClick={() => responsive.setDrawer(null)} />}')
patch(session,'theme={userSettings.preferences.theme}','canvasBackground={userSettings.preferences.canvasBackground}\n        theme={userSettings.preferences.theme}')

# Application chrome and engineering drawing remain separate systems.
css=app/'src/components/domain/pile-plan-viewer/viewer.css'
patch(css,'background: #f8fafb;','background: var(--viewer-background, #f8fafb);')
patch(app/'src/components/domain/pile-plan-viewer/useViewerViewport.ts','context.fillStyle = "rgba(163, 174, 181, 0.28)";','context.fillStyle = getComputedStyle(canvas).getPropertyValue("--viewer-grid").trim() || "rgba(163, 174, 181, 0.28)";')
backstage=app/'src/components/template/backstage/Backstage.tsx'
s=read(backstage);s=re.sub(r'<svg\s+viewBox="0 0 1024 1024"[\s\S]*?</svg>','<img src="/ppw-mark.svg" alt="PPW" width="64" height="64" />',s,count=1)
s=re.sub(r'<div className="bs-about-links">[\s\S]*?<div className="bs-about-footer">','<div className="bs-about-links"><a className="bs-about-link" href="/legal/UPSTREAM-NOTICES.md" target="_blank" rel="noopener noreferrer">{t("aboutPanel.notices")}</a></div>\n      <div className="bs-about-footer">',s,count=1)
write(backstage,s)
for lang in ['en','nl']:
    locales=app/'src/i18n/locales'/lang
    def company(x):
        d=x['aboutPanel'];d.update(companyDescription='Engineering workspaces by Spanvision infra.' if lang=='en' else 'Technische werkruimtes van Spanvision infra.',website='',stichting='Spanvision infra',copyright='Spanvision infra · LGPL-3.0-or-later',notices='Open-source Notices' if lang=='en' else 'Open-sourcevermeldingen')
    json_edit(locales/'backstage.json',company)
    def appearance(x):
        x['appearance'].update(dark='Dark' if lang=='en' else 'Donker',spanvisionMono='Spanvision Mono',canvas='Drawing canvas' if lang=='en' else 'Tekencanvas',canvas_auto='Follow theme' if lang=='en' else 'Thema volgen',canvas_light='Light' if lang=='en' else 'Licht',canvas_mono='Monochrome' if lang=='en' else 'Monochroom')
    json_edit(locales/'settings.json',appearance)
    def common(x):
        x.update(workspaceNavigation={'explorer':'Project' if lang=='en' else 'Project','properties':'Properties' if lang=='en' else 'Eigenschappen','commands':'Commands' if lang=='en' else 'Opdrachten'},organization='Spanvision infra')
    json_edit(locales/'common.json',common)
    def feedback(x):
        x.update(submitToGithub='Download feedback report' if lang=='en' else 'Feedbackrapport downloaden',successTitle='Report downloaded' if lang=='en' else 'Rapport gedownload',githubSuccessMessage='The report and selected images are downloaded locally. Nothing is sent online.' if lang=='en' else 'Het rapport en de gekozen afbeeldingen zijn lokaal gedownload. Er wordt niets online verstuurd.',screenshotHint='Included images are downloaded with your report.' if lang=='en' else 'Afbeeldingen worden samen met het rapport gedownload.')
    json_edit(locales/'feedback.json',feedback)
patch(app/'src/components/template/TitleBar.tsx','{t("appName")}','{t("appName")}<small className="titlebar-organization">{t("organization")}</small>')
feedback=app/'src/components/template/feedback/FeedbackDialog.tsx'
s=read(feedback);s=re.sub(r'// ── GitHub target[\s\S]*?async function getAppVersion','async function getAppVersion',s,count=1)
s=re.sub(r'async function openExternal[\s\S]*?const CATEGORIES','function downloadFile(file: Blob, name: string) {\n  const url = URL.createObjectURL(file);\n  const link = document.createElement("a"); link.href = url; link.download = name; link.click();\n  setTimeout(() => URL.revokeObjectURL(url), 30000);\n}\n\nconst CATEGORIES',s,count=1)
s=re.sub(r'  /\*\* Override the default GitHub repo target\. \*/[\s\S]*?githubRepo\?: string;\n','',s,count=1)
s=s.replace('  githubOwner = GITHUB_OWNER,\n  githubRepo = GITHUB_REPO,\n','')
s=s.replace('`**Screenshots:** ${extraImages.length} afbeelding(en) staan op je klembord — plak ze hierboven met **Ctrl+V** voordat je het issue indient.`','`**Images:** ${extraImages.map(file => file.name).join(", ")}`')
s=re.sub(r'      // Place first image[\s\S]*?      setSubmitted\(true\);','      const report = "# Pile Plane Workspace — Spanvision infra\\n\\n" + buildIssueBody(finalImages);\n      downloadFile(new Blob([report], { type: "text/markdown;charset=utf-8" }), "Pile-Plane-Workspace-feedback.md");\n      for (const file of finalImages) downloadFile(file, file.name);\n      setSubmitted(true);',s,count=1)
# re.sub interprets escaped newlines in replacement; restore the JavaScript string.
s=s.replace('const report = "# Pile Plane Workspace — Spanvision infra\n\n"','const report = "# Pile Plane Workspace — Spanvision infra\\n\\n"')
write(feedback,s)

# Preserve upstream material and legal origin while removing promotional defaults.
legal=module/'legal';legal.mkdir(exist_ok=True)
shutil.copyfile(module/'LICENSE',legal/'LGPL-3.0.txt')
write(legal/'UPSTREAM-NOTICES.md','# Open-source Notices\n\nPile Plane Workspace is a modified distribution by Spanvision infra, based on Open Pile Plan Studio 0.4.2 by OpenAEC Foundation.\n\nOriginal copyright and LGPL-3.0-or-later licensing remain in effect. This software is provided without warranty. Recipients may modify and redistribute it under the license terms.\n\nUpstream source: https://github.com/OpenAEC-Foundation/pile-plan-studio\n\nChanges dated 2026-10-03: Spanvision product identity, monochrome chrome, canvas preference, responsive navigation and touch gestures, native preference migration and packaging. Engineering algorithms and contracts are preserved.\n\nThe delivery includes corresponding modified source and build instructions. See LGPL-3.0.txt and GPL-3.0.txt. Original documentation/content notices are retained with source provenance.\n')
write(legal/'SOURCE-PROVENANCE.md',f'# Source provenance\n\nArchive: pile-plan-studio.zip\nSHA-256: {hashlib.file_digest(open("D:/CAD/pile-plan-studio.zip","rb"),"sha256").hexdigest()}\n\nOnly the pile-plan-studio source subtree was imported. Embedded Git repositories, cached builds, dependency installations and the unrelated BIM validator are excluded.\n')
for p in legal.iterdir(): shutil.copyfile(p,app/'public/legal'/p.name) if (app/'public/legal').exists() else None
native=app/'src-tauri/src/main.rs'
patch(native,'.setup(|app| {','.setup(|app| {\n            if let Ok(current) = app.path().app_data_dir() {\n                if let Some(parent) = current.parent() {\n                    if let Err(error) = profile_migration::migrate_preferences(&current, &parent.join("com.openaec.pile-plan-studio")) {\n                        eprintln!("Could not migrate legacy preferences: {error}");\n                    }\n                }\n            }')
write(native,'mod profile_migration;\n'+read(native))
def registry(x):
    x['modules'].append(dict(id='pile',label='Pile Plane Workspace',productName='Pile Plane Workspace',mark='PPW',directory='spanvision-pile-plane-workspace',frontendDirectory='apps/pile-plan-studio',dist='apps/pile-plan-studio/dist',port=4255,path='/',description='Explore pile options, compare foundation plans and optimize assignments using the shared Rust engineering core.'))
json_edit(root/'branding/brand.json',registry)
patch(root/'branding/sync.mjs',"import { syncPointcloud }", "import { syncPile } from './pile.mjs';\nimport { syncPointcloud }")
patch(root/'branding/sync.mjs',"for (const module of selectedModules) {","for (const module of selectedModules) {\n  if(module.id==='pile') {syncPile({root,brand,module,emit});continue;}")
patch(root/'branding/icons.mjs',"import {generatePointcloudIcons}","import {generatePileIcons} from './pile.mjs';\nimport {generatePointcloudIcons}")
patch(root/'branding/icons.mjs',"if(process.argv.includes('--modules=pointcloud'))", "if(process.argv.includes('--modules=pile')) { await generatePileIcons(root,brand.modules.find(module=>module.id==='pile')); process.exit(0); }\nif(process.argv.includes('--modules=pointcloud'))")
patch(root/'branding/icons.mjs',"for(const module of brand.modules) {","for(const module of brand.modules) {\n if(module.id==='pile'){await generatePileIcons(root,module);continue;}")
patch(root/'branding/build.mjs',"if(module.id==='stl') {","if(module.id==='pile') {\n   await run(process.execPath,[path.join(cwd,'tools/build-browser.mjs')],appDirectory(module),'pile-build');\n } else if(module.id==='stl') {")
patch(root/'branding/common.mjs',"if(module.id==='stl') {","if(module.id==='pile') {\n    const inputs=['crates','apps/pile-plan-studio/src','apps/pile-plan-studio/public','apps/pile-plan-studio/src-tauri/src','apps/pile-plan-studio/src-tauri/icons','legal','sample_project','tools'].flatMap(dir=>files(path.join(base,dir)));\n    inputs.push(...['brand.json','Cargo.toml','Cargo.lock','apps/pile-plan-studio/package.json','apps/pile-plan-studio/package-lock.json','apps/pile-plan-studio/vite.config.ts','apps/pile-plan-studio/src-tauri/Cargo.toml','apps/pile-plan-studio/src-tauri/Cargo.lock','apps/pile-plan-studio/src-tauri/tauri.conf.json'].map(name=>path.join(base,name)));\n    for(const file of [...new Set(inputs)].sort())hash.update(path.relative(base,file)).update(fs.readFileSync(file));\n    return hash.digest('hex');\n  }\n  if(module.id==='stl') {")
json_edit(root/'package.json',lambda x:x['scripts'].update({'preview:pile':'node branding/preview-pile.mjs','verify:pile':'node qa/pile/verify.mjs','build:pile:windows':'node branding/native-pile.mjs'}))
patch(root/'suite-hub/src/main.jsx',"['Inspect a pointcloud scan','pointcloud']","['Inspect a pointcloud scan','pointcloud'],['Compare pile plans','pile']")
print('Pile branding, preference and interface adapters applied.')
