"""Verify the deployed public APIs with disposable synthetic projects."""
import json
from pathlib import Path
import time
import httpx

root = Path(__file__).resolve().parents[2]
results = []
with httpx.Client(base_url='https://spanvision-bim.onrender.com', timeout=120) as first, httpx.Client(base_url='https://spanvision-bim.onrender.com', timeout=30) as other:
    first.get('/').raise_for_status()
    project = first.post('/api/v2/projects', data={'name': 'Deployment verification'})
    project.raise_for_status()
    project_id = project.json()['id']
    assert other.get('/api/v2/projects/' + project_id).status_code == 404
    model = (root / 'ifc-view/demo/Spanvision-IFC-View-Demo.ifc').read_bytes()
    upload = first.post('/api/upload', files={'ifc_file': ('deployment-demo.ifc', model, 'application/octet-stream')})
    upload.raise_for_status()
    file_id = upload.json()['file_id']
    assert other.get('/api/status/' + file_id).status_code == 404
    processed = first.post('/api/process/' + file_id, params={'output_format': 'json-mesh'})
    processed.raise_for_status()
    assert processed.json()['stats']['elements'] > 0, processed.text
    job = first.post('/api/v1/validate', files={'ifc_file': ('deployment-demo.ifc', model, 'application/octet-stream')}, data={'ids_standard': 'rvb'})
    job.raise_for_status()
    job_id = job.json()['job_id']
    for attempt in range(30):
        status = first.get('/api/v1/jobs/' + job_id)
        status.raise_for_status()
        if status.json()['status'] in ('completed', 'failed'):
            break
        time.sleep(1)
    assert status.json()['status'] == 'completed', status.text
    assert other.get('/api/v1/jobs/' + job_id).status_code == 404
    first.delete('/api/files/' + file_id).raise_for_status()
    first.delete('/api/v2/projects/' + project_id).raise_for_status()
    results.append({'id': 'bim', 'passed': True, 'checks': ['private project', 'IFC upload', 'geometry conversion', 'IDS validation', 'private validation job']})
    print('PASS BIM: private project, real IFC geometry conversion and IDS validation', flush=True)

with httpx.Client(base_url='https://spanvision-stl.onrender.com', timeout=180) as first, httpx.Client(base_url='https://spanvision-stl.onrender.com', timeout=30) as other:
    first.get('/').raise_for_status()
    assert first.get('/api/appinfo').json()['cloud']
    project = {'id': 'deployment-verification', 'name': 'Deployment verification', 'bbox_wgs84': [5.1168, 52.0883, 5.1172, 52.0887]}
    first.post('/api/projects/save', json={'project': project}).raise_for_status()
    assert other.get('/api/projects/deployment-verification').status_code == 404
    search = first.get('/api/search', params={'q': 'Utrecht'})
    search.raise_for_status()
    assert search.json()['results']
    triangle = b'solid probe\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1000 0 0\nvertex 0 1000 0\nendloop\nendfacet\nendsolid probe\n'
    design = first.post('/api/design/upload', data={'project_id': project['id']}, files={'file': ('probe.stl', triangle, 'application/octet-stream')})
    design.raise_for_status()
    assert design.json()['triangles'] > 0
    first.delete('/api/design', params={'project_id': project['id'], 'filename': 'probe.stl'}).raise_for_status()
    area = first.post('/api/area', json={'project': project})
    area.raise_for_status()
    generated = first.post('/api/build', json={'project': project})
    generated.raise_for_status()
    files = generated.json()['files']
    assert files
    for item in files:
        download = first.get('/api/download/' + project['id'] + '/' + item['name'])
        download.raise_for_status()
        assert len(download.content) > 0
        assert other.get('/api/download/' + project['id'] + '/' + item['name']).status_code == 404
    results.append({'id': 'stl', 'passed': True, 'checks': ['private project', 'live geocoding', 'design parsing', 'live map data', 'geometry build', 'private downloads']})
    print('PASS STL: live geocoding, map data, model generation and private downloads', flush=True)

(root / 'qa/deployment/api-verification.json').write_text(json.dumps(results, indent=2))
