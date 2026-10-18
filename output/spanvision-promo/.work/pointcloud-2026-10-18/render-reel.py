from pathlib import Path
from functools import lru_cache
import json
import math
import re
import subprocess
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter

REPO = Path(__file__).resolve().parents[4]
DEST = Path('D:/SpanvisionMedia/pointcloud-2026-10-18')
INFO = json.loads((DEST/'audio-info.json').read_text())
NAME = 'spanvision-beyond-the-dots-2026-10-18'
TARGET = Path(INFO['output'])
FFMPEG = INFO['ffmpeg']
W, H, FPS, DURATION = 1080, 1920, 30, 16
SILVER = (223, 233, 242)
MUTED = (149, 172, 191)
BLUE = (132, 186, 229)
AMBER = (232, 196, 140)
SAMPLE = REPO/'spanvision-pointcloud-workspace/public/samples/site-scan.ply'
DATA = np.loadtxt(SAMPLE.read_text().split('end_header')[1].splitlines())
XYZ = DATA[:, :3].copy()
XYZ[:, :2] -= (XYZ[:, :2].min(0)+XYZ[:, :2].max(0))/2
XYZ[:, 2] -= 4
N = len(XYZ)
RGB = np.clip(DATA[:, 3:6]*1.28+26, 0, 255)
LUMA = RGB.mean(1)
MONO = np.stack([LUMA*.92, LUMA*1.02, LUMA*1.10], axis=1)
HEIGHT = DATA[:, 2]/DATA[:, 2].max()
RAMP = np.array([[62, 108, 161], [124, 173, 208], [224, 233, 237], [237, 195, 133]])
ELEV = np.stack([np.interp(HEIGHT, [0, .25, .70, 1], RAMP[:, c]) for c in range(3)], axis=1)
RNG = np.random.default_rng(18)
SCATTER = RNG.normal(0, 1, XYZ.shape)*np.array([7, 7, 4])
MARKS = {c['word']: c['start'] for c in INFO['cues']}
T = {'import': MARKS['import'], 'orbit': MARKS['explore'], 'height': MARKS['switch'],
     'export': MARKS['export'], 'product': MARKS['Vision']+.25,
     'launch': MARKS['launching']-.15, 'dm': MARKS['DM']-.15}

def clamp(x): return min(1, max(0, x))
def smooth(x):
    x = clamp(x)
    return x*x*(3-2*x)

@lru_cache(maxsize=100)
def font(size, bold=False, heavy=False):
    return ImageFont.truetype('C:/Windows/Fonts/'+('ariblk.ttf' if heavy else 'segoeuib.ttf' if bold else 'segoeui.ttf'), int(size))

def text(im, value, xy, size=30, fill=SILVER, bold=False, heavy=False, align='left'):
    d = ImageDraw.Draw(im, 'RGBA')
    f = font(size, bold, heavy)
    x, y = xy
    width = d.textlength(value, font=f)
    if align == 'center': x -= width/2
    if align == 'right': x -= width
    d.text((int(x), int(y)), value, font=f, fill=fill)

def tracking(im, value, y, size=19, gap=3, fill=MUTED):
    d = ImageDraw.Draw(im)
    f = font(size)
    width = sum(d.textlength(c, font=f)+gap for c in value)-gap
    x = (W-width)/2
    for c in value:
        d.text((int(x), int(y)), c, font=f, fill=fill)
        x += d.textlength(c, font=f)+gap

