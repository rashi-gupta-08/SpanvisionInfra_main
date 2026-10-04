"""Branded writable storage and non-destructive legacy-profile migration."""
from __future__ import annotations
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any
from .appinfo import APP_NAME, ORGANIZATION, ROOT

def is_frozen() -> bool:
    return bool(getattr(sys, 'frozen', False))

def resource_dir() -> Path:
    return ROOT

def migrate_profile(target: Path, legacy: Path) -> None:
    """Copy only missing files; originals and newer branded data always win."""
    if target.resolve() == legacy.resolve() or not legacy.is_dir():
        return
    target.mkdir(parents=True, exist_ok=True)
    for name in ('settings.json', 'projects', 'uploads'):
        source = legacy / name
        candidates = [source] if source.is_file() else list(source.rglob('*')) if source.is_dir() else []
        for old in candidates:
            if not old.is_file() or old.is_symlink():
                continue
            new = target / old.relative_to(legacy)
            if not new.exists():
                new.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(old, new)
    settings_path = target / 'settings.json'
    if settings_path.exists():
        try:
            settings = json.loads(settings_path.read_text(encoding='utf-8'))
            if not isinstance(settings, dict):
                return
            if not settings.get('export_dir'):
                settings['export_dir'] = str(Path.home() / 'Documents' / 'Open STL-3DMap Studio')
                settings_path.write_text(json.dumps(settings, indent=2), encoding='utf-8')
        except (ValueError, OSError):
            pass

def data_dir() -> Path:
    override = os.environ.get('SPANVISION_STL_DATA_DIR')
    base = Path(os.environ.get('LOCALAPPDATA') or Path.home())
    target = Path(override) if override else base / ORGANIZATION / APP_NAME
    target.mkdir(parents=True, exist_ok=True)
    marker = target / '.migration-v1.json'
    if not override and not marker.exists():
        legacy = base / 'Open STL-3DMap Studio'
        try:
            migrate_profile(target, legacy)
            marker.write_text(json.dumps({'legacy': str(legacy)}), encoding='utf-8')
        except OSError:
            pass
    return target

def default_export_dir() -> Path:
    documents = Path.home() / 'Documents'
    return (documents if documents.is_dir() else Path.home()) / ORGANIZATION / APP_NAME

def _settings_path() -> Path:
    return data_dir() / 'settings.json'

def read_settings() -> dict[str, Any]:
    try:
        value = json.loads(_settings_path().read_text(encoding='utf-8'))
        return value if isinstance(value, dict) else {}
    except (ValueError, OSError):
        return {}

def write_settings(values: dict[str, Any]) -> None:
    current = read_settings(); current.update(values)
    path = _settings_path(); temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(current, indent=2), encoding='utf-8')
    temporary.replace(path)

def export_dir() -> Path:
    stored = read_settings().get('export_dir')
    if isinstance(stored, str) and stored:
        return Path(stored)
    return default_export_dir()

def set_export_dir(path: Path) -> None:
    write_settings({'export_dir': str(path)})

def open_in_explorer(path: Path) -> bool:
    try:
        os.startfile(str(path))
        return True
    except (OSError, AttributeError):
        return False
