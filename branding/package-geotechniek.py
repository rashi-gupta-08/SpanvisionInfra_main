"""Package the editable suite without caches, VCS state or local credentials."""
from pathlib import Path
import hashlib, json, os, sys, zipfile

root = Path(__file__).resolve().parent.parent
destination = Path(sys.argv[1] if len(sys.argv)>1 else 'D:/SpanvisionDelivery')
destination.mkdir(parents=True, exist_ok=True)
brand = json.loads((root/'branding/brand.json').read_text(encoding='utf-8'))
directories = ['branding','suite-hub'] + [m['directory'] for m in brand['modules']]
excluded = {'node_modules','target','dist','dist-preview','.git','.claude','.idea','.vscode','gen','qa','artifacts','__output__','__pycache__','upstream-build','.native-cache','.cache','.venv','venv','build','delivery'}
warehouse_members = {'cpt-core','openaec-core','openaec-layout','openaec-engine'}

def include(file):
    relative=file.relative_to(root)
    if any(part in excluded for part in relative.parts): return False
    if file.name.startswith('.env') or file.suffix.lower() in {'.exe','.pdb','.wasm','.zip','.7z','.log','.tmp'}: return False
    if file.suffix.lower()=='.dll' and file.name!='WebView2Loader.dll': return False
    if relative.parts[0]=='spanvision-speech-workspace' and 'models' in relative.parts and file.suffix=='.bin': return False
    if file.name == '.suite-web-app.html': return False
    parts=relative.parts
    if 'crates-warehouse' in parts:
        i=parts.index('crates-warehouse')
        if len(parts)>i+2 and parts[i+1] not in warehouse_members: return False
    return True

inputs=[]
for name in directories:
    for current,children,names in os.walk(root/name):
        children[:]=[child for child in children if child not in excluded]
        if Path(current).name=='crates-warehouse': children[:]=[child for child in children if child in warehouse_members]
        inputs.extend(p for filename in names if include(p:=Path(current)/filename))
inputs += [root/n for n in ['package.json','package-lock.json','README.md','.gitignore'] if (root/n).is_file()]
archive=destination/'spanvision-suite-editable-source.zip'
manifest=[]
print('Packing '+str(len(set(inputs)))+' editable source files.',flush=True)
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for index,file in enumerate(sorted(set(inputs))):
        name=file.relative_to(root).as_posix()
        if index%500==0: print(str(index)+': '+name,flush=True)
        content=file.read_bytes()
        z.writestr('spanvision-suite/'+name,content)
        manifest.append({'path':name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
report={'archive':str(archive),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'fileCount':len(manifest),'files':manifest}
(destination/'source-manifest.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='files'},indent=2))
