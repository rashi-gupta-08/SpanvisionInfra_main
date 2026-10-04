"""Standalone identity generated from the shared Spanvision brand registry."""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent.parent))
BRAND = json.loads((ROOT / 'brand.json').read_text(encoding='utf-8'))
APP_NAME = BRAND['product']
ORGANIZATION = BRAND['organization']
APP_VERSION = BRAND['version']
INSTANCE_MARKER = BRAND['instanceMarker']
SERVICES = BRAND['services']
REPO_URL = SERVICES.get('websiteUrl')
RELEASES_URL = SERVICES.get('releasesUrl')
LATEST_RELEASE_API = SERVICES.get('latestReleaseApi')
ISSUES_NEW_URL = SERVICES.get('supportUrl')
