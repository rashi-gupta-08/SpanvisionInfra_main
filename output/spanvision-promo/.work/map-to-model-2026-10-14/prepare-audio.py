from pathlib import Path
import asyncio
import json
import math
import re
import subprocess
import sys
import wave

WORK=Path(__file__).resolve().parent
OUT=WORK.parents[1]
REPO=OUT.parents[1]
sys.path.insert(0,str(OUT/'.speech-deps'))
sys.path.insert(0,str(OUT/'.render-deps'))
import numpy as np
import edge_tts
import imageio_ffmpeg

FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
SR=48000
DURATION=16
NAME='spanvision-map-to-model-2026-10-14'
CACHE_TAG=''
VOICE='en-US-AvaMultilingualNeural'
SCRIPT=('Your next model starts with a map, so choose your location, select an area '
        'and export STL or three M F files with Vision STL Three D Studio. '
        'Spanvision Infra is launching soon, so DM for prebookings.')
CUES=[('Your','Your next model starts with a map.'),
      ('choose','Choose your location.'),('select','Select an area.'),
      ('export','Export STL or 3MF files.'),('Vision','Vision STL · 3D Studio'),
      ('Spanvision','Spanvision Infra'),('launching','Launching soon.'),
      ('DM','DM for prebookings.')]

def run(args):
    result=subprocess.run([FFMPEG,'-y','-hide_banner','-loglevel','error','-threads','1',*args],capture_output=True)
    if result.returncode:raise RuntimeError(result.stderr.decode(errors='replace'))
    return result.stdout

async def prepare():
    rate=0
    for _ in range(3):
        mp3=WORK/f'continuous-English{CACHE_TAG}-rate-{rate}.mp3'
        markfile=WORK/f'word-marks{CACHE_TAG}-rate-{rate}.json'
        if mp3.exists() and markfile.exists():
            marks=json.loads(markfile.read_text())
        else:
            marks=[]
            for attempt in range(3):
                try:
                    marks=[]
                    communicate=edge_tts.Communicate(SCRIPT,VOICE,rate=f'+{rate}%',boundary='WordBoundary',connect_timeout=10,receive_timeout=20)
                    with mp3.open('wb') as audio:
                        async for event in communicate.stream():
                            if event['type']=='audio':audio.write(event['data'])
                            elif event['type']=='WordBoundary':
                                marks.append({'text':event['text'],'seconds':event['offset']/10000000})
                    assert marks and mp3.stat().st_size>10000,'Incomplete narration'
                    markfile.write_text(json.dumps(marks,indent=2))
                    break
                except Exception as error:
                    print(f'Fresh voice retry: {type(error).__name__}',flush=True)
                    if attempt==2:raise
                    await asyncio.sleep(1)
        raw=np.frombuffer(run(['-i',str(mp3),'-vn','-f','f32le','-ac','1','-ar',str(SR),'pipe:1']),dtype='<f4').copy()
        active=np.flatnonzero(np.abs(raw)>.002)
        assert len(active),'Silent voice'
        begin=max(0,active[0]-int(.055*SR));end=min(len(raw),active[-1]+int(.18*SR))
        voice=raw[begin:end]
        seconds=len(voice)/SR
        if seconds<=15.1:break
        rate=math.ceil(((1+rate/100)*seconds/15.1-1)*100)+1
        assert rate<=15,'Shorten the script instead of rushing the voice'
    assert seconds<=15.1,seconds
    offset=.35
    norm=lambda x:x.lower().strip(',.!?;:')
    cues=[];cursor=0
    for word,text in CUES:
        found=next((i for i in range(cursor,len(marks)) if norm(marks[i]['text'])==norm(word)),None)
        assert found is not None,(word,marks)
        cursor=found+1
        cues.append({'word':word,'text':text,'start':marks[found]['seconds']-begin/SR+offset})
    for i,cue in enumerate(cues):cue['end']=cues[i+1]['start']-.035 if i+1<len(cues) else offset+seconds
    gain=min(.142/max(float(np.sqrt(np.mean(voice**2))),.0001),.74/max(float(np.max(np.abs(voice))),.0001))
    voice*=gain
    edge=int(.006*SR);voice[:edge]*=np.linspace(0,1,edge);voice[-edge:]*=np.linspace(1,0,edge)
    narration=np.zeros(SR*DURATION,dtype=np.float32)
    at=int(offset*SR);narration[at:at+len(voice)]=voice
    clock=np.arange(SR*DURATION,dtype=np.float32)/SR
    score=np.zeros((len(clock),2),dtype=np.float32)
    for i,start in enumerate(np.arange(.05,DURATION-.5,.60)):
        n=min(int(.55*SR),len(clock)-int(start*SR))
        t=np.arange(n,dtype=np.float32)/SR
        note=[196.,233.08,293.66,349.23,293.66,233.08][i%6]
        sound=.022*(np.sin(math.tau*note*t)+.18*np.sin(math.tau*note*2*t))*(1-np.exp(-t*80))*np.exp(-t*9)
        sound+=.012*np.sin(math.tau*54*t)*np.exp(-t*26)
        a=int(start*SR);score[a:a+n,0]+=sound;score[a:a+n,1]+=sound*.95
    for frequency in [98.,116.54,146.83]:
        score[:,0]+=.003*np.sin(math.tau*frequency*clock)
        score[:,1]+=.003*np.sin(math.tau*frequency*clock+.1)
    score*=np.minimum(1,clock/.3)[:,None]*np.clip((DURATION-clock)/1.0,0,1)[:,None]
    mixed=score+np.stack((narration,narration),axis=1)
    peak=float(np.max(np.abs(mixed)))
    if peak>.85:mixed*=.85/peak
    with wave.open(str(WORK/'reel-audio.wav'),'wb') as wav:
        wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(SR)
        wav.writeframes(np.clip(mixed*32767,-32768,32767).astype('<i2').tobytes())
    info={'duration':DURATION,'voice':VOICE,'voice_duration':seconds,'native_rate_percent':rate,
          'continuous_narration':True,'phrase_stitching':False,'time_stretching':False,
          'script':SCRIPT,'cues':cues,'ffmpeg':FFMPEG,'work':str(WORK),'source_take':str(mp3),
          'output':str(OUT/f'{NAME}-{DURATION}s.mp4')}
    (WORK/'audio-info.json').write_text(json.dumps(info,indent=2),encoding='utf-8')
    (OUT/f'{NAME}-voiceover.txt').write_text(SCRIPT,encoding='utf-8')
    print(json.dumps({'voice_seconds':seconds,'native_rate':rate,'cues':cues}),flush=True)

if __name__=='__main__':asyncio.run(prepare())
