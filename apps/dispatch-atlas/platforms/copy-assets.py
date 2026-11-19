#!/usr/bin/env python3
"""Bundle the canonical web edition into native shells. No dependencies."""
from pathlib import Path
import shutil
root = Path(__file__).resolve().parent
source = root.parent / "web"
if not (source / "index.html").is_file():
    raise SystemExit("Missing web/index.html; generate the web application first.")
for target in [root / "apple/Resources/web", root / "android/app/src/main/assets/web", root / "desktop/web"]:
    target.mkdir(parents=True, exist_ok=True)
    for item in source.rglob("*"):
        if item.is_file():
            destination = target / item.relative_to(source)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, destination)
    print(f"Copied web assets → {target}")
