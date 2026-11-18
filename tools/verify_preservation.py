#!/usr/bin/env python3
"""Static preservation checks: NOT a substitute for browser/video playback."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "FINALPROJECT_APHA.html").read_text(encoding="utf-8")
director = (ROOT / "source/html/ABA8/director-and-recording.js").read_text(encoding="utf-8")
css = (ROOT / "source/css/global.css").read_text(encoding="utf-8")

tabs = ("pax", "cad3d", "nova", "topview", "unified", "sim", "closing", "tour")
for tab in tabs:
    assert html.count(f'id="tab-btn-{tab}"') == 1, f"Tab missing or duplicated: {tab}"
    assert html.count(f'id="module-{tab}"') == 1, f"Module missing or duplicated: {tab}"
# Each navigation tab has its own HTML source. File numbers follow tab order,
# not the legacy DOM order (the original Aba 6 block lives earlier in the page).
template = (ROOT / "source/page.template.html").read_text(encoding="utf-8")
# One engine owns shared CAD drawing and seated-cabin drawing.
# The Aba 6 manikin is inlined *between* them to keep original runtime order.
cabin_path = ROOT / "source/js/engine/cabin-shared.js"
navigation_path = ROOT / "source/js/core/navigation.js"
assert cabin_path.is_file(), "Missing unified cabin-shared.js"
assert navigation_path.is_file(), "Missing navigation.js"
cabin_source = cabin_path.read_text(encoding="utf-8")
navigation_source = navigation_path.read_text(encoding="utf-8")
assert template.count("@@APHA_INCLUDE:source/js/engine/cabin-shared.js@@") == 1, "Broken shared cabin include"
assert "@@APHA_INCLUDE:source/js/engine/cad2d-and-shared.js@@" not in template, "Outdated CAD include"
assert "@@APHA_INCLUDE:source/js/engine/sectioncabin.js@@" not in template, "Outdated seated-cabin include"
assert cabin_source.count("@@APHA_INCLUDE:source/js/core/navigation.js@@") == 1, "Navigation not placed in original position"
assert cabin_source.count("@@APHA_INCLUDE:source/html/ABA6/manikin.js@@") == 1, "ABA6 manikin not placed between engine halves"
assert cabin_source.index("@@APHA_INCLUDE:source/js/core/navigation.js@@") < cabin_source.index("@@APHA_INCLUDE:source/html/ABA6/controller.js@@") < cabin_source.index("function computeAllGeometries("), "Navigation, controller and CAD order changed"
assert cabin_source.index("function drawCADCanvas(") < cabin_source.index("@@APHA_INCLUDE:source/html/ABA6/manikin.js@@") < cabin_source.index("window.drawSeatedScene = drawSeatedScene;"), "Shared engine draw order changed"
assert navigation_source.count("function switchTab(tab) {") == 1, "Navigation handler missing or duplicated"
assert "function switchTab(tab) {" not in cabin_source, "Navigation handler duplicated in cabin engine"
assert "window.SEATED_STAT =" in cabin_source, "Missing seated-cabin ergonomics state"

# CSS modules are expanded at the exact original cascade positions.
# Never append them to the end of the HTML or introduce new <link> tags.
css_source = (ROOT / "source/css/global.css").read_text(encoding="utf-8")
css_paths = (
    "source/html/ABA6/viewport-theme.css",
    "source/html/ABA5/viewport-theme.css",
    "source/html/ABA8/tour-frame.css",
    "source/html/ABA2/cad-hud.css",
    "source/html/ABA4/tour-layout.css",
    "source/html/ABA3/tour-layout.css",
    "source/html/ABA5/tour-layout.css",
    "source/html/ABA8/tour-controls-hidden.css",
    "source/html/ABA6/tour-layout.css",
    "source/html/ABA1/presentation.css",
    "source/html/ABA8/tour-pax.css",
    "source/html/ABA6/fullscreen.css",
    "source/css/shared-viewport.css",
    "source/html/ABA8/tour-buttons.css",
    "source/css/recording-and-transitions.css",
    "source/html/ABA7/closing-frame.css",
    "source/html/ABA8/tour-closing.css",
    "source/html/ABA7/closing-scenes.css",
    "source/html/ABA3/presentation.css",
    "source/html/ABA7/closing-illustrations.css",
)
assert template.count("@@APHA_INCLUDE:source/css/global.css@@") == 1, "Global CSS entry point missing"
for css_path in css_paths:
    css_marker = f"@@APHA_INCLUDE:{css_path}@@"
    assert css_source.count(css_marker) == 1, f"CSS fragment missing or duplicated: {css_path}"
    assert (ROOT / css_path).is_file(), f"Missing CSS fragment: {css_path}"
assert "body {" in css_source and "html, body {" in css_source, "Global theme moved out"
assert "source/html/ABA1/styles.css" not in css_source, "PAX iframe styles must remain isolated"

for index, name in enumerate(tabs, start=1):
    relative_path = f"source/html/ABA{index}/ABA{index}.html"
    source_path = ROOT / relative_path
    source = source_path.read_text(encoding="utf-8")
    assert f'id="module-{name}"' in source, f"Broken section: ABA{index} ({name})"
    assert f"@@APHA_INCLUDE:{relative_path}@@" in template, (
        f"Template does not include ABA{index} ({name})"
    )

# Preserve the embedded iframe and inline closing illustration references.
pax_template = (ROOT / "source/html/ABA1/index.template.html").read_text(encoding="utf-8")
for name in ("aircraft.js", "passengers.js", "controls.js"):
    assert f"@@APHA_INCLUDE:source/html/ABA1/js/{name}@@" in pax_template, name
for name in ("illustration-01.svg", "illustration-02.svg"):
    assert f"@@APHA_INCLUDE:source/html/ABA1/svg/{name}@@" in pax_template, name
assert "@@APHA_INCLUDE:source/html/ABA1/styles.css@@" in pax_template
assert "@@APHA_PAX:source/html/ABA1/index.template.html@@" in template
closing_source = (ROOT / "source/html/ABA7/ABA7.html").read_text(encoding="utf-8")
for n in ("01", "02", "04", "06", "08", "10", "13"):
    assert f"@@APHA_INCLUDE:source/html/ABA7/svg/illustration-{n}.svg@@" in closing_source, n

# The two top-view drawings are owned by ABA4 and embedded, not fetched at runtime.
topview_js = (ROOT / "source/html/ABA4/animation.js").read_text(encoding="utf-8")
for asset in ("aircraft.svg.base64", "detail-s.svg.base64"):
    asset_path = ROOT / "source/html/ABA4" / asset
    assert asset_path.is_file(), f"Missing ABA4 asset: {asset_path}"
    marker = f"@@APHA_INCLUDE:source/html/ABA4/{asset}@@"
    assert topview_js.count(marker) == 1, f"Missing or duplicate ABA4 asset include: {asset}"
assert "source/assets/topview/" not in topview_js, "Outdated topview asset path"

# ABA6 owns its own animation controller, but it is expanded inside the
# original combined script (before CAD geometry) to preserve execution order.
aba6_control_path = ROOT / "source/html/ABA6/controller.js"
assert aba6_control_path.is_file(), "Missing ABA6 animation controller"
aba6_control_source = aba6_control_path.read_text(encoding="utf-8")
shared_cad_source = cabin_source
assert shared_cad_source.count("@@APHA_INCLUDE:source/html/ABA6/controller.js@@") == 1, "Broken ABA6 controller include"
assert shared_cad_source.index("@@APHA_INCLUDE:source/html/ABA6/controller.js@@") < shared_cad_source.index("function computeAllGeometries("), "ABA6 controller position changed"
for name in ("initAba6Engine", "scheduleAba6Engine", "pauseAba6Engine"):
    assert f"function {name}(" in aba6_control_source, f"Missing ABA6 controller function: {name}"
    assert f"function {name}(" not in shared_cad_source, f"ABA6 controller duplicated in shared CAD: {name}"
assert "scheduleAba6Engine({tour:true,reset:true" in director, "Tour does not start ABA6"
assert "pauseAba6Engine()" in director, "Tour does not stop ABA6"

# ABA3's two comparison renderers share the CAD3D closure and must stay
# embedded at their original position, not loaded as a separate script.
cad3d_source = (ROOT / "source/html/ABA2/cad3d.js").read_text(encoding="utf-8")
aba3_renderers_path = ROOT / "source/html/ABA3/bin-comparison-renderers.js"
assert aba3_renderers_path.is_file(), "Missing ABA3 comparison renderers"
aba3_renderers = aba3_renderers_path.read_text(encoding="utf-8")
assert cad3d_source.count("@@APHA_INCLUDE:source/html/ABA3/bin-comparison-renderers.js@@") == 1, "Broken ABA3 renderer include"
assert cad3d_source.index("@@APHA_INCLUDE:source/html/ABA3/bin-comparison-renderers.js@@") < cad3d_source.index("window.cad3dExportImages"), "Incorrect renderer ordering"
for required in (
    "function drawTopDimension(",
    "(function novaFront() {",
    "(function conventionalSVGTopView(){",
    "window.novaEnter =",
    "window.__novaRender =",
    "window.__convDraw=draw;",
    "window.__convCapture=",
    "window.novaShowHeader=",
):
    assert required in aba3_renderers, f"Missing comparison renderer: {required}"


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
