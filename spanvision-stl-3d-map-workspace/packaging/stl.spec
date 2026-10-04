# Build independently: python -m PyInstaller packaging/stl.spec --noconfirm
import os
import importlib.util
from PyInstaller.utils.hooks import collect_all, collect_submodules
ROOT = os.path.abspath(os.path.join(SPECPATH, '..'))
datas = [(os.path.join(ROOT, name), name) for name in ('web','legal','app')]
datas += [(os.path.join(ROOT, 'brand.json'), '.'), (os.path.join(ROOT, 'LICENSE'), '.'),
          (os.path.join(ROOT, 'requirements.txt'), '.'), (os.path.join(ROOT, 'run_app.py'), '.'),
          (os.path.join(ROOT, 'dist/suite-build.json'), '.')]
binaries = []; hiddenimports = []
for package in ('pyproj','trimesh','ifcopenshell'):
    if importlib.util.find_spec(package):
        data, binary, hidden = collect_all(package)
        datas += data; binaries += binary; hiddenimports += hidden
hiddenimports += collect_submodules('uvicorn')
hiddenimports += ['mapbox_earcut','shapely','lxml._elementpath','encodings.idna']
a = Analysis([os.path.join(ROOT,'run_app.py')], pathex=[ROOT], binaries=binaries, datas=datas,
             hiddenimports=hiddenimports, hookspath=[], hooksconfig={}, runtime_hooks=[],
             excludes=['matplotlib','scipy','IPython','pytest','PyQt5','PySide2','PIL','pandas','pip'],
             noarchive=False, optimize=0)
pyz = PYZ(a.pure)
exe = EXE(pyz,a.scripts,[],exclude_binaries=True,name='STL-3D map workspace',
          debug=False,bootloader_ignore_signals=False,strip=False,upx=False,
          console=os.environ.get('BUILD_CONSOLE')=='1',disable_windowed_traceback=False,
          icon=os.path.join(SPECPATH,'app.ico'),version=os.path.join(SPECPATH,'versioninfo.txt'))
coll = COLLECT(exe,a.binaries,a.datas,strip=False,upx=False,name='STL-3D map workspace')
