"""Exercise tenant boundaries through the real HTTP APIs (one service per run)."""
import os
from pathlib import Path
import tempfile
import unittest

temporary = tempfile.TemporaryDirectory(prefix='spanvision-cloud-test-')
os.environ['SPANVISION_CLOUD_INSECURE_TEST'] = '1'
os.environ['SPANVISION_STL_DATA_DIR'] = temporary.name
os.environ['DATABASE_URL'] = 'sqlite+aiosqlite:///' + str(Path(temporary.name) / 'bim.db').replace('\\', '/')
os.environ['PROJECT_FILES_DIR'] = str(Path(temporary.name) / 'projects')
from starlette.testclient import TestClient
from deployment.cloud_app import app, SERVICE


class CloudIsolationTests(unittest.TestCase):
    def test_private_browser_workspaces(self):
        with TestClient(app) as first:
            second = TestClient(app)
            health = '/health' if SERVICE == 'bim' else '/api/ping'
            self.assertEqual(first.get(health).status_code, 200)
            self.assertFalse(first.cookies, 'health checks must not allocate browser sessions')
            if SERVICE == 'bim':
                response = first.post('/api/v2/projects', data={'name': 'Private BIM project'})
                self.assertEqual(response.status_code, 201, response.text)
                project_id = response.json()['id']
                self.assertEqual(len(first.get('/api/v2/projects').json()['projects']), 1)
                self.assertEqual(second.get('/api/v2/projects').json()['projects'], [])
                forged = {'X-Authentik-Username': 'visitor', 'X-Authentik-Meta-Tenant': first.cookies.get('spanvision-workspace-test')}
                self.assertEqual(second.get('/api/v2/projects/' + project_id, headers=forged).status_code, 404)
                import ifcopenshell
                model = ifcopenshell.file(schema='IFC4')
                model.create_entity('IfcProject', GlobalId=ifcopenshell.guid.new(), Name='Cloud test')
                upload = first.post('/api/upload', files={'ifc_file': ('test.ifc', model.to_string(), 'application/octet-stream')})
                self.assertEqual(upload.status_code, 200, upload.text)
                file_id = upload.json()['file_id']
                self.assertEqual(first.get('/api/files').json()['count'], 1)
                self.assertEqual(second.get('/api/files').json()['count'], 0)
                self.assertEqual(second.get('/api/status/' + file_id).status_code, 404)
                validation = first.post('/api/v1/validate', files={'ifc_file': ('test.ifc', model.to_string(), 'application/octet-stream')}, data={'ids_standard': 'rvb'})
                self.assertEqual(validation.status_code, 202, validation.text)
                job_id = validation.json()['job_id']
                self.assertEqual(first.get('/api/v1/jobs/' + job_id).status_code, 200)
                self.assertEqual(second.get('/api/v1/jobs/' + job_id).status_code, 404)
            else:
                project = {'id': 'private-map', 'name': 'Private map'}
                saved = first.post('/api/projects/save', json={'project': project})
                self.assertEqual(saved.status_code, 200, saved.text)
                self.assertEqual(len(first.get('/api/projects').json()['projects']), 1)
                self.assertEqual(second.get('/api/projects').json()['projects'], [])
                self.assertEqual(second.get('/api/projects/private-map').status_code, 404)
                for endpoint in ('/api/export-dir/pick', '/api/reveal'):
                    self.assertEqual(first.post(endpoint).status_code, 400)
                self.assertEqual(first.post('/api/export-dir', json={'path': '/suite'}).status_code, 400)
                self.assertEqual(first.get('/api/appinfo').json()['cloud'], True)
            csrf = first.post('/api/v2/projects' if SERVICE == 'bim' else '/api/projects/save', headers={'Origin': 'https://another-site.example'})
            self.assertEqual(csrf.status_code, 403)


if __name__ == '__main__':
    unittest.main()
