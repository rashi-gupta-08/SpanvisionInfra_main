"""Create deterministic browser-test responses and verify with upstream checks."""
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
from test_workspace import area, project
from app.pipeline import build_model, export_model, area_stats, preview_geojson
import verify_output
fixture=area.__wrapped__(); config=project.__wrapped__()
minx,miny,maxx,maxy=fixture.bbox_rd
fixture.surfaces.tree_points=[(minx+120+i*3,miny+100+j*3) for i in range(8) for j in range(10)]
root=Path(__file__).resolve().parent.parent;out=root.parent/'qa'/'stl';out.mkdir(parents=True,exist_ok=True)
model=build_model(fixture,config);export_dir=out/'exports';files=export_model(model,export_dir,'fixture')
(out/'fixture.json').write_text(json.dumps({'area':{'stats':area_stats(fixture,config),'geojson':preview_geojson(fixture,config)},'build':{'files':files,'bands':model.bands,'stats':model.stats,'project_id':'fixture','output_dir':str(export_dir)}}),encoding='utf-8')
verify_output.THREEMF=export_dir/'fixture.3mf'
verify_output.load_area=lambda *a,**kw:fixture
verify_output.verify_3mf();verify_output.verify_support()
if verify_output.failures:raise SystemExit(1)
print('Deterministic fixture and original export checks passed.')
