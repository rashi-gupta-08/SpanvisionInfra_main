"""Prepare notices and a standalone build stamp before packaging."""
import hashlib
import importlib.metadata
import json
import shutil
from pathlib import Path
root=Path(__file__).resolve().parent.parent
notices=root/'legal'/'python-licenses'
for distribution in importlib.metadata.distributions():
    name=distribution.metadata.get('Name','dependency')
    for item in distribution.files or []:
        if 'dist-info' in str(item) and any(key in item.name.lower() for key in ('license','copying','notice')):
            source=Path(distribution.locate_file(item))
            if source.is_file():
                target=notices/name/item.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
inputs=[p for p in (root/'app').rglob('*.py') if '__pycache__' not in p.parts]
inputs += [p for folder in ('web','legal') for p in (root/folder).rglob('*') if p.is_file()]
inputs += [root/name for name in ('brand.json','requirements.txt','run_app.py','LICENSE')]
relative=sorted(p.relative_to(root).as_posix() for p in inputs)
brand=json.loads((root/'brand.json').read_text(encoding='utf-8'));digest=hashlib.sha256(brand['brandDigest'].encode())
for name in relative:
    digest.update(name.encode());digest.update((root/name).read_bytes())
(root/'dist').mkdir(exist_ok=True)
(root/'dist'/'suite-build.json').write_text(json.dumps({'id':'stl','brandDigest':brand['brandDigest'],'sourceFingerprint':digest.hexdigest(),'inputs':relative},indent=2),encoding='utf-8')
print('Dependency licenses and standalone build stamp prepared.')
