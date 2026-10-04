"""Headless packaged-runtime verification; writes only to a supplied test folder."""
def run(report_path):
    import json
    import tempfile
    import traceback
    import zipfile
    from pathlib import Path
    report=Path(report_path);result={'passed':False,'checks':[]}
    try:
        import tkinter
        import trimesh
        import ifcopenshell
        import ifcopenshell.geom
        from shapely.geometry import box
        from . import main
        from .config import Project
        from .geo import bbox_wgs84_to_rd
        from .pipeline import AreaData
        from .sources import Building,SurfaceData
        from .status import preview_status
        from .ifc_import import load_design
        assert tkinter.Tcl().eval('expr {2+2}')=='4'
        ifcopenshell.geom.settings()
        result['checks']+=['Tk folder-dialog runtime','IFC native geometry runtime']
        project=Project.from_dict({'id':'native-fixture','bbox_wgs84':[5.1155,52.0875,5.1185,52.0895]})
        bounds=bbox_wgs84_to_rd(project.bbox_wgs84);x,y,xx,yy=bounds
        area=AreaData(bounds,[Building('native',box(x+20,y+20,x+50,y+50),12,0)],SurfaceData())
        main.load_area=lambda *a,**kw:area
        with tempfile.TemporaryDirectory(dir=report.parent) as working:
            main.export_dir=lambda:Path(working)
            built=main.api_build(main.ProjectRequest(project=project.to_dict()))
            archive=Path(built['output_dir'])/'native-fixture.3mf'
            with zipfile.ZipFile(archive) as bundle:assert b'Spanvision infra' in bundle.read('3D/3dmodel.model')
            stl=next(Path(built['output_dir']).glob('*.stl'));assert load_design(stl).triangle_count>0
        result['checks']+=['FastAPI geometry and STL/3MF export','Branded export metadata','Mesh import']
        assert main.api_ping()['app']=='spanvision-stl-3d-map-workspace'
        assert main.api_update_check()['enabled'] is False
        assert preview_status()['available']
        result['checks']+=['Branded API identity','Disabled update service','Bundled source/assets fingerprint']
        result['passed']=True
    except Exception:
        result['error']=traceback.format_exc()
    report.write_text(json.dumps(result,indent=2),encoding='utf-8')
    return 0 if result['passed'] else 1
