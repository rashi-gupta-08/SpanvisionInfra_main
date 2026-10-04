"""A provider outage must leave the loaded buildings printable and private."""
import os
from pathlib import Path
import tempfile
from unittest.mock import patch

temporary = tempfile.TemporaryDirectory(prefix='spanvision-stl-fallback-')
os.environ['SPANVISION_SERVICE'] = 'stl'
os.environ['SPANVISION_CLOUD_INSECURE_TEST'] = '1'
os.environ['SPANVISION_STL_DATA_DIR'] = temporary.name
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from deployment.cloud_app import app
from app import pipeline
from app.sources import Building, OverpassUnavailable
from shapely.geometry import box
from starlette.testclient import TestClient

def buildings(bbox, **kwargs):
    x, y, *_ = bbox
    return [Building('synthetic-building', box(x + 5, y + 5, x + 15, y + 15), height_m=9, ground_m=0)]

project = {'id': 'fallback-test', 'name': 'Fallback test', 'bbox_wgs84': [5.1168, 52.0883, 5.1172, 52.0887]}
with patch.object(pipeline, 'fetch_buildings', side_effect=buildings), patch.object(pipeline, 'fetch_surfaces', side_effect=OverpassUnavailable('Optional public map server unavailable')) as surfaces:
    with TestClient(app) as client:
        loaded = client.post('/api/area', json={'project': project})
        assert loaded.status_code == 200, loaded.text
        assert len(loaded.json()['geojson']['features']) > 0
        generated = client.post('/api/build', json={'project': project})
        assert generated.status_code == 200, generated.text
        assert surfaces.call_count == 1, 'Generate should use the buildings already loaded'
        files = generated.json()['files']
        assert files
        other = TestClient(app)
        for item in files:
            url = '/api/download/fallback-test/' + item['name']
            download = client.get(url)
            assert download.status_code == 200 and len(download.content) > 0
            assert other.get(url).status_code == 404
        client.post('/api/area', json={'project': project}).raise_for_status()
        assert surfaces.call_count == 2, 'Loading map data must retry the unavailable provider'
print('PASS: provider outage still exports real STL/3MF geometry; downloads stay private; explicit reload retries')
