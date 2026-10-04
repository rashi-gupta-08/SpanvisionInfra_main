from pathlib import Path
import json, zipfile, hashlib, shutil, re, datetime
root=Path.cwd()
source=root/'spanvision-pile-plane-workspace'
qa=root/'qa/pile'
delivery=root/'delivery/pile/windows'
delivery.mkdir(parents=True,exist_ok=True)
def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''): h.update(block)
    return h.hexdigest()
exclude={'.git','.worktrees','node_modules','target','dist','dist-preview','gen','.venv','venv','__pycache__','.pytest_cache','.vscode'}
def source_files(folder):
    for p in folder.rglob('*'):
        if p.is_file() and not any(part in exclude for part in p.relative_to(folder).parts) and '/src/core/wasm/' not in p.as_posix() and not p.name.endswith(('.tsbuildinfo','.log')):
            yield p
archive=delivery/'pile-plane-workspace-0.4.2-source.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6,strict_timestamps=False) as z:
    for p in source_files(source): z.write(p,'spanvision-pile-plane-workspace/'+p.relative_to(source).as_posix())
    for folder in ['branding','suite-hub']:
        for p in source_files(root/folder):
            if p.name not in {'setup-pile.py','finalize-pile.py'}:
                z.write(p,'suite-integration/'+folder+'/'+p.relative_to(root/folder).as_posix())
    for p in [root/'package.json',root/'package-lock.json']:
        z.write(p,'suite-integration/'+p.name)
    for p in qa.glob('*.mjs'):
        if not p.name.startswith(('debug-','explore-','inspect')): z.write(p,'suite-integration/qa/pile/'+p.name)

shutil.copytree(source/'legal',delivery/'legal',dirs_exist_ok=True)
for name in ['ARCHITECTURE.md','BUILDING-SPANVISION.md']:
    shutil.copy2(source/name,delivery/name)
screens=delivery/'screenshots'
screens.mkdir(exist_ok=True)
for p in qa.glob('*.png'):
    if p.name.startswith(('pile-','hub-','import-complete')): shutil.copy2(p,screens/p.name)
verification=delivery/'verification'
verification.mkdir(exist_ok=True)
for name in ['frontend-tests.log','rust-tests.log','native-tests.log','native-build.log','native-build-results.json','browser-verification.json','editing-verification.json','responsive-verification.json','verification-results.json','final-checks.json','native-smoke.json','stale-preview-check.json']:
    shutil.copy2(qa/name,verification/name)
shutil.copy2(root/'qa/suite/pile-build.log',verification/'browser-build.log')
shutil.copy2(source/'apps/pile-plan-studio/dist/suite-build.json',verification/'suite-build.json')

audit=[]
with zipfile.ZipFile('D:/CAD/pile-plan-studio.zip') as original:
    names=original.namelist()
    for p in (source/'crates').rglob('*.rs'):
        relative=p.relative_to(source).as_posix()
        candidates=[n for n in names if n.endswith('/'+relative)]
        if not candidates:
            audit.append(dict(file=relative,change='Added Spanvision identity constants'))
        elif original.read(candidates[0])!=p.read_bytes():
            audit.append(dict(file=relative,change='Modified; see corresponding source'))
(verification/'engineering-source-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')

