"""Verify the delivered bytes and independently bundled UI/legal resources."""
import hashlib
import json
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[2]
delivery = root / 'delivery' / 'stl' / 'windows'
manifest = json.loads((delivery / 'artifacts.json').read_text())
for item in manifest:
    artifact = delivery / item['file']
    assert artifact.stat().st_size == item['bytes']
    with artifact.open('rb') as handle:
        assert hashlib.file_digest(handle, 'sha256').hexdigest() == item['sha256']

portable = next(item for item in manifest if item['file'].endswith('.zip'))
with zipfile.ZipFile(delivery / portable['file']) as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    prefix = 'STL-3D map workspace/'
    required = [
        'STL-3D map workspace.exe', 'README.md', '_internal/LICENSE',
        '_internal/brand.json', '_internal/suite-build.json',
        '_internal/requirements.txt', '_internal/run_app.py',
        '_internal/web/stl-mark.svg', '_internal/web/favicon.ico',
    ]
    for relative in required:
        assert prefix + relative in names, relative
    assert any('/web/' in name and 'leaflet.js' in name for name in names)
    assert any('/web/' in name and name.endswith('.ttf') for name in names)
    assert any('/legal/python-licenses/' in name and not name.endswith('/') for name in names)
    assert b'Volodymyr Agafonkin' in archive.read(prefix + '_internal/legal/vendor-notices.txt')
    for font in ['inter', 'space-grotesk', 'jetbrains-mono']:
        assert prefix + '_internal/legal/' + font + '-OFL.txt' in names
    identity = json.loads(archive.read(prefix + '_internal/brand.json'))
    assert identity['organization'] == 'Spanvision infra'
    assert identity['product'] == 'STL-3D map workspace'
    assert b'OpenAEC Foundation' in archive.read(prefix + '_internal/LICENSE')

result = {'passed': True, 'checks': [
    'Installer and portable SHA-256 match delivery manifest',
    'Portable ZIP integrity', 'Standalone identity and source fingerprint',
    'Bundled Leaflet and fonts', 'Preserved MIT and dependency notices',
], 'artifacts': manifest}
(root / 'qa/stl/artifact-results.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
