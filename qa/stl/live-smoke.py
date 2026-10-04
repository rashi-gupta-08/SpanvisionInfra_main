"""Bounded live-provider smoke check; exports only into the QA folder."""
import json
import os
import sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(root/'spanvision-stl-3d-map-workspace'))
os.environ['SPANVISION_STL_DATA_DIR']=str(Path(__file__).parent/'live-data')
from app import sources
from app.config import Project
from app.pipeline import load_area, build_model, export_model, area_stats
sources.OVERPASS_TIMEOUT=8
out=Path(__file__).parent;result={'passed':False}
try:
    project=Project.from_dict({'id':'live-utrecht','name':'Live Utrecht','bbox_wgs84':[5.117,52.090,5.118,52.0906],'settings':{'max_size_mm':150}})
    area=load_area(project)
    assert area.buildings,'No buildings returned'
    model=build_model(area,project)
    files=export_model(model,out/'live-exports','live-utrecht')
    result={'passed':True,'stats':area_stats(area,project),'files':files,'surfaces_error':area.surfaces_error}
except Exception as exc:
    result['error']=str(exc)
(out/'live-results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2),flush=True)
raise SystemExit(0 if result['passed'] else 1)
