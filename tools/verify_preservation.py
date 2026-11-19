#!/usr/bin/env python3
"""Static checks for all tabs and passenger assets; not browser/video tests."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "FINALPROJECT_APHA.html").read_text(encoding="utf-8")
director = (ROOT / "source/html/ABA8/director-and-recording.js").read_text(encoding="utf-8")
# Verify visual invariants against the assembled CSS, not the modular include manifest.
css = html.split("<style>", 1)[1].split("</style>", 1)[0]

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

# Standalone Aba 5 and Aba 6: a single continuous 48px blueprint grid is
# drawn by .sim-bg *behind* transparent canvases, not in camera coordinates.
aba5_theme = (ROOT / "source/html/ABA5/viewport-theme.css").read_text(encoding="utf-8")
aba6_theme = (ROOT / "source/html/ABA6/viewport-theme.css").read_text(encoding="utf-8")
aba5_sim = (ROOT / "source/html/ABA5/unified-simulation.js").read_text(encoding="utf-8")
aba6_manikin = (ROOT / "source/html/ABA6/manikin.js").read_text(encoding="utf-8")
tour_frame_css = (ROOT / "source/html/ABA8/tour-frame.css").read_text(encoding="utf-8")
assert ".sim-bg{background-color:var(--apha-bg);background-image:" in css_source, "Global blueprint grid missing"
assert "background-size:48px 48px" in css_source, "Full-viewport blueprint grid spacing changed"
assert "#module-unified .sim-bg{background:var(--apha-bg)}" not in aba5_theme, "ABA5 still overrides CSS grid"
assert "#aba6-module-ergo .sim-bg{background:var(--apha-bg)}" not in aba6_theme, "ABA6 still overrides CSS grid"
assert "#aba6-module-ergo .sim-card > div:first-child{background:" not in aba6_theme, "ABA6 first-child still hides the viewport grid"
assert "cssGridBackdrop: !inTourView()" in aba5_sim, "ABA5 standalone canvas grid opt-in lost"
assert "drawUnifiedCabinBackground(ctx, m.W, m.H, { paint: false, toX, toY });" not in aba5_sim, "ABA5 draws duplicate camera grid"
assert "paint: !opts.cssGridBackdrop" in cabin_source, "Shared CAD engine still paints over CSS grid"
assert "ctx.canvas.id !== 'aba6-manikinCanvas'" in aba6_manikin, "ABA6 overlays camera grid"
assert "tour: !!canvas.closest('#tour-stage'), paint: false" in aba6_manikin, "ABA6 canvas still paints opaque background"
assert "#tour-stage .sim-bg{background:none}" in tour_frame_css, "Tour must retain a single stationary blueprint grid"
assert "#tour-stage #module-unified .sim-bg" in (ROOT / "source/html/ABA5/tour-layout.css").read_text(encoding="utf-8"), "ABA5 tour layout moved"


# The standalone biomechanical tab has its own heading, hidden during the tour.
# Recording CSS's Aba 6 include is nested inside the shared recording fragment,
# so it must not be counted among global.css's immediate imports.
aba6_html = (ROOT / "source/html/ABA6/ABA6.html").read_text(encoding="utf-8")
aba6_fullscreen_css = (ROOT / "source/html/ABA6/fullscreen.css").read_text(encoding="utf-8")
aba6_tour_css = (ROOT / "source/html/ABA6/tour-layout.css").read_text(encoding="utf-8")
recording_css = (ROOT / "source/css/recording-and-transitions.css").read_text(encoding="utf-8")
aba6_recording_css = (ROOT / "source/html/ABA6/recording-layout.css").read_text(encoding="utf-8")
assert aba6_html.count('id="aba6-header"') == 1, "ABA6 heading missing or repeated"
assert "Biomechanical Validation &amp; Boarding Time" in aba6_html, "ABA6 title changed"
assert "#tour-stage #aba6-header{display:none !important;}" in aba6_tour_css, "ABA6 title visible in tour"
assert "--aba6-header-height:58px" in aba6_fullscreen_css, "ABA6 heading height missing"
assert "height:clamp(480px, 70vh, 740px)" in aba6_fullscreen_css, "ABA6 standalone viewport height not constrained"
assert "body.apha-simulation-view > header" not in aba6_fullscreen_css, "ABA6 still hides the shared navigation header"
assert "body.apha-simulation-view > main" not in aba6_fullscreen_css, "ABA6 still overrides the shared page layout"
assert "body.apha-simulation-view #apha-return-tabs" not in aba6_fullscreen_css, "Redundant return-tabs control shown"
assert "#module-unified > .bg-cad-panel:first-of-type { display:none !important; }" in aba5_theme, "ABA5 legacy heading rule not moved to its own theme"
assert css.count("#module-unified > .bg-cad-panel:first-of-type { display:none !important; }") == 1, "ABA5 heading rule missing or duplicated"
assert "#aba6-module-ergo > .bg-cad-panel:first-child" not in css, "ABA6 title still hidden by CSS"
assert "#aba6-module-ergo, #module-unified { row-gap:0 !important; }" not in css, "Obsolete row-gap override still present"
assert "@@APHA_INCLUDE:source/css/shared-viewport.css@@" not in css_source, "Obsolete shared viewport include"
assert "#tour-stage #aba6-header{display:none !important;}" in aba6_tour_css, "ABA6 title must remain hidden in tour"
assert '<header class="bg-cad-panel/95' in template, "Global tab navigation header missing"
assert recording_css.count("@@APHA_INCLUDE:source/html/ABA6/recording-layout.css@@") == 1, "ABA6 recording CSS not in original cascade position"

# Recording geometry for CAD3D (ABA2) and bin comparison (ABA3) belongs to
# those tabs, not the shared capture stylesheet. Nested includes keep cascade order.
aba2_recording_path = ROOT / "source/html/ABA2/recording-layout.css"
aba3_recording_path = ROOT / "source/html/ABA3/recording-layout.css"
aba2_rec_marker = "@@APHA_INCLUDE:source/html/ABA2/recording-layout.css@@"
aba3_rec_marker = "@@APHA_INCLUDE:source/html/ABA3/recording-layout.css@@"
aba6_rec_marker = "@@APHA_INCLUDE:source/html/ABA6/recording-layout.css@@"
assert aba2_recording_path.is_file(), "Missing ABA2 recording layout"
assert aba3_recording_path.is_file(), "Missing ABA3 recording layout"
aba2_recording_css = aba2_recording_path.read_text(encoding="utf-8")
aba3_recording_css = aba3_recording_path.read_text(encoding="utf-8")
assert recording_css.count(aba2_rec_marker) == 1, "ABA2 recording include missing/duplicated"
assert recording_css.count(aba3_rec_marker) == 1, "ABA3 recording include missing/duplicated"
assert recording_css.index(aba2_rec_marker) < recording_css.index(aba3_rec_marker) < recording_css.index(aba6_rec_marker), "Recording CSS cascade order changed"
assert "#tour-stage.rec #cad3d-container { height: 100% !important; }" in aba2_recording_css, "CAD3D capture sizing lost"
assert "#tour-stage.rec > #module-nova {" in aba3_recording_css and "top:2.2%" in aba3_recording_css, "ABA3 capture positioning lost"
assert "#tour-stage.rec #cad3d-container" not in recording_css, "ABA2 styling still in shared recording CSS"
assert "#tour-stage.rec > #module-nova" not in recording_css, "ABA3 styling still in shared recording CSS"

assert "#tour-stage.rec #aba6-module-ergo" not in recording_css, "ABA6-specific recording CSS still in shared file"
assert "#tour-stage.rec #aba6-module-ergo" in aba6_recording_css, "ABA6 recording frame rule lost"
assert html.count('id="aba6-header"') == 1, "Compiled ABA6 heading missing"
# The individual Aba 6 canvas is boxed like the other tabs. Tour mode
# suppresses the visual frame and its margin to protect the 1920x1080 take.
assert 'class="aba6-sim-card sim-card bg-cad-panel border border-cad-border rounded-xl overflow-hidden"' in aba6_html, "ABA6 canvas card markup missing"
assert "margin-top:14px !important;" in aba6_fullscreen_css, "ABA6 card spacing missing"
assert "border:1px solid var(--apha-mid-45)" in aba6_fullscreen_css, "ABA6 frame border missing"
assert "border-radius:12px;" in aba6_fullscreen_css, "ABA6 rounded corners missing"
assert "#tour-stage #aba6-module-ergo .sim-card {height:100% !important;margin-top:0 !important;overflow:visible !important;}" in aba6_fullscreen_css, "ABA6 tour frame spacing/clip not restored"
assert "#tour-stage #aba6-module-ergo .sim-card{border:0;border-radius:0;box-shadow:none;background:transparent}" in aba6_tour_css, "Tour must hide individual card frame"
assert html.count('id="aba6-manikinCanvas"') == 1, "Biomechanical canvas duplicated"



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

# ---------------------------------------------------------------------------
# Aba 1 — Contratos estáticos dos três passageiros e seus shaders/materiais.
# Integrado integralmente do antigo verify_passengers.py, sem relaxar testes.
# Esta checagem não substitui renderização WebGL no navegador.
# ---------------------------------------------------------------------------
def verify_aba1_passengers() -> None:
    code = (ROOT / "source/html/ABA1/js/passengers.js").read_text(encoding="utf-8")


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


verify_aba1_passengers()

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
