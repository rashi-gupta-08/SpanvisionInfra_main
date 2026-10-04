"""Package the edited source, built frontend, and preview evidence."""
from pathlib import Path
import os
import zipfile

root = Path(__file__).resolve().parent
target = root.parent / "Vision-BIM-Validator-Spanvision.zip"
skip_dirs = {
    "node_modules", ".git", ".verification", "venv", ".venv",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
    ".auto-claude", ".claude", ".worktrees", ".vscode", ".idea",
}
skip_files = {"CLAUDE.md", ".DS_Store"}
count = 0
with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for current, dirs, files in os.walk(root):
        dirs[:] = [directory for directory in dirs if directory not in skip_dirs]
        for filename in sorted(files):
            path = Path(current) / filename
            if filename in skip_files or filename.endswith((".pyc", ".tsbuildinfo", ".db", ".db-shm", ".db-wal")):
                continue
            if filename.startswith(".env") and filename != ".env.example":
                continue
            archive.write(path, Path(root.name) / path.relative_to(root))
            count += 1
with zipfile.ZipFile(target) as archive:
    corrupt = archive.testzip()
    if corrupt:
        raise RuntimeError(f"Archive verification failed: {corrupt}")
    for required in ("README.md", "ARCHITECTURE-SPANVISION.md", "VERIFICATION.md", "THIRD_PARTY_NOTICES.md", "viewer/dist/index.html", "viewer/dist/wasm/web-ifc.wasm", "viewer/package-lock.json", "preview/responsive-audit.json"):
        archive.getinfo(f"{root.name}/{required}")
print(f"Created {target.name} ({count} files, {target.stat().st_size:,} bytes); CRC and required files verified.")
