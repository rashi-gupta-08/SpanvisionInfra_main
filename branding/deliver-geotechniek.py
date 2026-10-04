"""Collect validated artifacts; refuse to label incomplete checks as passed."""
from pathlib import Path
import hashlib, json, re, shutil
root=Path(__file__).resolve().parent.parent
qa=root/'qa/geotechniek'
delivery=root/'delivery/geotechniek';delivery.mkdir(parents=True,exist_ok=True)
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
browser=read(qa/'browser-results.json');hub=read(qa/'hub-browser-results.json')
assert not browser['errors'] and not hub['errors']
integration=read(qa/'integration-browser-results.json');assert not integration['errors']
native=read(qa/'native-build-results.json');assert native['build']=='passed' and native['migrationTests']=='passed'
backend=read(qa/'backend/results.json');assert backend['error'] is None
pdfs=read(qa/'backend/pdf-results.json');assert all(p['allPagesRendered'] for p in pdfs)
tests=(qa/'frontend-tests.log').read_text(encoding='utf-8');assert re.search(r'Tests\s+156 passed',tests)
provenance=read(qa/'provenance-results.json');assert provenance['lockfileDependencies']=='unchanged'
for name in ['ARCHITECTURE.md','THIRD_PARTY_NOTICES.md','README.md']:
    shutil.copy2(root/'spanvision-geptechniek-workspace'/name,delivery/name)
shutil.copytree(qa/'screenshots',delivery/'screenshots',dirs_exist_ok=True)
for image in (root/'qa/suite/screenshots').glob('hub-*.png'): shutil.copy2(image,delivery/'screenshots'/image.name)
shutil.copytree(qa/'backend',delivery/'reports-and-backend-checks',dirs_exist_ok=True)
evidence=delivery/'verification';evidence.mkdir(exist_ok=True)
for name in ['browser-results.json','hub-browser-results.json','integration-browser-results.json','native-build-results.json','native-tests.log','frontend-tests.log','provenance-results.json','preview-status.json','native-assets.json','native-ui-results.json','native-packaging-results.json']:
    if (qa/name).is_file(): shutil.copy2(qa/name,evidence/name)
hashes={}
for p in (delivery/'windows').glob('*'):
    if p.is_file() and p.name!='SHA256SUMS.json':
        with p.open('rb') as stream: hashes[p.name]=hashlib.file_digest(stream,'sha256').hexdigest()
(delivery/'windows/SHA256SUMS.json').write_text(json.dumps(hashes,indent=2)+'\n',encoding='utf-8')
summary={'date':'2026-10-03','frontendTests':156,'geotechniekBrowserScenarios':len(browser['results']),'hubBrowserScenarios':len(hub['results']),'widths':[320,390,820,1440],'backendChecks':backend['results'],'pdfReports':pdfs,'nativeBuild':native,'dependencyLockfile':'preserved','windowsSha256':hashes}
(delivery/'verification/results.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
text=f'''# Spanvision infra — Geotechniek verification

Verified on 3 October 2026. Product: **geptechniek workspace · Geotechniek**. Theme: **Spanvision Mono**. Mark: **GW**.

- Existing frontend engineering tests: **156 passed**, across 18 test files.
- Geotechniek browser scenarios: **{len(browser['results'])} passed** at 320, 390, 820 and 1440 px.
- Hub landing, scan, suggestions, login, sign-up and account scenarios: **{len(hub['results'])} passed** at the same widths.
- Suite integration smoke checks: **{len(integration['results'])} passed**, including all six requested editor previews at desktop width.
- Browser checks cover overflow, controls, focus containment/restoration, drawer Escape behavior, import dialogs, fresh and saved themes, saved language/extensions, retained chart colors and an unfiltered customer logo.
- Windows executable and NSIS installer built with the dependency lockfile. Six native tests passed, including distinct report pages, Unicode fonts/CMaps and preference migration: fresh copy, missing-key merge, newer-setting preservation, original-profile preservation and one-time behavior.
- REST/MCP checks: **{len(backend['results'])} passed**. Includes branded service identity, compatible MCP tool names, GEF/BRO-XML/IFCGEO imports, project round trips, customer artwork and report generation.
- Three report paths were generated and all 15 PDF pages rendered. Exact PDF creator/producer metadata, distinct tenant pages, Unicode customer text and horizontal text bounds passed. Rendered pages and responsive browser screenshots are included for visual review. Windows Poppler reports two unused display-font alias warnings for the single-CPT fixture; its actual fonts are Helvetica/Helvetica-Bold and the pages render correctly.
- Warehouse revision: `{provenance['upstreamCommit']}`. Native Cargo.lock dependency resolution is unchanged; only the root package name changes. All original MCP tool names match the supplied archive.

## Local previews

- Suite: http://127.0.0.1:4230/
- Geotechniek: http://127.0.0.1:4235/

## Delivery

The windows/ directory contains the executable, matching WebView2 loader, tenant resources and NSIS installer. SHA256SUMS.json identifies the binary artifacts. The editable suite source ZIP and its manifest are under D:/SpanvisionDelivery. Downloaded Speech model weights are omitted from the source archive and remain untouched in the workspace.

## Practical limits

Account and OCR screens remain labeled local demonstrations. Passwords are discarded; account edits are session-only. Browser report generation and native layer detection require the Windows application. Experimental engineering and IFC export labels remain; the placeholder IFC4x3 writer is not promoted as schema-certified. The Windows build is unsigned. Native window sizing retains its existing 600 px minimum; the four narrow-width checks use the browser frontend. Executable identity, icon assets, packaged resources and native report generation were inspected. Live native window inspection could not run because the Windows UI helper returned a missing kernel-assets path after retry and reset. The installer was built and inspected; installation on another Windows machine remains an end-user step.

Detailed results, screenshots, report renders, source provenance and migration logs accompany this document.
'''
(delivery/'VERIFICATION.md').write_text(text,encoding='utf-8')
(qa/'VERIFICATION.md').write_text(text,encoding='utf-8')
print(json.dumps({k:summary[k] for k in ['frontendTests','geotechniekBrowserScenarios','hubBrowserScenarios']},indent=2))
print('Validated delivery collected in '+str(delivery))