yy, xx = np.mgrid[0:H, 0:W]
v = np.maximum(0, 1-np.sqrt(((xx-540)/790)**2+((yy-1000)/1030)**2))
pixels = np.empty((H, W, 3), dtype=np.uint8)
for c, (lo, hi) in enumerate([(4, 17), (7, 24), (11, 33)]): pixels[:, :, c] = lo+(hi-lo)*v
BG = Image.fromarray(pixels)
grid = ImageDraw.Draw(BG, 'RGBA')
for x in range(28, W, 64): grid.line((x, 615, x, 1390), fill=(24, 34, 45, 170), width=1)
for y in range(660, 1390, 64): grid.line((0, y, W, y), fill=(24, 34, 45, 170), width=1)
halo = Image.new('RGBA', (W, H))
ImageDraw.Draw(halo).ellipse((150, 820, 930, 1290), fill=(46, 77, 107, 48))
blurred = halo.filter(ImageFilter.GaussianBlur(65))
BG.paste(blurred, (0, 0), blurred)
del yy, xx, v, pixels, halo, blurred
LOGO = Image.open(REPO/'branding/spanvision-infra-curved-s-logo.png').convert('RGB')
LOGO = ImageOps.invert(LOGO).crop((50, 25, 360, 275)).resize((88, 71), Image.Resampling.LANCZOS).convert('RGBA')
LOGO.putalpha(LOGO.convert('L').point(lambda v: min(255, v*3)))

def projection(points, t):
    # Orthographic-feeling perspective orbit, with all sample coordinates retained.
    angle = math.radians(-42+6.1*t)
    pitch = math.radians(43+3*math.sin(t*.27))
    ca, sa, cp, sp = math.cos(angle), math.sin(angle), math.cos(pitch), math.sin(pitch)
    x = points[:, 0]*ca-points[:, 1]*sa
    depth_xy = points[:, 0]*sa+points[:, 1]*ca
    y = points[:, 2]*cp-depth_xy*sp
    depth = depth_xy*cp+points[:, 2]*sp
    focal = 1290*(1+.035*math.sin(t*.30))
    distance = 100-depth
    return np.stack([540+focal*x/distance, 1010-focal*y/distance], axis=1), depth

def cloud(t, im):
    d = ImageDraw.Draw(im, 'RGBA')
    # A quiet spatial grid grounds the original point-cloud render.
    for a in range(-25, 26, 5):
        for ends in [[[-25, a, -4.4], [25, a, -4.4]], [[a, -25, -4.4], [a, 25, -4.4]]]:
            p, _ = projection(np.array(ends), t)
            d.line([tuple(p[0]), tuple(p[1])], fill=(55, 78, 101, 100), width=1)
    settle = smooth(t/.95)
    points = XYZ+SCATTER*(1-settle)*.8
    projected, depths = projection(points, t)
    order = np.argsort(depths)
    rgb_mix = smooth((t-T['import'])/.65)
    height_mix = smooth((t-T['height'])/.7)
    colors = MONO*(1-rgb_mix)+RGB*rgb_mix
    colors = colors*(1-height_mix)+ELEV*height_mix
    near = np.clip((depths+27)/56, 0, 1)
    colors = np.clip(colors*(.73+.34*near[:, None]), 0, 255).astype(np.uint8)
    # Larger foreground splats give depth without inventing mesh surfaces.
    for i in order:
        x, y = projected[i]
        if 35 < x < 1045 and 600 < y < 1370:
            radius = 1.35+near[i]*.62
            d.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(*colors[i], 245))
    # A scan-height sweep is an editorial transition into the elevation palette.
    if T['height'] <= t <= T['height']+.9:
        z = -4+11*smooth((t-T['height'])/.9)
        corners = np.array([[-22, -20, z], [22, -20, z], [22, 20, z], [-22, 20, z], [-22, -20, z]])
        pts, _ = projection(corners, t)
        d.line([tuple(p) for p in pts], fill=(202, 224, 242, 145), width=2)
    return im

def pill(im, label, center, width, fill=(11, 20, 29, 240), outline=(75, 104, 129, 255), size=23, color=SILVER):
    x, y = center
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((x-width/2, y, x+width/2, y+50), radius=25, fill=fill, outline=outline, width=1)
    text(im, label, (x, y+9), size, fill=color, align='center')

def phase_at(t):
    if t < T['height']: return 0, 0, 'JUST DOTS?\nLOOK AGAIN.', 'YOUR SCAN HAS A STORY'
    if t < T['export']: return 1, T['height'], 'COLOUR\nBY HEIGHT.', 'SEE THE GEOMETRY DIFFERENTLY'
    if t < T['product']: return 2, T['export'], 'TAKE YOUR\nDATA FORWARD.', 'KEEP THE WORKFLOW MOVING'
    return 3, T['product'], 'VISION\nPOINTCLOUD\nSTUDIO.', 'FROM SPANVISION INFRA'

