"""Reject package templates that drift from the distribution identity."""

import json
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
brand = json.loads((ROOT / "brand.json").read_text(encoding="utf-8"))
display = brand["display_name"]
executable = brand["executable"]
app_id = brand["app_id"]

expected = {
    "packaging/Info.plist": (display, executable, app_id),
    "packaging/SpanvisionCAD.desktop": (display, executable, app_id),
    "packaging/com.spanvisioninfra.cad.metainfo.xml": (display, app_id),
    "packaging/windows/main.wxs": (brand["product"], executable),
    "packaging/build_macos_signed.sh": (display, executable),
    "snap/snapcraft.yaml": (display, executable, app_id),
}
errors = []
package = (ROOT / "Cargo.toml").read_text(encoding="utf-8")
package_name = re.search(r'^name\s*=\s*"([^"]+)"', package, re.M)
if not package_name or package_name[1] != executable:
    errors.append("Cargo.toml: distributed package name must match the primary executable")

# Translation keys and compatibility identifiers are stable. Displayed values
# and fallback copy must carry the distribution's own product identity.
upstream = re.compile(r"Open[ -]?CAD[ -]?Studio|Open[ -]?AEC|\bOCS\b", re.I)
for path in (ROOT / "src").rglob("*.rs"):
    source = path.read_text(encoding="utf-8")
    for literal in re.findall(r'\b(?:t|tf)!\(\s*"((?:[^"\\]|\\.)*)"', source, re.S):
        if upstream.search(literal):
            errors.append(f"{path.relative_to(ROOT)}: upstream branding in interface copy")
for path in (ROOT / "locales").rglob("*.ftl"):
    for line in path.read_text(encoding="utf-8").splitlines():
        if "=" in line and upstream.search(line.split("=", 1)[1]):
            errors.append(f"{path.relative_to(ROOT)}: upstream branding in translated text")
for directory in ("assets", "site", "packaging", "web"):
    for path in (ROOT / directory).rglob("*.svg"):
        if upstream.search(path.name) or upstream.search(path.read_text(encoding="utf-8")):
            errors.append(f"{path.relative_to(ROOT)}: upstream logo must not ship")
for filename, tokens in expected.items():
    content = (ROOT / filename).read_text(encoding="utf-8")
    for token in tokens:
        if token not in content:
            errors.append(f"{filename}: missing {token!r}")

if errors:
    sys.exit("\n".join(errors))
if os.environ.get("SPANVISION_PUBLISH_ENABLED") == "true":
    for field in ("repository_url", "release_url"):
        if not brand.get(field):
            errors.append(f"brand.json: {field} is required before publishing")
if errors:
    sys.exit("\n".join(errors))
print("Spanvision package identity, interface text, translations and vector assets passed")
