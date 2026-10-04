from pathlib import Path
import struct

def font_names(path):
    data = path.read_bytes()
    num_tables = struct.unpack_from('>H', data, 4)[0]
    for index in range(num_tables):
        tag, _, offset, _ = struct.unpack_from('>4sIII', data, 12 + index * 16)
        if tag != b'name':
            continue
        _, count, strings = struct.unpack_from('>HHH', data, offset)
        names = {}
        for i in range(count):
            platform, _, language, name_id, length, start = struct.unpack_from('>6H', data, offset + 6 + i * 12)
            raw = data[offset + strings + start:offset + strings + start + length]
            value = raw.decode('utf-16-be' if platform in (0, 3) else 'mac_roman')
            if name_id not in names or language == 0x409:
                names[name_id] = value
        return names
    return {}
lines=['# Bundled font notices','', 'These notices are read directly from the original bundled font metadata. Font files are retained without alteration.','']
for p in sorted(Path('public/fonts').glob('*.ttf')):
    names=font_names(p)
    lines+=['## '+p.name,'']
    for name_id in [0,13,14]:
        record=names.get(name_id)
        if record: lines += [record,'']
text='\n'.join(lines)+'\n'
Path('docs/source-provenance/FONT_NOTICES.md').write_text(text,encoding='utf-8')
Path('packages/embed/FONT_NOTICES.md').write_text(text,encoding='utf-8')
Path('public/fonts/NOTICE.txt').write_text(text,encoding='utf-8')
print('Preserved font copyright and license metadata in dedicated notice files.')
