from pathlib import Path
import json, subprocess
from pypdf import PdfReader
import pdfplumber
from PIL import Image, ImageOps, ImageDraw
root=Path(__file__).resolve().parent.parent
out=root/'qa/geotechniek/backend'
poppler=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe'
rendered=out/'rendered';rendered.mkdir(parents=True,exist_ok=True)
results=[]
for name in ['single-cpt','multiple-cpt','tenant-report']:
    pdf=out/(name+'.pdf');reader=PdfReader(pdf)
    texts=[page.extract_text() or '' for page in reader.pages]
    text='\n'.join(texts)
    assert 'Spanvision infra' in text,(name,'organization missing')
    assert 'OpenAEC' not in text and 'Open Geotechniek Studio' not in text,(name,'upstream presentation')
    assert 'QA customer' in text,(name,'customer lost')
    assert reader.metadata.get('/Creator')=='geptechniek workspace · Geotechniek',(name,reader.metadata)
    assert reader.metadata.get('/Producer')=='Spanvision infra',(name,reader.metadata)
    if name=='tenant-report':
        assert 'QA customer' in texts[0], 'Tenant cover must be the first page'
        assert 'Customer content' in texts[1], 'Tenant content must be a distinct page'
        assert texts[0]!=texts[1], 'Repeated tenant page'
        assert 'José · λ' in texts[1], 'Unicode customer text lost'
    with pdfplumber.open(pdf) as measured:
        for page_index,page in enumerate(measured.pages):
            for char in page.chars:
                assert -1 <= char['x0'] and char['x1'] <= page.width+1,(name,page_index+1,'horizontal text clipping',char['text'],char['x0'],char['x1'])
    (out/(name+'-text.txt')).write_text(text,encoding='utf-8')
    for previous in rendered.glob(name+'-*.png'): previous.unlink()
    for previous in rendered.glob(name+'-contact-*.jpg'): previous.unlink()
    process=subprocess.run([str(poppler),'-r','85','-png',str(pdf),str(rendered/name)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    warnings=process.stderr.decode('utf-8',errors='replace')
    # The bundled Windows Poppler lacks these two display-font aliases.
    # Keep that environment warning visible and reject PDF syntax/font errors.
    environment_warnings=[line for line in warnings.splitlines() if line in ["Syntax Error: No display font for 'Symbol'","Syntax Error: No display font for 'ArialUnicode'"]]
    errors=[line for line in warnings.splitlines() if line.strip() and line not in environment_warnings]
    assert not errors,(name,'PDF renderer errors',errors)
    images=sorted(rendered.glob(name+'-*.png'),key=lambda p:int(p.stem.rsplit('-',1)[-1]))
    assert len(images)==len(reader.pages)
    for offset in range(0,len(images),8):
        group=images[offset:offset+8];sheet=Image.new('RGB',(1280,480*((len(group)+3)//4)), '#dddddd');draw=ImageDraw.Draw(sheet)
        for i,file in enumerate(group):
            img=Image.open(file).convert('RGB');thumb=ImageOps.contain(img,(310,440));x=(i%4)*320+(320-thumb.width)//2;y=(i//4)*480+25
            sheet.paste(thumb,(x,y));draw.text(((i%4)*320+8,(i//4)*480+7),file.stem,fill='#111111')
        sheet.save(rendered/(name+'-contact-'+str(offset//8+1)+'.jpg'))
    results.append({'report':name,'pages':len(reader.pages),'creator':reader.metadata.get('/Creator'),'producer':reader.metadata.get('/Producer'),'allPagesRendered':True,'textWithinPageWidth':True,'rendererErrors':0,'rendererEnvironmentWarnings':environment_warnings})
(out/'pdf-results.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
print(json.dumps(results,indent=2))
