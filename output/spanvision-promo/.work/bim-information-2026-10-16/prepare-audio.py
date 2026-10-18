from pathlib import Path
import asyncio
import importlib.util

WORK=Path(__file__).resolve().parent
source=WORK.parent/'map-to-model-2026-10-14/prepare-audio.py'
spec=importlib.util.spec_from_file_location('voice_workflow',source)
voice=importlib.util.module_from_spec(spec);spec.loader.exec_module(voice)
voice.WORK=WORK
voice.NAME='spanvision-check-model-data-2026-10-16'
voice.CACHE_TAG='-bim-information-v1'
voice.SCRIPT=('Your model looks complete, but does its data match the requirements? '
              'Check model information and share findings with Vision B I M Validator '
              'from Spanvision Infra. Launching soon, so DM for prebookings.')
voice.CUES=[('Your','Your model looks complete…'),('but','Does its data match the requirements?'),
            ('Check','Check model information.'),('share','Share findings.'),
            ('Vision','Vision BIM Validator'),('Spanvision','Spanvision Infra'),
            ('Launching','Launching soon.'),('DM','DM for prebookings.')]
if __name__=='__main__':asyncio.run(voice.prepare())
