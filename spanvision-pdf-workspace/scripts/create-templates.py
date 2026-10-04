"""Recreate branded stock sheets; preserve paper geometry and scale dictionaries."""
from pathlib import Path
from shutil import copyfile
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from pypdf import PdfReader, PdfWriter
from pypdf.annotations import FreeText
from pypdf.generic import NameObject, TextStringObject, RectangleObject

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'open-pdf-studio'
RESOURCES = APP / 'src-tauri/resources'
ARCHIVE = ROOT / 'docs/legal/upstream-templates'
ARCHIVE.mkdir(parents=True, exist_ok=True)

def mark(c, x, y, size=13):
    c.setFillColorRGB(0, 0, 0)
    c.rect(x, y, size * 2, size * 2, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont('Helvetica-Bold', size)
    c.drawCentredString(x + size, y + size * .7, 'SV')
    c.setFillColorRGB(0, 0, 0)

def titleblock(c, x, y, width=190*mm, height=110*mm):
    c.setStrokeColorRGB(.15, .15, .15)
    c.setLineWidth(.6)
    c.rect(x, y, width, height)
    top = y + height
    mark(c, x+8*mm, top-26*mm, 16)
    c.setFont('Helvetica-Bold', 15)
    c.drawString(x+28*mm, top-13*mm, 'Spanvision infra')
    c.setFont('Helvetica', 8)
    c.drawString(x+28*mm, top-20*mm, 'pdf workspace')
    c.line(x, top-32*mm, x+width, top-32*mm)
    rows = [('PROJECT', 'PROJECT NO'), ('DRAWING', 'ADDRESS'), ('DRAWING NO', 'PHASE'), ('CLIENT', 'STATUS')]
    for index, (label, value) in enumerate(rows):
        rowtop = top - (32+index*14)*mm
        c.setFont('Helvetica', 5.8)
        c.setFillColorRGB(.4, .4, .4)
        c.drawString(x+5*mm, rowtop-4*mm, label)
        c.drawString(x+(110 if index == 1 else 145)*mm, rowtop-4*mm, value)
        c.setFillColorRGB(0, 0, 0)
        c.line(x, rowtop-14*mm, x+width, rowtop-14*mm)
    bottom_top = y+22*mm
    for i, label in enumerate(['SCALE', 'AUTHOR', 'FIRST ISSUE', 'REVISION']):
        colx=x+i*width/4
        if i: c.line(colx, y, colx, bottom_top)
        c.setFont('Helvetica', 5.8)
        c.setFillColorRGB(.4, .4, .4)
        c.drawString(colx+4*mm, y+16*mm, label)
        c.setFillColorRGB(0, 0, 0)
        c.setFont('Helvetica', 8)

def fields(writer, x, y, width=190*mm, height=110*mm):
    # Preserve the editor's FreeText title-block keys rather than flattening values.
    slots = [
        ('projectnaam','Project name',5,67,130), ('projectnr','2026-001',145,67,35),
        ('documenttype','Construction drawing',5,53,95), ('adres','Street, number, city',110,53,75),
        ('kenmerk','SV-2026-001-A100',5,39,130), ('fase','Phase',145,39,35),
        ('opdrachtgever','Client name',5,25,130), ('status','For review',145,25,35),
        ('schaal','1:100',4,8,40), ('auteur','Author name',51,8,40),
        ('datum_eerste','DD-MM-YYYY',99,8,40), ('wijziging','01',147,8,35),
    ]
    for key, value, dx, dy, w in slots:
        rect=(x+dx*mm,y+dy*mm,x+(dx+w)*mm,y+dy*mm+13)
        annotation=FreeText(text=value,rect=rect,font='Helvetica',font_size='9pt',font_color='000000',border_color=None,background_color=None)
        annotation[NameObject('/T')]=TextStringObject(key)
        annotation[NameObject('/NM')]=TextStringObject(key)
        annotation[NameObject('/DA')]=TextStringObject('0 g /Helv 9 Tf')
        writer.add_annotation(0,annotation)

old = RESOURCES / 'onderhoeken/openaec.pdf'
old_reader = PdfReader(old if old.exists() else ARCHIVE / old.name)
width, height = float(old_reader.pages[0].mediabox.width), float(old_reader.pages[0].mediabox.height)
if old.exists(): copyfile(old, ARCHIVE / old.name)
new = RESOURCES / 'onderhoeken/spanvision.pdf'
origin_x, origin_y = float(old_reader.pages[0].mediabox.left), float(old_reader.pages[0].mediabox.bottom)
c=canvas.Canvas(str(new), pagesize=(origin_x+width,origin_y+height))
c.setTitle('Spanvision infra title block'); c.setAuthor('Spanvision infra'); c.setCreator('pdf workspace')
titleblock(c,origin_x,origin_y,width,height); c.save()
writer=PdfWriter();writer.append(str(new))
writer.pages[0].mediabox=RectangleObject([origin_x,origin_y,origin_x+width,origin_y+height])
writer.pages[0].cropbox=RectangleObject([origin_x,origin_y,origin_x+width,origin_y+height])
fields(writer,origin_x,origin_y,width,height)
writer.add_metadata({'/Author':'Spanvision infra','/Creator':'pdf workspace','/Title':'Spanvision infra title block'})
with new.open('wb') as output:writer.write(output)
if old.exists(): old.unlink()

for filename in ['detailblad_a3_liggend.pdf', 'detailblad_a4_liggend.pdf', 'voorblad_a3_liggend.pdf']:
    source=RESOURCES / 'kaders' / filename
    reader=PdfReader(ARCHIVE/filename if (ARCHIVE/filename).exists() else source); page=reader.pages[0]
    w,h=float(page.mediabox.width),float(page.mediabox.height)
    if not (ARCHIVE/filename).exists(): copyfile(source,ARCHIVE / filename)
    c=canvas.Canvas(str(source),pagesize=(w,h))
    c.setTitle('Spanvision infra drawing sheet'); c.setAuthor('Spanvision infra'); c.setCreator('pdf workspace')
    c.setLineWidth(.7); c.rect(10*mm,10*mm,w-20*mm,h-20*mm)
    titleblock(c,w-200*mm,10*mm)
    if filename.startswith('voorblad'):
        c.setFont('Helvetica-Bold',28); c.drawString(25*mm,h-35*mm,'PROJECT TITLE')
        c.setFont('Helvetica',11); c.drawString(25*mm,h-45*mm,'Project overview / Spanvision infra')
    c.save()
    writer=PdfWriter(); writer.append(str(source))
    fields(writer,w-200*mm,10*mm)
    for key in ['/VP','/Measure','/UserUnit']:
        if key in page: writer.pages[0][key]=page[key]
    writer.add_metadata({'/Title':'Spanvision infra drawing sheet','/Author':'Spanvision infra','/Creator':'pdf workspace'})
    with source.open('wb') as output: writer.write(output)

sample=APP / 'public/sample-project.pdf'
c=canvas.Canvas(str(sample),pagesize=(842,595))
c.setTitle('Project 024 - Ground floor'); c.setAuthor('Spanvision infra'); c.setCreator('pdf workspace')
c.setLineWidth(1); c.rect(20,20,802,555)
mark(c,35,530,12); c.setFont('Helvetica-Bold',14); c.drawString(70,544,'Spanvision infra')
c.setFont('Helvetica',8);c.drawString(70,532,'PROJECT 024 / GROUND FLOOR PLAN')
c.setLineWidth(3)
c.rect(110,120,620,365)
for x1,y1,x2,y2 in [(110,330,310,330),(310,330,310,485),(310,235,310,330),(310,235,730,235),(570,235,570,485),(440,120,440,235),(225,120,225,330)]:c.line(x1,y1,x2,y2)
c.setLineWidth(.7);c.rect(145,370,120,75);c.rect(360,350,160,90);c.rect(605,320,90,125)
for x,y,label in [(160,350,'MEETING ROOM'),(365,315,'OPEN WORKSPACE'),(600,290,'PROJECT OFFICE'),(140,210,'LOBBY'),(335,175,'SERVICE')]:
    c.setFont('Helvetica',9);c.drawString(x,y,label)
c.setStrokeColorRGB(.2,.5,.75);c.setFillColorRGB(.2,.5,.75);c.setLineWidth(1)
c.line(110,95,730,95);c.line(110,85,110,105);c.line(730,85,730,105)
c.setFont('Helvetica',9);c.drawCentredString(420,100,'12,400 mm')
c.setStrokeColorRGB(.77,.3,.3);c.setFillColorRGB(.77,.3,.3);c.setDash(4,3);c.ellipse(590,295,715,460)
c.setDash();c.line(710,445,755,495);c.setFont('Helvetica',8);c.drawString(716,504,'Review glazing')
c.setFillColorRGB(.3,.3,.3);c.drawString(35,40,'SV-024 / FOR REVIEW')
c.drawRightString(795,40,'GROUND FLOOR / 1:100 / REV 01')
c.save()
print('Created Spanvision title block, three sheets, and a color-preserving preview fixture.')
for p in [new,sample]+list((RESOURCES/'kaders').glob('*.pdf')):
    text='\n'.join(page.extract_text() or '' for page in PdfReader(p).pages)
    assert not any(value in text.lower() for value in ['openaec','foundation','open\naec']),p
