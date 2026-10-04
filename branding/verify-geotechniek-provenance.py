from pathlib import Path
import hashlib, json, re, zipfile
root=Path(__file__).resolve().parent.parent
original=Path('D:/CAD/open-geotechniek-studio.zip')
native=root/'spanvision-geptechniek-workspace/apps/desktop/src-tauri'
with zipfile.ZipFile(original) as z:
    names=[n for n in z.namelist() if n.endswith('apps/desktop/src-tauri/Cargo.lock')]
    assert len(names)==1,names
    old=z.read(names[0]).decode().replace('\r\n','\n')
    tool_file=next(n for n in z.namelist() if n.endswith('apps/desktop/src-tauri/src/mcp/tools.rs'))
    old_tools=re.findall(r'"name": "([a-z_]+)"',z.read(tool_file).decode())
new=(native/'Cargo.lock').read_text(encoding='utf-8').replace('\r\n','\n')
assert old.replace('name = "open-geo-studio"','name = "spanvision-geotechniek-workspace"')==new,'Unexpected dependency lockfile change'
new_tools=re.findall(r'"name": "([a-z_]+)"',(native/'src/mcp/tools.rs').read_text(encoding='utf-8'))
assert old_tools==new_tools,'MCP tool names changed'
hashes={}
for directory in [native,root/'spanvision-geptechniek-workspace/vendor/crates-warehouse']:
    for p in sorted(directory.rglob('*')):
        if p.is_file() and not any(part in {'target','.git','gen','node_modules'} for part in p.relative_to(directory).parts):
            hashes[p.relative_to(root).as_posix()]=hashlib.sha256(p.read_bytes()).hexdigest()
result={'upstreamCommit':'6e8738c075719e2fc8fcf918d969406f98927b07','inputZipSha256':hashlib.sha256(original.read_bytes()).hexdigest(),'lockfileDependencies':'unchanged','mcpToolNames':new_tools,'sourceFiles':hashes}
out=root/'qa/geotechniek/provenance-results.json';out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print('Original dependency lockfile preserved; native/vendor source fingerprints recorded.')
