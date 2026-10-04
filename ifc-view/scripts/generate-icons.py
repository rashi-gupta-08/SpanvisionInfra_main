#!/usr/bin/env python3
"""Generate the monochrome IFC View application icons for Spanvision Infra."""

import io
import os
import struct

from PIL import Image, ImageDraw

LANCZOS = getattr(Image, 'Resampling', Image).LANCZOS


def create_icon(size=1024):
    """Draw the SV monogram as a neutral, high-contrast application icon."""
    scale = size / 1024

    def point(value):
        return int(round(value * scale))

    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, 'RGBA')
    draw.rounded_rectangle(
        [(point(24), point(24)), (point(1000), point(1000))],
        radius=point(220),
        fill=(0, 0, 0, 255),
        outline=(255, 255, 255, 105),
        width=max(point(18), 1),
    )

    stroke = max(point(76), 1)
    draw.line(
        [(point(700), point(292)), (point(530), point(732)), (point(410), point(462))],
        fill=(170, 170, 170, 255),
        width=stroke,
        joint='curve',
    )
    draw.line(
        [
            (point(620), point(324)),
            (point(525), point(268)),
            (point(365), point(284)),
            (point(306), point(370)),
            (point(352), point(448)),
            (point(548), point(526)),
            (point(594), point(604)),
            (point(530), point(704)),
            (point(350), point(720)),
            (point(246), point(646)),
        ],
        fill=(255, 255, 255, 255),
        width=stroke,
        joint='curve',
    )
    return image


def save_icns(master, path):
    chunks = []
    for tag, size in [(b'icp4', 16), (b'icp5', 32), (b'icp6', 64),
                      (b'ic07', 128), (b'ic08', 256), (b'ic09', 512),
                      (b'ic10', 1024)]:
        buffer = io.BytesIO()
        master.resize((size, size), LANCZOS).save(buffer, format='PNG')
        png = buffer.getvalue()
        chunks.append(tag + struct.pack('>I', len(png) + 8) + png)
    body = b''.join(chunks)
    with open(path, 'wb') as icon_file:
        icon_file.write(b'icns' + struct.pack('>I', 8 + len(body)) + body)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icons = os.path.join(root, 'apps', 'desktop', 'src-tauri', 'icons')
    public = os.path.join(root, 'apps', 'desktop', 'public')
    os.makedirs(icons, exist_ok=True)
    os.makedirs(public, exist_ok=True)

    master = create_icon(2048).resize((1024, 1024), LANCZOS)
    master.save(os.path.join(icons, 'icon.png'))

    for name, size in [('32x32.png', 32), ('64x64.png', 64),
                       ('128x128.png', 128), ('128x128@2x.png', 256)]:
        master.resize((size, size), LANCZOS).save(os.path.join(icons, name))

    for name, size in [('StoreLogo.png', 50), ('Square30x30Logo.png', 30),
                       ('Square44x44Logo.png', 44), ('Square71x71Logo.png', 71),
                       ('Square89x89Logo.png', 89), ('Square107x107Logo.png', 107),
                       ('Square142x142Logo.png', 142), ('Square150x150Logo.png', 150),
                       ('Square284x284Logo.png', 284), ('Square310x310Logo.png', 310)]:
        master.resize((size, size), LANCZOS).save(os.path.join(icons, name))

    master.save(
        os.path.join(icons, 'icon.ico'),
        format='ICO',
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    save_icns(master, os.path.join(icons, 'icon.icns'))
    master.resize((128, 128), LANCZOS).save(os.path.join(public, 'app-icon.png'))
    print('Generated IFC View icons for Spanvision Infra.')


if __name__ == '__main__':
    main()
