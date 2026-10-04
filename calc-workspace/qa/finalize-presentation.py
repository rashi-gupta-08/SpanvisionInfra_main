from pathlib import Path
root = Path.cwd()
for relative in ['src/services/print/printService.ts','src/services/print/bouw1PrintService.ts']:
    p=root/relative
    s=p.read_text(encoding='utf-8')
    colors={'#D97706':'#000000','#EA580C':'#333333','#F59E0B':'#555555','#FEF3C7':'#EEEEEE','#FDE68A':'#DDDDDD','#FFFBEB':'#F5F5F5','#16A34A':'#333333','#ef4444':'#555555'}
    for a,b in colors.items(): s=s.replace(a,b)
    s=s.replace('amber primary','monochrome primary').replace('amber accent stripe','grayscale accent stripe')
    p.write_text(s,encoding='utf-8')
p=root/'src/types/costModel.ts'
s=p.read_text(encoding='utf-8').replace('undefined = amber','undefined = monochrome black').replace('("#D97706")','("#000000")')
p.write_text(s,encoding='utf-8')
p=root/'src/components/ribbon/RapportageTab.tsx'
s=p.read_text(encoding='utf-8').replace("schedule.reportHeaderLineColor ?? 'var(--theme-accent)'", "schedule.reportHeaderLineColor ?? '#000000'")
p.write_text(s,encoding='utf-8')
for relative in ['src/components/grid/CodePickerModal.tsx','src/extensions/builtinExtensions.ts']:
    p=root/relative
    s=p.read_text(encoding='utf-8').replace("'#16a34a'", "'var(--theme-accent)'").replace('stroke="#f59e0b"','stroke="currentColor"')
    s=s.replace("color: '#fff'", "color: 'var(--theme-btn-primary-text)'")
    p.write_text(s,encoding='utf-8')
p=root/'src/components/grid/GridCell.tsx'
s=p.read_text(encoding='utf-8').replace("color: item.btwTarief === 'laag' ? '#059669' : '#B45309'", "color: 'var(--theme-text-secondary)'")
p.write_text(s,encoding='utf-8')
p=root/'snap/snapcraft.yaml'
s=p.read_text(encoding='utf-8').replace('open-calc-studio','calc-workspace').replace("version: '0.0.0'", "version: '0.13.0'").replace('4 themes','Spanvision Mono and alternate themes').replace('Spanvision infra-account (OIDC-login, cloud-opslag, AI-assistent)','local API and optional user-configured tools')
s=s.replace('# Versie wordt in CI overschreven met het release-versienummer (zie .github/workflows/snap.yml).','# Distribution version; update with package.json when releasing.')
p.write_text(s,encoding='utf-8')
for p in (root/'docs').rglob('*.md'):
    if 'source-provenance' in p.parts or 'release-notes' in p.parts: continue
    s=p.read_text(encoding='utf-8').replace('Open Calc Studio','Calc workspace')
    s=s.replace('Het extensiesysteem is gemodelleerd naar Open 2D Studio en biedt een plugin-architectuur voor importers, exporters en UI-uitbreidingen.', 'Het extensiesysteem biedt een plugin-architectuur voor lokale importers, exporters en UI-uitbreidingen.')
    s=s.replace('**Catalog URL:** `https://raw.githubusercontent.com/OpenAEC-Foundation/open-calc-studio-extensions/main/catalog.json`','**Catalog:** disabled in this distribution; built-in importers and installed local extensions remain available. Optional service URLs are configured in `brand.json`.')
    p.write_text(s,encoding='utf-8')
p=root/'mcp-server/README.md'
s=p.read_text(encoding='utf-8').replace('"open-calc-studio":','"calc-workspace":')
p.write_text(s,encoding='utf-8')
p=root/'packages/embed/README.md'
s=p.read_text(encoding='utf-8').replace('open-calc-studio-<version>.tgz','spanvision-infra-calc-workspace-<version>.tgz')
p.write_text(s,encoding='utf-8')