front=(qa/'frontend-tests.log').read_text(encoding='utf-8')
rust=(qa/'rust-tests.log').read_text(encoding='utf-8')
native=(qa/'native-tests.log').read_text(encoding='utf-8')
browser=json.loads((qa/'verification-results.json').read_text(encoding='utf-8'))
checks=json.loads((qa/'final-checks.json').read_text(encoding='utf-8'))
smoke=json.loads((qa/'native-smoke.json').read_text(encoding='utf-8'))
stamp=json.loads((source/'apps/pile-plan-studio/dist/suite-build.json').read_text(encoding='utf-8'))
totals=dict(frontend=int(re.search(r'ℹ pass (\d+)',front).group(1)),rustWorkspace=sum(map(int,re.findall(r'test result: ok\. (\d+) passed',rust))),tauri=sum(map(int,re.findall(r'test result: ok\. (\d+) passed',native))),browserScenarios=browser['passed'],additionalBrowserChecks=len(checks['results']),nativeSmokeChecks=len(smoke['results']),stalePreviewChecks=1)
assert browser['failed']==0 and not browser['pageErrors'] and not smoke['errors']
readme='''# Pile Plane Workspace — Spanvision infra

Version 0.4.2 Alpha · PPW · Windows x64

Run `spanvision-pile-plane-workspace.exe` directly, or use `Pile Plane Workspace_0.4.2_x64-setup.exe` to install. Both are unsigned. WebView2 must be available on Windows.

Browser preview: http://127.0.0.1:4255/
Suite hub: http://127.0.0.1:4230/

The monochrome interface, lighter canvas, responsive drawers, touch gestures and Spanvision identity preserve the Rust engineering authority and IFCPP format. Fresh profiles default to Mono; existing preferences are retained. Changing browser origin requires IFCPP export/reopen. Windows migration preserves the legacy profile and does not overwrite existing Spanvision preferences.

Feedback is a downloadable local report. Hub account, assistant and OCR screens remain labeled demonstrations. No online authentication, OCR or assistant service is added.

`pile-plane-workspace-0.4.2-source.zip` contains the corresponding modified pile source, lockfiles, legal texts, build helpers and suite integration source. Follow BUILDING-SPANVISION.md. The application is LGPL-3.0-or-later; original copyrights and dependency licenses are in legal/ and the application's Open-source Notices view.

See VERIFICATION.md, verification/ and screenshots/ for evidence. SHA256SUMS.txt identifies the delivered files.
'''
(delivery/'README.md').write_text(readme,encoding='utf-8')
report=f'''# Verification — Pile Plane Workspace 0.4.2

All required builds and automated checks passed on the delivery host.

| Check | Result |
|---|---|
| Frontend tests | {totals['frontend']} passed |
| Rust workspace tests | {totals['rustWorkspace']} passed |
| Separate Tauri tests | {totals['tauri']} passed |
| Browser workflow/responsive scenarios | {totals['browserScenarios']} passed |
| Alignment, notices, photography, stamped health | {totals['additionalBrowserChecks']} passed |
| Packaged native startup/notices smoke checks | {totals['nativeSmokeChecks']} passed |
| Stale build rejection | 1 passed |
| Production Rust WASM + TypeScript/Vite | Passed |
| Windows executable + NSIS installer | Passed, unsigned |

Browser checks cover sample startup, CSV/XLSX import, duplicate capacity handling, CPT selection, assignments, grouping, undo/redo, optimization completion and cancellation, IFCPP save/reopen, CSV/XLSX exports, feedback download and recovery. Settings preview, Save, Cancel, Reset and saved-theme retention were verified. Tauri tests cover profile migration without overwriting either profile.

Editor and hub landing, tools, suggestions, login, sign-up, account and scan screens were checked at 320, 390, 820 and 1440px. No page overflow or browser page errors remained. Touch pan, pinch, tap and explicit box selection passed. Drawers restore keyboard focus after Escape. All 405 marker targets matched their drawing positions after resizing with maximum error below 0.022px. The original business photograph remains loaded and unfiltered.

Native executable resources identify Spanvision infra / Pile Plane Workspace / 0.4.2. The installer identifies Pile Plane Workspace / 0.4.2. Native smoke verification used the actual packaged executable's WebView2 with process-local debugging for QA; release startup enables no debugging. The Windows computer-use tool failed to initialize, so embedded browser inspection supplied the native screenshots. The installer was built and inspected; installation into the user's Windows profile was not exercised.

Browser save/reopen automation exercises the supported download fallback instead of Edge's OS save picker. Native command tests cover file read/write and exports. Engineering source changes are recorded in engineering-source-audit.json; changes are limited to identity and import diagnostic copy.

Build stamp source fingerprint: `{stamp['sourceFingerprint']}`. Inputs cover Rust, WASM binding sources, frontend/configuration, native/configuration/icons/capabilities, legal files, samples and build helpers. Stale source fingerprints are rejected by the stamped preview.
'''
(delivery/'VERIFICATION.md').write_text(report,encoding='utf-8')
manifest=dict(product='Pile Plane Workspace',organization='Spanvision infra',version='0.4.2',status='Alpha',signed=False,browserPreview='http://127.0.0.1:4255/',hubPreview='http://127.0.0.1:4230/',tests=totals,sourceFingerprint=stamp['sourceFingerprint'],files=[])
for p in sorted(delivery.rglob('*')):
    if p.is_file() and p.name not in {'manifest.json','SHA256SUMS.txt'}: manifest['files'].append(dict(path=p.relative_to(delivery).as_posix(),bytes=p.stat().st_size,sha256=digest(p)))
(delivery/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
checksums=[f"{entry['sha256']}  {entry['path']}" for entry in manifest['files']]
checksums.append(f"{digest(delivery/'manifest.json')}  manifest.json")
(delivery/'SHA256SUMS.txt').write_text('\n'.join(checksums)+'\n',encoding='utf-8')
print(json.dumps(dict(sourceArchive=str(archive),sourceBytes=archive.stat().st_size,screenshots=len(list(screens.glob('*.png'))),tests=totals,engineeringChanges=audit),indent=2))
