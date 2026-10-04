"""Add dependency notices, create portable ZIP and record artifact checksums."""
import hashlib
import importlib.metadata
import json
import shutil
import sys
from pathlib import Path
out=Path(sys.argv[1]); bundle=out/'portable'/'STL-3D map workspace'
notices=bundle/'_internal'/'legal'/'python-licenses';notices.mkdir(parents=True,exist_ok=True)
for distribution in importlib.metadata.distributions():
    name=distribution.metadata.get('Name','dependency')
    for item in distribution.files or []:
        if 'dist-info' in str(item) and any(key in item.name.lower() for key in ('license','copying','notice')):
            source=Path(distribution.locate_file(item))
            if source.is_file():
                target=notices/name/item.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
shutil.copy2('README.md',bundle/'README.md')
zip_path=shutil.make_archive(str(out/'Spanvision-STL-3D-map-workspace-1.1.1-portable'),'zip',out/'portable','STL-3D map workspace')
artifacts=[]
for item in [Path(zip_path),*out.glob('*Setup.exe')]:
    artifacts.append({'file':item.name,'bytes':item.stat().st_size,'sha256':hashlib.file_digest(item.open('rb'),'sha256').hexdigest()})
(out/'artifacts.json').write_text(json.dumps(artifacts,indent=2),encoding='utf-8')
print(json.dumps(artifacts,indent=2))
