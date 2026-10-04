"""One-time preparation of the imported distribution. Never edits third-party libraries."""
from pathlib import Path
import json, re, os

ROOT = Path(__file__).resolve().parents[1]
def read(path): return (ROOT / path).read_text(encoding='utf-8-sig')
def write(path, value):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(value, encoding='utf-8', newline='\n')
def edit(path, replacements):
    text = read(path)
    for before, after in replacements:
        if before not in text: raise RuntimeError(f'Missing replacement in {path}: {before[:70]}')
        text = text.replace(before, after)
    write(path, text)
def write_json(path, value): write(path, json.dumps(value, ensure_ascii=False, indent=2) + '\n')

write('docs/source-provenance/UPSTREAM_README.md', read('README.md'))
write('NOTICE.md', '''# Source notices\n\nCalc workspace is a Spanvision infra distribution of Open Calc Studio v0.13.0,\nobtained from the user-supplied open-calc-studio-main.zip.\nOriginal project: https://github.com/OpenAEC-Foundation/open-calc-studio\nOriginal authorship and copyright remain with the original contributors.\nThe source archive declares MIT in its package metadata and README but does\nnot contain the linked LICENSE file. This distribution preserves that metadata\nand records the omission; it does not invent a copyright holder or replace\nthird-party notices. See docs/source-provenance/UPSTREAM_README.md.\n\nThe report dependency is OpenAEC reports, revision\n3a5fa40abdb443fc56ab306bbd82b6b0be5f47eb. Its Rust workspace declares MIT;\nits own notices and font licenses remain in libs/openaec-reports.\nOther dependency licenses remain in their packages.\n\nSpanvision infra names, CW assets, and edition UI identify this distribution.\n''')