def render(t):
    im = BG.copy()
    im.paste(LOGO, (221, 98), LOGO)
    text(im, 'SPANVISION INFRA', (344, 120), 26, fill=SILVER)
    phase, at, head, tag = phase_at(t)
    tracking(im, tag, 224, 20, 2.6)
    size = 104 if phase != 3 else 92
    while max(font(size, heavy=True).getlength(line) for line in head.split('\n')) > 930: size -= 1
    amount = 1 if phase == 0 else smooth((t-at)/.22)
    for i, line in enumerate(head.split('\n')):
        text(im, line, (540, 298+i*size*1.03+(1-amount)*14), size,
             fill=(255, 255, 255, int(255*amount)), heavy=True, align='center')
    cloud(t, im)
    if phase != 3:
        text(im, '11,668 POINTS', (92, 620), 23, fill=SILVER, bold=True)
        text(im, 'ONE SITE SCAN', (988, 620), 21, fill=MUTED, align='right')
    if t < T['height']:
        value = 'IMPORT  ·  LAS / LAZ / PLY' if t >= T['import'] else 'FROM POINTS TO PERSPECTIVE'
        pill(im, value, (540, 1377), 670, size=23)
    elif t < T['export']:
        # Legend has no invented units or measurement claim.
        x0, y0, width = 299, 1369, 482
        legend = Image.new('RGB', (width, 7))
        a = np.stack([np.interp(np.linspace(0, 1, width), [0, .25, .70, 1], RAMP[:, c]) for c in range(3)], axis=1).astype(np.uint8)
        legend.paste(Image.fromarray(np.tile(a[None, :, :], (7, 1, 1))))
        im.paste(legend, (x0, y0))
        text(im, 'LOW', (x0, 1391), 18, fill=MUTED)
        text(im, 'ELEVATION', (540, 1391), 20, fill=SILVER, align='center')
        text(im, 'HIGH', (x0+width, 1391), 18, fill=MUTED, align='right')
    elif t < T['product']:
        for x, label in [(280, 'PLY'), (540, 'XYZ'), (800, 'CSV')]:
            pill(im, label, (x, 1377), 190, size=24)
    else:
        tracking(im, 'IMPORT  ·  INSPECT  ·  EXPORT', 1353, 20, 2.5, SILVER)
    if t >= T['launch']:
        pill(im, 'LAUNCHING SOON', (540, 1453), 414, outline=SILVER, color=SILVER, size=24)
        text(im, 'DM FOR PREBOOKINGS', (540, 1550), 57, fill=(255, 255, 255), heavy=True, align='center')
        text(im, '@SPANVISIONINFRA', (540, 1655), 24, fill=MUTED, align='center')
    elif t < T['product']:
        cue = next((c for c in INFO['cues'] if c['start'] <= t < c['end']), None)
        if cue:
            # Mobile-safe captions, with no bottom disclaimer/footer.
            label = cue['text']
            f = font(39, True)
            width = f.getlength(label)
            d = ImageDraw.Draw(im)
            d.rounded_rectangle((520-width/2, 1578, 560+width/2, 1647), radius=11, fill=(3, 7, 12, 235))
            text(im, label, (540, 1586), 39, fill=(255, 255, 255), bold=True, align='center')
    return im

def sheet(prefix, name):
    result = Image.new('RGB', (1080, 1300), '#27313b')
    d = ImageDraw.Draw(result)
    for i in range(6):
        frame = Image.open(DEST/f'{prefix}-{i}.jpg').convert('RGB')
        assert frame.size == (W, H)
        x, y = 18+i%3*360, 18+i//3*646
        result.paste(frame.resize((324, 576), Image.Resampling.LANCZOS), (x, y))
        d.text((x, y+591), f'{prefix}-{i}', font=font(21), fill='white')
    result.save(DEST/name, quality=95)

