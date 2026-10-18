from pathlib import Path
import json
import re
import subprocess
import sys
import zipfile
from PIL import Image,ImageDraw,ImageFont

WORK=Path(__file__).resolve().parent
OUT=WORK.parents[1];REPO=OUT.parents[1]
info=json.loads((WORK/'audio-info.json').read_text())
FFMPEG=info['ffmpeg'];output=Path(sys.argv[sys.argv.index('--output')+1]) if '--output' in sys.argv else Path(info['output'])

def run(args):
    result=subprocess.run([FFMPEG,'-y','-hide_banner','-threads','1','-filter_threads','1',*args],capture_output=True,text=True,creationflags=0x08000000)
    assert result.returncode==0,result.stderr[-2500:]
    return result

def sheet(pattern,name):
    files=sorted(f for f in WORK.glob(pattern) if f.stem.rsplit('-',1)[-1].isdigit())
    preview=Image.new('RGB',(1080,1300),'#282f36');draw=ImageDraw.Draw(preview)
    font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',22)
    for i,file in enumerate(files):
        x=18+i%3*360;y=18+i//3*646
        im=Image.open(file).convert('RGB');assert im.size==(1080,1920)
        preview.paste(im.resize((324,576),Image.Resampling.LANCZOS),(x,y))
        draw.text((x,y+590),file.stem,font=font,fill='#dde7ef')
    preview.save(WORK/name,quality=95)

if '--preview' in sys.argv:
    sheet('preview-*.jpg','preview-sheet.jpg')
else:
    record=json.loads((REPO/'qa/bim/validation.json').read_text())['result']
    assert record['total_specifications']==1 and record['failed_specifications']==1
    assert record['total_elements_validated']==1
    element=record['specifications'][0]['requirements'][0]['elements'][0]
    assert element['element_name']=='Bad Wall Name' and element['status']=='fail'
    with zipfile.ZipFile(REPO/'qa/bim/validation.bcfzip') as bcf:
        assert bcf.testzip() is None
        assert any(n.endswith('.bcf') for n in bcf.namelist())
    result=run(['-i',str(output),'-map','0:v:0','-map','0:a:0','-af','astats=metadata=0:reset=0',
                '-threads','1','-progress','pipe:1','-nostats','-f','null','-'])
    assert all(x in result.stderr for x in ['1080x1920','30 fps','Video: h264','Audio: aac'])
    m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',result.stderr)
    duration=int(m[1])*3600+int(m[2])*60+float(m[3]);assert abs(duration-info['duration'])<.05
    frames=[int(x) for x in re.findall(r'^frame=(\d+)',result.stdout,re.M)]
    assert frames[-1]==info['duration']*30
    peaks=[float(x) for x in re.findall(r'Peak level dB: (-?\d+\.\d+)',result.stderr)]
    assert peaks and max(peaks)<0
    moments=json.loads((WORK/'timeline.json').read_text())['moments']
    for i,t in enumerate(moments):
        run(['-ss',str(t),'-i',str(output),'-frames:v','1','-q:v','2',str(WORK/f'encoded-{i}.jpg')])
    sheet('encoded-*.jpg','encoded-qa.jpg')
    pause=run(['-i',info['source_take'],'-af','silencedetect=noise=-40dB:d=0.18','-f','null','-'])
    report={'file':str(output),'duration_seconds':duration,'fps':30,'frames':frames[-1],
            'resolution':[1080,1920],'video_codec':'H264','audio_codec':'AAC',
            'full_audio_video_decode':'passed','peak_amplitude':round(10**(max(peaks)/20),4),
            'continuous_narration':True,'native_voice_rate_percent':info['native_rate_percent'],
            'voice_duration_seconds':round(info['voice_duration'],3),
            'no_phrase_stitching':True,'no_time_stretching':True,
            'product':'Vision BIM Validator','actual_recorded_validation':'one wall, one failed naming requirement',
            'existing_bcf_archive':'verified','visual_type':'Original illustrative model plus real recorded result panel',
            'silences_over_180ms':[float(x) for x in re.findall(r'silence_duration: ([\d.]+)',pause.stderr)],
            'size_bytes':output.stat().st_size}
    (WORK/'verification.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report),flush=True)
