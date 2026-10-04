import zipfile,json
with zipfile.ZipFile(r'D:\CAD\open-calc-studio-main.zip') as z:
    for n in z.namelist():
        if n.endswith('/package.json') and len(n.split('/'))<5:
            p=json.loads(z.read(n))
            print(n, 'license:',p.get('license'),'name:',p.get('name'))
