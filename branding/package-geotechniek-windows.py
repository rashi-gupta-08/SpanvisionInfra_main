from pathlib import Path
import hashlib, json, zipfile

root=Path(__file__).resolve().parent.parent
delivery=root/'delivery/geotechniek'
windows=delivery/'windows'
result=json.loads((root/'qa/geotechniek/native-build-results.json').read_text(encoding='utf-8'))
assert result['build']=='passed' and result['migrationTests']=='passed'
archive=delivery/'spanvision-geotechniek-windows-portable.zip'
inputs=[windows/'spanvision-geotechniek-workspace.exe',windows/'WebView2Loader.dll']
inputs.extend(sorted(p for p in (windows/'tenants').rglob('*') if p.is_file()))
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    z.writestr('README.txt','Spanvision infra — geptechniek workspace · Geotechniek\n\nExtract this entire archive into one directory and run spanvision-geotechniek-workspace.exe. Keep tenants/ beside the executable. WebView2 Runtime is required; the NSIS installer can install it automatically.\n\nLocal backend: --serve --port 8787\nMCP: --mcp\nThe build is unsigned. Copyright and license notices are in tenants/.\n')
    for p in inputs: z.write(p,p.relative_to(windows).as_posix())
with zipfile.ZipFile(archive) as z: assert z.testzip() is None
metadata={'archive':str(archive),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':len(inputs)+1}
(delivery/'portable-manifest.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
print(json.dumps(metadata,indent=2))
