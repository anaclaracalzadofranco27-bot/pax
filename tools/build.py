#!/usr/bin/env python3
"""Assemble the single-file Overhead Bin Alpha presentation from modular sources.

No minification, reformatting, newline translation or script reordering occurs.
Run: python tools/build.py
Verify: python tools/build.py --check
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "FINALPROJECT_APHA.html"
SOURCE = "src/page.template.html"
INCLUDE = re.compile(rb"@@APHA_(INCLUDE|PAX):([A-Za-z0-9_./-]+)@@")


def expand(path: str, ancestry: tuple[str, ...] = ()) -> bytes:
    if path in ancestry:
        raise ValueError("Circular source include: " + " -> ".join((*ancestry, path)))
    source = (ROOT / path).resolve()
    if not source.is_relative_to(ROOT):
        raise ValueError("Include outside project: " + path)
    content = source.read_bytes()

    def inline(match: re.Match[bytes]) -> bytes:
        kind = match.group(1)
        child_path = match.group(2).decode("ascii")
        fragment = expand(child_path, (*ancestry, path))
        if kind == b"PAX":
            # The original text/plain iframe uses escaped script and comment
            # openings so the outer HTML parser cannot close it prematurely.
            return re.sub(
                rb"<(/script|!--|script)",
                lambda token: b"<\\" + token.group(1),
                fragment,
                flags=re.IGNORECASE,
            )
        return fragment

    return INCLUDE.sub(inline, content)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", action="store_true",
        help="Verify the committed HTML is byte-for-byte identical to the build.",
    )
    args = parser.parse_args()
    generated = expand(SOURCE)
    digest = hashlib.sha256(generated).hexdigest()

    if args.check:
        if not PAGE.is_file():
            print("ERROR: final HTML does not exist.", file=sys.stderr)
            return 1
        existing = PAGE.read_bytes()
        if existing != generated:
            first = next(
                (i for i, (a, b) in enumerate(zip(existing, generated)) if a != b),
                min(len(existing), len(generated)),
            )
            print(
                f"ERROR: HTML is out of sync at byte {first} "
                f"(committed={len(existing)}, generated={len(generated)}).",
                file=sys.stderr,
            )
            print("Run: python tools/build.py", file=sys.stderr)
            return 1
        print(f"OK: FINALPROJECT_APHA.html is byte-identical ({len(generated)} bytes).")
    else:
        PAGE.write_bytes(generated)
        print(f"Generated FINALPROJECT_APHA.html ({len(generated)} bytes).")
    print("SHA-256:", digest)
    return 0


if __name__ == "__main__":
    sys.exit(main())
