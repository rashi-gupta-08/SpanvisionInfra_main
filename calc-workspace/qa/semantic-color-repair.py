from pathlib import Path
import re
root=Path.cwd()
# Tokenize remaining semantic UI colors. Document color pickers and model data are untouched.
for p in (root/'src/components').rglob('*.css'):
    s=p.read_text(encoding='utf-8')
    original=s
    if p.name=='ifc.css':
        s=s.replace('rgba(99, 102, 241, 0.15)','var(--theme-reference-selection-bg, rgba(99, 102, 241, 0.15))')
        s=s.replace('rgba(99, 102, 241, 0.3)','var(--theme-reference-selection-border, rgba(99, 102, 241, 0.3))')
        s=s.replace('rgba(129, 140, 248, 0.15)','var(--theme-reference-selection-bg, rgba(129, 140, 248, 0.15))')
        s=s.replace('rgba(129, 140, 248, 0.3)','var(--theme-reference-selection-border, rgba(129, 140, 248, 0.3))')
        for cls,col in [('step-keyword','#7c3aed'),('step-entity-type','#059669'),('step-string','#b45309'),('step-enum','#c2410c'),('step-number','#0891b2'),('json-key','#6366f1')]:
            s=s.replace(f'.{cls} {{ color: {col};', f'.{cls} {{ color: var(--theme-code-text, {col});')
    else:
        # Exact standalone declarations, without nesting fallback var() calls.
        s=re.sub(r'(color|border-color|background):\s*(#(?:dc2626|DC2626|e81123|ff4444))(\s*[;}])', r'\1: var(--theme-danger-color, \2)\3', s)
        s=re.sub(r'(color|border-color|background):\s*(#16A34A)(\s*[;}])', r'\1: var(--theme-success-color, \2)\3', s)
        s=s.replace('border: 1px solid #dc2626;', 'border: 1px solid var(--theme-danger-color, #dc2626);')
        s=s.replace('border: 1px solid #16A34A;', 'border: 1px solid var(--theme-success-color, #16A34A);')
        s=s.replace('background: #fecaca;', 'background: var(--theme-hover-strong, #fecaca);').replace('background: #fef2f2;', 'background: var(--theme-hover, #fef2f2);')
        s=s.replace('background: #b45309;', 'background: var(--theme-accent-hover);')
        s=s.replace('rgba(245, 158, 11, 0.04)', 'var(--theme-accent-subtle, rgba(245, 158, 11, 0.04))')
        s=s.replace('background: rgba(34, 197, 94, 0.08);', 'background: var(--theme-success-bg, rgba(34, 197, 94, 0.08));')
        s=s.replace('background-color: rgba(234, 88, 12, 0.14)', 'background-color: var(--theme-changed-row-bg, rgba(234, 88, 12, 0.14))')
        s=s.replace('background-color: rgba(234, 88, 12, 0.20)', 'background-color: var(--theme-changed-cell-bg, rgba(234, 88, 12, 0.20))')
        s=s.replace('background-color: rgba(59, 130, 246, 0.15)', 'background-color: var(--theme-selection-bg, rgba(59, 130, 246, 0.15))')
        s=s.replace('background-color: rgba(59, 130, 246, 0.25)', 'background-color: var(--theme-selection-strong, rgba(59, 130, 246, 0.25))')
        s=s.replace('background: rgba(59, 130, 246, 0.15)', 'background: var(--theme-selection-bg, rgba(59, 130, 246, 0.15))')
        def contrast(m):
            block=m.group(0)
            if re.search(r'background:\s*var\(--theme-(?:danger|success)-color', block):
                block=re.sub(r'(?<![-\w])color:\s*(?:white|#fff(?:fff)?)(?=\s*[;}])', 'color: var(--theme-accent-text)', block)
            return block
        s=re.sub(r'\{[^{}]*\}',contrast,s)
    if s!=original: p.write_text(s,encoding='utf-8')
p=root/'src/components/offerte/OfferteView.tsx'
s=p.read_text(encoding='utf-8').replace(" : '#dc2626'", " : 'var(--theme-danger-color)'")
p.write_text(s,encoding='utf-8')
