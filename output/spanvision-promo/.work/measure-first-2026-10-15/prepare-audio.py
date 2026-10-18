from pathlib import Path
import asyncio
import importlib.util

WORK=Path(__file__).resolve().parent
source=WORK.parent/'map-to-model-2026-10-14/prepare-audio.py'
spec=importlib.util.spec_from_file_location('voice_workflow',source)
voice=importlib.util.module_from_spec(spec);spec.loader.exec_module(voice)
voice.WORK=WORK
voice.NAME='spanvision-measure-first-portable-document-2026-10-15'
voice.CACHE_TAG='-portable-document-v3'
voice.SCRIPT=('Before you trust a measurement, set the drawing scale using a known dimension, '
              'then check distances and measure areas in Vision Portable Document Studio, '
              "Spanvision Infra's P D F tool. Launching soon, so DM for prebookings.")
voice.CUES=[('Before','Before you trust a measurement…'),
            ('set','Set the drawing scale.'),('distances','Check distances.'),
            ('areas','Measure areas.'),('Vision','Vision Portable\nDocument Studio'),
            ('Spanvision','Spanvision Infra’s PDF tool.'),
            ('Launching','Launching soon.'),('DM','DM for prebookings.')]
if __name__=='__main__':asyncio.run(voice.prepare())
