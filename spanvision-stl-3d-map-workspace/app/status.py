"""Validate both the running backend and its built UI before advertising it."""
import hashlib
import json
from .appinfo import BRAND, ROOT

STAMP_PATH = ROOT / 'suite-build.json'
if not STAMP_PATH.exists():
    STAMP_PATH = ROOT / 'dist' / 'suite-build.json'

def current_fingerprint(stamp):
    digest = hashlib.sha256(stamp['brandDigest'].encode())
    for relative in stamp['inputs']:
        digest.update(relative.encode())
        digest.update((ROOT / relative).read_bytes())
    return digest.hexdigest()

try:
    START_STAMP = json.loads(STAMP_PATH.read_text(encoding='utf-8'))
    START_FINGERPRINT = current_fingerprint(START_STAMP)
except (OSError, KeyError, ValueError):
    START_STAMP = {}
    START_FINGERPRINT = None

def preview_status():
    try:
        stamp = json.loads(STAMP_PATH.read_text(encoding='utf-8'))
        current = current_fingerprint(stamp)
        available = (current == START_FINGERPRINT == stamp['sourceFingerprint']
                     and stamp['brandDigest'] == BRAND['brandDigest'])
    except (OSError, KeyError, ValueError):
        stamp = {}; available = False
    return {'id': 'stl', 'available': available,
            'message': 'Ready to open' if available else 'Build and restart STL to preview the current edition.',
            'brandDigest': BRAND['brandDigest'], 'sourceFingerprint': START_FINGERPRINT}
