import os
import sys
import tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
os.environ['SPANVISION_STL_DATA_DIR']=tempfile.mkdtemp(prefix='spanvision-stl-tests-')
