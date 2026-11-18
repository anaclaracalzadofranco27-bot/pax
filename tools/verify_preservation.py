#!/usr/bin/env python3
"""Static preservation checks: NOT a substitute for browser/video playback."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "FINALPROJECT_APHA.html").read_text(encoding="utf-8")
director = (ROOT / "src/html/ABA8/director-and-recording.js").read_text(encoding="utf-8")
css = (ROOT / "src/css/global.css").read_text(encoding="utf-8")

tabs = ("pax", "cad3d", "nova", "topview", "unified", "sim", "closing", "tour")
for tab in tabs:
    assert html.count(f'id="tab-btn-{tab}"') == 1, f"Tab missing or duplicated: {tab}"
    assert html.count(f'id="module-{tab}"') == 1, f"Module missing or duplicated: {tab}"
# Each navigation tab has its own HTML source. File numbers follow tab order,
# not the legacy DOM order (the original Aba 6 block lives earlier in the page).
template = (ROOT / "src/page.template.html").read_text(encoding="utf-8")
for index, name in enumerate(tabs, start=1):
    relative_path = f"src/html/ABA{index}/ABA{index}.html"
    source_path = ROOT / relative_path
    source = source_path.read_text(encoding="utf-8")
    assert f'id="module-{name}"' in source, f"Broken section: ABA{index} ({name})"
    assert f"@@APHA_INCLUDE:{relative_path}@@" in template, (
        f"Template does not include ABA{index} ({name})"
    )

# Preserve the embedded iframe and inline closing illustration references.
pax_template = (ROOT / "src/html/ABA1/index.template.html").read_text(encoding="utf-8")
for name in ("aircraft.js", "passengers.js", "controls.js"):
    assert f"@@APHA_INCLUDE:src/html/ABA1/js/{name}@@" in pax_template, name
for name in ("illustration-01.svg", "illustration-02.svg"):
    assert f"@@APHA_INCLUDE:src/html/ABA1/svg/{name}@@" in pax_template, name
assert "@@APHA_INCLUDE:src/html/ABA1/styles.css@@" in pax_template
assert "@@APHA_PAX:src/html/ABA1/index.template.html@@" in template
closing_source = (ROOT / "src/html/ABA7/ABA7.html").read_text(encoding="utf-8")
for n in ("01", "02", "04", "06", "08", "10", "13"):
    assert f"@@APHA_INCLUDE:src/html/ABA7/svg/illustration-{n}.svg@@" in closing_source, n

# The two top-view drawings are owned by ABA4 and embedded, not fetched at runtime.
topview_js = (ROOT / "src/html/ABA4/animation.js").read_text(encoding="utf-8")
for asset in ("aircraft.svg.base64", "detail-s.svg.base64"):
    asset_path = ROOT / "src/html/ABA4" / asset
    assert asset_path.is_file(), f"Missing ABA4 asset: {asset_path}"
    marker = f"@@APHA_INCLUDE:src/html/ABA4/{asset}@@"
    assert topview_js.count(marker) == 1, f"Missing or duplicate ABA4 asset include: {asset}"
assert "src/assets/topview/" not in topview_js, "Outdated topview asset path"

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
