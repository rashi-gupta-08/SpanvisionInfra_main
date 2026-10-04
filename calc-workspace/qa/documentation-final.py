from pathlib import Path
import json
p=Path('packages/embed/README.md')
s=p.read_text(encoding='utf-8').replace('OpenCalcStudio','CalcWorkspace').replace('theme="light"','theme="spanvision-mono"').replace('default `light`','default `spanvision-mono`')
s=s.replace('`light` \\| `dark`', '`spanvision-mono` \\| `light` \\| `dark`')
s+='\n## Compatibility and notices\n\n`OpenCalcStudio` and `OpenCalcStudioProps` remain aliases for compatibility. New integrations should use `CalcWorkspace` and `CalcWorkspaceProps`. Existing technical schema and storage identifiers are retained. Source attributions are in `NOTICE.md`; inherited cloud and catalog endpoints are disabled in this edition.\n'
p.write_text(s,encoding='utf-8')
p=Path('NOTICE.md')
s=p.read_text(encoding='utf-8').replace('The source archive declares MIT in its package metadata and README but does','The source archive declares MIT in its embed package metadata and README but does')
p.write_text(s,encoding='utf-8')
p=Path('packages/embed/package.json')
s=json.loads(p.read_text(encoding='utf-8'))
s['files']=['dist','README.md','NOTICE.md','FONT_NOTICES.md']
p.write_text(json.dumps(s,indent=2)+'\n',encoding='utf-8')
