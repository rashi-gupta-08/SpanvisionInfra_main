"""Convert the bundled Spanvision STL artwork to a Windows icon."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent
Image.open(root/'packaging'/'app.png').save(root/'packaging'/'app.ico',format='ICO',sizes=[(n,n) for n in (16,24,32,48,64,128,256)])
