#!/usr/bin/env python3
"""Static contract checks for the current three-passenger drawing module.

This complements, but does not replace, real Three.js/WebGL visual testing.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
code = (ROOT / "src/html/ABA1/js/passengers.js").read_text(encoding="utf-8")


def require(test: bool, message: str) -> None:
    if not test:
        raise SystemExit("ERROR (passengers): " + message)


def once(needle: str) -> None:
    require(code.count(needle) == 1, "missing or duplicate: " + needle)


for name, rig in (
    ("createTraveler", "rig1"),
    ("createElder", "rig2"),
    ("createMother", "rig3"),
):
    once("function " + name + "(")
    once("const " + rig + " = " + name + "()")
    once("stylizeCartoon(" + rig + ".root, " + rig + ".fadeU)")

once("window.PAX =")
once("function paxRoundedRect(")
once("function paxCaseSlab(")
once("function addAdultEars(")
once("function addAdultNose(")
once("function updateWalk()")

require(
    "addAdultNose(head, skinM, 0.0125, 0.0118, 0.0082, 0.0112)" in code,
    "elder's nose proportions changed",
)
require(
    "addAdultNose(head, skinM, 0.0115, 0.0108, 0.0074, 0.0102)" in code,
    "mother's nose proportions changed",
)
require(
    "const blue = tag(swaddleBlueMat, 'blanket'); blue.side = THREE.DoubleSide;" in code,
    "baby blanket lit class or material sides changed",
)
require(
    "const SUIT_C = '#bfa58e'" in code and "suit: '#b99b7c'" in code,
    "distinct original suit colors were collapsed",
)
require(
    "'inkOutline' + mul + 'R' + (fadeU ? 'F' : '')" in code,
    "outline shader cache key changed",
)
require(
    "'flatRich' + (old.userData && old.userData.lit) + (fadeU ? 'F' : '')" in code,
    "material shader cache key changed",
)
require(
    r"'#include <common>\nattribute vec3 aOutN;\nuniform float uOutlineW;\nuniform vec3 uLightO;'" in code,
    "shader GLSL newlines changed",
)

obsolete = ("shirt", "sleeve", "thigh", "calf", "face", "hair",
            "swaddle", "swaddleBlue", "earM", "pelvis", "hairM")
for key in obsolete:
    require(re.search(r"\bPT\." + re.escape(key) + r"\b", code) is None,
            "old PT texture is referenced: " + key)

for key in set(re.findall(r"\bPT\.([A-Za-z_]\w*)", code)):
    require(re.search(r"\b" + re.escape(key) + r":\s*", code) is not None,
            "undefined PT texture recipe: " + key)

for removed in ("flatMaterial(", "OUTLINE_COLOR", "if (rich)", "updateWalk(0)"):
    require(removed not in code, "obsolete rendering branch reintroduced: " + removed)

print("OK: passenger construction, palette, noses, blanket, shaders and exports.")
