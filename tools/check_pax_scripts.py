#!/usr/bin/env python3
"""Checks JS syntax of the actual assembled iframe sources, not include manifests."""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from build import expand

PARTS = ("aircraft", "passengers", "controls")


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="apha-pax-") as folder:
        for name in PARTS:
            path = Path(folder) / f"{name}.js"
            path.write_bytes(expand(f"source/html/ABA1/js/{name}.js"))
            subprocess.run(["node", "--check", str(path)], check=True)
            print(f"OK: {name}.js ({path.stat().st_size} bytes assembled)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
