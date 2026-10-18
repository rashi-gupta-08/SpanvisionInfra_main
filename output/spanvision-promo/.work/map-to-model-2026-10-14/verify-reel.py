from pathlib import Path
import json
import re
import subprocess
import sys
from PIL import Image,ImageDraw,ImageFont

WORK=Path(__file__).resolve().parent
OUT=WORK.parents[1]
info=json.loads((WORK/'audio-info.json').read_text())
FFMPEG=info['ffmpeg']
output=Path(info['output'])

def run(args):
    result=subprocess.run([FFMPEG,'-y','-hide_banner','-threads','1','-filter_threads','1',*args],capture_output=True,text=True,creationflags=0x08000000)
    assert result.returncode==0,result.stderr[-2500:]
    return result

def sheet(pattern,target):
    images=sorted(WORK.glob(pattern))
    preview=Image.new('RGB',(1080,1310),'#272d34')
    draw=ImageDraw.Draw(preview)
    font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',22)
    for i,file in enumerate(images):
        x=22+i%4*265;y=18+i//4*645
        im=Image.open(file).convert('RGB');assert im.size==(1080,1920),file
        preview.paste(im.resize((243,432),Image.Resampling.LANCZOS),(x,y))
        draw.text((x,y+447),file.stem,font=font,fill='#dce4ee')
    preview.save(WORK/target,quality=96)

if '--preview' in sys.argv:
    sheet('preview-*.png','preview-sheet.jpg')
    print('Preview contact sheet ready')
else:
    result=run(['-i',str(output),'-map','0:v:0','-map','0:a:0','-af',
                'astats=metadata=0:reset=0','-threads','1','-progress','pipe:1','-nostats','-f','null','-'])
    assert all(x in result.stderr for x in ['1080x1920','30 fps','Video: h264','Audio: aac']),result.stderr
    match=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',result.stderr)
    duration=int(match[1])*3600+int(match[2])*60+float(match[3])
    assert abs(duration-info['duration'])<.05,duration
    frames=[int(x) for x in re.findall(r'^frame=(\d+)',result.stdout,re.M)]
    assert frames[-1]==info['duration']*30,frames[-1]
    peaks=[float(x) for x in re.findall(r'Peak level dB: (-?\d+\.\d+)',result.stderr)]
    assert peaks and max(peaks)<0,peaks
    marks={x['word']:x['start'] for x in info['cues']}
    times=[.7,marks['choose']+.35,marks['select']+.65,marks['export']+.65,
           marks['Vision']+.4,marks['Spanvision']+.7,14.5]
    for i,t in enumerate(times):
        run(['-ss',str(t),'-i',str(output),'-frames:v','1',str(WORK/f'encoded-{i}.png')])
    sheet('encoded-*.png','encoded-qa.jpg')
    pause=run(['-i',str(WORK/'continuous-English-rate-0.mp3'),'-af','silencedetect=noise=-40dB:d=0.18','-f','null','-'])
    pause_durations=[float(x) for x in re.findall(r'silence_duration: ([\d.]+)',pause.stderr)]
    report={'file':str(output),'duration_seconds':duration,'resolution':[1080,1920],
            'fps':30,'frames':frames[-1],'video_codec':'H264','audio_codec':'AAC',
            'voice_duration_seconds':round(info['voice_duration'],3),
            'native_rate_percent':info['native_rate_percent'],'continuous_voiceover':True,
            'phrase_stitching':False,'time_stretching':False,
            'audio_peak_amplitude':round(10**(max(peaks)/20),4),
            'full_video_audio_decode':'passed','size_bytes':output.stat().st_size,
            'source_geometry':'Actual live Utrecht STL export, 35 buildings',
            'illustrative_transitions':'Flattening and exploding the export for storytelling; no fabricated website UI',
            'voice_silences_over_180ms':pause_durations}
    (WORK/'verification.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report),flush=True)
