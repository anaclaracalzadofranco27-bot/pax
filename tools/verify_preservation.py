#!/usr/bin/env python3
"""Static preservation checks: NOT a substitute for browser/video playback."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "FINALPROJECT_APHA.html").read_text(encoding="utf-8")
director = (ROOT / "src/js/tour/director-and-recording.js").read_text(encoding="utf-8")
css = (ROOT / "src/css/global.css").read_text(encoding="utf-8")

tabs = ("pax", "cad3d", "nova", "topview", "unified", "sim", "closing", "tour")
for tab in tabs:
    assert html.count(f'id="tab-btn-{tab}"') == 1, f"Tab missing or duplicated: {tab}"
    assert html.count(f'id="module-{tab}"') == 1, f"Module missing or duplicated: {tab}"
# Each navigation tab has its own HTML source. File numbers follow tab order,
# not the legacy DOM order (the original Aba 6 block lives earlier in the page).
template = (ROOT / "src/page.template.html").read_text(encoding="utf-8")
for index, name in enumerate(tabs, start=1):
    source_path = ROOT / "src/html" / f"ABA{index}.html"
    source = source_path.read_text(encoding="utf-8")
    assert f'id="module-{name}"' in source, f"Broken section: ABA{index} ({name})"
    assert f"@@APHA_INCLUDE:src/html/ABA{index}.html@@" in template, (
        f"Template does not include ABA{index} ({name})"
    )

block = re.search(r"const TOUR_TAKES = \[([\s\S]*?)\];", director)
assert block, "Missing take manifest"
takes = [
    (int(start), int(end), mode, name)
    for start, end, mode, name in re.findall(
        r"\{\s*start:(\d+),end:(\d+),mode:'([^']+)',name:'([^']+)'\s*\}",
        block.group(1),
    )
]
assert takes == [
    (0, 0, "full", "01-aviao"),
    (1, 3, "full", "02-cad-bins-vista-superior"),
    (4, 5, "full", "03-secao-manikin"),
    (6, 6, "closing", "04-conclusao-sem-logo"),
    (6, 6, "logo", "05-logo"),
], f"Changed take grouping: {takes}"

assert "const OW = 1920, OH = 1080" in director, "1920x1080 recorder changed"
assert "#scene-1 #s1-stage{width:1920px;height:1080px" in css, "Closing frame 1 changed"
assert "#scene-2 #s2-stage{position:absolute;left:0;top:0;width:1920px;height:1080px" in css, "Closing frame 2 changed"
for marker in (
    "window.cad3dTourMorph", "fitBagDimensionLabels",
    "async function fxNovaIn", "async function fxCabinToStow",
    "function measureNovaCol", "function startCrossfade",
):
    assert marker in html, f"Missing transition or dimension handler: {marker}"
assert len(re.findall(r"<script\b", html)) == 12, "Script layout changed"
print("OK: eight tabs, eight source sections, five takes, Full HD and transition handlers preserved.")
