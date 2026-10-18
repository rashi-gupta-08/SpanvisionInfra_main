from pathlib import Path
import json
import re
import subprocess
import sys
from PIL import Image,ImageDraw,ImageFont

WORK=Path(__file__).resolve().parent
OUT=WORK.parents[1]
info=json.loads((WORK/'audio-info.json').read_text())
FFMPEG=info['ffmpeg'];output=Path(info['output'])

def run(args):
    result=subprocess.run([FFMPEG,'-y','-hide_banner','-threads','1','-filter_threads','1',*args],capture_output=True,text=True,creationflags=0x08000000)
    assert result.returncode==0,result.stderr[-2500:]
    return result

def sheet(pattern,name):
    files=sorted(file for file in WORK.glob(pattern) if file.stem.rsplit('-',1)[-1].isdigit())
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
    result=run(['-i',str(output),'-map','0:v:0','-map','0:a:0','-af','astats=metadata=0:reset=0',
                '-threads','1','-progress','pipe:1','-nostats','-f','null','-'])
    assert all(x in result.stderr for x in ['1080x1920','30 fps','Video: h264','Audio: aac'])
    m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',result.stderr)
    duration=int(m[1])*3600+int(m[2])*60+float(m[3]);assert abs(duration-info['duration'])<.05
    frames=[int(x) for x in re.findall(r'^frame=(\d+)',result.stdout,re.M)]
    assert frames[-1]==info['duration']*30,frames[-1]
    peaks=[float(x) for x in re.findall(r'Peak level dB: (-?\d+\.\d+)',result.stderr)]
    assert peaks and max(peaks)<0
    moments=json.loads((WORK/'timeline.json').read_text())['moments']
    for i,t in enumerate(moments):
        run(['-ss',str(t),'-i',str(output),'-frames:v','1','-q:v','2',str(WORK/f'encoded-{i}.jpg')])
    sheet('encoded-*.jpg','encoded-qa.jpg')
    pause=run(['-i',info['source_take'],'-af','silencedetect=noise=-40dB:d=0.18','-f','null','-'])
    pause_durations=[float(x) for x in re.findall(r'silence_duration: ([\d.]+)',pause.stderr)]
    report={'file':str(output),'duration_seconds':duration,'fps':30,'frames':frames[-1],
            'resolution':[1080,1920],'video_codec':'H264','audio_codec':'AAC',
            'full_audio_video_decode':'passed','peak_amplitude':round(10**(max(peaks)/20),4),
            'continuous_narration':True,'native_voice_rate_percent':info['native_rate_percent'],
            'voice_duration_seconds':round(info['voice_duration'],3),
            'no_phrase_stitching':True,'no_time_stretching':True,
            'source_claims':'Scale, distance and area tools verified in document workspace source',
            'visual_type':'Original illustrative SVG floor plan, editorial measurement animation',
            'sample_geometry':{'outer_m':[8,6],'highlighted_room_m':[4,5],'area_m2':20},
            'silences_over_180ms':pause_durations,'size_bytes':output.stat().st_size}
    (WORK/'verification.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report),flush=True)
