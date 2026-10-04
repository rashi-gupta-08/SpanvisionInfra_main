from pathlib import Path
import re
root=Path.cwd()
for p in (root/'src/components').rglob('*.css'):
    s=p.read_text(encoding='utf-8')
    def update(m):
        body=m.group(0)
        if re.search(r'background(?:-color)?\s*:\s*var\(--theme-(?:accent|active|danger-color)', body):
            body=re.sub(r'(?<![-\w])color:\s*(?:white|#fff(?:fff)?)(?=\s*[;}])', 'color: var(--theme-accent-text)', body)
        return body
    changed=re.sub(r'\{[^{}]*\}', update, s)
    if s!=changed: p.write_text(changed,encoding='utf-8')
p=root/'src/components/common/QuantityPicker.tsx'
s=p.read_text(encoding='utf-8').replace("color: 'white'", "color: 'var(--theme-accent-text)'")
p.write_text(s,encoding='utf-8')
p=root/'src/components/grid/CodePickerModal.tsx'
s=p.read_text(encoding='utf-8').replace("filter === f ? '#fff'", "filter === f ? 'var(--theme-accent-text)'")
p.write_text(s,encoding='utf-8')
p=root/'src-tauri/src/reports/generator.rs'
s=p.read_text(encoding='utf-8').replace('Some(Color::rgb(254, 243, 199)), // Amber light #FEF3C7','Some(Color::rgb(238, 238, 238)), // Edition grayscale heading')
p.write_text(s,encoding='utf-8')
p=root/'mcp-server/src/index.ts'
s=p.read_text(encoding='utf-8')
if 'interface CostItem {\n  staartBtwBasis?' not in s:
    s=s.replace('interface CostItem {','interface CostItem {\n  staartBtwBasis?: number | null;\n  btwTarief?: \'hoog\' | \'laag\' | null;',1)
p.write_text(s,encoding='utf-8')
