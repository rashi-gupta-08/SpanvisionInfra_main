from pypdf import PdfReader
from pathlib import Path
import json
p=PdfReader('output/pdf/sample-estimate.pdf')
text='\n'.join(page.extract_text() or '' for page in p.pages)
r={'pages':len(p.pages),'has_estimate_data':'Earthworks' in text and '40,562' in text,'no_inherited_presentation':'Open Calc Studio' not in text and 'OpenAEC' not in text,'has_spanvision_footer':'Spanvision infra' in text,'text_characters':len(text)}
Path('qa/pdf-results.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8')
print(r)
print(text[-650:])
