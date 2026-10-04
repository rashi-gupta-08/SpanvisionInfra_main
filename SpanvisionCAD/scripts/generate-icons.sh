#!/bin/sh
# Rebuild every raster product icon from the vector master in assets/logo.svg.
set -eu

cp assets/logo.svg site/favicon.svg
for size in 96 180 192 512; do
  case "$size" in
    96) output=site/favicon.png ;;
    180) output=site/apple-touch-icon.png ;;
    *) output="site/icon-${size}.png" ;;
  esac
  rsvg-convert -w "$size" -h "$size" assets/logo.svg -o "$output"
done

magick assets/logo.svg -define icon:auto-resize=16,32,48,96,256 site/favicon.ico
magick assets/logo.svg -define icon:auto-resize=16,32,48,96,256 packaging/windows/AppIcon.ico
magick assets/mimetypes/image-vnd.dwg.svg -define icon:auto-resize=16,24,32,48,64,128,256 packaging/windows/dwg.ico
magick assets/mimetypes/image-vnd.dxf.svg -define icon:auto-resize=16,24,32,48,64,128,256 packaging/windows/dxf.ico