identity = json.loads(read('brand.json'))
product, organization = identity['product'], identity['organization']
for path in [ROOT / 'src', ROOT / 'mcp-server/src']:
    for file in path.rglob('*'):
        if file.suffix not in {'.ts', '.tsx'} or 'test' in file.parts: continue
        text = file.read_text(encoding='utf-8-sig')
        original = text
        used_brand = False
        # Replace literal producer/application names, including template strings.
        def replace_string(match):
            global used_brand
            token = match.group(0)
            if 'Open Calc Studio' not in token: return token
            used_brand = True
            if token in ["'Open Calc Studio'", '"Open Calc Studio"']: return 'BRAND.product'
            body = token[1:-1].replace('Open Calc Studio', '${BRAND.product}')
            if token[0] != '`': body = body.replace('`', '\\`')
            return '`' + body + '`'
        text = re.sub(r"`(?:\\.|[^`])*`|'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"", replace_string, text)
        text = text.replace('Open Calc Studio', product)
        if used_brand:
            if 'mcp-server' in file.parts:
                module = '../../brand.json'
                text = "import BRAND from '" + module + "';\n" + text
            else:
                module = os.path.relpath(ROOT / 'src/config/brand', file.parent).replace('\\', '/')
                if not module.startswith('.'): module = './' + module
                text = "import { BRAND } from '" + module + "';\n" + text
        if text != original: file.write_text(text, encoding='utf-8', newline='\n')

# Translation placeholders use shared identity, regardless of interface language.
for file in (ROOT / 'src/i18n/locales').rglob('*.json'):
    text = file.read_text(encoding='utf-8-sig')
    text = text.replace('Open Calc Studio', '{{brandProduct}}').replace('OpenAEC Foundation', '{{brandOrganization}}').replace('OpenAEC', '{{brandOrganization}}')
    text = re.sub(r'https?://(?:www\.)?open-aec\.(?:com|org)[^\s"<>]*', '', text)
    data = json.loads(text)
    if file.name == 'settings.json':
        data.setdefault('appearance', {})['spanvisionMono'] = 'Spanvision Mono'
    if file.name == 'backstage.json' and 'aboutPanel' in data:
        data['aboutPanel']['copyright'] = 'License information is retained in NOTICE.md.'
    file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')

edit('src/i18n/config.ts', [('interpolation: { escapeValue: false }', 'interpolation: { escapeValue: false, defaultVariables: { brandProduct: BRAND.product, brandOrganization: BRAND.organization } }')])
write('src/i18n/config.ts', "import { BRAND } from '../config/brand';\n" + read('src/i18n/config.ts'))
edit('src/components/settings/SettingsDialog.tsx', [
    ('const THEME_OPTIONS = [', 'const THEME_OPTIONS = [\n  { value: "spanvision-mono", labelKey: "appearance.spanvisionMono", swatches: ["#000000", "#121212", "#1B1B1B", "#EEEEEE"] },'),
])
text = read('src/components/settings/SettingsDialog.tsx')
text = re.sub(r'function getSystemTheme\(\): string \{.*?\n\}\n\n/\*\*', 'export { applyTheme } from "../../services/theme";\n\n/**', text, count=1, flags=re.S)
text = text.replace('import { setHostAttribute } from "@/lib/hostRoot";', 'import { applyTheme } from "../../services/theme";')
write('src/components/settings/SettingsDialog.tsx', text)
edit('src/utils/settings.ts', [("import { storeGet, storeSet } from './store';", "import { storeGet, storeSet } from './store';\nimport { getInitialTheme, normalizeTheme } from '../services/theme';"), ("theme: 'light'", "theme: 'spanvision-mono'"),
    ('return stored ? { ...defaultSettings, ...stored } : { ...defaultSettings };', 'return { ...defaultSettings, ...stored, theme: normalizeTheme(stored?.theme ?? getInitialTheme()) };')])
text = read('src/state/slices/uiSlice.ts')
text = re.sub(r"export type ThemeName = .*?;", "import type { ThemeName } from '../../services/theme';\nexport type { ThemeName } from '../../services/theme';", text, count=1)
text = text.replace("theme: 'light'", "theme: 'spanvision-mono'")
write('src/state/slices/uiSlice.ts', text)
text = read('src/main.tsx')
text = re.sub(r'// Apply saved theme synchronously.*?// Bewaarde', 'import { applyTheme, getInitialTheme } from "./services/theme";\napplyTheme(getInitialTheme());\n\n// Bewaarde', text, flags=re.S, count=1)
text = text.replace("'#1a1a2e'", "'var(--theme-bg)'").replace("'#e94560'", "'var(--theme-text)'").replace("'#3b82f6'", "'var(--theme-accent)'").replace("color: 'white'", "color: 'var(--theme-accent-text)'")
write('src/main.tsx', text)
edit('src/App.tsx', [
    ('import "./styles/globals.css";', 'import "./styles/globals.css";\nimport "./styles/edition.css";\nimport { getInitialTheme } from "./services/theme";'),
    ('localStorage.getItem("ocs-theme") || "light"', 'getInitialTheme()'),
    ('setRightPanelOpen(showPropertiesPanel);', 'setRightPanelOpen(showPropertiesPanel && window.innerWidth >= 768);'),
])
edit('src/lib/index.tsx', [("theme = 'light'", "theme = 'spanvision-mono'")])
write('src/lib/index.tsx', read('src/lib/index.tsx') + '\n/** Preferred edition names; legacy exports remain available for existing hosts. */\nexport { OpenCalcStudio as CalcWorkspace };\nexport type { OpenCalcStudioProps as CalcWorkspaceProps };\n')

# Complete theme token coverage prevents inherited amber/colored fallbacks.
css = read('src/styles/themes.css')
variables = list(dict.fromkeys(re.findall(r'(--theme-[\w-]+)\s*:', css)))
def token(name):
    if 'shadow' in name: return '0 12px 40px rgba(0,0,0,.5)'
    if 'overlay' in name: return 'rgba(0,0,0,.72)'
    if 'border' in name or 'separator' in name or 'divider' in name or 'vline' in name or name.endswith('-line'): return 'rgba(255,255,255,.16)'
    if 'hover' in name and ('text' in name or 'color' in name or 'icon' in name): return '#FFFFFF'
    if 'hover' in name: return 'rgba(255,255,255,.09)'
    if name in ['--theme-bg', '--theme-titlebar-bg', '--theme-titlebar-bg-start', '--theme-titlebar-bg-end', '--theme-status-bg', '--theme-ribbon-tabs-bg-start', '--theme-ribbon-tabs-bg-end', '--theme-docbar-bg']: return '#000000'
    if name in ['--theme-content-bg', '--theme-canvas', '--theme-grid-regel-bg', '--theme-grid-tekstregel-bg', '--theme-grid-witregel-bg']: return '#1B1B1B'
    if name.endswith('-bg') or name.endswith('-bg-start') or name.endswith('-bg-end') or name in ['--theme-surface', '--theme-app-menu-sidebar', '--theme-bg-lighter', '--theme-scrollbar-track']:
        if 'active' in name or 'selected' in name or 'chapter' in name: return '#333333'
        if 'input' in name or 'header' in name or 'bewakingspost' in name: return '#202020'
        return '#121212'
    if any(part in name for part in ['secondary', 'muted', 'faint', 'disabled', 'shortcut', 'label', 'placeholder', 'empty', 'group-label', 'text-dim']): return '#999999'
    if 'soft' in name or 'tint' in name or name.endswith('-active'): return 'rgba(255,255,255,.12)'
    if 'resize' in name: return 'rgba(255,255,255,.16)'
    if 'scrollbar-thumb' in name: return '#555555'
    return '#EEEEEE'
mapping = {name: token(name) for name in variables}
mapping.update({
    '--theme-accent': '#EEEEEE', '--theme-accent-hover': '#FFFFFF', '--theme-accent-text': '#000000',
    '--theme-focus-color': 'rgba(255,255,255,.75)', '--theme-file-tab-bg': '#EEEEEE', '--theme-file-tab-hover': '#FFFFFF', '--theme-file-tab-text': '#000000',
    '--theme-btn-primary-bg': '#EEEEEE', '--theme-btn-primary-text': '#000000', '--theme-btn-primary-border': '#EEEEEE', '--theme-btn-primary-hover-bg': '#FFFFFF', '--theme-btn-primary-hover-text': '#000000',
    '--theme-dialog-btn-bg': '#EEEEEE', '--theme-dialog-btn-text': '#000000', '--theme-dialog-btn-hover': '#FFFFFF',
    '--theme-grid-active-bg': '#333333', '--theme-grid-active-text': '#FFFFFF', '--theme-grid-input-bg': '#202020', '--theme-chapter-text': '#FFFFFF',
    '--theme-canvas': '#1B1B1B', '--theme-surface-elevated': '#202020', '--theme-border-strong': 'rgba(255,255,255,.6)',
})
css += '\n/* Spanvision Mono: complete semantic UI palette. Document content stays independent. */\n:root:not([data-theme]),\n[data-theme="spanvision-mono"] {\n' + '\n'.join('  '+name+': '+value+';' for name, value in mapping.items()) + '\n  color-scheme: dark;\n}\n'
write('src/styles/themes.css', css)

# Remove hardcoded colored UI accents, while retaining spreadsheet cell formatting,
# user images, rendered model materials, and printable document styling.
ui_colors = {'#D97706':'var(--theme-accent)', '#EA580C':'var(--theme-accent-hover)', '#F59E0B':'var(--theme-accent)', '#d97706':'var(--theme-accent)', '#ea580c':'var(--theme-accent-hover)', '#f59e0b':'var(--theme-accent)', '#ef4444':'var(--theme-danger-color)', '#f87171':'var(--theme-danger-color)', '#4ade80':'var(--theme-text)', '#22c55e':'var(--theme-text)', '#3b82f6':'var(--theme-accent)', '#2563eb':'var(--theme-accent)', '#dbeafe':'var(--theme-hover)', '#eff6ff':'var(--theme-hover)'}
for file in (ROOT / 'src/components').rglob('*'):
    if file.suffix not in {'.tsx', '.css', '.ts'}: continue
    text = file.read_text(encoding='utf-8-sig')
    if file.name not in {'SettingsDialog.tsx', 'SubSheetBorderPicker.tsx'}:
        for before, after in ui_colors.items(): text = text.replace(before, after)
        text = re.sub(r'rgba\(217,\s*119,\s*6,\s*([\d.]+)\)', r'rgba(255,255,255,\1)', text)
    if file.name == 'TitleBar.css': text = re.sub(r'background: linear-gradient\(90deg,.*?\);', 'background: var(--theme-border);', text)
    file.write_text(text, encoding='utf-8', newline='\n')

edit('src/components/welcome/StartSidebar.tsx', [('<h2>{t(\'appName\')}</h2>', '<p className="start-organization">{BRAND.organization}</p>\n            <h2>{BRAND.product}</h2>')])
write('src/components/welcome/StartSidebar.tsx', "import { BRAND } from '../../config/brand';\n" + read('src/components/welcome/StartSidebar.tsx'))
text = read('src/components/backstage/Backstage.tsx')
text = re.sub(r'(<div className="bs-about-logo">)\s*<svg.*?</svg>', r'\1\n          <img src={appIcon} alt={BRAND.initials} />', text, flags=re.S)
text = text.replace('{t("aboutPanel.appName")}', '{BRAND.product}').replace('{t("aboutPanel.companyName")}', '{BRAND.organization}')
write('src/components/backstage/Backstage.tsx', "import { BRAND } from '../../config/brand';\nimport appIcon from '../../assets/app-icon.svg';\n" + text)

# Imported icon paths are bundled for standalone and embedded use.
for name in ['src/components/welcome/StartSidebar.tsx', 'src/components/layout/TitleBar.tsx']:
    text = read(name).replace('src="/app-icon.svg"', 'src={appIcon}')
    text = "import appIcon from '../../assets/app-icon.svg';\n" + text
    write(name, text)

icon = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect x="16" y="16" width="480" height="480" rx="100" fill="#000000" stroke="#666666" stroke-width="8"/><g fill="none" stroke="#FFFFFF" stroke-width="28" stroke-linecap="square" stroke-linejoin="miter"><path d="M206 175H149Q114 175 114 211V301Q114 337 149 337H206"/><path d="M250 175L275 337L318 247L361 337L392 175"/></g></svg>\n'''
write('public/app-icon.svg', icon)
write('src/assets/app-icon.svg', icon)

for name in ['public/data/sample-en.ifcCalc', 'public/data/voorbeeld.ifcCalc']:
    text = read(name).replace('OpenAEC', organization).replace('Open Calc Studio', product)
    write(name, text)
for file in (ROOT / 'tenants').rglob('*'):
    if file.suffix not in {'.typ', '.yaml'}: continue
    text = file.read_text(encoding='utf-8-sig').replace('Open Calc Studio', product)
    text = text.replace('Bouw 1 - Calc workspace voorbeeld huisstijl', organization + ' · ' + product)
    file.write_text(text, encoding='utf-8', newline='\n')

edit('src/services/buildFlags.ts', [("export const OPENAEC_ENABLED = import.meta.env.VITE_OPENAEC_ENABLED === 'true';", 'export const OPENAEC_ENABLED = false;')])
write('.env.development', '# Local-first Spanvision edition\nVITE_OPENAEC_ENABLED=false\n')
write('.env.production', '# Local-first Spanvision edition\nVITE_OPENAEC_ENABLED=false\n')
edit('src/extensions/extensionService.ts', [("const CATALOG_URL =\n  'https://raw.githubusercontent.com/OpenAEC-Foundation/open-calc-studio-extensions/main/catalog.json';", 'const CATALOG_URL = BRAND.extensionCatalogUrl;'), ('const store = useAppStore.getState();\n  const now', 'const store = useAppStore.getState();\n  if (!CATALOG_URL) { store.setCatalog([], Date.now()); store.setCatalogLoading(false); return; }\n  const now')])
write('src/extensions/extensionService.ts', "import { BRAND } from '../config/brand';\n" + read('src/extensions/extensionService.ts'))
edit('src/components/common/FeedbackDialog.tsx', [('const API_URL = "https://open-feedback-studio.pages.dev/api/feedback";', 'const API_URL = BRAND.feedbackUrl;'), ('const APP_ID = "open-calc-studio";', 'const APP_ID = BRAND.appIdentifier;'), ('const canSubmit = isValidEmail', 'const canSubmit = !!API_URL && isValidEmail')])
write('src/components/common/FeedbackDialog.tsx', "import { BRAND } from '../../config/brand';\n" + read('src/components/common/FeedbackDialog.tsx'))
edit('src/components/layout/TitleBar.tsx', [('<button className="send-feedback-btn" onClick={onFeedbackClick}', '<button hidden={!BRAND.feedbackUrl} className="send-feedback-btn" onClick={onFeedbackClick}')])
text = read('src-tauri/src/lib.rs')
text = 'pub mod brand;\n' + text
text = text.replace('format!("Open Calc Studio - {}",', 'format!("{} - {}", brand::PRODUCT,')
text = text.replace('.setup(|app| {', '.setup(|app| {\n      if let Ok(profile) = app.path().app_data_dir() {\n        if let Err(error) = brand::migrate_settings(&profile) { log::warn!("Settings migration: {error}"); }\n      }')
write('src-tauri/src/lib.rs', text)
edit('src-tauri/src/api.rs', [('"title": "Open Calc Studio Local API"', '"title": format!("{} Local API", crate::brand::PRODUCT)')])
edit('src-tauri/Cargo.toml', [('tauri-build = { version = "2.5.6", features = [] }', 'tauri-build = { version = "2.5.6", features = [] }\nserde_json = "1"'), ('description = "A Tauri App"', 'description = "Calc workspace by Spanvision infra"')])
for file in (ROOT / 'src-tauri/src').rglob('*.rs'):
    if file.name in {'brand.rs', 'lib.rs', 'api.rs'}: continue
    text = file.read_text(encoding='utf-8-sig').replace('Open Calc Studio', product)
    if file.name == 'accounts.rs':
        text = text.replace('issuer: "http://kubernetes.docker.internal:8088"', 'issuer: ""').replace('client_id: "376959313182261253"', 'client_id: ""').replace('accounts_api_url: "http://localhost:4000"', 'accounts_api_url: ""')
        text = text.replace('Ingelogd bij OpenAEC', 'Signed in').replace('OpenAEC-portal', 'account portal')
    file.write_text(text, encoding='utf-8', newline='\n')

# Export organization differs from the application product. Keep legacy schema IDs.
for name in ['src/services/ifc/ifcCostGenerator.ts', 'mcp-server/src/index.ts']:
    text = read(name).replace("IFCORGANIZATION($,'${BRAND.product}'", "IFCORGANIZATION($,'${BRAND.organization}'")
    text = text.replace("'${BRAND.product}','OCS')", "'${BRAND.product}','${BRAND.initials}')")
    write(name, text)

for directory in ['docs/api', 'mcp-server', 'packages/embed/example']:
    for file in (ROOT / directory).rglob('*'):
        if file.suffix not in {'.md', '.json', '.html'} or file.name == 'package-lock.json': continue
        text = file.read_text(encoding='utf-8-sig').replace('Open Calc Studio', product).replace('@openaec/open-calc-studio', identity['packageName'])
        if file.name == 'package.json': continue
        file.write_text(text, encoding='utf-8', newline='\n')
for name in ['docs/API.md', 'docs/ifccalc-formaat.md', 'packages/embed/README.md', 'vite.lib.config.ts']:
    text = read(name).replace('Open Calc Studio', product).replace('@openaec/open-calc-studio', identity['packageName'])
    text = re.sub(r'https?://(?:www\.)?(?:open-aec\.com|open-calc-studio\.open-aec\.com)[^\s)>"`]*', '', text)
    write(name, text)
for name in ['packages/embed/example/main.tsx', 'packages/embed/example/vite.config.ts']:
    write(name, read(name).replace('@openaec/open-calc-studio', identity['packageName']))

write('index.html', read('index.html').replace('lang="nl" data-theme="light"', 'lang="en" data-theme="spanvision-mono"').replace('<title>Open Calc Studio</title>', '<title>Calc workspace · Spanvision infra</title>\n    <meta name="description" content="Calc workspace by Spanvision infra. Local construction estimating, spreadsheets, and reports." />'))
for name in ['package.json', 'packages/embed/package.json']:
    data = json.loads(read(name)); data['name'] = identity['packageName']; data['description'] = product + ' by ' + organization + ' — construction estimating workspace'
    for key in ['repository', 'homepage', 'bugs', 'publishConfig']: data.pop(key, None)
    data['keywords'] = ['construction', 'estimating', 'spanvision', 'ifc']
    if name == 'package.json':
        data['scripts'].update({'typecheck': 'tsc --noEmit', 'lint': 'eslint src', 'brand:sync': 'node scripts/sync-brand.mjs', 'brand:validate': 'node scripts/validate-brand.mjs', 'check': 'npm run brand:validate && npm run typecheck && npm run lint && npm test && npm run build'})
        data['scripts']['build'] = 'node scripts/sync-brand.mjs && vite build'
        data['scripts']['dev'] = 'node scripts/sync-brand.mjs && vite --host 127.0.0.1'
        data['scripts']['test'] = 'vitest run --maxWorkers=2'
    write_json(name, data)
data = json.loads(read('mcp-server/package.json')); data['name'] = '@spanvision-infra/calc-workspace-mcp'; data['description'] = product + ' local automation server'; write_json('mcp-server/package.json', data)
data = json.loads(read('src-tauri/tauri.conf.json')); data['productName'] = product; data['mainBinaryName'] = product; data['identifier'] = identity['appIdentifier']; data['app']['windows'][0]['title'] = product
for association in data['bundle']['fileAssociations']:
    association['name'] = association['name'].replace('Open Calc Studio', product)
    association['description'] = association['description'].replace('Open Calc Studio', product).replace('OCS', 'CW')
write_json('src-tauri/tauri.conf.json', data)
print('Prepared Spanvision edition, translations, tokens, packaging, and producer metadata.')
