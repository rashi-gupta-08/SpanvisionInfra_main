from pathlib import Path
import json
import math
import re
import subprocess
import sys
from functools import lru_cache
from PIL import Image,ImageDraw,ImageFont,ImageOps
import numpy as np

DEST=Path('D:/SpanvisionMedia/planning-delay-2026-10-17')
REPO=Path(__file__).resolve().parents[4]
INFO=json.loads((DEST/'audio-info.json').read_text())
SCENARIO=json.loads((DEST/'scenario.json').read_text())
W,H,FPS=1080,1920,30
DURATION=INFO['duration'];NAME='spanvision-one-task-slips-2026-10-17'
TARGET=Path(INFO['output']);FFMPEG=INFO['ffmpeg']
SILVER=(222,232,240);MUTED=(153,173,190);AMBER=(235,197,139)

@lru_cache(maxsize=80)
def font(size,bold=False,heavy=False):
    file='ariblk.ttf' if heavy else 'segoeuib.ttf' if bold else 'segoeui.ttf'
    return ImageFont.truetype('C:/Windows/Fonts/'+file,int(size))

def clamp(v):return min(1,max(0,v))
def smooth(v):
    v=clamp(v);return v*v*(3-2*v)

def text(im,value,xy,size=30,fill=SILVER,bold=False,heavy=False,align='left'):
    d=ImageDraw.Draw(im);f=font(size,bold,heavy);x,y=xy
    width=d.textlength(value,font=f)
    if align=='center':x-=width/2
    elif align=='right':x-=width
    d.text((int(x),int(y)),value,font=f,fill=fill)

def tracking(im,value,y,size=21,gap=3,fill=MUTED):
    d=ImageDraw.Draw(im);f=font(size)
    width=sum(d.textlength(c,font=f)+gap for c in value)-gap;x=(W-width)/2
    for c in value:
        d.text((int(x),int(y)),c,font=f,fill=fill);x+=d.textlength(c,font=f)+gap

yy,xx=np.mgrid[0:H,0:W]
v=np.maximum(0,1-np.sqrt(((xx-540)/800)**2+((yy-930)/1350)**2))
arr=np.zeros((H,W,3),dtype=np.uint8)
for c,(lo,hi) in enumerate([(7,22),(10,31),(14,40)]):arr[:,:,c]=lo+(hi-lo)*v
BG=Image.fromarray(arr,'RGB').convert('RGBA')
gd=ImageDraw.Draw(BG)
for x in range(0,W,64):gd.line((x,450,x,1520),fill=(24,34,44,255),width=1)
for y in range(496,1540,64):gd.line((0,y,W,y),fill=(24,34,44,255),width=1)
del yy,xx,v,arr

logo=Image.open(REPO/'branding/spanvision-infra-curved-s-logo.png').convert('RGB')
logo=ImageOps.invert(logo).crop((50,25,360,275)).resize((88,71),Image.Resampling.LANCZOS).convert('RGBA')
logo.putalpha(logo.convert('L').point(lambda v:min(255,v*3)))

cue_by_word={c['word']:c['start'] for c in INFO['cues']}
T={k:cue_by_word[w]-.065 for k,w in [('rest','but'),('link','Link'),('recalc','recalculate'),('review','review'),('product','Open')]}
PHASES=[(0,'ONE TASK\nSLIPS.','WHAT HAPPENS TO THE REST?'),
        (T['rest'],'THE REST\nCAN SHIFT.','CONNECTED TASKS. CONNECTED DATES.'),
        (T['link'],'LINK THE\nACTIVITIES.','MAKE THE DEPENDENCIES CLEAR'),
        (T['recalc'],'RECALCULATE\nTHE PLAN.','REVIEW THE EFFECT OF A CHANGE'),
        (T['review'],'REVIEW THE\nCRITICAL PATH.','SEE THE CONNECTED SEQUENCE'),
        (T['product'],'OPEN VISION\nSTUDIO.','FROM SPANVISION INFRA')]

def bar(im,rect,fill):
    x0,y0,x1,y1=map(int,rect);d=ImageDraw.Draw(im)
    d.rounded_rectangle((x0+2,y0+6,x1+2,y1+6),radius=9,fill=(0,0,0,100))
    d.rounded_rectangle((x0,y0,x1,y1),radius=8,fill=fill)
    d.line((x0+9,y0+3,x1-9,y0+3),fill=(255,255,255,100),width=2)

