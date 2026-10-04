"""Generate Spanvision application and document icons using the project CLI."""
from pathlib import Path
import subprocess

if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    subprocess.run(["node", str(root / "scripts" / "generate-brand-icons.mjs")], cwd=root, check=True)
