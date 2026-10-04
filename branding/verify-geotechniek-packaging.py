from pathlib import Path
import json, re, subprocess

root=Path(__file__).resolve().parent.parent
app=root/'spanvision-geptechniek-workspace/apps/desktop/src-tauri'
config=json.loads((app/'tauri.conf.json').read_text(encoding='utf-8'))
assert config['identifier']=='com.spanvisioninfra.geotechniek'
assert config['productName']=='geptechniek workspace · Geotechniek'
assert 'Spanvision infra' in config['app']['windows'][0]['title']
nsi=Path('D:/SpanvisionToolchain/geo-target/release/nsis/x64/installer.nsi').read_text(encoding='utf-8')
installed=re.findall(r'/oname=([^"\n]+)',nsi)
required=['tenants\\spanvision_infra\\brand.yaml','tenants\\spanvision_infra\\fonts\\Inter-Regular.ttf','tenants\\spanvision_infra\\logos\\gw-wordmark.png','tenants\\spanvision_infra\\templates\\constructie_rapport.yaml','WebView2Loader.dll']
for name in required: assert name in installed,(name,'missing installer asset')
assert not any(name.startswith('tenants\\') and name.count('\\')==1 for name in installed), 'Flattened tenant assets'
results={'packageIdentity':config['identifier'],'productName':config['productName'],'windowTitle':config['app']['windows'][0]['title'],'requiredInstallerResources':required,'resourcesPreserveDirectories':True,'nsisResourceCount':len(installed),'nativeWindowVisualInspection':'unavailable; see native-ui-results.json'}
(root/'qa/geotechniek/native-packaging-results.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
print('Native package identity and nested installer resources verified.')
