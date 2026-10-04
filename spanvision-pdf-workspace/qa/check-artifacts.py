from pathlib import Path
from pypdf import PdfReader

root=Path(__file__).resolve().parents[1]
resources=root/'open-pdf-studio/src-tauri/resources'
archive=root/'docs/legal/upstream-templates'
for name in ['detailblad_a3_liggend.pdf','detailblad_a4_liggend.pdf','voorblad_a3_liggend.pdf']:
    original=PdfReader(archive/name).pages[0]
    branded=PdfReader(resources/'kaders'/name).pages[0]
    assert list(branded.mediabox)==list(original.mediabox),name
    for key in ['/VP','/Measure','/UserUnit']:
        if key in original: assert str(branded[key])==str(original[key]),(name,key)
    assert len(branded.get('/Annots',[]))==12,(name,'editable title fields')
    assert 'Spanvision infra' in branded.extract_text(),name

title=PdfReader(resources/'onderhoeken/spanvision.pdf').pages[0]
original=PdfReader(archive/'openaec.pdf').pages[0]
assert list(title.mediabox)==list(original.mediabox)
assert list(title.cropbox)==list(original.cropbox)
assert {a.get_object()['/T'] for a in title['/Annots']}=={a.get_object()['/T'] for a in original['/Annots']}
for pdf in resources.rglob('*.pdf'):
    text='\n'.join(p.extract_text() or '' for p in PdfReader(pdf).pages).lower()
    assert not any(x in text for x in ['openaec','open pdf studio','open\naec']),pdf

saved=PdfReader(root/'qa/verified-save-reopen.pdf')
assert saved.metadata.creator=='pdf workspace · Spanvision infra'
assert saved.metadata.producer=='pdf workspace · Spanvision infra'
annotations=[a.get_object() for a in saved.pages[0]['/Annots']]
assert len(annotations)==2
assert all(list(a['/C'])==[1,0,0] for a in annotations)
stream=saved.pages[0].get_contents().get_data().decode('latin1')
assert '.2 .5 .75 RG' in stream,'original blue document color changed'
assert '.77 .3 .3 RG' in stream,'original red document color changed'
print('Template geometry, scale viewports, 12 editable fields, visible branding, saved metadata and original PDF colors verified.')
