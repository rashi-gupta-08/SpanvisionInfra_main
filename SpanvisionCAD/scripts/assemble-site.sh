#!/bin/sh
set -eu

output="${1:-dist}"
test -f "$output/app/index.html"
mkdir -p "$output/assets"

install -m 0644 site/site.css "$output/site.css"
install -m 0644 LICENSE "$output/LICENSE"
install -m 0644 NOTICE.md "$output/NOTICE.md"
"${PYTHON:-python3}" scripts/build-site.py "$output"