def previews():
    moments = [1.1, T['orbit']+.4, T['height']+.8, T['export']+.65, T['product']+1, 14.2]
    for i, t in enumerate(moments): render(t).save(DEST/f'preview-{i}.jpg', quality=94)
    render(1.1).save(DEST/f'{NAME}-cover.jpg', quality=97)
    (DEST/'timeline.json').write_text(json.dumps({'timeline': T, 'moments': moments}, indent=2))
    sheet('preview', 'preview-sheet.jpg')
    print('Previews ready: '+json.dumps(T), flush=True)

def encode():
    previews()
    cmd = [FFMPEG, '-y', '-hide_banner', '-filter_threads', '1', '-filter_complex_threads', '1',
           '-thread_queue_size', '2', '-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', '1080x1920',
           '-framerate', '30', '-i', 'pipe:0', '-i', str(DEST/'reel-audio.wav'), '-map', '0:v:0', '-map', '1:a:0',
           '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
           '-rc-lookahead', '12', '-bf', '2', '-refs', '2',
           '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', str(DURATION), '-movflags', '+faststart',
           '-metadata', 'title=Spanvision Infra - Beyond the dots',
           '-metadata', 'comment=Original promotional render of the included demonstration point-cloud sample; not a product screen recording.', str(TARGET)]
    with (DEST/'encode.log').open('w') as log:
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=log, creationflags=0x08000000)
        try:
            for n in range(DURATION*FPS):
                proc.stdin.write(render(n/FPS).tobytes())
                if n % 90 == 0: print(f'Rendered {n+1}/{DURATION*FPS}', flush=True)
            proc.stdin.close()
            code = proc.wait()
        except Exception:
            proc.kill()
            raise
    assert code == 0, (DEST/'encode.log').read_text()[-2500:]
    print('Reel ready: '+str(TARGET), flush=True)

def run(args):
    p = subprocess.run([FFMPEG, '-y', '-hide_banner', '-threads', '1', '-filter_threads', '1', *args],
                       capture_output=True, text=True, creationflags=0x08000000)
    assert p.returncode == 0, p.stderr[-2500:]
    return p

def verify():
    p = run(['-i', str(TARGET), '-map', '0:v:0', '-map', '0:a:0', '-af', 'astats=metadata=0:reset=0',
             '-threads', '1', '-progress', 'pipe:1', '-nostats', '-f', 'null', '-'])
    assert all(x in p.stderr for x in ['1080x1920', '30 fps', 'Video: h264', 'Audio: aac'])
    m = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', p.stderr)
    duration = int(m[1])*3600+int(m[2])*60+float(m[3])
    assert abs(duration-DURATION) < .05
    frames = [int(n) for n in re.findall(r'^frame=(\d+)', p.stdout, re.M)]
    assert frames[-1] == DURATION*FPS
    peaks = [float(n) for n in re.findall(r'Peak level dB: (-?\d+\.\d+)', p.stderr)]
    assert peaks and max(peaks) < 0
    for i, t in enumerate(json.loads((DEST/'timeline.json').read_text())['moments']):
        run(['-ss', str(t), '-i', str(TARGET), '-frames:v', '1', '-q:v', '2', str(DEST/f'encoded-{i}.jpg')])
    sheet('encoded', 'encoded-qa.jpg')
    caption = (DEST/f'{NAME}-caption.txt').read_text(encoding='utf-8')
    assert len(re.findall(r'(?<!\w)#[\w]+', caption)) == 5
    assert N == 11668
    report = {'file': str(TARGET), 'duration_seconds': duration, 'fps': FPS, 'frames': frames[-1],
              'resolution': [W, H], 'full_audio_video_decode': 'passed',
              'audio_peak_amplitude': round(10**(max(peaks)/20), 4),
              'continuous_voiceover': True, 'native_rate_percent': INFO['native_rate_percent'],
              'voice_duration_seconds': round(INFO['voice_duration'], 3), 'time_stretching': False,
              'phrase_stitching': False, 'product': 'Vision Pointcloud Studio', 'source_point_count': N,
              'visuals': 'Original orbit/elevation render of included site-scan.ply',
              'caption_hashtags': 5, 'size_bytes': TARGET.stat().st_size}
    (DEST/'verification.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report), flush=True)

if __name__ == '__main__':
    if '--preview' in sys.argv: previews()
    elif '--verify' in sys.argv: verify()
    else: encode()
