"""Pinned npm/Rust dependency attribution from local build sources."""
from pathlib import Path
import os, json, tomllib, shutil, re
root=Path(__file__).resolve().parents[1]
app=root/'apps/pile-plan-studio'
legal=root/'legal'
licenses=legal/'dependency-licenses'
licenses.mkdir(parents=True,exist_ok=True)
rows=[]
def collect(folder,kind,name,version,meta):
    expression=meta.get('license','See upstream license')
    if isinstance(expression,dict): expression=expression.get('type','See upstream license')
    repository=meta.get('repository',meta.get('homepage',''))
    if isinstance(repository,dict): repository=repository.get('url','')
    key=re.sub(r'[^a-zA-Z0-9._-]','_',f'{kind}-{name}-{version}')
    candidates=[p for p in folder.iterdir() if p.is_file() and p.name.upper().startswith(('LICENSE','LICENCE','COPYING','NOTICE','COPYRIGHT'))]
    if isinstance(meta.get('license-file'),str) and (folder/meta['license-file']).is_file(): candidates.append(folder/meta['license-file'])
    found=[]
    for item in sorted(set(candidates)):
        target=licenses/key/item.name
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(item,target)
        found.append(target.relative_to(legal).as_posix())
    rows.append(dict(ecosystem=kind,name=name,version=version,license=expression,authors=meta.get('authors',meta.get('author','')),repository=repository,licenseFiles=found))
lock=json.loads((app/'package-lock.json').read_text(encoding='utf-8'))
for key,data in sorted(lock['packages'].items()):
    if not key: continue
    folder=app/key
    if (folder/'package.json').exists():
        meta=json.loads((folder/'package.json').read_text(encoding='utf-8'))
        collect(folder,'npm',meta['name'],meta['version'],meta)
packages={}
for lock_path in (root/'Cargo.lock',app/'src-tauri/Cargo.lock'):
    for p in tomllib.loads(lock_path.read_text(encoding='utf-8'))['package']:
        if p.get('source','').startswith('registry+'): packages[(p['name'],p['version'])]=p
cargo_home=Path(os.environ.get('CARGO_HOME','D:/SpanvisionToolchain/CargoCache'))
unavailable=[]
for name,version in sorted(packages):
    matches=list((cargo_home/'registry/src').glob(f'*/{name}-{version}'))
    if not matches:
        unavailable.append(dict(name=name,version=version,reason='Other platform locked package not fetched or linked in this build.'))
        continue
    folder=matches[0]
    meta=tomllib.loads((folder/'Cargo.toml').read_text(encoding='utf-8')).get('package',{})
    collect(folder,'cargo',name,version,meta)
for item in (app/'public/fonts').rglob('*'):
    if item.is_file() and any(word in item.name.upper() for word in ('LICENSE','OFL','NOTICE')):
        target=licenses/'fonts'/item.name
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(item,target)
inventory=dict(application='Pile Plane Workspace',organization='Spanvision infra',version='0.4.2',dependencies=rows,otherLockedPlatformPackages=unavailable)
(legal/'DEPENDENCY-INVENTORY.json').write_text(json.dumps(inventory,indent=2)+'\n',encoding='utf-8')
lines=['# Dependency notices','','Pile Plane Workspace 0.4.2 — Spanvision infra','',
 'Dependencies retain their authors, copyrights and licenses. Full available license texts are included in dependency-licenses/. Lockfiles pin source versions. This inventory includes build dependencies; Windows links the native runtime subset and the frontend embeds its browser subset.','',
 '| Ecosystem | Package | Version | License |','|---|---|---|---|']
for row in rows: lines.append(f"| {row['ecosystem']} | {row['name']} | {row['version']} | {row['license']} |")
lines+=['','Font files retain bundled SIL Open Font License notices. React, HiGHS, Tauri, wasm-bindgen and other copyrights remain in the full license texts. Other platform-only locked packages are recorded separately in DEPENDENCY-INVENTORY.json; they were not fetched or linked in this Windows/browser build.','']
(legal/'DEPENDENCY-NOTICES.md').write_text('\n'.join(lines),encoding='utf-8')
print(f'Collected {len(rows)} dependency records and {sum(len(r["licenseFiles"]) for r in rows)} license files; {len(unavailable)} other-platform entries recorded separately.')
