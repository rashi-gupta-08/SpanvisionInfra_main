from pathlib import Path
import asyncio
import importlib.util
import json

SOURCE=Path(__file__).resolve().parent
DEST=Path('D:/SpanvisionMedia/planning-delay-2026-10-17')
DEST.mkdir(parents=True,exist_ok=True)
source=SOURCE.parent/'map-to-model-2026-10-14/prepare-audio.py'
spec=importlib.util.spec_from_file_location('voice_workflow',source)
voice=importlib.util.module_from_spec(spec);spec.loader.exec_module(voice)
voice.WORK=DEST
voice.OUT=DEST
voice.NAME='spanvision-one-task-slips-2026-10-17'
voice.CACHE_TAG='-planning-v1'
voice.SCRIPT=('One task slips, but what happens to the rest? Link your activities, '
              'recalculate the plan and review the critical path with Open Vision Studio '
              'from Spanvision Infra. Launching soon, so DM for prebookings.')
voice.CUES=[('One','One task slips…'),('but','What happens to the rest?'),
            ('Link','Link your activities.'),('recalculate','Recalculate the plan.'),
            ('review','Review the critical path.'),('Open','Open Vision Studio'),
            ('Launching','Launching soon.'),('DM','DM for prebookings.')]

if __name__=='__main__':
    asyncio.run(voice.prepare())
    caption=('One task slips. What happens to the rest of your plan? 🏗️⏳\n\n'
             'Link activities, recalculate your schedule and review the critical path '
             'with Open Vision Studio from Spanvision Infra.\n\n'
             'For the teams who need to see what a change means before the next site meeting.\n\n'
             '🚀 Launching Soon\n📩 DM “SPANVISION” for prebookings.\n\n'
             'What changes your schedule most: materials, approvals or site conditions?\n\n'
             '#SpanvisionInfra #ConstructionPlanning #ProjectScheduling #CivilEngineering #ProjectManagement\n')
    (DEST/f'{voice.NAME}-caption.txt').write_text(caption,encoding='utf-8')
    notes=('Spanvision Infra — One task slips — 17 October 2026\n'
           'Vertical 1080 × 1920, 30 FPS, 16-second MP4. Continuous English voiceover, original music and prebooking CTA.\n\n'
           'Product: Open Vision Studio, construction planning.\n'
           'Features checked in the local README, AGENTS.md and scheduler source: task dependencies, explicit schedule recalculation, critical path review.\n'
           'C:/Users/dell/Documents/ChatGPT/own CAD/open-vision-studio/README.md\n'
           'C:/Users/dell/Documents/ChatGPT/own CAD/open-vision-studio/AGENTS.md\n'
           'C:/Users/dell/Documents/ChatGPT/own CAD/open-vision-studio/src/engine/scheduler/solveProject.ts\n\n'
           'The original motion graphic uses a simple finish-to-start task chain, with durations 3, 4, 2 and 1 working days. '
           'Extending the first task to 5 working days gives a chain length of 12 instead of 10 days. '
           'Successors move after the explicit Recalculate scene; no automatic reaction is promised. '
           'The graphic illustrates scheduling logic and is not a screen recording or an implemented model-to-task 4D animation. '
           'Actual calendars, constraints, other paths and available float affect real schedules.\n\n'
           'No bottom disclaimer footer, website URL or playback bars are added.\n'
           'Voice: en-US-AvaMultilingualNeural, one continuous take, no phrase stitching or time stretching.\n'
           'Media was saved to D: because the system drive had less than 20 MB free at the start.\n')
    (DEST/f'{voice.NAME}-production-notes.txt').write_text(notes,encoding='utf-8')
    (DEST/'scenario.json').write_text(json.dumps({'tasks':['Prep','Structure','Services','Review'],
        'original_durations':[3,4,2,1],'revised_durations':[5,4,2,1],
        'original_starts':[0,3,7,9],'revised_starts':[0,5,9,11],
        'original_finish':10,'revised_finish':12,'unit':'working days',
        'dependencies':'finish-to-start, zero lag, single serial path'},indent=2))