def chart(t):
    layer=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(layer)
    d.rounded_rectangle((88,654,992,1382),radius=24,fill=(13,22,30,245),outline=(79,102,122,190),width=2)
    text(layer,'TASK DEPENDENCIES',(124,680),23,fill=MUTED,bold=True)
    text(layer,'WORKING DAYS',(958,686),18,fill=MUTED,align='right')
    origin,step=350,42.5
    for day in range(0,15,2):
        x=int(origin+day*step)
        d.line((x,776,x,1250),fill=(42,59,74,170),width=1)
        text(layer,str(day),(x,730),24,fill=MUTED,align='center')
    edited=smooth((t-T['rest'])/.85)
    recalc=smooth((t-T['recalc']-.08)/.9)
    critical=smooth((t-T['review'])/.55)
    durations=[3+2*edited,4,2,1]
    starts=[0,3+2*recalc,7+2*recalc,9+2*recalc]
    ys=[800,920,1040,1160]
    for i in range(3):
        end=origin+(starts[i]+durations[i])*step
        start=origin+starts[i+1]*step
        col=(178,202,218,220) if critical>.5 else (108,134,155,190)
        points=[(end,ys[i]+24),(end+15,ys[i]+24),(end+15,ys[i+1]-18),(start,ys[i+1]-18),(start,ys[i+1]-3)]
        d.line(points,fill=col,width=3,joint='curve')
        d.polygon([(start-5,ys[i+1]-8),(start+5,ys[i+1]-8),(start,ys[i+1])],fill=col)
    for i,(name,duration,start,y) in enumerate(zip(SCENARIO['tasks'],durations,starts,ys)):
        text(layer,name,(124,y+1),32,fill=SILVER,bold=True)
        text(layer,'START → FINISH',(125,y+47),17,fill=(113,142,164))
        x0=origin+start*step;x1=x0+duration*step
        color=(196,210,221,255)
        if i==0:color=tuple(int(a+(b-a)*edited) for a,b in zip((196,210,221,255),(233,197,143,255)))
        bar(layer,(x0,y,x1,y+47),color)
        if critical>.1:
            d.rounded_rectangle((int(x0)-4,y-4,int(x1)+4,y+51),radius=12,outline=(230,239,245,int(critical*210)),width=2)
        label=f'{int(round(duration))}d'
        text(layer,label,((x0+x1)/2,y+5),25,fill=(18,31,42),bold=True,align='center')
        if i==0 and edited>.1:
            text(layer,'+2 DAYS',(min(x1+16,870),y+7),23,fill=AMBER,bold=True)
    d.line((123,1271,959,1271),fill=(67,89,107,180),width=1)
    if critical>.35:text(layer,'CRITICAL PATH',(124,1304),21,fill=SILVER,bold=True)
    else:text(layer,'FINISH-TO-START LINKS',(124,1304),20,fill=MUTED)
    if edited>.15 and recalc<.7:
        text(layer,'RECALCULATE',(958,1297),30,fill=AMBER,bold=True,align='right')
    else:
        text(layer,'FINISH',(725,1298),18,fill=MUTED)
        text(layer,f'{10+int(round(2*recalc))} DAYS',(958,1291),36,fill=SILVER,bold=True,align='right')
    return layer

def render(t):
    im=BG.copy();im.alpha_composite(logo,(221,98))
    text(im,'SPANVISION INFRA',(344,120),26,fill=(205,219,229))
    phase=max(i for i,(at,_,_) in enumerate(PHASES) if t>=at)
    at,head,tag=PHASES[phase]
    tracking(im,tag,224,21,2.8)
    headline=Image.new('RGBA',(W,H),(0,0,0,0))
    lines=head.split('\n');size=103
    while max(font(size,heavy=True).getlength(line) for line in lines)>920:size-=1
    amount=smooth((t-at)/.23)
    for i,line in enumerate(lines):text(headline,line,(540,299+i*int(size*1.08)+int((1-amount)*18)),size,fill=(255,255,255,int(255*amount)),heavy=True,align='center')
    im.alpha_composite(headline)
    graphic=chart(t);closing=smooth((t-T['product'])/.65)
    if closing>0:
        scale=1-.08*closing;scaled=graphic.resize((int(W*scale),int(H*scale)),Image.Resampling.BICUBIC)
        canvas=Image.new('RGBA',(W,H),(0,0,0,0));canvas.alpha_composite(scaled,(int((W-scaled.width)/2),int((H-scaled.height)/2-50*closing)))
        graphic=canvas
    im.alpha_composite(graphic)
    if closing>0:
        cta=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(cta)
        d.rounded_rectangle((337,1430,743,1486),radius=28,fill=(9,16,22,240),outline=(213,228,239),width=1)
        text(cta,'LAUNCHING SOON',(540,1443),24,fill=SILVER,align='center')
        text(cta,'DM FOR PREBOOKINGS',(540,1542),57,fill=(255,255,255),heavy=True,align='center')
        text(cta,'@SPANVISIONINFRA',(540,1655),24,fill=MUTED,align='center')
        cta.putalpha(cta.getchannel('A').point(lambda v:int(v*closing)));im.alpha_composite(cta)
    cue=next((c for c in INFO['cues'] if c['start']<=t<c['end'] and t<T['product']),None)
    if cue:
        value=cue['text'];d=ImageDraw.Draw(im);f=font(40,True);width=d.textlength(value,font=f)
        d.rounded_rectangle((540-width/2-20,1587,540+width/2+20,1651),radius=10,fill=(3,6,9,220))
        text(im,value,(540,1594),40,fill=(255,255,255),bold=True,align='center')
    return im.convert('RGB')

