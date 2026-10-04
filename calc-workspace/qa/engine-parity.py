from pathlib import Path
import zipfile, json, difflib
root=Path.cwd()
with zipfile.ZipFile(r'D:\CAD\open-calc-studio-main.zip') as z:
    prefix=next(n.split('/')[0]+'/' for n in z.namelist() if n.endswith('/package.json') and len(n.split('/'))==2)
    results=[]
    for p in (root/'src/services/calculation').glob('*.ts'):
        rel=p.relative_to(root).as_posix()
        original=z.read(prefix+rel).decode('utf-8-sig').replace('\r\n','\n')
        current=p.read_text(encoding='utf-8-sig').replace('\r\n','\n')
        results.append({'file':rel,'unchanged':original==current})
    (root/'qa/engine-parity.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
    diffs=[]
    for rel in ['src-tauri/src/lib.rs','src-tauri/src/api.rs','src-tauri/src/accounts.rs','src-tauri/src/reports/generator.rs']:
        a=z.read(prefix+rel).decode('utf-8-sig').splitlines(True)
        b=(root/rel).read_text(encoding='utf-8-sig').splitlines(True)
        diffs.extend(difflib.unified_diff(a,b,fromfile='archive/'+rel,tofile='edition/'+rel))
    (root/'qa/native-changes.diff').write_text(''.join(diffs),encoding='utf-8')
print(f'{sum(r["unchanged"] for r in results)}/{len(results)} calculation modules unchanged')
