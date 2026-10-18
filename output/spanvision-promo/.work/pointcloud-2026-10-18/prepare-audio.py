from pathlib import Path
import asyncio
import importlib.util
import json

SOURCE = Path(__file__).resolve().parent
DEST = Path('D:/SpanvisionMedia/pointcloud-2026-10-18')
DEST.mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location('voice_workflow', SOURCE.parent/'map-to-model-2026-10-14/prepare-audio.py')
voice = importlib.util.module_from_spec(spec)
spec.loader.exec_module(voice)
voice.WORK = DEST
voice.OUT = DEST
voice.NAME = 'spanvision-beyond-the-dots-2026-10-18'
voice.CACHE_TAG = '-pointcloud-v1'
voice.SCRIPT = ("See your site beyond the dots as you import, explore, switch to elevation colours "
                "and export your data with Vision Pointcloud Studio from Spanvision Infra, "
                "launching soon, so DM for prebookings.")
voice.CUES = [('See', 'See your site beyond the dots.'),
              ('import', 'Import your point cloud.'),
              ('explore', 'Explore every angle.'),
              ('switch', 'Switch to elevation colours.'),
              ('export', 'Export your data.'),
              ('Vision', 'Vision Pointcloud Studio'),
              ('launching', 'Launching soon.'),
              ('DM', 'DM for prebookings.')]

if __name__ == '__main__':
    asyncio.run(voice.prepare())
    caption = ("Just dots? Look again. 👀\n\n"
               "Your site scan has a whole story to tell. Import point clouds, explore the geometry, "
               "switch to elevation colours and export your data with Vision Pointcloud Studio "
               "from Spanvision Infra.\n\n"
               "For surveyors, civil engineers and teams working with scan data.\n\n"
               "🚀 Launching Soon\n📩 DM ‘SPANVISION’ for prebookings.\n\n"
               "Would you inspect the scan in RGB or elevation colours first?\n\n"
               "#SpanvisionInfra #PointCloud #LandSurveying #CivilEngineering #ScanToBIM\n")
    (DEST/f'{voice.NAME}-caption.txt').write_text(caption, encoding='utf-8')
    notes = ("Spanvision Infra — Beyond the dots — 18 October 2026\n"
             "1080 × 1920, 30 FPS, 16 seconds. Continuous English narration with original background score.\n\n"
             "Product: Vision Pointcloud Studio.\n"
             "Verified features: point-cloud import including LAS/LAZ/PLY; orbit inspection; RGB/elevation "
             "display; point-cloud export including PLY, XYZ, PTS and CSV. No measurement capability is claimed.\n"
             "Sources: spanvision-pointcloud-workspace/README.md; src/components/layout/Ribbon/Ribbon.tsx; "
             "src/components/layout/Ribbon/useRibbonActions.ts; src/components/canvas/PointcloudViewer.tsx.\n\n"
             "Visuals are an original promotional render of the included site-scan.ply sample, using its "
             "actual 11,668 XYZ points. The sample is a demonstration dataset, not an on-site survey capture. "
             "An animated orbit, point reveal and height-colour transition are editorial effects. "
             "There is no invented app interface and no claim of automatic solid/BIM conversion. "
             "The elevation display uses a bespoke muted blue-to-silver-to-amber palette in this render.\n\n"
             "No bottom disclaimer, website URL or playback/progress bars are included. Original brand logo retained.\n"
             "Voice: en-US-AvaMultilingualNeural in a single continuous take; no stitched phrases or time stretching.\n")
    (DEST/f'{voice.NAME}-production-notes.txt').write_text(notes, encoding='utf-8')