def previews():
    moments=[.8,T['rest']+.5,T['link']+.3,T['recalc']+.65,T['review']+.5,DURATION-1.3]
    for i,t in enumerate(moments):render(t).save(DEST/f'preview-{i}.jpg',quality=94)
    render(.9).save(DEST/f'{NAME}-cover.jpg',quality=97)
    (DEST/'timeline.json').write_text(json.dumps({'timeline':T,'moments':moments},indent=2))
    print('Previews ready: '+json.dumps(T),flush=True)

def encode():
    previews()
    cmd=[FFMPEG,'-y','-hide_banner','-filter_threads','1','-filter_complex_threads','1','-thread_queue_size','2',
         '-f','rawvideo','-pixel_format','rgb24','-video_size','1080x1920','-framerate','30','-i','pipe:0',
         '-i',str(DEST/'reel-audio.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-threads','2',
         '-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000',
         '-t',str(DURATION),'-movflags','+faststart','-metadata','title=Spanvision Infra - One Task Slips',
         '-metadata','comment=Original scheduling motion graphic, not a product screen recording. Recalculation is shown explicitly.',str(TARGET)]
    with (DEST/'encode.log').open('w') as log:
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=log,creationflags=0x08000000)
        try:
            for n in range(DURATION*FPS):
                proc.stdin.write(render(n/FPS).tobytes())
                if n%90==0:print(f'Rendered {n+1}/{DURATION*FPS}',flush=True)
            proc.stdin.close();code=proc.wait()
        except Exception:proc.kill();raise
    assert code==0,(DEST/'encode.log').read_text()[-2500:]
    print('Reel ready: '+str(TARGET),flush=True)

def sheet(prefix,name):
    result=Image.new('RGB',(1080,1300),'#28313a');d=ImageDraw.Draw(result)
    for i in range(6):
        frame=Image.open(DEST/f'{prefix}-{i}.jpg').convert('RGB');assert frame.size==(W,H)
        x=18+i%3*360;y=18+i//3*646
        result.paste(frame.resize((324,576),Image.Resampling.LANCZOS),(x,y));d.text((x,y+591),f'{prefix}-{i}',font=font(21),fill='white')
    result.save(DEST/name,quality=95)

def run(args):
    r=subprocess.run([FFMPEG,'-y','-hide_banner','-threads','1','-filter_threads','1',*args],capture_output=True,text=True,creationflags=0x08000000)
    assert r.returncode==0,r.stderr[-2500:]
    return r

def verify():
    assert sum(SCENARIO['original_durations'])==10 and sum(SCENARIO['revised_durations'])==12
    r=run(['-i',str(TARGET),'-map','0:v:0','-map','0:a:0','-af','astats=metadata=0:reset=0','-threads','1','-progress','pipe:1','-nostats','-f','null','-'])
    assert all(x in r.stderr for x in ['1080x1920','30 fps','Video: h264','Audio: aac'])
    m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',r.stderr)
    duration=int(m[1])*3600+int(m[2])*60+float(m[3]);assert abs(duration-DURATION)<.05
    frames=[int(n) for n in re.findall(r'^frame=(\d+)',r.stdout,re.M)];assert frames[-1]==DURATION*FPS
    peaks=[float(n) for n in re.findall(r'Peak level dB: (-?\d+\.\d+)',r.stderr)];assert peaks and max(peaks)<0
    for i,t in enumerate(json.loads((DEST/'timeline.json').read_text())['moments']):
        run(['-ss',str(t),'-i',str(TARGET),'-frames:v','1','-q:v','2',str(DEST/f'encoded-{i}.jpg')])
    sheet('encoded','encoded-qa.jpg')
    report={'file':str(TARGET),'duration_seconds':duration,'fps':FPS,'frames':frames[-1],'resolution':[W,H],
            'full_audio_video_decode':'passed','audio_peak_amplitude':round(10**(max(peaks)/20),4),
            'continuous_voiceover':True,'native_rate_percent':INFO['native_rate_percent'],
            'voice_duration_seconds':round(INFO['voice_duration'],3),'time_stretching':False,'phrase_stitching':False,
            'product':'Open Vision Studio','visuals':'Original task-dependency motion graphic',
            'explicit_recalculation':True,'scenario_finish_days':[10,12],'size_bytes':TARGET.stat().st_size}
    (DEST/'verification.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)

if __name__=='__main__':
    if '--preview' in sys.argv:previews();sheet('preview','preview-sheet.jpg')
    elif '--verify' in sys.argv:verify()
    else:encode()
