from pathlib import Path
import re
p=Path('src/extensions/builtinExtensions.ts')
s=p.read_text(encoding='utf-8')
s=re.sub(r'stroke="#[0-9a-fA-F]{6}"','stroke="currentColor"',s)
p.write_text(s,encoding='utf-8')
p=Path('src/components/library/ResourcePicker.tsx')
s=p.read_text(encoding='utf-8')
for color in ['#10b981','#8b5cf6','#6b7280']: s=s.replace("'"+color+"'", "'var(--theme-text-secondary)'")
p.write_text(s,encoding='utf-8')
p=Path('src/components/backstage/ExtensionManagerPanel.tsx')
s=p.read_text(encoding='utf-8').replace("'#6b7280'", "'var(--theme-text-secondary)'")
p.write_text(s,encoding='utf-8')
